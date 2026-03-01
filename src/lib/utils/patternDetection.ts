import { normalizeComplianceStatus } from './useDashboardData';

export interface PatternAlert {
    user_id: string;
    full_name: string;
    school_id: string;
    school_name: string;
    pattern_type: 'consecutive_late_missing' | 'high_non_compliance';
    severity: 'high' | 'medium' | 'low';
    details: string;
    weeks: number[];
    count: number;
}

/**
 * Higher-order utility to detect trends and patterns in teacher submissions.
 * Optimized for supervisor dashboards to provide "Urgent" flags.
 */
export function detectPatterns(
    submissions: any[],
    calendar: any[],
    teachers: any[] = []
): PatternAlert[] {
    const alerts: PatternAlert[] = [];

    // Sort weeks descending (newest first)
    const sortedWeeks = [...calendar].sort((a, b) => b.week_number - a.week_number);
    if (sortedWeeks.length === 0) return [];

    // Get the most recent 5 weeks
    const recentWeeks = sortedWeeks.slice(0, 5).map(w => w.week_number);

    // Group submissions by teacher
    const teacherMap = new Map<string, any[]>();
    submissions.forEach(s => {
        const uid = s.user_id;
        if (!teacherMap.has(uid)) teacherMap.set(uid, []);
        teacherMap.get(uid)!.push(s);
    });

    // Check each teacher's recent history
    teachers.forEach(teacher => {
        const userSubs = teacherMap.get(teacher.id) || [];
        let consecutiveCount = 0;
        const failedWeeks: number[] = [];

        for (const weekNum of recentWeeks) {
            const weekSubs = userSubs.filter(s => s.week_number === weekNum);

            // Missing entirely or has non-compliant/late
            const isProblematic = weekSubs.length === 0 ||
                weekSubs.some(s => {
                    const status = normalizeComplianceStatus(s.compliance_status);
                    return status === 'late' || status === 'non-compliant';
                });

            if (isProblematic) {
                consecutiveCount++;
                failedWeeks.push(weekNum);
            } else {
                break; // Pattern broken
            }
        }

        if (consecutiveCount >= 3) {
            alerts.push({
                user_id: teacher.id,
                full_name: teacher.full_name,
                school_id: teacher.school_id,
                school_name: teacher.schools?.name || 'Common School',
                pattern_type: 'consecutive_late_missing',
                severity: consecutiveCount >= 4 ? 'high' : 'medium',
                details: `${teacher.full_name} has problematic submissions for ${consecutiveCount} consecutive weeks.`,
                weeks: [...failedWeeks].reverse(),
                count: consecutiveCount
            });
        }
    });

    return alerts.sort((a, b) => {
        // High severity first
        const severityMap = { high: 3, medium: 2, low: 1 };
        return severityMap[b.severity] - severityMap[a.severity];
    });
}
