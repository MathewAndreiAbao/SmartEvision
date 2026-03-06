<script lang="ts">
    import { profile } from "$lib/utils/auth";
    import { supabase } from "$lib/utils/supabase";
    import StatCard from "$lib/components/StatCard.svelte";
    import StatusBadge from "$lib/components/StatusBadge.svelte";
    import ComplianceTrendChart from "$lib/components/ComplianceTrendChart.svelte";
    import AlertBanner from "$lib/components/AlertBanner.svelte";
    import ClusterVisualization from "$lib/components/ClusterVisualization.svelte";
    import { onMount, onDestroy } from "svelte";
    import { fly, fade } from "svelte/transition";
    import { goto } from "$app/navigation";
    import {
        exportToCSV,
        generateCompliancePDF,
    } from "$lib/utils/reportEngine";
    import {
        calculateCompliance,
        groupSubmissionsByWeek,
        getComplianceColor,
        getComplianceClass,
        getComplianceBgClass,
        getTrendDirection,
        getTrendIcon,
        formatComplianceRate,
        getWeekNumber,
        getCurrentWeekFromCalendar,
        getDefinedWeeksCount,
    } from "$lib/utils/useDashboardData";
    import {
        analyzeComplianceRisk,
        calculateDistrictRisk,
        type PredictionResult,
    } from "$lib/utils/predictiveAnalytics";
    import {
        detectPatterns,
        type PatternAlert,
    } from "$lib/utils/patternDetection";
    import {
        extractFeatures,
        runKMeansClustering,
        canCluster,
        type ClusterResult,
        type ClusterSummary,
    } from "$lib/utils/clusterAnalytics";
    import { cacheMetadata, getCachedMetadata } from "$lib/utils/offline";
    import {
        QrCode,
        LayoutDashboard,
        Calendar,
        CloudUpload,
        Archive,
        TrendingUp,
        PlusCircle,
        ShieldCheck,
        Zap,
        Activity,
        Clock,
        ShieldAlert,
        Briefcase,
        Users,
        FileText,
        ShieldX,
        ChevronDown,
    } from "lucide-svelte";
    import { showQRScanner } from "$lib/stores/ui";

    // State management
    let submissions = $state<any[]>([]);
    let weeklyData = $state<any[]>([]);
    let complianceStats = $state({
        Compliant: 0,
        Late: 0,
        NonCompliant: 0,
        totalUploaded: 0,
        expected: 0,
        rate: 0,
    });
    let teachingLoadsCount = $state(0);
    let recentActivity = $state<any[]>([]);
    let stats = $state({
        totalUploads: 0,
        compliantRate: 0,
        pendingQueue: 0,
        totalTeachers: 0,
        compliantCount: 0,
        lateCount: 0,
        nonCompliantCount: 0,
    });
    let alerts = $state<PatternAlert[]>([]);
    let riskPrediction = $state<PredictionResult | null>(null);
    let districtRisk = $state(0);
    let clusterResults = $state<ClusterResult[]>([]);
    let clusterSummaries = $state<ClusterSummary[]>([]);
    let loading = $state(true);
    let channel: any;

    // Teacher table controls
    let sortField = $state<string>("created_at");
    let sortDir = $state<"asc" | "desc">("desc");
    let filterStatus = $state("all");

    onMount(async () => {
        await loadDashboard();
        setupRealtime();
        loading = false;
    });

    onDestroy(() => {
        if (channel) supabase.removeChannel(channel);
    });

    function setupRealtime() {
        channel = supabase
            .channel("dashboard-changes")
            .on(
                "postgres_changes",
                { event: "*", schema: "public", table: "submissions" },
                () => {
                    loadDashboard();
                },
            )
            .subscribe();
    }

    async function loadDashboard() {
        const userProfile = $profile;
        if (!userProfile) return;
        const role = userProfile.role;

        if (role === "Teacher") {
            await loadTeacherDashboard(userProfile);
        } else {
            await loadSupervisorDashboard(userProfile, role);
        }
    }

    async function loadTeacherDashboard(userProfile: any) {
        // Batch: fetch all submissions + teaching loads count + academic calendar in parallel
        const [subsResult, loadsResult, calendarResult] = await Promise.all([
            supabase
                .from("submissions")
                .select(
                    "id, file_name, doc_type, compliance_status, created_at, week_number, teaching_loads(subject, grade_level)",
                )
                .eq("user_id", userProfile.id)
                .order("created_at", { ascending: false })
                .limit(50),
            supabase
                .from("teaching_loads")
                .select("*", { count: "exact", head: true })
                .eq("user_id", userProfile.id)
                .eq("is_active", true),
            supabase
                .from("academic_calendar")
                .select("*")
                .eq("school_year", "2025-2026")
                .order("week_number", { ascending: true }),
        ]);

        submissions = subsResult.data || [];
        teachingLoadsCount = loadsResult.count || 0;
        const calendar = calendarResult.data || [];

        // Calculate cumulative expected loads to date based on defined calendar weeks
        const definedWeeks = await getDefinedWeeksCount(supabase);
        const cumulativeExpected = teachingLoadsCount * definedWeeks;

        // Calculate compliance stats using ACTUAL submission statuses
        // Rate = compliant / cumulativeExpected
        complianceStats = calculateCompliance(submissions, cumulativeExpected);

        // Weekly breakdown for chart + widget (uses calendar weeks)
        weeklyData = groupSubmissionsByWeek(
            submissions,
            teachingLoadsCount,
            8,
            calendar,
        );

        // Recent activity for the bottom section
        recentActivity = (subsResult.data || []).slice(0, 5);
        stats.totalUploads = (subsResult.data || []).length;
        stats.compliantRate = complianceStats.rate;

        // Run Predictive Analytics
        riskPrediction = analyzeComplianceRisk(submissions);
    }

    async function loadSupervisorDashboard(userProfile: any, role: string) {
        // Fetch academic calendar for the school year
        const { data: calendar } = await supabase
            .from("academic_calendar")
            .select("*")
            .eq("school_year", "2025-2026")
            .order("week_number", { ascending: true });

        const calendarArr = calendar || [];

        // Fetch teachers in the scope (School or District)
        let teacherQuery = supabase
            .from("profiles")
            .select("*, schools(name)")
            .eq("role", "Teacher");

        // Fetch submissions in the scope
        let subQuery = supabase
            .from("submissions")
            .select("*, uploader:profiles!inner(school_id, district_id)", {
                count: "exact",
            });

        if (role === "School Head" || role === "Master Teacher") {
            if (userProfile.school_id) {
                teacherQuery = teacherQuery.eq(
                    "school_id",
                    userProfile.school_id,
                );
                subQuery = subQuery.eq(
                    "profiles.school_id",
                    userProfile.school_id,
                );
            }
        } else if (role === "District Supervisor") {
            if (userProfile.district_id) {
                teacherQuery = teacherQuery.eq(
                    "district_id",
                    userProfile.district_id,
                );
                subQuery = subQuery.eq(
                    "profiles.district_id",
                    userProfile.district_id,
                );
            }
        }

        const [teachersResult, subsResult] = await Promise.all([
            teacherQuery,
            subQuery.order("created_at", { ascending: false }),
        ]);

        const teachers = teachersResult.data || [];
        const allSubs = subsResult.data || [];

        const { data: loadsData } = await supabase
            .from("teaching_loads")
            .select("id, profiles!inner(school_id, district_id)")
            .in(
                "profiles.id",
                teachers.map((t) => t.id),
            );

        const totalLoads = loadsData ? loadsData.length : 0;
        const definedWeeks = calendarArr.length || 1;
        const totalExpected = totalLoads * definedWeeks;

        stats.totalTeachers = teachers.length;
        stats.totalUploads = subsResult.count || 0;
        stats.compliantCount = allSubs.filter(
            (s) =>
                s.compliance_status === "compliant" ||
                s.compliance_status === "on-time",
        ).length;
        stats.lateCount = allSubs.filter(
            (s) => s.compliance_status === "late",
        ).length;

        stats.nonCompliantCount = Math.max(
            0,
            totalExpected - (stats.compliantCount + stats.lateCount),
        );

        // Use the new standard calculateCompliance for the overall rate to keep display consistent with expected defaults
        const overallStats = calculateCompliance(allSubs, totalExpected);
        stats.compliantRate = overallStats.rate;

        recentActivity = allSubs.slice(0, 5);

        // Run pattern detection for supervisor alerts
        alerts = detectPatterns(allSubs, calendarArr, teachers);

        // Calculate District Risk Aggregate
        const teacherMapCluster = new Map<string, any[]>();
        allSubs.forEach((s) => {
            if (!teacherMapCluster.has(s.user_id))
                teacherMapCluster.set(s.user_id, []);
            teacherMapCluster.get(s.user_id)!.push(s);
        });
        districtRisk = calculateDistrictRisk(teacherMapCluster);

        // Run K-Means clustering on teacher behavioral data
        if (canCluster(teachers.length, allSubs.length)) {
            const teacherList = teachers.map((t: any) => ({
                id: t.id,
                full_name: t.full_name,
                school_name: t.schools?.name || "",
            }));
            const totalWeeks = calendarArr.length || 8;
            const features = extractFeatures(teacherList, allSubs, totalWeeks);
            const clusterOutput = runKMeansClustering(features);
            clusterResults = clusterOutput.results;
            clusterSummaries = clusterOutput.summaries;

            // Cache for offline use
            cacheMetadata(`clusters_${userProfile.id}`, {
                results: clusterResults,
                summaries: clusterSummaries,
            });
        } else {
            // Try offline cache
            const cached = await getCachedMetadata(
                `clusters_${userProfile.id}`,
            );
            if (cached?.data) {
                clusterResults = cached.data.results || [];
                clusterSummaries = cached.data.summaries || [];
            }
        }
    }

    // Teacher table: filtered & sorted submissions
    const displaySubmissions = $derived(() => {
        let result = [...submissions];
        if (filterStatus !== "all") {
            result = result.filter((s) => {
                let cs = s.compliance_status || "non-compliant";
                // Normalize for filtering
                if (
                    cs.toLowerCase() === "on-time" ||
                    cs.toLowerCase() === "compliant"
                )
                    cs = "compliant";
                else if (cs.toLowerCase() === "late") cs = "late";
                else if (cs.toLowerCase() === "non-compliant")
                    cs = "non-compliant";

                return cs === filterStatus;
            });
        }
        result.sort((a, b) => {
            const aVal = a[sortField] || "";
            const bVal = b[sortField] || "";
            if (sortDir === "asc") return aVal > bVal ? 1 : -1;
            return aVal < bVal ? 1 : -1;
        });
        return result.slice(0, 20);
    });

    function toggleSort(field: string) {
        if (sortField === field) sortDir = sortDir === "asc" ? "desc" : "asc";
        else {
            sortField = field;
            sortDir = "desc";
        }
    }

    function formatDate(dateStr: string): string {
        return new Date(dateStr).toLocaleDateString("en-PH", {
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    }

    function getStatusBadgeType(
        s: any,
    ): "compliant" | "late" | "non-compliant" | "pending" | "review" {
        const cs = (s.compliance_status || "non-compliant").toLowerCase();
        if (cs === "compliant" || cs === "on-time") return "compliant";
        if (cs === "late") return "late";
        return "non-compliant";
    }
</script>

<svelte:head>
    <title>Dashboard — Smart E-VISION</title>
</svelte:head>

<div>
    <!-- Header -->
    <div class="mb-6">
        <h1 class="text-3xl font-semibold text-text-primary tracking-tight">
            {$profile?.role === "Teacher"
                ? "Overview"
                : "Supervision Dashboard"}
        </h1>
        <p class="text-base text-text-secondary mt-1">
            Welcome back, <span class="font-bold text-gov-blue"
                >{$profile?.full_name || "User"}</span
            >
        </p>
    </div>

    {#if loading}
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {#each Array(4) as _}
                <div class="gov-card-static p-5 animate-pulse">
                    <div class="h-4 bg-gray-200 rounded w-24 mb-4"></div>
                    <div class="h-10 bg-gray-200 rounded w-16"></div>
                </div>
            {/each}
        </div>
    {:else if $profile?.role === "Teacher"}
        <!-- ========== TEACHER DASHBOARD ========== -->

        <!-- Stats Row -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            <div in:fly={{ y: 20, duration: 400, delay: 0 }}>
                <StatCard
                    icon="CloudUpload"
                    value={stats.totalUploads}
                    label="Total Uploads"
                />
            </div>
            <div in:fly={{ y: 20, duration: 400, delay: 100 }}>
                <StatCard
                    icon="ShieldCheck"
                    value="{complianceStats.rate}%"
                    label="Compliance Rate"
                    color="from-gov-green to-gov-green-dark"
                />
            </div>
            <div in:fly={{ y: 20, duration: 400, delay: 200 }}>
                <StatCard
                    icon="Clock"
                    value={complianceStats.Late}
                    label="Late Submissions"
                    color="from-gov-gold to-gov-gold-dark"
                />
            </div>
            <div in:fly={{ y: 20, duration: 400, delay: 300 }}>
                <StatCard
                    icon="ShieldAlert"
                    value={complianceStats.NonCompliant}
                    label="Non-compliant"
                    color="from-gov-red to-red-700"
                />
            </div>
            <div in:fly={{ y: 20, duration: 400, delay: 400 }}>
                <div
                    class="gov-card-static p-6 h-full flex flex-col justify-between overflow-hidden relative"
                >
                    <div
                        class="absolute -top-4 -right-4 w-20 h-20 bg-gov-blue/5 rounded-full blur-xl"
                    ></div>
                    <div>
                        <div class="flex items-center justify-between mb-4">
                            <h3
                                class="text-[10px] font-semibold text-text-muted uppercase tracking-wide"
                            >
                                AI Forecast
                            </h3>
                            {#if riskPrediction}
                                <span
                                    class="px-2 py-0.5 rounded-full text-[9px] font-bold {riskPrediction.label ===
                                    'On-Track'
                                        ? 'bg-gov-green/10 text-gov-green'
                                        : riskPrediction.label === 'At-Risk'
                                          ? 'bg-gov-gold/10 text-gov-gold'
                                          : 'bg-gov-red/10 text-gov-red'}"
                                >
                                    {riskPrediction.trend}
                                </span>
                            {/if}
                        </div>
                        {#if riskPrediction}
                            <p
                                class="text-2xl font-semibold text-text-primary tracking-tight"
                            >
                                {riskPrediction.label}
                            </p>
                            <p
                                class="text-[11px] text-text-secondary mt-2 leading-relaxed font-medium"
                            >
                                {riskPrediction.message}
                            </p>
                        {:else}
                            <p class="text-lg font-bold text-text-muted">
                                Awaiting Data
                            </p>
                        {/if}
                    </div>
                </div>
            </div>
        </div>

        <!-- Quick Actions -->
        <div class="mb-10" in:fade={{ duration: 600, delay: 500 }}>
            <div class="flex items-center gap-3 mb-6">
                <div class="p-2 rounded-md bg-gov-blue/10 text-gov-blue">
                    <Zap size={20} fill="currentColor" strokeWidth={1.5} />
                </div>
                <h2
                    class="text-xl font-semibold text-text-primary tracking-tight"
                >
                    Quick Actions
                </h2>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-4 gap-5">
                <a
                    href="/dashboard/upload"
                    class="gov-card p-5 flex flex-col gap-4 no-underline group"
                >
                    <div
                        class="w-10 h-10 rounded-md bg-gov-blue/5 text-gov-blue flex items-center justify-center group-hover:bg-gov-blue group-hover:text-white transition-all duration-300"
                    >
                        <CloudUpload size={20} strokeWidth={1.5} />
                    </div>
                    <div>
                        <p
                            class="font-bold text-sm text-text-primary group-hover:text-gov-blue transition-colors"
                        >
                            Upload
                        </p>
                        <p
                            class="text-[10px] text-text-muted mt-1 leading-relaxed"
                        >
                            Submit DLL, ISP, or ISR reports.
                        </p>
                    </div>
                </a>
                <a
                    href="/dashboard/archive"
                    class="gov-card p-5 flex flex-col gap-4 no-underline group"
                >
                    <div
                        class="w-10 h-10 rounded-md bg-gov-blue/5 text-gov-blue flex items-center justify-center group-hover:bg-gov-blue group-hover:text-white transition-all duration-300"
                    >
                        <Archive size={20} strokeWidth={1.5} />
                    </div>
                    <div>
                        <p
                            class="font-bold text-sm text-text-primary group-hover:text-gov-blue transition-colors"
                        >
                            Archive
                        </p>
                        <p
                            class="text-[10px] text-text-muted mt-1 leading-relaxed"
                        >
                            Retrieve submitted documents.
                        </p>
                    </div>
                </a>
                <a
                    href="/dashboard/load"
                    class="gov-card p-5 flex flex-col gap-4 no-underline group"
                >
                    <div
                        class="w-10 h-10 rounded-md bg-gov-blue/5 text-gov-blue flex items-center justify-center group-hover:bg-gov-blue group-hover:text-white transition-all duration-300"
                    >
                        <Briefcase size={20} strokeWidth={1.5} />
                    </div>
                    <div>
                        <p
                            class="font-bold text-sm text-text-primary group-hover:text-gov-blue transition-colors"
                        >
                            Load
                        </p>
                        <p
                            class="text-[10px] text-text-muted mt-1 leading-relaxed"
                        >
                            Manage subjects and schedules.
                        </p>
                    </div>
                </a>
                <button
                    onclick={() => showQRScanner.set(true)}
                    class="gov-card p-5 flex flex-col gap-4 no-underline group text-left w-full cursor-pointer"
                >
                    <div
                        class="w-10 h-10 rounded-md bg-gov-blue/5 text-gov-blue flex items-center justify-center group-hover:bg-gov-blue group-hover:text-white transition-all duration-300"
                    >
                        <QrCode size={20} strokeWidth={1.5} />
                    </div>
                    <div>
                        <p
                            class="font-bold text-sm text-text-primary group-hover:text-gov-blue transition-colors"
                        >
                            Scan
                        </p>
                        <p
                            class="text-[10px] text-text-muted mt-1 leading-relaxed"
                        >
                            Verify document authenticity.
                        </p>
                    </div>
                </button>
            </div>
        </div>

        <!-- Weekly Compliance Widget + Trend Chart -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">
            <!-- Weekly Badges -->
            <div
                class="gov-card-static p-5"
                in:fly={{ y: 20, duration: 500, delay: 400 }}
            >
                <h3
                    class="text-sm font-semibold text-text-primary uppercase tracking-wide mb-6 flex items-center gap-2"
                >
                    <span class="w-1.5 h-6 bg-gov-blue rounded-full"></span>
                    Weekly Progress
                </h3>
                <div class="grid grid-cols-4 gap-3">
                    {#each weeklyData as w}
                        <div
                            class="text-center p-3 rounded-lg border border-border-subtle bg-surface-muted/30 transition-all hover:border-gov-blue/30 hover:bg-gov-blue/5"
                        >
                            <p
                                class="text-[10px] text-text-muted font-semibold uppercase tracking-normal mb-1"
                            >
                                {w.label}
                            </p>
                            <p
                                class="text-xl font-semibold {getComplianceClass(
                                    w.rate,
                                ).replace('gov-', 'gov-')}"
                            >
                                {w.rate}%
                            </p>
                        </div>
                    {/each}
                </div>
                {#if weeklyData.length === 0}
                    <div class="text-center py-8">
                        <p class="text-text-muted mb-4 font-medium">
                            No historical data available.
                        </p>
                        <a
                            href="/dashboard/upload"
                            class="inline-flex items-center px-4 py-2 rounded bg-gov-blue/10 text-gov-blue text-xs font-semibold uppercase tracking-wide hover:bg-gov-blue/20 transition-colors"
                        >
                            UPLOAD
                        </a>
                    </div>
                {/if}
            </div>

            <!-- Trend Chart -->
            <div
                class="gov-card-static p-5"
                in:fly={{ y: 20, duration: 500, delay: 500 }}
            >
                <h3
                    class="text-sm font-semibold text-text-primary uppercase tracking-wide mb-6 flex items-center gap-2"
                >
                    <span class="w-1.5 h-6 bg-gov-green rounded-full"></span>
                    Performance Trend
                </h3>
                {#if weeklyData.length > 0}
                    <ComplianceTrendChart
                        labels={weeklyData.map((w) => w.label)}
                        datasets={[
                            {
                                label: "My Compliance",
                                data: weeklyData.map((w) => w.rate),
                                color: "#1b4294",
                            },
                        ]}
                        height={200}
                    />
                {:else}
                    <div
                        class="flex items-center justify-center h-[200px] text-text-muted font-medium bg-surface-muted/30 rounded-lg border border-dashed border-border-strong"
                    >
                        <p>Awaiting submission data for analysis</p>
                    </div>
                {/if}
            </div>
        </div>

        <!-- Submission History Table -->
        <div
            class="gov-card-static overflow-hidden mb-6"
            in:fade={{ duration: 500, delay: 600 }}
        >
            <!-- Archive Header Card -->
            <div
                class="px-6 py-5 bg-white border-b border-border-subtle flex items-center justify-between flex-wrap gap-4 shadow-[0_4px_12px_-4px_rgba(0,0,0,0.05)]"
            >
                <div class="flex items-center gap-3">
                    <div class="w-1.5 h-6 bg-gov-blue rounded-full"></div>
                    <h3
                        class="text-xs font-bold text-text-muted uppercase tracking-widest"
                    >
                        Digital Institutional Archive
                    </h3>
                </div>
                <div class="relative">
                    <select
                        bind:value={filterStatus}
                        class="pl-4 pr-10 py-2.5 bg-surface-muted/50 border border-border-subtle rounded-xl text-xs font-bold text-text-primary appearance-none focus:ring-2 focus:ring-gov-blue/20 outline-none transition-all cursor-pointer uppercase tracking-tight"
                    >
                        <option value="all">Filter: All Records</option>
                        <option value="Compliant">Filter: Compliant Only</option
                        >
                        <option value="Late">Filter: Late Submissions</option>
                        <option value="Non-Compliant"
                            >Filter: Non-compliant</option
                        >
                    </select>
                    <div
                        class="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-text-muted"
                    >
                        <ChevronDown size={14} />
                    </div>
                </div>
            </div>

            <!-- Grid of Cards instead of Long Table -->
            {#if displaySubmissions().length === 0}
                <div
                    class="p-12 text-center bg-white/50 backdrop-blur-md rounded-b-2xl"
                >
                    <p
                        class="text-text-muted font-bold uppercase tracking-wide text-xs mb-4"
                    >
                        Archive Empty
                    </p>
                    <a
                        href="/dashboard/upload"
                        class="inline-flex items-center px-6 py-3 rounded bg-gov-blue text-white text-xs font-semibold uppercase tracking-wide hover:bg-gov-blue-dark transition-all shadow-md"
                    >
                        SUBMIT FIRST RECORD
                    </a>
                </div>
            {:else}
                <div class="p-5">
                    <div
                        class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
                    >
                        {#each displaySubmissions() as sub}
                            {@const tl = Array.isArray(sub.teaching_loads)
                                ? sub.teaching_loads[0]
                                : sub.teaching_loads}
                            <div
                                class="bg-white border border-border-subtle rounded-xl p-5 shadow-sm hover:shadow-md hover:border-gov-blue/20 transition-all group relative overflow-hidden flex flex-col h-full"
                                in:fly={{ y: 20, duration: 400 }}
                            >
                                <div class="absolute top-0 right-0 p-3">
                                    <StatusBadge
                                        status={getStatusBadgeType(sub)}
                                        size="sm"
                                    />
                                </div>

                                <div class="mb-4">
                                    <div
                                        class="w-10 h-10 rounded-lg bg-gov-blue/5 text-gov-blue flex items-center justify-center mb-3"
                                    >
                                        <FileText size={20} strokeWidth={1.5} />
                                    </div>
                                    <h4
                                        class="font-bold text-sm text-text-primary line-clamp-2 leading-snug group-hover:text-gov-blue transition-colors"
                                        title={sub.file_name}
                                    >
                                        {sub.file_name}
                                    </h4>
                                </div>

                                <div class="mt-auto space-y-3">
                                    <div class="flex flex-wrap gap-2">
                                        <span
                                            class="px-2 py-0.5 bg-surface-muted rounded text-[10px] font-bold text-text-secondary uppercase tracking-tight"
                                        >
                                            {sub.doc_type}
                                        </span>
                                        {#if tl}
                                            <span
                                                class="px-2 py-0.5 bg-gov-blue/5 rounded text-[10px] font-bold text-gov-blue uppercase tracking-tight"
                                            >
                                                {tl.subject}
                                            </span>
                                        {/if}
                                    </div>

                                    <div
                                        class="pt-3 border-t border-gray-50 flex items-center justify-between text-[10px] font-bold text-text-muted uppercase tracking-tighter"
                                    >
                                        <div class="flex items-center gap-1.5">
                                            <Calendar
                                                size={12}
                                                strokeWidth={2}
                                            />
                                            <span>Week {sub.week_number}</span>
                                        </div>
                                        <span>{formatDate(sub.created_at)}</span
                                        >
                                    </div>
                                </div>
                            </div>
                        {/each}
                    </div>
                </div>
            {/if}
        </div>
    {:else}
        <!-- ========== SUPERVISOR DASHBOARD ========== -->

        <!-- Urgent Patterns (AI Alerts) -->
        {#if alerts.length > 0}
            <AlertBanner {alerts} />
        {/if}

        <!-- Stats Grid -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-6 mb-6">
            <div in:fly={{ y: 20, duration: 400, delay: 0 }}>
                <StatCard
                    icon="Users"
                    value={stats.totalTeachers}
                    label="TOTAL TEACHERS"
                />
            </div>
            <div in:fly={{ y: 20, duration: 400, delay: 100 }}>
                <StatCard
                    icon="FileText"
                    value={stats.totalUploads}
                    label="TOTAL SUBMISSIONS"
                    color="gov-blue"
                />
            </div>
            <div in:fly={{ y: 20, duration: 400, delay: 150 }}>
                <StatCard
                    icon="ShieldCheck"
                    value={stats.compliantCount}
                    label="COMPLIANT"
                    color="gov-green"
                />
            </div>
            <div in:fly={{ y: 20, duration: 400, delay: 200 }}>
                <StatCard
                    icon="Clock"
                    value={stats.lateCount}
                    label="LATE"
                    color="gov-gold"
                />
            </div>
            <div in:fly={{ y: 20, duration: 400, delay: 250 }}>
                <StatCard
                    icon="ShieldX"
                    value={stats.nonCompliantCount}
                    label="NON-COMPLIANT"
                    color="gov-red"
                />
            </div>
            <div in:fly={{ y: 20, duration: 400, delay: 300 }}>
                <StatCard
                    icon="Activity"
                    value="{districtRisk}%"
                    label="DISTRICT RISK"
                    color={districtRisk > 60
                        ? "gov-red"
                        : districtRisk > 30
                          ? "gov-gold"
                          : "gov-green"}
                />
            </div>
        </div>

        <!-- Behavioral Clusters (K-Means) -->
        {#if clusterResults.length > 0}
            <div class="mb-10" in:fly={{ y: 20, duration: 600, delay: 500 }}>
                <h2
                    class="text-sm font-bold text-text-muted uppercase tracking-widest mb-6 flex items-center gap-2"
                >
                    <div class="h-1 w-4 bg-purple-500"></div>
                    AI Behavioral Analysis
                </h2>
                <div
                    class="bg-white border border-border-subtle rounded-xl p-6 shadow-sm"
                >
                    <ClusterVisualization
                        results={clusterResults}
                        summaries={clusterSummaries}
                    />
                </div>
            </div>
        {/if}

        <!-- Export & Reports as Cards -->
        <div class="mb-10" in:fade={{ duration: 600, delay: 350 }}>
            <h2
                class="text-sm font-bold text-text-muted uppercase tracking-widest mb-6 flex items-center gap-2"
            >
                <div class="h-1 w-4 bg-gov-blue"></div>
                Institutional Reports
            </h2>
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                <!-- CSV Card -->
                <div
                    class="bg-white border border-border-subtle rounded-xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col group"
                >
                    <div
                        class="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4 transition-colors group-hover:bg-emerald-600 group-hover:text-white"
                    >
                        <FileText size={20} strokeWidth={1.5} />
                    </div>
                    <h4 class="font-bold text-sm text-text-primary mb-1">
                        Spreadsheet Export
                    </h4>
                    <p
                        class="text-[10px] text-text-muted mb-4 uppercase tracking-tight"
                    >
                        CSV format • Detailed raw data
                    </p>
                    <button
                        onclick={() =>
                            exportToCSV(
                                recentActivity,
                                `Data_${new Date().toISOString().split("T")[0]}`,
                            )}
                        class="mt-auto w-full py-2 bg-emerald-50 text-emerald-600 rounded-lg text-xs font-bold uppercase tracking-widest hover:bg-emerald-600 hover:text-white transition-all border border-emerald-100"
                    >
                        Generate CSV
                    </button>
                </div>

                <!-- PDF Card -->
                <div
                    class="bg-white border border-border-subtle rounded-xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col group"
                >
                    <div
                        class="w-10 h-10 rounded-lg bg-gov-blue/5 text-gov-blue flex items-center justify-center mb-4 transition-colors group-hover:bg-gov-blue group-hover:text-white"
                    >
                        <ShieldCheck size={20} strokeWidth={1.5} />
                    </div>
                    <h4 class="font-bold text-sm text-text-primary mb-1">
                        Compliance Report
                    </h4>
                    <p
                        class="text-[10px] text-text-muted mb-4 uppercase tracking-tight"
                    >
                        Verified PDF • Executive Summary
                    </p>
                    <button
                        onclick={() =>
                            generateCompliancePDF(
                                stats,
                                `${$profile?.role} Summary`,
                            )}
                        class="mt-auto w-full py-2 bg-gov-blue text-white rounded-lg text-xs font-bold uppercase tracking-widest hover:bg-gov-blue-dark transition-all shadow-md"
                    >
                        Download PDF
                    </button>
                </div>
            </div>
        </div>

        <!-- Recent Activity as Cards -->
        <div in:fade={{ duration: 600, delay: 600 }}>
            <h2
                class="text-sm font-bold text-text-muted uppercase tracking-widest mb-6 flex items-center gap-2"
            >
                <div class="h-1 w-4 bg-gov-gold"></div>
                Recent District Activity
            </h2>

            {#if recentActivity.length === 0}
                <div class="gov-card-static p-12 text-center rounded-2xl">
                    <p
                        class="text-text-muted font-bold text-xs uppercase tracking-widest"
                    >
                        No recent submissions detected
                    </p>
                </div>
            {:else}
                <div
                    class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5"
                >
                    {#each recentActivity as item, i}
                        <div
                            class="bg-white border border-border-subtle rounded-xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col group relative"
                            in:fly={{
                                x: -20,
                                duration: 400,
                                delay: 700 + i * 50,
                            }}
                        >
                            <div class="absolute top-4 right-4">
                                <StatusBadge
                                    status={item.compliance_status ===
                                        "on-time" ||
                                    item.compliance_status === "compliant"
                                        ? "compliant"
                                        : item.compliance_status === "late"
                                          ? "late"
                                          : "non-compliant"}
                                    size="sm"
                                />
                            </div>

                            <div class="mb-4">
                                <h4
                                    class="font-bold text-sm text-text-primary group-hover:text-gov-blue transition-colors leading-snug line-clamp-2 pr-12"
                                >
                                    {item.file_name}
                                </h4>
                            </div>

                            <div
                                class="mt-auto pt-3 border-t border-gray-50 flex items-center justify-between"
                            >
                                <div
                                    class="flex items-center gap-2 text-text-muted"
                                >
                                    <Clock size={12} strokeWidth={2} />
                                    <span
                                        class="text-[10px] font-bold uppercase tracking-tighter"
                                        >{formatDate(item.created_at)}</span
                                    >
                                </div>
                                <span
                                    class="text-[9px] font-bold text-gov-blue/60 uppercase tracking-widest"
                                    >Archived</span
                                >
                            </div>
                        </div>
                    {/each}
                </div>
            {/if}
        </div>
    {/if}
</div>
