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
    import { School as SchoolIcon, Activity, Building2, LayoutDashboard, HelpingHand, MessageSquare, History, ExternalLink, CheckCircle2, TrendingUp, Clock } from "lucide-svelte";
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

    // State
    let teachers = $state<Teacher[]>([]);
    let allSubmissions = $state<Submission[]>([]);
    let loading = $state(true);
    let schoolLogoUrl = $state<string | null>(null);
    let currentDefinedWeeks = $state(1);
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

    // Modal State
    let showModal = $state(false);
    let selectedTeacher = $state<Teacher | null>(null);
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
        await loadSchoolData();
        loading = false;

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

        const res = await Promise.all([
            supabase.from('schools').select('avatar_url').eq('id', userProfile.school_id).single(),
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
            getDefinedWeeksCount(supabase),
            getSupervisorTAWorkflow(userProfile.id),
            supabase.from('technical_assistance').select('*, profiles(full_name)').eq('school_id', userProfile.school_id).order('created_at', { ascending: false })
        ]);

        const [schoolRes, teachersRes, subsRes, loadsRes, calendarRes, weeksRes, teacherTARes, schoolTARes] = res;

        teachers = (teachersRes.data || []).map((t: any) => t as Teacher);
        const schoolLoads = loadsRes.data || [];
        const districtId = teachers[0]?.district_id || userProfile.district_id;

        let calendar = (calendarRes.data || []) as any[];
        if (districtId) {
            calendar = calendar.filter(
                (c: any) => c.district_id === districtId,
            );
        }

        if (schoolRes.data) schoolLogoUrl = schoolRes.data.avatar_url;
        currentDefinedWeeks = weeksRes;
        
        // Merge teacher-level TA and school-level TA
        taHistory = [...(teacherTARes || []), ...(schoolTARes.data || [])];

        teachers = teachers.map((t: Teacher) => ({
            ...t,
            loadCount: schoolLoads.filter((l: any) => l.user_id === t.id).length,
        }));

        allSubmissions = (subsRes.data || []).map((s: any) => s as Submission);
        const teacherIds = new Set(teachers.map((t: Teacher) => t.id));
        allSubmissions = allSubmissions.filter((s: Submission) =>
            teacherIds.has(s.user_id),
        );

        const totalSchoolLoads = teachers.reduce(
            (sum: number, t: Teacher) => sum + (t.loadCount || 0),
            0,
        );

        const cumulativeExpectedDistrict = totalSchoolLoads * currentDefinedWeeks;
        const overallStats = calculateCompliance(allSubmissions, cumulativeExpectedDistrict);
        
        kpi.totalTeachers = teachers.length;
        kpi.overallRate = overallStats.rate;
        kpi.lateCount = overallStats.Late;

        kpi.atRiskCount = teachers.filter((t: Teacher) => {
            const subs = allSubmissions.filter((s: Submission) => s.user_id === t.id);
            t.risk = analyzeComplianceRisk(subs);
            const stats = calculateCompliance(subs, (t.loadCount || 0) * currentDefinedWeeks);
            return stats.rate < 70 && subs.length > 0;
        }).length;

        const currentWk = getWeekNumber();
        const prevWkSubs = allSubmissions.filter((s: Submission) => (s.week_number || getWeekNumber(s.created_at)) === currentWk - 1);
        const prevStats = calculateCompliance(prevWkSubs, totalSchoolLoads);
        kpi.previousRate = prevStats.rate;

        buildHeatmap(calendar);
        
        const weeklyData = groupSubmissionsByWeek(allSubmissions, totalSchoolLoads, 8, calendar);
        trendLabels = weeklyData.map(w => w.label);
        trendDatasets = [
            {
                label: "Pass Rate",
                data: weeklyData.map(w => w.rate),
                color: "#16a34a"
            },
            {
                label: "Target",
                data: weeklyData.map(() => 80),
                color: "#dc2626",
                dashed: true
            }
        ];
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
        for (const [rowIdx, t] of teachers.entries()) {
            const teacherSubs = allSubmissions.filter((s: Submission) => s.user_id === t.id);
            for (const [colIdx, w] of weeks.entries()) {
                const weekSubs = teacherSubs.filter((s: Submission) => (s.week_number || getWeekNumber(s.created_at)) === w.week);
                const stats = calculateCompliance(weekSubs, t.loadCount);
                cells.push({
                    row: rowIdx,
                    col: colIdx,
                    value: stats.rate,
                    count: weekSubs.length,
                    tooltip: `${t.full_name} - ${w.label}: ${stats.rate}%`
                });
            }
        }
        heatmapCells = cells;
    }

    const sortedTeachers = $derived(() => {
        let result = teachers.map((t: Teacher) => {
            const subs = allSubmissions.filter((s: Submission) => s.user_id === t.id);
            const stats = calculateCompliance(subs, (t.loadCount || 0) * currentDefinedWeeks);
            return { ...t, ...stats };
        });

        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            result = result.filter((t: any) => t.full_name.toLowerCase().includes(q));
        }

        result.sort((a: any, b: any) => {
            const aVal = a[sortField];
            const bVal = b[sortField];
            if (typeof aVal === "number" && typeof bVal === "number") {
                return sortDir === "asc" ? aVal - bVal : bVal - aVal;
            }
            return sortDir === "asc" ? String(aVal).localeCompare(String(bVal)) : String(bVal).localeCompare(String(aVal));
        });

        return result;
    });

    async function handleOfferSupport(teacher: Teacher) {
        if (!$profile?.id || isSubmittingSupport) return;
        isSubmittingSupport = true;
        try {
            const { error } = await logTAOutreach(supabase, $profile.id, { teacherId: teacher.id });
            if (error) throw error;
            taHistory = await getSupervisorTAWorkflow($profile.id);
            addToast("success", `Support outreach logged for ${teacher.full_name}`);
        } catch (e) {
            console.error("Failed to log TA:", e);
            addToast("error", "Failed to record support action");
        } finally {
            isSubmittingSupport = false;
        }
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
            await loadSchoolData();
            showNotesModal = false;
            addToast("success", "Intervention notes saved and finalized");
        } catch (e) {
            console.error("Save error:", e);
            addToast("error", "Failed to save notes");
        }
    }

    function openDrillDown(teacher: Teacher) {
        selectedTeacher = teacher;
        selectedSubmissions = allSubmissions.filter(s => s.user_id === teacher.id);
        showModal = true;
    }

    function getPredictionInsight(risk: PredictionResult | undefined) {
        if (!risk) return "Monitoring pedagogical trajectory...";
        return risk.insight;
    }
</script>

<div class="p-8 max-w-[1600px] mx-auto min-h-screen bg-surface-muted/30">
    {#if loading}
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
            {#each Array(4) as _}
                <div class="gov-card-static p-6 animate-pulse">
                    <div class="h-4 bg-gray-200 rounded w-24 mb-3"></div>
                    <div class="h-8 bg-gray-200 rounded w-16"></div>
                </div>
            {/each}
        </div>
    {:else}
        <!-- Header -->
        <header class="flex justify-between items-start mb-10">
            <div class="flex items-center gap-6">
                <ProfileUploader
                    targetTable="schools"
                    targetId={$profile?.school_id || ""}
                    currentUrl={schoolLogoUrl}
                    onUploadComplete={(url) => (schoolLogoUrl = url)}
                />
                <div>
                    <h1 class="text-3xl font-black text-text-primary tracking-tight">School Monitoring</h1>
                    <p class="text-sm text-text-muted font-bold uppercase tracking-widest mt-1">Institutional Health & Pedagogy</p>
                </div>
            </div>
        </header>

        <!-- Tab Navigation -->
        <div class="flex items-center gap-1 bg-surface-muted/50 p-1.5 rounded-2xl border border-border-subtle mb-10 w-fit">
            <button 
                class="flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold transition-all {activeTab === 'performance' ? 'bg-white text-gov-blue shadow-sm' : 'text-text-muted hover:text-text-primary'}"
                onclick={() => activeTab = 'performance'}
            >
                <LayoutDashboard size={16} />
                Performance
            </button>
            <button 
                class="flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold transition-all {activeTab === 'institutional' ? 'bg-white text-gov-blue shadow-sm' : 'text-text-muted hover:text-text-primary'}"
                onclick={() => activeTab = 'institutional'}
            >
                <Building2 size={16} />
                Institutional Hub
            </button>
            <button 
                class="flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold transition-all {activeTab === 'instructional' ? 'bg-white text-gov-blue shadow-sm' : 'text-text-muted hover:text-text-primary'}"
                onclick={() => activeTab = 'instructional'}
            >
                <HelpingHand size={16} />
                Instructional Hub
                {#if teachers.filter(t => t.risk && (t.risk.label === 'Critical' || t.risk.label === 'At-Risk')).length > 0}
                    <span class="w-2 h-2 bg-gov-red rounded-full animate-pulse ml-1"></span>
                {/if}
            </button>
        </div>

        {#if activeTab === 'performance'}
            <!-- KPI Cards -->
            <div class="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
                <StatCard icon={Activity} value={kpi.totalTeachers} label="Total Faculty" variant="blue" />
                <StatCard icon={TrendingUp} value="{kpi.overallRate}%" label="School Rate" trend={getTrendDirection(kpi.overallRate, kpi.previousRate)} variant="indigo" />
                <StatCard icon={Clock} value={kpi.lateCount} label="Late Records" variant="amber" />
                <StatCard icon={HelpingHand} value={kpi.atRiskCount} label="Support Leads" variant="red" />
            </div>

            <!-- Visualizations -->
            <div class="grid grid-cols-1 xl:grid-cols-2 gap-8 mb-10">
                <div class="gov-card p-6">
                    <h3 class="text-sm font-bold text-text-primary uppercase tracking-widest mb-6">Faculty Heatmap</h3>
                    <ComplianceHeatmap rows={teachers.map(t => t.full_name)} weeks={heatmapWeeks} cells={heatmapCells} />
                </div>
                <div class="gov-card p-6">
                    <h3 class="text-sm font-bold text-text-primary uppercase tracking-widest mb-6">Compliance Trajectory</h3>
                    <ComplianceTrendChart labels={trendLabels} datasets={trendDatasets} />
                </div>
            </div>

            <!-- Teacher Directory -->
            <div class="gov-card overflow-hidden">
                <div class="p-6 bg-surface-muted/30 border-b border-border-subtle flex flex-col md:flex-row justify-between items-center gap-4">
                    <h3 class="text-sm font-bold text-text-primary uppercase tracking-widest">Faculty Directory</h3>
                    <div class="relative group">
                         <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-text-muted group-focus-within:text-gov-blue transition-colors">
                            <Activity size={14} />
                        </div>
                        <input type="text" bind:value={searchQuery} placeholder="Search faculty..." class="pl-10 pr-4 py-2 text-[11px] font-bold bg-white border border-border-subtle rounded-md outline-none focus:ring-2 focus:ring-gov-blue/20 w-72 transition-all" />
                    </div>
                </div>
                <div class="overflow-x-auto">
                    <table class="w-full text-left">
                        <thead class="bg-gray-50/50 text-[10px] font-black text-text-muted uppercase tracking-widest border-b border-gray-100">
                            <tr>
                                <th class="px-6 py-4">Faculty Member</th>
                                <th class="px-6 py-4">Rate</th>
                                <th class="px-6 py-4">Pass</th>
                                <th class="px-6 py-4">Late</th>
                                <th class="px-6 py-4">Miss</th>
                                <th class="px-6 py-4 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-gray-50 text-[11px]">
                            {#each sortedTeachers() as teacher}
                                <tr class="hover:bg-gray-50/30 transition-colors group">
                                    <td class="px-6 py-4">
                                        <div class="font-bold text-text-primary">{teacher.full_name}</div>
                                        <div class="text-[9px] text-text-muted">{teacher.email}</div>
                                    </td>
                                    <td class="px-6 py-4"><span class="font-black {getComplianceClass(teacher.rate || 0)}">{teacher.rate}%</span></td>
                                    <td class="px-6 py-4 font-bold text-gov-green">{teacher.Compliant}</td>
                                    <td class="px-6 py-4 font-bold text-gov-gold-dark">{teacher.Late}</td>
                                    <td class="px-6 py-4 font-bold text-gov-red">{teacher.NonCompliant}</td>
                                    <td class="px-6 py-4 text-right">
                                        <button onclick={() => openDrillDown(teacher)} class="px-4 py-1.5 bg-gov-blue/5 text-gov-blue rounded-lg font-black text-[9px] uppercase tracking-widest hover:bg-gov-blue hover:text-white transition-all border border-gov-blue/10">View Analysis</button>
                                    </td>
                                </tr>
                            {/each}
                        </tbody>
                    </table>
                </div>
            </div>

        {:else if activeTab === 'institutional'}
            <!-- Institutional Hub -->
            <div in:fade>
                <div class="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-10">
                    <div class="lg:col-span-3 gov-card-static p-8 border-l-4 border-gov-blue bg-gradient-to-r from-gov-blue/5 to-transparent relative overflow-hidden">
                        <div class="absolute top-0 right-0 p-8 opacity-10 rotate-12"><Building2 size={120} /></div>
                        <div class="flex items-start gap-6 relative z-10">
                            <div class="p-4 bg-gov-blue text-white rounded-2xl shadow-xl shadow-gov-blue/20"><Building2 size={32} /></div>
                            <div>
                                <h2 class="text-2xl font-bold text-text-primary tracking-tight">Institutional Support Tracking</h2>
                                <p class="text-sm text-text-secondary mt-2 leading-relaxed max-w-2xl font-medium">Strategic Oversight Workstation. Monitor the institutional technical assistance provided by the District Supervisor to the school leadership.</p>
                            </div>
                        </div>
                    </div>
                     <div class="gov-card-static p-6 flex flex-col justify-center items-center text-center bg-white border-dashed border-2 border-gov-blue/20">
                        <div class="w-12 h-12 rounded-full bg-gov-blue/10 flex items-center justify-center mb-3 text-gov-blue"><History size={20} /></div>
                        <p class="text-[10px] font-bold text-text-muted uppercase tracking-widest">Received TA</p>
                        <p class="text-4xl font-black text-gov-blue">{taHistory.filter(h => h.school_id && !h.teacher_id).length}</p>
                    </div>
                </div>

                <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div class="lg:col-span-2 space-y-6">
                        <h3 class="text-sm font-bold text-text-primary uppercase tracking-widest">Institutional Health Cycle</h3>
                        <div class="gov-card p-10 bg-gradient-to-br from-white to-gray-50/50 flex flex-col md:flex-row items-center gap-12">
                            <div class="relative w-48 h-48 flex items-center justify-center">
                                <svg class="w-full h-full transform -rotate-90">
                                    <circle cx="96" cy="96" r="88" fill="transparent" stroke="#f3f4f6" stroke-width="12" />
                                    <circle cx="96" cy="96" r="88" fill="transparent" stroke="currentColor" stroke-width="12" class="{getComplianceClass(kpi.overallRate)} transition-all duration-1000" stroke-dasharray="552.92" stroke-dashoffset={552.92 - (552.92 * kpi.overallRate) / 100} />
                                </svg>
                                <div class="absolute inset-0 flex flex-col items-center justify-center">
                                    <span class="text-4xl font-black text-text-primary">{kpi.overallRate}%</span>
                                    <span class="text-[10px] font-bold text-text-muted uppercase tracking-widest">Compliance</span>
                                </div>
                            </div>
                            <div class="flex-1">
                                <h4 class="text-lg font-bold text-text-primary mb-2">School Compliance Maturity</h4>
                                <p class="text-xs text-text-secondary leading-relaxed mb-6">Aggregate performance of all instructional loads for the current academic year. Critical for district accreditation and quality assurance.</p>
                                <div class="grid grid-cols-2 gap-4">
                                     <div class="p-4 bg-white border border-border-subtle rounded-xl"><p class="text-[9px] font-black text-text-muted uppercase">Expected</p><p class="text-xl font-black text-gov-blue">{teachers.reduce((s,t) => s + (t.loadCount || 0), 0) * currentDefinedWeeks}</p></div>
                                     <div class="p-4 bg-white border border-border-subtle rounded-xl"><p class="text-[9px] font-black text-text-muted uppercase">Archived</p><p class="text-xl font-black text-gov-green">{allSubmissions.length}</p></div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="space-y-6">
                        <h3 class="text-sm font-bold text-text-primary uppercase tracking-widest">District Coaching Registry</h3>
                        <div class="gov-card-static max-h-[500px] overflow-y-auto divide-y divide-gray-50">
                            {#each taHistory.filter(h => h.school_id && !h.teacher_id) as ta}
                                <div class="p-5 flex gap-4">
                                    <div class="w-10 h-10 rounded-xl bg-gov-blue/10 flex items-center justify-center text-gov-blue shrink-0"><MessageSquare size={18} /></div>
                                    <div class="min-w-0 flex-1">
                                        <p class="text-[11px] font-bold text-text-primary italic">"{ta.session_notes || 'Coaching session logged...'}"</p>
                                        <div class="mt-3 flex items-center justify-between"><span class="text-[8px] font-black uppercase text-text-muted">{new Date(ta.created_at).toLocaleDateString()}</span><span class="text-[8px] font-black uppercase text-gov-blue bg-gov-blue/5 px-2 py-0.5 rounded">Supervisor Logged</span></div>
                                    </div>
                                </div>
                            {:else}
                                <div class="p-12 text-center text-text-muted text-[10px] items-center flex flex-col gap-2 font-bold uppercase"><MessageSquare size={32} class="opacity-10" />No institutional logs</div>
                            {/each}
                        </div>
                    </div>
                </div>
            </div>

        {:else if activeTab === 'instructional'}
            <!-- Instructional Hub -->
            <div in:fade>
                <div class="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-10">
                    <div class="lg:col-span-3 gov-card-static p-8 border-l-4 border-gov-gold bg-gradient-to-r from-gov-gold/5 to-transparent relative overflow-hidden">
                        <div class="absolute top-0 right-0 p-8 opacity-10 rotate-12 text-gov-gold"><HelpingHand size={120} /></div>
                        <div class="flex items-start gap-6 relative z-10">
                            <div class="p-4 bg-gov-gold text-white rounded-2xl shadow-xl shadow-gov-gold/20"><HelpingHand size={32} /></div>
                            <div>
                                <h2 class="text-2xl font-bold text-text-primary tracking-tight">Instructional Support Hub</h2>
                                <p class="text-sm text-text-secondary mt-2 leading-relaxed max-w-2xl font-medium">Pedagogical Monitoring Workstation. Analyze performance, identify support leads using predictive diagnostics, and record Technical Assistance.</p>
                            </div>
                        </div>
                    </div>
                    <div class="gov-card-static p-6 flex flex-col justify-center items-center text-center bg-white border-dashed border-2 border-gov-gold/20">
                        <div class="w-12 h-12 rounded-full bg-gov-gold/10 flex items-center justify-center mb-3 text-gov-gold"><Activity size={20} /></div>
                        <p class="text-[10px] font-bold text-text-muted uppercase tracking-widest">Coaching Logs</p>
                        <p class="text-4xl font-black text-gov-gold-dark">{taHistory.filter(h => h.teacher_id).length}</p>
                    </div>
                </div>

                <div class="grid grid-cols-1 xl:grid-cols-3 gap-8">
                    <div class="xl:col-span-2 space-y-6">
                        <h3 class="text-sm font-bold text-text-primary uppercase tracking-widest">Support Recommendations</h3>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {#each teachers.filter(t => (t.risk?.score || 0) > 40) as teacher}
                                {@const lastSupport = taHistory.find(h => h.teacher_id === teacher.id)}
                                <div class="gov-card p-6 flex flex-col border-l-4 {(teacher.risk?.score || 0) > 60 ? 'border-l-gov-red' : 'border-l-gov-gold'}">
                                     <div class="flex justify-between items-start mb-6">
                                        <div class="min-w-0 pr-4"><h4 class="font-bold text-sm text-text-primary truncate">{teacher.full_name}</h4><p class="text-[9px] text-text-muted mt-1 uppercase font-bold tracking-tight">Predictive Diagnostic</p></div>
                                        <span class="px-2 py-0.5 rounded text-[9px] font-bold {(teacher.risk?.score || 0) > 60 ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'}">{teacher.risk?.label || 'Moderate'}</span>
                                     </div>
                                     <div class="bg-surface-muted/50 rounded-xl p-4 mb-6"><p class="text-[10px] text-text-secondary leading-relaxed italic">"{getPredictionInsight(teacher.risk)}"</p></div>
                                     <button onclick={() => handleOfferSupport(teacher)} class="mt-auto w-full py-2.5 {lastSupport ? 'bg-white border-2 border-gov-blue text-gov-blue' : 'bg-gov-blue text-white'} rounded-xl text-[10px] font-black uppercase tracking-widest transition-all">{lastSupport ? 'Extend Coaching' : 'Initiate TA'}</button>
                                </div>
                            {:else}
                                <div class="col-span-full p-12 text-center bg-gov-green/5 border-2 border-dashed border-gov-green/20 rounded-2xl"><CheckCircle2 size={32} class="text-gov-green mx-auto mb-4" /><p class="text-[10px] font-black uppercase text-gov-green-dark tracking-widest">Clean Pedagogical Slate</p></div>
                            {/each}
                        </div>
                    </div>
                    <div class="space-y-6">
                         <h3 class="text-sm font-bold text-text-primary uppercase tracking-widest flex items-center gap-2"><History size={16} /> Pedagogical Registry</h3>
                         <div class="gov-card-static max-h-[600px] overflow-y-auto divide-y divide-gray-50 font-black uppercase">
                             {#each taHistory.filter(h => h.teacher_id) as ta}
                                <button class="w-full p-4 text-left hover:bg-gray-50 flex gap-4 items-center group" onclick={() => {selectedTA = ta; taNotes = ta.session_notes || ""; showNotesModal = true;}}>
                                    <div class="w-10 h-10 rounded-xl bg-gov-gold/10 flex items-center justify-center text-gov-gold group-hover:bg-gov-gold group-hover:text-white transition-all text-sm">{ta.profiles?.full_name?.charAt(0) || 'T'}</div>
                                    <div class="flex-1 min-w-0"><p class="text-xs truncate">{ta.profiles?.full_name}</p><p class="text-[9px] text-text-muted">{new Date(ta.created_at).toLocaleDateString()}</p></div>
                                </button>
                             {:else}
                                <div class="p-10 text-center text-text-muted text-[10px] tracking-widest font-bold">No instructional logs</div>
                             {/each}
                         </div>
                    </div>
                </div>
            </div>
        {/if}
    {/if}
</div>

<!-- Modals -->
<DrillDownModal isOpen={showModal} title={selectedTeacher ? `Pedagogical Analysis: ${selectedTeacher.full_name}` : "Faculty Detailed View"} onClose={() => (showModal = false)}>
    {#if selectedTeacher}
        <div class="space-y-6">
            <div class="grid grid-cols-2 gap-4">
                <div class="bg-gov-blue/5 p-4 rounded-xl border border-gov-blue/10"><p class="text-[10px] font-black text-text-muted uppercase mb-1">Pass Rate</p><p class="text-2xl font-black {getComplianceClass(selectedTeacher.rate || 0)}">{selectedTeacher.rate}%</p></div>
                <div class="bg-gov-red/5 p-4 rounded-xl border border-gov-red/10"><p class="text-[10px] font-black text-text-muted uppercase mb-1">Missed</p><p class="text-2xl font-black text-gov-red">{selectedTeacher.NonCompliant}</p></div>
            </div>
            <div class="bg-surface-muted/30 p-5 rounded-2xl">
                 <h4 class="text-sm font-bold text-text-primary mb-2 flex items-center gap-2"><Activity size={16} class="text-gov-gold" /> Predictive Insight</h4>
                 <p class="text-xs text-text-secondary leading-relaxed font-bold italic">"{getPredictionInsight(selectedTeacher.risk)}"</p>
            </div>
             <div class="divide-y divide-gray-100 max-h-[400px] overflow-y-auto pr-2">
                {#each selectedSubmissions as sub}
                    <div class="py-4 flex items-center justify-between">
                        <div class="min-w-0 pr-4"><p class="text-xs font-bold text-text-primary truncate">{sub.file_name}</p><p class="text-[9px] text-text-muted uppercase font-black">{sub.doc_type} - WK{sub.week_number}</p></div>
                        <StatusBadge status={sub.compliance_status} size="sm" />
                    </div>
                {/each}
            </div>
        </div>
    {/if}
</DrillDownModal>

<DrillDownModal isOpen={showNotesModal} title="Technical Assistance Registry" onClose={() => showNotesModal = false}>
    {#if selectedTA}
        <div class="space-y-6">
             <div class="bg-surface-muted/30 p-4 rounded-xl border border-border-subtle"><p class="text-[9px] font-bold text-text-muted uppercase mb-1">Target Individual</p><p class="text-sm font-bold text-text-primary">{selectedTA.profiles?.full_name || 'Teacher'}</p></div>
             <div>
                <label for="ta-notes" class="block text-[9px] font-bold text-text-muted uppercase mb-2">Technical Guidance & Mentoring Notes</label>
                <textarea id="ta-notes" bind:value={taNotes} class="w-full h-40 p-4 text-xs bg-white border border-border-subtle rounded-xl focus:ring-2 focus:ring-gov-blue/20 outline-none transition-all" placeholder="Enter session outcomes..."></textarea>
             </div>
             <button onclick={saveNotes} class="w-full py-4 bg-gov-blue text-white rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-gov-blue-dark shadow-xl shadow-gov-blue/20 transition-all">Finalize Intervention</button>
        </div>
    {/if}
</DrillDownModal>
