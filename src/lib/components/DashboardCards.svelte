<script lang="ts">
    import { Clock, CheckCircle, AlertCircle, FileText, TrendingUp, Users, Building2, AlertTriangle } from "lucide-svelte";

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
        success: 'bg-gov-green/10 border-gov-green/20 text-gov-green',
        warning: 'bg-gov-gold/10 border-gov-gold/20 text-gov-gold-dark',
        danger: 'bg-gov-red/10 border-gov-red/20 text-gov-red',
        info: 'bg-gov-blue/10 border-gov-blue/20 text-gov-blue'
    };

    const iconClasses = {
        success: 'bg-gov-green/20 text-gov-green',
        warning: 'bg-gov-gold/20 text-gov-gold-dark',
        danger: 'bg-gov-red/20 text-gov-red',
        info: 'bg-gov-blue/20 text-gov-blue'
    };
</script>

<div class="gov-card-static p-6 border-l-4 {variantClasses[variant]}">
    <div class="flex items-start justify-between gap-4">
        <div class="flex-1 min-w-0">
            <p class="text-sm font-semibold text-text-secondary uppercase tracking-wide mb-2">
                {title}
            </p>
            <div class="flex items-baseline gap-2">
                <p class="text-3xl font-bold text-text-primary">
                    {value}
                </p>
                {#if unit}
                    <span class="text-sm font-medium text-text-secondary">{unit}</span>
                {/if}
            </div>
            {#if subtitle}
                <p class="text-xs text-text-secondary mt-1">{subtitle}</p>
            {/if}
            {#if trend !== undefined}
                <div class="flex items-center gap-1 mt-3">
                    <TrendingUp size={16} class={trend >= 0 ? 'text-gov-green' : 'text-gov-red'} />
                    <span class="text-xs font-semibold {trend >= 0 ? 'text-gov-green' : 'text-gov-red'}">
                        {trend >= 0 ? '+' : ''}{trend}%
                    </span>
                    {#if trendLabel}
                        <span class="text-xs text-text-muted">{trendLabel}</span>
                    {/if}
                </div>
            {/if}
        </div>
        <div class="flex-shrink-0 p-3 rounded-xl {iconClasses[variant]}">
            <svelte:component this={IconComponent} size={24} />
        </div>
    </div>
</div>
