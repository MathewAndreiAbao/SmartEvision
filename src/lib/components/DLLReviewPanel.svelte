<script lang="ts">
    import { CheckCircle, XCircle, MessageSquare, Clock, AlertCircle } from 'lucide-svelte';
    import StatusBadge from '$lib/components/StatusBadge.svelte';
    import type { DLLReview } from '$lib/types/dll-review';

    export let review: DLLReview | null = null;
    export let submissionId: string = '';
    export let isReviewer: boolean = false;
    export let loading: boolean = false;
    export let onApprove: () => void = () => {};
    export let onReturn: (reason: string) => void = () => {};

    let showReturnForm: boolean = false;
    let returnReason: string = '';

    function handleApprove() {
        if (confirm('Approve this submission as compliant?')) {
            onApprove();
        }
    }

    function handleReturn() {
        if (!returnReason.trim()) return;
        if (confirm('Return this submission for revisions?')) {
            onReturn(returnReason);
            returnReason = '';
            showReturnForm = false;
        }
    }

    function getStatusLabel(status: string): string {
        const labels: Record<string, string> = {
            'needs-check': 'Needs Review',
            'submitted': 'Submitted',
            'reviewed': 'Under Review',
            'returned': 'Returned for Revisions',
            'approved': 'Approved & Compliant',
        };
        return labels[status] || status;
    }

    function getStatusColor(status: string): string {
        const colors: Record<string, string> = {
            'needs-check': 'bg-gov-gold/10 border-gov-gold text-gov-gold',
            'submitted': 'bg-gov-blue/10 border-gov-blue text-gov-blue',
            'reviewed': 'bg-gov-blue/10 border-gov-blue text-gov-blue',
            'returned': 'bg-gov-red/10 border-gov-red text-gov-red',
            'approved': 'bg-gov-green/10 border-gov-green text-gov-green',
        };
        return colors[status] || 'bg-gray-50 border-gray-200 text-gray-600';
    }
</script>

<div class="w-full max-w-md">
    <div class="bg-white border border-border-subtle rounded-lg p-6">
        <!-- Status Badge -->
        {#if review}
            <div class="mb-6">
                <p class="text-xs font-bold text-text-muted uppercase tracking-wide mb-2">Review Status</p>
                <div class="flex items-center gap-2 px-3 py-2 rounded-lg border {getStatusColor(review.status)}">
                    {#if review.status === 'approved'}
                        <CheckCircle size={18} />
                    {:else if review.status === 'returned'}
                        <XCircle size={18} />
                    {:else}
                        <Clock size={18} />
                    {/if}
                    <span class="font-bold text-sm">{getStatusLabel(review.status)}</span>
                </div>
            </div>

            <!-- Review Details -->
            <div class="space-y-4 mb-6">
                <div>
                    <p class="text-xs font-bold text-text-muted uppercase tracking-wide mb-1">
                        Reviewer Comment
                    </p>
                    {#if review.reviewer_comment}
                        <p class="text-sm text-text-primary leading-relaxed">
                            {review.reviewer_comment}
                        </p>
                    {:else}
                        <p class="text-sm text-text-muted italic">No comment provided</p>
                    {/if}
                </div>

                {#if review.return_reason}
                    <div class="p-3 bg-gov-red/5 border border-gov-red/20 rounded-lg">
                        <div class="flex items-start gap-2">
                            <AlertCircle size={16} class="text-gov-red flex-shrink-0 mt-0.5" />
                            <div>
                                <p class="text-xs font-bold text-gov-red uppercase tracking-wide mb-1">
                                    Return Reason
                                </p>
                                <p class="text-sm text-text-primary leading-relaxed">
                                    {review.return_reason}
                                </p>
                            </div>
                        </div>
                    </div>
                {/if}

                <!-- Status Timestamps -->
                <div class="space-y-2 pt-4 border-t border-border-subtle">
                    {#if review.approved_at}
                        <div class="flex items-center justify-between text-[10px]">
                            <span class="font-bold text-text-muted uppercase">Approved</span>
                            <span class="text-text-secondary">
                                {new Date(review.approved_at).toLocaleDateString('en-PH', {
                                    month: 'short',
                                    day: 'numeric',
                                    year: '2-digit',
                                })}
                            </span>
                        </div>
                    {/if}
                    {#if review.returned_at}
                        <div class="flex items-center justify-between text-[10px]">
                            <span class="font-bold text-text-muted uppercase">Returned</span>
                            <span class="text-text-secondary">
                                {new Date(review.returned_at).toLocaleDateString('en-PH', {
                                    month: 'short',
                                    day: 'numeric',
                                    year: '2-digit',
                                })}
                            </span>
                        </div>
                    {/if}
                </div>
            </div>

            <!-- Reviewer Actions (only if pending and is reviewer) -->
            {#if isReviewer && review.status === 'needs-check'}
                <div class="space-y-3 border-t border-border-subtle pt-6">
                    <button
                        onclick={handleApprove}
                        disabled={loading}
                        class="w-full py-3 px-4 bg-gov-green text-white font-bold text-sm uppercase tracking-wide rounded-lg hover:bg-gov-green-dark transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {#if loading}
                            <div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        {:else}
                            <CheckCircle size={18} />
                        {/if}
                        Approve as Compliant
                    </button>

                    {#if !showReturnForm}
                        <button
                            onclick={() => (showReturnForm = true)}
                            class="w-full py-3 px-4 border-2 border-gov-red text-gov-red font-bold text-sm uppercase tracking-wide rounded-lg hover:bg-gov-red/5 transition-all flex items-center justify-center gap-2"
                        >
                            <XCircle size={18} />
                            Return for Revisions
                        </button>
                    {:else}
                        <div class="p-4 bg-gov-red/5 border border-gov-red/20 rounded-lg space-y-3">
                            <textarea
                                bind:value={returnReason}
                                placeholder="Explain what needs to be revised..."
                                class="w-full p-3 border border-border-subtle rounded-lg text-sm font-medium resize-none focus:ring-2 focus:ring-gov-red outline-none"
                                rows="3"
                            />
                            <div class="flex gap-2">
                                <button
                                    onclick={handleReturn}
                                    disabled={!returnReason.trim() || loading}
                                    class="flex-1 py-2 px-3 bg-gov-red text-white font-bold text-sm uppercase tracking-wide rounded-lg hover:bg-gov-red-dark transition-all disabled:opacity-50"
                                >
                                    Return
                                </button>
                                <button
                                    onclick={() => {
                                        showReturnForm = false;
                                        returnReason = '';
                                    }}
                                    class="flex-1 py-2 px-3 border border-border-subtle text-text-muted font-bold text-sm uppercase tracking-wide rounded-lg hover:bg-surface-muted transition-all"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    {/if}
                </div>
            {/if}
        {:else}
            <!-- No Review Yet -->
            <div class="text-center py-8">
                <MessageSquare size={32} class="mx-auto mb-4 text-text-muted/50" />
                <p class="text-text-muted font-medium mb-2">No Review Yet</p>
                <p class="text-xs text-text-muted/75">
                    A reviewer will check this submission soon.
                </p>
            </div>
        {/if}
    </div>
</div>
