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
    <div class="mb-8" in:fly={{ y: -20, duration: 500 }}>
        <div
            class="glass-card shadow-elevated overflow-hidden border-l-4 transition-all duration-300 {highSeverityAlerts.length >
            0
                ? 'border-gov-red'
                : 'border-gov-gold'}"
        >
            <button
                class="w-full flex items-center justify-between p-5 bg-white/40 cursor-pointer text-left hover:bg-white/60 transition-colors"
                onclick={() => (expanded = !expanded)}
                aria-expanded={expanded}
            >
                <div class="flex items-center gap-4">
                    <div
                        class="w-10 h-10 rounded-full flex items-center justify-center text-xs font-black bg-white shadow-sm border border-black/10"
                    >
                        {highSeverityAlerts.length > 0 ? "!!" : "!"}
                    </div>
                    <div>
                        <h3
                            class="font-bold text-text-primary text-base flex items-center gap-2"
                        >
                            Compliance Intervention Alerts
                            <span
                                class="inline-flex items-center justify-center px-2 py-0.5 rounded-full text-[10px] font-bold {highSeverityAlerts.length >
                                0
                                    ? 'bg-gov-red text-white'
                                    : 'bg-gov-gold text-text-primary'}"
                            >
                                {totalCount} Issues
                            </span>
                        </h3>
                        <p
                            class="text-xs text-text-muted mt-0.5 leading-relaxed"
                        >
                            {#if highSeverityAlerts.length > 0}
                                Patterns detected in {highSeverityAlerts.length}
                                teachers requiring immediate supervisor intervention.
                            {:else}
                                Submission consistency issues identified in {totalCount}
                                teachers.
                            {/if}
                        </p>
                    </div>
                </div>
                <div
                    class="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-black/5 transition-colors"
                >
                    <span
                        class="text-xs font-bold text-text-muted uppercase tracking-tighter"
                        >{expanded ? "Hide" : "Review"}</span
                    >
                    <span
                        class="text-text-muted transition-transform duration-300 text-[10px]"
                        style="transform: rotate({expanded
                            ? '180deg'
                            : '0deg'})"
                    >
                        ▼
                    </span>
                </div>
            </button>

            {#if expanded}
                <div class="p-1 bg-white/20" transition:slide>
                    <div
                        class="max-h-[320px] overflow-y-auto px-4 pb-4 space-y-2"
                    >
                        {#each alerts as alert}
                            <div
                                class="p-4 rounded-xl bg-white/60 border border-white/50 shadow-sm hover:shadow-md transition-all"
                            >
                                <div
                                    class="flex items-start justify-between gap-4"
                                >
                                    <div class="min-w-0">
                                        <div
                                            class="flex items-center gap-2 mb-1"
                                        >
                                            <p
                                                class="text-sm font-bold text-text-primary truncate"
                                            >
                                                {alert.full_name}
                                            </p>
                                            <span
                                                class="text-[9px] px-1.5 py-0.5 rounded bg-gray-100 text-text-muted font-bold tracking-tight"
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
                                            class="text-[9px] font-black uppercase px-2 py-1 rounded shadow-sm {alert.severity ===
                                            'high'
                                                ? 'bg-gov-red text-white'
                                                : 'bg-gov-gold text-text-primary'}"
                                        >
                                            {alert.severity} Risk
                                        </span>
                                        <div class="mt-3">
                                            <button
                                                class="text-[10px] font-bold text-gov-blue hover:text-gov-blue-dark transition-colors flex items-center gap-1 ml-auto"
                                            >
                                                Process Intervention <span
                                                    >→</span
                                                >
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
