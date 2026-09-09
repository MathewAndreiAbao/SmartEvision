<script lang="ts">
    import { TrendingUp } from "lucide-svelte";

    interface Props {
        title: string;
        value: number | string;
        unit?: string;
        icon: any;
        variant?: 'success' | 'warning' | 'danger' | 'info';
        trend?: number;
        trendLabel?: string;
        subtitle?: string;
    }

    let { title, value, unit, icon: IconComponent, variant = 'info', trend, trendLabel, subtitle } = $props<Props>();

    const variantClasses = {
        success: 'bg-gov-green/10',
        warning: 'bg-gov-gold/10',
        danger: 'bg-gov-red/10',
        info: 'bg-gov-blue/10'
    };

    const iconClasses = {
        success: 'text-gov-green',
        warning: 'text-gov-gold-dark',
        danger: 'text-gov-red',
        info: 'text-gov-blue'
    };

    const trendColor = (trend: number) => trend >= 0 ? 'text-gov-green' : 'text-gov-red';
</script>

<!-- Professional Metric Card with hover effects -->
<div class="metric-card">
    <div class="flex items-start justify-between gap-4">
        <div class="flex-1 min-w-0">
            <div class="metric-label">
                {title}
            </div>
            <div class="flex items-baseline gap-2">
                <p class="metric-value">
                    {value}
                </p>
                {#if unit}
                    <span class="text-sm font-medium text-text-secondary">{unit}</span>
                {/if}
            </div>
            {#if subtitle}
                <p class="metric-subtitle">{subtitle}</p>
            {/if}
            {#if trend !== undefined}
                <div class="flex items-center gap-1 mt-3">
                    <TrendingUp size={16} class={trendColor(trend)} strokeWidth={2} />
                    <span class="text-xs font-semibold {trendColor(trend)}">
                        {trend >= 0 ? '+' : ''}{trend}%
                    </span>
                    {#if trendLabel}
                        <span class="text-xs text-text-muted">{trendLabel}</span>
                    {/if}
                </div>
            {/if}
        </div>
        <div class="flex-shrink-0 p-3 rounded-lg {variantClasses[variant]} {iconClasses[variant]}">
            <svelte:component this={IconComponent} size={24} strokeWidth={1.5} />
        </div>
    </div>
</div>
