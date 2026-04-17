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
  import { addToast } from "$lib/stores/toast";
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
  import { 
    analyzeComplianceRisk,
    calculateDistrictRisk
  } from "$lib/utils/predictiveAnalytics";
  import {
    logTAOutreach,
    getSupervisorTAWorkflow,
    type TechnicalAssistance
  } from "$lib/utils/taManager";
  import {
    LayoutDashboard,
    HelpingHand,
    Building2,
    Activity,
    History,
    TrendingUp,
    MessageSquare,
    CheckCircle2
  } from "lucide-svelte";

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
    risk?: number;
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
  let districtLogoUrl = $state<string | null>(null);
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

  // TA Management State
  let activeTab = $state<'performance' | 'support'>('performance');
  let taHistory = $state<TechnicalAssistance[]>([]);
  let isSubmittingSupport = $state(false);
  let selectedTA = $state<TechnicalAssistance | null>(null);
  let showNotesModal = $state(false);
  let taNotes = $state("");

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

    // Stage 1: Batch fetch non-dependent data
    const [distRes, schoolsRes, calendarRes, weeksRes, taRes] = await Promise.all([
      supabase.from('districts').select('avatar_url').eq('id', userProfile.district_id).single(),
      supabase
        .from("schools")
        .select("id, name, district_id")
        .eq("district_id", userProfile.district_id)
        .order("name"),
      supabase
        .from("academic_calendar")
        .select("*")
        .eq("school_year", "2025-2026")
        .order("week_number", { ascending: true }),
      getDefinedWeeksCount(supabase),
      getSupervisorTAWorkflow(userProfile.id)
    ]);

    if (distRes.data) districtLogoUrl = distRes.data.avatar_url;
    const schoolsData = schoolsRes.data;
    if (!schoolsData || schoolsData.length === 0) return;

    taHistory = taRes;
    currentDefinedWeeks = weeksRes;
    const schoolIds = schoolsData.map((s) => s.id);

    // Stage 2: Batch fetch school-dependent data
    const [subsRes, loadsRes] = await Promise.all([
      supabase
        .from("submissions")
        .select(
          `
                  id, user_id, file_name, doc_type, compliance_status, created_at, week_number,
                  profiles!inner(school_id)
              `,
        )
        .in("profiles.school_id", schoolIds)
        .order("created_at", { ascending: false }),
      supabase
        .from("teaching_loads")
        .select("id, profiles!inner(school_id)")
        .in("profiles.school_id", schoolIds)
    ]);

    const subsData = subsRes.data;
    const loadsData = loadsRes.data;
    const calendarData = calendarRes.data;

    const calendar = (calendarData || []).filter(
      (c) => c.district_id === userProfile.district_id || !c.district_id,
    );

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

      // School Risk Level (Diagnostic)
      const teacherMap = new Map<string, any[]>();
      schoolSubmissions.forEach(s => {
        if (!teacherMap.has(s.user_id)) teacherMap.set(s.user_id, []);
        teacherMap.get(s.user_id)!.push(s);
      });
      const schoolRisk = calculateDistrictRisk(teacherMap);

      return {
        ...school,
        ...stats,
        loadCount: schoolLoadsCount,
        risk: schoolRisk
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

    // Post-processing finished
  }

  async function handleOfferSupport(school: School) {
    if (!$profile?.id || isSubmittingSupport) return;
    
    isSubmittingSupport = true;
    try {
        // 1. Log to DB
        const { error } = await logTAOutreach($profile.id, { schoolId: school.id });
        if (error) throw error;

        // 2. Refresh Local History
        taHistory = await getSupervisorTAWorkflow($profile.id);
        addToast("success", `Institutional support logged for ${school.name}`);
        
        // Note: For schools, we don't open mailto automatically as it's institutional,
        // but we could if there's a School Head email. For now, we just log the action.
    } catch (e) {
        console.error("Failed to log TA:", e);
        addToast("error", "Failed to record support action");
    } finally {
        isSubmittingSupport = false;
    }
  }

  function getSupportStatus(schoolId: string) {
    const history = taHistory.filter(h => h.school_id === schoolId);
    if (history.length === 0) return null;
    return history[0]; // Most recent
  }

  function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString("en-PH", {
        month: "short",
        day: "numeric",
        year: "numeric"
    });
  }

  // Notes Handlers
  function openNotes(ta: TechnicalAssistance) {
    selectedTA = ta;
    taNotes = ta.notes || "";
    showNotesModal = true;
  }

  async function saveNotes() {
    if (!selectedTA) return;
    
    try {
        const { error } = await supabase
            .from('technical_assistance')
            .update({ 
                notes: taNotes,
                status: 'Completed',
                completed_at: new Date().toISOString()
            })
            .eq('id', selectedTA.id);
        
        if (error) throw error;
        
        taHistory = await getSupervisorTAWorkflow($profile?.id || '');
        showNotesModal = false;
        addToast("success", "Institutional support notes saved");
    } catch (e) {
        console.error("Save error:", e);
        addToast("error", "Failed to save notes");
    }
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

    {#if $profile?.role === 'District Supervisor' && $profile?.district_id}
    <div class="flex items-center gap-4 bg-white p-4 rounded-2xl border border-gray-100 shadow-sm" in:fade>
        <ProfileUploader 
            id={$profile.district_id}
            bucket="avatars"
            path="districts"
            label="District Logo"
            size="md"
            placeholderIcon={Building2}
            bind:url={districtLogoUrl} 
            onUpload={async (newUrl) => {
                await supabase.from('districts').update({ avatar_url: newUrl }).eq('id', $profile?.district_id || '');
                addToast("success", "District logo updated");
            }}
        />
        <div class="hidden sm:block">
            <h4 class="text-sm font-bold text-text-primary uppercase tracking-tight">District Branding</h4>
            <p class="text-[10px] text-text-muted font-medium">Official Governance Logo</p>
        </div>
    </div>
    {/if}
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
    <!-- Tab Navigation -->
    <div class="flex items-center gap-1 bg-surface-muted/50 p-1.5 rounded-2xl border border-border-subtle mb-10 w-fit">
        <button 
            class="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all {activeTab === 'performance' ? 'bg-white text-gov-blue shadow-sm' : 'text-text-muted hover:text-text-primary'}"
            onclick={() => activeTab = 'performance'}
        >
            <LayoutDashboard size={18} />
            Performance View
        </button>
        <button 
            class="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all {activeTab === 'support' ? 'bg-white text-gov-blue shadow-sm' : 'text-text-muted hover:text-text-primary'}"
            onclick={() => activeTab = 'support'}
        >
            <HelpingHand size={18} />
            Institutional Support Hub
            {#if schools.filter(s => (s.risk || 0) > 40 || (s.rate || 0) < 70).length > 0}
                <span class="w-2 h-2 bg-gov-red rounded-full animate-pulse"></span>
            {/if}
        </button>
    </div>

    {#if activeTab === 'performance'}
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
            <button
              type="button"
              class="bg-white border border-border-subtle rounded-xl p-6 shadow-sm hover:shadow-md hover:border-gov-blue/20 transition-all flex flex-col group cursor-pointer text-left w-full"
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
                <div
                  class="w-full py-2 bg-gov-blue/5 text-gov-blue group-hover:bg-gov-blue group-hover:text-white rounded-lg transition-all font-bold text-[10px] uppercase tracking-widest border border-gov-blue/10 flex items-center justify-center"
                >
                  View Performance Details
                </div>
              </div>
            </button>
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
    {:else}
        {@const supportNeededSchools = schools.filter(s => (s.risk || 0) > 40 || (s.rate || 0) < 70)}
        <!-- Tab 2: Institutional Support Hub -->
        <div in:fade={{ duration: 400 }}>
            <!-- Header Summary: Premium District Workstation -->
            <div class="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-10">
                <div class="lg:col-span-3 gov-card-static p-8 border-l-4 border-gov-blue bg-gradient-to-r from-gov-blue/5 to-transparent relative overflow-hidden">
                    <div class="absolute top-0 right-0 p-8 opacity-10 rotate-12">
                        <HelpingHand size={120} />
                    </div>
                    <div class="flex items-start gap-6 relative z-10">
                        <div class="p-4 bg-gov-blue text-white rounded-2xl shadow-xl shadow-gov-blue/20">
                            <HelpingHand size={32} />
                        </div>
                        <div>
                            <h2 class="text-2xl font-bold text-text-primary tracking-tight">Institutional Support Hub</h2>
                            <p class="text-base text-text-secondary mt-2 leading-relaxed max-w-2xl font-medium">
                                District-wide technical assistance workstation. Monitor institutional health across the district 
                                and record strategic TA sessions aimed at improving school compliance maturity.
                            </p>
                        </div>
                    </div>
                </div>
                <div class="gov-card-static p-6 flex flex-col justify-center items-center text-center bg-white border-dashed border-2 border-gov-blue/20">
                    <div class="w-12 h-12 rounded-full bg-gov-blue/10 flex items-center justify-center mb-3 text-gov-blue">
                        <TrendingUp size={20} />
                    </div>
                    <p class="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-1">Total Interventions</p>
                    <p class="text-4xl font-black text-gov-blue tracking-tighter">{taHistory.length}</p>
                    <p class="text-[10px] text-text-secondary mt-2 font-bold uppercase tracking-tight">District Logged Records</p>
                </div>
            </div>

            <!-- Support Recommendations -->
            <div class="mb-12">
                <h3 class="text-sm font-bold text-text-muted uppercase tracking-widest flex items-center gap-2 mb-6">
                    <TrendingUp size={16} />
                    Institutional Support Referrals
                </h3>

                {#if supportNeededSchools.length === 0}
                    <div class="bg-gov-green/5 border border-gov-green/20 rounded-2xl p-10 text-center">
                        <CheckCircle2 size={24} class="text-gov-green mx-auto mb-4" />
                        <p class="text-sm font-bold text-gov-green-dark">Healthy District Trajectory</p>
                    </div>
                {:else}
                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {#each supportNeededSchools as school}
                            {@const lastSupport = getSupportStatus(school.id)}
                            <div class="gov-card p-6 flex flex-col border-l-4 {(school.risk || 0) > 60 ? 'border-l-gov-red' : 'border-l-gov-gold'}">
                                <div class="flex justify-between items-start mb-6">
                                    <div class="max-w-[70%]">
                                        <h4 class="font-bold text-sm text-text-primary truncate">{school.name}</h4>
                                        <p class="text-[10px] text-text-muted mt-1 font-bold uppercase tracking-tight">Institutional Diagnostic</p>
                                    </div>
                                    <div class="flex flex-col items-end gap-1">
                                        <span class="px-2 py-0.5 rounded text-[9px] font-bold {(school.risk || 0) > 60 ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'}">
                                            {(school.risk || 0) > 60 ? 'Critical' : 'Moderate'}
                                        </span>
                                        {#if lastSupport}
                                            <span class="flex items-center gap-1 text-[8px] font-bold text-gov-blue uppercase">
                                                <CheckCircle2 size={8} /> Support Logged
                                            </span>
                                        {/if}
                                    </div>
                                </div>
                                <div class="bg-surface-muted/50 rounded-lg p-3 mb-6">
                                    <p class="text-[10px] text-text-secondary leading-relaxed">
                                        Recommended institutional coaching for archival standards and verification efficiency.
                                    </p>
                                </div>
                                <div class="mt-auto flex items-center gap-2">
                                    <button 
                                        onclick={() => handleOfferSupport(school)}
                                        disabled={isSubmittingSupport}
                                        class="flex-1 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all
                                            {lastSupport ? 'bg-white border border-gov-blue text-gov-blue' : 'bg-gov-blue text-white'}"
                                    >
                                        {lastSupport ? 'Add History' : 'Log Support Offer'}
                                    </button>
                                    <button onclick={() => openDrillDown(school)} class="p-2 border border-border-subtle rounded-lg text-text-muted">
                                        <Activity size={14} />
                                    </button>
                                </div>
                            </div>
                        {/each}
                    </div>
                {/if}
            </div>

            <!-- History -->
            <div in:fly={{ y: 20, duration: 400, delay: 200 }}>
                <h3 class="text-sm font-bold text-text-muted uppercase tracking-widest flex items-center gap-2 mb-6">
                    <History size={16} />
                    District Intervention Logs
                </h3>
                {#if taHistory.length === 0}
                    <div class="gov-card-static p-12 text-center text-text-muted border-dashed">
                        No interventions logged yet.
                    </div>
                {:else}
                    <div class="gov-card-static overflow-hidden">
                        <table class="w-full text-left">
                            <thead class="bg-gray-50/50 text-[10px] font-bold text-text-muted uppercase tracking-widest border-b border-gray-100">
                                <tr>
                                    <th class="px-6 py-4">Institution</th>
                                    <th class="px-6 py-4">Intervention</th>
                                    <th class="px-6 py-4">Date</th>
                                    <th class="px-6 py-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-gray-50 text-[11px]">
                                {#each taHistory as ta}
                                    {@const school = schools.find(s => s.id === ta.school_id)}
                                    <tr class="hover:bg-gray-50/30 transition-colors">
                                        <td class="px-6 py-4 font-bold">{school?.name || 'School'}</td>
                                        <td class="px-6 py-4">{ta.support_type}</td>
                                        <td class="px-6 py-4 text-text-muted">{formatDate(ta.offered_at)}</td>
                                        <td class="px-6 py-4 text-right">
                                            <button 
                                                onclick={() => openNotes(ta)}
                                                class="text-gov-blue font-bold uppercase text-[9px]"
                                            >
                                                {ta.notes ? 'Edit Notes' : 'Add Notes'}
                                            </button>
                                        </td>
                                    </tr>
                                {/each}
                            </tbody>
                        </table>
                    </div>
                {/if}
            </div>
        </div>
    {/if}
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

<!-- TA Notes Modal -->
<DrillDownModal
    isOpen={showNotesModal}
    title="Institutional Support Notes"
    onClose={() => showNotesModal = false}
>
    {#if selectedTA}
        {@const school = schools.find(s => s.id === selectedTA?.school_id)}
        <div class="space-y-6">
            <div class="bg-gov-blue/5 p-4 rounded-xl border border-gov-blue/10">
                <p class="text-[10px] font-bold text-gov-blue uppercase tracking-widest mb-1">Institution</p>
                <p class="text-sm font-bold text-text-primary">{school?.name}</p>
                <p class="text-[10px] text-text-muted mt-1 uppercase">Support Type: {selectedTA.support_type}</p>
            </div>

            <div>
                <label for="ta-notes" class="block text-[10px] font-bold text-text-muted uppercase tracking-widest mb-2">
                    Supervisor Insights & Coaching Notes
                </label>
                <textarea
                    id="ta-notes"
                    bind:value={taNotes}
                    placeholder="Describe the institutional hurdles, training provided, and agreed next steps..."
                    class="w-full h-40 p-4 text-sm bg-surface-muted/30 border border-border-subtle rounded-xl focus:ring-2 focus:ring-gov-blue/20 outline-none transition-all"
                ></textarea>
                <p class="text-[9px] text-text-muted mt-2 italic text-center">
                    Note: Finalizing notes transition the state to 'Completed'.
                </p>
            </div>

            <button
                onclick={saveNotes}
                class="w-full py-3 bg-gov-blue text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-gov-blue-dark shadow-lg shadow-gov-blue/20 transition-all"
            >
                Save & Finalize Intervention
            </button>
        </div>
    {/if}
</DrillDownModal>
