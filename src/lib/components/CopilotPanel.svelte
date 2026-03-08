<script lang="ts">
    import { fly, fade } from "svelte/transition";
    import {
        analyzeCopilot,
        getSuggestionColor,
        type CopilotSuggestion,
        type CopilotContext,
    } from "$lib/utils/copilot";

    interface Props {
        teachingLoads: { id: string; subject: string; grade_level: string }[];
        submissions: any[];
        currentWeek?: number;
        selectedWeek?: number;
        selectedDocType?: string;
        selectedLoadId?: string;
        calendarDeadlines?: { week_number: number; deadline_date: string }[];
        onApplySuggestion?: (action: CopilotSuggestion["action"]) => void;
    }

    let {
        teachingLoads,
        submissions,
        currentWeek,
        selectedWeek,
        selectedDocType,
        selectedLoadId,
        calendarDeadlines,
        onApplySuggestion,
    }: Props = $props();

    let suggestions = $state<CopilotSuggestion[]>([]);
    let analyzing = $state(true);
    let collapsed = $state(false);

    // Re-analyze when context changes
    $effect(() => {
        analyzing = true;
        const ctx: CopilotContext = {
            teachingLoads,
            submissions,
            currentWeek,
            selectedWeek,
            selectedDocType,
            selectedLoadId,
            calendarDeadlines,
        };

        // Small delay to show "thinking" animation
        const timer = setTimeout(() => {
            suggestions = analyzeCopilot(ctx);
            analyzing = false;
        }, 300);

        return () => clearTimeout(timer);
    });

    function handleApply(suggestion: CopilotSuggestion) {
        if (suggestion.action && onApplySuggestion) {
            onApplySuggestion(suggestion.action);
        }
    }
</script>

<div
    class="gov-card-static overflow-hidden transition-all duration-500"
    in:fly={{ x: 20, duration: 500 }}
>
    <!-- Header -->
    <button
        class="w-full p-5 flex items-center justify-between group cursor-pointer"
        onclick={() => (collapsed = !collapsed)}
    >
        <div class="flex items-center gap-3">
            <div class="relative">
                <div
                    class="p-2 rounded-xl bg-gradient-to-br from-gov-blue/10 to-indigo-500/10 text-gov-blue group-hover:scale-105 transition-transform"
                >
                    <svg
                        class="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        stroke-width="1.5"
                    >
                        <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19 14.5M14.25 3.104c.251.023.501.05.75.082M19 14.5l-2.47 2.47a2.25 2.25 0 01-1.59.659H9.06a2.25 2.25 0 01-1.591-.659L5 14.5m14 0l.016.016"
                        />
                    </svg>
                </div>
                {#if analyzing}
                    <div
                        class="absolute -top-0.5 -right-0.5 w-3 h-3 bg-gov-blue rounded-full animate-ping"
                    ></div>
                {/if}
            </div>
            <div class="text-left">
                <h3
                    class="text-sm font-semibold text-text-primary uppercase tracking-wide"
                >
                    Smart Copilot
                </h3>
                <p class="text-[9px] text-text-muted font-medium">
                    AI-powered upload assistant
                </p>
            </div>
        </div>
        <div class="flex items-center gap-2">
            {#if suggestions.length > 0 && !analyzing}
                <span
                    class="px-2 py-0.5 bg-gov-blue/10 text-gov-blue text-[9px] font-semibold rounded-full"
                >
                    {suggestions.length}
                </span>
            {/if}
            <svg
                class="w-4 h-4 text-text-muted transition-transform duration-300 {collapsed
                    ? 'rotate-180'
                    : ''}"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                stroke-width="1.5"
            >
                <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    d="M19 9l-7 7-7-7"
                />
            </svg>
        </div>
    </button>

    <!-- Content -->
    {#if !collapsed}
        <div class="px-5 pb-5 space-y-3" in:fly={{ y: -10, duration: 300 }}>
            {#if analyzing}
                <!-- Thinking Animation -->
                <div
                    class="flex items-center gap-3 p-4 rounded-md bg-gov-blue/3 border border-gov-blue/10"
                >
                    <div class="flex gap-1">
                        <div
                            class="w-2 h-2 bg-gov-blue/40 rounded-full animate-bounce"
                            style="animation-delay: 0ms"
                        ></div>
                        <div
                            class="w-2 h-2 bg-gov-blue/40 rounded-full animate-bounce"
                            style="animation-delay: 150ms"
                        ></div>
                        <div
                            class="w-2 h-2 bg-gov-blue/40 rounded-full animate-bounce"
                            style="animation-delay: 300ms"
                        ></div>
                    </div>
                    <span class="text-xs font-bold text-gov-blue/60"
                        >Analyzing context...</span
                    >
                </div>
            {:else if suggestions.length === 0}
                <!-- All Clear -->
                <div
                    class="p-6 text-center rounded-md bg-gov-green/3 border border-gov-green/10"
                    in:fade={{ duration: 300 }}
                >
                    <p class="text-sm font-semibold text-gov-green">
                        All Clear!
                    </p>
                    <p class="text-[10px] text-text-muted mt-1">
                        No pending actions detected
                    </p>
                </div>
            {:else}
                <!-- Suggestions List -->
                {#each suggestions as suggestion, i (suggestion.id)}
                    {@const colors = getSuggestionColor(suggestion.type)}
                    <button
                        class="w-full text-left p-4 rounded-md border transition-all duration-200 hover:shadow-md hover:scale-[1.01] active:scale-[0.99] group {colors.bg} {colors.border}"
                        onclick={() => handleApply(suggestion)}
                        in:fly={{ x: 15, duration: 300, delay: i * 80 }}
                    >
                        <div class="flex items-start gap-3">
                            {#if suggestion.icon}
                                <span class="text-lg mt-0.5 flex-shrink-0"
                                    >{suggestion.icon}</span
                                >
                            {/if}
                            <div class="flex-1 min-w-0">
                                <div class="flex items-center gap-2 mb-1">
                                    <span
                                        class="text-[9px] font-semibold uppercase tracking-wide {colors.text}"
                                    >
                                        {suggestion.title}
                                    </span>
                                    {#if suggestion.priority === "high"}
                                        <span
                                            class="px-1.5 py-0.5 bg-gov-red/10 text-gov-red text-[8px] font-semibold rounded-full uppercase"
                                        >
                                            Urgent
                                        </span>
                                    {/if}
                                </div>
                                <p
                                    class="text-xs text-text-secondary font-medium leading-relaxed"
                                >
                                    {suggestion.message}
                                </p>
                                {#if suggestion.action}
                                    <div
                                        class="mt-2 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        <svg
                                            class="w-3 h-3 text-gov-blue"
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                            stroke-width="1.5"
                                        >
                                            <path
                                                stroke-linecap="round"
                                                stroke-linejoin="round"
                                                d="M13 7l5 5m0 0l-5 5m5-5H6"
                                            />
                                        </svg>
                                        <span
                                            class="text-[9px] font-semibold text-gov-blue uppercase tracking-wide"
                                            >Tap to auto-fill</span
                                        >
                                    </div>
                                {/if}
                            </div>
                        </div>
                    </button>
                {/each}
            {/if}

            <!-- Footer Badge -->
            <div class="flex items-center justify-center gap-1.5 pt-2">
                <div
                    class="w-1.5 h-1.5 rounded-full bg-gov-green animate-pulse"
                ></div>
                <span
                    class="text-[8px] font-bold text-text-muted uppercase tracking-wide"
                >
                    Offline-Ready · Rule Engine v1.0
                </span>
            </div>
        </div>
    {/if}
</div>
