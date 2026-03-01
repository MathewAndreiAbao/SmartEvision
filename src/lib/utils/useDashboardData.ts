/**
 * Dashboard Data Utilities
 * Shared compliance calculation helpers for all 4 dashboards.
 * 
 * CRITICAL: All compliance data uses ACTUAL compliance_status values from the
 * submissions table. No recalculation or estimation of compliance status.
 */

export interface ComplianceStats {
  Compliant: number;
  Late: number;
  NonCompliant: number;
  totalUploaded: number;
  expected: number;
  rate: number; // 0-100
}

export interface WeeklyData {
  week: number;
  label: string;
  Compliant: number;
  Late: number;
  NonCompliant: number;
  rate: number;
  docs: number;
}

export interface AcademicWeek {
  week_number: number;
  start_date?: string;
  end_date?: string;
  deadline_date?: string;
  school_year?: string;
}

/**
 * Fetch actual weeks from the academic_calendar table.
 * Returns sorted array of AcademicWeek objects.
 */
export async function getActualWeeks(
  supabase: any,
  schoolYear: string = '2025-2026',
  districtId?: string
): Promise<AcademicWeek[]> {
  let query = supabase
    .from('academic_calendar')
    .select('week_number, start_date, end_date, deadline_date, school_year')
    .eq('school_year', schoolYear)
    .order('week_number', { ascending: true });

  if (districtId) {
    query = query.or(`district_id.eq.${districtId},district_id.is.null`);
  }

  const { data, error } = await query;
  if (error || !data) return [];
  return data as AcademicWeek[];
}

/**
 * Get the current week number from academic_calendar by finding which
 * week contains today's date. Falls back to calculated week if no match.
 */
export async function getCurrentWeekFromCalendar(
  supabase: any,
  schoolYear: string = '2025-2026',
  districtId?: string
): Promise<number> {
  const weeks = await getActualWeeks(supabase, schoolYear, districtId);
  const today = new Date().toISOString().split('T')[0];

  for (const w of weeks) {
    if (w.start_date && w.end_date) {
      if (today >= w.start_date && today <= w.end_date) {
        return w.week_number;
      }
    }
  }

  // Fallback: return the latest week_number if calendar exists
  if (weeks.length > 0) {
    // Return the highest week that has a start_date <= today
    const pastWeeks = weeks.filter(w => w.start_date && w.start_date <= today);
    if (pastWeeks.length > 0) {
      return pastWeeks[pastWeeks.length - 1].week_number;
    }
    return weeks[0].week_number;
  }

  // Ultimate fallback: calculate from hardcoded date
  return getWeekNumber();
}

/**
 * Count submissions directly by their stored compliance_status.
 * Returns counts for each status category.
 */
export function countSubmissionsByStatus(
  submissions: { compliance_status?: string }[]
): { compliant: number; late: number; nonCompliant: number; total: number } {
  let compliant = 0;
  let late = 0;
  let nonCompliant = 0;

  for (const s of submissions) {
    const cs = (s.compliance_status || 'non-compliant').toLowerCase().trim();
    if (cs === 'compliant' || cs === 'on-time') {
      compliant++;
    } else if (cs === 'late') {
      late++;
    } else {
      nonCompliant++;
    }
  }

  return { compliant, late, nonCompliant, total: compliant + late + nonCompliant };
}

/**
 * Calculate compliance stats from an array of submissions.
 * 
 * Rate = Compliant / Total (compliant + late + non-compliant)
 * Uses ONLY the actual compliance_status stored in database.
 */
export function calculateCompliance(
  submissions: { compliance_status?: string; created_at?: string }[],
  teachingLoadsCount: number = 0,
  expected?: number,
  deadlineDate?: string | Date
): ComplianceStats {
  const counts = countSubmissionsByStatus(submissions);

  // Rate = Compliant / Total submissions (not estimated expected)
  const total = counts.total;
  const rate = total > 0 ? Math.min(100, Math.round((counts.compliant / total) * 100)) : 0;

  return {
    Compliant: counts.compliant,
    Late: counts.late,
    NonCompliant: counts.nonCompliant,
    totalUploaded: total,
    expected: expected !== undefined ? expected : teachingLoadsCount,
    rate
  };
}

/**
 * Fallback week number calculation from hardcoded academic year start.
 * Prefer getCurrentWeekFromCalendar() when supabase client is available.
 */
const ACADEMIC_YEAR_START = new Date('2025-08-01');

export function getWeekNumber(date: Date = new Date()): number {
  const diff = date.getTime() - ACADEMIC_YEAR_START.getTime();
  const week = Math.ceil(diff / (1000 * 60 * 60 * 24 * 7));
  return Math.max(1, week);
}

export function getComplianceColor(rate: number): string {
  if (rate >= 80) return '#008751'; // green
  if (rate >= 50) return '#FCD116'; // yellow
  return '#CE1126'; // red
}

export function getComplianceClass(rate: number): string {
  if (rate >= 80) return 'text-gov-green';
  if (rate >= 50) return 'text-gov-gold-dark';
  return 'text-gov-red';
}

export function getComplianceBgClass(rate: number): string {
  if (rate >= 80) return 'bg-gov-green/15';
  if (rate >= 50) return 'bg-gov-gold/15';
  return 'bg-gov-red/15';
}

export function getTrendDirection(current: number, previous: number): 'up' | 'down' | 'stable' {
  const diff = current - previous;
  if (diff > 2) return 'up';
  if (diff < -2) return 'down';
  return 'stable';
}

export function getTrendIcon(dir: 'up' | 'down' | 'stable'): string {
  return ''; // Rely on color and text/direction
}

/**
 * Group submissions by week for charts and widgets.
 * Uses academic_calendar deadlines when available, falls back to computed weeks.
 */
export function normalizeComplianceStatus(status: string | null | undefined): string {
  if (!status) return 'non-compliant'; // Default for missing/null
  const s = status.toLowerCase().trim();
  if (s === 'compliant' || s === 'on-time') return 'compliant';
  if (s === 'late') return 'late';
  if (s === 'non-compliant' || s === 'missing' || s === 'non compliant') return 'non-compliant';
  return s;
}

export function groupSubmissionsByWeek(
  submissions: { created_at: string; status?: string; compliance_status?: string; week_number?: number }[],
  teachingLoadsCount: number = 0,
  weekCount = 8,
  calendarDeadlines: any[] = []
): WeeklyData[] {
  const weeks: WeeklyData[] = [];

  // If calendar deadlines are provided, use those as the "weeks"
  if (calendarDeadlines.length > 0) {
    // Sort by week number descending, take most recent weekCount
    const sorted = [...calendarDeadlines].sort((a, b) => b.week_number - a.week_number).slice(0, weekCount);
    for (const cal of sorted) {
      const weekSubs = submissions.filter(s => s.week_number === cal.week_number);
      const stats = calculateCompliance(weekSubs, teachingLoadsCount);
      weeks.push({
        week: cal.week_number,
        label: `W${cal.week_number}`,
        Compliant: stats.Compliant,
        Late: stats.Late,
        NonCompliant: stats.NonCompliant,
        rate: stats.rate,
        docs: weekSubs.length
      });
    }
    return weeks.reverse(); // Back to ascending for the chart
  }

  // Fallback: use calculated weeks if no calendar provided
  const currentWeek = getWeekNumber();
  for (let i = weekCount - 1; i >= 0; i--) {
    const wk = currentWeek - i;
    if (wk < 1) continue;
    const weekSubs = submissions.filter(s => {
      if (s.week_number) return s.week_number === wk;
      return getWeekNumber(new Date(s.created_at)) === wk;
    });
    const stats = calculateCompliance(weekSubs, teachingLoadsCount);
    weeks.push({
      week: wk,
      label: `W${wk}`,
      Compliant: stats.Compliant,
      Late: stats.Late,
      NonCompliant: stats.NonCompliant,
      rate: stats.rate,
      docs: weekSubs.length
    });
  }

  return weeks;
}

export function formatComplianceRate(rate: number): string {
  return `${Math.round(rate)}%`;
}

/**
 * Robustly get week number from a submission object.
 */
export function getSubmissionWeek(s: { week_number?: number | null, created_at?: string }): number {
  if (s.week_number) return s.week_number;
  if (s.created_at) return getWeekNumber(new Date(s.created_at));
  return getWeekNumber();
}

/**
 * WBS 14.5 — Active Missing Submission Detection
 * 
 * Scans past-deadline calendar weeks and marks teachers who have NO submission
 * for that week with an explicit 'non-compliant' placeholder record.
 * This replaces the passive "infer missing from absence" approach.
 * 
 * Returns the number of newly marked missing submissions.
 */
export async function markMissingSubmissions(
  supabase: any,
  schoolYear: string = '2025-2026',
  districtId?: string
): Promise<number> {
  const now = new Date();
  let marked = 0;

  try {
    // 1. Get all past-deadline weeks from academic calendar
    let calQuery = supabase
      .from('academic_calendar')
      .select('id, week_number, deadline_date')
      .eq('school_year', schoolYear)
      .lt('deadline_date', now.toISOString())
      .order('week_number', { ascending: true });

    if (districtId) {
      calQuery = calQuery.eq('district_id', districtId);
    }

    const { data: pastWeeks, error: calError } = await calQuery;
    if (calError || !pastWeeks || pastWeeks.length === 0) return 0;

    // 2. Get all teachers (with teaching loads) in this district
    let teacherQuery = supabase
      .from('profiles')
      .select('id, full_name, school_id')
      .eq('role', 'Teacher');

    if (districtId) {
      // Get teachers from schools in this district
      const { data: schools } = await supabase
        .from('schools')
        .select('id')
        .eq('district_id', districtId);

      if (schools && schools.length > 0) {
        const schoolIds = schools.map((s: any) => s.id);
        teacherQuery = teacherQuery.in('school_id', schoolIds);
      }
    }

    const { data: teachers, error: teacherError } = await teacherQuery;
    if (teacherError || !teachers || teachers.length === 0) return 0;

    // 3. Get all existing submissions for these weeks
    const weekNumbers = pastWeeks.map((w: any) => w.week_number);
    const teacherIds = teachers.map((t: any) => t.id);

    const { data: existingSubs } = await supabase
      .from('submissions')
      .select('user_id, week_number')
      .in('user_id', teacherIds)
      .in('week_number', weekNumbers)
      .eq('school_year', schoolYear);

    // 4. Build a set of existing (user_id, week_number) pairs
    const existingSet = new Set(
      (existingSubs || []).map((s: any) => `${s.user_id}_${s.week_number}`)
    );

    // 5. For each teacher × past week with no submission, insert a 'non-compliant' placeholder
    const missingRecords: any[] = [];
    for (const teacher of teachers) {
      for (const week of pastWeeks) {
        const key = `${teacher.id}_${week.week_number}`;
        if (!existingSet.has(key)) {
          missingRecords.push({
            user_id: teacher.id,
            file_name: `[MISSING] Week ${week.week_number}`,
            file_path: `missing/${teacher.id}/week_${week.week_number}`,
            file_hash: `missing_${teacher.id}_${week.week_number}_${schoolYear}`,
            file_size: 0,
            doc_type: 'Unknown',
            week_number: week.week_number,
            school_year: schoolYear,
            calendar_id: week.id,
            compliance_status: 'non-compliant'
          });
        }
      }
    }

    // 6. Batch insert (skip duplicates via file_hash uniqueness check)
    if (missingRecords.length > 0) {
      // Insert in batches of 50 to avoid payload limits
      for (let i = 0; i < missingRecords.length; i += 50) {
        const batch = missingRecords.slice(i, i + 50);

        // Check which hashes already exist to avoid duplicates
        const hashes = batch.map((r: any) => r.file_hash);
        const { data: existing } = await supabase
          .from('submissions')
          .select('file_hash')
          .in('file_hash', hashes);

        const existingHashes = new Set((existing || []).map((e: any) => e.file_hash));
        const newRecords = batch.filter((r: any) => !existingHashes.has(r.file_hash));

        if (newRecords.length > 0) {
          const { error: insertError } = await supabase
            .from('submissions')
            .insert(newRecords);

          if (!insertError) {
            marked += newRecords.length;
          } else {
            console.warn('[compliance] Batch insert error:', insertError.message);
          }
        }
      }
    }

    if (marked > 0) {
      console.log(`[compliance] Marked ${marked} missing submissions as non-compliant`);
    }
  } catch (err) {
    console.error('[compliance] markMissingSubmissions error:', err);
  }

  return marked;
}

/**
 * WBS 14.6 — Load-Based Compliance Calculation
 * Smart E-vision Instructional Supervision
 * 
 * This implements the new compliance logic where:
 * - Expected submissions = Teaching Loads Count × Academic Weeks
 * - Each missing or non-compliant submission counts as 1 non-compliant entry
 * - Missing weeks are auto-marked as non-compliant; status only changes when a submission occurs
 * - Compliance Rate = (Compliant Submissions / Total Expected Submissions) × 100
 * 
 * Example: 4 teaching loads × 10 weeks = 40 expected submissions
 * If teacher submits 10 compliant documents across various loads/weeks:
 * - Non-compliant count: 30 (40 - 10)
 * - Compliance rate: (10/40) × 100 = 25%
 */

export interface LoadBasedComplianceStats {
  expected_total: number; // teachingLoads × totalWeeks
  compliant_count: number;
  late_count: number;
  non_compliant_count: number;
  compliance_percentage: number; // (compliant_count / expected_total) × 100
  breakdown_by_status: {
    compliant: number;
    late: number;
    non_compliant: number;
  };
}

export interface WeeklyLoadBreakdown {
  week_number: number;
  expected_per_week: number; // teachingLoadsCount
  received_compliant: number;
  received_late: number;
  received_non_compliant: number;
  received_total: number;
  pending_count: number; // expected - received
  week_compliance_percentage: number;
}

/**
 * Calculate load-based compliance statistics.
 * Takes into account all teaching loads and all weeks.
 * 
 * Returns comprehensive compliance stats based on:
 * - Total expected = teachingLoads × totalWeeks
 * - Actual compliant count from submissions with status = "compliant"
 */
export function calculateLoadBasedCompliance(
  submissions: { compliance_status?: string; week_number?: number }[],
  teachingLoadsCount: number,
  totalWeeks: number = 10
): LoadBasedComplianceStats {
  const expectedTotal = teachingLoadsCount * totalWeeks;
  
  const counts = countSubmissionsByStatus(submissions);
  const compliant = counts.compliant;
  const late = counts.late;
  const non_compliant = counts.nonCompliant;

  // Non-compliant count = expected - (compliant + late)
  // But we also count explicit non-compliant submissions
  const actualNonCompliant = expectedTotal - compliant - late;

  const compliancePercentage = expectedTotal > 0 
    ? Math.round((compliant / expectedTotal) * 100)
    : 0;

  return {
    expected_total: expectedTotal,
    compliant_count: compliant,
    late_count: late,
    non_compliant_count: actualNonCompliant,
    compliance_percentage: compliancePercentage,
    breakdown_by_status: {
      compliant,
      late,
      non_compliant: actualNonCompliant
    }
  };
}

/**
 * Get weekly breakdown of load-based compliance.
 * For each week, shows what's expected vs what was received per teaching load.
 */
export function getWeeklyLoadBreakdown(
  submissions: { compliance_status?: string; week_number?: number }[],
  teachingLoadsCount: number,
  totalWeeks: number = 10
): WeeklyLoadBreakdown[] {
  const weekMap = new Map<number, any[]>();

  // Group submissions by week
  for (const sub of submissions) {
    const week = sub.week_number || 1;
    if (!weekMap.has(week)) {
      weekMap.set(week, []);
    }
    weekMap.get(week)!.push(sub);
  }

  const breakdown: WeeklyLoadBreakdown[] = [];
  
  for (let w = 1; w <= totalWeeks; w++) {
    const weekSubs = weekMap.get(w) || [];
    const counts = countSubmissionsByStatus(weekSubs);

    const expectedPerWeek = teachingLoadsCount;
    const received = counts.compliant + counts.late + counts.nonCompliant;
    const pending = expectedPerWeek - received;

    const weekCompliancePercentage = expectedPerWeek > 0
      ? Math.round((counts.compliant / expectedPerWeek) * 100)
      : 0;

    breakdown.push({
      week_number: w,
      expected_per_week: expectedPerWeek,
      received_compliant: counts.compliant,
      received_late: counts.late,
      received_non_compliant: counts.nonCompliant,
      received_total: received,
      pending_count: pending,
      week_compliance_percentage: weekCompliancePercentage
    });
  }

  return breakdown;
}

/**
 * Get comprehensive load-based compliance summary.
 * Includes total stats, weekly breakdown, and real-time compliance tracking.
 */
export function getLoadBasedComplianceSummary(
  submissions: { compliance_status?: string; week_number?: number }[],
  teachingLoadsCount: number,
  totalWeeks: number = 10
): {
  overall_stats: LoadBasedComplianceStats;
  weekly_breakdown: WeeklyLoadBreakdown[];
  total_submissions: number;
  submission_rate: number; // (received total / expected total) × 100
} {
  const overall_stats = calculateLoadBasedCompliance(submissions, teachingLoadsCount, totalWeeks);
  const weekly_breakdown = getWeeklyLoadBreakdown(submissions, teachingLoadsCount, totalWeeks);
  
  const counts = countSubmissionsByStatus(submissions);
  const total_submissions = counts.total;
  const submission_rate = overall_stats.expected_total > 0
    ? Math.round((total_submissions / overall_stats.expected_total) * 100)
    : 0;

  return {
    overall_stats,
    weekly_breakdown,
    total_submissions,
    submission_rate
  };
}
