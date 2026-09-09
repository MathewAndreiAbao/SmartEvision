<script lang="ts">
    import { profile } from "$lib/utils/auth";
    import DashboardCards from "$lib/components/DashboardCards.svelte";
    import SubmissionTable from "$lib/components/SubmissionTable.svelte";
    import { onMount } from "svelte";
    import {
        getTeacherDashboardData,
        getMasterTeacherDashboardData,
        getSchoolHeadDashboardData,
        getDistrictSupervisorDashboardData,
        calculateComplianceBySchool,
        calculateComplianceByTeacher,
        groupSubmissionsByWeek
    } from "$lib/utils/dashboardQueries";
    import { CheckCircle, AlertCircle, Clock, FileText, Users, Building2, TrendingUp, AlertTriangle } from "lucide-svelte";

    let loading = $state(true);
    let dashboardData = $state<any>(null);
    let sortField = $state('created_at');
    let sortDir = $state<'asc' | 'desc'>('desc');
    let searchQuery = $state('');
    let filterStatus = $state('all');

    onMount(async () => {
        try {
            if ($profile) {
                const role = $profile.role;
                const userId = $profile.id;
                const schoolId = $profile.school_id;
                const districtId = $profile.district_id;

                if (role === 'Teacher') {
                    dashboardData = await getTeacherDashboardData(userId, schoolId, districtId);
                } else if (role === 'Master Teacher') {
                    dashboardData = await getMasterTeacherDashboardData(userId, schoolId, districtId);
                } else if (role === 'School Head') {
                    dashboardData = await getSchoolHeadDashboardData(userId, schoolId, districtId);
                } else if (role === 'District Supervisor') {
                    dashboardData = await getDistrictSupervisorDashboardData(districtId);
                }
            }
        } catch (err) {
            console.error('[dashboard] Failed to load role-specific dashboard:', err);
        } finally {
            loading = false;
        }
    });

    // Calculate stats based on role
    const stats = $derived.by(() => {
        if (!dashboardData) return { compliant: 0, late: 0, missing: 0, total: 0, rate: 0 };

        const allSubmissions = dashboardData.submissions ||
            dashboardData.mySubmissions ||
            dashboardData.myISPISR ||
            dashboardData.allSubmissions ||
            [];

        const compliant = allSubmissions.filter((s: any) => s.compliance_status === 'compliant').length;
        const late = allSubmissions.filter((s: any) => s.compliance_status === 'late').length;
        const missing = allSubmissions.filter((s: any) => s.compliance_status === 'missing').length;
        const total = allSubmissions.length;

        return {
            compliant,
            late,
            missing,
            total,
            rate: total > 0 ? Math.round((compliant / total) * 100) : 0
        };
    });
</script>

<svelte:head>
    <title>Dashboard Overview — CEDIMS</title>
</svelte:head>

    <div class="space-y-8">
        <!-- Header -->
        <div class="mb-8">
            <h1 class="text-3xl font-bold text-text-primary">
                {#if $profile?.role === 'Teacher'}
                    My Submissions
                {:else if $profile?.role === 'Master Teacher'}
                    School Overview
                {:else if $profile?.role === 'School Head'}
                    {$profile.full_name}'s School
                {:else}
                    District Compliance Overview
                {/if}
            </h1>
            <p class="text-text-secondary mt-2">
                {#if $profile?.role === 'Teacher'}
                    Track your DLL submissions and compliance status
                {:else if $profile?.role === 'Master Teacher'}
                    Monitor your school's DLL submissions and your ISP/ISR documents
                {:else if $profile?.role === 'School Head'}
                    Manage school performance, teacher submissions, and your administrative documents
                {:else}
                    Comprehensive district-wide compliance metrics and submission overview
                {/if}
            </p>
        </div>

        <!-- Key Metrics -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <DashboardCards
                title="Compliant Submissions"
                value={stats.compliant}
                variant="success"
                icon={CheckCircle}
                subtitle="On-time submissions"
            />
            <DashboardCards
                title="Late Submissions"
                value={stats.late}
                variant="warning"
                icon={Clock}
                subtitle="Submitted after deadline"
            />
            <DashboardCards
                title="Missing Submissions"
                value={stats.missing}
                variant="danger"
                icon={AlertTriangle}
                subtitle="Not yet submitted"
            />
            <DashboardCards
                title="Compliance Rate"
                value={stats.rate}
                unit="%"
                variant="info"
                icon={TrendingUp}
                subtitle="Overall performance"
            />
        </div>

        <!-- Role-Specific Content -->
        {#if $profile?.role === 'Teacher'}
            <div class="space-y-8">
                <!-- Teaching Loads -->
                {#if dashboardData?.teachingLoads && dashboardData.teachingLoads.length > 0}
                    <div class="gov-card-static p-6">
                        <h2 class="text-xl font-bold text-text-primary mb-4">My Teaching Loads</h2>
                        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {#each dashboardData.teachingLoads as load}
                                <div class="p-4 border border-border-subtle rounded-lg hover:border-gov-blue/30 transition-colors">
                                    <p class="font-semibold text-text-primary">{load.subject}</p>
                                    <p class="text-sm text-text-secondary">Grade {load.grade_level}</p>
                                </div>
                            {/each}
                        </div>
                    </div>
                {/if}

                <!-- Upcoming Deadlines -->
                {#if dashboardData?.upcomingDeadlines && dashboardData.upcomingDeadlines.length > 0}
                    <div class="gov-card-static p-6">
                        <h2 class="text-xl font-bold text-text-primary mb-4">Upcoming Deadlines</h2>
                        <div class="space-y-3">
                            {#each dashboardData.upcomingDeadlines as deadline}
                                <div class="flex items-center justify-between p-4 border border-border-subtle rounded-lg bg-surface-muted/30">
                                    <div>
                                        <p class="font-semibold text-text-primary">Week {deadline.week_number}</p>
                                        <p class="text-sm text-text-secondary">{new Date(deadline.deadline_date).toLocaleDateString('en-PH')}</p>
                                    </div>
                                    <Clock size={20} class="text-gov-gold-dark" />
                                </div>
                            {/each}
                        </div>
                    </div>
                {/if}

                <!-- Recent Remarks -->
                {#if dashboardData?.remarks && dashboardData.remarks.length > 0}
                    <div class="gov-card-static p-6">
                        <h2 class="text-xl font-bold text-text-primary mb-4">Remarks from Supervisors</h2>
                        <div class="space-y-4">
                            {#each dashboardData.remarks.slice(0, 5) as remark}
                                <div class="p-4 border border-gov-blue/20 rounded-lg bg-gov-blue/5">
                                    <div class="flex items-start justify-between mb-2">
                                        <p class="font-semibold text-text-primary">{remark.profiles?.full_name}</p>
                                        <span class="text-xs font-semibold px-2 py-1 rounded bg-gov-gold/20 text-gov-gold-dark uppercase">{remark.status}</span>
                                    </div>
                                    <p class="text-sm text-text-secondary">{remark.reviewer_comment}</p>
                                    <p class="text-xs text-text-muted mt-2">{new Date(remark.created_at).toLocaleDateString('en-PH')}</p>
                                </div>
                            {/each}
                        </div>
                    </div>
                {/if}
            </div>

        {:else if $profile?.role === 'Master Teacher'}
            <div class="space-y-8">
                <!-- School Overview Stats -->
                {#if dashboardData?.schoolDLLStats}
                    {@const complianceByTeacher = calculateComplianceByTeacher(dashboardData.schoolDLLStats)}
                    <div class="gov-card-static p-6">
                        <h2 class="text-xl font-bold text-text-primary mb-4">School DLL Submission Status</h2>
                        <div class="overflow-x-auto">
                            <table class="w-full text-sm">
                                <thead>
                                    <tr class="border-b border-border-subtle">
                                        <th class="text-left py-3 px-4 font-semibold text-text-secondary uppercase text-xs">Teacher</th>
                                        <th class="text-left py-3 px-4 font-semibold text-text-secondary uppercase text-xs">Compliant</th>
                                        <th class="text-left py-3 px-4 font-semibold text-text-secondary uppercase text-xs">Late</th>
                                        <th class="text-left py-3 px-4 font-semibold text-text-secondary uppercase text-xs">Missing</th>
                                        <th class="text-left py-3 px-4 font-semibold text-text-secondary uppercase text-xs">Compliance Rate</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {#each complianceByTeacher.slice(0, 10) as comp}
                                        <tr class="border-b border-border-subtle hover:bg-surface-muted/50">
                                            <td class="py-4 px-4 font-medium text-text-primary">{comp.teacher}</td>
                                            <td class="py-4 px-4"><span class="text-gov-green font-semibold">{comp.compliant}</span></td>
                                            <td class="py-4 px-4"><span class="text-gov-gold-dark font-semibold">{comp.late}</span></td>
                                            <td class="py-4 px-4"><span class="text-gov-red font-semibold">{comp.missing}</span></td>
                                            <td class="py-4 px-4">
                                                <div class="flex items-center gap-2">
                                                    <div class="w-full bg-surface-muted rounded-full h-2">
                                                        <div
                                                            class="bg-gov-green h-2 rounded-full"
                                                            style="width: {comp.rate}%"
                                                        ></div>
                                                    </div>
                                                    <span class="font-semibold text-text-primary whitespace-nowrap">{comp.rate}%</span>
                                                </div>
                                            </td>
                                        </tr>
                                    {/each}
                                </tbody>
                            </table>
                        </div>
                    </div>
                {/if}

                <!-- My ISP/ISR -->
                {#if dashboardData?.myISPISRSubmissions}
                    <SubmissionTable
                        submissions={dashboardData.myISPISRSubmissions}
                        title="My ISP/ISR Documents"
                        {sortField}
                        {sortDir}
                        on:sortchange={(e) => sortField = e.detail}
                        {searchQuery}
                        on:searchchange={(e) => searchQuery = e.detail}
                    />
                {/if}
            </div>

        {:else if $profile?.role === 'School Head'}
            <div class="space-y-8">
                <!-- School Teachers -->
                {#if dashboardData?.schoolTeachers}
                    <div class="gov-card-static p-6">
                        <h2 class="text-xl font-bold text-text-primary mb-4">School Staff ({dashboardData.schoolTeachers.length})</h2>
                        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {#each dashboardData.schoolTeachers.slice(0, 12) as teacher}
                                <div class="p-4 border border-border-subtle rounded-lg hover:border-gov-blue/30 transition-colors">
                                    <p class="font-semibold text-text-primary">{teacher.full_name}</p>
                                    <p class="text-xs text-text-secondary mt-1">
                                        <span class="inline-block px-2 py-1 rounded bg-gov-blue/10 text-gov-blue">
                                            {teacher.role}
                                        </span>
                                    </p>
                                </div>
                            {/each}
                        </div>
                    </div>
                {/if}

                <!-- School DLL Submissions -->
                {#if dashboardData?.schoolDLLSubmissions}
                    <SubmissionTable
                        submissions={dashboardData.schoolDLLSubmissions}
                        title="School DLL Submissions"
                        {sortField}
                        {sortDir}
                        on:sortchange={(e) => sortField = e.detail}
                        {searchQuery}
                        on:searchchange={(e) => searchQuery = e.detail}
                    />
                {/if}

                <!-- Master Teachers' ISP/ISR -->
                {#if dashboardData?.masterTeacherISPISR && dashboardData.masterTeacherISPISR.length > 0}
                    <SubmissionTable
                        submissions={dashboardData.masterTeacherISPISR}
                        title="Master Teachers' ISP/ISR Documents"
                        {sortField}
                        {sortDir}
                        on:sortchange={(e) => sortField = e.detail}
                        {searchQuery}
                        on:searchchange={(e) => searchQuery = e.detail}
                    />
                {/if}
            </div>

        {:else if $profile?.role === 'District Supervisor'}
            <div class="space-y-8">
                <!-- School Compliance Metrics -->
                {#if dashboardData?.allSubmissions}
                    {@const complianceBySchool = calculateComplianceBySchool(dashboardData.allSubmissions)}
                    <div class="gov-card-static p-6">
                        <h2 class="text-xl font-bold text-text-primary mb-4">School Compliance Metrics</h2>
                        <div class="overflow-x-auto">
                            <table class="w-full text-sm">
                                <thead>
                                    <tr class="border-b border-border-subtle">
                                        <th class="text-left py-3 px-4 font-semibold text-text-secondary uppercase text-xs">School</th>
                                        <th class="text-left py-3 px-4 font-semibold text-text-secondary uppercase text-xs">Total</th>
                                        <th class="text-left py-3 px-4 font-semibold text-text-secondary uppercase text-xs">Compliant</th>
                                        <th class="text-left py-3 px-4 font-semibold text-text-secondary uppercase text-xs">Late</th>
                                        <th class="text-left py-3 px-4 font-semibold text-text-secondary uppercase text-xs">Missing</th>
                                        <th class="text-left py-3 px-4 font-semibold text-text-secondary uppercase text-xs">Compliance Rate</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {#each complianceBySchool.sort((a, b) => b.rate - a.rate) as school}
                                        <tr class="border-b border-border-subtle hover:bg-surface-muted/50">
                                            <td class="py-4 px-4 font-medium text-text-primary">{school.school}</td>
                                            <td class="py-4 px-4 text-text-secondary">{school.total}</td>
                                            <td class="py-4 px-4"><span class="text-gov-green font-semibold">{school.compliant}</span></td>
                                            <td class="py-4 px-4"><span class="text-gov-gold-dark font-semibold">{school.late}</span></td>
                                            <td class="py-4 px-4"><span class="text-gov-red font-semibold">{school.missing}</span></td>
                                            <td class="py-4 px-4">
                                                <div class="flex items-center gap-2">
                                                    <div class="w-24 bg-surface-muted rounded-full h-2">
                                                        <div
                                                            class="bg-gov-green h-2 rounded-full"
                                                            style="width: {school.rate}%"
                                                        ></div>
                                                    </div>
                                                    <span class="font-semibold text-text-primary whitespace-nowrap">{school.rate}%</span>
                                                </div>
                                            </td>
                                        </tr>
                                    {/each}
                                </tbody>
                            </table>
                        </div>
                    </div>
                {/if}

                <!-- Recent ISP/ISR Submissions -->
                {#if dashboardData?.ispIsrSubmissions}
                    <SubmissionTable
                        submissions={dashboardData.ispIsrSubmissions}
                        title="ISP/ISR Submissions (All Schools)"
                        {sortField}
                        {sortDir}
                        on:sortchange={(e) => sortField = e.detail}
                        {searchQuery}
                        on:searchchange={(e) => searchQuery = e.detail}
                        itemsPerPage={15}
                    />
                {/if}

                <!-- Recent Submissions -->
                {#if dashboardData?.recentSubmissions}
                    <SubmissionTable
                        submissions={dashboardData.recentSubmissions}
                        title="Recent Submissions (All Types)"
                        {sortField}
                        {sortDir}
                        on:sortchange={(e) => sortField = e.detail}
                        {searchQuery}
                        on:searchchange={(e) => searchQuery = e.detail}
                        itemsPerPage={15}
                    />
                {/if}
            </div>
        {/if}

        <!-- My Recent Submissions (All Roles) -->
        {#if dashboardData?.submissions && dashboardData.submissions.length > 0}
            <SubmissionTable
                submissions={dashboardData.submissions}
                title="My Recent Submissions"
                {sortField}
                {sortDir}
                on:sortchange={(e) => sortField = e.detail}
                {searchQuery}
                on:searchchange={(e) => searchQuery = e.detail}
            />
        {/if}
    </div>

<style>
    :global([data-theme="light"]) {
        --gov-green: hsl(142, 71%, 45%);
        --gov-blue: hsl(221, 83%, 53%);
        --gov-gold: hsl(40, 92%, 51%);
        --gov-red: hsl(0, 84%, 60%);
    }
</style>
