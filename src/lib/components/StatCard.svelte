<script lang="ts">
    interface Props {
        icon: string;
        value: string | number;
        label: string;
        trend?: { value: number; direction: "up" | "down" };
        color?: string;
    }

    let {
        icon,
        value,
        label,
        trend,
        color = "from-deped-blue to-deped-blue-dark",
    }: Props = $props();
</script>

<div class="glass-card p-6 relative overflow-hidden group">
    <!-- Gradient accent bar -->
    <div
        class="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r {color} opacity-60 group-hover:opacity-100 transition-opacity"
    ></div>

    <div class="flex items-start justify-between">
        <div class="flex-1">
            <p class="text-text-muted text-base font-medium mb-1">{label}</p>
            <p class="text-3xl font-bold text-text-primary tracking-tight">
                {value}
            </p>

            {#if trend}
                <div class="flex items-center gap-1 mt-2">
                    <span
                        class="text-sm {trend.direction === 'up'
                            ? 'text-deped-green'
                            : 'text-deped-red'}"
                    >
                        {trend.direction === "up" ? "↑" : "↓"}
                        {Math.abs(trend.value)}%
                    </span>
                    <span class="text-xs text-text-muted">vs last week</span>
                </div>
            {/if}
        </div>

        <div
            class="w-14 h-14 rounded-2xl bg-gradient-to-br {color} flex items-center justify-center text-2xl text-white shadow-md flex-shrink-0"
        >
            {icon}
        </div>
    </div>
</div>
