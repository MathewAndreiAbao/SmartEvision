<script lang="ts">
  import { profile } from "$lib/utils/auth";
  import { supabase } from "$lib/utils/supabase";
  import StatCard from "$lib/components/StatCard.svelte";
  import StatusBadge from "$lib/components/StatusBadge.svelte";
  import ComplianceHeatmap from "$lib/components/ComplianceHeatmap.svelte";
  import ComplianceTrendChart from "$lib/components/ComplianceTrendChart.svelte";
  import DrillDownModal from "$lib/components/DrillDownModal.svelte";
  import { onMount, onDestroy } from "svelte";
  import { fly, fade } from "svelte/transition";
  import {
    calculateCompliance,
    groupSubmissionsByWeek,
    getComplianceClass,
    getComplianceBgClass,
    getTrendDirection,
    getTrendIcon,
    getWeekNumber,
    getSubmissionWeek,
    getDefinedWeeksCount,
  } from "$lib/utils/useDashboardData";

  // Data Interfaces
  interface School {
    id: string;
    name: string;
    district_id: string;
    rate?: number;
    total?: number;
    Compliant?: number;
    Late?: number;
    NonCompliant?: number;
    loadCount?: number;
  }

  interface Submission {
    id: string;
    user_id: string;
    file_name: string;
    doc_type: string;
    compliance_status: string;
    created_at: string;
    week_number?: number;
    school_id?: string;
  }

  interface KPI {
    totalSchools: number;
    overallRate: number;
    lateCount: number;
    atRiskCount: number;
    previousRate: number;
  }

  // State
  let schools = $state<School[]>([]);
  let allSubmissions = $state<Submission[]>([]);
  let loading = $state(true);
  let currentDefinedWeeks = $state(1);
  let kpi = $state<KPI>({
    totalSchools: 0,
    overallRate: 0,
    lateCount: 0,
    atRiskCount: 0,
    previousRate: 0,
  });

  // Chart State
  let heatmapRows = $state<string[]>([]);
  let heatmapWeeks = $state<{ week: number; label: string }[]>([]);
  let heatmapCells = $state<any[]>([]);
  let trendLabels = $state<string[]>([]);
  let trendDatasets = $state<any[]>([]);

  // Table State
  let sortField = $state<string>("rate");
  let sortDir = $state<"asc" | "desc">("desc");
  let searchQuery = $state("");

  // Modal State
  let showModal = $state(false);
  let selectedSchool = $state<School | null>(null);
  let selectedSubmissions = $state<Submission[]>([]);

  let realtimeChannel: ReturnType<typeof supabase.channel> | null = null;

  onMount(async () => {
    await loadDistrictData();
    loading = false;

    realtimeChannel = supabase
      .channel("district-monitoring")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "submissions" },
        () => loadDistrictData(),
      )
      .subscribe();
  });

  onDestroy(() => {
    if (realtimeChannel) supabase.removeChannel(realtimeChannel);
  });

  async function loadDistrictData() {
    const userProfile = $profile;
    if (!userProfile?.district_id) return;

    // 1. Fetch District Schools
    const { data: schoolsData } = await supabase
      .from("schools")
      .select("id, name, district_id")
      .eq("district_id", userProfile.district_id)
      .order("name");

    if (!schoolsData) return;

    const schoolIds = schoolsData.map((s) => s.id);

    // 2. Fetch submissions for all schools in district
    const { data: subsData } = await supabase
      .from("submissions")
      .select(
        `
                id, user_id, file_name, doc_type, compliance_status, created_at, week_number,
                profiles!inner(school_id)
            `,
      )
      .in("profiles.school_id", schoolIds)
      .order("created_at", { ascending: false });

    // 3. Fetch teaching loads for all schools in district
    const { data: loadsData } = await supabase
      .from("teaching_loads")
      .select("id, profiles!inner(school_id)")
      .in("profiles.school_id", schoolIds);

    // 4. Fetch Academic Calendar
    const { data: calendarData } = await supabase
      .from("academic_calendar")
      .select("*")
      .eq("school_year", "2025-2026")
      .order("week_number", { ascending: true });

    const calendar = (calendarData || []).filter(
      (c) => c.district_id === userProfile.district_id || !c.district_id,
    );

    // 5. Process School Data
    currentDefinedWeeks = await getDefinedWeeksCount(supabase);

    schools = schoolsData.map((school) => {
      const schoolSubmissions = (subsData || []).filter((s: any) => {
        const p = Array.isArray(s.profiles) ? s.profiles[0] : s.profiles;
        return p?.school_id === school.id;
      });

      const schoolLoadsCount = (loadsData || []).filter((l: any) => {
        const p = Array.isArray(l.profiles) ? l.profiles[0] : l.profiles;
        return p?.school_id === school.id;
      }).length;

      const stats = calculateCompliance(
        schoolSubmissions,
        (schoolLoadsCount || 0) * currentDefinedWeeks,
      );

      return {
        ...school,
        ...stats,
        loadCount: schoolLoadsCount,
      };
    });

    allSubmissions = (subsData || []).map((s: any) => {
      const p = Array.isArray(s.profiles) ? s.profiles[0] : s.profiles;
      return {
        ...s,
        school_id: p?.school_id,
        // Ensure week_number is available for filtering
        week_number: getSubmissionWeek(s),
      };
    }) as any;

    // 6. District KPIs
    const totalDistrictLoads = schools.reduce(
      (sum, s) => sum + (s.loadCount || 0),
      0,
    );
    const currentWk = getWeekNumber();
    const currentCal = calendar.find((c) => c.week_number === currentWk);

    const overallStats = calculateCompliance(
      allSubmissions,
      totalDistrictLoads * currentDefinedWeeks,
    );

    // Prev Week for Trend
    const prevCal = calendar.find((c) => c.week_number === currentWk - 1);
    const prevWeekSubs = allSubmissions.filter(
      (s) => getSubmissionWeek(s) === currentWk - 1,
    );
    const prevStats = calculateCompliance(prevWeekSubs, totalDistrictLoads); // One week denominator

    kpi = {
      totalSchools: schools.length,
      overallRate: overallStats.rate,
      lateCount: overallStats.Late,
      atRiskCount: schools.filter((s) => (s.rate || 0) < 70).length,
      previousRate: prevStats.rate,
    };

    // 7. Heatmap & Charts
    buildHeatmap(calendar);

    const weeklyData = groupSubmissionsByWeek(
      allSubmissions,
      totalDistrictLoads,
      8,
      calendar,
    );
    trendLabels = weeklyData.map((w) => w.label);
    trendDatasets = [
      {
        label: "District Compliance",
        data: weeklyData.map((w) => w.rate),
        color: "#0038A8",
      },
      {
        label: "80% Target",
        data: weeklyData.map(() => 80),
        color: "#CE1126",
        dashed: true,
      },
    ];
  }

  function buildHeatmap(calendar: any[]) {
    const weekCount = 8;
    const currentWeek = getWeekNumber();
    const weeks = [];

    const recentCal = [...calendar]
      .sort((a, b) => b.week_number - a.week_number)
      .slice(0, weekCount)
      .reverse();

    for (const cal of recentCal) {
      weeks.push({
        week: cal.week_number,
        label: `W${cal.week_number}`,
        deadline: cal.deadline_date,
      });
    }

    heatmapWeeks = weeks;
    heatmapRows = schools.map((s) => s.name);

    const cells = [];
    for (const school of schools) {
      const schoolSubs = allSubmissions.filter(
        (s) => s.school_id === school.id,
      );
      for (const w of weeks) {
        const weekSubs = schoolSubs.filter(
          (s) => getSubmissionWeek(s) === w.week,
        );
        const stats = calculateCompliance(weekSubs, school.loadCount);
        cells.push({
          row: school.name,
          week: w.week,
          rate: stats.rate,
          tooltip: `${school.name} - ${w.label}: ${stats.rate}%`,
        });
      }
    }
    heatmapCells = cells;
  }

  const sortedSchools = $derived(() => {
    let result = [...schools];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((s) => s.name.toLowerCase().includes(q));
    }
    result.sort((a: any, b: any) => {
      const aVal = a[sortField];
      const bVal = b[sortField];
      if (typeof aVal === "number")
        return sortDir === "asc" ? aVal - bVal : bVal - aVal;
      return sortDir === "asc"
        ? String(aVal).localeCompare(String(bVal))
        : String(bVal).localeCompare(String(aVal));
    });
    return result;
  });

  function openDrillDown(school: School) {
    selectedSchool = school;
    selectedSubmissions = allSubmissions
      .filter((s) => s.school_id === school.id)
      .slice(0, 50);
    showModal = true;
  }
</script>

<svelte:head>
  <title>District Monitoring — Smart E-VISION</title>
</svelte:head>

<div class="space-y-10">
  <!-- Header -->
  <div class="flex flex-col md:flex-row md:items-end justify-between gap-4">
    <div>
      <h1 class="text-3xl font-semibold text-text-primary tracking-tight">
        District Oversight
      </h1>
      <p class="text-base text-text-secondary mt-1 font-medium">
        Monitoring performance across <span class="font-bold text-gov-blue"
          >{kpi.totalSchools} schools</span
        > in the district
      </p>
    </div>
  </div>

  {#if loading}
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {#each Array(4) as _}
        <div class="gov-card-static p-8 animate-pulse text-center">
          <div class="h-4 bg-gray-200 rounded w-24 mx-auto mb-4"></div>
          <div class="h-10 bg-gray-200 rounded w-16 mx-auto"></div>
        </div>
      {/each}
    </div>
  {:else}
    <!-- KPI Cards -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-6">
      <div in:fly={{ y: 20, duration: 400 }}>
        <StatCard
          icon="School"
          value={kpi.totalSchools}
          label="Active Schools"
        />
      </div>

      <div in:fly={{ y: 20, duration: 400, delay: 100 }}>
        <StatCard
          icon="Activity"
          value="{kpi.overallRate}%"
          label="District Rate"
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
          label="Alert Schools"
          color="from-gov-red to-red-700"
        />
      </div>
    </div>

    <!-- Charts -->
    <div class="grid grid-cols-1 xl:grid-cols-2 gap-6">
      <div
        class="gov-card-static p-6"
        in:fly={{ y: 20, duration: 500, delay: 400 }}
      >
        <h3 class="text-lg font-bold text-text-primary mb-4">
          School Performance Heatmap
        </h3>
        <ComplianceHeatmap
          rows={heatmapRows}
          weeks={heatmapWeeks}
          cells={heatmapCells}
          onCellClick={(row) => {
            const school = schools.find((s) => s.name === row);
            if (school) openDrillDown(school);
          }}
        />
      </div>

      <div
        class="gov-card-static p-6"
        in:fly={{ y: 20, duration: 500, delay: 500 }}
      >
        <h3 class="text-lg font-bold text-text-primary mb-4">
          District-Wide Trend
        </h3>
        <div class="h-[280px]">
          <ComplianceTrendChart
            labels={trendLabels}
            datasets={trendDatasets}
            height={280}
          />
        </div>
      </div>
    </div>

    <!-- School Table -->
    <div
      class="gov-card-static overflow-hidden"
      in:fade={{ duration: 500, delay: 600 }}
    >
      <div
        class="px-6 py-5 border-b border-gray-100 flex items-center justify-between flex-wrap gap-4 bg-gray-50/20"
      >
        <div class="flex items-center gap-3">
          <div class="h-6 w-1 bg-gov-blue rounded-full"></div>
          <h3
            class="text-sm font-bold text-text-primary uppercase tracking-wider"
          >
            Institutional Performance Rankings
          </h3>
        </div>
        <div class="relative group">
          <div
            class="absolute inset-y-0 left-3 flex items-center pointer-events-none text-text-muted group-focus-within:text-gov-blue transition-colors"
          >
            <svg
              class="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              ><path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2.5"
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              ></path></svg
            >
          </div>
          <input
            type="text"
            bind:value={searchQuery}
            placeholder="Search school records..."
            class="pl-10 pr-4 py-2 text-[11px] font-bold bg-white border border-border-subtle rounded-md outline-none focus:ring-2 focus:ring-gov-blue/20 w-72 transition-all placeholder:text-text-muted/60 uppercase tracking-tight"
          />
        </div>
      </div>

      <div class="p-6">
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {#each sortedSchools() as school}
            <div
              class="bg-white border border-border-subtle rounded-xl p-6 shadow-sm hover:shadow-md hover:border-gov-blue/20 transition-all flex flex-col group cursor-pointer"
              onclick={() => openDrillDown(school)}
              in:fly={{ y: 20, duration: 400 }}
            >
              <div class="flex justify-between items-start mb-4">
                <h4
                  class="font-bold text-base text-text-primary group-hover:text-gov-blue transition-colors leading-tight"
                >
                  {school.name}
                </h4>
                <span
                  class="px-2.5 py-1 rounded-full text-[10px] font-bold {getComplianceBgClass(
                    school.rate || 0,
                  )} {getComplianceClass(
                    school.rate || 0,
                  )} uppercase tracking-wide"
                >
                  {school.rate}%
                </span>
              </div>

              <div class="grid grid-cols-3 gap-2 mb-6">
                <div class="bg-gov-green/5 p-2 rounded text-center">
                  <p
                    class="text-[9px] font-bold text-gov-green uppercase leading-none mb-1"
                  >
                    Pass
                  </p>
                  <p class="text-xs font-bold text-text-primary">
                    {school.Compliant}
                  </p>
                </div>
                <div class="bg-gov-gold/5 p-2 rounded text-center">
                  <p
                    class="text-[9px] font-bold text-gov-gold-dark uppercase leading-none mb-1"
                  >
                    Late
                  </p>
                  <p class="text-xs font-bold text-text-primary">
                    {school.Late}
                  </p>
                </div>
                <div class="bg-gov-red/5 p-2 rounded text-center">
                  <p
                    class="text-[9px] font-bold text-gov-red uppercase leading-none mb-1"
                  >
                    Miss
                  </p>
                  <p class="text-xs font-bold text-text-primary">
                    {school.NonCompliant}
                  </p>
                </div>
              </div>

              <div class="mt-auto pt-4 border-t border-gray-50">
                <button
                  class="w-full py-2 bg-gov-blue/5 text-gov-blue hover:bg-gov-blue hover:text-white rounded-lg transition-all font-bold text-[10px] uppercase tracking-widest border border-gov-blue/10"
                >
                  View Performance Details
                </button>
              </div>
            </div>
          {/each}
        </div>

        {#if sortedSchools().length === 0}
          <div class="p-12 text-center">
            <p
              class="text-text-muted font-bold text-sm uppercase tracking-widest"
            >
              No matching institutional records found
            </p>
          </div>
        {/if}
      </div>
    </div>
  {/if}
</div>

<!-- School Drill-Down Modal -->
<DrillDownModal
  isOpen={showModal}
  title={selectedSchool
    ? `School Submissions: ${selectedSchool.name}`
    : "School Details"}
  onClose={() => (showModal = false)}
>
  {#if selectedSchool}
    <div class="space-y-4">
      <div class="grid grid-cols-3 gap-3">
        <div class="bg-gov-blue/5 p-3 rounded-lg text-center">
          <p class="text-xs text-text-muted mb-1">Expectation</p>
          <p class="text-lg font-bold text-gov-blue">
            {selectedSchool.loadCount}
          </p>
        </div>
        <div class="bg-gov-green/5 p-3 rounded-lg text-center">
          <p class="text-xs text-text-muted mb-1">Compliance</p>
          <p class="text-lg font-bold text-gov-green">
            {selectedSchool.rate}%
          </p>
        </div>
        <div class="bg-gov-red/5 p-3 rounded-lg text-center">
          <p class="text-xs text-text-muted mb-1">Non-Compliant</p>
          <p class="text-lg font-bold text-gov-red">
            {selectedSchool.NonCompliant}
          </p>
        </div>
      </div>

      <div class="divide-y divide-gray-100">
        {#each selectedSubmissions as sub}
          <div class="py-3 flex items-center justify-between">
            <div class="min-w-0 pr-4">
              <p class="text-sm font-medium text-text-primary truncate">
                {sub.file_name}
              </p>
              <p class="text-xs text-text-muted">
                {sub.doc_type} - Week {sub.week_number}
              </p>
            </div>
            <StatusBadge
              status={sub.compliance_status === "late"
                ? "late"
                : sub.compliance_status === "non-compliant"
                  ? "non-compliant"
                  : "compliant"}
              size="sm"
            />
          </div>
        {/each}
      </div>
    </div>
  {/if}
</DrillDownModal>
