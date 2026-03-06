<script lang="ts">
    import { fly, fade } from "svelte/transition";

    interface Props {
        data: {
            labels: string[];
            matrix: number[][]; // [Actual][Predicted]
            accuracy: number;
            precision: number;
            recall: number;
        };
    }

    let { data }: Props = $props();

    // Calculate cell color based on value vs. row total
    function getCellColor(value: number, rowIndex: number) {
        if (value === 0) return "bg-gray-50 text-gray-300";

        const rowTotal = data.matrix[rowIndex].reduce((a, b) => a + b, 0);
        const ratio = value / rowTotal;
        const isDiagonal = value === data.matrix[rowIndex][rowIndex];

        if (isDiagonal) {
            if (ratio > 0.8)
                return "bg-gov-green/20 text-gov-green-dark font-bold";
            if (ratio > 0.5) return "bg-gov-green/10 text-gov-green";
            return "bg-gov-green/5 text-gov-green/70";
        } else {
            if (ratio > 0.3) return "bg-gov-red/20 text-gov-red font-bold";
            return "bg-gov-red/5 text-gov-red/70";
        }
    }
</script>

<div class="glass-card-static p-6 space-y-6" in:fly={{ y: 20, duration: 600 }}>
    <div class="flex items-center justify-between">
        <div>
            <h3
                class="text-lg font-bold text-text-primary uppercase tracking-tight"
            >
                AI Model Accuracy Matrix
            </h3>
            <p class="text-xs text-text-muted mt-1">
                Proof of Accuracy for Subject Matching (Naive Bayes)
            </p>
        </div>
        <div class="flex gap-4">
            <div class="text-right">
                <p class="text-[10px] font-black text-gov-blue uppercase">
                    Accuracy
                </p>
                <p class="text-2xl font-black text-gov-blue">
                    {(data.accuracy * 100).toFixed(1)}%
                </p>
            </div>
        </div>
    </div>

    <!-- Matrix Table -->
    <div class="overflow-x-auto">
        <table class="w-full border-collapse">
            <thead>
                <tr>
                    <th
                        class="p-2 text-[10px] text-text-muted uppercase text-left w-24"
                        >Actual / Pred</th
                    >
                    {#each data.labels as label}
                        <th
                            class="p-2 text-[10px] text-text-muted uppercase text-center min-w-[80px]"
                            >{label}</th
                        >
                    {/each}
                </tr>
            </thead>
            <tbody>
                {#each data.matrix as row, i}
                    <tr>
                        <td
                            class="p-2 text-xs font-black text-text-secondary border-r border-border-subtle"
                            >{data.labels[i]}</td
                        >
                        {#each row as cell, j}
                            <td
                                class="p-4 text-center text-sm border border-border-subtle transition-colors {getCellColor(
                                    cell,
                                    i,
                                )}"
                            >
                                {cell}
                            </td>
                        {/each}
                    </tr>
                {/each}
            </tbody>
        </table>
    </div>

    <!-- Summary Metrics -->
    <div
        class="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-border-subtle"
    >
        <div class="space-y-1">
            <p
                class="text-[9px] font-black text-text-muted uppercase tracking-widest"
            >
                Precision
            </p>
            <p class="text-lg font-bold text-text-primary">
                {(data.precision * 100).toFixed(1)}%
            </p>
        </div>
        <div class="space-y-1">
            <p
                class="text-[9px] font-black text-text-muted uppercase tracking-widest"
            >
                Recall
            </p>
            <p class="text-lg font-bold text-text-primary">
                {(data.recall * 100).toFixed(1)}%
            </p>
        </div>
        <div class="space-y-1">
            <p
                class="text-[9px] font-black text-text-muted uppercase tracking-widest"
            >
                F1-Score
            </p>
            <p class="text-lg font-bold text-gov-green">
                {(
                    ((2 * data.precision * data.recall) /
                        (data.precision + data.recall)) *
                    100
                ).toFixed(1)}%
            </p>
        </div>
        <div class="space-y-1">
            <p
                class="text-[9px] font-black text-text-muted uppercase tracking-widest"
            >
                Samples
            </p>
            <p class="text-lg font-bold text-text-primary">
                {data.matrix.flat().reduce((a, b) => a + b, 0)}
            </p>
        </div>
    </div>

    <div class="p-4 rounded-xl bg-gov-blue/5 border border-gov-blue/10">
        <p class="text-[10px] leading-relaxed text-gov-blue/80 italic">
            <strong>Documentation Note:</strong> The diagonal (top-left to bottom-right)
            represents correct predictions. Higher values in the diagonal prove the
            AI efficiently matches Lesson Plans to their corresponding Teaching Load
            slots.
        </p>
    </div>
</div>
