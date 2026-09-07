<script lang="ts">
    import type { PipelinePhase } from "$lib/types/pipeline";

    interface Props {
        currentPhase: PipelinePhase;
        progress?: number;
        message?: string;
    }

    let { currentPhase, progress = 0, message = "" }: Props = $props();
</script>

<div class="gov-card-static p-6">
    {#if currentPhase !== "done" && currentPhase !== "error"}
        <div class="w-full h-2 bg-surface-muted rounded-full overflow-hidden">
            <div
                class="h-full bg-gradient-to-r from-gov-blue to-gov-blue-light rounded-full transition-all duration-500"
                style="width: {progress}%"
            ></div>
        </div>
    {/if}

    {#if message}
        <p class="text-sm text-text-secondary mt-3 text-center font-medium">
            {message}
        </p>
    {/if}
</div>
