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
        Search,
        Building2,
    } from "lucide-svelte";
    import { showQRScanner } from "$lib/stores/ui";

    interface ComplianceRow {
        id: string;
        name: string;
        school_name: string;
        expected: number;
        compliant: number;
        late: number;
        missing: number;
        rate: number;
    }

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
    let teacherCompliance = $state<any[]>([]);
    let loading = $state(true);

    // Teacher Compliance table: sorting, search & school grouping
    let tcSortField = $state<keyof ComplianceRow>("rate");
    let tcSortDir = $state<"asc" | "desc">("desc");
    let tcSearch = $state("");
    let tcGroupBySchool = $state(true);
    let tcViewAll = $state(false);

    let channel: any;

    // Guards against write-triggered reload feedback loops:
    // our own compliance-fix UPDATE fires a postgres_changes event, so we
    // skip reloading while we are the ones applying a fix.
    let applyingFix = $state(false);
    let reloadTimer: ReturnType<typeof setTimeout> | null = null;

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
        if (reloadTimer) clearTimeout(reloadTimer);
    });

    // Debounce reloads so bursts of realtime events (e.g. bulk inserts or the
    // page's own compliance-fix writes) collapse into a single refresh.
    function scheduleReload() {
        if (reloadTimer) clearTimeout(reloadTimer);
        reloadTimer = setTimeout(() => {
            loadDashboard().catch((err) => console.error("[dashboard] Realtime refresh failed:", err));
        }, 500);
    }

    function setupRealtime() {
        channel = supabase
            .channel("dashboard-changes")
            .on(
                "postgres_changes",
                { event: "*", schema: "public", table: "submissions" },
                async (payload) => {
                    // Skip reload entirely if the change was caused by our own
                    // compliance-status fix write (prevents feedback loops).
                    if (applyingFix) return;

                    // Real-time compliance risk alerts for supervisors
                    const role = $profile?.role;
                    if (role && role !== "Teacher" && payload?.new) {
                        const rec = payload.new as any;
                        if (
                            rec?.compliance_status === "late" ||
                            rec?.compliance_status === "missing"
                        ) {
                            try {
                                const { alertComplianceRisk } = await import(
                                    "$lib/utils/notificationSystem"
                                );
                                await alertComplianceRisk(
                                    $profile?.district_id || undefined,
                                    "Your school/district",
                                    rec.compliance_status === "missing"
                                        ? "high"
                                        : "medium",
                                    `A teacher submitted a ${rec.compliance_status} DLL (Week ${rec.week_number || "?"}).`,
                                );
                            } catch (e) {
                                console.warn(
                                    "[dashboard] Compliance alert skipped:",
                                    e,
                                );
                            }
                        }
                    }
                    scheduleReload();
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
        // Fix existing submissions that were incorrectly marked 'missing'
        // by the old day-of-week fallback. Only fixes real uploads, not missing placeholders.
        // Guarded so the resulting realtime event doesn't trigger a reload loop.
        applyingFix = true;
        try {
            await supabase
                .from("submissions")
                .update({ compliance_status: "compliant" })
                .eq("user_id", userProfile.id)
                .eq("compliance_status", "missing")
                .not("file_hash", "like", "nc_%");
        } finally {
            applyingFix = false;
        }

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
        // Fix existing submissions incorrectly marked 'missing' by old fallback
        let fixQuery = supabase
            .from("submissions")
            .update({ compliance_status: "compliant" })
            .eq("compliance_status", "missing")
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
        applyingFix = true;
        try {
            await fixQuery;
        } finally {
            applyingFix = false;
        }

        // Fetch academic calendar for the school year
        const { data: calendar } = await supabase
            .from("academic_calendar")
            .select("*")
            .eq("school_year", getDynamicSchoolYear())
            .order("week_number", { ascending: true });

        const calendarArr = calendar || [];



        // Fetch teachers in the scope (School or District)
        // NOTE: Do NOT embed `schools(name)` here — the profiles->schools FK is
        // not visible to PostgREST in this database (PGRST200), which returns a
        // 400 and makes the whole teacher query fail. School names are resolved
        // separately below.
        let teacherQuery = supabase
            .from("profiles")
            .select("id, full_name, role, school_id, district_id")
            .in("role", ["Teacher", "Master Teacher"]);

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

        // Resolve school names for alerts (can't use the schools() embed here)
        const teacherSchoolIds = [...new Set(
            (teachers as any[]).map((t) => t.school_id).filter(Boolean)
        )];
        let schoolNameMap: Record<string, string> = {};
        if (teacherSchoolIds.length > 0) {
            const { data: schData } = await supabase
                .from("schools")
                .select("id, name")
                .in("id", teacherSchoolIds);
            if (schData) {
                for (const s of schData) {
                    schoolNameMap[s.id] = s.name;
                }
            }
        }
        const teachersWithNames = (teachers as any[]).map((t) => ({
            ...t,
            school_name: t.school_id ? (schoolNameMap[t.school_id] || 'Unknown School') : 'Unknown School',
            schools: { name: t.school_id ? (schoolNameMap[t.school_id] || 'Unknown School') : 'Unknown School' },
        }));

        const { data: loadsData } = await supabase
            .from("teaching_loads")
            .select("id, user_id, subject")
            .in(
                "user_id",
                teachersWithNames.map((t) => t.id),
            );

        const loads = loadsData || [];
        const definedWeeks = calendarArr.length || 1;

        // Per-teacher compliance: expected = active loads x defined weeks.
        // Missing = expected - (compliant + late). This matches the teacher
        // dashboard's own numbers, just summed across the supervisor's scope.
        const loadsByTeacher: Record<string, any[]> = {};
        for (const l of loads) {
            (loadsByTeacher[l.user_id] ||= []).push(l);
        }
        teacherCompliance = teachersWithNames.map((t) => {
            const myLoads = loadsByTeacher[t.id] || [];
            const expected = myLoads.length * definedWeeks;
            const mySubs = allSubs.filter((s) => s.user_id === t.id);
            const compliant = mySubs.filter(
                (s) =>
                    !s.compliance_status ||
                    s.compliance_status === "compliant" ||
                    s.compliance_status === "on-time",
            ).length;
            const late = mySubs.filter(
                (s) => s.compliance_status === "late",
            ).length;
            const missing = Math.max(0, expected - (compliant + late));
            return {
                id: t.id,
                name: t.full_name,
                school_name: t.school_name,
                expected,
                compliant,
                late,
                missing,
                rate:
                    expected > 0
                        ? Math.round(((compliant + late) / expected) * 100)
                        : 0,
            };
        });

        const totalLoads = loads.length;
        const totalExpected = totalLoads * definedWeeks;

        const subsCount = results[1].status === 'fulfilled' ? results[1].value.count || 0 : 0;
        stats.totalTeachers = teachersWithNames.length;
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

        stats.nonCompliantCount = teacherCompliance.reduce(
            (sum, t) => sum + t.missing,
            0,
        );

        // Use the new standard calculateCompliance for the overall rate to keep display consistent with expected defaults
        const overallStats = calculateCompliance(allSubs, totalExpected);
        stats.compliantRate = overallStats.rate;

        recentActivity = allSubs.slice(0, 5);

        // Predictive integrity alerts (pattern detection)
        const { detectPatterns } = await import("$lib/utils/patternDetection");
        alerts = detectPatterns(allSubs, calendarArr, teachersWithNames);
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
                else if (
                    cs.toLowerCase() === "missing" ||
                    cs.toLowerCase() === "non-compliant"
                )
                    cs = "missing";

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

    // Teacher Compliance: filtered + sorted rows
    const filteredTeacherCompliance = $derived(
        applyTcFilters(teacherCompliance, tcSearch, tcSortField, tcSortDir),
    );

    // Group rows by school for the categorized view
    const groupedTeacherCompliance = $derived(
        groupTcBySchool(teacherCompliance, tcSearch, tcSortField, tcSortDir),
    );

    function applyTcFilters(
        rows: ComplianceRow[],
        search: string,
        sortField: keyof ComplianceRow,
        sortDir: "asc" | "desc",
    ): ComplianceRow[] {
        const q = search.trim().toLowerCase();
        let result = rows;
        if (q) {
            result = result.filter(
                (t) =>
                    t.name.toLowerCase().includes(q) ||
                    t.school_name.toLowerCase().includes(q),
            );
        }
        return [...result]
            .sort((a, b) => {
                let aVal: string | number = a[sortField];
                let bVal: string | number = b[sortField];
                if (sortField === "name" || sortField === "school_name") {
                    aVal = String(aVal || "").toLowerCase();
                    bVal = String(bVal || "").toLowerCase();
                } else {
                    aVal = Number(aVal) || 0;
                    bVal = Number(bVal) || 0;
                }
                const cmp = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
                return sortDir === "asc" ? cmp : -cmp;
            });
    }

    function toggleTcSort(field: keyof ComplianceRow) {
        if (tcSortField === field) tcSortDir = tcSortDir === "asc" ? "desc" : "asc";
        else {
            tcSortField = field;
            tcSortDir = "desc";
        }
    }

    function groupTcBySchool(
        rows: ComplianceRow[],
        search: string,
        sortField: keyof ComplianceRow,
        sortDir: "asc" | "desc",
    ): { school: string; rows: ComplianceRow[]; compliant: number; late: number; missing: number; expected: number }[] {
        const filtered = applyTcFilters(rows, search, sortField, sortDir);
        const groups = new Map<string, ComplianceRow[]>();
        for (const t of filtered) {
            const key = t.school_name || "Unassigned School";
            if (!groups.has(key)) groups.set(key, []);
            groups.get(key)!.push(t);
        }
        return [...groups.entries()]
            .map(([school, gRows]) => ({
                school,
                rows: gRows,
                compliant: gRows.reduce((s, r) => s + r.compliant, 0),
                late: gRows.reduce((s, r) => s + r.late, 0),
                missing: gRows.reduce((s, r) => s + r.missing, 0),
                expected: gRows.reduce((s, r) => s + r.expected, 0),
            }))
            .sort((a, b) => a.school.localeCompare(b.school));
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
    ): "compliant" | "late" | "missing" {
        const cs = (s.compliance_status || "compliant").toLowerCase();
        if (cs === "compliant" || cs === "on-time") return "compliant";
        if (cs === "late") return "late";
        return "missing";
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
        <div class="flex flex-col items-center justify-center py-10 mb-2" role="status" aria-label="Loading data">
            <div class="relative w-12 h-12 mb-4">
                <div class="absolute inset-0 rounded-full border-4 border-gov-blue/20"></div>
                <div class="absolute inset-0 rounded-full border-4 border-transparent border-t-gov-blue animate-spin"></div>
            </div>
            <p class="text-sm font-medium text-text-muted uppercase tracking-wide">Loading your dashboard...</p>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {#each Array(4) as _}
                <div class="gov-card-static p-5 animate-pulse">
                    <div class="h-4 bg-surface-muted rounded w-24 mb-4"></div>
                    <div class="h-10 bg-surface-muted rounded w-16"></div>
                </div>
            {/each}
        </div>
        <div class="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div class="gov-card-static p-5 animate-pulse lg:col-span-2">
                <div class="h-4 bg-surface-muted rounded w-40 mb-4"></div>
                <div class="h-40 bg-surface-muted rounded"></div>
            </div>
            <div class="gov-card-static p-5 animate-pulse">
                <div class="h-4 bg-surface-muted rounded w-28 mb-4"></div>
                <div class="space-y-3">
                    <div class="h-8 bg-surface-muted rounded"></div>
                    <div class="h-8 bg-surface-muted rounded"></div>
                    <div class="h-8 bg-surface-muted rounded"></div>
                </div>
            </div>
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
                    label="Missing"
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
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            <div in:fly={{ y: 20, duration: 400, delay: 0 }}>
                <StatCard
                    icon="Users"
                    value={stats.totalTeachers}
                    label="Teachers"
                />
            </div>
            <div in:fly={{ y: 20, duration: 400, delay: 100 }}>
                <StatCard
                    icon="FileText"
                    value={stats.totalUploads}
                    label="Submissions"
                    color="gov-blue"
                />
            </div>
            <div in:fly={{ y: 20, duration: 400, delay: 150 }}>
                <StatCard
                    icon="ShieldCheck"
                    value="{stats.compliantRate}%"
                    label="Compliance Rate"
                    color="gov-green"
                />
            </div>
            <div in:fly={{ y: 20, duration: 400, delay: 200 }}>
                <StatCard
                    icon="ShieldX"
                    value={stats.nonCompliantCount}
                    label="Missing"
                    color="gov-red"
                />
            </div>
        </div>

        <!-- Teacher Compliance Table -->
        {#if teacherCompliance.length > 0}
            <div class="mb-6" in:fade={{ duration: 500, delay: 300 }}>
                <div class="flex flex-wrap items-center justify-between gap-3 mb-4">
                    <h2
                        class="text-sm font-bold text-text-muted uppercase tracking-widest flex items-center gap-2"
                    >
                        <div class="h-1 w-4 bg-gov-blue"></div>
                        Teacher Compliance
                        <span class="text-xs font-semibold text-text-muted/70">({teacherCompliance.length} teachers)</span>
                    </h2>

                    <div class="flex flex-wrap items-center gap-2">
                        <!-- Search -->
                        <div class="relative">
                            <input
                                type="text"
                                bind:value={tcSearch}
                                placeholder="Search teacher or school..."
                                class="w-56 px-3 py-1.5 pl-8 text-sm rounded-lg border border-border-subtle bg-surface-white focus:outline-none focus:ring-2 focus:ring-gov-blue/40"
                            />
                            <Search
                                class="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted"
                            />
                        </div>

                        <!-- Group toggle -->
                        <button
                            class="px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors {tcGroupBySchool ? 'bg-gov-blue text-white border-gov-blue' : 'bg-surface-white text-text-muted border-border-subtle'}"
                            onclick={() => (tcGroupBySchool = !tcGroupBySchool)}
                        >
                            {tcGroupBySchool ? "Grouped by School" : "Flat List"}
                        </button>

                        <!-- Expand/collapse all -->
                        <button
                            class="px-3 py-1.5 text-xs font-semibold rounded-lg border border-border-subtle bg-surface-white text-text-muted hover:bg-surface-muted/40 transition-colors"
                            onclick={() => (tcViewAll = !tcViewAll)}
                        >
                            {tcViewAll ? "Collapse All" : "Expand All"}
                        </button>
                    </div>
                </div>

                <div class="bg-surface-white border border-border-subtle rounded-xl overflow-hidden shadow-sm">
                    <div class="max-h-[36rem] overflow-y-auto">
                        {#if filteredTeacherCompliance.length === 0}
                            <p class="px-4 py-8 text-center text-sm text-text-muted">No teachers match your search.</p>
                        {:else if tcGroupBySchool}
                            <!-- Grouped by school -->
                            {#each groupedTeacherCompliance as group}
                                <details class="border-b border-border-subtle last:border-0" open={tcViewAll}>
                                    <summary class="flex items-center justify-between px-4 py-3 bg-surface-muted/40 hover:bg-surface-muted/60 cursor-pointer select-none">
                                        <span class="flex items-center gap-2 font-bold text-text-primary">
                                            <Building2 class="w-4 h-4 text-gov-blue" />
                                            {group.school}
                                        </span>
                                        <span class="flex items-center gap-4 text-xs text-text-muted">
                                            <span class="text-gov-green font-semibold">{group.compliant} compliant</span>
                                            <span class="text-gov-gold-dark font-semibold">{group.late} late</span>
                                            <span class="text-gov-red font-semibold">{group.missing} missing</span>
                                            <span class="font-bold text-text-primary">{group.expected > 0 ? Math.round(((group.compliant + group.late) / group.expected) * 100) : 0}%</span>
                                            <span class="w-5 h-5 flex items-center justify-center">{group.rows.length}</span>
                                        </span>
                                    </summary>
                                    <div class="overflow-x-auto">
                                        <table class="w-full text-sm">
                                            <thead>
                                                <tr class="text-left text-[10px] uppercase tracking-wider text-text-muted border-b border-border-subtle bg-surface-muted/20">
                                                    <th class="px-4 py-2 font-bold cursor-pointer hover:text-gov-blue" onclick={() => toggleTcSort("name")}>
                                                        Teacher {tcSortField === "name" ? (tcSortDir === "asc" ? "▲" : "▼") : ""}
                                                    </th>
                                                    <th class="px-4 py-2 font-bold text-center cursor-pointer hover:text-gov-blue" onclick={() => toggleTcSort("compliant")}>
                                                        Compliant {tcSortField === "compliant" ? (tcSortDir === "asc" ? "▲" : "▼") : ""}
                                                    </th>
                                                    <th class="px-4 py-2 font-bold text-center cursor-pointer hover:text-gov-blue" onclick={() => toggleTcSort("late")}>
                                                        Late {tcSortField === "late" ? (tcSortDir === "asc" ? "▲" : "▼") : ""}
                                                    </th>
                                                    <th class="px-4 py-2 font-bold text-center cursor-pointer hover:text-gov-blue" onclick={() => toggleTcSort("missing")}>
                                                        Missing {tcSortField === "missing" ? (tcSortDir === "asc" ? "▲" : "▼") : ""}
                                                    </th>
                                                    <th class="px-4 py-2 font-bold text-right cursor-pointer hover:text-gov-blue" onclick={() => toggleTcSort("rate")}>
                                                        Rate {tcSortField === "rate" ? (tcSortDir === "asc" ? "▲" : "▼") : ""}
                                                    </th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {#each group.rows as tc}
                                                    <tr class="border-b border-border-subtle last:border-0 hover:bg-surface-muted/40 transition-colors">
                                                        <td class="px-4 py-3 font-semibold text-text-primary">{tc.name}</td>
                                                        <td class="px-4 py-3 text-center text-gov-green font-semibold">{tc.compliant}</td>
                                                        <td class="px-4 py-3 text-center text-gov-gold-dark font-semibold">{tc.late}</td>
                                                        <td class="px-4 py-3 text-center text-gov-red font-semibold">{tc.missing}</td>
                                                        <td class="px-4 py-3 text-right font-semibold text-text-primary">{tc.rate}%</td>
                                                    </tr>
                                                {/each}
                                            </tbody>
                                        </table>
                                    </div>
                                </details>
                            {/each}
                        {:else}
                            <!-- Flat list -->
                            <div class="overflow-x-auto">
                                <table class="w-full text-sm">
                                    <thead>
                                        <tr class="text-left text-[10px] uppercase tracking-wider text-text-muted border-b border-border-subtle">
                                            <th class="px-4 py-3 font-bold cursor-pointer hover:text-gov-blue" onclick={() => toggleTcSort("name")}>
                                                Teacher {tcSortField === "name" ? (tcSortDir === "asc" ? "▲" : "▼") : ""}
                                            </th>
                                            <th class="px-4 py-3 font-bold cursor-pointer hover:text-gov-blue" onclick={() => toggleTcSort("school_name")}>
                                                School {tcSortField === "school_name" ? (tcSortDir === "asc" ? "▲" : "▼") : ""}
                                            </th>
                                            <th class="px-4 py-3 font-bold text-center cursor-pointer hover:text-gov-blue" onclick={() => toggleTcSort("compliant")}>
                                                Compliant {tcSortField === "compliant" ? (tcSortDir === "asc" ? "▲" : "▼") : ""}
                                            </th>
                                            <th class="px-4 py-3 font-bold text-center cursor-pointer hover:text-gov-blue" onclick={() => toggleTcSort("late")}>
                                                Late {tcSortField === "late" ? (tcSortDir === "asc" ? "▲" : "▼") : ""}
                                            </th>
                                            <th class="px-4 py-3 font-bold text-center cursor-pointer hover:text-gov-blue" onclick={() => toggleTcSort("missing")}>
                                                Missing {tcSortField === "missing" ? (tcSortDir === "asc" ? "▲" : "▼") : ""}
                                            </th>
                                            <th class="px-4 py-3 font-bold text-right cursor-pointer hover:text-gov-blue" onclick={() => toggleTcSort("rate")}>
                                                Rate {tcSortField === "rate" ? (tcSortDir === "asc" ? "▲" : "▼") : ""}
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {#each filteredTeacherCompliance as tc}
                                            <tr class="border-b border-border-subtle last:border-0 hover:bg-surface-muted/40 transition-colors">
                                                <td class="px-4 py-3 font-semibold text-text-primary">{tc.name}</td>
                                                <td class="px-4 py-3 text-text-muted">{tc.school_name}</td>
                                                <td class="px-4 py-3 text-center text-gov-green font-semibold">{tc.compliant}</td>
                                                <td class="px-4 py-3 text-center text-gov-gold-dark font-semibold">{tc.late}</td>
                                                <td class="px-4 py-3 text-center text-gov-red font-semibold">{tc.missing}</td>
                                                <td class="px-4 py-3 text-right font-semibold text-text-primary">{tc.rate}%</td>
                                            </tr>
                                        {/each}
                                    </tbody>
                                </table>
                            </div>
                        {/if}
                    </div>
                </div>
            </div>
        {/if}



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
                                          : "missing"}
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
