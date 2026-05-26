<script lang="ts">
    import { Shield, User, FileText, CheckCircle, XCircle, MessageSquare, Download } from 'lucide-svelte';
    import type { DLLAuditLog } from '$lib/types/dll-review';

    export let auditLogs: DLLAuditLog[] = [];

    function getActionIcon(action: string) {
        const icons: Record<string, any> = {
            uploaded: FileText,
            annotated: MessageSquare,
            reviewed: Shield,
            approved: CheckCircle,
            returned: XCircle,
            exported: Download,
        };
        return icons[action] || FileText;
    }

    function getActionLabel(action: string): string {
        const labels: Record<string, string> = {
            uploaded: 'File Uploaded',
            annotated: 'Annotation Added',
            reviewed: 'Review Started',
            approved: 'Approved',
            returned: 'Returned for Revisions',
            exported: 'Exported',
        };
        return labels[action] || action;
    }

    function getActionColor(action: string): string {
        const colors: Record<string, string> = {
            uploaded: 'from-gov-blue to-gov-blue-dark',
            annotated: 'from-gov-gold to-gov-gold-dark',
            reviewed: 'from-gov-blue to-gov-blue-dark',
            approved: 'from-gov-green to-gov-green-dark',
            returned: 'from-gov-red to-red-700',
            exported: 'from-purple-600 to-purple-700',
        };
        return colors[action] || 'from-gray-400 to-gray-500';
    }

    function formatDate(dateStr: string): string {
        return new Date(dateStr).toLocaleDateString('en-PH', {
            month: 'short',
            day: 'numeric',
            year: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
        });
    }
</script>

<div class="w-full">
    <div class="bg-white border border-border-subtle rounded-lg overflow-hidden">
        <!-- Header -->
        <div class="px-6 py-4 border-b border-border-subtle bg-surface-muted/30">
            <div class="flex items-center gap-3">
                <div class="w-1.5 h-6 bg-gov-blue rounded-full"></div>
                <h3 class="text-sm font-bold text-text-primary uppercase tracking-wide">
                    Audit Trail (Immutable Record)
                </h3>
            </div>
            <p class="text-xs text-text-muted mt-1">All actions are permanently recorded and cryptographically signed for integrity</p>
        </div>

        <!-- Timeline -->
        <div class="p-6">
            {#if auditLogs.length === 0}
                <div class="text-center py-12">
                    <Shield size={32} class="mx-auto mb-3 text-text-muted/50" />
                    <p class="text-text-muted font-medium">No audit logs yet</p>
                </div>
            {:else}
                <div class="space-y-0 relative">
                    {#each auditLogs as log, index}
                        {@const Icon = getActionIcon(log.action)}
                        <div class="flex gap-4 pb-6 relative">
                            <!-- Connector line -->
                            {#if index < auditLogs.length - 1}
                                <div class="absolute left-5 top-12 w-0.5 h-12 bg-border-subtle"></div>
                            {/if}

                            <!-- Icon -->
                            <div class="flex-shrink-0">
                                <div
                                    class="w-11 h-11 rounded-full bg-gradient-to-br {getActionColor(
                                        log.action,
                                    )} flex items-center justify-center text-white relative z-10"
                                >
                                    <Icon size={20} strokeWidth={2} />
                                </div>
                            </div>

                            <!-- Content -->
                            <div class="flex-1 min-w-0 pt-1">
                                <div class="flex items-start justify-between gap-4">
                                    <div>
                                        <p class="font-bold text-sm text-text-primary">
                                            {getActionLabel(log.action)}
                                        </p>
                                        <p class="text-xs text-text-muted mt-1">
                                            by <span class="font-semibold">{log.actor_role}</span>
                                        </p>

                                        <!-- Details -->
                                        {#if log.details}
                                            <div class="mt-2 space-y-1">
                                                {#if log.details.reason}
                                                    <p class="text-xs text-text-secondary">
                                                        <span class="font-semibold">Reason:</span>
                                                        {log.details.reason}
                                                    </p>
                                                {/if}
                                                {#if log.details.export_format}
                                                    <p class="text-xs text-text-secondary">
                                                        <span class="font-semibold">Format:</span>
                                                        {log.details.export_format.toUpperCase()}
                                                    </p>
                                                {/if}
                                            </div>
                                        {/if}
                                    </div>

                                    <!-- Timestamp & Hash -->
                                    <div class="text-right flex-shrink-0">
                                        <p class="text-[10px] font-bold text-text-muted uppercase tracking-tight">
                                            {formatDate(log.created_at)}
                                        </p>
                                        {#if log.signature_hash}
                                            <p class="text-[8px] text-text-muted/60 font-mono mt-1 break-all">
                                                {log.signature_hash.substring(0, 16)}...
                                            </p>
                                        {/if}
                                    </div>
                                </div>

                                <!-- File Hash -->
                                {#if log.file_hash}
                                    <div class="mt-3 p-2 bg-surface-muted/50 rounded border border-border-subtle">
                                        <p class="text-[8px] font-mono text-text-muted break-all">
                                            SHA256: {log.file_hash.substring(0, 32)}...
                                        </p>
                                    </div>
                                {/if}
                            </div>
                        </div>
                    {/each}
                </div>
            {/if}
        </div>

        <!-- Footer -->
        <div class="px-6 py-4 bg-surface-muted/30 border-t border-border-subtle">
            <p class="text-[10px] text-text-muted font-medium">
                ✓ All entries are immutable and cryptographically signed. Tampering can be detected.
            </p>
        </div>
    </div>
</div>
