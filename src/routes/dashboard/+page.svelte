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
    import TeacherChecklist from "$lib/components/TeacherChecklist.svelte";
    import {
        calculateCompliance,
        groupSubmissionsByWeek,
        getComplianceClass,
        getComplianceBgClass,
        getDefinedWeeksCount,
        getDynamicSchoolYear,
    } from "$lib/utils/useDashboardData";
    import {
        QrCode,
        CloudUpload,
        Archive,
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
    let activeTeachingLoads = $state<any[]>([]);
    let academicCalendar = $state<any[]>([]);
    let recentActivity = $state<any[]>([]);
    let stats = $state({
        totalUploads: 0,
        compliantRate: 0,
        totalTeachers: 0,
        compliantCount: 0,
        lateCount: 0,
        nonCompliantCount: 0,
    });
    let alerts = $state<any[]>([]);
    let loading = $state(true);
    let channel: any;

    let sortField = $state<string>("created_at");
    let sortDir = $state<"asc" | "desc">("desc");
    let filterStatus = $state("all");

    onMount(async () => {
        try {
            await loadDashboard();
            setupRealtime();
        } catch (err) {
            console.error("[dashboard] Failed to load dashboard:", err);
        }
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
                    loadDashboard().catch((err) => console.error("[dashboard] Realtime refresh failed:", err));
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
        // Fix existing submissions that were incorrectly marked 'non-compliant'
        // by the old day-of-week fallback. Only fixes real uploads, not NC placeholders.
        await supabase
            .from("submissions")
            .update({ compliance_status: "compliant" })
            .eq("user_id", userProfile.id)
            .eq("compliance_status", "non-compliant")
            .not("file_hash", "like", "nc_%");

        // Batch: fetch all submissions + teaching loads count + academic calendar in parallel
        const results = await Promise.allSettled([
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
                .select("*", { count: "exact" })
                .eq("user_id", userProfile.id)
                .eq("is_active", true),
            supabase
                .from("academic_calendar")
                .select("*")
                .eq("school_year", getDynamicSchoolYear())
                .order("week_number", { ascending: true }),
        ]);

        const subsResult = results[0].status === 'fulfilled' ? results[0].value : { data: [], count: 0 };
        const loadsResult = results[1].status === 'fulfilled' ? results[1].value : { data: [], count: 0 };
        const calendarResult = results[2].status === 'fulfilled' ? results[2].value : { data: [] };

        submissions = subsResult.data || [];
        activeTeachingLoads = loadsResult.data || [];
        teachingLoadsCount = loadsResult.count || 0;
        academicCalendar = calendarResult.data || [];
        const calendar = academicCalendar;

        // Calculate cumulative expected loads to date based on defined calendar weeks
        const definedWeeks = await getDefinedWeeksCount(supabase);
        const cumulativeExpected = teachingLoadsCount * definedWeeks;

        // Calculate compliance stats using ACTUAL submission statuses
        // Rate = compliant / cumulativeExpected
        complianceStats = calculateCompliance(submissions, cumulativeExpected);

        // Weekly breakdown for chart + widget (uses calendar weeks)
        weeklyData = groupSubmissionsByWeek(
            submissions,
            teachingLoadsCount,
            8,
            calendar,
        );

        recentActivity = (subsResult.data || []).slice(0, 5);
        stats.totalUploads = (subsResult.data || []).length;
        stats.compliantRate = complianceStats.rate;
    }

    async function loadSupervisorDashboard(userProfile: any, role: string) {
        // Fix existing submissions incorrectly marked 'non-compliant' by old fallback
        let fixQuery = supabase
            .from("submissions")
            .update({ compliance_status: "compliant" })
            .eq("compliance_status", "non-compliant")
            .not("file_hash", "like", "nc_%");
        if (role === "School Head" || role === "Master Teacher") {
            if (userProfile.school_id) {
                const { data: teacherIds } = await supabase
                    .from("profiles")
                    .select("id")
                    .eq("school_id", userProfile.school_id);
                if (teacherIds && teacherIds.length > 0) {
                    fixQuery = fixQuery.in("user_id", teacherIds.map((t) => t.id));
                }
            }
        } else if (role === "District Supervisor" && userProfile.district_id) {
            const { data: schoolIds } = await supabase
                .from("schools")
                .select("id")
                .eq("district_id", userProfile.district_id);
            if (schoolIds && schoolIds.length > 0) {
                const { data: teacherIds } = await supabase
                    .from("profiles")
                    .select("id")
                    .in("school_id", schoolIds.map((s) => s.id));
                if (teacherIds && teacherIds.length > 0) {
                    fixQuery = fixQuery.in("user_id", teacherIds.map((t) => t.id));
                }
            }
        }
        await fixQuery;

        // Fetch academic calendar for the school year
        const { data: calendar } = await supabase
            .from("academic_calendar")
            .select("*")
            .eq("school_year", getDynamicSchoolYear())
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

        const results = await Promise.allSettled([
            teacherQuery,
            subQuery.order("created_at", { ascending: false }),
        ]);

        const teachers = results[0].status === 'fulfilled' ? results[0].value.data || [] : [];
        const allSubs = results[1].status === 'fulfilled' ? results[1].value.data || [] : [];

        const { data: loadsData } = await supabase
            .from("teaching_loads")
            .select("id, profiles!inner(school_id, district_id)")
            .in(
                "profiles.id",
                teachers.map((t) => t.id),
            );

        const totalLoads = loadsData ? loadsData.length : 0;
        const definedWeeks = calendarArr.length || 1;
        const totalExpected = totalLoads * definedWeeks;

        const subsCount = results[1].status === 'fulfilled' ? results[1].value.count || 0 : 0;
        stats.totalTeachers = teachers.length;
        stats.totalUploads = subsCount;
        stats.compliantCount = allSubs.filter(
            (s) =>
                !s.compliance_status ||
                s.compliance_status === "compliant" ||
                s.compliance_status === "on-time",
        ).length;
        stats.lateCount = allSubs.filter(
            (s) => s.compliance_status === "late",
        ).length;

        stats.nonCompliantCount = Math.max(
            0,
            totalExpected - (stats.compliantCount + stats.lateCount),
        );

        // Use the new standard calculateCompliance for the overall rate to keep display consistent with expected defaults
        const overallStats = calculateCompliance(allSubs, totalExpected);
        stats.compliantRate = overallStats.rate;

        recentActivity = allSubs.slice(0, 5);
    }



    // Teacher table: filtered & sorted submissions
    const displaySubmissions = $derived(() => {
        let result = [...submissions];
        if (filterStatus !== "all") {
            result = result.filter((s) => {
                let cs = s.compliance_status || "compliant";
                // Normalize for filtering
                if (
                    cs.toLowerCase() === "on-time" ||
                    cs.toLowerCase() === "compliant"
                )
                    cs = "compliant";
                else if (cs.toLowerCase() === "late") cs = "late";
                else if (cs.toLowerCase() === "non-compliant")
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
    ): "compliant" | "late" | "non-compliant" {
        const cs = (s.compliance_status || "compliant").toLowerCase();
        if (cs === "compliant" || cs === "on-time") return "compliant";
        if (cs === "late") return "late";
        return "non-compliant";
    }
</script>

<svelte:head>
    <title>Dashboard — CEDIMS</title>
</svelte:head>

<div>
    <!-- Header -->
    <div class="mb-6">
        <h1 class="text-3xl font-semibold text-text-primary tracking-tight">
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
                <div class="gov-card-static p-5 animate-pulse">
                    <div class="h-4 bg-surface-muted rounded w-24 mb-4"></div>
                    <div class="h-10 bg-surface-muted rounded w-16"></div>
                </div>
            {/each}
        </div>
    {:else if $profile?.role === "Teacher"}
        <!-- ========== TEACHER DASHBOARD ========== -->

        <!-- Stats Row -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
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
            <div in:fly={{ y: 20, duration: 400, delay: 400 }}>
                <StatCard
                    icon="Activity"
                    value="{complianceStats.rate}%"
                    label="Compliance Snapshot"
                    color="from-gov-blue to-gov-blue-dark"
                />
            </div>
        </div>

        <!-- Quick Actions -->
        <div class="mb-10" in:fade={{ duration: 600, delay: 500 }}>
            <div class="flex items-center gap-3 mb-6">
                <div class="p-2 rounded-md bg-gov-blue/10 text-gov-blue">
                    <Zap size={20} fill="currentColor" strokeWidth={1.5} />
                </div>
                <h2
                    class="text-xl font-semibold text-text-primary tracking-tight"
                >
                    Quick Actions
                </h2>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-4 gap-5">
                <a
                    href="/dashboard/upload"
                    class="gov-card p-5 flex flex-col gap-4 no-underline group"
                >
                    <div
                        class="w-10 h-10 rounded-md bg-gov-blue/5 text-gov-blue flex items-center justify-center group-hover:bg-gov-blue group-hover:text-white transition-all duration-300"
                    >
                        <CloudUpload size={20} strokeWidth={1.5} />
                    </div>
                    <div>
                        <p
                            class="font-bold text-sm text-text-primary group-hover:text-gov-blue transition-colors"
                        >
                            Upload
                        </p>
                        <p
                            class="text-[10px] text-text-muted mt-1 leading-relaxed"
                        >
                            Submit DLL, ISP, or ISR reports.
                        </p>
                    </div>
                </a>
                <a
                    href="/dashboard/archive"
                    class="gov-card p-5 flex flex-col gap-4 no-underline group"
                >
                    <div
                        class="w-10 h-10 rounded-md bg-gov-blue/5 text-gov-blue flex items-center justify-center group-hover:bg-gov-blue group-hover:text-white transition-all duration-300"
                    >
                        <Archive size={20} strokeWidth={1.5} />
                    </div>
                    <div>
                        <p
                            class="font-bold text-sm text-text-primary group-hover:text-gov-blue transition-colors"
                        >
                            Archive
                        </p>
                        <p
                            class="text-[10px] text-text-muted mt-1 leading-relaxed"
                        >
                            Retrieve submitted documents.
                        </p>
                    </div>
                </a>
                <a
                    href="/dashboard/load"
                    class="gov-card p-5 flex flex-col gap-4 no-underline group"
                >
                    <div
                        class="w-10 h-10 rounded-md bg-gov-blue/5 text-gov-blue flex items-center justify-center group-hover:bg-gov-blue group-hover:text-white transition-all duration-300"
                    >
                        <Briefcase size={20} strokeWidth={1.5} />
                    </div>
                    <div>
                        <p
                            class="font-bold text-sm text-text-primary group-hover:text-gov-blue transition-colors"
                        >
                            Load
                        </p>
                        <p
                            class="text-[10px] text-text-muted mt-1 leading-relaxed"
                        >
                            Manage subjects and schedules.
                        </p>
                    </div>
                </a>
                <button
                    onclick={() => showQRScanner.set(true)}
                    class="gov-card p-5 flex flex-col gap-4 no-underline group text-left w-full cursor-pointer"
                >
                    <div
                        class="w-10 h-10 rounded-md bg-gov-blue/5 text-gov-blue flex items-center justify-center group-hover:bg-gov-blue group-hover:text-white transition-all duration-300"
                    >
                        <QrCode size={20} strokeWidth={1.5} />
                    </div>
                    <div>
                        <p
                            class="font-bold text-sm text-text-primary group-hover:text-gov-blue transition-colors"
                        >
                            Scan
                        </p>
                        <p
                            class="text-[10px] text-text-muted mt-1 leading-relaxed"
                        >
                            Verify document authenticity.
                        </p>
                    </div>
                </button>
            </div>
        </div>

        <div class="mb-6 rounded-2xl border border-border-subtle bg-surface-white p-5 shadow-sm" in:fade={{ duration: 500, delay: 400 }}>
            <h3 class="text-sm font-semibold uppercase tracking-wide text-text-primary mb-3">
                Current Focus
            </h3>
            <p class="text-sm text-text-secondary">
                Keep your submissions up to date and review your archive regularly so monitoring remains simple and current.
            </p>
        </div>

        <!-- Teacher Checklist: Interactive checkpoint hub for all active teaching loads -->
        <div class="mb-6" in:fade={{ duration: 500, delay: 600 }}>
            <TeacherChecklist
                {submissions}
                teachingLoads={activeTeachingLoads}
                calendarWeeks={academicCalendar}
            />
        </div>
    {:else}
        <!-- ========== SUPERVISOR DASHBOARD ========== -->

        <!-- Priority alerts -->
        {#if alerts.length > 0}
            <AlertBanner {alerts} />
        {/if}

        <!-- Stats Grid -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6 mb-6">
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
            <div in:fly={{ y: 20, duration: 400, delay: 250 }}>
                <StatCard
                    icon="ShieldX"
                    value={stats.nonCompliantCount}
                    label="NON-COMPLIANT"
                    color="gov-red"
                />
            </div>
        </div>



        <!-- Recent Activity as Cards -->
        <div in:fade={{ duration: 600, delay: 600 }}>
            <h2
                class="text-sm font-bold text-text-muted uppercase tracking-widest mb-6 flex items-center gap-2"
            >
                <div class="h-1 w-4 bg-gov-gold"></div>
                Recent School Activity
            </h2>

            {#if recentActivity.length === 0}
                <div class="gov-card-static p-12 text-center rounded-2xl">
                    <p
                        class="text-text-muted font-bold text-xs uppercase tracking-widest"
                    >
                        No recent submissions detected
                    </p>
                </div>
            {:else}
                <div
                    class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5"
                >
                    {#each recentActivity as item, i}
                        <div
                            class="bg-surface-white border border-border-subtle rounded-xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col group relative"
                            in:fly={{
                                x: -20,
                                duration: 400,
                                delay: 700 + i * 50,
                            }}
                        >
                            <div class="absolute top-4 right-4">
                                <StatusBadge
                                    status={!item.compliance_status ||
                                    item.compliance_status === "on-time" ||
                                    item.compliance_status === "compliant"
                                        ? "compliant"
                                        : item.compliance_status === "late"
                                          ? "late"
                                          : "non-compliant"}
                                    size="sm"
                                />
                            </div>

                            <div class="mb-4">
                                <h4
                                    class="font-bold text-sm text-text-primary group-hover:text-gov-blue transition-colors leading-snug line-clamp-2 pr-12"
                                >
                                    {item.file_name}
                                </h4>
                            </div>

                            <div
                                class="mt-auto pt-3 border-t border-border-subtle flex items-center justify-between"
                            >
                                <div
                                    class="flex items-center gap-2 text-text-muted"
                                >
                                    <Clock size={12} strokeWidth={2} />
                                    <span
                                        class="text-[10px] font-bold uppercase tracking-tighter"
                                        >{formatDate(item.created_at)}</span
                                    >
                                </div>
                                <span
                                    class="text-[9px] font-bold text-gov-blue/60 uppercase tracking-widest"
                                    >Archived</span
                                >
                            </div>
                        </div>
                    {/each}
                </div>
            {/if}
        </div>
    {/if}
</div>
