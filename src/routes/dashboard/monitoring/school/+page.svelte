<script lang="ts">
    import { profile } from "$lib/utils/auth";
    import { supabase } from "$lib/utils/supabase";
    import StatCard from "$lib/components/StatCard.svelte";
    import StatusBadge from "$lib/components/StatusBadge.svelte";
    import ComplianceHeatmap from "$lib/components/ComplianceHeatmap.svelte";
    import ComplianceTrendChart from "$lib/components/ComplianceTrendChart.svelte";
    import DrillDownModal from "$lib/components/DrillDownModal.svelte";
    import ProfileUploader from "$lib/components/ProfileUploader.svelte";
    import { onMount, onDestroy } from "svelte";
    import { fly, fade } from "svelte/transition";
    import { goto } from "$app/navigation";
    import { School as SchoolIcon, Eye } from "lucide-svelte";
    import { addToast } from "$lib/stores/toast";
    import {
        calculateCompliance,
        groupSubmissionsByWeek,
        getComplianceClass,
        getComplianceBgClass,
        getTrendDirection,
        getTrendIcon,
        formatComplianceRate,
        getWeekNumber,
        getDefinedWeeksCount,
        getDynamicSchoolYear,
    } from "$lib/utils/useDashboardData";
    import {
        extractFeatures,
        runKMeansClustering,
        canCluster,
    } from "$lib/utils/clusterAnalytics";
    import ClusterVisualization from "$lib/components/ClusterVisualization.svelte";
    // Data
    interface Teacher {
        id: string;
        full_name: string;
        role: string;
        district_id: string;
        loadCount?: number;
        rate?: number;
        total?: number;
        Compliant?: number;
        Late?: number;
        NonCompliant?: number;
    }

    interface Submission {
        id: string;
        user_id: string;
        file_name: string;
        doc_type: string;
        compliance_status: string;
        created_at: string;
        week_number?: number;
        teaching_loads?: any;
    }

    interface KPI {
        totalTeachers: number;
        overallRate: number;
        lateCount: number;
        atRiskCount: number;
        previousRate: number;
    }

    // Data
    let teachers = $state<Teacher[]>([]);
    let allSubmissions = $state<Submission[]>([]);
    let loading = $state(true);
    let schoolLogoUrl = $state<string | null>(null);
    let currentDefinedWeeks = $state(1);
    // KPI state
    let kpi = $state<KPI>({
        totalTeachers: 0,
        overallRate: 0,
        lateCount: 0,
        atRiskCount: 0,
        previousRate: 0,
    });

    // Heatmap data
    let heatmapRows = $state<string[]>([]);
    let heatmapWeeks = $state<{ week: number; label: string }[]>([]);
    let heatmapCells = $state<any[]>([]);

    // Trend chart data
    let trendLabels = $state<string[]>([]);
    let trendDatasets = $state<any[]>([]);

    // Cluster state
    let clusterShow = $state(false);
    let clusterResults = $state<any[]>([]);
    let clusterSummaries = $state<any[]>([]);
    let clusterReady = $state(false);
                    .order("week_number", { ascending: true }),
            ],
        );

        teachers = (teachersRes.data || []).map((t: any) => t as Teacher);
        const schoolLoads = loadsRes.data || [];
        const districtId = teachers[0]?.district_id || userProfile.district_id;

        let calendar = (calendarRes.data || []) as any[];
        if (districtId) {
            calendar = calendar.filter(
                (c: any) => c.district_id === districtId,
            );
        }

        currentDefinedWeeks = await getDefinedWeeksCount(supabase);

        // Attach load count to each teacher
        teachers = teachers.map((t: Teacher) => ({
            ...t,
            loadCount: schoolLoads.filter((l: any) => l.user_id === t.id)
                .length,
        }));

        allSubmissions = (subsRes.data || []).map((s: any) => s as Submission);
        const teacherIds = new Set(teachers.map((t: Teacher) => t.id));
        allSubmissions = allSubmissions.filter((s: Submission) =>
            teacherIds.has(s.user_id),
        );

        // Calculate KPIs
        const totalSchoolLoads = teachers.reduce(
            (sum: number, t: Teacher) => sum + (t.loadCount || 0),
            0,
        );

        const cumulativeExpectedDistrict =
            totalSchoolLoads * currentDefinedWeeks;

        const overallStats = calculateCompliance(
            allSubmissions,
            cumulativeExpectedDistrict,
        );
        kpi.totalTeachers = teachers.length;
        kpi.overallRate = overallStats.rate;
        kpi.lateCount = overallStats.Late;

        // At-risk: teachers with <70% compliance
        kpi.atRiskCount = teachers.filter((t: Teacher) => {
            const subs = allSubmissions.filter(
                (s: Submission) => s.user_id === t.id,
            );
            const stats = calculateCompliance(subs, t.loadCount);
            return stats.rate < 70 && subs.length > 0;
        }).length;

        // Previous week rate for trend
        const prevCal = calendar.find(
            (c: any) => c.week_number === currentWk - 1,
        );
        const prevWeekSubs = allSubmissions.filter((s: Submission) => {
            const wn = s.week_number || getWeekNumber(new Date(s.created_at));
            return wn === currentWk - 1;
        });
        kpi.previousRate = calculateCompliance(
            prevWeekSubs,
            totalSchoolLoads, // Strictly for one week
        ).rate;

        // Build heatmap
        buildHeatmap(calendar);

        // Build trend chart
        const weeklyData = groupSubmissionsByWeek(
            allSubmissions,
            totalSchoolLoads,
            8,
            calendar,
        );
        trendLabels = weeklyData.map((w: any) => w.label);
        trendDatasets = [
            {
                label: "School Compliance",
                data: weeklyData.map((w: any) => w.rate),
                color: "#0038A8",
            },
            {
                label: "100% Target",
                data: weeklyData.map(() => 100),
                color: "#CE1126",
                dashed: true,
            },
        ];

        // K-Means clustering
        const tData = allSubmissions.map((s) => ({
            user_id: s.user_id,
            compliance_status: s.compliance_status,
            week_number: s.week_number,
            created_at: s.created_at,
        }));
        const features = extractFeatures(teachers, tData, currentDefinedWeeks);
        clusterReady = canCluster(features.length, tData.length);
        if (clusterReady) {
            const output = runKMeansClustering(features, 3);
            clusterResults = output.results;
            clusterSummaries = output.summaries;
        }</svelte:head>

<div>
    <!-- Header -->
    <div class="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
            <h1 class="text-2xl font-bold text-text-primary">
                School Compliance Monitor
            </h1>
            <p class="text-base text-text-secondary mt-1">
                Track teacher submissions and compliance rates
            </p>
        </div>

        {#if $profile?.role === 'School Head' && $profile?.school_id}
        <div class="flex items-center gap-4 bg-surface-white p-4 rounded-2xl border border-border-subtle shadow-sm" in:fade>            <ProfileUploader 
                id={$profile.school_id}
                bucket="avatars"
                path="schools"
                label="School Logo"
                size="md"
                placeholderIcon={SchoolIcon}
                bind:url={schoolLogoUrl} 
                onUpload={async (newUrl) => {
                    await supabase.from('schools').update({ avatar_url: newUrl }).eq('id', $profile?.school_id || '');
                    addToast("success", "School logo updated");
                }}
            />
            <div class="hidden sm:block">
                <h4 class="text-sm font-bold text-text-primary uppercase tracking-tight">School Branding</h4>
                <p class="text-[10px] text-text-muted font-medium">Official Institutional Logo</p>
            </div>
        </div>
        {/if}
    </div>

    {#if loading}
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {#each Array(4) as _}
                <div class="gov-card-static p-6 animate-pulse">
                    <div class="h-4 bg-surface-muted rounded w-24 mb-3"></div>
                    <div class="h-8 bg-surface-muted rounded w-16"></div>                </div>
            {/each}
        </div>
    {:else}
        <!-- KPI Cards -->
        <!-- KPI Row -->
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
            <div in:fly={{ y: 20, duration: 400 }}>
                <StatCard
                    icon="Users"
                    value={kpi.totalTeachers}
                    label="Total Teachers"
                />
            </div>
            <div in:fly={{ y: 20, duration: 400, delay: 100 }}>
                <StatCard
                    icon="Activity"
                    value="{kpi.overallRate}%"
                    label="School Rate"
                    color="from-gov-green to-gov-green-dark"
                />
            </div>
            <div in:fly={{ y: 20, duration: 400, delay: 200 }}>
                <StatCard
                    icon="Clock"
                    value={kpi.lateCount}
                    label="Late Submissions"
                    color="from-gov-gold to-gov-gold-dark"
                />
            </div>
            <div in:fly={{ y: 20, duration: 400, delay: 300 }}>
                <StatCard
                    icon="ShieldAlert"
                    value={kpi.atRiskCount}
                    label="Compliance Leads"
                    color="from-gov-red to-red-700"
                />
            </div>
        </div>

        <!-- Alerts -->
        {#if alertTeachers().length > 0}
            <div
                class="gov-card-static p-5 mb-8 border-l-4 border-gov-gold"
                in:fade={{ duration: 500, delay: 400 }}
            >
                <h3 class="text-sm font-bold text-gov-gold-dark mb-2">
                    Attention: {alertTeachers().length} teacher{alertTeachers()
                        .length > 1
                        ? "s"
                        : ""} with ≥2 late submissions
                </h3>
                <div class="flex flex-wrap gap-2">
                    {#each alertTeachers() as teacher}
                        <button
                            class="px-3 py-1.5 text-xs font-semibold bg-gov-gold/10 text-gov-gold-dark rounded-lg hover:bg-gov-gold/20 transition-colors"
                            onclick={() => openDrillDown(teacher)}
                        >
                            {teacher.full_name}
                        </button>
                    {/each}
                </div>
            </div>
        {/if}

        <!-- Heatmap + Trend Chart -->
        <div class="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-8">
            <div
                class="gov-card-static p-6"
                in:fly={{ y: 20, duration: 500, delay: 500 }}
            >
                <h3 class="text-lg font-bold text-text-primary mb-4">
                    Compliance Heatmap
                </h3>
                <div class="overflow-x-auto touch-pan-x">            </div>

            <div
                class="gov-card-static p-6"
                in:fly={{ y: 20, duration: 500, delay: 600 }}
            >
                <h3 class="text-lg font-bold text-text-primary mb-4">
                    School vs Target
                </h3>
                {#if trendLabels.length > 0}
                    <ComplianceTrendChart
                        labels={trendLabels}
                        datasets={trendDatasets}
                        height={260}
                    />
                {:else}
                    <div
                        class="flex items-center justify-center h-[260px] text-text-muted"
                    >
                        <p>No trend data available yet</p>
                    </div>
                {/if}
            </div>
        </div>

        <!-- Teacher Table -->
        <div
            class="gov-card-static overflow-hidden"
            in:fade={{ duration: 500, delay: 700 }}
        >
            <div
                class="px-6 py-4 border-b border-border-subtle flex items-center justify-between flex-wrap gap-3"            >
                <h3 class="text-lg font-bold text-text-primary">
                    Teacher Compliance
                </h3>
                <input
                    type="text"
                    bind:value={searchQuery}
                    placeholder="Search teacher..."
                    class="w-full sm:w-56 px-4 py-2 text-sm bg-surface-white/60 border border-border-subtle rounded-xl focus:ring-2 focus:ring-gov-blue/30 focus:border-gov-blue outline-none"                />
            </div>

            {#if sortedTeachers().length === 0}
                <div class="p-10 text-center">
                    <p class="text-text-muted font-medium">No teachers found</p>
                </div>
            {:else}
                <div class="p-6">
                    <div
                        class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                    >
                        {#each sortedTeachers() as teacher}
                            <button
                                type="button"
                                class="bg-surface-white border border-border-subtle rounded-xl p-6 shadow-sm hover:shadow-md hover:border-gov-blue/20 transition-all flex flex-col group cursor-pointer text-left w-full"                                onclick={() => openDrillDown(teacher)}
                                in:fly={{ y: 20, duration: 400 }}
                            >
                                <div
                                    class="flex justify-between items-start mb-4"
                                >
                                    <div>
                                        <h4
                                            class="font-bold text-base text-text-primary group-hover:text-gov-blue transition-colors leading-tight"
                                        >
                                            {teacher.full_name}
                                        </h4>
                                        <p
                                            class="text-[10px] text-text-muted font-bold uppercase tracking-tight mt-1"
                                        >
                                            Total: {teacher.total} Documents
                                        </p>
                                    </div>
                                    <span
                                        class="px-2.5 py-1 rounded-full text-[10px] font-bold {getComplianceBgClass(
                                            teacher.rate,
                                        )} {getComplianceClass(
                                            teacher.rate,
                                        )} uppercase tracking-wide"
                                    >
                                        {teacher.rate}%
                                    </span>
                                </div>

                                <div class="grid grid-cols-3 gap-2 mb-6">
                                    <div
                                        class="bg-gov-green/5 p-2 rounded text-center"
                                    >
                                        <p
                                            class="text-[9px] font-bold text-gov-green uppercase leading-none mb-1"
                                        >
                                            Pass
                                        </p>
                                        <p
                                            class="text-xs font-bold text-text-primary"
                                        >
                                            {teacher.Compliant}
                                        </p>
                                    </div>
                                    <div
                                        class="bg-gov-gold/5 p-2 rounded text-center"
                                    >
                                        <p
                                            class="text-[9px] font-bold text-gov-gold-dark uppercase leading-none mb-1"
                                        >
                                            Late
                                        </p>
                                        <p
                                            class="text-xs font-bold text-text-primary"
                                        >
                                            {teacher.Late}
                                        </p>
                                    </div>
                                    <div
                                        class="bg-gov-red/5 p-2 rounded text-center"
                                    >
                                        <p
                                            class="text-[9px] font-bold text-gov-red uppercase leading-none mb-1"
                                        >
                                            Miss
                                        </p>
                                        <p
                                            class="text-xs font-bold text-text-primary"
                                        >
                                            {teacher.NonCompliant}
                                        </p>
                                    </div>
                                </div>

                                <div
                                    class="mt-auto pt-4 border-t border-gray-50"
                                >
                                    <div
                                        class="w-full py-2 bg-gov-blue/5 text-gov-blue group-hover:bg-gov-blue group-hover:text-white rounded-lg transition-all font-bold text-[10px] uppercase tracking-widest border border-gov-blue/10 flex items-center justify-center"
                                    >
                                        View Details                                    </div>
                                </div>
                            </button>
                        {/each}
                    </div>
                </div>
            {/if}
        </div>

        <!-- K-Means Cluster Analysis -->
        {#if clusterReady && clusterResults.length > 0}
            <div class="mt-8" in:fade={{ duration: 600 }}>
                <div class="flex items-center justify-between mb-4">
                    <div>
                        <h3 class="text-lg font-bold text-text-primary">
                            Teacher Behavior Clusters
                        </h3>
                        <p class="text-sm text-text-secondary">
                            AI-powered grouping by submission patterns
                        </p>
                    </div>
                    <button
                        onclick={() => (clusterShow = !clusterShow)}
                        class="px-4 py-2 text-sm font-semibold rounded-xl border border-border-subtle hover:bg-surface-muted transition-all"
                    >
                        {clusterShow ? "Hide" : "Show"} Clusters
                    </button>
                </div>
                {#if clusterShow}
                    <ClusterVisualization
                        results={clusterResults}
                        summaries={clusterSummaries}
                    />
                {/if}
            </div>
        {/if}                {#each selectedSubmissions as sub}
                    {@const tl = Array.isArray(sub.teaching_loads)
                        ? sub.teaching_loads[0]
                        : sub.teaching_loads}
                    <div class="flex items-center justify-between py-3">
                        <div class="min-w-0 flex-1">
                            <p
                                class="text-sm font-medium text-text-primary truncate"
                            >
                                {sub.file_name}
                            </p>
                            <p class="text-xs text-text-muted">
                                {sub.doc_type}
                                {#if tl}
                                    - {tl.subject} - Gr. {tl.grade_level}{/if}
                            </p>
                        </div>
                        <div class="flex items-center gap-3 flex-shrink-0">
                            <StatusBadge
                                status={!sub.compliance_status ||
                                sub.compliance_status === "on-time" ||                                sub.compliance_status === "compliant"
                                    ? "compliant"
                                    : sub.compliance_status === "late"
                                      ? "late"
                                      : "non-compliant"}
                                size="sm"
                            />
                            <span class="text-xs text-text-muted whitespace-nowrap"
                                >{formatDate(sub.created_at)}</span
                            >

                        </div>
                    </div>
                {/each}
            </div>
        {/if}
    {/if}
</DrillDownModal>
