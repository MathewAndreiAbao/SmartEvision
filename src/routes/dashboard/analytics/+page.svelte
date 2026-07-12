<script lang="ts">
    import { supabase } from "$lib/utils/supabase";
    import { profile } from "$lib/utils/auth";
    import { addToast } from "$lib/stores/toast";
    let trendCanvas = $state<HTMLCanvasElement>();
    let barCanvas = $state<HTMLCanvasElement>();
    const OPERATIONAL_TARGET = 100; // 100% Target Standard
    let loading = $state(true);
    let period = $state<"quarter" | "semester" | "year">("quarter");
    let exportData = $state<{ weekly: number[]; schools: any[] }>({ weekly: [], schools: [] });    // Reactive data fetch: Trigger as soon as profile AND ChartClass are available
    $effect(() => {
        const user = $profile;
        if (user && ChartClass && loading) {
            initAnalytics();
        }
    });

    let userRefreshed = $state(false);
            loading = false;
            await tick();
            renderCharts(weeklyData, schoolData);
        } else {
            loading = false;
        }
        if (userRefreshed) {
            addToast("success", "Analytics data refreshed");
            userRefreshed = false;
        }        return { weeklyData, schoolData };
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
    <title>Analytics — CEDIMS</title></svelte:head>

<div in:fade={{ duration: 400 }}>
    <!-- Header -->
    <div class="mb-6 sm:mb-10 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
            <h1 class="text-2xl sm:text-3xl font-semibold text-text-primary tracking-tight">
                Institutional Analytics
            </h1>
            <p class="text-sm sm:text-base text-text-secondary mt-1 font-medium">                Longitudinal performance tracking and predictive compliance
                modeling
            </p>
        </div>
        <div class="flex items-center gap-3">
            <button
                onclick={() => { userRefreshed = true; initAnalytics(); }}                disabled={loading}
                class="p-2.5 rounded-xl bg-surface-muted text-text-secondary hover:text-gov-blue transition-colors border border-border-subtle shadow-sm disabled:opacity-50"
            >
                <RefreshCw
                    size={18}
                    class={loading ? "animate-spin" : ""}
                    strokeWidth={1.5}
                />
            </button>
            <button
                onclick={exportAnalyticsCSV}    {/if}
</div>
