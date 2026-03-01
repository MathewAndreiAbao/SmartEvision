<script lang="ts">
    import {
        CheckCircle2,
        Clock,
        AlertCircle,
        Search,
        Loader2,
        type Icon,
    } from "lucide-svelte";

    interface Props {
        status: string;
        size?: "sm" | "md";
    }

    let { status, size = "md" }: Props = $props();

    const config: Record<
        string,
        {
            bg: string;
            text: string;
            border: string;
            label: string;
            icon: any;
        }
    > = {
        compliant: {
            bg: "bg-gov-green/10",
            text: "text-gov-green",
            border: "border-gov-green/30",
            label: "Compliant",
            icon: CheckCircle2,
        },
        late: {
            bg: "bg-gov-gold/10",
            text: "text-gov-gold-dark",
            border: "border-gov-gold/40",
            label: "Late",
            icon: Clock,
        },
        "non-compliant": {
            bg: "bg-gov-red/10",
            text: "text-gov-red",
            border: "border-gov-red/30",
            label: "Non-Compliant",
            icon: AlertCircle,
        },
        pending: {
            bg: "bg-slate-100",
            text: "text-slate-600",
            border: "border-slate-200",
            label: "Pending",
            icon: Loader2,
        },
        review: {
            bg: "bg-gov-blue/10",
            text: "text-gov-blue",
            border: "border-gov-blue/30",
            label: "Under Review",
            icon: Search,
        },
    };

    // Normalize input to handle different casings
    const normalizedStatus = $derived(() => {
        if (!status) return "pending";
        const s = status.toLowerCase();
        if (s === "compliant" || s === "on-time") return "compliant";
        if (s === "late") return "late";
        if (s === "non-compliant" || s === "non compliant" || s === "missing")
            return "non-compliant";
        if (s === "pending") return "pending";
        if (s === "review" || s === "under review") return "review";
        return s; // Fallback to lowercase
    });

    const c = $derived(config[normalizedStatus()] || config.pending);
    const IconComponent = $derived(c.icon);
    const sizeClass = $derived(
        size === "sm" ? "text-[10px] px-2 py-0.5" : "text-xs px-3 py-1",
    );
</script>

<span
    class="inline-flex items-center gap-1.5 rounded-full border font-bold uppercase tracking-tight {c.bg} {c.text} {c.border} {sizeClass} transition-all duration-300"
>
    <IconComponent size={size === "sm" ? 12 : 14} />
    {c.label}
</span>
