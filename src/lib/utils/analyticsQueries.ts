import { supabase } from '$lib/utils/supabase';

/**
 * ANALYTICS DATA QUERIES
 * Used by School Head and District Supervisor
 */

// ===========================
// SCHOOL HEAD ANALYTICS
// ===========================

export async function getSchoolHeadAnalytics(schoolId: string, districtId: string) {
    // NOTE: every query below embeds `profiles!inner(...)` (not the plain
    // `profiles(...)` left-join form) so that `.eq('profiles.school_id', ...)`
    // actually restricts the top-level `submissions` rows returned. Without
    // `!inner`, PostgREST treats it as a left join and the school_id filter
    // does not narrow the result set — every query here previously returned
    // submissions from every school in the system instead of just this one.
    const [complianceTrend, teacherPerformance, weeklyBreakdown, docTypeStats, atRiskTeachers] = await Promise.all([
        // Compliance trend over last 12 weeks
        supabase
            .from('submissions')
            .select(`
                id,
                created_at,
                compliance_status,
                doc_type,
                week_number,
                profiles!inner(school_id)
            `)
            .eq('profiles.school_id', schoolId)
            .order('created_at', { ascending: true })
            .limit(500),

        // Teacher performance metrics
        supabase
            .from('submissions')
            .select(`
                user_id,
                compliance_status,
                doc_type,
                created_at,
                profiles!inner(full_name, role, school_id)
            `)
            .eq('profiles.school_id', schoolId)
            .order('created_at', { ascending: false })
            .limit(300),

        // Weekly submission breakdown
        supabase
            .from('submissions')
            .select(`
                week_number,
                compliance_status,
                doc_type,
                profiles!inner(school_id)
            `)
            .eq('profiles.school_id', schoolId)
            .order('week_number', { ascending: true })
            .limit(400),

        // Document type breakdown
        supabase
            .from('submissions')
            .select(`
                doc_type,
                compliance_status,
                profiles!inner(school_id)
            `)
            .eq('profiles.school_id', schoolId)
            .limit(500),

        // Teachers below compliance threshold (< 70%)
        supabase
            .from('submissions')
            .select(`
                user_id,
                compliance_status,
                profiles!inner(full_name, role, avatar_url, school_id)
            `)
            .eq('profiles.school_id', schoolId)
            .order('user_id')
            .limit(300)
    ]);

    return {
        complianceTrend: complianceTrend.data || [],
        teacherPerformance: teacherPerformance.data || [],
        weeklyBreakdown: weeklyBreakdown.data || [],
        docTypeStats: docTypeStats.data || [],
        atRiskTeachers: atRiskTeachers.data || []
    };
}

// ===========================
// DISTRICT SUPERVISOR ANALYTICS
// ===========================

export async function getDistrictSupervisorAnalytics(districtId: string) {
    // See the !inner note in getSchoolHeadAnalytics above — same fix applies
    // here, scoped to district_id instead of school_id.
    const [complianceTrend, schoolPerformance, teacherDistribution, weeklyBreakdown, docTypeStats, alertData] = await Promise.all([
        // District compliance trend
        supabase
            .from('submissions')
            .select(`
                id,
                created_at,
                compliance_status,
                profiles!inner(district_id, schools(name))
            `)
            .eq('profiles.district_id', districtId)
            .order('created_at', { ascending: true })
            .limit(1000),

        // School performance metrics
        supabase
            .from('submissions')
            .select(`
                compliance_status,
                profiles!inner(district_id, school_id, schools(name))
            `)
            .eq('profiles.district_id', districtId)
            .limit(1000),

        // Teacher performance distribution (for k-means clustering)
        supabase
            .from('submissions')
            .select(`
                user_id,
                compliance_status,
                doc_type,
                created_at,
                profiles!inner(full_name, district_id, school_id, schools(name))
            `)
            .eq('profiles.district_id', districtId)
            .order('user_id')
            .limit(500),

        // Weekly submission trends
        supabase
            .from('submissions')
            .select(`
                week_number,
                compliance_status,
                profiles!inner(district_id, schools(name))
            `)
            .eq('profiles.district_id', districtId)
            .order('week_number', { ascending: true })
            .limit(500),

        // Document type breakdown
        supabase
            .from('submissions')
            .select(`
                doc_type,
                compliance_status,
                profiles!inner(district_id)
            `)
            .eq('profiles.district_id', districtId)
            .limit(500),

        // Critical alerts
        supabase
            .from('submissions')
            .select(`
                id,
                compliance_status,
                created_at,
                profiles!inner(full_name, district_id, schools(name))
            `)
            .eq('profiles.district_id', districtId)
            .in('compliance_status', ['late', 'missing'])
            .order('created_at', { ascending: false })
            .limit(100)
    ]);

    return {
        complianceTrend: complianceTrend.data || [],
        schoolPerformance: schoolPerformance.data || [],
        teacherDistribution: teacherDistribution.data || [],
        weeklyBreakdown: weeklyBreakdown.data || [],
        docTypeStats: docTypeStats.data || [],
        alerts: alertData.data || []
    };
}

// ===========================
// DATA ANALYSIS & PROCESSING
// ===========================

/**
 * Calculate compliance metrics for a dataset
 */
export function calculateComplianceMetrics(submissions: any[]) {
    if (submissions.length === 0) return { compliant: 0, late: 0, missing: 0, rate: 0, total: 0 };

    const compliant = submissions.filter(s => s.compliance_status === 'compliant').length;
    const late = submissions.filter(s => s.compliance_status === 'late').length;
    const missing = submissions.filter(s => s.compliance_status === 'missing').length;
    const total = submissions.length;

    return {
        compliant,
        late,
        missing,
        total,
        rate: Math.round((compliant / total) * 100)
    };
}

/**
 * Generate compliance trend over time (by week or month)
 */
export function generateComplianceTrend(submissions: any[], granularity: 'week' | 'month' = 'week') {
    const trendMap = new Map<string, { compliant: number; late: number; missing: number; total: number }>();

    submissions.forEach(sub => {
        const date = new Date(sub.created_at);
        let key: string;

        if (granularity === 'week') {
            const weekNum = Math.ceil((date.getDate() - date.getDay()) / 7);
            const month = String(date.getMonth() + 1).padStart(2, '0');
            key = `W${weekNum}-${month}`;
        } else {
            const month = date.toLocaleDateString('en-PH', { month: 'short', year: '2-digit' });
            key = month;
        }

        if (!trendMap.has(key)) {
            trendMap.set(key, { compliant: 0, late: 0, missing: 0, total: 0 });
        }

        const stats = trendMap.get(key)!;
        stats.total += 1;

        if (sub.compliance_status === 'compliant') stats.compliant += 1;
        else if (sub.compliance_status === 'late') stats.late += 1;
        else if (sub.compliance_status === 'missing') stats.missing += 1;
    });

    return Array.from(trendMap.entries()).map(([key, stats]) => ({
        period: key,
        ...stats,
        rate: Math.round((stats.compliant / stats.total) * 100)
    }));
}

/**
 * Performance distribution for k-means clustering
 * Calculates compliance rate and submission frequency for each teacher/school
 */
export function getPerformanceDistribution(submissions: any[], groupBy: 'teacher' | 'school' = 'teacher') {
    const groupMap = new Map<string, { compliant: number; late: number; missing: number; total: number; submissions: number }>();

    submissions.forEach(sub => {
        const key = groupBy === 'teacher' ?
            (sub.profiles?.full_name || 'Unknown') :
            (sub.profiles?.schools?.name || 'Unknown');

        if (!groupMap.has(key)) {
            groupMap.set(key, { compliant: 0, late: 0, missing: 0, total: 0, submissions: 0 });
        }

        const stats = groupMap.get(key)!;
        stats.total += 1;
        stats.submissions = (stats.submissions || 0) + 1;

        if (sub.compliance_status === 'compliant') stats.compliant += 1;
        else if (sub.compliance_status === 'late') stats.late += 1;
        else if (sub.compliance_status === 'missing') stats.missing += 1;
    });

    return Array.from(groupMap.entries()).map(([name, stats]) => ({
        name,
        compliance_rate: Math.round((stats.compliant / stats.total) * 100),
        submission_frequency: stats.submissions,
        compliant: stats.compliant,
        late: stats.late,
        missing: stats.missing,
        total: stats.total
    }));
}

/**
 * K-means clustering for performance distribution
 * Clusters entities into 3 groups: High Performers, Average, At-Risk
 */
export function kMeansClusterPerformance(performances: any[], k: number = 3) {
    if (performances.length === 0) return { high: [], average: [], atRisk: [] };

    // Normalize data for clustering
    const maxRate = Math.max(...performances.map(p => p.compliance_rate), 100);
    const maxFreq = Math.max(...performances.map(p => p.submission_frequency), 1);

    const normalized = performances.map(p => ({
        ...p,
        norm_rate: p.compliance_rate / maxRate,
        norm_freq: p.submission_frequency / maxFreq
    }));

    // Simple k-means with 3 clusters
    // Initialize centroids based on percentiles
    const sorted = [...normalized].sort((a, b) => a.compliance_rate - b.compliance_rate);
    const centroids = [
        { norm_rate: 0.3, norm_freq: 0.3 }, // Low performers
        { norm_rate: 0.6, norm_freq: 0.6 }, // Average
        { norm_rate: 0.9, norm_freq: 0.9 }  // High performers
    ];

    // Assign each performance to nearest centroid
    const clusters: any[] = [[], [], []];

    normalized.forEach(perf => {
        let minDist = Infinity;
        let closestCluster = 0;

        centroids.forEach((centroid, idx) => {
            const dist = Math.sqrt(
                Math.pow(perf.norm_rate - centroid.norm_rate, 2) +
                Math.pow(perf.norm_freq - centroid.norm_freq, 2)
            );
            if (dist < minDist) {
                minDist = dist;
                closestCluster = idx;
            }
        });

        clusters[closestCluster].push(perf);
    });

    return {
        high: clusters[2].sort((a, b) => b.compliance_rate - a.compliance_rate),
        average: clusters[1].sort((a, b) => b.compliance_rate - a.compliance_rate),
        atRisk: clusters[0].sort((a, b) => b.compliance_rate - a.compliance_rate)
    };
}

/**
 * Document type breakdown with compliance analysis
 */
export function getDocumentTypeAnalysis(submissions: any[]) {
    const typeMap = new Map<string, { compliant: number; late: number; missing: number; total: number }>();

    submissions.forEach(sub => {
        const docType = sub.doc_type || 'Unknown';
        if (!typeMap.has(docType)) {
            typeMap.set(docType, { compliant: 0, late: 0, missing: 0, total: 0 });
        }

        const stats = typeMap.get(docType)!;
        stats.total += 1;

        if (sub.compliance_status === 'compliant') stats.compliant += 1;
        else if (sub.compliance_status === 'late') stats.late += 1;
        else if (sub.compliance_status === 'missing') stats.missing += 1;
    });

    return Array.from(typeMap.entries()).map(([type, stats]) => ({
        type,
        ...stats,
        rate: Math.round((stats.compliant / stats.total) * 100)
    }));
}

/**
 * Get at-risk entities (below threshold compliance)
 */
export function getAtRiskEntities(performances: any[], threshold: number = 70) {
    return performances
        .filter(p => p.compliance_rate < threshold)
        .sort((a, b) => a.compliance_rate - b.compliance_rate)
        .map(p => ({
            ...p,
            risk_level: p.compliance_rate < 50 ? 'critical' : p.compliance_rate < 60 ? 'high' : 'medium'
        }));
}

/**
 * Forecast compliance based on trend
 */
export function forecastCompliance(trend: any[], periods: number = 4) {
    if (trend.length < 2) return [];

    const forecast = [...trend];
    const recentTrend = trend.slice(-3);

    if (recentTrend.length === 0) return forecast;

    // Calculate average rate change
    const avgChange = recentTrend.reduce((sum, t, i) => {
        if (i === 0) return sum;
        return sum + (t.rate - recentTrend[i - 1].rate);
    }, 0) / recentTrend.length;

    // Generate forecasted periods
    let lastRate = recentTrend[recentTrend.length - 1].rate;
    for (let i = 0; i < periods; i++) {
        const nextRate = Math.min(100, Math.max(0, lastRate + avgChange));
        forecast.push({
            period: `F${i + 1}`,
            compliant: 0,
            late: 0,
            missing: 0,
            total: 0,
            rate: Math.round(nextRate),
            isForecasted: true
        });
        lastRate = nextRate;
    }

    return forecast;
}

/**
 * Weekly submission patterns (identify peak days)
 */
export function getWeeklyPatterns(submissions: any[]) {
    const dayMap = new Map<number, number>();
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    submissions.forEach(sub => {
        const dayOfWeek = new Date(sub.created_at).getDay();
        dayMap.set(dayOfWeek, (dayMap.get(dayOfWeek) || 0) + 1);
    });

    return Array.from(dayMap.entries())
        .map(([day, count]) => ({
            day: dayNames[day],
            submissions: count,
            percentage: Math.round((count / submissions.length) * 100)
        }))
        .sort((a, b) => b.submissions - a.submissions);
}

/**
 * School/Teacher comparison metrics
 */
export function getComparisonMetrics(performances: any[]) {
    if (performances.length === 0) return {
        best: null,
        worst: null,
        average: { compliance_rate: 0, submission_frequency: 0 },
        median: { compliance_rate: 0, submission_frequency: 0 }
    };

    const sorted = [...performances].sort((a, b) => b.compliance_rate - a.compliance_rate);

    const avgRate = performances.reduce((sum, p) => sum + p.compliance_rate, 0) / performances.length;
    const avgFreq = performances.reduce((sum, p) => sum + p.submission_frequency, 0) / performances.length;

    const medianIdx = Math.floor(performances.length / 2);
    const medianRate = sorted[medianIdx].compliance_rate;
    const medianFreq = sorted[medianIdx].submission_frequency;

    return {
        best: sorted[0],
        worst: sorted[sorted.length - 1],
        average: {
            compliance_rate: Math.round(avgRate),
            submission_frequency: Math.round(avgFreq)
        },
        median: {
            compliance_rate: medianRate,
            submission_frequency: medianFreq
        }
    };
}
