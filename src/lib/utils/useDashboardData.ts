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
  schoolYear: string = getDynamicSchoolYear(),
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
  schoolYear: string = getDynamicSchoolYear(),
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
 * Count the number of weeks defined in the academic_calendar table.
 * This determines the multiplier for teaching loads in compliance calculations.
 */
export async function getDefinedWeeksCount(
  supabase: any,
  schoolYear: string = getDynamicSchoolYear(),
  districtId?: string
): Promise<number> {
  const weeks = await getActualWeeks(supabase, schoolYear, districtId);

  // User requirement: weeks show up as expected loads as soon as they are set in calendar.
  // So we count all weeks defined for this year.
  return weeks.length || 1; // Minimum 1 to avoid 0% issues if calendar is empty
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
 * Rate = Compliant / Expected
 * Non-compliant records are now explicitly inserted into the DB by
 * markNonCompliantSubmissions, so we simply count what exists.
 */
export function calculateCompliance(
  submissions: { compliance_status?: string; created_at?: string }[],
  teachingLoadsCount: number = 0,
  expectedOverride?: number
): ComplianceStats {
  const counts = countSubmissionsByStatus(submissions);
  const expected = expectedOverride !== undefined ? expectedOverride : teachingLoadsCount;

  // Rate = Compliant / Expected (Strict Load-Based)
  const denominator = expected > 0 ? expected : counts.total;
  const rate = denominator > 0 ? Math.min(100, Math.round((counts.compliant / denominator) * 100)) : 0;

  return {
    Compliant: counts.compliant,
    Late: counts.late,
    NonCompliant: counts.nonCompliant,
    totalUploaded: counts.total,
    expected,
    rate
  };
}

/**
 * Dynamic Academic Year calculation.
 * Returns 'YYYY-YYYY' based on current date (Aug 1st transition).
 */
export function getDynamicSchoolYear(date: Date = new Date()): string {
  const month = date.getMonth(); // 0-indexed
  const year = date.getFullYear();
  // Academic year starts in August (7)
  if (month >= 7) {
    return `${year}-${year + 1}`;
  }
  return `${year - 1}-${year}`;
}

/**
 * Fallback week number calculation.
 * Calculates week number based on August 1st of the current academic year.
 */
export function getWeekNumber(date: Date = new Date()): number {
  const year = date.getMonth() >= 7 ? date.getFullYear() : date.getFullYear() - 1;
  const start = new Date(year, 7, 1); // August 1st
  const diff = date.getTime() - start.getTime();
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
 * WBS 14.5 — Active Non-Compliant Submission Detection (Per Teaching Load)
 * 
 * Scans past-deadline calendar weeks and, for each teacher, checks how many
 * teaching loads they have. For each (teacher, load, week) tuple with no
 * matching submission, inserts a 'non-compliant' placeholder record.
 * 
 * Example: Teacher has 4 loads, Weeks 1 & 2 are past-deadline.
 *   - Week 1: 1 submission uploaded → 3 non-compliant records inserted
 *   - Week 2: 2 submissions uploaded → 2 non-compliant records inserted
 *   Total auto-inserted: 5 non-compliant records
 * 
 * Returns the number of newly inserted non-compliant records.
 */
export async function markNonCompliantSubmissions(
  supabase: any,
  schoolYear: string = getDynamicSchoolYear(),
  districtId?: string,
  userId?: string,
  schoolId?: string
): Promise<number> {
  let marked = 0;

  try {
    console.log('[NC] markNonCompliantSubmissions called with:', { schoolYear, districtId, userId, schoolId });

    // 1. Get all weeks from academic calendar (user wants them to appear as soon as set)
    let calQuery = supabase
      .from('academic_calendar')
      .select('id, week_number')
      .eq('school_year', schoolYear)
      .order('week_number', { ascending: true });

    if (districtId) {
      calQuery = calQuery.eq('district_id', districtId);
    }

    const { data: pastWeeks, error: calError } = await calQuery;
    console.log('[NC] Calendar weeks found:', pastWeeks?.length || 0, 'error:', calError?.message || 'none');
    if (calError || !pastWeeks || pastWeeks.length === 0) return 0;

    // 2. Get teachers in scope
    let teacherQuery = supabase
      .from('profiles')
      .select('id, full_name, school_id')
      .eq('role', 'Teacher');

    if (userId) {
      teacherQuery = teacherQuery.eq('id', userId);
    } else if (schoolId) {
      teacherQuery = teacherQuery.eq('school_id', schoolId);
    } else if (districtId) {
      const { data: schools } = await supabase.from('schools').select('id').eq('district_id', districtId);
      console.log('[NC] Schools in district:', schools?.length || 0);
      if (schools && schools.length > 0) {
        teacherQuery = teacherQuery.in('school_id', schools.map((s: any) => s.id));
      }
    }

    const { data: teachers, error: teacherError } = await teacherQuery;
    console.log('[NC] Teachers found:', teachers?.length || 0, 'error:', teacherError?.message || 'none');
    if (teacherError || !teachers || teachers.length === 0) return 0;

    const teacherIds = teachers.map((t: any) => t.id);

    // 3. Get teaching loads (all loads, not just active — teachers may not have is_active set)
    const { data: teachingLoads } = await supabase
      .from('teaching_loads')
      .select('id, user_id, subject')
      .in('user_id', teacherIds);

    console.log('[NC] Teaching loads found:', teachingLoads?.length || 0);
    if (!teachingLoads || teachingLoads.length === 0) {
      console.warn('[NC] No teaching loads found for any teachers. Exiting.');
      return 0;
    }

    // 4. Get existing submissions (all statuses)
    const weekNumbers = pastWeeks.map((w: any) => w.week_number);
    const { data: existingSubs } = await supabase
      .from('submissions')
      .select('id, user_id, week_number, compliance_status, file_hash')
      .in('user_id', teacherIds)
      .in('week_number', weekNumbers)
      .eq('school_year', schoolYear);

    // 5. Rebalancing Logic per (teacher, week)
    const ncRecords: any[] = [];
    const idsToDelete: string[] = [];

    for (const teacher of teachers) {
      const myLoads = teachingLoads.filter((l: any) => l.user_id === teacher.id);
      const loadCount = myLoads.length;
      if (loadCount === 0) continue;

      for (const week of pastWeeks) {
        const mySubs = (existingSubs || []).filter((s: any) => s.user_id === teacher.id && s.week_number === week.week_number);

        const realCount = mySubs.filter((s: any) => s.compliance_status === 'compliant' || s.compliance_status === 'late').length;
        const ncSubs = mySubs.filter((s: any) => s.compliance_status === 'non-compliant');
        const total = realCount + ncSubs.length;

        if (total > loadCount) {
          // Delete excess NC records
          const excess = total - loadCount;
          const toDel = ncSubs.slice(0, excess).map((s: any) => s.id);
          idsToDelete.push(...toDel);
        } else if (total < loadCount) {
          // Insert missing NC records
          const missing = loadCount - total;
          for (let i = 0; i < missing; i++) {
            // Find a slot index that doesn't conflict with existing deterministic hashes
            // Actually, let's just use a timestamp for unique hashes to avoid collisions if rebalancing
            // but deterministic is safer for batching. Let's use slot based on ncSubs.length + i.
            const slot = ncSubs.length + i;
            const hash = `nc_${teacher.id}_${week.week_number}_${slot}_${schoolYear}`;

            // Safety: skip if hash already in mySubs (shouldn't happen if total < loadCount, but just in case)
            if (mySubs.find((s: any) => s.file_hash === hash)) continue;

            ncRecords.push({
              user_id: teacher.id,
              file_name: `[Non-Compliant] Week ${week.week_number} - Slot ${slot + 1}`,
              file_path: `non-compliant/${teacher.id}/week_${week.week_number}_${slot}`,
              file_hash: hash,
              file_size: 0,
              doc_type: 'Non-Compliant',
              week_number: week.week_number,
              school_year: schoolYear,
              calendar_id: week.id,
              compliance_status: 'non-compliant'
            });
          }
        }
      }
    }

    // 6. Execute balanced changes
    console.log('[NC] Rebalance result — to delete:', idsToDelete.length, 'to insert:', ncRecords.length);

    if (idsToDelete.length > 0) {
      await supabase.from('submissions').delete().in('id', idsToDelete);
    }

    if (ncRecords.length > 0) {
      const { error } = await supabase.from('submissions').insert(ncRecords);
      if (!error) marked += ncRecords.length;
      else console.error('[NC] Insert error:', error);
    }

    console.log('[NC] Total marked:', marked);
    return marked;
  } catch (err) {
    console.error('[markNonCompliantSubmissions] Error:', err);
    return 0;
  }
}

