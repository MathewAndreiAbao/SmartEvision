<script lang="ts">
  import { profile } from "$lib/utils/auth";
  import { supabase } from "$lib/utils/supabase";
  import StatCard from "$lib/components/StatCard.svelte";
  import StatusBadge from "$lib/components/StatusBadge.svelte";
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
  } from "$lib/utils/useDashboardData";

  // Data
  let schools = $state<any[]>([]);
  let allTeachers = $state<any[]>([]);
  let allSubmissions = $state<any[]>([]);
  let loading = $state(true);
  let channel: any;

  // KPI
  let kpi = $state({
    schoolCount: 0,
    overallRate: 0,
    strugglingTeachers: 0,
    totalTeachers: 0,
  });

  // School rankings (sorted by compliance)
  const sortedSchools = $derived(() => {
    return schools
      .map((s) => {
        const schoolTeachers = allTeachers.filter((t) => t.school_id === s.id);
        const schoolTeacherIds = new Set(schoolTeachers.map((t) => t.id));
        const schoolLoadsCount = schoolTeachers.reduce(
          (sum, t) => sum + (t.loadCount || 0),
          0,
        );

        const subs = allSubmissions.filter((sub) =>
          schoolTeacherIds.has(sub.user_id),
        );
        const stats = calculateCompliance(subs, schoolLoadsCount);
        return { ...s, ...stats, teacherCount: schoolTeacherIds.size };
      })
      .sort((a, b) => a.rate - b.rate); // lowest first
  });

  // Struggling teachers (<70% compliance)
  const strugglingTeachers = $derived(() => {
    return allTeachers
      .map((t) => {
        const subs = allSubmissions.filter((s) => s.user_id === t.id);
        const stats = calculateCompliance(subs, t.loadCount);
        const school = schools.find((s) => s.id === t.school_id);
        return {
          ...t,
          ...stats,
          schoolName: school?.name || "Unknown",
        };
      })
      .filter((t) => t.expected > 0 && t.rate < 70)
      .sort((a, b) => a.rate - b.rate);
  });

  // Trend chart
  let trendLabels = $state<string[]>([]);
  let trendDatasets = $state<any[]>([]);

  // Drill-down modal
  let showModal = $state(false);
  let modalTitle = $state("");
  let modalTeachers = $state<any[]>([]);

  onMount(async () => {
    await loadData();
    loading = false;
    setupRealtime();
  });

  onDestroy(() => {
    if (channel) supabase.removeChannel(channel);
  });

  function setupRealtime() {
    channel = supabase
      .channel("master-teacher-dashboard")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "submissions" },
        () => {
          loadData();
        },
      )
      .subscribe();
  }

  async function loadData() {
    const userProfile = $profile;
    if (!userProfile) return;

    // Master Teacher sees schools they supervise
    // Batch fetch everything
    const [schoolsRes, teachersRes, subsRes, loadsRes] = await Promise.all([
      supabase.from("schools").select("id, name").order("name"),
      supabase
        .from("profiles")
        .select("id, full_name, role, school_id")
        .eq("role", "Teacher")
        .order("full_name"),
      supabase
        .from("submissions")
        .select(
          "id, user_id, status, compliance_status, created_at, week_number",
        )
        .order("created_at", { ascending: false }),
      supabase
        .from("teaching_loads")
        .select("id, user_id, profiles!inner(school_id)"),
    ]);

    schools = schoolsRes.data || [];
    allTeachers = teachersRes.data || [];
    allSubmissions = subsRes.data || [];
    const allLoads = loadsRes.data || [];

    // Attach teaching loads to each teacher
    allTeachers = allTeachers.map((t) => ({
      ...t,
      loadCount: allLoads.filter((l) => l.user_id === t.id).length,
    }));

    // KPIs
    const totalLoads = allTeachers.reduce(
      (sum, t) => sum + (t.loadCount || 0),
      0,
    );
    const overallStats = calculateCompliance(allSubmissions, totalLoads);
    kpi.schoolCount = schools.length;
    kpi.overallRate = overallStats.rate;
    kpi.totalTeachers = allTeachers.length;
    kpi.strugglingTeachers = allTeachers.filter((t) => {
      const subs = allSubmissions.filter((s) => s.user_id === t.id);
      const stats = calculateCompliance(subs, t.loadCount);
      return stats.rate < 70 && subs.length > 0;
    }).length;

    // Build trend with school overlays
    const weeklyAll = groupSubmissionsByWeek(allSubmissions, 8);
    trendLabels = weeklyAll.map((w) => w.label);
    const datasets: any[] = [
      {
        label: "All Schools",
        data: weeklyAll.map((w) => w.rate),
        color: "#0038A8",
      },
      {
        label: "80% Target",
        data: weeklyAll.map(() => 80),
        color: "#CE1126",
        dashed: true,
      },
    ];

    // Add top 3 schools as overlay lines (light colors)
    const topSchools = [...(sortedSchools() || [])]
      .sort((a, b) => b.rate - a.rate)
      .slice(0, 3);
    const schoolColors = ["#008751", "#FCD116", "#9966CC"];
    topSchools.forEach((school, i) => {
      const teacherIds = new Set(
        allTeachers.filter((t) => t.school_id === school.id).map((t) => t.id),
      );
      const schoolSubs = allSubmissions.filter((s) =>
        teacherIds.has(s.user_id),
      );
      const weeklySchool = groupSubmissionsByWeek(schoolSubs, 8);
      datasets.push({
        label: school.name?.replace(" Elementary School", " ES") || "School",
        data: weeklySchool.map((w) => w.rate),
        color: schoolColors[i],
      });
    });

    trendDatasets = datasets;
  }

  function openSchoolDrillDown(school: any) {
    const schoolTeachers = allTeachers.filter((t) => t.school_id === school.id);
    modalTitle = `${school.name} — Teachers`;
    modalTeachers = schoolTeachers
      .map((t) => {
        const subs = allSubmissions.filter((s) => s.user_id === t.id);
        const stats = calculateCompliance(subs, t.loadCount);
        return { ...t, ...stats };
      })
      .sort((a, b) => a.rate - b.rate);
    showModal = true;
  }

  function getRiskLevel(rate: number): { label: string; class: string } {
    if (rate < 30)
      return { label: "HIGH", class: "bg-gov-red/15 text-gov-red" };
    if (rate < 50)
      return {
        label: "MEDIUM",
        class: "bg-gov-gold/15 text-gov-gold-dark",
      };
    return { label: "LOW", class: "bg-gov-green/15 text-gov-green" };
  }
</script>

<svelte:head>
  <title>Coaching Hub — Smart E-VISION</title>
</svelte:head>

<div>
  <!-- Header -->
  <div class="mb-10">
    <h1 class="text-3xl font-black text-text-primary tracking-tight">
      Coaching Hub
    </h1>
    <p class="text-base text-text-secondary mt-1">
      Monitor performance, identify gaps, and drive institutional improvement
    </p>
  </div>

  {#if loading}
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {#each Array(4) as _}
        <div class="glass-card-static p-8 animate-pulse">
          <div class="h-4 bg-gray-200 rounded w-24 mb-4"></div>
          <div class="h-10 bg-gray-200 rounded w-16"></div>
        </div>
      {/each}
    </div>
  {:else}
    <!-- KPI Cards -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
      <div in:fly={{ y: 20, duration: 400 }}>
        <StatCard
          icon="School"
          value={kpi.schoolCount}
          label="Schools supervised"
        />
      </div>
      <div in:fly={{ y: 20, duration: 400, delay: 100 }}>
        <StatCard
          icon="Users"
          value={kpi.totalTeachers}
          label="Total Teachers"
          color="from-gov-blue to-gov-blue-dark"
        />
      </div>
      <div in:fly={{ y: 20, duration: 400, delay: 200 }}>
        <StatCard
          icon="Activity"
          value="{kpi.overallRate}%"
          label="Aggregate Rate"
          color="from-gov-green to-gov-green-dark"
        />
      </div>
      <div in:fly={{ y: 20, duration: 400, delay: 300 }}>
        <StatCard
          icon="HeartHandshake"
          value={kpi.strugglingTeachers}
          label="Coaching Leads"
          color="from-gov-red to-red-700"
        />
      </div>
    </div>

    <!-- School Ranking + Trend Chart -->
    <div class="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-8">
      <!-- School Ranking -->
      <div
        class="glass-card-static overflow-hidden"
        in:fly={{ y: 20, duration: 500, delay: 400 }}
      >
        <div class="px-6 py-4 border-b border-gray-100">
          <h3 class="text-lg font-bold text-text-primary">School Ranking</h3>
          <p class="text-xs text-text-muted mt-0.5">
            Sorted by compliance rate (lowest first)
          </p>
        </div>
        {#if sortedSchools().length === 0}
          <div class="p-10 text-center text-text-muted">No schools found</div>
        {:else}
          <div class="divide-y divide-gray-50 max-h-[400px] overflow-y-auto">
            {#each sortedSchools() as school, i}
              <button
                class="w-full flex items-center justify-between px-6 py-3 hover:bg-white/40 transition-colors text-left"
                onclick={() => openSchoolDrillDown(school)}
              >
                <div class="flex items-center gap-3 min-w-0">
                  <span
                    class="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold {i <
                    3
                      ? 'bg-gov-red/15 text-gov-red'
                      : i >= sortedSchools().length - 3
                        ? 'bg-gov-green/15 text-gov-green'
                        : 'bg-gray-100 text-text-muted'}"
                  >
                    {i + 1}
                  </span>
                  <div class="min-w-0">
                    <p class="text-sm font-medium text-text-primary truncate">
                      {school.name}
                    </p>
                    <p class="text-xs text-text-muted">
                      {school.teacherCount} teachers · {school.total}
                      submissions
                    </p>
                  </div>
                </div>
                <span
                  class="inline-block px-2.5 py-1 rounded-full text-xs font-bold flex-shrink-0 {getComplianceBgClass(
                    school.rate,
                  )} {getComplianceClass(school.rate)}"
                >
                  {school.rate}%
                </span>
              </button>
            {/each}
          </div>
        {/if}
      </div>

      <!-- Trend Chart -->
      <div
        class="glass-card-static p-6"
        in:fly={{ y: 20, duration: 500, delay: 500 }}
      >
        <h3 class="text-lg font-bold text-text-primary mb-4">
          Multi-School Trend
        </h3>
        {#if trendLabels.length > 0}
          <ComplianceTrendChart
            labels={trendLabels}
            datasets={trendDatasets}
            height={320}
          />
        {:else}
          <div
            class="flex items-center justify-center h-[320px] text-text-muted"
          >
            <p>No trend data available</p>
          </div>
        {/if}
      </div>
    </div>

    <!-- Coaching Insights: Struggling Teachers -->
    <div
      class="glass-card-static overflow-hidden"
      in:fade={{ duration: 500, delay: 600 }}
    >
      <div class="px-6 py-4 border-b border-gray-100">
        <h3 class="text-lg font-bold text-text-primary">Coaching Insights</h3>
        <p class="text-xs text-text-muted mt-0.5">
          Teachers with &lt;70% compliance needing support
        </p>
      </div>

      {#if strugglingTeachers().length === 0}
        <div class="p-10 text-center">
          <p class="text-text-muted font-medium">
            All teachers are at 70%+ compliance!
          </p>
        </div>
      {:else}
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b border-gray-100">
                <th
                  class="px-6 py-3 text-left text-xs font-semibold text-text-muted uppercase"
                  >Teacher</th
                >
                <th
                  class="px-4 py-3 text-left text-xs font-semibold text-text-muted uppercase"
                  >School</th
                >
                <th
                  class="px-4 py-3 text-center text-xs font-semibold text-text-muted uppercase"
                  >Compliant</th
                >
                <th
                  class="px-4 py-3 text-center text-xs font-semibold text-text-muted uppercase"
                  >Late</th
                >
                <th
                  class="px-4 py-3 text-center text-xs font-semibold text-text-muted uppercase"
                  >Non-compliant</th
                >
                <th
                  class="px-4 py-3 text-center text-xs font-semibold text-text-muted uppercase"
                  >Risk</th
                >
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-50">
              {#each strugglingTeachers() as teacher}
                {@const risk = getRiskLevel(teacher.rate)}
                <tr class="hover:bg-white/40 transition-colors">
                  <td class="px-6 py-3 font-medium text-text-primary"
                    >{teacher.full_name}</td
                  >
                  <td class="px-4 py-3 text-text-secondary text-xs"
                    >{teacher.schoolName}</td
                  >
                  <td class="px-4 py-3 text-center">
                    <span
                      class="inline-block px-2.5 py-1 rounded-full text-xs font-bold {getComplianceBgClass(
                        teacher.rate,
                      )} {getComplianceClass(teacher.rate)}"
                    >
                      {teacher.rate}%
                    </span>
                  </td>
                  <td class="px-4 py-3 text-center text-gov-green font-semibold"
                    >{teacher.Compliant}</td
                  >
                  <td
                    class="px-4 py-3 text-center text-gov-gold-dark font-semibold"
                    >{teacher.Late}</td
                  >
                  <td class="px-4 py-3 text-center text-gov-red font-semibold"
                    >{teacher.NonCompliant}</td
                  >
                  <td class="px-4 py-3 text-center">
                    <span
                      class="inline-block px-2 py-1 rounded-full text-xs font-bold {risk.class}"
                    >
                      {risk.label}
                    </span>
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      {/if}
    </div>
  {/if}
</div>

<!-- School Drill-Down Modal -->
<DrillDownModal
  isOpen={showModal}
  title={modalTitle}
  onClose={() => {
    showModal = false;
  }}
>
  {#if modalTeachers.length === 0}
    <p class="text-center text-text-muted py-6">No teachers found</p>
  {:else}
    <div class="overflow-x-auto">
      <table class="w-full text-sm">
        <thead>
          <tr class="border-b border-gray-100">
            <th
              class="px-4 py-2 text-left text-xs font-semibold text-text-muted"
              >Teacher</th
            >
            <th
              class="px-3 py-2 text-center text-xs font-semibold text-text-muted"
              >Compliant</th
            >
            <th
              class="px-3 py-2 text-center text-xs font-semibold text-text-muted"
              >Late</th
            >
            <th
              class="px-3 py-2 text-center text-xs font-semibold text-text-muted"
              >Non-compliant</th
            >
            <th
              class="px-3 py-2 text-center text-xs font-semibold text-text-muted"
              >Rate</th
            >
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-50">
          {#each modalTeachers as t}
            <tr class="hover:bg-white/30 transition-colors">
              <td class="px-4 py-2 font-medium text-text-primary"
                >{t.full_name}</td
              >
              <td class="px-3 py-2 text-center text-gov-green font-semibold"
                >{t.Compliant}</td
              >
              <td class="px-3 py-2 text-center text-gov-gold-dark font-semibold"
                >{t.Late}</td
              >
              <td class="px-3 py-2 text-center text-gov-red font-semibold"
                >{t.NonCompliant}</td
              >
              <td class="px-3 py-2 text-center">
                <span
                  class="inline-block px-2 py-0.5 rounded-full text-xs font-bold {getComplianceBgClass(
                    t.rate,
                  )} {getComplianceClass(t.rate)}"
                >
                  {t.rate}%
                </span>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}
</DrillDownModal>
