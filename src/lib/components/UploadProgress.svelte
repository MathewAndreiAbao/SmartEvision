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
    <div class="flex items-center justify-between mb-6">
        {#each steps as step, i}
            {@const status = getStepStatus(step)}
            <div class="flex flex-col items-center gap-2 flex-1">
                <div
                    class="w-12 h-12 rounded-xl flex items-center justify-center text-xl transition-all duration-300
						{status === 'done' ? 'bg-gov-green text-white shadow-md' : ''}
						{status === 'active'
                        ? 'bg-gov-blue text-white shadow-lg animate-pulse-glow'
                        : ''}
						{status === 'pending' ? 'bg-gray-100 text-text-muted' : ''}
						{status === 'error' ? 'bg-gov-red text-white' : ''}"
                >
                    {#if status === "done"}
                        DONE
                    {:else}
                        {step.icon}
                    {/if}
                </div>
                <span
                    class="text-xs font-medium text-center
					{status === 'active' ? 'text-gov-blue font-semibold' : 'text-text-muted'}"
                >
                    {step.label}
                </span>
            </div>

            {#if i < steps.length - 1}
                <div
                    class="flex-shrink-0 w-8 h-0.5 mt-[-1.5rem]
					{getStepStatus(steps[i]) === 'done' ? 'bg-gov-green' : 'bg-gray-200'}"
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
