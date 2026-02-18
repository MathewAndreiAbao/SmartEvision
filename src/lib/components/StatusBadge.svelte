<script lang="ts">
    interface Props {
        status: "compliant" | "late" | "non-compliant" | "pending" | "review";
        size?: "sm" | "md";
    }

    let { status, size = "md" }: Props = $props();

    const config: Record<
        string,
        { bg: string; text: string; label: string; icon: string }
    > = {
        compliant: {
            bg: "bg-deped-green/15",
            text: "text-deped-green",
            label: "Compliant",
            icon: "✓",
        },
        late: {
            bg: "bg-deped-gold/15",
            text: "text-deped-gold-dark",
            label: "Late",
            icon: "⏰",
        },
        "non-compliant": {
            bg: "bg-deped-red/15",
            text: "text-deped-red",
            label: "Non-compliant",
            icon: "✕",
        },
        pending: {
            bg: "bg-gray-200/50",
            text: "text-text-muted",
            label: "Pending",
            icon: "⏳",
        },
        review: {
            bg: "bg-deped-blue/15",
            text: "text-deped-blue",
            label: "Under Review",
            icon: "👁",
        },
    };

    const c = $derived(config[status] || config.pending);
    const sizeClass = $derived(
        size === "sm" ? "text-xs px-2.5 py-1" : "text-sm px-3.5 py-1.5",
    );
</script>

<span
    class="inline-flex items-center gap-1.5 rounded-full font-semibold {c.bg} {c.text} {sizeClass}"
>
    <span class="text-xs">{c.icon}</span>
    {c.label}
</span>
