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
</script>

<div
    class="gov-card p-6 relative group border-l-4 overflow-hidden {color.includes(
        'green',
    )
        ? 'border-l-gov-green'
        : color.includes('gold')
          ? 'border-l-gov-gold'
          : color.includes('red')
            ? 'border-l-gov-red'
            : 'border-l-gov-blue'}"
>
    <!-- Background Icon Decoration -->
    {#if IconComponent}
        <div
            class="absolute -right-2 -bottom-2 opacity-[0.03] group-hover:opacity-[0.06] transition-opacity duration-500"
        >
            <IconComponent size={80} strokeWidth={1} />
        </div>
    {/if}

    <div class="flex items-start justify-between relative z-10">
        <div class="flex-1">
            <div class="flex items-center gap-2 mb-2">
                {#if IconComponent}
                    <div
                        class="p-1.5 rounded-lg bg-surface-muted text-text-secondary"
                    >
                        <IconComponent size={14} />
                    </div>
                {/if}
                <p
                    class="text-text-muted text-[10px] font-bold uppercase tracking-wider"
                >
                    {label}
                </p>
            </div>

            <p class="text-3xl font-black text-text-primary tracking-tight">
                {value}
            </p>

            {#if trend}
                <div class="flex items-center gap-1.5 mt-4">
                    <div
                        class="flex items-center gap-0.5 px-2 py-0.5 rounded-full text-xs font-bold {trend.direction ===
                        'up'
                            ? 'bg-gov-green/10 text-gov-green'
                            : 'bg-gov-red/10 text-gov-red'}"
                    >
                        {#if trend.direction === "up"}
                            <TrendingUp size={12} />
                        {:else}
                            <TrendingDown size={12} />
                        {/if}
                        {Math.abs(trend.value)}%
                    </div>
                    <span class="text-[10px] text-text-muted font-medium"
                        >vs last week</span
                    >
                </div>
            {/if}
        </div>
    </div>
</div>
