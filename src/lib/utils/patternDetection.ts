import { normalizeComplianceStatus } from './useDashboardData';

export interface PatternAlert {
    user_id: string;
    full_name: string;
    school_id: string;
    school_name: string;
    pattern_type: 'consecutive_late_missing' | 'high_non_compliance' | 'declining_quality' | 'bulk_submission' | 'cross_document_similarity';
    severity: 'high' | 'medium' | 'low';
    details: string;
    weeks: number[];
    count: number;
}

/**
 * Enhanced Integrity Guard — AI Feature 4
 * Detects trends, anomalies, and integrity concerns in teacher submissions.
 * 
 * Pattern Types:
 * - consecutive_late_missing: 3+ consecutive weeks with late/missing/non-compliant
 * - high_non_compliance: Teacher has >60% non-compliant across all submissions
 * - declining_quality: Quality scores dropping over consecutive weeks
 * - bulk_submission: 3+ uploads within 10 minutes (suspicious batch behavior)
 * - cross_document_similarity: TF-IDF similarity >0.9 between DLLs of different weeks
 */
export function detectPatterns(
    submissions: any[],
    calendar: any[],
    teachers: any[] = [],
    options: {
        qualityScores?: Map<string, { week: number; score: number }[]>;
        rawTexts?: Map<string, { week: number; text: string }[]>;
    } = {}
): PatternAlert[] {
    const alerts: PatternAlert[] = [];

    // Sort weeks descending (newest first)
    const sortedWeeks = [...calendar].sort((a, b) => b.week_number - a.week_number);
    if (sortedWeeks.length === 0 && teachers.length === 0) return [];

    const recentWeeks = sortedWeeks.slice(0, 5).map(w => w.week_number);

    // Group submissions by teacher
    const teacherMap = new Map<string, any[]>();
    submissions.forEach(s => {
        const uid = s.user_id;
        if (!teacherMap.has(uid)) teacherMap.set(uid, []);
        teacherMap.get(uid)!.push(s);
    });

    // Check each teacher
    teachers.forEach(teacher => {
        const userSubs = teacherMap.get(teacher.id) || [];
        const teacherInfo = {
            user_id: teacher.id,
            full_name: teacher.full_name,
            school_id: teacher.school_id,
            school_name: teacher.schools?.name || 'Unknown School'
        };

        // ── Pattern 1: Consecutive Late/Missing (Original) ──
        let consecutiveCount = 0;
        const failedWeeks: number[] = [];

        for (const weekNum of recentWeeks) {
            const weekSubs = userSubs.filter(s => s.week_number === weekNum);
            const isProblematic = weekSubs.length === 0 ||
                weekSubs.some(s => {
                    const status = normalizeComplianceStatus(s.compliance_status);
                    return status === 'late' || status === 'non-compliant';
                });

            if (isProblematic) {
                consecutiveCount++;
                failedWeeks.push(weekNum);
            } else {
                break;
            }
        }

        if (consecutiveCount >= 3) {
            alerts.push({
                ...teacherInfo,
                pattern_type: 'consecutive_late_missing',
                severity: consecutiveCount >= 4 ? 'high' : 'medium',
                details: `${teacher.full_name} has problematic submissions for ${consecutiveCount} consecutive weeks.`,
                weeks: [...failedWeeks].reverse(),
                count: consecutiveCount
            });
        }

        // ── Pattern 2: High Non-Compliance Rate ──
        if (userSubs.length >= 5) {
            const nonCompliantCount = userSubs.filter(s => {
                const status = normalizeComplianceStatus(s.compliance_status);
                return status === 'non-compliant';
            }).length;
            const rate = nonCompliantCount / userSubs.length;

            if (rate > 0.6) {
                alerts.push({
                    ...teacherInfo,
                    pattern_type: 'high_non_compliance',
                    severity: rate > 0.8 ? 'high' : 'medium',
                    details: `${teacher.full_name} has a ${Math.round(rate * 100)}% non-compliance rate across ${userSubs.length} submissions.`,
                    weeks: [],
                    count: nonCompliantCount
                });
            }
        }

        // ── Pattern 3: Declining Quality Scores ──
        if (options.qualityScores) {
            const scores = options.qualityScores.get(teacher.id);
            if (scores && scores.length >= 3) {
                const sorted = [...scores].sort((a, b) => a.week - b.week);
                let declining = 0;
                for (let i = 1; i < sorted.length; i++) {
                    if (sorted[i].score < sorted[i - 1].score - 5) {
                        declining++;
                    }
                }
                if (declining >= 2 && sorted[sorted.length - 1].score < 50) {
                    alerts.push({
                        ...teacherInfo,
                        pattern_type: 'declining_quality',
                        severity: sorted[sorted.length - 1].score < 30 ? 'high' : 'medium',
                        details: `${teacher.full_name}'s lesson quality has declined over ${declining + 1} weeks (latest score: ${sorted[sorted.length - 1].score}%).`,
                        weeks: sorted.map(s => s.week),
                        count: declining
                    });
                }
            }
        }

        // ── Pattern 4: Bulk Submission Detection ──
        if (userSubs.length >= 3) {
            const sorted = [...userSubs]
                .filter(s => s.created_at)
                .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

            for (let i = 0; i <= sorted.length - 3; i++) {
                const window = sorted.slice(i, i + 3);
                const startTime = new Date(window[0].created_at).getTime();
                const endTime = new Date(window[window.length - 1].created_at).getTime();
                const diffMinutes = (endTime - startTime) / (1000 * 60);

                if (diffMinutes <= 10 && diffMinutes >= 0) {
                    const weekSet = new Set(window.map(s => s.week_number).filter(Boolean));
                    // Only flag if uploads span multiple different weeks (suspicious backfill)
                    if (weekSet.size >= 2) {
                        alerts.push({
                            ...teacherInfo,
                            pattern_type: 'bulk_submission',
                            severity: weekSet.size >= 3 ? 'high' : 'medium',
                            details: `${teacher.full_name} uploaded ${window.length} documents for ${weekSet.size} different weeks within ${Math.round(diffMinutes)} minutes.`,
                            weeks: Array.from(weekSet) as number[],
                            count: window.length
                        });
                        break; // Only report once per teacher
                    }
                }
            }
        }

        // ── Pattern 5: Cross-Document Similarity ──
        if (options.rawTexts) {
            const texts = options.rawTexts.get(teacher.id);
            if (texts && texts.length >= 2) {
                const sorted = [...texts].sort((a, b) => a.week - b.week);
                for (let i = 0; i < sorted.length - 1; i++) {
                    const sim = textSimilarity(sorted[i].text, sorted[i + 1].text);
                    if (sim > 0.9) {
                        alerts.push({
                            ...teacherInfo,
                            pattern_type: 'cross_document_similarity',
                            severity: sim > 0.95 ? 'high' : 'medium',
                            details: `${teacher.full_name}'s DLL for Week ${sorted[i].week} and Week ${sorted[i + 1].week} are ${Math.round(sim * 100)}% similar (possible copy-paste).`,
                            weeks: [sorted[i].week, sorted[i + 1].week],
                            count: Math.round(sim * 100)
                        });
                        break; // Report first occurrence only
                    }
                }
            }
        }
    });

    return alerts.sort((a, b) => {
        const severityMap = { high: 3, medium: 2, low: 1 };
        return severityMap[b.severity] - severityMap[a.severity];
    });
}

// ─── Text Similarity (Lightweight Cosine) ────────────────────────────────────

function textSimilarity(textA: string, textB: string): number {
    const tokenize = (t: string) => t.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(w => w.length > 3);
    const tokensA = tokenize(textA);
    const tokensB = tokenize(textB);

    if (tokensA.length < 10 || tokensB.length < 10) return 0;

    // Build TF vectors
    const tfA: Record<string, number> = {};
    const tfB: Record<string, number> = {};
    for (const t of tokensA) tfA[t] = (tfA[t] || 0) + 1;
    for (const t of tokensB) tfB[t] = (tfB[t] || 0) + 1;

    // Cosine similarity
    const allKeys = new Set([...Object.keys(tfA), ...Object.keys(tfB)]);
    let dot = 0, magA = 0, magB = 0;
    for (const key of allKeys) {
        const a = tfA[key] || 0;
        const b = tfB[key] || 0;
        dot += a * b;
        magA += a * a;
        magB += b * b;
    }

    const mag = Math.sqrt(magA) * Math.sqrt(magB);
    return mag === 0 ? 0 : dot / mag;
}
