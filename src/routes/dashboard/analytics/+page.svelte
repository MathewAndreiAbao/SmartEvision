<script lang="ts">
    import { profile } from "$lib/utils/auth";
    import { supabase } from "$lib/utils/supabase";
    import LineChart from "$lib/components/charts/LineChart.svelte";
    import BarChart from "$lib/components/charts/BarChart.svelte";
    import DonutChart from "$lib/components/charts/DonutChart.svelte";
    import ScatterPlot from "$lib/components/charts/ScatterPlot.svelte";
    import DashboardCards from "$lib/components/DashboardCards.svelte";
    import { onMount, onDestroy } from "svelte";
    import {
        getSchoolHeadAnalytics,
        getDistrictSupervisorAnalytics,
        generateComplianceTrend,
        getPerformanceDistribution,
        kMeansClusterPerformance,
        getDocumentTypeAnalysis,
        getAtRiskEntities,
        forecastCompliance,
        getWeeklyPatterns,
        getComparisonMetrics
    } from "$lib/utils/analyticsQueries";
    import {
        calculateCompliance,
        getDefinedWeeksCount,
        getDynamicSchoolYear,
    } from "$lib/utils/useDashboardData";
    import { TrendingUp, AlertTriangle, Users, Building2, WifiOff } from "lucide-svelte";
    import { connectivity } from "$lib/stores/connectivity";
    const { isOnline: onlineStatus } = connectivity;

    let loading = $state(true);
    let analyticsData = $state<any>(null);
    let trends = $state<any>(null);
    let distributions = $state<any>(null);
    let clusters = $state<any>(null);
    let atRiskList = $state<any[]>([]);
    let comparisonStats = $state<any>(null);
    // Expected slots (active teaching loads × opened calendar weeks) for this
    // scope, so "Overall Compliance" here means the same thing as the
    // Dashboard's "Compliance Rate" and District Monitoring's "District
    // Rate" — of everything due, how much got done — instead of only
    // measuring on-time-ness among documents that already exist.
    let expectedTotal = $state(0);

    let realtimeChannel: ReturnType<typeof supabase.channel> | null = null;

    async function loadAnalytics() {
        try {
            if ($profile && ($profile.role === 'School Head' || $profile.role === 'District Supervisor')) {
                const role = $profile.role;
                const schoolId = $profile.school_id;
                const districtId = $profile.district_id;

                if (role === 'School Head') {
                    analyticsData = await getSchoolHeadAnalytics(schoolId, districtId);
                } else {
                    analyticsData = await getDistrictSupervisorAnalytics(districtId);
                }

                // Expected total for this scope: active teaching loads for
                // actual teachers, times the calendar weeks this district has
                // opened so far — the same "expected" formula the rest of
                // the app uses, scoped the same way.
                let loadsQuery = supabase
                    .from('teaching_loads')
                    .select('id, profiles!inner(school_id, district_id, role)')
                    .in('profiles.role', ['Teacher', 'Master Teacher']);
                loadsQuery = role === 'School Head'
                    ? loadsQuery.eq('profiles.school_id', schoolId)
                    : loadsQuery.eq('profiles.district_id', districtId);
                const { data: loadsData } = await loadsQuery;
                const totalLoads = (loadsData || []).length;
                const definedWeeks = await getDefinedWeeksCount(
                    supabase,
                    getDynamicSchoolYear(),
                    districtId ?? undefined,
                );
                expectedTotal = totalLoads * definedWeeks;

                if (analyticsData) {
                    const submissions = analyticsData.complianceTrend || [];
                    const teacherData = analyticsData.teacherPerformance || analyticsData.teacherDistribution || [];

                    trends = {
                        compliance: generateComplianceTrend(submissions, 'week'),
                        forecast: forecastCompliance(generateComplianceTrend(submissions, 'week'), 4)
                    };

                    distributions = {
                        byTeacher: getPerformanceDistribution(teacherData, 'teacher'),
                        docTypes: getDocumentTypeAnalysis(analyticsData.docTypeStats || []),
                        weekly: getWeeklyPatterns(submissions)
                    };

                    clusters = kMeansClusterPerformance(distributions.byTeacher || []);
                    atRiskList = getAtRiskEntities(distributions.byTeacher || [], 70);
                    comparisonStats = getComparisonMetrics(distributions.byTeacher || []);
                }
            }
        } catch (err) {
            console.error('[analytics] Failed to load:', err);
        } finally {
            loading = false;
        }
    }

    onMount(() => {
        loadAnalytics();

        // Keep every chart and cluster live: re-run the analysis whenever any
        // submission is created/updated/deleted, instead of only ever showing
        // a stale snapshot from the moment the page was opened.
        realtimeChannel = supabase
            .channel("analytics-submissions")
            .on(
                "postgres_changes",
                { event: "*", schema: "public", table: "submissions" },
                () => {
                    if (!loading) loadAnalytics();
                },
            )
            .subscribe();
    });

    onDestroy(() => {
        if (realtimeChannel) supabase.removeChannel(realtimeChannel);
    });

    const overallStats = $derived.by(() => {
        if (!analyticsData?.complianceTrend) return { compliant: 0, late: 0, missing: 0, rate: 0, total: 0 };
        const stats = calculateCompliance(analyticsData.complianceTrend, expectedTotal);
        return {
            compliant: stats.Compliant,
            late: stats.Late,
            missing: stats.NonCompliant,
            rate: stats.rate,
            total: stats.totalUploaded,
        };
    });
</script>

<svelte:head>
    <title>Analytics — CEDIMS</title>
</svelte:head>

{#if $profile?.role === 'Teacher' || $profile?.role === 'Master Teacher'}
    <div class="text-center py-12">
        <h2 class="text-2xl font-bold text-text-primary">Analytics Not Available</h2>
        <p class="text-text-secondary mt-2">Available for School Heads and District Supervisors</p>
    </div>
{:else}
    <div class="space-y-8">
        <div>
            <h1 class="text-3xl font-bold text-text-primary">Analytics & Insights</h1>
            <p class="text-text-secondary mt-2">Comprehensive compliance analysis and performance metrics</p>
        </div>

        {#if !loading && !$onlineStatus}
            <div
                class="flex items-center gap-2 rounded-lg border border-gov-gold/30 bg-gov-gold/10 px-4 py-3 text-sm font-medium text-gov-gold-dark"
                role="status"
            >
                <WifiOff size={16} strokeWidth={2} class="flex-shrink-0" aria-hidden="true" />
                You're offline — this analysis may be incomplete or out of date.
            </div>
        {/if}

        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <DashboardCards title="Overall Compliance" value={overallStats.rate} unit="%" variant="success" icon={TrendingUp} />
            <DashboardCards title="Compliant" value={overallStats.compliant} variant="success" icon={TrendingUp} />
            <DashboardCards title="At-Risk" value={atRiskList.length} variant="danger" icon={AlertTriangle} />
            <DashboardCards title="Entities" value={distributions?.byTeacher?.length || 0} variant="info" icon={Users} />
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <LineChart data={trends?.compliance || []} title="Compliance Trend" series={['rate']} />
            <LineChart data={trends?.forecast || []} title="Compliance Forecast" series={['rate']} />
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {#if distributions?.docTypes}
                <DonutChart
                    data={distributions.docTypes.map((d: any) => ({
                        label: d.type,
                        value: d.total,
                        color: d.type === 'DLL' ? '#3b82f6' : d.type === 'ISP' ? '#16a34a' : '#d97706'
                    }))}
                    title="Document Types"
                />
            {/if}
            {#if distributions?.weekly}
                <BarChart
                    data={distributions.weekly.map((w: any) => ({
                        label: w.day,
                        value: w.percentage,
                        color: '#3b82f6'
                    }))}
                    title="Submissions by Day"
                    maxValue={30}
                />
            {/if}
        </div>

        <ScatterPlot data={distributions?.byTeacher || []} title="Performance Distribution (K-means Clustering)" />

        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {#if clusters?.high?.length}
                <div class="gov-card-static bg-gov-green/5 p-6">
                    <h3 class="text-lg font-bold text-gov-green mb-4">High Performers ({clusters.high.length})</h3>
                    <div class="space-y-2">{#each clusters.high.slice(0, 5) as e}<div class="p-2 bg-surface-muted rounded"><p class="text-sm font-semibold truncate">{e.name}</p><p class="text-xs text-gov-green">{e.compliance_rate}%</p></div>{/each}</div>
                </div>
            {/if}
            {#if clusters?.average?.length}
                <div class="gov-card-static bg-gov-gold/5 p-6">
                    <h3 class="text-lg font-bold text-gov-gold-dark mb-4">Average ({clusters.average.length})</h3>
                    <div class="space-y-2">{#each clusters.average.slice(0, 5) as e}<div class="p-2 bg-surface-muted rounded"><p class="text-sm font-semibold truncate">{e.name}</p><p class="text-xs text-gov-gold-dark">{e.compliance_rate}%</p></div>{/each}</div>
                </div>
            {/if}
            {#if clusters?.atRisk?.length}
                <div class="gov-card-static bg-gov-red/5 p-6">
                    <h3 class="text-lg font-bold text-gov-red mb-4">At-Risk ({clusters.atRisk.length})</h3>
                    <div class="space-y-2">{#each clusters.atRisk.slice(0, 5) as e}<div class="p-2 bg-surface-muted rounded"><p class="text-sm font-semibold truncate">{e.name}</p><p class="text-xs text-gov-red">{e.compliance_rate}%</p></div>{/each}</div>
                </div>
            {/if}
        </div>

        {#if distributions?.byTeacher?.length}
            <BarChart
                data={distributions.byTeacher.sort((a: any, b: any) => b.compliance_rate - a.compliance_rate).slice(0, 15).map((t: any) => ({
                    label: t.name,
                    value: t.compliance_rate,
                    color: t.compliance_rate >= 85 ? '#16a34a' : t.compliance_rate >= 70 ? '#d97706' : '#dc2626'
                }))}
                title="Performance Rankings"
                maxValue={100}
            />
        {/if}

        {#if atRiskList?.length}
            <div class="gov-card-static p-6">
                <h3 class="text-lg font-bold mb-4">Below 70% Compliance ({atRiskList.length})</h3>
                <div class="overflow-x-auto">
                    <table class="w-full text-sm">
                        <thead><tr class="border-b"><th class="text-left py-2 px-3 text-xs font-semibold">Name</th><th class="text-left py-2 px-3 text-xs font-semibold">Rate</th><th class="text-left py-2 px-3 text-xs font-semibold">Status</th></tr></thead>
                        <tbody>{#each atRiskList.slice(0, 15) as e}<tr class="border-b"><td class="py-2 px-3">{e.name}</td><td class="py-2 px-3 font-bold text-gov-red">{e.compliance_rate}%</td><td class="py-2 px-3"><span class="px-2 py-1 rounded text-xs bg-gov-red/20 text-gov-red font-bold">{e.risk_level}</span></td></tr>{/each}</tbody>
                    </table>
                </div>
            </div>
        {/if}
    </div>
{/if}
