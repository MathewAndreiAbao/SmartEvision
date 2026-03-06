<script lang="ts">
    import { onMount, onDestroy, tick } from "svelte";
    import { fly, fade } from "svelte/transition";
    import type {
        ClusterResult,
        ClusterSummary,
    } from "$lib/utils/clusterAnalytics";

    interface Props {
        results: ClusterResult[];
        summaries: ClusterSummary[];
    }

    let { results, summaries }: Props = $props();

    let scatterCanvas = $state<HTMLCanvasElement>();
    let radarCanvas = $state<HTMLCanvasElement>();
    let ChartClass: any = null;
    let scatterChart: any = null;
    let radarChart: any = null;
    let activeTab = $state<"scatter" | "radar">("scatter");

    onMount(async () => {
        const { Chart, registerables } = await import("chart.js");
        Chart.register(...registerables);
        ChartClass = Chart;
        await tick();
        renderCharts();
    });

    onDestroy(() => {
        if (scatterChart) scatterChart.destroy();
        if (radarChart) radarChart.destroy();
    });

    $effect(() => {
        if (ChartClass && results.length > 0) {
            tick().then(() => renderCharts());
        }
    });

    function renderCharts() {
        if (!ChartClass) return;
        renderScatter();
        renderRadar();
    }

    function renderScatter() {
        if (!scatterCanvas || !ChartClass) return;
        if (scatterChart) scatterChart.destroy();

        const snappedResults = $state.snapshot(results);

        // Group data by cluster
        const clusterGroups = new Map<
            number,
            {
                data: { x: number; y: number; label: string }[];
                color: string;
                label: string;
            }
        >();
        for (const r of snappedResults) {
            if (!clusterGroups.has(r.clusterId)) {
                clusterGroups.set(r.clusterId, {
                    data: [],
                    color: r.clusterColor,
                    label: r.clusterLabel,
                });
            }
            clusterGroups.get(r.clusterId)!.data.push({
                x: r.teacher.punctuality,
                y: r.teacher.consistency,
                label: r.teacher.teacherName,
            });
        }

        const datasets = Array.from(clusterGroups.entries()).map(
            ([, group]) => ({
                label: group.label,
                data: group.data,
                backgroundColor: group.color + "99",
                borderColor: group.color,
                borderWidth: 2,
                pointRadius: 7,
                pointHoverRadius: 10,
                pointStyle: "circle" as const,
            }),
        );

        scatterChart = new ChartClass(scatterCanvas, {
            type: "scatter",
            data: { datasets },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: { duration: 800, easing: "easeOutQuart" as const },
                plugins: {
                    legend: {
                        display: true,
                        position: "top" as const,
                        labels: {
                            usePointStyle: true,
                            padding: 16,
                            font: { weight: "bold" as const, size: 11 },
                        },
                    },
                    tooltip: {
                        callbacks: {
                            label: (ctx: any) => {
                                const point = ctx.raw;
                                return `${point.label}: Punctuality ${point.x}%, Consistency ${point.y}%`;
                            },
                        },
                    },
                },
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: "Punctuality Score (%)",
                            font: { weight: "bold" as const, size: 11 },
                        },
                        min: 0,
                        max: 100,
                        grid: { color: "rgba(0,0,0,0.04)" },
                    },
                    y: {
                        title: {
                            display: true,
                            text: "Consistency Score (%)",
                            font: { weight: "bold" as const, size: 11 },
                        },
                        min: 0,
                        max: 100,
                        grid: { color: "rgba(0,0,0,0.04)" },
                    },
                },
            },
        });
    }

    function renderRadar() {
        if (!radarCanvas || !ChartClass) return;
        if (radarChart) radarChart.destroy();

        const snappedSummaries = $state.snapshot(summaries);

        const datasets = snappedSummaries.map((s) => ({
            label: `${s.label} (${s.count})`,
            data: [
                s.avgPunctuality,
                s.avgConsistency,
                s.avgCompleteness,
                s.avgVolume,
            ],
            backgroundColor: s.color + "20",
            borderColor: s.color,
            borderWidth: 2.5,
            pointBackgroundColor: s.color,
            pointRadius: 4,
            pointHoverRadius: 6,
        }));

        radarChart = new ChartClass(radarCanvas, {
            type: "radar",
            data: {
                labels: [
                    "Punctuality",
                    "Consistency",
                    "Completeness",
                    "Volume",
                ],
                datasets,
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: { duration: 800, easing: "easeOutQuart" as const },
                plugins: {
                    legend: {
                        display: true,
                        position: "top" as const,
                        labels: {
                            usePointStyle: true,
                            padding: 16,
                            font: { weight: "bold" as const, size: 11 },
                        },
                    },
                },
                scales: {
                    r: {
                        beginAtZero: true,
                        max: 100,
                        ticks: {
                            stepSize: 25,
                            font: { size: 10 },
                            backdropColor: "transparent",
                        },
                        grid: { color: "rgba(0,0,0,0.06)" },
                        pointLabels: {
                            font: { weight: "bold" as const, size: 12 },
                        },
                    },
                },
            },
        });
    }
</script>

<div class="space-y-6" in:fade={{ duration: 400 }}>
    <!-- Header with tab toggle -->
    <div class="flex items-center justify-between">
        <div class="flex items-center gap-3">
            <div
                class="p-2.5 rounded-xl bg-gradient-to-br from-indigo-500/10 to-purple-500/10 text-indigo-600"
            >
                <svg
                    class="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    stroke-width="2"
                >
                    <circle cx="12" cy="12" r="3" />
                    <circle cx="6" cy="6" r="2" />
                    <circle cx="18" cy="8" r="2" />
                    <circle cx="8" cy="18" r="2" />
                    <circle cx="17" cy="17" r="2" />
                </svg>
            </div>
            <div>
                <h3
                    class="text-sm font-black text-text-primary uppercase tracking-widest"
                >
                    Behavioral Clusters
                </h3>
                <p class="text-[10px] text-text-muted font-medium">
                    K-Means unsupervised grouping
                </p>
            </div>
        </div>
        <div
            class="flex p-1 bg-surface-muted/50 border border-border-subtle rounded-xl"
        >
            <button
                onclick={() => (activeTab = "scatter")}
                class="px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all {activeTab ===
                'scatter'
                    ? 'bg-white text-gov-blue shadow-sm'
                    : 'text-text-muted hover:text-text-primary'}"
            >
                Scatter
            </button>
            <button
                onclick={() => (activeTab = "radar")}
                class="px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all {activeTab ===
                'radar'
                    ? 'bg-white text-gov-blue shadow-sm'
                    : 'text-text-muted hover:text-text-primary'}"
            >
                Radar
            </button>
        </div>
    </div>

    <!-- Cluster Summary Pills -->
    <div class="flex flex-wrap gap-2">
        {#each summaries as summary (summary.clusterId)}
            <div
                class="flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-bold"
                style="border-color: {summary.color}30; background: {summary.color}08; color: {summary.color}"
                in:fly={{ x: -10, duration: 300 }}
            >
                <span
                    class="w-2 h-2 rounded-full"
                    style="background: {summary.color}"
                ></span>
                {summary.label}
                <span class="opacity-60">({summary.count})</span>
            </div>
        {/each}
    </div>

    <!-- Charts -->
    <div class="relative h-72 transition-opacity duration-300">
        <div
            class="absolute inset-0 {activeTab === 'scatter'
                ? 'opacity-100 pointer-events-auto'
                : 'opacity-0 pointer-events-none'} transition-opacity duration-300"
        >
            <canvas bind:this={scatterCanvas}></canvas>
        </div>
        <div
            class="absolute inset-0 {activeTab === 'radar'
                ? 'opacity-100 pointer-events-auto'
                : 'opacity-0 pointer-events-none'} transition-opacity duration-300"
        >
            <canvas bind:this={radarCanvas}></canvas>
        </div>
    </div>

    <!-- Cluster Detail Table -->
    <div class="grid grid-cols-3 gap-3">
        {#each summaries as summary (summary.clusterId)}
            <div
                class="p-4 rounded-2xl border transition-all hover:shadow-md"
                style="border-color: {summary.color}20; background: {summary.color}05"
                in:fly={{
                    y: 15,
                    duration: 400,
                    delay: summary.clusterId * 100,
                }}
            >
                <div class="flex items-center gap-2 mb-3">
                    <div
                        class="w-3 h-3 rounded-full shadow-sm"
                        style="background: {summary.color}"
                    ></div>
                    <span
                        class="text-[10px] font-black uppercase tracking-widest text-text-primary"
                        >{summary.label}</span
                    >
                </div>
                <p
                    class="text-2xl font-black tracking-tighter"
                    style="color: {summary.color}"
                >
                    {summary.count}
                </p>
                <p
                    class="text-[9px] text-text-muted font-bold uppercase tracking-wider mt-1"
                >
                    Teachers
                </p>
                <div class="mt-3 space-y-1">
                    <div class="flex justify-between text-[9px]">
                        <span class="text-text-muted font-bold"
                            >Punctuality</span
                        >
                        <span class="font-black text-text-primary"
                            >{summary.avgPunctuality}%</span
                        >
                    </div>
                    <div class="flex justify-between text-[9px]">
                        <span class="text-text-muted font-bold"
                            >Consistency</span
                        >
                        <span class="font-black text-text-primary"
                            >{summary.avgConsistency}%</span
                        >
                    </div>
                    <div class="flex justify-between text-[9px]">
                        <span class="text-text-muted font-bold"
                            >Completeness</span
                        >
                        <span class="font-black text-text-primary"
                            >{summary.avgCompleteness}%</span
                        >
                    </div>
                </div>
            </div>
        {/each}
    </div>
</div>
