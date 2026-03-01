<script lang="ts">
    import { supabase } from "$lib/utils/supabase";
    import { profile } from "$lib/utils/auth";
    import { onMount, onDestroy, tick } from "svelte";
    import { fly, fade } from "svelte/transition";
    import {
        RefreshCw,
        Download,
        TrendingUp,
        BarChart3,
        Activity,
        Target,
        Zap,
    } from "lucide-svelte";
    import {
        calculateCompliance,
        getSubmissionWeek,
    } from "$lib/utils/useDashboardData";
    import {
        analyzeComplianceRisk,
        type PredictionResult,
    } from "$lib/utils/predictiveAnalytics";

    let trendCanvas = $state<HTMLCanvasElement>();
    let barCanvas = $state<HTMLCanvasElement>();
    let loading = $state(true);
    let period = $state<"quarter" | "semester" | "year">("quarter");
    let ChartClass: any = null;
    let channel: any;
    let trendChart: any = null;
    let barChart: any = null;

    let stats = $state({
        currentCompliance: 0,
        improvement: 0,
        topSchools: 0,
    });

    let prediction = $state<PredictionResult>({
        riskScore: 0,
        label: "On-Track",
        trend: "Stable",
        message: "Calculating predictive model...",
    });

    onMount(async () => {
        const { Chart, registerables } = await import("chart.js");
        Chart.register(...registerables);
        ChartClass = Chart;

        const { weeklyData, schoolData } = await fetchData();
        loading = false;

        await tick();
        renderCharts(weeklyData, schoolData);
        setupRealtime();
    });

    onDestroy(() => {
        if (channel) supabase.removeChannel(channel);
        if (trendChart) trendChart.destroy();
        if (barChart) barChart.destroy();
    });

    function setupRealtime() {
        channel = supabase
            .channel("analytics-dashboard")
            .on(
                "postgres_changes",
                { event: "*", schema: "public", table: "submissions" },
                async () => {
                    const { weeklyData, schoolData } = await fetchData();
                    updateCharts(weeklyData, schoolData);
                },
            )
            .subscribe();
    }

    async function updateCharts(weeklyData: number[], schoolData: any[]) {
        if (!trendChart || !barChart) {
            await tick();
            renderCharts(weeklyData, schoolData);
            return;
        }

        // Svelte 5 Fix: Snapshot data to decouple from proxies
        const cleanWeekly = $state.snapshot(weeklyData);
        const cleanSchool = $state.snapshot(schoolData);

        trendChart.data.datasets[0].data = cleanWeekly;
        trendChart.update();

        barChart.data.labels = cleanSchool.map((s) => s.name);
        barChart.data.datasets[0].data = cleanSchool.map((s) => s.compliant);
        barChart.data.datasets[1].data = cleanSchool.map((s) => s.late);
        barChart.data.datasets[2].data = cleanSchool.map((s) => s.nonCompliant);
        barChart.update();
    }

    async function fetchData() {
        const userProfile = $profile;
        if (!userProfile) return { weeklyData: [], schoolData: [] };

        // 1. Fetch Trend Data (Last 8 Weeks)
        const weeklyData = await getWeeklyCompliance();

        // 2. Fetch School Comparison Data
        const schoolData = await getSchoolComparison();

        // 3. Update Summary Stats
        stats.currentCompliance = weeklyData[weeklyData.length - 1] || 0;
        stats.improvement = weeklyData[0]
            ? stats.currentCompliance - weeklyData[0]
            : 0;
        stats.topSchools = schoolData.filter((s) => s.rate >= 80).length;

        // 4. Run Predictive Risk Analysis
        const { data: subs } = await supabase
            .from("submissions")
            .select("week_number, compliance_status")
            .order("week_number", { ascending: true });
        prediction = analyzeComplianceRisk(subs || []);

        return { weeklyData, schoolData };
    }

    async function getWeeklyCompliance(): Promise<number[]> {
        // Fetch weeks from academic_calendar (not hard-coded)
        const [uploadsRes, calendarRes] = await Promise.all([
            supabase
                .from("submissions")
                .select("compliance_status, week_number, created_at"),
            supabase
                .from("academic_calendar")
                .select("week_number")
                .eq("school_year", "2025-2026")
                .order("week_number", { ascending: true }),
        ]);

        const uploads = uploadsRes.data || [];
        const calendarWeeks = calendarRes.data || [];

        // Use actual week numbers from calendar, fallback to 1..8
        const weeks =
            calendarWeeks.length > 0
                ? calendarWeeks.map((c: any) => c.week_number)
                : [1, 2, 3, 4, 5, 6, 7, 8];

        // Store labels using actual week numbers
        weekLabels = weeks.map((w: number) => `Week ${w}`);

        return weeks.map((w: number) => {
            const weekSubs = uploads.filter(
                (s: any) => getSubmissionWeek(s) === w,
            );
            const stats = calculateCompliance(weekSubs);
            return stats.rate;
        });
    }

    async function getSchoolComparison() {
        const [schoolsRes, subsRes, loadsRes] = await Promise.all([
            supabase.from("schools").select("id, name"),
            supabase
                .from("submissions")
                .select(
                    "compliance_status, uploader:profiles!inner(school_id)",
                ),
            supabase
                .from("teaching_loads")
                .select("id, profiles!inner(school_id)"),
        ]);

        const schools = schoolsRes.data || [];
        const submissions = subsRes.data || [];
        const loads = loadsRes.data || [];

        return schools.map((school) => {
            const schoolSubmissions = submissions.filter((s: any) => {
                const uploader = Array.isArray(s.uploader)
                    ? s.uploader[0]
                    : s.uploader;
                return uploader?.school_id === school.id;
            });

            const schoolLoadsCount = loads.filter((l: any) => {
                const p = Array.isArray(l.profiles)
                    ? l.profiles[0]
                    : l.profiles;
                return p?.school_id === school.id;
            }).length;

            const stats = calculateCompliance(
                schoolSubmissions,
                schoolLoadsCount,
            );

            return {
                name: school.name.replace(" Elementary School", " ES"),
                compliant: stats.Compliant,
                late: stats.Late,
                nonCompliant: stats.NonCompliant,
                rate: stats.rate,
            };
        });
    }

    let weekLabels = $state<string[]>([]);
    // ...

    function renderCharts(weeklyData: number[], schoolData: any[]) {
        if (!ChartClass) return;
        if (trendChart) trendChart.destroy();
        if (barChart) barChart.destroy();

        // Svelte 5 Fix: Snapshot dynamic state before passing to Chart.js
        const cleanLabels = $state.snapshot(weekLabels);
        const cleanWeekly = $state.snapshot(weeklyData);
        const cleanSchool = $state.snapshot(schoolData);

        // Trend Line Chart
        trendChart = new ChartClass(trendCanvas, {
            type: "line",
            data: {
                labels: cleanLabels,
                datasets: [
                    {
                        label: "Compliance Rate (%)",
                        data: cleanWeekly,
                        borderColor: "#0038A8",
                        backgroundColor: "rgba(0, 56, 168, 0.1)",
                        fill: true,
                        tension: 0.4,
                        pointRadius: 5,
                        pointHoverRadius: 8,
                    },
                ],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: true, position: "top" },
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100,
                        ticks: { callback: (v: any) => v + "%" },
                    },
                },
            },
        });

        // Stacked Bar Chart
        barChart = new ChartClass(barCanvas, {
            type: "bar",
            data: {
                labels: cleanSchool.map((s) => s.name),
                datasets: [
                    {
                        label: "Compliant",
                        data: cleanSchool.map((s) => s.compliant),
                        backgroundColor: "#008751",
                    },
                    {
                        label: "Late",
                        data: cleanSchool.map((s) => s.late),
                        backgroundColor: "#FCD116",
                    },
                    {
                        label: "Non-compliant",
                        data: cleanSchool.map((s) => s.nonCompliant),
                        backgroundColor: "#CE1126",
                    },
                ],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: true, position: "top" },
                },
                scales: {
                    x: { stacked: true },
                    y: { stacked: true, beginAtZero: true },
                },
            },
        });
    }
</script>

<svelte:head>
    <title>Analytics — Smart E-VISION</title>
</svelte:head>

<div in:fade={{ duration: 400 }}>
    <!-- Header -->
    <div class="mb-10 flex items-start justify-between">
        <div>
            <h1 class="text-3xl font-black text-text-primary tracking-tight">
                Institutional Analytics
            </h1>
            <p class="text-base text-text-secondary mt-1 font-medium">
                Longitudinal performance tracking and predictive compliance
                modeling
            </p>
        </div>
        <div class="flex items-center gap-3">
            <button
                class="p-2.5 rounded-xl bg-surface-muted text-text-secondary hover:text-gov-blue transition-colors border border-border-subtle shadow-sm"
            >
                <RefreshCw size={18} />
            </button>
            <button
                class="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gov-blue text-white text-sm font-bold shadow-lg shadow-gov-blue/20 hover:bg-gov-blue-dark transition-all"
            >
                <Download size={18} />
                Export Data
            </button>
        </div>
    </div>

    {#if loading}
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div class="glass-card-static h-96 animate-pulse"></div>
            <div class="glass-card-static h-96 animate-pulse"></div>
        </div>
    {:else}
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <!-- Trend Line -->
            <div
                class="glass-card-static p-8"
                in:fly={{ y: 20, duration: 600 }}
            >
                <div class="flex items-center justify-between mb-8">
                    <div class="flex items-center gap-3">
                        <div
                            class="p-2 rounded-lg bg-gov-blue/10 text-gov-blue"
                        >
                            <TrendingUp size={20} />
                        </div>
                        <h3
                            class="text-sm font-black text-text-primary uppercase tracking-widest"
                        >
                            Global Trend
                        </h3>
                    </div>
                    <div
                        class="px-3 py-1 bg-gov-green/10 text-gov-green rounded-full text-[10px] font-black uppercase tracking-widest"
                    >
                        8-Week Window
                    </div>
                </div>
                <div class="h-72">
                    <canvas bind:this={trendCanvas}></canvas>
                </div>
            </div>

            <!-- Bar Comparison -->
            <div
                class="glass-card-static p-8"
                in:fly={{ y: 20, duration: 600, delay: 200 }}
            >
                <div class="flex items-center justify-between mb-8">
                    <div class="flex items-center gap-3">
                        <div
                            class="p-2 rounded-lg bg-gov-blue/10 text-gov-blue"
                        >
                            <BarChart3 size={20} />
                        </div>
                        <h3
                            class="text-sm font-black text-text-primary uppercase tracking-widest"
                        >
                            School Comparison
                        </h3>
                    </div>
                </div>
                <div class="h-72">
                    <canvas bind:this={barCanvas}></canvas>
                </div>
            </div>
        </div>

        <!-- Summary Cards -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-8 mt-10">
            <div
                class="glass-card-static p-8 text-center group"
                in:fly={{ y: 20, duration: 600, delay: 400 }}
            >
                <div
                    class="w-16 h-16 rounded-2xl bg-gov-blue/5 text-gov-blue flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-500"
                >
                    <Activity size={32} strokeWidth={1.5} />
                </div>
                <p class="text-4xl font-black text-gov-blue tracking-tighter">
                    +{stats.improvement}%
                </p>
                <p
                    class="text-xs font-bold text-text-muted mt-2 uppercase tracking-widest"
                >
                    Growth Since Week 1
                </p>
            </div>
            <div
                class="glass-card-static p-8 text-center group"
                in:fly={{ y: 20, duration: 600, delay: 500 }}
            >
                <div
                    class="w-16 h-16 rounded-2xl bg-gov-green/5 text-gov-green flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-500"
                >
                    <Target size={32} strokeWidth={1.5} />
                </div>
                <p class="text-4xl font-black text-gov-green tracking-tighter">
                    80%
                </p>
                <p
                    class="text-xs font-bold text-text-muted mt-2 uppercase tracking-widest"
                >
                    Operational Target
                </p>
            </div>
            <div
                class="glass-card-static p-8 text-center group"
                in:fly={{ y: 20, duration: 600, delay: 600 }}
            >
                <div
                    class="w-16 h-16 rounded-2xl bg-gov-gold/5 text-gov-gold flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-500"
                >
                    <Zap size={32} strokeWidth={1.5} />
                </div>
                <div class="flex items-center justify-center gap-2 mb-1">
                    <p
                        class="text-4xl font-black tracking-tighter {prediction.label ===
                        'Critical'
                            ? 'text-gov-red'
                            : prediction.label === 'At-Risk'
                              ? 'text-gov-gold-dark'
                              : 'text-gov-green'}"
                    >
                        {prediction.riskScore}%
                    </p>
                </div>
                <p
                    class="text-[10px] font-black uppercase tracking-widest text-text-muted opacity-50"
                >
                    Predictive Compliance Forecast
                </p>
            </div>
        </div>
    {/if}
</div>
