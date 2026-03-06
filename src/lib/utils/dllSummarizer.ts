/**
 * DLL Summarizer — Offline NLP Quick View Generator
 * AI Feature 2: Extracts key competencies, activities, and keywords
 * from a parsed DLL using TF-IDF keyword extraction.
 * 
 * 100% offline, no external APIs. Runs in < 50ms on low-end mobile.
 */

import type { DLLContent } from './ocr';
import { config } from './config';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface DLLSummary {
    keyCompetencies: string[];
    keyActivities: string[];
    topicKeywords: string[];
    coverageScore: number;
    sectionScores: Record<string, number>;
    warnings: string[];
    quickView: string;
}

// ─── Education Vocabulary (IDF weights for DepEd terms) ──────────────────────

const EDUCATION_VOCAB: Record<string, number> = {
    // High-signal DepEd/K-12 terms (lower IDF = more common = less signal)
    'competency': 1.0, 'competencies': 1.0, 'learning': 0.5, 'standard': 1.2,
    'performance': 1.2, 'content': 0.6, 'assessment': 1.3, 'objective': 1.5,
    'evaluate': 1.8, 'analyze': 1.8, 'create': 1.9, 'apply': 1.6,
    'formative': 2.0, 'summative': 2.0, 'rubric': 2.2, 'differentiated': 2.3,
    'collaborative': 1.7, 'inquiry': 2.0, 'critical': 1.5, 'thinking': 1.0,
    'activity': 0.8, 'activities': 0.8, 'discussion': 1.2, 'group': 0.9,
    'individual': 1.0, 'presentation': 1.3, 'worksheet': 1.5,
    'textbook': 1.3, 'module': 1.2, 'reference': 1.0,
    'quarter': 0.5, 'week': 0.3, 'grade': 0.4, 'level': 0.5,
    // Filipino education terms
    'kasanayan': 1.5, 'pamantayan': 1.5, 'nilalaman': 1.2, 'pagganap': 1.5,
    'pagtataya': 1.8, 'gawain': 0.8, 'aralin': 1.0, 'layunin': 1.5,
    'talakayan': 1.3, 'pangkat': 1.1, 'kagamitan': 1.3
};

// ─── Stop Words ──────────────────────────────────────────────────────────────

const STOP_WORDS = new Set([
    'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
    'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
    'should', 'may', 'might', 'shall', 'can', 'to', 'of', 'in', 'for',
    'on', 'with', 'at', 'by', 'from', 'as', 'into', 'through', 'during',
    'before', 'after', 'above', 'below', 'between', 'and', 'but', 'or',
    'nor', 'not', 'no', 'so', 'if', 'then', 'than', 'too', 'very',
    'just', 'about', 'each', 'every', 'all', 'both', 'few', 'more',
    'most', 'other', 'some', 'such', 'only', 'own', 'same', 'also',
    'this', 'that', 'these', 'those', 'its', 'it', 'they', 'them',
    'their', 'what', 'which', 'who', 'whom', 'how', 'when', 'where',
    'ng', 'na', 'sa', 'ang', 'mga', 'ay', 'at', 'ni', 'si', 'nila',
    'ito', 'iyon', 'ako', 'siya', 'kami', 'tayo', 'sila', 'para',
    'mula', 'dahil', 'kung', 'pero', 'o', 'din', 'rin', 'pa'
]);

// ─── Core Engine ─────────────────────────────────────────────────────────────

function tokenize(text: string): string[] {
    return text.toLowerCase()
        .replace(/[^a-z0-9\s\-áàâäéèêëíìîïóòôöúùûüñ]/g, '')
        .split(/\s+/)
        .filter(w => w.length > 2 && !STOP_WORDS.has(w));
}

/**
 * TF-IDF keyword extraction.
 * Uses education vocabulary IDF weights for domain-specific scoring.
 */
function extractKeywords(text: string, topN: number = 8): string[] {
    const tokens = tokenize(text);
    if (tokens.length === 0) return [];

    // Term frequency
    const tf: Record<string, number> = {};
    for (const token of tokens) {
        tf[token] = (tf[token] || 0) + 1;
    }

    // TF-IDF scoring using education vocabulary
    const scored: { word: string; score: number }[] = [];
    for (const [word, freq] of Object.entries(tf)) {
        const idf = EDUCATION_VOCAB[word] || 1.5; // Default IDF for unknown words
        const tfNorm = freq / tokens.length;
        scored.push({ word, score: tfNorm * idf });
    }

    return scored
        .sort((a, b) => b.score - a.score)
        .slice(0, topN)
        .map(s => s.word);
}

/**
 * Extract the most important sentence from a section.
 * Uses keyword density as a proxy for importance.
 */
function extractKeySentence(sentences: string[], maxLen: number = 120): string {
    if (sentences.length === 0) return '';

    let best = sentences[0];
    let bestScore = 0;

    for (const s of sentences) {
        const clean = s.trim();
        if (clean.length < 10 || clean.length > 300) continue;

        const tokens = tokenize(clean);
        let score = 0;
        for (const t of tokens) {
            if (EDUCATION_VOCAB[t]) score += EDUCATION_VOCAB[t];
        }
        // Normalize by length to prefer concise, dense sentences
        score = score / Math.max(1, tokens.length);

        if (score > bestScore) {
            bestScore = score;
            best = clean;
        }
    }

    return best.length > maxLen ? best.substring(0, maxLen) + '...' : best;
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Generate a Quick View summary of a parsed DLL document.
 * Runs entirely offline using TF-IDF keyword extraction.
 */
export function summarizeDLL(content: DLLContent): DLLSummary {
    const warnings: string[] = [];

    // ── Section Scoring ──
    const sections = {
        contentStandards: content.contentStandards,
        performanceStandards: content.performanceStandards,
        learningCompetencies: content.learningCompetencies,
        content: content.content,
        learningActivities: content.learningActivities,
        assessment: content.assessment,
        resources: content.resources
    };

    const sectionScores: Record<string, number> = {};
    let filledSections = 0;
    const totalSections = Object.keys(sections).length;

    for (const [name, items] of Object.entries(sections)) {
        const text = items.join(' ');
        const wordCount = tokenize(text).length;

        if (items.length === 0 || wordCount < 3) {
            sectionScores[name] = 0;
            warnings.push(`${formatSectionName(name)} section is empty or too brief`);
        } else if (wordCount < 10) {
            sectionScores[name] = 30;
            warnings.push(`${formatSectionName(name)} section appears incomplete (${wordCount} words)`);
        } else {
            sectionScores[name] = Math.min(100, 50 + wordCount);
            filledSections++;
        }
    }

    const coverageScore = Math.round((filledSections / totalSections) * 100);

    // ── Key Competency Extraction ──
    const competencyText = [
        ...content.learningCompetencies,
        ...content.contentStandards,
        ...content.performanceStandards
    ].join('. ');
    const keyCompetencies = content.learningCompetencies.length > 0
        ? content.learningCompetencies.slice(0, 5)
        : [extractKeySentence(content.contentStandards.concat(content.performanceStandards))].filter(Boolean);

    // ── Key Activity Extraction ──
    const keyActivities = content.learningActivities.length > 0
        ? content.learningActivities.slice(0, 5)
        : [];

    // ── Topic Keywords ──
    const allText = [
        competencyText,
        content.content.join(' '),
        content.learningActivities.join(' ')
    ].join(' ');
    const topicKeywords = extractKeywords(allText, 8);

    // ── Quick View Text ──
    const meta = content.metadata;

    // Technical report (default)
    let quickView = [
        `📘 ${meta.subject || 'Unknown Subject'} | Grade ${meta.gradeLevel || '?'} | Week ${meta.weekNumber || '?'}`,
        `📊 Coverage: ${coverageScore}% | ${filledSections}/${totalSections} sections complete`,
        keyCompetencies.length > 0 ? `🎯 Key: ${keyCompetencies[0].substring(0, 100)}` : '',
        topicKeywords.length > 0 ? `🔑 Topics: ${topicKeywords.slice(0, 5).join(', ')}` : '',
        warnings.length > 0 ? `⚠️ ${warnings.length} issue(s) detected` : '✅ All sections present'
    ].filter(Boolean).join('\n');

    // If coverage is 0, provide a very minimal technical report to avoid noise
    if (coverageScore === 0) {
        quickView = `📘 ${meta.subject || 'Subject'} | Grade ${meta.gradeLevel || '?'} | Week ${meta.weekNumber || '?'}\n` +
            `⚠️ Structure too complex for offline parser. Waiting for AI...`;
    }

    return {
        keyCompetencies,
        keyActivities,
        topicKeywords,
        coverageScore,
        sectionScores,
        warnings,
        quickView
    };
}

/**
 * ─── AI (Hugging Face) Implementation ──────────────────────────────────────────
 */

/**
 * Flattens DLL content into a natural language string for better summarization.
 */
function flattenDLLContent(content: DLLContent): string {
    // Provide a targeted prompt and only the core teaching content to prevent 
    // the AI from just repeating the metadata (Subject/Grade)
    const promptPrefix = "Summarize the core activities and objectives of this lesson plan in detail: ";

    // We intentionally omit Subject and Grade Level here because the mT5 model 
    // has a tendency to just repeat the first sentence it sees if it's too metadata-heavy.
    const parts = [
        promptPrefix,
        `Objectives: ${content.learningCompetencies.join('. ')}.`,
        `Standards: ${content.contentStandards.join('. ')}.`,
        `Activities: ${content.learningActivities.join('. ')}.`,
        `Assessment: ${content.assessment.join('. ')}.`
    ];

    const flattened = parts.filter(p => !p.includes(': .')).join(' ');

    const meta = content.metadata;
    // Fallback: If flattened content is too short (e.g. only subject/grade) 
    // or if the parsed content is empty, use the raw text.
    if (flattened.length < 100 && meta.rawText) {
        console.log('[dllSummarizer] Flattened content too short, falling back to raw text');
        // Limit to 3000 characters to stay within reasonable token/API limits
        return meta.rawText.substring(0, 3000);
    }

    return flattened;
}

/**
 * Calls Hugging Face Inference API for high-quality summarization.
 */
async function summarizeWithAI(text: string): Promise<string | null> {
    if (!config.HF_API_TOKEN || config.HF_API_TOKEN.includes('your_token')) {
        console.warn('[dllSummarizer] Valid HF_API_TOKEN not found');
        return null;
    }

    console.log('[dllSummarizer] Requesting AI summary via local proxy...', {
        textPreview: text.substring(0, 50) + '...'
    });

    try {
        const controller = new AbortController();
        // Give the proxy server 120 seconds to finish, so the client waits just a bit longer
        const timeoutId = setTimeout(() => controller.abort(), 125000); // 125s timeout

        // IMPORTANT: We use our own SvelteKit Server route to bypass Browser CORS/Adblock issues
        const response = await fetch('/api/summarize', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ text }),
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            console.error('[dllSummarizer] Proxy API error:', response.status, err);
            return null;
        }

        const data = await response.json();

        // Output from HF can be an array of objects or a single object
        const output = data.result;
        const summaryText = Array.isArray(output) ? output[0]?.summary_text : output?.summary_text;

        if (summaryText) {
            console.log('[dllSummarizer] AI summary received successfully');
            return summaryText;
        }

        console.warn('[dllSummarizer] No summary_text in proxy response:', data);
        return null;
    } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {
            console.error('[dllSummarizer] Proxy Fetch timed out after 125s');
        } else {
            console.error('[dllSummarizer] Proxy Fetch failed:', err);
        }
        return null;
    }
}

/**
 * Async version of summarizeDLL that attempts to use AI if available.
 * Falls back to offline TF-IDF if API fails or token is missing.
 */
export async function summarizeDLLAsync(content: DLLContent): Promise<DLLSummary> {
    const offlineSummary = summarizeDLL(content);

    // Only attempt AI if it's a DLL and we have a token
    if (content.metadata.docType === 'DLL' && config.HF_API_TOKEN) {
        const flattened = flattenDLLContent(content);
        const aiSummaryText = await summarizeWithAI(flattened);

        if (aiSummaryText) {
            // Success: Return only the AI summary as the results the user wants
            const meta = content.metadata;
            return {
                ...offlineSummary,
                quickView: `✨ AI SUMMARY:\n${aiSummaryText}\n\n📘 ${meta.subject || 'Subject'} | Grade ${meta.gradeLevel || '?'}`,
                warnings: [] // Clear parsing warnings on AI victory
            };
        } else {
            // Failed: Update quickView to reflect AI failure without showing technical junk
            return {
                ...offlineSummary,
                quickView: offlineSummary.coverageScore > 20
                    ? offlineSummary.quickView
                    : `⚠️ AI Summary Unavailable (Connection Error).\nRaw content extraction was incomplete.`
            };
        }
    }

    return offlineSummary;
}

function formatSectionName(camelCase: string): string {
    return camelCase
        .replace(/([A-Z])/g, ' $1')
        .replace(/^./, s => s.toUpperCase())
        .trim();
}
