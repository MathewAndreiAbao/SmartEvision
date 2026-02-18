<script lang="ts">
    import { supabase } from "$lib/utils/supabase";
    import { profile } from "$lib/utils/auth";
    import StatCard from "$lib/components/StatCard.svelte";
    import StatusBadge from "$lib/components/StatusBadge.svelte";
    import { onMount } from "svelte";

    interface TeacherRow {
        id: string;
        full_name: string;
        compliant: number;
        late: number;
        nonCompliant: number;
        total: number;
    }

    let teachers = $state<TeacherRow[]>([]);
    let stats = $state({ total: 0, compliant: 0, late: 0, nonCompliant: 0 });
    let loading = $state(true);

    onMount(async () => {
        await loadSchoolData();
        loading = false;
    });

    async function loadSchoolData() {
        if (!$profile?.school_id) return;

        // Get teachers in this school
        const { data: teacherProfiles } = await supabase
            .from("profiles")
            .select("id, full_name")
            .eq("school_id", $profile.school_id)
            .eq("role", "Teacher");

        if (!teacherProfiles) return;

        stats.total = teacherProfiles.length;
        const rows: TeacherRow[] = [];

        for (const t of teacherProfiles) {
            const { count: compliant } = await supabase
                .from("submissions")
                .select("*", { count: "exact", head: true })
                .eq("user_id", t.id)
                .eq("status", "Compliant");
            const { count: late } = await supabase
                .from("submissions")
                .select("*", { count: "exact", head: true })
                .eq("user_id", t.id)
                .eq("status", "Late");
            const c = compliant || 0;
            const l = late || 0;
            rows.push({
                id: t.id,
                full_name: t.full_name,
                compliant: c,
                late: l,
                nonCompliant: 0,
                total: c + l,
            });
        }

        teachers = rows;
        stats.compliant = rows.filter(
            (r) => r.late === 0 && r.compliant > 0,
        ).length;
        stats.late = rows.filter((r) => r.late > 0).length;
        stats.nonCompliant = rows.filter((r) => r.total === 0).length;
    }
</script>

<svelte:head>
    <title>School Monitoring — Smart E-VISION</title>
</svelte:head>

<div>
    <div class="mb-8">
        <h1 class="text-2xl font-bold text-text-primary">
            🏫 School Monitoring
        </h1>
        <p class="text-base text-text-secondary mt-1">
            Compliance overview for your school
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
        <!-- Stats -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
            <StatCard icon="👩‍🏫" value={stats.total} label="Total Teachers" />
            <StatCard
                icon="✅"
                value={stats.compliant}
                label="Fully Compliant"
                color="from-deped-green to-deped-green-dark"
            />
            <StatCard
                icon="⏰"
                value={stats.late}
                label="With Late Submissions"
                color="from-deped-gold to-deped-gold-dark"
            />
            <StatCard
                icon="❌"
                value={stats.nonCompliant}
                label="Non-compliant"
                color="from-deped-red to-red-700"
            />
        </div>

        <!-- Teacher Table -->
        <div class="glass-card-static overflow-hidden">
            <div class="px-6 py-4 border-b border-gray-100">
                <h2 class="text-lg font-bold text-text-primary">
                    Teacher Compliance
                </h2>
            </div>
            {#if teachers.length === 0}
                <div class="p-10 text-center text-text-muted">
                    No teachers found in this school
                </div>
            {:else}
                <table class="w-full">
                    <thead>
                        <tr class="border-b border-gray-100">
                            <th
                                class="px-6 py-3 text-left text-xs font-semibold text-text-muted uppercase"
                                >Teacher</th
                            >
                            <th
                                class="px-6 py-3 text-center text-xs font-semibold text-text-muted uppercase"
                                >Compliant</th
                            >
                            <th
                                class="px-6 py-3 text-center text-xs font-semibold text-text-muted uppercase"
                                >Late</th
                            >
                            <th
                                class="px-6 py-3 text-center text-xs font-semibold text-text-muted uppercase"
                                >Total</th
                            >
                            <th
                                class="px-6 py-3 text-center text-xs font-semibold text-text-muted uppercase"
                                >Status</th
                            >
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-gray-50">
                        {#each teachers as teacher}
                            <tr class="hover:bg-white/40 transition-colors">
                                <td
                                    class="px-6 py-4 text-sm font-medium text-text-primary"
                                    >{teacher.full_name}</td
                                >
                                <td
                                    class="px-6 py-4 text-sm text-center text-deped-green font-semibold"
                                    >{teacher.compliant}</td
                                >
                                <td
                                    class="px-6 py-4 text-sm text-center text-deped-gold-dark font-semibold"
                                    >{teacher.late}</td
                                >
                                <td
                                    class="px-6 py-4 text-sm text-center text-text-primary font-semibold"
                                    >{teacher.total}</td
                                >
                                <td class="px-6 py-4 text-center">
                                    <StatusBadge
                                        status={teacher.total === 0
                                            ? "non-compliant"
                                            : teacher.late > 0
                                              ? "late"
                                              : "compliant"}
                                        size="sm"
                                    />
                                </td>
                            </tr>
                        {/each}
                    </tbody>
                </table>
            {/if}
        </div>
    {/if}
</div>
