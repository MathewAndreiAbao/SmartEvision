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
    import { School as SchoolIcon, Activity } from "lucide-svelte";
    import { addToast } from "$lib/stores/toast";
    import {
        calculateCompliance,
        groupSubmissionsByWeek,
        getComplianceClass,
        getComplianceBgClass,
        getTrendDirection,
        getTrendIcon,
        formatComplianceRate,
        getWeekNumber,
        getDefinedWeeksCount,
    } from "$lib/utils/useDashboardData";
    import {
        analyzeComplianceRisk,
        type PredictionResult,
    } from "$lib/utils/predictiveAnalytics";
    import {
        logTAOutreach,
        getSupervisorTAWorkflow,
        type TechnicalAssistance,
    } from "$lib/utils/taManager";
    import {
        LayoutDashboard,
        HelpingHand,
        MessageSquare,
        History,
        ExternalLink,
        CheckCircle2
    } from "lucide-svelte";

    // Data
    interface Teacher {
        id: string;
        full_name: string;
        email?: string;
        role: string;
        district_id: string;
        loadCount?: number;
        rate?: number;
        total?: number;
        Compliant?: number;
        Late?: number;
        NonCompliant?: number;
        risk?: PredictionResult;
    }

    interface Submission {
        id: string;
        user_id: string;
        file_name: string;
        doc_type: string;
        compliance_status: string;
        created_at: string;
        week_number?: number;
        teaching_loads?: any;
    }

    interface KPI {
        totalTeachers: number;
        overallRate: number;
        lateCount: number;
        atRiskCount: number;
        previousRate: number;
    }

    // Data
    let teachers = $state<Teacher[]>([]);
    let allSubmissions = $state<Submission[]>([]);
    let loading = $state(true);
    let schoolLogoUrl = $state<string | null>(null);
    let currentDefinedWeeks = $state(1);
    // KPI state
    let kpi = $state<KPI>({
        totalTeachers: 0,
        overallRate: 0,
        lateCount: 0,
        atRiskCount: 0,
        previousRate: 0,
    });

    // Heatmap data
    let heatmapRows = $state<string[]>([]);
    let heatmapWeeks = $state<{ week: number; label: string }[]>([]);
    let heatmapCells = $state<any[]>([]);

    // Trend chart data
    let trendLabels = $state<string[]>([]);
    let trendDatasets = $state<any[]>([]);

    // Table controls
    let sortField = $state<string>("rate");
    let sortDir = $state<"asc" | "desc">("asc");
    let searchQuery = $state("");
    let currentWk = $state(1);

    // Modal State
    let showModal = $state(false);
    let selectedTeacher = $state<Teacher | null>(null);
    let selectedSubmissions = $state<Submission[]>([]);

    // TA Management State
    let activeTab = $state<'performance' | 'support'>('performance');
    let taHistory = $state<TechnicalAssistance[]>([]);
    let isSubmittingSupport = $state(false);
    let selectedTA = $state<TechnicalAssistance | null>(null);
    let showNotesModal = $state(false);
    let taNotes = $state("");

    // Alert teachers (≥2 late submissions)
    const alertTeachers = $derived(() => {
        return teachers.filter((t: Teacher) => {
            const subs = allSubmissions.filter(
                (s: Submission) => s.user_id === t.id,
            );
            const late = subs.filter(
                (s: Submission) => s.compliance_status === "late",
            ).length;
            return late >= 2;
        });
    });

    let realtimeChannel: ReturnType<typeof supabase.channel> | null = null;

    onMount(async () => {
        await loadSchoolData();
        loading = false;

        // Subscribe to real-time submission changes
        realtimeChannel = supabase
            .channel("school-submissions")
            .on(
                "postgres_changes",
                { event: "*", schema: "public", table: "submissions" },
                () => {
                    loadSchoolData();
                },
            )
            .subscribe();
    });

    onDestroy(() => {
        if (realtimeChannel) {
            supabase.removeChannel(realtimeChannel);
        }
    });

    async function loadSchoolData() {
        const userProfile = $profile;
        if (!userProfile?.school_id) return;

        // Fetch School Logo
        const { data: schoolData } = await supabase.from('schools').select('avatar_url').eq('id', userProfile.school_id).single();
        if (schoolData) schoolLogoUrl = schoolData.avatar_url;

        // Batch fetch: teachers + all submissions + all teaching loads + academic calendar
        const [teachersRes, subsRes, loadsRes, calendarRes] = await Promise.all(
            [
                supabase
                    .from("profiles")
                    .select("id, full_name, email, role, district_id")
                    .eq("school_id", userProfile.school_id)
                    .eq("role", "Teacher")
                    .order("full_name"),
                supabase
                    .from("submissions")
                    .select(
                        "id, user_id, file_name, doc_type, compliance_status, created_at, week_number, profiles!inner(school_id), teaching_loads(subject, grade_level)",
                    )
                    .eq("profiles.school_id", userProfile.school_id)
                    .order("created_at", { ascending: false }),
                supabase
                    .from("teaching_loads")
                    .select("id, user_id, profiles!inner(school_id)")
                    .eq("profiles.school_id", userProfile.school_id),
                supabase
                    .from("academic_calendar")
                    .select("*")
                    .eq("school_year", "2025-2026")
                    .order("week_number", { ascending: true }),
            ],
        );

        teachers = (teachersRes.data || []).map((t: any) => t as Teacher);
        const schoolLoads = loadsRes.data || [];
        const districtId = teachers[0]?.district_id || userProfile.district_id;

        let calendar = (calendarRes.data || []) as any[];
        if (districtId) {
            calendar = calendar.filter(
                (c: any) => c.district_id === districtId,
            );
        }

        currentDefinedWeeks = await getDefinedWeeksCount(supabase);

        // Attach load count to each teacher
        teachers = teachers.map((t: Teacher) => ({
            ...t,
            loadCount: schoolLoads.filter((l: any) => l.user_id === t.id)
                .length,
        }));

        allSubmissions = (subsRes.data || []).map((s: any) => s as Submission);
        const teacherIds = new Set(teachers.map((t: Teacher) => t.id));
        allSubmissions = allSubmissions.filter((s: Submission) =>
            teacherIds.has(s.user_id),
        );

        // Calculate KPIs
        const totalSchoolLoads = teachers.reduce(
            (sum: number, t: Teacher) => sum + (t.loadCount || 0),
            0,
        );

        const cumulativeExpectedDistrict =
            totalSchoolLoads * currentDefinedWeeks;

        const overallStats = calculateCompliance(
            allSubmissions,
            cumulativeExpectedDistrict,
        );
        kpi.totalTeachers = teachers.length;
        kpi.overallRate = overallStats.rate;
        kpi.lateCount = overallStats.Late;

        // At-risk: teachers with <70% compliance (Diagnostic)
        kpi.atRiskCount = teachers.filter((t: Teacher) => {
            const subs = allSubmissions.filter(
                (s: Submission) => s.user_id === t.id,
            );
            
            // Apply Predictive Analytics for each teacher
            t.risk = analyzeComplianceRisk(subs);
            
            const stats = calculateCompliance(subs, t.loadCount);
            return stats.rate < 70 && subs.length > 0;
        }).length;

        // Previous week rate for trend
        const prevCal = calendar.find(
            (c: any) => c.week_number === currentWk - 1,
        );
        const prevWeekSubs = allSubmissions.filter((s: Submission) => {
            const wn = s.week_number || getWeekNumber(new Date(s.created_at));
            return wn === currentWk - 1;
        });
        kpi.previousRate = calculateCompliance(
            prevWeekSubs,
            totalSchoolLoads, // Strictly for one week
        ).rate;

        // Build heatmap
        buildHeatmap(calendar);

        // Build trend chart
        const weeklyData = groupSubmissionsByWeek(
            allSubmissions,
            totalSchoolLoads,
            8,
            calendar,
        );
        trendLabels = weeklyData.map((w: any) => w.label);
        trendDatasets = [
            {
                label: "School Compliance",
                data: weeklyData.map((w: any) => w.rate),
                color: "#0038A8",
            },
            {
                label: "80% Target",
                data: weeklyData.map(() => 80),
                color: "#CE1126",
                dashed: true,
            },
        ];

        // Fetch TA History
        if (userProfile.id) {
            taHistory = await getSupervisorTAWorkflow(userProfile.id);
        }
    }

    async function handleOfferSupport(teacher: Teacher) {
        if (!$profile?.id || isSubmittingSupport) return;
        
        isSubmittingSupport = true;
        try {
            // 1. Log to DB
            const { error } = await logTAOutreach($profile.id, { teacherId: teacher.id });
            if (error) throw error;

            // 2. Open Email
            const subject = encodeURIComponent("Instructional Support Schedule");
            const body = encodeURIComponent(`Hello ${teacher.full_name},\n\nI was reviewing the recent system insights and wanted to schedule a brief session to provide some technical assistance on your archival submissions. Let me know when you're available.`);
            window.location.href = `mailto:${teacher.email}?subject=${subject}&body=${body}`;

            // 3. Refresh Local History
            taHistory = await getSupervisorTAWorkflow($profile.id);
            addToast("success", `Support outreach logged for ${teacher.full_name}`);
        } catch (e) {
            console.error("Failed to log TA:", e);
            addToast("error", "Failed to record support action");
        } finally {
            isSubmittingSupport = false;
        }
    }

    function getSupportStatus(teacherId: string) {
        const history = taHistory.filter(h => h.teacher_id === teacherId);
        if (history.length === 0) return null;
        return history[0]; // Most recent
    }

    function formatTADate(dateStr: string) {
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
            addToast("success", "Intervention notes saved and status updated to Completed");
        } catch (e) {
            console.error("Save error:", e);
            addToast("error", "Failed to save notes");
        }
    }

    function buildHeatmap(calendar: any[] = []) {
        const currentWeek = getWeekNumber();
        const weekCount = 8;
        const weeks = [];

        if (calendar.length > 0) {
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
        } else {
            for (let i = weekCount - 1; i >= 0; i--) {
                const wk = currentWeek - i;
                if (wk >= 1)
                    weeks.push({ week: wk, label: `W${wk}`, deadline: null });
            }
        }

        heatmapWeeks = weeks;
        heatmapRows = teachers.map((t: Teacher) => t.full_name);

        const cells: any[] = [];
        for (const t of teachers) {
            const teacherSubs = allSubmissions.filter(
                (s: Submission) => s.user_id === t.id,
            );
            for (const w of weeks) {
                const weekSubs = teacherSubs.filter(
                    (s: Submission) => s.week_number === w.week,
                );
                const stats = calculateCompliance(weekSubs, t.loadCount);
                cells.push({
                    row: t.full_name,
                    week: w.week,
                    weekLabel: w.label,
                    rate: stats.rate,
                    count: weekSubs.length,
                    tooltip: `${t.full_name} - ${w.label}: ${stats.rate}% (${stats.Compliant} compliant, ${stats.Late} late, ${stats.NonCompliant} non-compliant)`,
                });
            }
        }
        heatmapCells = cells;
    }

    // Teacher table with sorting + search
    const sortedTeachers = $derived(() => {
        let result = teachers.map((t: Teacher) => {
            const subs = allSubmissions.filter(
                (s: Submission) => s.user_id === t.id,
            );
            // We use a promise inside derived which is not ideal, but for now we'll assume definedWeeks is pre-calculated or use a local reactive state
            // Actually, sortedTeachers is a $derived, so it should be synchronous.
            // I'll need to pre-fetch definedWeeks in loadSchoolData.
            const stats = calculateCompliance(
                subs,
                (t.loadCount || 0) * currentDefinedWeeks,
            );
            return { ...t, ...stats };
        });

        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            result = result.filter((t: any) =>
                t.full_name.toLowerCase().includes(q),
            );
        }

        result.sort((a: any, b: any) => {
            const aVal = a[sortField];
            const bVal = b[sortField];
            if (typeof aVal === "number" && typeof bVal === "number") {
                return sortDir === "asc" ? aVal - bVal : bVal - aVal;
            }
            return sortDir === "asc"
                ? String(aVal).localeCompare(String(bVal))
                : String(bVal).localeCompare(String(aVal));
        });

        return result;
    });

    function toggleSort(field: string) {
        if (sortField === field) sortDir = sortDir === "asc" ? "desc" : "asc";
        else {
            sortField = field;
            sortDir = field === "full_name" ? "asc" : "desc";
        }
    }

    function openDrillDown(teacher: any) {
        selectedTeacher = teacher;
        selectedSubmissions = allSubmissions
            .filter((s) => s.user_id === teacher.id)
            .slice(0, 20);
        showModal = true;
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
    <title>School Monitoring — Smart E-VISION</title>
</svelte:head>

<div>
    <!-- Header -->
    <div class="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
            <h1 class="text-2xl font-bold text-text-primary">
                School Compliance Monitor
            </h1>
            <p class="text-base text-text-secondary mt-1">
                Track teacher submissions and compliance rates
            </p>
        </div>

        {#if $profile?.role === 'School Head' && $profile?.school_id}
        <div class="flex items-center gap-4 bg-white p-4 rounded-2xl border border-gray-100 shadow-sm" in:fade>
            <ProfileUploader 
                id={$profile.school_id}
                bucket="avatars"
                path="schools"
                label="School Logo"
                size="md"
                placeholderIcon={SchoolIcon}
                bind:url={schoolLogoUrl} 
                onUpload={async (newUrl) => {
                    await supabase.from('schools').update({ avatar_url: newUrl }).eq('id', $profile?.school_id || '');
                    addToast("success", "School logo updated");
                }}
            />
            <div class="hidden sm:block">
                <h4 class="text-sm font-bold text-text-primary uppercase tracking-tight">School Branding</h4>
                <p class="text-[10px] text-text-muted font-medium">Official Institutional Logo</p>
            </div>
        </div>
        {/if}
    </div>

    {#if loading}
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {#each Array(4) as _}
                <div class="gov-card-static p-6 animate-pulse">
                    <div class="h-4 bg-gray-200 rounded w-24 mb-3"></div>
                    <div class="h-8 bg-gray-200 rounded w-16"></div>
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
                Performance Dashboard
            </button>
            <button 
                class="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all {activeTab === 'support' ? 'bg-white text-gov-blue shadow-sm' : 'text-text-muted hover:text-text-primary'}"
                onclick={() => activeTab = 'support'}
            >
                <HelpingHand size={18} />
                Instructional Support Hub
                {#if teachers.filter(t => t.risk && (t.risk.label === 'Critical' || t.risk.label === 'At-Risk')).length > 0}
                    <span class="w-2 h-2 bg-gov-red rounded-full animate-pulse"></span>
                {/if}
            </button>
        </div>

        {#if activeTab === 'performance'}
            <!-- KPI Cards -->
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
            <div in:fly={{ y: 20, duration: 400 }}>
                <StatCard
                    icon="Users"
                    value={kpi.totalTeachers}
                    label="Total Teachers"
                />
            </div>
            <div in:fly={{ y: 20, duration: 400, delay: 100 }}>
                <StatCard
                    icon="Activity"
                    value="{kpi.overallRate}%"
                    label="School Rate"
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
                    label="Compliance Leads"
                    color="from-gov-red to-red-700"
                />
            </div>
        </div>

        <!-- Heatmap + Trend Chart -->
        <div class="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-8">
            <div
                class="gov-card-static p-6"
                in:fly={{ y: 20, duration: 500, delay: 500 }}
            >
                <h3 class="text-lg font-bold text-text-primary mb-4">
                    Compliance Heatmap
                </h3>
                <ComplianceHeatmap
                    rows={heatmapRows}
                    weeks={heatmapWeeks}
                    cells={heatmapCells}
                    onCellClick={(row, week) => {
                        const teacher = teachers.find(
                            (t) => t.full_name === row,
                        );
                        if (teacher) openDrillDown(teacher);
                    }}
                />
            </div>

            <div
                class="gov-card-static p-6"
                in:fly={{ y: 20, duration: 500, delay: 600 }}
            >
                <h3 class="text-lg font-bold text-text-primary mb-4">
                    School vs Target
                </h3>
                {#if trendLabels.length > 0}
                    <ComplianceTrendChart
                        labels={trendLabels}
                        datasets={trendDatasets}
                        height={260}
                    />
                {:else}
                    <div
                        class="flex items-center justify-center h-[260px] text-text-muted"
                    >
                        <p>No trend data available yet</p>
                    </div>
                {/if}
            </div>
        </div>

        <!-- Teacher Table -->
        <div
            class="gov-card-static overflow-hidden"
            in:fade={{ duration: 500, delay: 700 }}
        >
            <div
                class="px-6 py-4 border-b border-gray-100 flex items-center justify-between flex-wrap gap-3"
            >
                <h3 class="text-lg font-bold text-text-primary">
                    Teacher Compliance
                </h3>
                <input
                    type="text"
                    bind:value={searchQuery}
                    placeholder="Search teacher..."
                    class="px-4 py-2 text-sm bg-white/60 border border-gray-200 rounded-xl focus:ring-2 focus:ring-gov-blue/30 focus:border-gov-blue outline-none w-56"
                />
            </div>

            {#if sortedTeachers().length === 0}
                <div class="p-10 text-center">
                    <p class="text-text-muted font-medium">No teachers found</p>
                </div>
            {:else}
                <div class="p-6">
                    <div
                        class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                    >
                        {#each sortedTeachers() as teacher}
                            <button
                                type="button"
                                class="bg-white border border-border-subtle rounded-xl p-6 shadow-sm hover:shadow-md hover:border-gov-blue/20 transition-all flex flex-col group cursor-pointer text-left w-full"
                                onclick={() => openDrillDown(teacher)}
                                in:fly={{ y: 20, duration: 400 }}
                            >
                                <div
                                    class="flex justify-between items-start mb-4"
                                >
                                    <div>
                                        <h4
                                            class="font-bold text-base text-text-primary group-hover:text-gov-blue transition-colors leading-tight"
                                        >
                                            {teacher.full_name}
                                        </h4>
                                        <p
                                            class="text-[10px] text-text-muted font-bold uppercase tracking-tight mt-1"
                                        >
                                            Total: {teacher.total} Documents
                                        </p>
                                    </div>
                                    <span
                                        class="px-2.5 py-1 rounded-full text-[10px] font-bold {getComplianceBgClass(
                                            teacher.rate,
                                        )} {getComplianceClass(
                                            teacher.rate,
                                        )} uppercase tracking-wide"
                                    >
                                        {teacher.rate}%
                                    </span>
                                </div>

                                <div class="grid grid-cols-3 gap-2 mb-6">
                                    <div
                                        class="bg-gov-green/5 p-2 rounded text-center"
                                    >
                                        <p
                                            class="text-[9px] font-bold text-gov-green uppercase leading-none mb-1"
                                        >
                                            Pass
                                        </p>
                                        <p
                                            class="text-xs font-bold text-text-primary"
                                        >
                                            {teacher.Compliant}
                                        </p>
                                    </div>
                                    <div
                                        class="bg-gov-gold/5 p-2 rounded text-center"
                                    >
                                        <p
                                            class="text-[9px] font-bold text-gov-gold-dark uppercase leading-none mb-1"
                                        >
                                            Late
                                        </p>
                                        <p
                                            class="text-xs font-bold text-text-primary"
                                        >
                                            {teacher.Late}
                                        </p>
                                    </div>
                                    <div
                                        class="bg-gov-red/5 p-2 rounded text-center"
                                    >
                                        <p
                                            class="text-[9px] font-bold text-gov-red uppercase leading-none mb-1"
                                        >
                                            Miss
                                        </p>
                                        <p
                                            class="text-xs font-bold text-text-primary"
                                        >
                                            {teacher.NonCompliant}
                                        </p>
                                    </div>
                                </div>

                                <div
                                    class="mt-auto pt-4 border-t border-gray-50"
                                >
                                    <div
                                        class="w-full py-2 bg-gov-blue/5 text-gov-blue group-hover:bg-gov-blue group-hover:text-white rounded-lg transition-all font-bold text-[10px] uppercase tracking-widest border border-gov-blue/10 flex items-center justify-center"
                                    >
                                        Analyze Individual Data
                                    </div>
                                </div>
                            </button>
                        {/each}
                    </div>
                </div>
            {/if}
        </div>
        {:else}
            {@const supportCandidates = teachers.filter(t => t.risk && (t.risk.label === 'Critical' || t.risk.label === 'At-Risk'))}
            <!-- Tab 2: Instructional Support Hub Content -->
            <div in:fade={{ duration: 400 }}>
                <!-- Summary Card -->
                <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
                    <div class="lg:col-span-2 gov-card-static p-8 border-l-4 border-gov-blue bg-gradient-to-r from-gov-blue/5 to-transparent">
                        <div class="flex items-start gap-4">
                            <div class="p-3 bg-gov-blue text-white rounded-2xl shadow-lg shadow-gov-blue/20">
                                <HelpingHand size={28} />
                            </div>
                            <div>
                                <h2 class="text-xl font-bold text-text-primary">Support Referral Hub</h2>
                                <p class="text-sm text-text-secondary mt-2 leading-relaxed max-w-xl">
                                    The AI engine has identified candidates who may benefit from Technical Assistance (TA). 
                                    Outreach tracked here informs your longitudinal coaching history.
                                </p>
                            </div>
                        </div>
                    </div>
                    <div class="gov-card-static p-6 flex flex-col justify-center items-center text-center">
                        <p class="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-2">Active Interventions</p>
                        <p class="text-4xl font-bold text-gov-blue tracking-tight">{taHistory.filter(h => h.status === 'Offered').length}</p>
                        <p class="text-[10px] text-text-secondary mt-2 font-medium">Outreach records created this period</p>
                    </div>
                </div>

                <!-- Section: Support Candidates -->
                <div class="mb-12">
                    <div class="flex items-center justify-between mb-6">
                        <h3 class="text-sm font-bold text-text-muted uppercase tracking-widest flex items-center gap-2">
                             <TrendingUp size={16} />
                             Support Recommendations
                        </h3>
                    </div>

                    {#if supportCandidates.length === 0}
                        <div class="bg-gov-green/5 border border-gov-green/20 rounded-2xl p-10 text-center">
                            <div class="w-12 h-12 bg-white text-gov-green rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
                                <CheckCircle2 size={24} />
                            </div>
                            <p class="text-sm font-bold text-gov-green-dark">Excellent Performance Detected</p>
                            <p class="text-xs text-text-secondary mt-1">No teachers currently require technical assistance referrals.</p>
                        </div>
                    {:else}
                        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {#each supportCandidates as teacher}
                                {@const lastSupport = getSupportStatus(teacher.id)}
                                <div class="gov-card p-6 flex flex-col hover:border-gov-blue/40 transition-all border-l-4 {teacher.risk?.label === 'Critical' ? 'border-l-gov-red' : 'border-l-gov-gold'}">
                                    <div class="flex justify-between items-start mb-6">
                                        <div class="max-w-[70%]">
                                            <h4 class="font-bold text-sm text-text-primary truncate">{teacher.full_name}</h4>
                                            <p class="text-[10px] text-text-muted mt-1 font-bold uppercase">{teacher.risk?.trend} PERFORMANCE</p>
                                        </div>
                                        <div class="flex flex-col items-end gap-1">
                                            <span class="px-2 py-0.5 rounded text-[9px] font-bold {teacher.risk?.label === 'Critical' ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'}">
                                                {teacher.risk?.label}
                                            </span>
                                            {#if lastSupport}
                                                <span class="flex items-center gap-1 text-[8px] font-bold text-gov-blue uppercase">
                                                    <CheckCircle2 size={8} /> Contacted
                                                </span>
                                            {/if}
                                        </div>
                                    </div>

                                    <div class="bg-surface-muted/50 rounded-lg p-4 mb-6">
                                        <p class="text-[11px] font-bold text-text-primary mb-1 flex items-center gap-2">
                                            <MessageSquare size={12} class="text-gov-blue" />
                                            System Diagnosis
                                        </p>
                                        <p class="text-[11px] text-text-secondary leading-relaxed">
                                            {teacher.risk?.message.replace('Risk', 'Support Need')}
                                        </p>
                                    </div>

                                    <div class="mt-auto pt-6 border-t border-gray-50 flex items-center gap-2">
                                        <button
                                            onclick={() => handleOfferSupport(teacher)}
                                            disabled={isSubmittingSupport}
                                            class="flex-1 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all
                                                {lastSupport 
                                                    ? 'bg-white border border-gov-blue text-gov-blue hover:bg-gov-blue hover:text-white' 
                                                    : 'bg-gov-blue text-white shadow-md shadow-gov-blue/20 hover:bg-gov-blue-dark'}"
                                        >
                                            {#if isSubmittingSupport}
                                                Processing...
                                            {:else}
                                                {lastSupport ? 'Re-Offer Support' : 'Offer Support'}
                                            {/if}
                                        </button>
                                        <button 
                                            onclick={() => openDrillDown(teacher)}
                                            class="p-2.5 rounded-xl border border-border-subtle text-text-muted hover:bg-white hover:text-gov-blue transition-all"
                                            title="View History"
                                        >
                                            <History size={16} />
                                        </button>
                                    </div>
                                    {#if lastSupport}
                                        <p class="text-[8px] text-text-muted mt-3 text-center italic">
                                            Last outreach recorded on {formatDate(lastSupport.offered_at)}
                                        </p>
                                    {/if}
                                </div>
                            {/each}
                        </div>
                    {/if}
                </div>

                <!-- Section: Outreach History -->
                <div in:fly={{ y: 20, duration: 400, delay: 200 }}>
                    <div class="flex items-center justify-between mb-6">
                        <h3 class="text-sm font-bold text-text-muted uppercase tracking-widest flex items-center gap-2">
                             <History size={16} />
                             Recent Intervention History
                        </h3>
                    </div>

                    {#if taHistory.length === 0}
                        <div class="gov-card-static p-12 text-center text-text-muted border-dashed">
                             <p class="text-xs font-medium">No intervention history recorded yet.</p>
                        </div>
                    {:else}
                        <div class="gov-card-static overflow-hidden">
                            <table class="w-full text-left border-collapse">
                                <thead class="bg-gray-50/50 text-[10px] font-bold text-text-muted uppercase tracking-widest border-b border-gray-100">
                                    <tr>
                                        <th class="px-6 py-4">Teacher</th>
                                        <th class="px-6 py-4">Intervention</th>
                                        <th class="px-6 py-4 text-center">Date</th>
                                        <th class="px-6 py-4 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody class="divide-y divide-gray-50 text-[11px] font-medium text-text-primary">
                                    {#each taHistory.slice(0, 5) as ta}
                                        {@const teacher = teachers.find(t => t.id === ta.teacher_id)}
                                        <tr class="hover:bg-gray-50/30 transition-colors">
                                            <td class="px-6 py-4 font-bold">{teacher?.full_name || 'Teacher'}</td>
                                            <td class="px-6 py-4">
                                                <div class="flex items-center gap-2">
                                                    <StatusBadge status={ta.status === 'Completed' ? 'compliant' : 'pending'} size="sm" />
                                                    {ta.support_type}
                                                </div>
                                            </td>
                                            <td class="px-6 py-4 text-center text-text-muted">{formatTADate(ta.offered_at)}</td>
                                            <td class="px-6 py-4 text-right">
                                                <button 
                                                    onclick={() => openNotes(ta)}
                                                    class="text-gov-blue hover:underline font-bold uppercase text-[9px]"
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

<!-- Drill-Down Modal -->
<DrillDownModal
    isOpen={showModal}
    title={selectedTeacher
        ? `Submissions: ${selectedTeacher.full_name}`
        : "Teacher Details"}
    onClose={() => {
        showModal = false;
        selectedTeacher = null;
    }}
>
    {#if selectedTeacher}
        {@const stats = calculateCompliance(selectedSubmissions)}
        <div class="grid grid-cols-3 gap-3 mb-4">
            <div class="text-center p-3 rounded-xl bg-gov-green/10">
                <p class="text-lg font-bold text-gov-green">
                    {stats.Compliant}
                </p>
                <p class="text-xs text-text-muted">Compliant</p>
            </div>
            <div class="text-center p-3 rounded-xl bg-gov-gold/10">
                <p class="text-lg font-bold text-gov-gold-dark">
                    {stats.Late}
                </p>
                <p class="text-xs text-text-muted">Late</p>
            </div>
            <div class="text-center p-3 rounded-xl bg-gov-red/10">
                <p class="text-lg font-bold text-gov-red">
                    {stats.NonCompliant}
                </p>
                <p class="text-xs text-text-muted">Non-compliant</p>
            </div>
        </div>

        {#if selectedSubmissions.length === 0}
            <p class="text-center text-text-muted py-6">No submissions found</p>
        {:else}
            <div class="divide-y divide-gray-100">
                {#each selectedSubmissions as sub}
                    {@const tl = Array.isArray(sub.teaching_loads)
                        ? sub.teaching_loads[0]
                        : sub.teaching_loads}
                    <div class="flex items-center justify-between py-3">
                        <div class="min-w-0">
                            <p
                                class="text-sm font-medium text-text-primary truncate"
                            >
                                {sub.file_name}
                            </p>
                            <p class="text-xs text-text-muted">
                                {sub.doc_type}
                                {#if tl}
                                    - {tl.subject} - Gr. {tl.grade_level}{/if}
                            </p>
                        </div>
                        <div class="flex items-center gap-3 flex-shrink-0">
                            <StatusBadge
                                status={sub.compliance_status === "on-time" ||
                                sub.compliance_status === "compliant"
                                    ? "compliant"
                                    : sub.compliance_status === "late"
                                      ? "late"
                                      : "non-compliant"}
                                size="sm"
                            />
                            <span class="text-xs text-text-muted"
                                >{formatDate(sub.created_at)}</span
                            >
                        </div>
                    </div>
                {/each}
            </div>
        {/if}
    {/if}
</DrillDownModal>

<!-- TA Notes Modal -->
<DrillDownModal
    isOpen={showNotesModal}
    title="Intervention Notes"
    onClose={() => showNotesModal = false}
>
    {#if selectedTA}
        {@const teacher = teachers.find(t => t.id === selectedTA?.teacher_id)}
        <div class="space-y-6">
            <div class="bg-gov-blue/5 p-4 rounded-xl border border-gov-blue/10">
                <p class="text-[10px] font-bold text-gov-blue uppercase tracking-widest mb-1">Teacher</p>
                <p class="text-sm font-bold text-text-primary">{teacher?.full_name}</p>
                <p class="text-[10px] text-text-muted mt-1 uppercase">Support Type: {selectedTA.support_type}</p>
            </div>

            <div>
                <label for="ta-notes" class="block text-[10px] font-bold text-text-muted uppercase tracking-widest mb-2">
                    Private Coaching Observations
                </label>
                <textarea
                    id="ta-notes"
                    bind:value={taNotes}
                    placeholder="Describe what was discussed, technical hurdles identified, and coaching provided..."
                    class="w-full h-40 p-4 text-sm bg-surface-muted/30 border border-border-subtle rounded-xl focus:ring-2 focus:ring-gov-blue/20 outline-none transition-all"
                ></textarea>
                <p class="text-[9px] text-text-muted mt-2 italic">
                    Note: Saving notes will automatically mark this intervention as 'Completed'.
                </p>
            </div>

            <div class="flex gap-3">
                <button
                    onclick={saveNotes}
                    class="flex-1 py-3 bg-gov-blue text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-gov-blue-dark shadow-lg shadow-gov-blue/20 transition-all"
                >
                    Save & Finalize Session
                </button>
            </div>
        </div>
    {/if}
</DrillDownModal>
