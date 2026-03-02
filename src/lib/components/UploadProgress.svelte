<script lang="ts">
    import type { PipelinePhase } from "$lib/utils/pipeline";

    interface Props {
        currentPhase: PipelinePhase;
        progress?: number;
        message?: string;
    }

    let { currentPhase, progress = 0, message = "" }: Props = $props();

    interface Step {
        phase: PipelinePhase;
        label: string;
        icon: string;
    }

    const steps: Step[] = [
        { phase: "transcoding", label: "Transcoding", icon: "" },
        { phase: "compressing", label: "Compressing", icon: "" },
        { phase: "analyzing", label: "Analyzing", icon: "" },
        { phase: "hashing", label: "Hashing", icon: "" },
        { phase: "stamping", label: "Stamping", icon: "" },
        { phase: "uploading", label: "Syncing", icon: "" },
    ];

    function getStepStatus(
        step: Step,
    ): "pending" | "active" | "done" | "error" {
        if (currentPhase === "error") {
            const idx = steps.findIndex((s) => s.phase === step.phase);
            const activeIdx = steps.findIndex((s) => s.phase === currentPhase);
            if (idx <= activeIdx) return "error";
            return "pending";
        }
        if (currentPhase === "done") return "done";

        const currentIdx = steps.findIndex((s) => s.phase === currentPhase);
        const stepIdx = steps.findIndex((s) => s.phase === step.phase);

        if (stepIdx < currentIdx) return "done";
        if (stepIdx === currentIdx) return "active";
        return "pending";
    }
</script>

<div class="glass-card-static p-6">
    <!-- Steps -->
    <div
        class="grid grid-cols-3 sm:flex sm:items-center sm:justify-between gap-y-6 gap-x-2 mb-6 relative"
    >
        {#each steps as step, i}
            {@const status = getStepStatus(step)}
            <div class="flex flex-col items-center gap-2 relative z-10">
                <div
                    class="w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center text-[10px] sm:text-xs font-bold transition-all duration-300
						{status === 'done' ? 'bg-gov-green text-white shadow-md' : ''}
						{status === 'active'
                        ? 'bg-gov-blue text-white shadow-lg animate-pulse-glow'
                        : ''}
						{status === 'pending' ? 'bg-gray-100 text-text-muted' : ''}
						{status === 'error' ? 'bg-gov-red text-white' : ''}"
                >
                    {#if status === "done"}
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            class="w-5 h-5"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            stroke-width="3"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            ><polyline points="20 6 9 17 4 12"></polyline></svg
                        >
                    {:else}
                        {i + 1}
                    {/if}
                </div>
                <span
                    class="text-[10px] sm:text-xs font-medium text-center leading-tight
					{status === 'active' ? 'text-gov-blue font-semibold' : 'text-text-muted'}"
                >
                    {step.label}
                </span>
            </div>

            <!-- Connector (only visible on desktop/tablet) -->
            {#if i < steps.length - 1}
                <div
                    class="hidden sm:block absolute top-[1.5rem] h-0.5 z-0
					{getStepStatus(steps[i]) === 'done' ? 'bg-gov-green' : 'bg-gray-200'}"
                    style="left: calc({(i / (steps.length - 1)) *
                        100}% + 2rem); width: calc({100 /
                        (steps.length - 1)}% - 4rem);"
                ></div>
            {/if}
        {/each}
    </div>

    <!-- Progress bar -->
    {#if currentPhase !== "done" && currentPhase !== "error"}
        <div class="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
                class="h-full bg-gradient-to-r from-gov-blue to-gov-blue-light rounded-full transition-all duration-500"
                style="width: {progress}%"
            ></div>
        </div>
    {/if}

    <!-- Message -->
    {#if message}
        <p class="text-sm text-text-secondary mt-3 text-center font-medium">
            {message}
        </p>
    {/if}
</div>
