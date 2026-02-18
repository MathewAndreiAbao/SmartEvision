<script lang="ts">
    import { page } from "$app/stores";
    import { supabase } from "$lib/utils/supabase";
    import StatusBadge from "$lib/components/StatusBadge.svelte";
    import { onMount } from "svelte";

    interface VerifyResult {
        file_name: string;
        doc_type: string;
        status: string;
        created_at: string;
        file_size: number;
        week_number: number | null;
        subject: string | null;
        school_year: string | null;
        teacher_name: string | null;
        school_name: string | null;
    }

    let result = $state<VerifyResult | null>(null);
    let notFound = $state(false);
    let loading = $state(true);

    const hash = $derived($page.params.hash);

    onMount(async () => {
        const { data } = await supabase
            .from("submissions")
            .select(
                `
				file_name, doc_type, status, created_at, file_size, week_number, subject, school_year,
				profiles:user_id ( full_name, schools:school_id ( name ) )
			`,
            )
            .eq("file_hash", hash)
            .maybeSingle();

        if (data) {
            const profileData = data.profiles as any;
            result = {
                file_name: data.file_name,
                doc_type: data.doc_type,
                status: data.status,
                created_at: data.created_at,
                file_size: data.file_size,
                week_number: data.week_number,
                subject: data.subject,
                school_year: data.school_year,
                teacher_name: profileData?.full_name || null,
                school_name: profileData?.schools?.name || null,
            };
        } else {
            notFound = true;
        }
        loading = false;
    });

    function formatDate(dateStr: string): string {
        return new Date(dateStr).toLocaleDateString("en-PH", {
            year: "numeric",
            month: "long",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    }
</script>

<svelte:head>
    <title>Verify Document — Smart E-VISION</title>
</svelte:head>

<div class="min-h-screen gradient-mesh flex items-center justify-center p-6">
    <div class="w-full max-w-lg animate-slide-up">
        <!-- Logo -->
        <div class="text-center mb-8">
            <div
                class="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br from-deped-blue to-deped-blue-dark flex items-center justify-center text-white text-2xl font-bold shadow-elevated mb-3"
            >
                E
            </div>
            <h1 class="text-xl font-bold text-text-primary">Smart E-VISION</h1>
            <p class="text-sm text-text-muted">Document Verification</p>
        </div>

        {#if loading}
            <div class="glass-card-static p-10 text-center animate-pulse">
                <p class="text-text-muted">Verifying document...</p>
            </div>
        {:else if notFound}
            <div
                class="glass-card-static p-10 text-center border-l-4 border-deped-red"
            >
                <p class="text-4xl mb-4">❌</p>
                <h2 class="text-xl font-bold text-deped-red mb-2">
                    Document Not Found
                </h2>
                <p class="text-sm text-text-secondary mb-4">
                    No document matches this verification hash.
                </p>
                <code class="text-xs text-text-muted font-mono break-all"
                    >{hash}</code
                >
            </div>
        {:else if result}
            <div class="glass-card-static p-8 border-l-4 border-deped-green">
                <div class="text-center mb-6">
                    <p class="text-4xl mb-2">✅</p>
                    <h2 class="text-xl font-bold text-deped-green">
                        Document Verified
                    </h2>
                    <p class="text-sm text-text-muted mt-1">
                        This document is authentic and tamper-evident
                    </p>
                </div>

                <div class="space-y-4 text-sm">
                    <div
                        class="flex justify-between py-2 border-b border-gray-100"
                    >
                        <span class="text-text-muted font-medium">Document</span
                        >
                        <span class="text-text-primary font-semibold"
                            >{result.file_name}</span
                        >
                    </div>
                    <div
                        class="flex justify-between py-2 border-b border-gray-100"
                    >
                        <span class="text-text-muted font-medium">Type</span>
                        <span class="text-text-primary font-semibold"
                            >{result.doc_type}</span
                        >
                    </div>
                    {#if result.teacher_name}
                        <div
                            class="flex justify-between py-2 border-b border-gray-100"
                        >
                            <span class="text-text-muted font-medium"
                                >Teacher</span
                            >
                            <span class="text-text-primary font-semibold"
                                >{result.teacher_name}</span
                            >
                        </div>
                    {/if}
                    {#if result.school_name}
                        <div
                            class="flex justify-between py-2 border-b border-gray-100"
                        >
                            <span class="text-text-muted font-medium"
                                >School</span
                            >
                            <span class="text-text-primary font-semibold"
                                >{result.school_name}</span
                            >
                        </div>
                    {/if}
                    {#if result.subject}
                        <div
                            class="flex justify-between py-2 border-b border-gray-100"
                        >
                            <span class="text-text-muted font-medium"
                                >Subject</span
                            >
                            <span class="text-text-primary font-semibold"
                                >{result.subject}</span
                            >
                        </div>
                    {/if}
                    <div
                        class="flex justify-between py-2 border-b border-gray-100"
                    >
                        <span class="text-text-muted font-medium">Status</span>
                        <StatusBadge
                            status={result.status === "Compliant"
                                ? "compliant"
                                : result.status === "Late"
                                  ? "late"
                                  : "pending"}
                            size="sm"
                        />
                    </div>
                    <div
                        class="flex justify-between py-2 border-b border-gray-100"
                    >
                        <span class="text-text-muted font-medium">Uploaded</span
                        >
                        <span class="text-text-primary font-semibold"
                            >{formatDate(result.created_at)}</span
                        >
                    </div>
                    <div class="pt-2">
                        <span class="text-text-muted font-medium block mb-1"
                            >SHA-256 Hash</span
                        >
                        <code
                            class="text-xs font-mono text-deped-blue break-all"
                            >{hash}</code
                        >
                    </div>
                </div>
            </div>
        {/if}

        <div class="text-center mt-6">
            <a
                href="/"
                class="text-sm text-text-muted hover:text-deped-blue transition-colors"
            >
                ← Back to Smart E-VISION
            </a>
        </div>
    </div>
</div>
