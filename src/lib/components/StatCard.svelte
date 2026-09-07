<script lang="ts">
    import * as Lucide from "lucide-svelte";
    import { TrendingUp, TrendingDown } from "lucide-svelte";

    interface Props {
        value: string | number;
        label: string;
        trend?: { value: number; direction: "up" | "down" };
        color?: string;
        icon?: keyof typeof Lucide;
    }

    let {
        value,
        label,
        trend,
        color = "from-gov-blue to-gov-blue-dark",
        icon,
    }: Props = $props();

    const IconComponent = $derived(icon ? (Lucide[icon] as any) : null);

    function getBorderColor(c: string): string {
        if (c.includes("green")) return "border-l-gov-green";
        if (c.includes("gold")) return "border-l-gov-gold";
        if (c.includes("red")) return "border-l-gov-red";
        return "border-l-gov-blue";
    }
</script>

<div class="gov-card-static p-4 border-l-4 {getBorderColor(color)}">
    <div class="flex items-start justify-between">
        <div class="flex-1">
            <div class="flex items-center gap-2 mb-1.5">
                {#if IconComponent}
                    <div
                        class="p-1 rounded-md transition-colors {color.includes(
                            'green',
                        )
                            ? 'bg-gov-green/10 text-gov-green'
                            : color.includes('gold')
                              ? 'bg-gov-gold/10 text-gov-gold-dark'
                              : color.includes('red')
                                ? 'bg-gov-red/10 text-gov-red'
                                : 'bg-gov-blue/10 text-gov-blue'}"
                    >
                        <IconComponent size={14} strokeWidth={2} />
                    </div>
                {/if}
                <p
                    class="text-text-muted text-xs font-medium uppercase tracking-wide"
                >
                    {label}
                </p>
            </div>

            <p class="text-2xl font-bold text-text-primary">
                {value}
            </p>

            {#if trend}
                <div class="flex items-center gap-1.5 mt-2">
                    <div
                        class="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs font-medium {trend.direction ===
                        'up'
                            ? 'bg-gov-green/10 text-gov-green'
                            : 'bg-gov-red/10 text-gov-red'}"
                    >
                        {#if trend.direction === "up"}
                            <TrendingUp size={12} strokeWidth={1.5} />
                        {:else}
                            <TrendingDown size={12} strokeWidth={1.5} />
                        {/if}
                        {Math.abs(trend.value)}%
                    </div>
                    <span class="text-xs text-text-muted">vs last week</span>
                </div>
            {/if}
        </div>
    </div>
</div>
