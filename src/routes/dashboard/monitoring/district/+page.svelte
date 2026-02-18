<script lang="ts">
    import { supabase } from "$lib/utils/supabase";
    import { profile } from "$lib/utils/auth";
    import StatCard from "$lib/components/StatCard.svelte";
    import { onMount } from "svelte";

    interface SchoolRow {
        id: string;
        name: string;
        teacherCount: number;
        submissions: number;
        complianceRate: number;
    }

    let schools = $state<SchoolRow[]>([]);
    let stats = $state({
        totalSchools: 0,
        totalTeachers: 0,
        avgCompliance: 0,
        totalSubmissions: 0,
    });
    let loading = $state(true);

    onMount(async () => {
        await loadDistrictData();
        loading = false;
    });

    async function loadDistrictData() {
        // Get all schools (district-scope via RLS or all for supervisor)
        const { data: schoolData } = await supabase
            .from("schools")
            .select("id, name");
        if (!schoolData) return;

        stats.totalSchools = schoolData.length;
        const rows: SchoolRow[] = [];

        for (const school of schoolData) {
            const { count: teacherCount } = await supabase
                .from("profiles")
                .select("*", { count: "exact", head: true })
                .eq("school_id", school.id)
                .eq("role", "Teacher");
            const { count: submissions } = await supabase
                .from("submissions")
                .select("*", { count: "exact", head: true });
            const tc = teacherCount || 0;
            const sc = submissions || 0;

            rows.push({
                id: school.id,
                name: school.name,
                teacherCount: tc,
                submissions: sc,
                complianceRate: tc > 0 ? Math.round((sc / (tc * 4)) * 100) : 0, // rough estimate
            });
        }

        schools = rows;
        stats.totalTeachers = rows.reduce((a, b) => a + b.teacherCount, 0);
        stats.totalSubmissions = rows.reduce((a, b) => a + b.submissions, 0);
        stats.avgCompliance =
            rows.length > 0
                ? Math.round(
                      rows.reduce((a, b) => a + b.complianceRate, 0) /
                          rows.length,
                  )
                : 0;
    }
</script>

<svelte:head>
    <title>District Monitoring — Smart E-VISION</title>
</svelte:head>

<div>
    <div class="mb-8">
        <h1 class="text-2xl font-bold text-text-primary">
            🌐 District Monitoring
        </h1>
        <p class="text-base text-text-secondary mt-1">
            Bird's eye view — Calapan East District
        </p>
    </div>

    {#if loading}
        <div class="grid grid-cols-1 md:grid-cols-4 gap-6">
            {#each Array(4) as _}
                <div class="glass-card-static p-6 animate-pulse">
                    <div class="h-8 bg-gray-200 rounded w-16"></div>
                </div>
            {/each}
        </div>
    {:else}
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
            <StatCard icon="🏫" value={stats.totalSchools} label="Schools" />
            <StatCard
                icon="👩‍🏫"
                value={stats.totalTeachers}
                label="Teachers"
                color="from-deped-green to-deped-green-dark"
            />
            <StatCard
                icon="📤"
                value={stats.totalSubmissions}
                label="Total Submissions"
                color="from-deped-gold to-deped-gold-dark"
            />
            <StatCard
                icon="📊"
                value="{stats.avgCompliance}%"
                label="Avg Compliance"
            />
        </div>

        <!-- Schools Table -->
        <div class="glass-card-static overflow-hidden">
            <div class="px-6 py-4 border-b border-gray-100">
                <h2 class="text-lg font-bold text-text-primary">
                    Schools Overview
                </h2>
            </div>
            <table class="w-full">
                <thead>
                    <tr class="border-b border-gray-100">
                        <th
                            class="px-6 py-3 text-left text-xs font-semibold text-text-muted uppercase"
                            >School</th
                        >
                        <th
                            class="px-6 py-3 text-center text-xs font-semibold text-text-muted uppercase"
                            >Teachers</th
                        >
                        <th
                            class="px-6 py-3 text-center text-xs font-semibold text-text-muted uppercase"
                            >Submissions</th
                        >
                        <th
                            class="px-6 py-3 text-center text-xs font-semibold text-text-muted uppercase"
                            >Compliance</th
                        >
                    </tr>
                </thead>
                <tbody class="divide-y divide-gray-50">
                    {#each schools as school}
                        <tr class="hover:bg-white/40 transition-colors">
                            <td class="px-6 py-4">
                                <div class="flex items-center gap-3">
                                    <span class="text-lg">🏫</span>
                                    <span
                                        class="text-sm font-medium text-text-primary"
                                        >{school.name}</span
                                    >
                                </div>
                            </td>
                            <td
                                class="px-6 py-4 text-sm text-center text-text-secondary"
                                >{school.teacherCount}</td
                            >
                            <td
                                class="px-6 py-4 text-sm text-center text-text-secondary"
                                >{school.submissions}</td
                            >
                            <td class="px-6 py-4 text-center">
                                <div
                                    class="flex items-center justify-center gap-2"
                                >
                                    <div
                                        class="w-20 h-2 bg-gray-100 rounded-full overflow-hidden"
                                    >
                                        <div
                                            class="h-full rounded-full transition-all {school.complianceRate >=
                                            80
                                                ? 'bg-deped-green'
                                                : school.complianceRate >= 50
                                                  ? 'bg-deped-gold'
                                                  : 'bg-deped-red'}"
                                            style="width: {school.complianceRate}%"
                                        ></div>
                                    </div>
                                    <span
                                        class="text-xs font-semibold text-text-primary w-10"
                                        >{school.complianceRate}%</span
                                    >
                                </div>
                            </td>
                        </tr>
                    {/each}
                </tbody>
            </table>
        </div>
    {/if}
</div>
