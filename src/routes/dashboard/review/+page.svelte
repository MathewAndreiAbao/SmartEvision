<script lang="ts">
    import { onMount } from 'svelte';
    import { goto } from '$app/navigation';
    import { fly, fade } from 'svelte/transition';
    import { profile } from '$lib/utils/auth';
    import { supabase } from '$lib/utils/supabase';
    import DLLAnnotationViewer from '$lib/components/DLLAnnotationViewer.svelte';
    import DLLReviewPanel from '$lib/components/DLLReviewPanel.svelte';
    import DLLAuditTrail from '$lib/components/DLLAuditTrail.svelte';
    import { FileText, ArrowLeft, Download } from 'lucide-svelte';
    import type { SubmissionWithReview, DLLAnnotation } from '$lib/types/dll-review';

    let submissionId = '';
    let submission: SubmissionWithReview | null = null;
    let fileUrl = '';
    let loading = true;
    let isReviewer = false;
    let actionLoading = false;
    let error = '';

    // Get the current access token so server routes can authenticate the request
    async function getAuthHeaders(): Promise<Record<string, string>> {
        const { data } = await supabase.auth.getSession();
        const token = data?.session?.access_token;
        return token
            ? { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
            : { 'Content-Type': 'application/json' };
    }

    onMount(async () => {
        const urlParams = new URLSearchParams(window.location.search);
        submissionId = urlParams.get('id') || '';

        if (!submissionId) {
            error = 'No submission ID provided';
            loading = false;
            return;
        }

        await loadSubmission();
    });

    async function loadSubmission() {
        try {
            const headers = await getAuthHeaders();
            const response = await fetch(`/api/dll/${submissionId}?includeAudit=true`, { headers });
            if (!response.ok) {
                error = response.status === 404 ? 'Submission not found' : 'Failed to load submission';
                return;
            }

            const data: SubmissionWithReview = await response.json();
            submission = data;

            // Fetch file presigned URL for the Acrobat PDF viewer
            const path = data.file_path || `${data.id}/${data.file_name}`;
            try {
                const presignRes = await fetch('/api/storage/presign', {
                    method: 'POST',
                    headers,
                    body: JSON.stringify({ key: path, intent: 'download' })
                });
                if (presignRes.ok) {
                    const presignData = await presignRes.json();
                    fileUrl = presignData.url;
                }
            } catch (err) {
                console.error("Presign fetch error:", err);
            }

            // Check if user is reviewer
            isReviewer =
                $profile?.role === 'Master Teacher' ||
                $profile?.role === 'School Head' ||
                $profile?.role === 'District Supervisor';
        } catch (err) {
            error = 'Failed to load submission: ' + (err as Error).message;
        } finally {
            loading = false;
        }
    }

    async function handleAnnotationCreate(annotation: any) {
        try {
            const headers = await getAuthHeaders();
            const response = await fetch('/api/dll/annotate', {
                method: 'POST',
                headers,
                body: JSON.stringify(annotation),
            });

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                alert('Failed to create annotation: ' + (errData.error || response.statusText));
                return;
            }

            await loadSubmission();
        } catch (err) {
            alert('Error: ' + (err as Error).message);
        }
    }

    async function handleAnnotationDelete(id: string) {
        if (!confirm('Are you sure you want to delete this annotation?')) return;
        try {
            const headers = await getAuthHeaders();
            const response = await fetch(`/api/dll/annotate?id=${id}`, {
                method: 'DELETE',
                headers,
            });

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                alert('Failed to delete annotation: ' + (errData.error || response.statusText));
                return;
            }

            await loadSubmission();
        } catch (err) {
            alert('Error: ' + (err as Error).message);
        }
    }


    async function handleApprove() {
        if (!submission?.review?.id) return;

        actionLoading = true;
        try {
            const headers = await getAuthHeaders();
            const response = await fetch('/api/dll/review?action=approve', {
                method: 'POST',
                headers,
                body: JSON.stringify({ review_id: submission.review.id }),
            });

            if (!response.ok) {
                alert('Failed to approve submission');
                return;
            }

            await loadSubmission();
            alert('Submission approved successfully!');
        } catch (err) {
            alert('Error: ' + (err as Error).message);
        } finally {
            actionLoading = false;
        }
    }

    async function handleReturn(reason: string) {
        if (!submission?.review?.id) return;

        actionLoading = true;
        try {
            const headers = await getAuthHeaders();
            const response = await fetch('/api/dll/review?action=return', {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    review_id: submission.review.id,
                    return_reason: reason,
                }),
            });

            if (!response.ok) {
                alert('Failed to return submission');
                return;
            }

            await loadSubmission();
            alert('Submission returned for revisions');
        } catch (err) {
            alert('Error: ' + (err as Error).message);
        } finally {
            actionLoading = false;
        }
    }

    function handleExport() {
        // TODO: Implement export functionality
        alert('Export functionality coming soon');
    }
</script>

<svelte:head>
    <title>DLL Review — Smart E-VISION</title>
</svelte:head>

<div class="min-h-screen bg-surface-base">
    <!-- Header -->
    <div class="bg-white border-b border-border-subtle sticky top-0 z-30">
        <div class="max-w-7xl mx-auto px-6 py-4">
            <div class="flex items-center justify-between">
                <div class="flex items-center gap-4">
                    <button
                        onclick={() => goto('/dashboard')}
                        class="p-2 hover:bg-surface-muted rounded-lg transition-colors"
                    >
                        <ArrowLeft size={20} class="text-text-muted" />
                    </button>
                    <div>
                        <h1 class="text-2xl font-bold text-text-primary">DLL Review</h1>
                        {#if submission}
                            <p class="text-sm text-text-muted mt-1">
                                {submission.file_name} • Week {submission.week_number}
                            </p>
                        {/if}
                    </div>
                </div>
                <button
                    onclick={handleExport}
                    class="flex items-center gap-2 px-4 py-2 bg-gov-blue text-white rounded-lg font-semibold text-sm hover:bg-gov-blue-dark transition-all"
                >
                    <Download size={18} />
                    Export
                </button>
            </div>
        </div>
    </div>

    <!-- Content -->
    <div class="max-w-7xl mx-auto px-6 py-8">
        {#if loading}
            <div class="text-center py-12">
                <div class="inline-block">
                    <div class="w-8 h-8 border-4 border-gov-blue border-t-transparent rounded-full animate-spin"></div>
                </div>
            </div>
        {:else if error}
            <div class="p-6 bg-gov-red/10 border border-gov-red rounded-lg text-center">
                <p class="text-gov-red font-bold">{error}</p>
            </div>
        {:else if submission}
            <div
                class="grid grid-cols-1 lg:grid-cols-3 gap-6"
                in:fade={{ duration: 400 }}
            >
                <!-- Main Content -->
                <div class="lg:col-span-2 space-y-6">
                    <!-- Submission Info Card -->
                    <div class="bg-white border border-border-subtle rounded-lg p-6" in:fly={{ y: 20, duration: 400 }}>
                        <div class="flex items-start gap-4 mb-6">
                            <div class="w-12 h-12 rounded-lg bg-gov-blue/5 text-gov-blue flex items-center justify-center">
                                <FileText size={24} />
                            </div>
                            <div class="flex-1">
                                <h2 class="text-xl font-bold text-text-primary">{submission.file_name}</h2>
                                <p class="text-sm text-text-muted mt-1">
                                    Type: {submission.doc_type} • Subject: {submission.subject || 'N/A'}
                                </p>
                            </div>
                        </div>

                        <div class="grid grid-cols-2 gap-4 pt-6 border-t border-border-subtle">
                            <div>
                                <p class="text-xs font-bold text-text-muted uppercase mb-1">Submitted</p>
                                <p class="text-sm text-text-primary">
                                    {new Date(submission.created_at).toLocaleDateString('en-PH', {
                                        month: 'long',
                                        day: 'numeric',
                                        year: 'numeric',
                                    })}
                                </p>
                            </div>
                            <div>
                                <p class="text-xs font-bold text-text-muted uppercase mb-1">File Size</p>
                                <p class="text-sm text-text-primary">
                                    {submission.file_size ? (submission.file_size / 1024 / 1024).toFixed(2) + ' MB' : 'N/A'}
                                </p>
                            </div>
                        </div>
                    </div>

                    <!-- Annotation Viewer -->
                    <div class="bg-white border border-border-subtle rounded-lg p-6" in:fly={{ y: 20, duration: 400, delay: 100 }}>
                        <DLLAnnotationViewer
                            annotations={submission.annotations || []}
                            {submissionId}
                            {isReviewer}
                            {fileUrl}
                            onAnnotationCreate={handleAnnotationCreate}
                            onAnnotationDelete={handleAnnotationDelete}
                        />
                    </div>

                    <!-- Audit Trail -->
                    {#if submission.audit_logs && submission.audit_logs.length > 0}
                        <div in:fly={{ y: 20, duration: 400, delay: 200 }}>
                            <DLLAuditTrail auditLogs={submission.audit_logs} />
                        </div>
                    {/if}
                </div>

                <!-- Sidebar -->
                <div class="space-y-6" in:fly={{ x: 20, duration: 400, delay: 100 }}>
                    <!-- Review Panel -->
                    <DLLReviewPanel
                        review={submission.review || null}
                        loading={actionLoading}
                    />
                </div>
            </div>
        {/if}
    </div>
</div>
