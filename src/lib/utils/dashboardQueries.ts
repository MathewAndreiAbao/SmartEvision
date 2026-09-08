import { supabase } from '$lib/utils/supabase';

// ===========================
// TEACHER DASHBOARD QUERIES
// ===========================

export async function getTeacherDashboardData(userId: string, schoolId: string, districtId: string) {
    const [submissions, teachingLoads, upcomingDeadlines, remarks] = await Promise.all([
        // Recent submissions with detailed info
        supabase
            .from('submissions')
            .select(`
                id,
                file_name,
                doc_type,
                compliance_status,
                created_at,
                week_number,
                file_size,
                teaching_loads(subject, grade_level)
            `)
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(20),

        // Active teaching loads
        supabase
            .from('teaching_loads')
            .select('id, subject, grade_level, is_active')
            .eq('user_id', userId)
            .eq('is_active', true)
            .order('subject, grade_level'),

        // Upcoming deadlines
        supabase
            .from('academic_calendar')
            .select('id, week_number, deadline_date, is_active')
            .eq('district_id', districtId)
            .eq('is_active', true)
            .gte('deadline_date', new Date().toISOString())
            .order('deadline_date', { ascending: true })
            .limit(5),

        // Remarks on my documents
        supabase
            .from('dll_reviews')
            .select(`
                id,
                created_at,
                reviewer_comment,
                status,
                submissions(file_name, doc_type, week_number),
                profiles(full_name, role)
            `)
            .eq('submissions.user_id', userId)
            .order('created_at', { ascending: false })
            .limit(10)
    ]);

    return {
        submissions: submissions.data || [],
        teachingLoads: teachingLoads.data || [],
        upcomingDeadlines: upcomingDeadlines.data || [],
        remarks: remarks.data || []
    };
}

// ===========================
// MASTER TEACHER DASHBOARD QUERIES
// ===========================

export async function getMasterTeacherDashboardData(userId: string, schoolId: string, districtId: string) {
    const [mySubmissions, schoolTeachers, schoolDLLStats, myISPISRSubmissions, remarks] = await Promise.all([
        // My submissions (DLL + ISP/ISR)
        supabase
            .from('submissions')
            .select(`
                id,
                file_name,
                doc_type,
                compliance_status,
                created_at,
                week_number,
                teaching_loads(subject, grade_level)
            `)
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(15),

        // All teachers in my school (for overview)
        supabase
            .from('profiles')
            .select('id, full_name, role')
            .eq('school_id', schoolId)
            .in('role', ['Teacher', 'Master Teacher'])
            .order('full_name'),

        // School DLL submission stats
        supabase
            .from('submissions')
            .select(`
                id,
                user_id,
                doc_type,
                compliance_status,
                week_number,
                profiles(full_name)
            `)
            .eq('doc_type', 'DLL')
            .in('profiles.school_id', [schoolId])
            .order('created_at', { ascending: false })
            .limit(100),

        // My ISP/ISR submissions with remarks
        supabase
            .from('submissions')
            .select(`
                id,
                file_name,
                doc_type,
                created_at,
                dll_reviews(reviewer_comment, status)
            `)
            .eq('user_id', userId)
            .in('doc_type', ['ISP', 'ISR'])
            .order('created_at', { ascending: false }),

        // Remarks on my ISP/ISR
        supabase
            .from('dll_reviews')
            .select(`
                id,
                created_at,
                reviewer_comment,
                status,
                profiles(full_name, role),
                submissions(file_name, doc_type)
            `)
            .eq('submissions.user_id', userId)
            .in('submissions.doc_type', ['ISP', 'ISR'])
            .order('created_at', { ascending: false })
            .limit(10)
    ]);

    return {
        mySubmissions: mySubmissions.data || [],
        schoolTeachers: schoolTeachers.data || [],
        schoolDLLStats: schoolDLLStats.data || [],
        myISPISRSubmissions: myISPISRSubmissions.data || [],
        remarks: remarks.data || []
    };
}

// ===========================
// SCHOOL HEAD DASHBOARD QUERIES
// ===========================

export async function getSchoolHeadDashboardData(userId: string, schoolId: string, districtId: string) {
    const [myISPISR, schoolTeachers, schoolDLLSubmissions, masterTeacherISPISR, schoolMetrics] = await Promise.all([
        // My ISP/ISR submissions
        supabase
            .from('submissions')
            .select(`
                id,
                file_name,
                doc_type,
                compliance_status,
                created_at,
                dll_reviews(reviewer_comment, status, profiles(full_name))
            `)
            .eq('user_id', userId)
            .in('doc_type', ['ISP', 'ISR'])
            .order('created_at', { ascending: false }),

        // All teachers in school
        supabase
            .from('profiles')
            .select(`
                id,
                full_name,
                role,
                avatar_url
            `)
            .eq('school_id', schoolId)
            .order('full_name'),

        // All DLL submissions in school with teacher info
        supabase
            .from('submissions')
            .select(`
                id,
                user_id,
                file_name,
                doc_type,
                compliance_status,
                created_at,
                week_number,
                profiles(full_name, role)
            `)
            .eq('doc_type', 'DLL')
            .in('profiles.school_id', [schoolId])
            .order('created_at', { ascending: false })
            .limit(100),

        // Master Teachers' ISP/ISR submissions
        supabase
            .from('submissions')
            .select(`
                id,
                user_id,
                file_name,
                doc_type,
                created_at,
                profiles(full_name),
                dll_reviews(reviewer_comment, status)
            `)
            .in('profiles.school_id', [schoolId])
            .in('doc_type', ['ISP', 'ISR'])
            .in('profiles.role', ['Master Teacher'])
            .order('created_at', { ascending: false }),

        // School compliance metrics
        supabase
            .rpc('get_school_compliance_summary', {
                p_school_id: schoolId,
                p_district_id: districtId
            })
    ]);

    return {
        myISPISR: myISPISR.data || [],
        schoolTeachers: schoolTeachers.data || [],
        schoolDLLSubmissions: schoolDLLSubmissions.data || [],
        masterTeacherISPISR: masterTeacherISPISR.data || [],
        schoolMetrics: schoolMetrics.data || null
    };
}

// ===========================
// DISTRICT SUPERVISOR DASHBOARD QUERIES
// ===========================

export async function getDistrictSupervisorDashboardData(districtId: string) {
    const [schoolMetrics, ispIsrSubmissions, dllOverview, recentSubmissions, districtAlerts] = await Promise.all([
        // School compliance metrics
        supabase
            .from('submissions')
            .select(`
                id,
                doc_type,
                compliance_status,
                created_at,
                profiles(full_name, school_id, schools(name))
            `)
            .in('profiles.district_id', [districtId])
            .order('created_at', { ascending: false })
            .limit(500),

        // ISP/ISR submissions grouped by school
        supabase
            .from('submissions')
            .select(`
                id,
                file_name,
                doc_type,
                created_at,
                compliance_status,
                user_id,
                profiles(full_name, role, school_id, schools(name)),
                dll_reviews(reviewer_comment, status)
            `)
            .in('doc_type', ['ISP', 'ISR'])
            .in('profiles.district_id', [districtId])
            .order('created_at', { ascending: false })
            .limit(200),

        // DLL overview by school
        supabase
            .from('submissions')
            .select(`
                id,
                doc_type,
                compliance_status,
                week_number,
                profiles(school_id, schools(name))
            `)
            .eq('doc_type', 'DLL')
            .in('profiles.district_id', [districtId])
            .order('week_number', { ascending: false })
            .limit(300),

        // Recent submissions
        supabase
            .from('submissions')
            .select(`
                id,
                file_name,
                doc_type,
                compliance_status,
                created_at,
                week_number,
                profiles(full_name, role, schools(name))
            `)
            .in('profiles.district_id', [districtId])
            .order('created_at', { ascending: false })
            .limit(20),

        // Compliance alerts
        supabase
            .rpc('get_district_compliance_alerts', {
                p_district_id: districtId
            })
    ]);

    return {
        allSubmissions: schoolMetrics.data || [],
        ispIsrSubmissions: ispIsrSubmissions.data || [],
        dllOverview: dllOverview.data || [],
        recentSubmissions: recentSubmissions.data || [],
        alerts: districtAlerts.data || []
    };
}

// ===========================
// UTILITY FUNCTIONS FOR DATA PROCESSING
// ===========================

export function calculateComplianceBySchool(submissions: any[]) {
    const schoolMap = new Map<string, { compliant: number; late: number; missing: number; total: number }>();

    submissions.forEach(sub => {
        const schoolName = sub.profiles?.schools?.name || 'Unknown';
        if (!schoolMap.has(schoolName)) {
            schoolMap.set(schoolName, { compliant: 0, late: 0, missing: 0, total: 0 });
        }

        const stats = schoolMap.get(schoolName)!;
        stats.total += 1;

        if (sub.compliance_status === 'compliant') stats.compliant += 1;
        else if (sub.compliance_status === 'late') stats.late += 1;
        else if (sub.compliance_status === 'missing') stats.missing += 1;
    });

    return Array.from(schoolMap.entries()).map(([school, stats]) => ({
        school,
        ...stats,
        rate: Math.round((stats.compliant / stats.total) * 100)
    }));
}

export function calculateComplianceByTeacher(submissions: any[]) {
    const teacherMap = new Map<string, { compliant: number; late: number; missing: number; total: number }>();

    submissions.forEach(sub => {
        const teacherName = sub.profiles?.full_name || 'Unknown';
        if (!teacherMap.has(teacherName)) {
            teacherMap.set(teacherName, { compliant: 0, late: 0, missing: 0, total: 0 });
        }

        const stats = teacherMap.get(teacherName)!;
        stats.total += 1;

        if (sub.compliance_status === 'compliant') stats.compliant += 1;
        else if (sub.compliance_status === 'late') stats.late += 1;
        else if (sub.compliance_status === 'missing') stats.missing += 1;
    });

    return Array.from(teacherMap.entries()).map(([teacher, stats]) => ({
        teacher,
        ...stats,
        rate: Math.round((stats.compliant / stats.total) * 100)
    })).sort((a, b) => b.rate - a.rate);
}

export function groupSubmissionsByWeek(submissions: any[]) {
    const weekMap = new Map<number, { week: number; dll: number; isp: number; isr: number; compliant: number; late: number; missing: number }>();

    submissions.forEach(sub => {
        const week = sub.week_number || 0;
        if (!weekMap.has(week)) {
            weekMap.set(week, { week, dll: 0, isp: 0, isr: 0, compliant: 0, late: 0, missing: 0 });
        }

        const stats = weekMap.get(week)!;
        if (sub.doc_type === 'DLL') stats.dll += 1;
        else if (sub.doc_type === 'ISP') stats.isp += 1;
        else if (sub.doc_type === 'ISR') stats.isr += 1;

        if (sub.compliance_status === 'compliant') stats.compliant += 1;
        else if (sub.compliance_status === 'late') stats.late += 1;
        else if (sub.compliance_status === 'missing') stats.missing += 1;
    });

    return Array.from(weekMap.values()).sort((a, b) => a.week - b.week);
}

export function getComplianceTrend(submissions: any[]) {
    const dateMap = new Map<string, { date: string; compliant: number; late: number; missing: number }>();

    submissions.forEach(sub => {
        const date = new Date(sub.created_at).toISOString().split('T')[0];
        if (!dateMap.has(date)) {
            dateMap.set(date, { date, compliant: 0, late: 0, missing: 0 });
        }

        const stats = dateMap.get(date)!;
        if (sub.compliance_status === 'compliant') stats.compliant += 1;
        else if (sub.compliance_status === 'late') stats.late += 1;
        else if (sub.compliance_status === 'missing') stats.missing += 1;
    });

    return Array.from(dateMap.values())
        .sort((a, b) => a.date.localeCompare(b.date))
        .map((stat, idx, arr) => ({
            ...stat,
            cumulativeCompliant: arr.slice(0, idx + 1).reduce((sum, s) => sum + s.compliant, 0),
            cumulativeLate: arr.slice(0, idx + 1).reduce((sum, s) => sum + s.late, 0),
            cumulativeMissing: arr.slice(0, idx + 1).reduce((sum, s) => sum + s.missing, 0)
        }));
}
