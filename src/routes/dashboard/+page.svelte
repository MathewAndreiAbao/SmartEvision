<script lang="ts">
    import { profile } from "$lib/utils/auth";
    import { supabase } from "$lib/utils/supabase";
    import StatCard from "$lib/components/StatCard.svelte";
    import StatusBadge from "$lib/components/StatusBadge.svelte";
    import { onMount } from "svelte";

    let stats = $state({
        totalUploads: 0,
        compliantRate: 0,
        pendingQueue: 0,
        totalTeachers: 0,
        lateCount: 0,
        nonCompliantCount: 0,
    });
    let recentActivity = $state<
        { file_name: string; status: string; created_at: string }[]
    >([]);
    let loading = $state(true);

    onMount(async () => {
        await loadDashboard();
        loading = false;
    });

    async function loadDashboard() {
        const role = $profile?.role;
        if (!role) return;

        if (role === "Teacher") {
            const { count } = await supabase
                .from("submissions")
                .select("*", { count: "exact", head: true })
                .eq("user_id", $profile!.id);
            stats.totalUploads = count || 0;

            // 1. Get Teacher's Load (Number of subjects/sections)
            const { count: loadCount } = await supabase
                .from("teaching_loads")
                .select("*", { count: "exact", head: true })
                .eq("user_id", $profile!.id)
                .eq("is_active", true); // Only active loads count

            const activeLoads = loadCount || 0;
            const currentWeek = getCurrentWeek();
            const expectedUploads = activeLoads * currentWeek;

            // 2. Get Compliant Submissions
            const { count: compliant } = await supabase
                .from("submissions")
                .select("*", { count: "exact", head: true })
                .eq("user_id", $profile!.id)
                .eq("status", "Compliant");

            // 3. Calculate Rate: (Compliant / (Loads * Weeks)) * 100
            // If no loads defined, we can't calculate a rate (or it's 100% if no uploads needed?)
            // Let's assume 0 loads = 100% compliant (nothing to do) or 0% (if stricter).
            // Going with: if loads > 0, calculate. Else, if uploads > 0, 100%. Else 0.
            if (activeLoads > 0) {
                stats.compliantRate = Math.min(
                    100,
                    Math.round(((compliant || 0) / expectedUploads) * 100),
                );
            } else {
                stats.compliantRate = stats.totalUploads > 0 ? 100 : 0;
            }

            const { data: recent } = await supabase
                .from("submissions")
                .select("file_name, status, created_at")
                .eq("user_id", $profile!.id)
                .order("created_at", { ascending: false })
                .limit(5);
            recentActivity = recent || [];
        } else {
            // Supervisor / School Head stats
            const { count: teachers } = await supabase
                .from("profiles")
                .select("*", { count: "exact", head: true })
                .eq("role", "Teacher");
            stats.totalTeachers = teachers || 0;

            const { count: total } = await supabase
                .from("submissions")
                .select("*", { count: "exact", head: true });
            stats.totalUploads = total || 0;

            const { count: late } = await supabase
                .from("submissions")
                .select("*", { count: "exact", head: true })
                .eq("status", "Late");
            stats.lateCount = late || 0;

            const { data: recent } = await supabase
                .from("submissions")
                .select("file_name, status, created_at")
                .order("created_at", { ascending: false })
                .limit(5);
            recentActivity = recent || [];
        }
    }

    const ACADEMIC_YEAR_START = new Date("2025-08-01"); // Sample start date

    function getCurrentWeek(): number {
        const now = new Date();
        const diff = now.getTime() - ACADEMIC_YEAR_START.getTime();
        const week = Math.ceil(diff / (1000 * 60 * 60 * 24 * 7));
        return Math.max(1, week); // Ensure at least week 1
    }

    function formatDate(dateStr: string): string {
        return new Date(dateStr).toLocaleDateString("en-PH", {
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    }
</script>

<svelte:head>
    <title>Dashboard — Smart E-VISION</title>
</svelte:head>

<div>
    <!-- Header -->
    <div class="mb-8">
        <h1 class="text-2xl font-bold text-text-primary">
            {$profile?.role === "Teacher"
                ? "📊 My Dashboard"
                : "🌐 Supervision Dashboard"}
        </h1>
        <p class="text-base text-text-secondary mt-1">
            Welcome back, <span class="font-semibold"
                >{$profile?.full_name || "User"}</span
            >
        </p>
    </div>

    {#if loading}
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {#each Array(4) as _}
                <div class="glass-card-static p-6 animate-pulse">
                    <div class="h-4 bg-gray-200 rounded w-24 mb-3"></div>
                    <div class="h-8 bg-gray-200 rounded w-16"></div>
                </div>
            {/each}
        </div>
    {:else}
        <!-- Stats Grid -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
            {#if $profile?.role === "Teacher"}
                <StatCard
                    icon="📤"
                    value={stats.totalUploads}
                    label="Total Uploads"
                />
                <StatCard
                    icon="✅"
                    value="{stats.compliantRate}%"
                    label="Compliance Rate"
                    color="from-deped-green to-deped-green-dark"
                />
                <StatCard
                    icon="📡"
                    value={stats.pendingQueue}
                    label="Pending Queue"
                    color="from-deped-gold to-deped-gold-dark"
                />
                <StatCard icon="📄" value="DLL" label="Most Recent Type" />
            {:else}
                <StatCard
                    icon="👩‍🏫"
                    value={stats.totalTeachers}
                    label="Total Teachers"
                />
                <StatCard
                    icon="📤"
                    value={stats.totalUploads}
                    label="Total Submissions"
                    color="from-deped-green to-deped-green-dark"
                />
                <StatCard
                    icon="⏰"
                    value={stats.lateCount}
                    label="Late Submissions"
                    color="from-deped-gold to-deped-gold-dark"
                />
                <StatCard
                    icon="❌"
                    value={stats.nonCompliantCount}
                    label="Non-compliant"
                    color="from-deped-red to-red-700"
                />
            {/if}
        </div>

        <!-- Quick Actions -->
        <div class="mb-10">
            <h2 class="text-xl font-bold text-text-primary mb-4">
                ⚡ Quick Actions
            </h2>
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {#if $profile?.role === "Teacher"}
                    <a
                        href="/dashboard/upload"
                        class="glass-card p-5 flex items-center gap-4 no-underline"
                    >
                        <span class="text-2xl">📤</span>
                        <div>
                            <p class="font-semibold text-text-primary">
                                Upload Document
                            </p>
                            <p class="text-sm text-text-muted">
                                Submit your DLL, ISP, or ISR
                            </p>
                        </div>
                    </a>
                    <a
                        href="/dashboard/archive"
                        class="glass-card p-5 flex items-center gap-4 no-underline"
                    >
                        <span class="text-2xl">🗄️</span>
                        <div>
                            <p class="font-semibold text-text-primary">
                                View Archive
                            </p>
                            <p class="text-sm text-text-muted">
                                Browse your submitted documents
                            </p>
                        </div>
                    </a>
                    <a
                        href="/dashboard/load"
                        class="glass-card p-5 flex items-center gap-4 no-underline"
                    >
                        <span class="text-2xl">📚</span>
                        <div>
                            <p class="font-semibold text-text-primary">
                                Teaching Load
                            </p>
                            <p class="text-sm text-text-muted">
                                Manage subjects & grade levels
                            </p>
                        </div>
                    </a>
                {:else}
                    <a
                        href="/dashboard/monitoring/{$profile?.role ===
                        'District Supervisor'
                            ? 'district'
                            : 'school'}"
                        class="glass-card p-5 flex items-center gap-4 no-underline"
                    >
                        <span class="text-2xl">📊</span>
                        <div>
                            <p class="font-semibold text-text-primary">
                                Compliance Monitor
                            </p>
                            <p class="text-sm text-text-muted">
                                View submission status
                            </p>
                        </div>
                    </a>
                    <a
                        href="/dashboard/archive"
                        class="glass-card p-5 flex items-center gap-4 no-underline"
                    >
                        <span class="text-2xl">🗄️</span>
                        <div>
                            <p class="font-semibold text-text-primary">
                                Document Archive
                            </p>
                            <p class="text-sm text-text-muted">
                                Browse all archived records
                            </p>
                        </div>
                    </a>
                    <a
                        href="/dashboard/analytics"
                        class="glass-card p-5 flex items-center gap-4 no-underline"
                    >
                        <span class="text-2xl">📈</span>
                        <div>
                            <p class="font-semibold text-text-primary">
                                Analytics
                            </p>
                            <p class="text-sm text-text-muted">
                                View charts and trends
                            </p>
                        </div>
                    </a>
                {/if}
            </div>
        </div>

        <!-- Recent Activity -->
        <div>
            <h2 class="text-xl font-bold text-text-primary mb-4">
                🕐 Recent Activity
            </h2>
            <div class="glass-card-static overflow-hidden">
                {#if recentActivity.length === 0}
                    <div class="p-10 text-center">
                        <p class="text-3xl mb-3">📭</p>
                        <p class="text-text-muted font-medium">
                            No recent activity yet
                        </p>
                    </div>
                {:else}
                    <div class="divide-y divide-gray-100">
                        {#each recentActivity as item}
                            <div
                                class="flex items-center justify-between px-6 py-4 hover:bg-white/40 transition-colors"
                            >
                                <div class="flex items-center gap-3 min-w-0">
                                    <span class="text-xl flex-shrink-0">📄</span
                                    >
                                    <span
                                        class="text-sm font-medium text-text-primary truncate"
                                        >{item.file_name}</span
                                    >
                                </div>
                                <div
                                    class="flex items-center gap-4 flex-shrink-0"
                                >
                                    <StatusBadge
                                        status={item.status === "Compliant"
                                            ? "compliant"
                                            : item.status === "Late"
                                              ? "late"
                                              : "pending"}
                                        size="sm"
                                    />
                                    <span class="text-xs text-text-muted"
                                        >{formatDate(item.created_at)}</span
                                    >
                                </div>
                            </div>
                        {/each}
                    </div>
                {/if}
            </div>
        </div>
    {/if}
</div>
