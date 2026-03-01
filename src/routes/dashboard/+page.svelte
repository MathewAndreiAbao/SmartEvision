<script lang="ts">
    import { profile } from "$lib/utils/auth";
    import { supabase } from "$lib/utils/supabase";
    import StatCard from "$lib/components/StatCard.svelte";
    import StatusBadge from "$lib/components/StatusBadge.svelte";
    import ComplianceTrendChart from "$lib/components/ComplianceTrendChart.svelte";
    import AlertBanner from "$lib/components/AlertBanner.svelte";
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
    } from "$lib/utils/useDashboardData";
    import {
        detectPatterns,
        type PatternAlert,
    } from "$lib/utils/patternDetection";
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

        // Calculate compliance stats using ACTUAL submission statuses
        // Rate = compliant / total (no estimated expected)
        complianceStats = calculateCompliance(submissions, teachingLoadsCount);

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
        stats.nonCompliantCount = allSubs.filter(
            (s) =>
                s.compliance_status === "non-compliant" ||
                s.compliance_status === "missing",
        ).length;

        recentActivity = allSubs.slice(0, 5);

        // Run pattern detection for supervisor alerts
        alerts = detectPatterns(allSubs, calendarArr, teachers);
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
                else if (
                    cs.toLowerCase() === "missing" ||
                    cs.toLowerCase() === "non-compliant"
                )
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
        const cs = (s.compliance_status || "missing").toLowerCase();
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
    <div class="mb-10">
        <h1 class="text-3xl font-black text-text-primary tracking-tight">
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
                <div class="glass-card-static p-8 animate-pulse">
                    <div class="h-4 bg-gray-200 rounded w-24 mb-4"></div>
                    <div class="h-10 bg-gray-200 rounded w-16"></div>
                </div>
            {/each}
        </div>
    {:else if $profile?.role === "Teacher"}
        <!-- ========== TEACHER DASHBOARD ========== -->

        <!-- Quick Actions -->
        <div class="mb-10" in:fade={{ duration: 600, delay: 0 }}>
            <div class="flex items-center gap-3 mb-6">
                <div class="p-2 rounded-xl bg-gov-blue/10 text-gov-blue">
                    <Zap size={20} fill="currentColor" />
                </div>
                <h2 class="text-xl font-black text-text-primary tracking-tight">
                    Quick Actions
                </h2>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <a
                    href="/dashboard/upload"
                    class="gov-card p-6 flex flex-col gap-4 no-underline group"
                >
                    <div
                        class="w-12 h-12 rounded-xl bg-gov-blue/5 text-gov-blue flex items-center justify-center group-hover:bg-gov-blue group-hover:text-white transition-all duration-300"
                    >
                        <CloudUpload size={24} />
                    </div>
                    <div>
                        <p
                            class="font-bold text-text-primary group-hover:text-gov-blue transition-colors"
                        >
                            Upload Document
                        </p>
                        <p class="text-xs text-text-muted mt-1 leading-relaxed">
                            Submit DLL, ISP, or ISR reports to the central
                            archive.
                        </p>
                    </div>
                </a>
                <a
                    href="/dashboard/archive"
                    class="gov-card p-6 flex flex-col gap-4 no-underline group"
                >
                    <div
                        class="w-12 h-12 rounded-xl bg-gov-blue/5 text-gov-blue flex items-center justify-center group-hover:bg-gov-blue group-hover:text-white transition-all duration-300"
                    >
                        <Archive size={24} />
                    </div>
                    <div>
                        <p
                            class="font-bold text-text-primary group-hover:text-gov-blue transition-colors"
                        >
                            Access Archive
                        </p>
                        <p class="text-xs text-text-muted mt-1 leading-relaxed">
                            Browse and retrieve your previously submitted
                            documents.
                        </p>
                    </div>
                </a>
                <a
                    href="/dashboard/load"
                    class="gov-card p-6 flex flex-col gap-4 no-underline group"
                >
                    <div
                        class="w-12 h-12 rounded-xl bg-gov-blue/5 text-gov-blue flex items-center justify-center group-hover:bg-gov-blue group-hover:text-white transition-all duration-300"
                    >
                        <Briefcase size={24} />
                    </div>
                    <div>
                        <p
                            class="font-bold text-text-primary group-hover:text-gov-blue transition-colors"
                        >
                            Teaching Load
                        </p>
                        <p class="text-xs text-text-muted mt-1 leading-relaxed">
                            Manage subjects, grade levels, and assigned
                            schedules.
                        </p>
                    </div>
                </a>
                <button
                    onclick={() => showQRScanner.set(true)}
                    class="gov-card p-6 flex flex-col gap-4 no-underline group text-left w-full cursor-pointer"
                >
                    <div
                        class="w-12 h-12 rounded-xl bg-gov-blue/5 text-gov-blue flex items-center justify-center group-hover:bg-gov-blue group-hover:text-white transition-all duration-300"
                    >
                        <QrCode size={24} />
                    </div>
                    <div>
                        <p
                            class="font-bold text-text-primary group-hover:text-gov-blue transition-colors"
                        >
                            Scan Document
                        </p>
                        <p class="text-xs text-text-muted mt-1 leading-relaxed">
                            Verify document authenticity using the built-in QR
                            scanner.
                        </p>
                    </div>
                </button>
            </div>
        </div>

        <!-- Stats Row -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
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
        </div>

        <!-- Weekly Compliance Widget + Trend Chart -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-10">
            <!-- Weekly Badges -->
            <div
                class="gov-card-static p-8"
                in:fly={{ y: 20, duration: 500, delay: 400 }}
            >
                <h3
                    class="text-sm font-black text-text-primary uppercase tracking-widest mb-6 flex items-center gap-2"
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
                                class="text-[10px] text-text-muted font-black uppercase tracking-tighter mb-1"
                            >
                                {w.label}
                            </p>
                            <p
                                class="text-xl font-black {getComplianceClass(
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
                            class="inline-flex items-center px-4 py-2 rounded bg-gov-blue/10 text-gov-blue text-xs font-black uppercase tracking-widest hover:bg-gov-blue/20 transition-colors"
                        >
                            UPLOAD
                        </a>
                    </div>
                {/if}
            </div>

            <!-- Trend Chart -->
            <div
                class="gov-card-static p-8"
                in:fly={{ y: 20, duration: 500, delay: 500 }}
            >
                <h3
                    class="text-sm font-black text-text-primary uppercase tracking-widest mb-6 flex items-center gap-2"
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
            class="gov-card-static overflow-hidden mb-10"
            in:fade={{ duration: 500, delay: 600 }}
        >
            <div
                class="px-8 py-5 border-b border-border-subtle bg-surface-muted/30 flex items-center justify-between flex-wrap gap-4"
            >
                <h3
                    class="text-sm font-black text-text-primary uppercase tracking-widest"
                >
                    Data Archive
                </h3>
                <select
                    bind:value={filterStatus}
                    class="px-4 py-2 text-xs font-bold uppercase tracking-wider bg-white border border-border-strong rounded shadow-sm focus:ring-2 focus:ring-gov-blue/20 outline-none transition-all"
                >
                    <option value="all">Display All Records</option>
                    <option value="Compliant">Filter: Compliant</option>
                    <option value="Late">Filter: Late</option>
                    <option value="Non-Compliant">Filter: Non-compliant</option>
                </select>
            </div>
            {#if displaySubmissions().length === 0}
                <div class="p-12 text-center">
                    <p
                        class="text-text-muted font-bold uppercase tracking-widest text-xs mb-4"
                    >
                        Archive Empty
                    </p>
                    <a
                        href="/dashboard/upload"
                        class="inline-flex items-center px-6 py-3 rounded bg-gov-blue text-white text-xs font-black uppercase tracking-widest hover:bg-gov-blue-dark transition-all shadow-md"
                    >
                        SUBMIT FIRST RECORD
                    </a>
                </div>
            {:else}
                <!-- Desktop/Tablet Table -->
                <div class="hidden sm:block overflow-x-auto">
                    <table class="w-full text-sm">
                        <thead>
                            <tr class="border-b border-gray-100 bg-white/30">
                                <th
                                    class="px-6 py-4 text-left text-xs font-bold text-text-muted uppercase tracking-wider sticky left-0 bg-white/30 backdrop-blur-md z-10"
                                >
                                    <button
                                        class="hover:text-text-primary flex items-center gap-1"
                                        onclick={() => toggleSort("file_name")}
                                    >
                                        Document {sortField === "file_name"
                                            ? sortDir === "asc"
                                                ? "↑"
                                                : "↓"
                                            : ""}
                                    </button>
                                </th>
                                <th
                                    class="px-4 py-4 text-left text-xs font-bold text-text-muted uppercase tracking-wider"
                                    >Type</th
                                >
                                <th
                                    class="px-4 py-4 text-center text-xs font-bold text-text-muted uppercase tracking-wider"
                                    >Load</th
                                >
                                <th
                                    class="px-4 py-4 text-center text-xs font-bold text-text-muted uppercase tracking-wider"
                                >
                                    <button
                                        class="hover:text-text-primary flex items-center gap-1 mx-auto"
                                        onclick={() =>
                                            toggleSort("compliance_status")}
                                    >
                                        Status {sortField ===
                                        "compliance_status"
                                            ? sortDir === "asc"
                                                ? "↑"
                                                : "↓"
                                            : ""}
                                    </button>
                                </th>
                                <th
                                    class="px-6 py-4 text-right text-xs font-bold text-text-muted uppercase tracking-wider"
                                >
                                    <button
                                        class="hover:text-text-primary flex items-center gap-1 ml-auto"
                                        onclick={() => toggleSort("created_at")}
                                    >
                                        Date {sortField === "created_at"
                                            ? sortDir === "asc"
                                                ? "↑"
                                                : "↓"
                                            : ""}
                                    </button>
                                </th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-gray-50/50">
                            {#each displaySubmissions() as sub}
                                {@const tl = Array.isArray(sub.teaching_loads)
                                    ? sub.teaching_loads[0]
                                    : sub.teaching_loads}
                                <tr
                                    class="hover:bg-surface-muted/50 transition-colors"
                                >
                                    <td
                                        class="px-6 py-5 font-bold text-text-primary truncate max-w-[240px] sticky left-0 bg-white/5 z-0 leading-relaxed"
                                        title={sub.file_name}
                                    >
                                        {sub.file_name}
                                    </td>
                                    <td
                                        class="px-4 py-5 text-text-secondary font-medium"
                                        >{sub.doc_type}</td
                                    >
                                    <td
                                        class="px-4 py-5 text-center text-text-secondary text-xs font-semibold"
                                    >
                                        {tl
                                            ? `${tl.subject} - Gr. ${tl.grade_level}`
                                            : "—"}
                                    </td>
                                    <td class="px-4 py-5 text-center">
                                        <StatusBadge
                                            status={getStatusBadgeType(sub)}
                                            size="sm"
                                        />
                                    </td>
                                    <td
                                        class="px-6 py-5 text-right text-text-muted text-[11px] font-bold uppercase tracking-tighter"
                                        >{formatDate(sub.created_at)}</td
                                    >
                                </tr>
                            {/each}
                        </tbody>
                    </table>
                </div>

                <!-- Mobile Card-based List -->
                <div class="sm:hidden divide-y divide-gray-100">
                    {#each displaySubmissions() as sub}
                        {@const tl = Array.isArray(sub.teaching_loads)
                            ? sub.teaching_loads[0]
                            : sub.teaching_loads}
                        <div
                            class="p-4 space-y-3 active:bg-gray-50 transition-colors"
                        >
                            <div class="flex justify-between items-start gap-3">
                                <p
                                    class="font-bold text-text-primary line-clamp-2 leading-tight flex-1"
                                >
                                    {sub.file_name}
                                </p>
                                <StatusBadge
                                    status={getStatusBadgeType(sub)}
                                    size="sm"
                                />
                            </div>
                            <div
                                class="flex items-center justify-between text-[11px] text-text-muted"
                            >
                                <div class="flex items-center gap-2">
                                    <span
                                        class="px-1.5 py-0.5 bg-gray-100 rounded text-text-secondary font-bold"
                                        >{sub.doc_type}</span
                                    >
                                    <span
                                        >{tl
                                            ? `${tl.subject} • G${tl.grade_level}`
                                            : "No Teaching Load"}</span
                                    >
                                </div>
                                <span class="font-medium"
                                    >{formatDate(sub.created_at)}</span
                                >
                            </div>
                        </div>
                    {/each}
                </div>
            {/if}
        </div>
    {:else}
        <!-- ========== SUPERVISOR DASHBOARD ========== -->

        <!-- Stats Grid -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6 mb-12">
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
            <div in:fly={{ y: 20, duration: 400, delay: 300 }}>
                <StatCard
                    icon="ShieldX"
                    value={stats.nonCompliantCount}
                    label="NON-COMPLIANT"
                    color="gov-red"
                />
            </div>
        </div>

        <!-- Export & Reports -->
        <div class="mb-10" in:fade={{ duration: 600, delay: 350 }}>
            <h2
                class="text-sm font-black text-text-muted uppercase tracking-[0.2em] mb-6"
            >
                Official Reports & Export
            </h2>
            <div
                class="gov-card p-8 flex flex-wrap items-center gap-6 bg-surface-muted/30"
            >
                <button
                    onclick={() =>
                        exportToCSV(
                            recentActivity,
                            `Data_${new Date().toISOString().split("T")[0]}`,
                        )}
                    class="py-3 px-8 bg-white border border-border-strong rounded-md text-xs font-black uppercase tracking-widest text-text-primary hover:border-gov-blue hover:text-gov-blue transition-all flex items-center gap-2 shadow-sm cursor-pointer"
                >
                    CSV
                </button>
                <button
                    onclick={() =>
                        generateCompliancePDF(
                            stats,
                            `${$profile?.role} Summary`,
                        )}
                    class="py-3 px-8 bg-gov-blue border border-gov-blue rounded-md text-xs font-black uppercase tracking-widest text-white hover:bg-gov-blue-dark transition-all flex items-center gap-2 shadow-md cursor-pointer"
                >
                    PDF
                </button>
            </div>
        </div>

        <!-- Recent Activity -->
        <div in:fade={{ duration: 600, delay: 600 }}>
            <h2 class="text-xl font-bold text-text-primary mb-4">
                Recent Activity
            </h2>
            <div class="glass-card-static overflow-hidden">
                {#if recentActivity.length === 0}
                    <div class="p-10 text-center">
                        <p class="text-text-muted font-medium">
                            No recent activity yet
                        </p>
                    </div>
                {:else}
                    <div class="divide-y divide-gray-100">
                        {#each recentActivity as item, i}
                            <div
                                class="flex items-center justify-between px-6 py-4 hover:bg-white/40 transition-colors"
                                in:fly={{
                                    x: -20,
                                    duration: 400,
                                    delay: 700 + i * 50,
                                }}
                            >
                                <div class="flex items-center gap-3 min-w-0">
                                    <span
                                        class="text-sm font-medium text-text-primary truncate"
                                        >{item.file_name}</span
                                    >
                                </div>
                                <div
                                    class="flex items-center gap-4 flex-shrink-0"
                                >
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
