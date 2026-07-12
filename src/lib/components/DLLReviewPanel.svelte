<script lang="ts">
    import { CheckCircle, XCircle, MessageSquare, Clock, AlertCircle, PencilLine, User, Reply, ShieldCheck } from 'lucide-svelte';
    import type { DLLReview } from '$lib/types/dll-review';

    interface CommentEntry {
        id: string;
        author: string;
        role: string;
        content: string;
        timestamp: string;
        type: 'remark' | 'revision' | 'approval' | 'return' | 'comment';
        version: number;
    }

    export let review: DLLReview | null = null;
    export let canComment: boolean = false;
    export let loading: boolean = false;
    export let onSaveRemark: (remark: string) => void = () => {};

    // Threaded comment history — in production, this would come from the server
    export let comments: CommentEntry[] = [];

    let showCommentForm: boolean = false;
    let newComment: string = '';

    function handleSaveRemark() {
        if (!newComment.trim()) return;
        onSaveRemark(newComment);
        newComment = '';
        showCommentForm = false;
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
        return colors[status] || 'bg-surface-muted border-border-subtle text-text-secondary';
    }

    function getTimelineIcon(type: string) {
        if (type === 'approval') return CheckCircle;
        if (type === 'return') return XCircle;
        if (type === 'revision') return Reply;
        return MessageSquare;
    }

    function getTimelineColor(type: string): string {
        if (type === 'approval') return 'text-gov-green border-gov-green';
        if (type === 'return') return 'text-gov-red border-gov-red';
        if (type === 'revision') return 'text-gov-gold border-gov-gold';
        return 'text-gov-blue border-gov-blue';
    }

    function getInitials(name: string): string {
        return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?';
    }
</script>

<div class="w-full">
    <div class="rounded-2xl border border-border-subtle bg-surface-white p-6 shadow-sm">
        <!-- Status Badge -->
        <div class="mb-6">
            <div class="mb-3 flex items-center gap-2">
                <PencilLine size={16} class="text-gov-blue" />
                <p class="text-xs font-semibold uppercase tracking-[0.2em] text-text-muted">Review Status</p>
            </div>
            {#if review}
                <div class="flex items-center gap-2 rounded-xl border px-3 py-2 {getStatusColor(review.status)}">
                    {#if review.status === 'approved'}
                        <CheckCircle size={18} />
                    {:else if review.status === 'returned'}
                        <XCircle size={18} />
                    {:else}
                        <Clock size={18} />
                    {/if}
                    <span class="font-bold text-sm">{getStatusLabel(review.status)}</span>
                </div>
            {:else}
                <div class="flex items-center gap-2 rounded-xl border border-border-subtle bg-surface-muted px-3 py-2 text-text-muted">
                    <Clock size={18} />
                    <span class="font-bold text-sm">Awaiting Review</span>
                </div>
            {/if}
        </div>

        <!-- Threaded Timeline -->
        {#if comments.length > 0}
            <div class="mb-6">
                <p class="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-text-muted">Conversation Timeline</p>
                <div class="space-y-0">
                    {#each comments as entry, i}
                        {@const Icon = getTimelineIcon(entry.type)}
                        <div class="relative flex gap-4 pb-4">
                            {#if i < comments.length - 1}
                                <div class="absolute left-[17px] top-10 bottom-0 w-px bg-surface-muted"></div>
                            {/if}
                            <div class="flex-shrink-0">
                                <div class="flex h-9 w-9 items-center justify-center rounded-full border-2 bg-surface-white {getTimelineColor(entry.type)}">
                                    <Icon size={14} />
                                </div>
                            </div>
                            <div class="flex-1 min-w-0">
                                <div class="flex items-center gap-2">
                                    <span class="text-sm font-semibold text-text-secondary">{entry.author}</span>
                                    <span class="text-[10px] font-medium uppercase tracking-wide text-text-muted">{entry.role}</span>
                                    <span class="ml-auto text-[10px] text-text-muted">{new Date(entry.timestamp).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                                </div>
                                {#if entry.version > 1}
                                    <span class="inline-block mt-0.5 rounded bg-surface-muted px-1.5 py-0.5 text-[9px] font-semibold text-text-muted">v{entry.version}</span>
                                {/if}
                                <p class="mt-1 text-sm text-text-secondary leading-relaxed">{entry.content}</p>
                            </div>
                        </div>
                    {/each}
                </div>
            </div>
        {/if}

        <!-- Add Comment -->
        {#if canComment}
            <div class="border-t border-border-subtle pt-4">
                {#if !showCommentForm}
                    <button
                        onclick={() => (showCommentForm = true)}
                        class="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gov-blue/30 px-4 py-3 text-sm font-semibold text-gov-blue transition-all hover:bg-gov-blue/5"
                    >
                        <MessageSquare size={16} />
                        Add Comment
                    </button>
                {:else}
                    <div class="space-y-3">
                        <textarea
                            bind:value={newComment}
                            placeholder="Enter your remarks, suggestions, or revision requests..."
                            class="w-full resize-none rounded-xl border border-border-subtle p-3 text-sm outline-none focus:ring-2 focus:ring-gov-blue"
                            rows="3"
                        ></textarea>
                        <div class="flex gap-2">
                            <button
                                onclick={handleSaveRemark}
                                disabled={!newComment.trim() || loading}
                                class="flex-1 rounded-xl bg-gov-blue px-3 py-2 text-sm font-semibold text-white transition-all hover:bg-gov-blue-dark disabled:opacity-50"
                            >
                                {loading ? 'Saving...' : 'Submit'}
                            </button>
                            <button
                                onclick={() => { showCommentForm = false; newComment = ''; }}
                                class="rounded-xl border border-border-subtle px-4 py-2 text-sm font-semibold text-text-muted transition-all hover:bg-surface-muted"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                {/if}
            </div>
        {/if}

        {#if !review && comments.length === 0 && !canComment}
            <div class="py-6 text-center">
                <MessageSquare size={28} class="mx-auto mb-3 text-text-muted" />
                <p class="text-sm text-text-muted">Waiting for reviewer feedback</p>
            </div>
        {/if}
    </div>
</div>

