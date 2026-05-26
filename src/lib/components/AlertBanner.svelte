<script lang="ts">
    import type { PatternAlert } from "$lib/utils/patternDetection";
    import { fly, slide } from "svelte/transition";

    interface Props {
        alerts?: PatternAlert[];
    }

    let { alerts = [] }: Props = $props();
    let expanded = $state(false);

    const highSeverityAlerts = $derived(
        alerts.filter((a) => a.severity === "high"),
    );
    const totalCount = $derived(alerts.length);
</script>

{#if totalCount > 0}
    <div class="mb-6" in:fly={{ y: -10, duration: 300 }}>
        <div
            class="gov-card-static overflow-hidden border-l-4 {highSeverityAlerts.length >
            0
                ? 'border-l-gov-red'
                : 'border-l-gov-gold'}"
        >
            <button
                class="w-full flex items-center justify-between p-3 sm:p-4 cursor-pointer text-left hover:bg-surface-muted/50 transition-colors"
                onclick={() => (expanded = !expanded)}
                aria-expanded={expanded}
            >
                <div class="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                    <div
                        class="w-7 h-7 sm:w-8 sm:h-8 rounded-md flex-shrink-0 flex items-center justify-center text-[10px] sm:text-xs font-semibold bg-surface-muted border border-border-subtle"
                    >
                        {highSeverityAlerts.length > 0 ? "!!" : "!"}
                    </div>
                    <div class="min-w-0 flex-1">
                        <h3
                            class="font-semibold text-text-primary text-xs sm:text-sm flex items-center gap-1.5 sm:gap-2 flex-wrap"
                        >
                            Compliance Alerts
                            <span
                                class="inline-flex items-center justify-center px-1.5 py-0.5 rounded text-[9px] sm:text-[10px] font-medium {highSeverityAlerts.length >
                                0
                                    ? 'bg-gov-red text-white'
                                    : 'bg-gov-gold/20 text-gov-gold-dark'}"
                            >
                                {totalCount}
                            </span>
                        </h3>
                        <p
                            class="text-[10px] sm:text-xs text-text-muted mt-0.5 truncate"
                        >
                            {#if highSeverityAlerts.length > 0}
                                {highSeverityAlerts.length} teachers requiring immediate
                                intervention.
                            {:else}
                                {totalCount} submission consistency issues identified.
                            {/if}
                        </p>
                    </div>
                </div>
                <div
                    class="flex items-center gap-1 px-1.5 py-1 rounded-md hover:bg-surface-muted transition-colors flex-shrink-0 ml-2"
                >
                    <span
                        class="hidden sm:inline text-xs font-medium text-text-muted"
                        >{expanded ? "Hide" : "Review"}</span
                    >
                    <span
                        class="text-text-muted transition-transform duration-200 text-[9px] sm:text-[10px]"
                        style="transform: rotate({expanded
                            ? '180deg'
                            : '0deg'})"
                    >
                        ▼
                    </span>
                </div>
            </button>

            {#if expanded}
                <div class="border-t border-border-subtle" transition:slide>
                    <div
                        class="max-h-[320px] overflow-y-auto p-2 sm:p-3 space-y-2"
                    >
                        {#each alerts as alert}
                            <div
                                class="p-2 sm:p-3 rounded-md bg-surface-muted/50 border border-border-subtle"
                            >
                                <div
                                    class="flex flex-col sm:flex-row sm:items-start justify-between gap-2 sm:gap-3"
                                >
                                    <div class="min-w-0 flex-1">
                                        <div
                                            class="flex items-center gap-1.5 mb-1 flex-wrap"
                                        >
                                            <p
                                                class="text-xs sm:text-sm font-medium text-text-primary truncate"
                                            >
                                                {alert.full_name}
                                            </p>
                                            <span
                                                class="text-[9px] sm:text-[10px] px-1 py-0.5 rounded bg-surface-muted text-text-muted font-medium truncate max-w-[120px]"
                                            >
                                                {alert.school_name}
                                            </span>
                                        </div>
                                        <p
                                            class="text-[11px] sm:text-xs text-text-secondary leading-normal"
                                        >
                                            {alert.details}
                                        </p>
                                    </div>
                                    <div
                                        class="flex items-center justify-between sm:flex-col sm:items-end sm:justify-start gap-2 flex-shrink-0"
                                    >
                                        <span
                                            class="text-[9px] sm:text-[10px] font-medium uppercase px-1.5 py-0.5 rounded {alert.severity ===
                                            'high'
                                                ? 'bg-gov-red/10 text-gov-red'
                                                : 'bg-gov-gold/10 text-gov-gold-dark'}"
                                        >
                                            {alert.severity}
                                        </span>
                                        <div class="sm:mt-2">
                                            <button
                                                class="text-[11px] sm:text-xs font-medium text-gov-blue hover:text-gov-blue-dark transition-colors flex items-center gap-1"
                                            >
                                                Intervene <span>→</span>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        {/each}
                    </div>
                </div>
            {/if}
        </div>
    </div>
{/if}
