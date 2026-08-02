<script lang="ts">
    import { supabase } from "$lib/utils/supabase";
    import { profile } from "$lib/utils/auth";
    import { addToast } from "$lib/stores/toast";
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
        getWeekNumber,
        getDefinedWeeksCount,
    } from "$lib/utils/useDashboardData";

    let trendCanvas = $state<HTMLCanvasElement>();
    let barCanvas = $state<HTMLCanvasElement>();
    const OPERATIONAL_TARGET = 100; // 100% Target Standard
    let loading = $state(true);
    let period = $state<"quarter" | "semester" | "year">("quarter");
    let exportData = $state<{ weekly: number[]; schools: any[] }>({ weekly: [], schools: [] });
    let ChartClass: any = null;
    let channel: any;
    let trendChart: any = null;
    let barChart: any = null;

    let stats = $state({
        currentCompliance: 0,
        improvement: 0,
        topSchools: 0,
    });

    // Reactive data fetch: Trigger as soon as profile AND ChartClass are available
    $effect(() => {
        const user = $profile;
        if (user && ChartClass && loading) {
            initAnalytics();
        }
    });

    let userRefreshed = $state(false);

    async function initAnalytics() {
        const result = await fetchData();
        if (result) {
            const { weeklyData, schoolData } = result;
            exportData = { weekly: weeklyData, schools: schoolData };
            loading = false;
            await tick();
            renderCharts(weeklyData, schoolData);
        } else {
            loading = false;
        }
        if (userRefreshed) {
            addToast("success", "Analytics data refreshed");
            userRefreshed = false;
        }
    }

    onMount(async () => {
        const { Chart, registerables } = await import("chart.js");
        Chart.register(...registerables);
        ChartClass = Chart;
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
                    const result = await fetchData();
                    if (result) {
                        const { weeklyData, schoolData } = result;
                        updateCharts(weeklyData, schoolData);
                    }
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

        const isSchoolLevel =
            userProfile.role === "School Head" ||
            userProfile.role === "Master Teacher";
        const schoolId = userProfile.school_id;

        // 1. Fetch Trend Data (Last 8 Weeks)
        const weeklyData = await getWeeklyCompliance(
            isSchoolLevel ? schoolId : null,
        );

        // 2. Fetch Comparison Data
        const schoolData = await getSchoolComparison(
            isSchoolLevel ? schoolId : null,
        );

        // 3. Update Summary Stats
        stats.currentCompliance = weeklyData[weeklyData.length - 1] || 0;
        stats.improvement =
            weeklyData.length > 0
                ? stats.currentCompliance - (weeklyData[0] || 0)
                : 0;
        stats.topSchools = schoolData.filter(
            (s: any) => s.rate >= OPERATIONAL_TARGET,
        ).length;

        return { weeklyData, schoolData };
    }

    async function getWeeklyCompliance(
        schoolId: string | null = null,
    ): Promise<number[]> {
        // Fetch weeks from academic_calendar
        let uploadsQuery = supabase
            .from("submissions")
            .select(
                "compliance_status, week_number, created_at, uploader:profiles!inner(school_id)",
            );

        if (schoolId) {
            uploadsQuery = uploadsQuery.eq(
                "profiles!inner(school_id)",
                schoolId,
            );
        }

        const [uploadsRes, calendarRes, loadsRes] = await Promise.all([
            uploadsQuery,
            supabase
                .from("academic_calendar")
                .select("week_number, district_id")
                .order("week_number", { ascending: true }),
            schoolId
                ? supabase
                      .from("teaching_loads")
                      .select("id", { count: "exact" })
                      .eq("profiles.school_id", schoolId)
                : supabase
                      .from("teaching_loads")
                      .select("id", { count: "exact" }),
        ]);

        const uploads = uploadsRes.data || [];
        const calendarData = calendarRes.data || [];
        const userProfile = $profile;
        const calendar = calendarData.filter(
            (c: any) =>
                !userProfile?.district_id ||
                c.district_id === userProfile.district_id ||
                !c.district_id,
        );

        const currentDefinedWeeks = await getDefinedWeeksCount(supabase);

        const totalExpectedLoads = loadsRes.count || 0;

        // Use actual week numbers from calendar, fallback to 1..8
        const weeks =
            calendar.length > 0
                ? calendar.map((c: any) => c.week_number)
                : [1, 2, 3, 4, 5, 6, 7, 8];

        // Store labels using actual week numbers
        weekLabels = weeks.map((w: number) => `Week ${w}`);

        return weeks.map((w: number) => {
            const weekSubs = uploads.filter(
                (s: any) => getSubmissionWeek(s) === w,
            );
            const stats = calculateCompliance(weekSubs, totalExpectedLoads);
            return stats.rate;
        });
    }

    async function getSchoolComparison(schoolId: string | null = null) {
        const currentDefinedWeeks = await getDefinedWeeksCount(supabase);

        if (schoolId) {
            // SH view: Compare Teachers in their school
            const [teachersRes, subsRes, loadsRes] = await Promise.all([
                supabase
                    .from("profiles")
                    .select("id, full_name")
                    .eq("school_id", schoolId)
                    .eq("role", "Teacher"),
                supabase
                    .from("submissions")
                    .select("compliance_status, user_id"),
                supabase.from("teaching_loads").select("id, user_id"),
            ]);

            const teachers = teachersRes.data || [];
            const submissions = subsRes.data || [];
            const loads = loadsRes.data || [];

            return teachers.map((teacher) => {
                const teacherSubmissions = submissions.filter(
                    (s: any) => s.user_id === teacher.id,
                );
                const teacherLoadsCount = loads.filter(
                    (l: any) => l.user_id === teacher.id,
                ).length;
                const stats = calculateCompliance(
                    teacherSubmissions,
                    (teacherLoadsCount || 0) * currentDefinedWeeks,
                );

                return {
                    name: teacher.full_name,
                    compliant: stats.Compliant,
                    late: stats.Late,
                    nonCompliant: stats.NonCompliant,
                    rate: stats.rate,
                };
            });
        }

        // DS view: Compare Schools
        const [schoolsRes, subsRes, loadsRes] = await Promise.all([
            supabase.from("schools").select("id, name"),
            supabase
                .from("submissions")
                .select("compliance_status, profiles(school_id)"),
            supabase.from("teaching_loads").select("id, profiles(school_id)"),
        ]);

        const schools = schoolsRes.data || [];
        const submissions = subsRes.data || [];
        const loads = loadsRes.data || [];

        return schools.map((school) => {
            const schoolSubmissions = submissions.filter((s: any) => {
                const uploader = Array.isArray(s.profiles)
                    ? s.profiles[0]
                    : s.profiles;
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
                (schoolLoadsCount || 0) * currentDefinedWeeks,
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
                        label: "Missing",
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

    function exportAnalyticsCSV() {
        if (exportData.weekly.length === 0 && exportData.schools.length === 0) {
            addToast("info", "No analytics data available to export");
            return;
        }
        const rows: string[] = [];
        rows.push("Week,Compliance Rate (%)");
        for (let i = 0; i < exportData.weekly.length; i++) {
            rows.push(`Week ${i + 1},${exportData.weekly[i] ?? 0}`);
        }
        rows.push("");
        rows.push("School/School ID,Compliance Rate (%)");
        for (const s of exportData.schools) {
            rows.push(`${s.school_name || s.school_id || "Unknown"},${s.rate ?? 0}`);
        }
        const blob = new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `analytics-export-${new Date().toISOString().split("T")[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        addToast("success", "Analytics data exported as CSV");
    }
</script>

<svelte:head>
    <title>Analytics — CEDIMS</title>
</svelte:head>

<div in:fade={{ duration: 400 }}>
    <!-- Header -->
    <div class="mb-6 sm:mb-10 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
            <h1 class="text-2xl sm:text-3xl font-semibold text-text-primary tracking-tight">
                Institutional Analytics
            </h1>
            <p class="text-sm sm:text-base text-text-secondary mt-1 font-medium">
                Longitudinal performance tracking and predictive compliance
                modeling
            </p>
        </div>
        <div class="flex items-center gap-3">
            <button
                onclick={() => { userRefreshed = true; initAnalytics(); }}
                disabled={loading}
                class="p-2.5 rounded-xl bg-surface-muted text-text-secondary hover:text-gov-blue transition-colors border border-border-subtle shadow-sm disabled:opacity-50"
            >
                <RefreshCw
                    size={18}
                    class={loading ? "animate-spin" : ""}
                    strokeWidth={1.5}
                />
            </button>
            <button
                onclick={exportAnalyticsCSV}
                class="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gov-blue text-white text-sm font-bold shadow-lg shadow-gov-blue/20 hover:bg-gov-blue-dark transition-all"
            >
                <Download size={18} strokeWidth={1.5} />
                Export Data
            </button>
        </div>
    </div>

    {#if loading}
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div class="gov-card-static h-96 animate-pulse"></div>
            <div class="gov-card-static h-96 animate-pulse"></div>
        </div>
    {:else}
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <!-- Trend Line -->
            <div class="gov-card-static p-8" in:fly={{ y: 20, duration: 600 }}>
                <div class="flex items-center justify-between mb-8">
                    <div class="flex items-center gap-3">
                        <div
                            class="p-2 rounded-lg bg-gov-blue/10 text-gov-blue"
                        >
                            <TrendingUp size={20} strokeWidth={1.5} />
                        </div>
                        <h3
                            class="text-sm font-semibold text-text-primary uppercase tracking-wide"
                        >
                            {$profile?.role === "School Head" ||
                            $profile?.role === "Master Teacher"
                                ? "School Trend"
                                : "Global Trend"}
                        </h3>
                    </div>
                    <div
                        class="px-3 py-1 bg-gov-green/10 text-gov-green rounded-full text-[10px] font-semibold uppercase tracking-wide"
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
                class="gov-card-static p-8"
                in:fly={{ y: 20, duration: 600, delay: 200 }}
            >
                <div class="flex items-center justify-between mb-8">
                    <div class="flex items-center gap-3">
                        <div
                            class="p-2 rounded-lg bg-gov-blue/10 text-gov-blue"
                        >
                            <BarChart3 size={20} strokeWidth={1.5} />
                        </div>
                        <h3
                            class="text-sm font-semibold text-text-primary uppercase tracking-wide"
                        >
                            {$profile?.role === "School Head" ||
                            $profile?.role === "Master Teacher"
                                ? "Teacher Comparison"
                                : "School Comparison"}
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
                class="gov-card-static p-8 text-center group"
                in:fly={{ y: 20, duration: 600, delay: 400 }}
            >
                <div
                    class="w-16 h-16 rounded-md bg-gov-blue/5 text-gov-blue flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-500"
                >
                    <Activity size={32} strokeWidth={1.5} />
                </div>
                <p class="text-4xl font-semibold text-gov-blue tracking-normal">
                    +{stats.improvement}%
                </p>
                <p
                    class="text-xs font-bold text-text-muted mt-2 uppercase tracking-wide"
                >
                    Growth Since Week 1
                </p>
            </div>
            <div
                class="gov-card-static p-8 text-center group"
                in:fly={{ y: 20, duration: 600, delay: 500 }}
            >
                <div
                    class="w-16 h-16 rounded-md bg-gov-green/5 text-gov-green flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-500"
                >
                    <Target size={32} strokeWidth={1.5} />
                </div>
                <p
                    class="text-4xl font-semibold text-gov-green tracking-normal"
                >
                    {OPERATIONAL_TARGET}%
                </p>
                <p
                    class="text-xs font-bold text-text-muted mt-2 uppercase tracking-wide"
                >
                    Operational Target
                </p>
            </div>
            <div
                class="gov-card-static p-8 text-center group"
                in:fly={{ y: 20, duration: 600, delay: 600 }}
            >
                <div
                    class="w-16 h-16 rounded-md bg-gov-gold/5 text-gov-gold flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-500"
                >
                    <Zap size={32} strokeWidth={1.5} />
                </div>
                <p
                    class="text-4xl font-semibold text-gov-gold-dark tracking-normal"
                >
                    {stats.topSchools}
                </p>
                <p
                    class="text-xs font-bold text-text-muted mt-2 uppercase tracking-wide"
                >
                    Schools at Target
                </p>
            </div>
        </div>
    {/if}
</div>
