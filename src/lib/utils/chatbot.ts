import intentModel from '../models/intent_classifier_model.json';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getCurrentSchoolYear as getDynamicSchoolYear } from './schoolYear';

export type Intent =
    | 'ask_compliance'
    | 'check_deadline'
    | 'find_dll'
    | 'school_compare'
    | 'teacher_stats'
    | 'calendar_info'
    | 'how_to_upload'
    | 'general_help';

export interface ChatResponse {
    intent: Intent;
    confidence: number;
    answer: string;
    slots: Record<string, string>;
}

export interface ChatContext {
    supabase: SupabaseClient;
    userId?: string;
    profile?: {
        id: string;
        full_name: string;
        role: string;
        school_id: string | null;
        district_id: string | null;
    } | null;
}

interface IntentModelData {
    version: string;
    intents: string[];
    vocabulary: Record<string, number>;
    coefficients: Record<string, Record<string, number>>;
    intercepts: Record<string, number>;
    classes_: string[];
}

interface DllDocument {
    id: string;
    subject: string;
    grade: string;
    week: number;
    teacher: string;
    school: string;
    bodyText: string;
    fileHash: string;
}

class IntentClassifier {
    private model: IntentModelData;
    private vocabSize: number;

    constructor(model: IntentModelData) {
        this.model = model;
        this.vocabSize = Object.keys(model.vocabulary).length;
    }

    private generateCharNgrams(text: string, minN: number = 2, maxN: number = 5): string[] {
        const cleaned = text.toLowerCase();
        const ngrams: string[] = [];
        for (let n = minN; n <= maxN; n++) {
            for (let i = 0; i <= cleaned.length - n; i++) {
                ngrams.push(cleaned.substring(i, i + n));
            }
        }
        return ngrams;
    }

    private featureVector(text: string): number[] {
        const vec = new Array(this.vocabSize).fill(0);
        const ngrams = this.generateCharNgrams(text);
        for (const ngram of ngrams) {
            const idx = this.model.vocabulary[ngram];
            if (idx !== undefined) {
                vec[idx]++;
            }
        }
        return vec;
    }

    public predict(text: string): { intent: Intent; confidence: number } {
        if (!text || text.trim().length === 0) {
            return { intent: 'general_help', confidence: 0 };
        }

        const vec = this.featureVector(text);

        const intents = this.model.intents as Intent[];
        let bestIntent: Intent = 'general_help';
        let bestScore = -Infinity;

        const scores: number[] = [];
        for (const intent of intents) {
            const intercept = this.model.intercepts[intent] || 0;
            const coefs = this.model.coefficients[intent] || {};
            let score = intercept;
            for (const [word, idx] of Object.entries(this.model.vocabulary)) {
                const coef = coefs[word];
                if (coef !== undefined) {
                    score += coef * (vec[idx as number] || 0);
                }
            }
            scores.push(score);
            if (score > bestScore) {
                bestScore = score;
                bestIntent = intent;
            }
        }

        const maxScore = Math.max(...scores);
        const expScores = scores.map(s => Math.exp(s - maxScore));
        const sumExp = expScores.reduce((a, b) => a + b, 0);
        const confidence = sumExp > 0 ? Math.round((expScores[intents.indexOf(bestIntent)] / sumExp) * 100) : 0;

        return { intent: bestIntent as Intent, confidence };
    }
}

function extractSlots(text: string, _intent: Intent): Record<string, string> {
    const slots: Record<string, string> = {};
    const lower = text.toLowerCase();

    const weekMatch = lower.match(/week\s*(\d+)/i) || lower.match(/(\d+)\s*(?:st|nd|rd|th)?\s*week/i);
    if (weekMatch) slots.week = weekMatch[1];

    const gradeMatch = lower.match(/grade\s*(\d+)/i);
    if (gradeMatch) slots.grade = gradeMatch[1];

    const subjects = ['mathematics', 'math', 'science', 'english', 'filipino',
        'gmrc', 'mapeh', 'makabansa', 'ap', 'epp', 'reading', 'language',
        'numeracy', 'arts', 'music', 'pe', 'health'];
    for (const subj of subjects) {
        if (lower.includes(subj)) {
            slots.subject = subj === 'math' ? 'Mathematics' : subj === 'pe' ? 'PE' : subj.charAt(0).toUpperCase() + subj.slice(1);
            break;
        }
    }

    const teacherMatch = lower.match(/teacher\s+(\w+)/i) || lower.match(/(?:for|of|about)\s+(\w[\w\s]+?)(?:'s|\s+stats|\s+records|\s+submissions)/i);
    if (teacherMatch) slots.teacher = teacherMatch[1].trim();

    const schoolNames = ['bulusan', 'guinobatan', 'ibaba', 'salong', 'suqui', 'camalig', 'manito', 'bacacay'];
    for (const school of schoolNames) {
        if (lower.includes(school)) {
            slots.school = school.charAt(0).toUpperCase() + school.slice(1) + ' Elementary School';
            break;
        }
    }

    return slots;
}

function generateTemplateResponse(intent: Intent, slots: Record<string, string>): string {
    const templates: Record<Intent, (s: Record<string, string>) => string> = {
        ask_compliance: () => "Let me check your compliance data. One moment, please.",
        check_deadline: () => "Let me look up the deadlines from the academic calendar.",
        find_dll: () => {
            let filters = '';
            if (slots.subject) filters += ` for ${slots.subject}`;
            if (slots.grade) filters += `, Grade ${slots.grade}`;
            if (slots.week) filters += `, Week ${slots.week}`;
            return `Searching DLLs${filters}...`;
        },
        school_compare: () => {
            if (slots.school) return `Let me pull up the compliance data for ${slots.school}.`;
            return "Let me compare the compliance rates across schools in your district.";
        },
        teacher_stats: () => {
            if (slots.teacher) return `Let me look up the submission records for ${slots.teacher}.`;
            return "Let me gather the teacher submission statistics.";
        },
        calendar_info: () => "Let me check the academic calendar for you.",
        how_to_upload: () => "Uploading a DLL is simple. Head over to the Upload page, then drag and drop your .docx or .pdf file. The system will automatically detect the subject, grade level, and week from the document. You will have a chance to review the extracted information before finalizing the upload. If you are offline, no worries — the document will be saved locally and will sync automatically once you are back online.",
        general_help: () => "I am here to help you with a variety of tasks. You can ask me to check your compliance rate, look up upcoming deadlines, find specific DLLs, compare performance across schools, or view statistics for teachers. If you need guidance on uploading documents, I can walk you through that too. Feel free to ask me something like, 'What is my compliance rate?' or 'When is the next deadline?'"
    };

    const generator = templates[intent];
    return generator ? generator(slots) : "I am not sure how to answer that. Could you try rephrasing? You can ask about compliance, deadlines, DLLs, school comparisons, or teacher statistics.";
}

function formatDate(dateStr: string): string {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

function isCompliant(status: string | null | undefined): boolean {
    return !status || status === 'compliant' || status === 'on-time';
}

async function queryCompliance(
    db: SupabaseClient,
    userId: string | undefined,
    profile: ChatContext['profile'],
    slots: Record<string, string>
): Promise<string> {
    if (!userId) return "Please log in to check your compliance rate.";

    const role = profile?.role;
    const schoolYear = getDynamicSchoolYear();
    const districtId = profile?.district_id;

    // Determine scope: which teachers to look up
    let userFilter: string[] | null = null;
    let scopeLabel: string;
    if (role === 'Teacher' || role === 'Master Teacher' || !role) {
        userFilter = [userId];
        scopeLabel = 'Your';
    } else if (role === 'School Head' && profile?.school_id) {
        const { data: teacherIds } = await db
            .from('profiles')
            .select('id')
            .eq('school_id', profile.school_id);
        if (!teacherIds || teacherIds.length === 0) return 'No teachers found in your school.';
        userFilter = teacherIds.map((t: any) => t.id);
        scopeLabel = 'Your school\'s';
    } else if (role === 'District Supervisor' && districtId) {
        const { data: schoolIds } = await db
            .from('schools')
            .select('id')
            .eq('district_id', districtId);
        if (!schoolIds || schoolIds.length === 0) return 'No schools found in your district.';
        const { data: teacherIds } = await db
            .from('profiles')
            .select('id')
            .in('school_id', schoolIds.map((s: any) => s.id));
        if (!teacherIds || teacherIds.length === 0) return 'No teachers found in your district.';
        userFilter = teacherIds.map((t: any) => t.id);
        scopeLabel = 'Your district\'s';
    } else {
        return "Unable to determine your scope. Please log in with a valid account.";
    }

    // ── Calculate expected count (matches dashboard: teachingLoadsCount × definedWeeks) ──
    const loadsFilter: any = { user_id: userFilter.length === 1 ? userFilter[0] : undefined };
    let teachingLoadsCount = 0;
    let uniqueSubjects: string[] = [];

    if (slots.grade) {
        loadsFilter.grade_level = slots.grade.length === 1 ? `Grade ${slots.grade}` : slots.grade;
    }

    if (userFilter.length === 1) {
        loadsFilter.user_id = userFilter[0];
        const { data: loads } = await db
            .from('teaching_loads')
            .select('subject')
            .eq('is_active', true)
            .eq('user_id', userFilter[0]);
        if (loads) {
            uniqueSubjects = [...new Set(loads.map((l: any) => l.subject))];
            teachingLoadsCount = uniqueSubjects.length;
        }
    } else {
        const { data: loads } = await db
            .from('teaching_loads')
            .select('user_id, subject')
            .eq('is_active', true)
            .in('user_id', userFilter);
        if (loads) {
            const userSubjects = new Map<string, Set<string>>();
            for (const l of loads as any[]) {
                if (!userSubjects.has(l.user_id)) userSubjects.set(l.user_id, new Set());
                userSubjects.get(l.user_id)!.add(l.subject);
            }
            teachingLoadsCount = 0;
            for (const subjects of userSubjects.values()) {
                teachingLoadsCount += subjects.size;
            }
            uniqueSubjects = [...new Set(loads.map((l: any) => l.subject))];
        }
    }

    // Get defined weeks from academic calendar
    let definedWeeks = 1;
    if (!slots.week) {
        let calQuery = db
            .from('academic_calendar')
            .select('week_number', { count: 'exact', head: true })
            .eq('school_year', schoolYear);
        if (districtId) {
            calQuery = calQuery.or(`district_id.eq.${districtId},district_id.is.null`);
        }
        const { count } = await calQuery;
        definedWeeks = count || 1;
    }

    // Filter teaching loads count by subject if subject slot is provided
    if (slots.subject && uniqueSubjects.length > 0) {
        const matched = uniqueSubjects.filter(s => s.toLowerCase().includes(slots.subject!.toLowerCase()));
        if (matched.length === 0) {
            return `I couldn't find a teaching load for "${slots.subject}".`;
        }
        teachingLoadsCount = matched.length;
    }

    const expectedTotal = teachingLoadsCount * definedWeeks;

    // ── Fetch actual submissions ──
    let query = db
        .from('submissions')
        .select('compliance_status, week_number, subject')
        .not('file_hash', 'like', 'nc_%');

    if (userFilter) query = query.in('user_id', userFilter);
    if (slots.week) query = query.eq('week_number', parseInt(slots.week));
    if (slots.subject) query = query.ilike('subject', `%${slots.subject}%`);

    if (slots.grade) {
        const gradeLabel = slots.grade.length === 1 ? `Grade ${slots.grade}` : slots.grade;
        const { data: tlData } = await db
            .from('teaching_loads')
            .select('id')
            .eq('grade_level', gradeLabel)
            .in('user_id', userFilter || [userId]);
        if (tlData && tlData.length > 0) {
            query = query.in('teaching_load_id', tlData.map((tl: any) => tl.id));
        } else {
            return `I couldn't find any submissions for ${gradeLabel}.`;
        }
    }

    const { data, error } = await query;

    if (error) return "Sorry, I couldn't access the compliance data right now. Please try again.";

    // ── Calculate compliance against expected ──
    const actualSubmissions = data || [];
    const compliant = actualSubmissions.filter((s: any) => isCompliant(s.compliance_status)).length;
    const late = actualSubmissions.filter((s: any) => s.compliance_status === 'late').length;
    const actualUploads = compliant + late;
    const nonCompliant = Math.max(0, expectedTotal - actualUploads);
    const rate = expectedTotal > 0 ? Math.round((actualUploads / expectedTotal) * 100) : 0;

    const pendingReview = actualSubmissions.filter((s: any) => !s.compliance_status).length;
    const compliantExplicit = actualSubmissions.filter((s: any) => s.compliance_status === 'compliant' || s.compliance_status === 'on-time').length;

    // ── Build response ──
    let response: string;
    if (slots.week) {
        response = `For Week ${slots.week}${slots.subject ? ` (${slots.subject})` : ''}, the compliance rate is ${rate}% (${actualUploads} out of ${expectedTotal}).`;
        if (compliant > 0) response += ` ${compliant} submission${compliant !== 1 ? 's are' : ' is'} compliant.`;
        if (late > 0) response += ` ${late} submission${late !== 1 ? 's are' : ' is'} late.`;
        if (nonCompliant > 0) response += ` ${nonCompliant} submission${nonCompliant !== 1 ? 's are' : ' is'} still missing.`;
    } else {
        response = `${scopeLabel} compliance rate is ${rate}% (${actualUploads} out of ${expectedTotal} expected submissions).`;
        response += ` There ${compliant === 1 ? 'is' : 'are'} ${compliant} compliant`;
        if (late > 0) response += `, ${late} late`;
        response += `, and ${nonCompliant} missing submission${nonCompliant !== 1 ? 's' : ''}.`;
        if (pendingReview > 0 && compliantExplicit < compliant) {
            response += ` ${pendingReview} submission${pendingReview > 1 ? 's are' : ' is'} uploaded but awaiting official review.`;
        }
        if (rate >= 90) response += ' You are doing excellently — keep it up.';
        else if (rate >= 75) response += ' You are on the right track. Just a few more submissions to go.';
        else response += ' There is room for improvement. Please consider uploading the missing DLLs on time.';
    }

    return response;
}

async function queryDeadline(
    db: SupabaseClient,
    districtId: string | undefined,
    slots: Record<string, string>
): Promise<string> {
    let query = db
        .from('academic_calendar')
        .select('*')
        .order('deadline_date', { ascending: true });

    if (districtId) {
        query = query.or(`district_id.eq.${districtId},district_id.is.null`);
    }
    if (slots.week) query = query.eq('week_number', parseInt(slots.week));
    if (!slots.week) query = query.limit(5);

    const { data, error } = await query;

    if (error) return "Sorry, I couldn't access the academic calendar right now.";
    if (!data || data.length === 0) {
        if (slots.week) return `I couldn't find a deadline for Week ${slots.week} in the academic calendar.`;
        return "No upcoming deadlines found. The academic calendar may not be set up yet for your district.";
    }

    if (slots.week) {
        const entry = data[0] as any;
        return `The deadline for Week ${entry.week_number}${entry.school_year ? ` (${entry.school_year})` : ''} is ${formatDate(entry.deadline_date)}.`;
    }

    const lines = (data as any[]).map((d: any) =>
        `${formatDate(d.deadline_date)}${d.description ? ' — ' + d.description : ''}`
    );
    return `Here are the upcoming deadlines:\n${lines.join('\n')}`;
}

async function queryDlls(
    db: SupabaseClient,
    slots: Record<string, string>,
    queryText?: string
): Promise<string> {
    // Prefer TF-IDF semantic search when the user asked a free-text question
    const hasStructuredSlots = !!(slots.subject || slots.week || slots.grade);
    if (!hasStructuredSlots && queryText && queryText.trim().length > 3) {
        try {
            if (!dllEngineLoaded) {
                await loadDllDocumentsFromSupabase(db);
                dllEngineLoaded = true;
            }
            const semantic = dllSearchEngine.search(queryText.trim(), 5);
            if (semantic.length > 0) {
                const lines = semantic.map((r, i) => {
                    const d = r.doc;
                    const grade = d.grade ? ` (${d.grade})` : '';
                    const week = d.week ? ` Week ${d.week}` : '';
                    return `${i + 1}. ${d.subject}${grade}${week} — ${d.teacher}`;
                });
                let summary = `Found ${semantic.length} DLL${semantic.length > 1 ? 's' : ''} matching "${queryText.trim()}":\n${lines.join('\n')}`;
                if (semantic.length === 5) summary += '\n\nFor more precise results, try a more specific search.';
                return summary;
            }
        } catch (e) {
            console.warn('[chatbot] Semantic search unavailable, falling back to SQL:', e);
        }
    }

    let query = db
        .from('submissions')
        .select(`
            id, file_name, week_number, subject, created_at,
            profile:profiles(full_name),
            teaching_load:teaching_loads(grade_level)
        `)
        .eq('doc_type', 'DLL')
        .order('created_at', { ascending: false });

    if (slots.subject) query = query.ilike('subject', `%${slots.subject}%`);
    if (slots.week) query = query.eq('week_number', parseInt(slots.week));

    if (slots.grade) {
        const gradeLabel = slots.grade.length === 1 ? `Grade ${slots.grade}` : slots.grade;
        const { data: tlData } = await db
            .from('teaching_loads')
            .select('id')
            .eq('grade_level', gradeLabel);

        if (tlData && tlData.length > 0) {
            query = query.in('teaching_load_id', tlData.map((t: any) => t.id));
        } else {
            return `I couldn't find any DLLs for ${gradeLabel}.`;
        }
    }

    query = query.limit(5);
    const { data, error } = await query;

    if (error) return "Sorry, I couldn't search DLLs right now.";
    if (!data || data.length === 0) {
        let msg = "I couldn't find any DLLs";
        const parts: string[] = [];
        if (slots.subject) parts.push(slots.subject);
        if (slots.grade) parts.push(`Grade ${slots.grade}`);
        if (slots.week) parts.push(`Week ${slots.week}`);
        if (parts.length > 0) msg += ` matching ${parts.join(' ')}`;
        return msg + '.';
    }

    const lines = (data as any[]).map((d: any, i: number) => {
        const teacher = d.profile?.full_name || 'Unknown teacher';
        const grade = d.teaching_load?.grade_level || '';
        const subj = d.subject || 'Unknown subject';
        const week = d.week_number ? ` Week ${d.week_number}` : '';
        return `${i + 1}. ${subj}${grade ? ' (' + grade + ')' : ''}${week} — ${teacher}`;
    });

    let summary = `Found ${data.length} DLL${data.length > 1 ? 's' : ''}`;
    const parts: string[] = [];
    if (slots.subject) parts.push(slots.subject);
    if (slots.grade) parts.push(`Grade ${slots.grade}`);
    if (slots.week) parts.push(`Week ${slots.week}`);
    if (parts.length > 0) summary += ` for ${parts.join(' ')}`;
    summary += `:\n${lines.join('\n')}`;
    if (data.length === 5) summary += '\n\nFor more precise results, try a more specific search.';

    return summary;
}

async function querySchoolCompare(
    db: SupabaseClient,
    districtId: string | undefined,
    profile: ChatContext['profile'],
    slots: Record<string, string>
): Promise<string> {
    const effectiveDistrictId = districtId || profile?.district_id;

    if (!effectiveDistrictId) {
        return "I need a district to compare schools. Please log in with a district-level account.";
    }

    // 1. Get schools in the district
    let schoolQuery = db.from('schools').select('id, name');
    if (slots.school) {
        schoolQuery = schoolQuery.ilike('name', `%${slots.school.replace('Elementary School', '').trim()}%`);
    }
    schoolQuery = schoolQuery.eq('district_id', effectiveDistrictId);

    const { data: schools, error: schoolErr } = await schoolQuery;
    if (schoolErr || !schools || schools.length === 0) {
        return slots.school
            ? `I couldn't find a school matching "${slots.school}" in your district.`
            : 'No schools found in your district.';
    }

    // 2. Get teachers at these schools
    const schoolIds = (schools as any[]).map((s: any) => s.id);
    const { data: teachers } = await db
        .from('profiles')
        .select('id, school_id')
        .eq('role', 'Teacher')
        .in('school_id', schoolIds);

    if (!teachers || teachers.length === 0) {
        return "No teachers found in these schools.";
    }

    // 3. Get submissions for these teachers (exclude NC placeholders)
    const teacherIds = (teachers as any[]).map((t: any) => t.id);
    const { data: submissions } = await db
        .from('submissions')
        .select('user_id, compliance_status')
        .in('user_id', teacherIds)
        .not('file_hash', 'like', 'nc_%');

    // 4. Build teacher → school mapping
    const teacherSchool = new Map<string, string>();
    for (const t of teachers as any[]) {
        teacherSchool.set(t.id, t.school_id);
    }

    // 5. Aggregate per school
    const schoolMap = new Map<string, { total: number; compliant: number }>();
    for (const school of schools as any[]) {
        schoolMap.set(school.name, { total: 0, compliant: 0 });
    }

    for (const s of (submissions || []) as any[]) {
        const schoolId = teacherSchool.get(s.user_id);
        if (!schoolId) continue;
        const school = (schools as any[]).find((sc: any) => sc.id === schoolId);
        if (!school) continue;
        const entry = schoolMap.get(school.name)!;
        entry.total++;
        if (isCompliant(s.compliance_status)) {
            entry.compliant++;
        }
    }

    const sorted = [...schoolMap.entries()]
        .map(([name, stats]) => ({
            name,
            rate: stats.total > 0 ? Math.round((stats.compliant / stats.total) * 100) : 0,
            total: stats.total,
            compliant: stats.compliant
        }))
        .sort((a, b) => b.rate - a.rate);

    if (sorted.length === 0 || sorted.every(s => s.total === 0)) {
        return "No submission data available for school comparison yet.";
    }

    if (slots.school) {
        const match = sorted[0];
        return match.total > 0
            ? `Compliance for ${slots.school} is ${match.rate}% (${match.compliant} out of ${match.total} submissions).`
            : `I could not find submission data for ${slots.school}.`;
    }

    const lines = sorted.map((s, i) => {
        const rank = i === 0 ? '(1st)' : i === 1 ? '(2nd)' : i === 2 ? '(3rd)' : '';
        return `${rank ? rank + ' ' : ''}${s.name}: ${s.rate}% (${s.compliant} out of ${s.total})`;
    });

    return `School compliance comparison in your district:\n${lines.join('\n')}`;
}

async function queryTeacherStats(
    db: SupabaseClient,
    userId: string | undefined,
    profile: ChatContext['profile'],
    slots: Record<string, string>
): Promise<string> {
    const role = profile?.role;
    if (!userId) return "Please log in to view teacher statistics.";

    // Determine which teachers to look up
    let userQuery = db.from('profiles').select('id, full_name, school_id, role');

    if (slots.teacher) {
        userQuery = userQuery.ilike('full_name', `%${slots.teacher}%`);
    } else if (role === 'Teacher' || role === 'Master Teacher') {
        userQuery = userQuery.eq('id', userId);
    } else if (role === 'School Head' && profile?.school_id) {
        const { data: schoolTeachers } = await db
            .from('profiles')
            .select('id')
            .eq('school_id', profile.school_id)
            .eq('role', 'Teacher');
        const tIds = (schoolTeachers || []).map((t: any) => t.id);
        if (tIds.length === 0) return "No teachers found in your school.";
        userQuery = userQuery.in('id', tIds);
    } else if (profile?.district_id) {
        const { data: schoolIds } = await db
            .from('schools')
            .select('id')
            .eq('district_id', profile.district_id);
        if (schoolIds && schoolIds.length > 0) {
            const { data: districtTeachers } = await db
                .from('profiles')
                .select('id')
                .in('school_id', schoolIds.map((s: any) => s.id))
                .eq('role', 'Teacher');
            const tIds = (districtTeachers || []).map((t: any) => t.id);
            if (tIds.length === 0) return "No teachers found in your district.";
            userQuery = userQuery.in('id', tIds);
        }
    }

    const { data: teachers, error: tErr } = await userQuery;
    if (tErr || !teachers || teachers.length === 0) {
        if (slots.teacher) return `I couldn't find a teacher named "${slots.teacher}".`;
        return "No teachers found.";
    }

    const teacherIds = (teachers as any[]).map((t: any) => t.id);
    const { data: subs, error: sErr } = await db
        .from('submissions')
        .select('user_id, compliance_status')
        .in('user_id', teacherIds)
        .not('file_hash', 'like', 'nc_%');

    if (sErr) return "Sorry, I couldn't load submission data.";

    // Count submissions per teacher
    const teacherSubMap = new Map<string, { total: number; compliant: number; late: number }>();
    for (const t of teachers as any[]) {
        teacherSubMap.set(t.id, { total: 0, compliant: 0, late: 0 });
    }
    for (const s of (subs || []) as any[]) {
        const entry = teacherSubMap.get(s.user_id);
        if (entry) {
            entry.total++;
            if (isCompliant(s.compliance_status)) entry.compliant++;
            else if (s.compliance_status === 'late') entry.late++;
        }
    }

    const sorted = (teachers as any[])
        .map((t: any) => ({
            name: t.full_name,
            ...teacherSubMap.get(t.id) || { total: 0, compliant: 0, late: 0 },
            role: t.role
        }))
        .filter(t => t.total > 0 || slots.teacher)
        .sort((a: any, b: any) => b.total - a.total);

    if (sorted.length === 0) {
        if (slots.teacher) return `Teacher "${slots.teacher}" has no submissions yet.`;
        return "No submission data available yet.";
    }

    if (slots.teacher || sorted.length === 1) {
        const t = sorted[0] as any;
        const rate = t.total > 0 ? Math.round((t.compliant / t.total) * 100) : 0;
        const nonCompliant = t.total - t.compliant - t.late;
        return `${t.name} has ${t.total} submission${t.total !== 1 ? 's' : ''} with a compliance rate of ${rate}% (${t.compliant} compliant${t.late > 0 ? `, ${t.late} late` : ''}${nonCompliant > 0 ? `, ${nonCompliant} non-compliant` : ''}).`;
    }

    const lines = sorted.slice(0, 10).map((t: any) => {
        const rate = t.total > 0 ? Math.round((t.compliant / t.total) * 100) : 0;
        return `${t.name}: ${rate}% (${t.compliant} out of ${t.total})`;
    });

    return `Teacher submission statistics:\n${lines.join('\n')}`;
}

async function queryCalendarInfo(
    db: SupabaseClient,
    districtId: string | undefined
): Promise<string> {
    let query = db
        .from('academic_calendar')
        .select('*')
        .order('deadline_date', { ascending: true });

    if (districtId) {
        query = query.or(`district_id.eq.${districtId},district_id.is.null`);
    }
    query = query.limit(20);

    const { data, error } = await query;

    if (error) return "Sorry, I couldn't access the academic calendar right now.";

    if (!data || data.length === 0) {
        return "The academic calendar hasn't been set up for your district yet. Contact your district supervisor to configure it.";
    }

    const entries = data as any[];
    const quarters = [...new Set(entries.map((e: any) => `Quarter ${e.quarter}`))].join(', ');
    const weeks = entries.length;
    const first = entries[0];
    const nextDeadline = entries.find((e: any) => new Date(e.deadline_date) > new Date());

    let response = `The academic calendar covers ${quarters} and has ${weeks} weeks scheduled`;
    if (first?.school_year) response += ` for the school year ${first.school_year}`;
    response += '.';

    if (nextDeadline) {
        response += `\n\nThe next deadline is for Week ${nextDeadline.week_number}, falling on ${formatDate(nextDeadline.deadline_date)}`;
        if (nextDeadline.description) response += ` — ${nextDeadline.description}`;
        response += '.';
    }

    return response;
}

async function generateDatabaseResponse(
    intent: Intent,
    slots: Record<string, string>,
    ctx: ChatContext
): Promise<string> {
    const { supabase: db, userId, profile } = ctx;

    try {
        switch (intent) {
            case 'ask_compliance':
                return await queryCompliance(db, userId, profile, slots);
            case 'check_deadline':
                return await queryDeadline(db, profile?.district_id ?? undefined, slots);
            case 'find_dll':
                return await queryDlls(db, slots, text);
            case 'school_compare':
                return await querySchoolCompare(db, profile?.district_id ?? undefined, profile, slots);
            case 'teacher_stats':
                return await queryTeacherStats(db, userId, profile, slots);
            case 'calendar_info':
                return await queryCalendarInfo(db, profile?.district_id ?? undefined);
            default:
                return generateTemplateResponse(intent, slots);
        }
    } catch (err) {
        console.error('[chatbot] DB response error:', err);
        return "Sorry, I ran into an error fetching data. Please try again.";
    }
}

class DllSearchEngine {
    private documents: DllDocument[] = [];

    setDocuments(docs: DllDocument[]) {
        this.documents = docs;
    }

    private buildTermVector(text: string): Map<string, number> {
        const vec = new Map<string, number>();
        const tokens = text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(w => w.length > 2);
        for (const token of tokens) {
            vec.set(token, (vec.get(token) || 0) + 1);
        }
        return vec;
    }

    private docFreq(token: string): number {
        let count = 0;
        for (const doc of this.documents) {
            if (doc.bodyText.toLowerCase().includes(token)) count++;
        }
        return count;
    }

    private tfidf(vec: Map<string, number>): Map<string, number> {
        const result = new Map<string, number>();
        const totalDocs = this.documents.length || 1;
        for (const [token, tf] of vec) {
            const df = this.docFreq(token);
            const idf = Math.log((totalDocs + 1) / (df + 1)) + 1;
            result.set(token, tf * idf);
        }
        return result;
    }

    private cosineSimilarity(a: Map<string, number>, b: Map<string, number>): number {
        let dot = 0, normA = 0, normB = 0;
        for (const [key, val] of a) {
            normA += val * val;
            const bVal = b.get(key) || 0;
            dot += val * bVal;
        }
        for (const val of b.values()) normB += val * val;
        const denom = Math.sqrt(normA) * Math.sqrt(normB);
        return denom === 0 ? 0 : dot / denom;
    }

    search(query: string, topK: number = 3): { doc: DllDocument; score: number }[] {
        if (this.documents.length === 0) return [];

        const qVec = this.tfidf(this.buildTermVector(query));
        const results: { doc: DllDocument; score: number }[] = [];

        for (const doc of this.documents) {
            const dVec = this.tfidf(this.buildTermVector(doc.bodyText));
            const score = this.cosineSimilarity(qVec, dVec);
            if (score > 0.01) {
                results.push({ doc, score: Math.round(score * 1000) / 1000 });
            }
        }

        return results.sort((a, b) => b.score - a.score).slice(0, topK);
    }
}

export const intentClassifier = new IntentClassifier(intentModel as unknown as IntentModelData);
export const dllSearchEngine = new DllSearchEngine();
let dllEngineLoaded = false;

export async function processQuery(text: string, ctx?: ChatContext): Promise<ChatResponse> {
    const { intent, confidence } = intentClassifier.predict(text);
    const slots = extractSlots(text, intent);

    let answer: string;
    if (ctx?.supabase) {
        answer = await generateDatabaseResponse(intent, slots, ctx);
    } else {
        answer = generateTemplateResponse(intent, slots);
    }

    return { intent, confidence, answer, slots };
}

export function searchDlls(query: string, topK: number = 3) {
    return dllSearchEngine.search(query, topK);
}

export function loadDllDocuments(docs: DllDocument[]) {
    dllSearchEngine.setDocuments(docs);
}

export async function loadDllDocumentsFromSupabase(db: SupabaseClient, schoolYear?: string): Promise<number> {
    const year = schoolYear || getDynamicSchoolYear();
    const { data, error } = await db
        .from('submissions')
        .select('id, subject, week_number, file_hash, raw_text, profiles!inner(full_name)')
        .not('raw_text', 'is', null)
        .not('raw_text', 'eq', '')
        .eq('school_year', year)
        .limit(1000);

    if (error || !data) {
        console.warn('[chatbot] Failed to load DLL documents:', error?.message);
        return 0;
    }

    const docs: DllDocument[] = data.map((r: any) => ({
        id: r.id,
        subject: r.subject || '',
        grade: '',
        week: r.week_number || 0,
        teacher: r.profiles?.full_name || 'Unknown',
        school: r.profiles?.schools?.name || 'Unknown',
        bodyText: r.raw_text,
        fileHash: r.file_hash
    }));

    dllSearchEngine.setDocuments(docs);
    console.log(`[chatbot] Loaded ${docs.length} documents into search engine`);
    return docs.length;
}
