import intentModel from '../models/intent_classifier_model.json';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getCurrentSchoolYear as getDynamicSchoolYear } from './schoolYear';

// ─── Text Normalization ────────────────────────────────────────────────────
// Makes the bot robust to typos, wrong grammar, repeated characters, emojis,
// and diacritics. All light-weight, pure string ops — no heavy model.

const DIACRITIC_MAP: Record<string, string> = {
    'á': 'a', 'à': 'a', 'â': 'a', 'ä': 'a', 'ã': 'a', 'å': 'a', 'ā': 'a',
    'é': 'e', 'è': 'e', 'ê': 'e', 'ë': 'e', 'ẽ': 'e', 'ē': 'e',
    'í': 'i', 'ì': 'i', 'î': 'i', 'ï': 'i', 'ī': 'i',
    'ó': 'o', 'ò': 'o', 'ô': 'o', 'ö': 'o', 'õ': 'o', 'ō': 'o',
    'ú': 'u', 'ù': 'u', 'û': 'u', 'ü': 'u', 'ū': 'u',
    'ñ': 'n', 'ç': 'c', 'š': 's', 'ž': 'z', 'ý': 'y', 'ÿ': 'y', 'ß': 'ss'
};

function stripDiacritics(text: string): string {
    return text.replace(/[áàâäãåāéèêëẽēíìîïīóòôöõōúùûüūñçšžýÿß]/g, ch => DIACRITIC_MAP[ch] || ch);
}

function removeEmojis(text: string): string {
    return text.replace(/[\u{1F000}-\u{1FFFF}\u{2600}-\u{27BF}\u{FE0F}\u{2190}-\u{21FF}]/gu, ' ');
}

function collapseRepeats(text: string): string {
    return text.replace(/(\w)\1{2,}/g, '$1$1');
}

function normalizeText(text: string): string {
    return stripDiacritics(removeEmojis(text))
        .toLowerCase()
        .replace(/\s+/g, ' ')
        .trim();
}

function levenshtein(a: string, b: string): number {
    const m = a.length, n = b.length;
    if (m === 0) return n;
    if (n === 0) return m;
    const dp: number[] = new Array(n + 1).fill(0).map((_, j) => j);
    for (let i = 1; i <= m; i++) {
        let prev = dp[0];
        dp[0] = i;
        for (let j = 1; j <= n; j++) {
            const tmp = dp[j];
            dp[j] = Math.min(
                dp[j] + 1,
                dp[j - 1] + 1,
                prev + (a[i - 1] === b[j - 1] ? 0 : 1)
            );
            prev = tmp;
        }
    }
    return dp[n];
}

/** Best fuzzy word match against a dictionary, returning the matched word + score. */
function fuzzyMatch(token: string, dictionary: string[], maxDist: number = 1): string | null {
    const t = collapseRepeats(token);
    for (const word of dictionary) {
        if (word === t) return word;
    }
    if (t.length < 3) return null;
    let best: string | null = null;
    let bestDist = maxDist + 1;
    for (const word of dictionary) {
        const d = levenshtein(t, word);
        if (d <= maxDist && d < bestDist) {
            bestDist = d;
            best = word;
        }
    }
    return best;
}

// Common dictionary used for fuzzy slot extraction & knowledge matching.
const FUZZY_DICT = [
    'compliant', 'compliance', 'complience', 'submission', 'submissions', 'late', 'missing',
    'deadline', 'deadlines', 'week', 'weeks', 'grade', 'teacher', 'teachers', 'school',
    'district', 'dll', 'dlls', 'calendar', 'upload', 'uploading', 'compare', 'comparison',
    'ranking', 'statistics', 'stats', 'calendar', 'fractions', 'mathematics', 'science',
    'english', 'filipino', 'grade', 'year', 'term', 'quarter', 'today', 'this', 'next'
];

// ─── Human-like Phrasing ───────────────────────────────────────────────────
function pick<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
}

const OPENERS = ['Here you go!', 'Got it.', 'Sure thing!', 'Here\u2019s what I found:', 'Of course!'];
const LOW_CONFIDENCE_PREFIXES = [
    'I think you might be asking about',
    'I\u2019m not 100% sure, but this looks related to',
    'If I understand you correctly, you\u2019re asking about',
    'I think you mean'
];
const LOW_CONFIDENCE_SUFFIXES = [
    'If that wasn\u2019t what you meant, just rephrase it and I\u2019ll give it another go.',
    'Let me know if I got that right.',
    'If I misread you, try rephrasing in a different way.',
    'Does that sound about right?'
];
const CONFUSED_RESPONSES = [
    'Hmm, I\u2019m not quite sure I caught that. Could you rephrase it for me?',
    'I didn\u2019t quite understand that. Try asking in a different way.',
    'That one\u2019s a little fuzzy for me. Can you say it another way?',
    'I\u2019m having trouble parsing that. Try something like, \u201cWhat is my compliance rate?\u201d'
];

// ─── Knowledge Base (lightweight FAQ corpus) ───────────────────────────────
interface KnowledgeEntry {
    keywords: string[];
    answer: string;
}

const KNOWLEDGE_BASE: KnowledgeEntry[] = [
    {
        keywords: ['dll', 'daily lesson log', 'weekly lesson log', 'lingguhang aralin', 'lesson plan', 'banghay'],
        answer: 'A DLL (Daily Lesson Log) is the DepEd weekly lesson planning document that teachers prepare and submit for compliance monitoring. Each DLL covers the learning area, grade level, teaching dates, and week for your teaching load.'
    },
    {
        keywords: ['isp', 'instructional supervisory plan'],
        answer: 'An ISP (Instructional Supervisory Plan) is the school\u2019s supervisory blueprint that lists program improvement areas, targets, strategies, and the time frame for instructional monitoring and support.'
    },
    {
        keywords: ['isr', 'instructional supervisory report'],
        answer: 'An ISR (Instructional Supervisory Report) is the monthly report a Master Teacher submits after observing classroom instruction. It captures the teacher observed, findings, and technical assistance provided.'
    },
    {
        keywords: ['compliance', 'calculated', 'computed', 'rate', 'percent'],
        answer: 'Compliance is measured as your actual submissions divided by your expected submissions (number of active teaching loads \u00d7 weeks defined in the academic calendar). Submitted on time = compliant; after the due date = late; not submitted = missing.'
    },
    {
        keywords: ['offline', 'internet', 'connect', 'sync', 'no network'],
        answer: 'You can keep working offline. Documents you upload while offline are saved locally and sync automatically to the server the next time you regain a connection.'
    },
    {
        keywords: ['role', 'master teacher', 'school head', 'district supervisor', 'administrator'],
        answer: 'Each role sees a tailored view: Teachers manage their own DLLs; Master Teachers review and endorse; School Heads monitor their school; District Supervisors compare across the whole district.'
    },
    {
        keywords: ['deadline', 'when', 'due', 'cutoff', 'cut off', 'date'],
        answer: 'Deadlines follow the academic calendar set by your district. Ask me \u201cWhen is the next deadline?\u201d and I\u2019ll pull the exact dates for you.'
    },
    {
        keywords: ['greeting', 'hello', 'hi', 'hey', 'good morning', 'good afternoon', 'good evening', 'kamusta', 'kumusta', 'kumusta', 'salamat', 'thanks', 'thank you'],
        answer: 'Hello! I\u2019m SmartE Vision\u2019s AI assistant. I can check your compliance, find DLLs, look up deadlines, compare schools, and show teacher stats. What would you like to know?'
    },
    {
        keywords: ['who are you', 'your name', 'about yourself', 'what are you', 'sino ka', 'tell me about you'],
        answer: 'I\u2019m SmartE Vision\u2019s built-in AI assistant. I live right in the app and answer your questions using live data \u2014 no internet bill needed. Ask me anything about compliance, DLLs, deadlines, or school performance!'
    }
];

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
    /** Short-term conversation memory for follow-up questions. */
    memory?: {
        lastIntent?: Intent;
        lastSlots?: Record<string, string>;
    };
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
        const cleaned = normalizeText(text);
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

function extractSlots(text: string, _intent: Intent, memory?: ChatContext['memory']): Record<string, string> {
    const slots: Record<string, string> = {};
    const lower = normalizeText(text);

    // Inherit slots from conversation memory (e.g. follow-up "and what about week 4?")
    if (memory?.lastSlots) {
        Object.assign(slots, memory.lastSlots);
    }

    const weekMatch = lower.match(/week\s*(\d+)/i) || lower.match(/(\d+)\s*(?:st|nd|rd|th)?\s*week/i);
    if (weekMatch) slots.week = weekMatch[1];

    const gradeMatch = lower.match(/grade\s*(\d+)/i);
    if (gradeMatch) slots.grade = gradeMatch[1];

    const subjects = ['mathematics', 'math', 'science', 'english', 'filipino',
        'gmrc', 'mapeh', 'makabansa', 'ap', 'epp', 'reading', 'language',
        'numeracy', 'arts', 'music', 'pe', 'health'];
    for (const subj of subjects) {
        if (lower.includes(subj) || lower.includes(subj.slice(0, 3))) {
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

    // Fuzzy-match "week"/"grade" tokens for typos like "wekk 4"
    if (!slots.week) {
        for (const tok of lower.split(/\s+/)) {
            const num = tok.match(/\d+/);
            if (num) {
                const fuzzyWeek = fuzzyMatch(tok.replace(/\d+/g, ''), ['week', 'wk', 'weeks']);
                if (fuzzyWeek) { slots.week = num[0]; break; }
            }
        }
    }

    return slots;
}

function generateTemplateResponse(intent: Intent, slots: Record<string, string>): string {
    const templates: Record<Intent, (s: Record<string, string>) => string> = {
        ask_compliance: () => pick(["Let me check your compliance data — one moment.", "On it! Checking your compliance records now.", "Sure, pulling up your compliance status."]),
        check_deadline: () => pick(["Let me look up the deadlines from the academic calendar.", "Checking the calendar for deadlines.", "On it — grabbing the deadline dates for you."]),
        find_dll: () => {
            let filters = '';
            if (slots.subject) filters += ` for ${slots.subject}`;
            if (slots.grade) filters += `, Grade ${slots.grade}`;
            if (slots.week) filters += `, Week ${slots.week}`;
            return pick([`Searching DLLs${filters}...`, `Looking for DLLs${filters}...`, `Let me find those DLLs${filters} for you.`]);
        },
        school_compare: () => {
            if (slots.school) return pick([`Let me pull up the compliance data for ${slots.school}.`, `Checking how ${slots.school} is doing.`]);
            return pick(["Let me compare the compliance rates across schools in your district.", "Comparing schools in your district now.", "Gathering the school comparison data."]);
        },
        teacher_stats: () => {
            if (slots.teacher) return pick([`Let me look up the submission records for ${slots.teacher}.`, `Checking ${slots.teacher}'s stats.`]);
            return pick(["Let me gather the teacher submission statistics.", "Pulling up teacher stats.", "Fetching teacher performance data."]);
        },
        calendar_info: () => pick(["Let me check the academic calendar for you.", "Looking at the school calendar now.", "Let me pull up the academic calendar."]),
        how_to_upload: () => "Uploading a DLL is simple. Head over to the Upload page, then drag and drop your .docx or .pdf file. The system will automatically detect the subject, grade level, and week from the document. You will have a chance to review the extracted information before finalizing the upload. If you are offline, no worries — the document will be saved locally and will sync automatically once you are back online.",
        general_help: () => "I\u2019m here to help with a bunch of things. I can check your compliance rate, look up deadlines, find DLLs, compare schools, or show teacher stats. Try asking something like, \u201cWhat is my compliance rate?\u201d or \u201cWhen is the next deadline?\u201d"
    };

    const generator = templates[intent];
    return generator ? generator(slots) : pick(CONFUSED_RESPONSES);
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
        return `${t.name} has ${t.total} submission${t.total !== 1 ? 's' : ''} with a compliance rate of ${rate}% (${t.compliant} compliant${t.late > 0 ? `, ${t.late} late` : ''}${nonCompliant > 0 ? `, ${nonCompliant} missing` : ''}).`;
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
    ctx: ChatContext,
    rawText?: string
): Promise<string> {
    const { supabase: db, userId, profile } = ctx;

    try {
        switch (intent) {
            case 'ask_compliance':
                return await queryCompliance(db, userId, profile, slots);
            case 'check_deadline':
                return await queryDeadline(db, profile?.district_id ?? undefined, slots);
            case 'find_dll':
                return await queryDlls(db, slots, rawText);
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
        const tokens = normalizeText(text).replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(w => w.length > 2);
        for (const token of tokens) {
            vec.set(token, (vec.get(token) || 0) + 1);
        }
        return vec;
    }

    // Jaccard-over-typo-tolerant-tokens: helps find docs even with misspelled queries.
    private tokenJaccard(a: Map<string, number>, b: Map<string, number>): number {
        const aKeys = [...a.keys()];
        const bKeys = [...b.keys()];
        if (aKeys.length === 0 || bKeys.length === 0) return 0;
        let inter = 0;
        for (const k of aKeys) {
            if (bKeys.includes(k)) inter++;
            else if (bKeys.some(bk => bk.length >= 4 && levenshtein(k, bk) <= 1)) inter += 0.5;
        }
        const union = new Set([...aKeys, ...bKeys]).size;
        return union === 0 ? 0 : inter / union;
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
            const cosine = this.cosineSimilarity(qVec, dVec);
            const jaccard = this.tokenJaccard(qVec, dVec);
            // Hybrid ranking: prefer semantic (TF-IDF) but blend typo-tolerant Jaccard.
            const score = cosine * 0.7 + jaccard * 0.3;
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
    const slots = extractSlots(text, intent, ctx?.memory);

    let answer: string;

    // 1. Greetings / small talk / quick facts hit the knowledge base first
    const kbHit = matchKnowledgeBase(text);
    if (kbHit && (intent === 'general_help' || intent === 'how_to_upload' || confidence < 40)) {
        answer = kbHit;
    } else if (ctx?.supabase) {
        answer = await generateDatabaseResponse(intent, slots, ctx, text);
    } else {
        answer = generateTemplateResponse(intent, slots);
    }

    // 2. Humanize: prefix confident answers with a natural opener, hedge low-confidence ones
    if (confidence >= 60 && !answer.startsWith('Hello') && !answer.startsWith('I\u2019m')) {
        answer = `${pick(OPENERS)} ${answer}`;
    } else if (confidence < 45 && intent === 'general_help' && !kbHit) {
        answer = `${pick(LOW_CONFIDENCE_PREFIXES)} ${pick([
            'your compliance status', 'finding a DLL', 'upcoming deadlines',
            'school comparisons', 'teacher statistics', 'how to upload a document'
        ])}. ${pick(LOW_CONFIDENCE_SUFFIXES)}`;
    }

    return { intent, confidence, answer, slots };
}

function matchKnowledgeBase(text: string): string | null {
    const lower = normalizeText(text);
    const tokens = lower.split(/\s+/);
    for (const entry of KNOWLEDGE_BASE) {
        let matched = false;
        for (const kw of entry.keywords) {
            if (kw.includes(' ') || kw.length > 6) {
                // Multi-word / long keywords: exact substring or fuzzy phrase match
                if (lower.includes(kw)) { matched = true; break; }
            } else {
                // Short keywords: token-exact or fuzzy token match
                for (const tok of tokens) {
                    if (tok === kw || fuzzyMatch(tok, [kw], 1)) { matched = true; break; }
                }
                if (matched) break;
            }
        }
        if (matched) return entry.answer;
    }
    return null;
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
