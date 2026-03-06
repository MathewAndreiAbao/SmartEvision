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
                class="w-full flex items-center justify-between p-4 cursor-pointer text-left hover:bg-surface-muted/50 transition-colors"
                onclick={() => (expanded = !expanded)}
                aria-expanded={expanded}
            >
                <div class="flex items-center gap-3">
                    <div
                        class="w-8 h-8 rounded-md flex items-center justify-center text-xs font-semibold bg-surface-muted border border-border-subtle"
                    >
                        {highSeverityAlerts.length > 0 ? "!!" : "!"}
                    </div>
                    <div>
                        <h3
                            class="font-semibold text-text-primary text-sm flex items-center gap-2"
                        >
                            Compliance Intervention Alerts
                            <span
                                class="inline-flex items-center justify-center px-1.5 py-0.5 rounded text-[10px] font-medium {highSeverityAlerts.length >
                                0
                                    ? 'bg-gov-red text-white'
                                    : 'bg-gov-gold/20 text-gov-gold-dark'}"
                            >
                                {totalCount}
                            </span>
                        </h3>
                        <p class="text-xs text-text-muted mt-0.5">
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
                    class="flex items-center gap-1 px-2 py-1 rounded-md hover:bg-surface-muted transition-colors"
                >
                    <span class="text-xs font-medium text-text-muted"
                        >{expanded ? "Hide" : "Review"}</span
                    >
                    <span
                        class="text-text-muted transition-transform duration-200 text-[10px]"
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
                    <div class="max-h-[280px] overflow-y-auto p-3 space-y-2">
                        {#each alerts as alert}
                            <div
                                class="p-3 rounded-md bg-surface-muted/50 border border-border-subtle"
                            >
                                <div
                                    class="flex items-start justify-between gap-3"
                                >
                                    <div class="min-w-0 flex-1">
                                        <div
                                            class="flex items-center gap-2 mb-1"
                                        >
                                            <p
                                                class="text-sm font-medium text-text-primary truncate"
                                            >
                                                {alert.full_name}
                                            </p>
                                            <span
                                                class="text-[10px] px-1.5 py-0.5 rounded bg-surface-muted text-text-muted font-medium"
                                            >
                                                {alert.school_name}
                                            </span>
                                        </div>
                                        <p
                                            class="text-xs text-text-secondary leading-relaxed"
                                        >
                                            {alert.details}
                                        </p>
                                    </div>
                                    <div class="text-right flex-shrink-0">
                                        <span
                                            class="text-[10px] font-medium uppercase px-1.5 py-0.5 rounded {alert.severity ===
                                            'high'
                                                ? 'bg-gov-red/10 text-gov-red'
                                                : 'bg-gov-gold/10 text-gov-gold-dark'}"
                                        >
                                            {alert.severity}
                                        </span>
                                        <div class="mt-2">
                                            <button
                                                class="text-xs font-medium text-gov-blue hover:text-gov-blue-dark transition-colors flex items-center gap-1 ml-auto"
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
