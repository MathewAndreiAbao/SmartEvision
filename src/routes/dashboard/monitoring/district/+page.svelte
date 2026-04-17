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
  interface Teacher {
    id: string;
    full_name: string;
    email?: string;
    role: string;
    school_id: string;
    school_name?: string;
    loadCount?: number;
    rate?: number;
    total?: number;
    Compliant?: number;
    Late?: number;
    NonCompliant?: number;
    risk?: any;
  }

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
  let districtTeachers = $state<Teacher[]>([]);
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
  let activeTab = $state<'performance' | 'institutional' | 'instructional'>('performance');
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
    const [subsRes, loadsRes, teachersRes] = await Promise.all([
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
        .select("id, user_id, profiles!inner(school_id)")
        .in("profiles.school_id", schoolIds),
      supabase
        .from("profiles")
        .select("id, full_name, email, role, school_id")
        .eq("role", "Teacher")
        .in("school_id", schoolIds)
    ]);

    const subsData = subsRes.data;
    const loadsData = loadsRes.data;
    const teachersData = teachersRes.data;
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

    // Process District Teachers for Instructional Hub
    districtTeachers = (teachersData || []).map(t => {
      const teacherSubs = (subsData || []).filter(s => s.user_id === t.id);
      const school = schools.find(s => s.id === t.school_id);
      const tLoadsCount = (loadsData || []).filter(l => l.user_id === t.id).length;

      const stats = calculateCompliance(teacherSubs, tLoadsCount * currentDefinedWeeks);
      const risk = analyzeComplianceRisk(teacherSubs);
      
      return {
        ...t,
        ...stats,
        loadCount: tLoadsCount,
        risk,
        school_name: school?.name
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
    const prevStats = calculateCompliance(prevWeekSubs, totalDistrictLoads);

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

  async function handleOfferSupport(school: School) {
    if (!$profile?.id || isSubmittingSupport) return;
    
    isSubmittingSupport = true;
    try {
        const { error } = await logTAOutreach(supabase, $profile.id, { schoolId: school.id });
        if (error) throw error;

        taHistory = await getSupervisorTAWorkflow($profile.id);
        addToast("success", `Institutional support logged for ${school.name}`);
        isSubmittingSupport = false;
    } catch (e) {
        console.error("Failed to log TA:", e);
        addToast("error", "Failed to record support action");
        isSubmittingSupport = false;
    }
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
    taNotes = ta.session_notes || "";
    showNotesModal = true;
  }

  async function saveNotes() {
    if (!selectedTA) return;
    
    try {
        const { error } = await supabase
            .from('technical_assistance')
            .update({ 
                session_notes: taNotes,
                status: 'Completed',
                completed_at: new Date().toISOString()
            })
            .eq('id', selectedTA.id);
        
        if (error) throw error;
        
        taHistory = await getSupervisorTAWorkflow($profile?.id || '');
        showNotesModal = false;
        addToast("success", "Support notes saved & session finalized");
    } catch (e) {
        console.error("Save error:", e);
        addToast("error", "Failed to save notes");
    }
  }

  function buildHeatmap(calendar: any[]) {
    const activeSchools = schools.filter(s => (s.loadCount || 0) > 0);
    heatmapRows = activeSchools.map(s => s.name);
    
    const weeksToShow = 6;
    const currentWk = getWeekNumber();
    heatmapWeeks = [];
    for (let i = weeksToShow - 1; i >= 0; i--) {
       const w = currentWk - i;
       if (w > 0) heatmapWeeks.push({ week: w, label: `WK${w}` });
    }

    heatmapCells = [];
    activeSchools.forEach((school, rowIdx) => {
      heatmapWeeks.forEach((wk, colIdx) => {
        const weekSubs = allSubmissions.filter(s => 
          s.school_id === school.id && 
          s.week_number === wk.week
        );
        const rate = (weekSubs.length / (school.loadCount || 1)) * 100;
        heatmapCells.push({
          row: rowIdx,
          col: colIdx,
          value: Math.min(rate, 100)
        });
      });
    });
  }

  function sortedSchools() {
    return [...schools]
      .filter((s) =>
        s.name.toLowerCase().includes(searchQuery.toLowerCase()),
      )
      .sort((a, b) => {
        const valA = a[sortField as keyof School] || 0;
        const valB = b[sortField as keyof School] || 0;
        return sortDir === "asc" ? (valA > valB ? 1 : -1) : (valA < valB ? 1 : -1);
      });
  }

  function openDrillDown(school: School) {
    selectedSchool = school;
    selectedSubmissions = allSubmissions.filter(s => s.school_id === school.id);
    showModal = true;
  }
</script>

<div class="p-8 max-w-[1600px] mx-auto min-h-screen bg-surface-muted/30">
  {#if loading}
    <div class="flex items-center justify-center h-64">
      <div class="flex flex-col items-center gap-4">
        <div class="w-12 h-12 border-4 border-gov-blue border-t-transparent rounded-full animate-spin"></div>
        <p class="text-[10px] font-bold text-gov-blue uppercase tracking-widest animate-pulse">Synchronizing District Monitoring...</p>
      </div>
    </div>
  {:else}
    <!-- Header -->
    <header class="flex justify-between items-start mb-10">
      <div class="flex items-center gap-6">
        <ProfileUploader
          targetTable="districts"
          targetId={$profile?.district_id || ""}
          currentUrl={districtLogoUrl}
          onUploadComplete={(url) => (districtLogoUrl = url)}
        />
        <div>
          <h1 class="text-3xl font-black text-text-primary tracking-tight">District Monitoring</h1>
          <p class="text-sm text-text-muted font-bold uppercase tracking-widest mt-1">Supervisory Oversight Dashboard</p>
        </div>
      </div>
    </header>

    <!-- Tab Navigation -->
    <div class="flex items-center gap-1 bg-surface-muted/50 p-1.5 rounded-2xl border border-border-subtle mb-10 w-fit font-bold">
      <button 
        class="flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs transition-all {activeTab === 'performance' ? 'bg-white text-gov-blue shadow-sm border border-border-subtle' : 'text-text-muted hover:text-text-primary'}"
        onclick={() => activeTab = 'performance'}
      >
        <LayoutDashboard size={16} />
        Performance Monitoring
      </button>
      <button 
        class="flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs transition-all {activeTab === 'institutional' ? 'bg-white text-gov-blue shadow-sm border border-border-subtle' : 'text-text-muted hover:text-text-primary'}"
        onclick={() => activeTab = 'institutional'}
      >
        <Building2 size={16} />
        Institutional Hub
      </button>
      <button 
        class="flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs transition-all {activeTab === 'instructional' ? 'bg-white text-gov-blue shadow-sm border border-border-subtle' : 'text-text-muted hover:text-text-primary'}"
        onclick={() => activeTab = 'instructional'}
      >
        <HelpingHand size={16} />
        Instructional Hub
        {#if districtTeachers.filter(t => (t.risk?.score || 0) > 60).length > 0}
            <span class="w-2 h-2 bg-gov-red rounded-full animate-pulse ml-1"></span>
        {/if}
      </button>
    </div>

    {#if activeTab === 'performance'}
      <!-- Performance Tab Content -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        <StatCard title="Schools" value={kpi.totalSchools} icon={Building2} variant="blue" />
        <StatCard title="Overall Rate" value="{kpi.overallRate}%" trend={getTrendDirection(kpi.overallRate, kpi.previousRate)} icon={Activity} variant="indigo" />
        <StatCard title="Late Subs" value={kpi.lateCount} icon={History} variant="amber" />
        <StatCard title="Schools At Risk" value={kpi.atRiskCount} icon={TrendingUp} variant="red" />
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-10 mb-10">
        <div class="gov-card p-6">
          <div class="flex items-center justify-between mb-8">
            <h3 class="text-sm font-bold text-text-primary uppercase tracking-widest flex items-center gap-2">
              <Activity size={18} class="text-gov-blue" /> Institutional Heatmap
            </h3>
          </div>
          <ComplianceHeatmap rows={heatmapRows} weeks={heatmapWeeks} cells={heatmapCells} />
        </div>
        <div class="gov-card p-6">
          <div class="flex items-center justify-between mb-8">
            <h3 class="text-sm font-bold text-text-primary uppercase tracking-widest flex items-center gap-2">
              <TrendingUp size={18} class="text-gov-red" /> District Trends
            </h3>
          </div>
          <ComplianceTrendChart labels={trendLabels} datasets={trendDatasets} />
        </div>
      </div>

      <!-- School List -->
      <div class="gov-card overflow-hidden">
        <div class="p-6 border-b border-border-subtle flex flex-col md:flex-row justify-between items-center gap-4 bg-surface-muted/30">
          <h3 class="text-sm font-bold text-text-primary uppercase tracking-widest">Institutional Directory</h3>
          <div class="relative group">
            <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-text-muted group-focus-within:text-gov-blue transition-colors">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
            </div>
            <input
              type="text"
              bind:value={searchQuery}
              placeholder="Search schools..."
              class="pl-10 pr-4 py-2 text-[11px] font-bold bg-white border border-border-subtle rounded-md outline-none focus:ring-2 focus:ring-gov-blue/20 w-72 transition-all"
            />
          </div>
        </div>

        <div class="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {#each sortedSchools() as school}
            <button
              type="button"
              class="bg-white border border-border-subtle rounded-xl p-6 shadow-sm hover:shadow-md hover:border-gov-blue/20 transition-all flex flex-col group text-left w-full"
              onclick={() => openDrillDown(school)}
            >
              <div class="flex justify-between items-start mb-4">
                <h4 class="font-bold text-base text-text-primary group-hover:text-gov-blue transition-colors leading-tight">{school.name}</h4>
                <span class="px-2.5 py-1 rounded-full text-[10px] font-bold {getComplianceBgClass(school.rate || 0)} {getComplianceClass(school.rate || 0)}">
                  {school.rate}%
                </span>
              </div>
              <div class="grid grid-cols-3 gap-2 mb-6 text-center">
                <div class="bg-gov-green/5 p-2 rounded">
                  <p class="text-[8px] font-bold text-gov-green uppercase mb-1">Pass</p>
                  <p class="text-xs font-bold text-text-primary">{school.Compliant}</p>
                </div>
                <div class="bg-gov-gold/5 p-2 rounded">
                  <p class="text-[8px] font-bold text-gov-gold-dark uppercase mb-1">Late</p>
                  <p class="text-xs font-bold text-text-primary">{school.Late}</p>
                </div>
                <div class="bg-gov-red/5 p-2 rounded">
                  <p class="text-[8px] font-bold text-gov-red uppercase mb-1">Miss</p>
                  <p class="text-xs font-bold text-text-primary">{school.NonCompliant}</p>
                </div>
              </div>
              <div class="mt-auto pt-4 border-t border-gray-50 flex items-center justify-center py-2 bg-gov-blue/5 text-gov-blue group-hover:bg-gov-blue group-hover:text-white rounded-lg transition-all font-bold text-[10px] uppercase tracking-widest border border-gov-blue/10">
                Performance Analytics
              </div>
            </button>
          {/each}
        </div>
      </div>

    {:else if activeTab === 'institutional'}
      <!-- Institutional Support Hub Tab Content -->
      {@const supportNeededSchools = schools.filter(s => (s.risk || 0) > 40 || (s.rate || 0) < 70)}
      <div in:fade>
        <div class="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-10">
          <div class="lg:col-span-3 gov-card-static p-8 border-l-4 border-gov-blue bg-gradient-to-r from-gov-blue/5 to-transparent relative overflow-hidden">
            <div class="absolute top-0 right-0 p-8 opacity-10 rotate-12"><Building2 size={120} /></div>
            <div class="flex items-start gap-6 relative z-10">
              <div class="p-4 bg-gov-blue text-white rounded-2xl shadow-xl shadow-gov-blue/20"><Building2 size={32} /></div>
              <div>
                <h2 class="text-2xl font-bold text-text-primary tracking-tight">Institutional Support Hub</h2>
                <p class="text-sm text-text-secondary mt-2 leading-relaxed max-w-2xl font-medium">
                  District-wide Technical Assistance workstation for School Leadership. Monitor institutional health and record strategic interventions.
                </p>
              </div>
            </div>
          </div>
          <div class="gov-card-static p-6 flex flex-col justify-center items-center text-center bg-white border-dashed border-2 border-gov-blue/20">
            <div class="w-12 h-12 rounded-full bg-gov-blue/10 flex items-center justify-center mb-3 text-gov-blue"><TrendingUp size={20} /></div>
            <p class="text-[10px] font-bold text-text-muted uppercase tracking-widest">School Interventions</p>
            <p class="text-4xl font-black text-gov-blue mt-1">{taHistory.filter(h => h.school_id).length}</p>
          </div>
        </div>

        <div class="grid grid-cols-1 xl:grid-cols-3 gap-8">
          <div class="xl:col-span-2 space-y-6">
            <h3 class="text-sm font-bold text-text-primary uppercase tracking-widest">Priority Institutions</h3>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              {#each supportNeededSchools as school}
                {@const lastSupport = taHistory.filter(h => h.school_id === school.id)[0]}
                <div class="gov-card p-6 flex flex-col border-l-4 {(school.risk || 0) > 60 ? 'border-l-gov-red' : 'border-l-gov-gold'}">
                  <div class="flex justify-between items-start mb-6">
                    <div>
                      <h4 class="font-bold text-sm text-text-primary">{school.name}</h4>
                      <p class="text-[10px] text-text-muted mt-1 uppercase font-bold">Risk Score: {school.risk}%</p>
                    </div>
                    {#if lastSupport}
                      <span class="px-2 py-1 bg-gov-blue/10 text-gov-blue text-[9px] font-bold rounded uppercase">Active Tracking</span>
                    {/if}
                  </div>
                  <button 
                    class="mt-auto w-full py-2.5 bg-gov-blue text-white rounded-lg text-[10px] font-bold uppercase tracking-widest hover:bg-gov-blue-dark transition-all flex items-center justify-center gap-2"
                    onclick={() => handleOfferSupport(school)}
                  >
                    <HelpingHand size={14} /> Log Institutional TA
                  </button>
                </div>
              {/each}
            </div>
          </div>
          <div class="space-y-6">
            <h3 class="text-sm font-bold text-text-primary uppercase tracking-widest">TA Session Registry</h3>
            <div class="gov-card-static max-h-[600px] overflow-y-auto divide-y divide-gray-50 font-bold uppercase">
              {#each taHistory.filter(h => h.school_id) as ta}
                <button class="w-full p-4 text-left hover:bg-gray-50 flex gap-4 items-center group" onclick={() => openNotes(ta)}>
                  <div class="w-10 h-10 rounded-xl bg-gov-blue/10 flex items-center justify-center text-gov-blue group-hover:bg-gov-blue group-hover:text-white transition-all"><History size={18} /></div>
                  <div class="flex-1 min-w-0">
                    <div class="flex justify-between items-start"><p class="text-xs truncate">{schools.find(s=>s.id === ta.school_id)?.name}</p></div>
                    <p class="text-[9px] text-text-muted">{formatDate(ta.created_at)}</p>
                  </div>
                </button>
              {:else}
                <div class="p-10 text-center text-text-muted text-[10px] tracking-widest font-bold">No institutional logs</div>
              {/each}
            </div>
          </div>
        </div>
      </div>

    {:else if activeTab === 'instructional'}
      <!-- Instructional Support Hub Tab Content -->
      {@const priorityTeachers = districtTeachers.filter(t => (t.risk?.score || 0) > 40 || (t.rate || 0) < 60)}
      <div in:fade>
        <div class="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-10">
          <div class="lg:col-span-3 gov-card-static p-8 border-l-4 border-gov-gold bg-gradient-to-r from-gov-gold/5 to-transparent relative overflow-hidden">
            <div class="absolute top-0 right-0 p-8 opacity-10 rotate-12 text-gov-gold"><HelpingHand size={120} /></div>
            <div class="flex items-start gap-6 relative z-10">
              <div class="p-4 bg-gov-gold text-white rounded-2xl shadow-xl shadow-gov-gold/20"><HelpingHand size={32} /></div>
              <div>
                <h2 class="text-2xl font-bold text-text-primary tracking-tight">Instructional Support Hub</h2>
                <p class="text-sm text-text-secondary mt-2 leading-relaxed max-w-2xl font-medium">
                  District-wide Pedagogical Workstation. Monitor individual teacher performance and provide instructional technical assistance.
                </p>
              </div>
            </div>
          </div>
          <div class="gov-card-static p-6 flex flex-col justify-center items-center text-center bg-white border-dashed border-2 border-gov-gold/20">
            <div class="w-12 h-12 rounded-full bg-gov-gold/10 flex items-center justify-center mb-3 text-gov-gold"><Activity size={20} /></div>
            <p class="text-[10px] font-bold text-text-muted uppercase tracking-widest">Pedagogical Logs</p>
            <p class="text-4xl font-black text-gov-gold-dark mt-1">{taHistory.filter(h => h.teacher_id).length}</p>
          </div>
        </div>

        <div class="grid grid-cols-1 xl:grid-cols-3 gap-8">
          <div class="xl:col-span-2 space-y-6">
            <h3 class="text-sm font-bold text-text-primary uppercase tracking-widest">At-Risk Instructors</h3>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              {#each priorityTeachers as teacher}
                <div class="gov-card p-6 flex flex-col border-l-4 {(teacher.risk?.score || 0) > 60 ? 'border-l-gov-red' : 'border-l-gov-gold'}">
                   <div class="flex justify-between items-start mb-6">
                      <div class="min-w-0 pr-4">
                        <h4 class="font-bold text-sm text-text-primary truncate">{teacher.full_name}</h4>
                        <p class="text-[10px] text-gov-blue mt-1 uppercase font-bold truncate">{teacher.school_name}</p>
                      </div>
                      <span class="px-2 py-0.5 rounded text-[9px] font-bold {(teacher.risk?.score || 0) > 60 ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'}">
                        {teacher.risk?.label || 'Moderate'}
                      </span>
                   </div>
                   <div class="grid grid-cols-2 gap-4 mb-6">
                      <div class="p-3 bg-gray-50 rounded-xl text-center">
                        <p class="text-[8px] font-bold text-text-muted uppercase mb-1">Rate</p>
                        <p class="text-lg font-black {getComplianceClass(teacher.rate || 0)}">{teacher.rate}%</p>
                      </div>
                      <div class="p-3 bg-gray-50 rounded-xl text-center">
                        <p class="text-[8px] font-bold text-text-muted uppercase mb-1">Gap</p>
                        <p class="text-lg font-black text-text-primary">{teacher.NonCompliant}</p>
                      </div>
                   </div>
                   <button 
                    class="mt-auto w-full py-2.5 bg-white border-2 border-gov-gold text-gov-gold-dark rounded-lg text-[10px] font-bold uppercase tracking-widest hover:bg-gov-gold hover:text-white transition-all flex items-center justify-center gap-2"
                    onclick={async () => {
                      const note = prompt("Enter TA Notes for " + teacher.full_name);
                      if (note) {
                        await logTAOutreach(supabase, $profile!.id, { teacherId: teacher.id }, note);
                        addToast("success", "Support logged");
                        loadDistrictData();
                      }
                    }}
                  >
                    <HelpingHand size={14} /> Provide TA
                  </button>
                </div>
              {/each}
            </div>
          </div>
          <div class="space-y-6">
             <h3 class="text-sm font-bold text-text-primary uppercase tracking-widest">Instructional TA Logs</h3>
             <div class="gov-card-static max-h-[600px] overflow-y-auto divide-y divide-gray-50 font-bold uppercase">
               {#each taHistory.filter(h => h.teacher_id) as ta}
                <button class="w-full p-4 text-left hover:bg-gray-50 flex gap-4 items-center group" onclick={() => openNotes(ta)}>
                  <div class="w-10 h-10 rounded-xl bg-gov-gold/10 flex items-center justify-center text-gov-gold-dark group-hover:bg-gov-gold group-hover:text-white transition-all"><Activity size={18} /></div>
                  <div class="flex-1 min-w-0"><p class="text-xs truncate">{ta.profiles?.full_name}</p><p class="text-[9px] text-text-muted">{formatDate(ta.created_at)}</p></div>
                </button>
               {:else}
                <div class="p-10 text-center text-text-muted text-[10px] tracking-widest font-bold">No pedagogical logs</div>
               {/each}
             </div>
          </div>
        </div>
      </div>
    {/if}
  {/if}
</div>

<!-- Modals -->
<DrillDownModal isOpen={showModal} title={selectedSchool ? `Institutional Report: ${selectedSchool.name}` : "Details"} onClose={() => (showModal = false)}>
  {#if selectedSchool}
    <div class="space-y-6">
      <div class="grid grid-cols-3 gap-3">
        <div class="bg-gov-blue/5 p-4 rounded-xl text-center"><p class="text-[9px] font-bold uppercase text-text-muted mb-1">Load</p><p class="text-xl font-black text-gov-blue">{selectedSchool.loadCount}</p></div>
        <div class="bg-gov-green/5 p-4 rounded-xl text-center"><p class="text-[9px] font-bold uppercase text-text-muted mb-1">Compliance</p><p class="text-xl font-black text-gov-green">{selectedSchool.rate}%</p></div>
        <div class="bg-gov-red/5 p-4 rounded-xl text-center"><p class="text-[9px] font-bold uppercase text-text-muted mb-1">Missed</p><p class="text-xl font-black text-gov-red">{selectedSchool.NonCompliant}</p></div>
      </div>
      <div class="divide-y divide-gray-100 max-h-[400px] overflow-y-auto pr-2">
        {#each selectedSubmissions as sub}
          <div class="py-4 flex items-center justify-between">
            <div class="min-w-0 pr-4"><p class="text-xs font-bold text-text-primary truncate">{sub.file_name}</p><p class="text-[9px] text-text-muted uppercase font-bold">{sub.doc_type} - WK{sub.week_number}</p></div>
            <StatusBadge status={sub.compliance_status} size="sm" />
          </div>
        {/each}
      </div>
    </div>
  {/if}
</DrillDownModal>

<DrillDownModal isOpen={showNotesModal} title="Technical Assistance Overview" onClose={() => showNotesModal = false}>
  {#if selectedTA}
    <div class="space-y-6">
       <div class="bg-surface-muted/30 p-4 rounded-xl border border-border-subtle">
          <p class="text-[9px] font-bold text-text-muted uppercase tracking-widest mb-1">Session Target</p>
          <p class="text-sm font-bold text-text-primary">{selectedTA.schools?.name || selectedTA.profiles?.full_name}</p>
       </div>
       <div>
         <label class="block text-[9px] font-bold text-text-muted uppercase tracking-widest mb-2">Observations & Coaching Notes</label>
         <textarea bind:value={taNotes} class="w-full h-40 p-4 text-xs bg-white border border-border-subtle rounded-xl focus:ring-2 focus:ring-gov-blue/20 outline-none transition-all"></textarea>
       </div>
       <button onclick={saveNotes} class="w-full py-4 bg-gov-blue text-white rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-gov-blue-dark shadow-lg shadow-gov-blue/20 transition-all">Finalize Record</button>
    </div>
  {/if}
</DrillDownModal>
