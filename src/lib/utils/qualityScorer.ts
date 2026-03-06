/**
 * Automated Quality Scorer — Lesson Plan Depth Analysis
 * AI Feature 3: Scores DLL quality using three dimensions:
 *   1. Coherence — Objective ↔ Activity alignment (cosine similarity)
 *   2. Completeness — Required sections present with sufficient depth
 *   3. Depth — Bloom's taxonomy level + lexical diversity
 *
 * 100% offline, no external APIs. Pure mathematical NLP.
 */

import type { DLLContent } from './ocr';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface QualityReport {
    overallScore: number;
    dimensions: {
        coherence: { score: number; details: string };
        completeness: { score: number; details: string };
        depth: { score: number; details: string };
    };
    bloomsLevel: string;
    bloomsDistribution: Record<string, number>;
    suggestions: string[];
    grade: 'A' | 'B' | 'C' | 'D' | 'F';
}

// ─── Bloom's Taxonomy Verb Dictionary ────────────────────────────────────────

const BLOOMS_VERBS: Record<string, string[]> = {
    'Remember': [
        'define', 'list', 'name', 'recall', 'recognize', 'identify', 'state',
        'describe', 'retrieve', 'label', 'match', 'select', 'memorize',
        'tukuyin', 'alamin', 'tandaan', 'kilalanin', 'ilista'
    ],
    'Understand': [
        'explain', 'summarize', 'paraphrase', 'classify', 'compare',
        'interpret', 'discuss', 'distinguish', 'predict', 'translate',
        'ipaliwanag', 'ilarawan', 'ihambing', 'uriin', 'buuin'
    ],
    'Apply': [
        'apply', 'demonstrate', 'solve', 'use', 'execute', 'implement',
        'compute', 'calculate', 'operate', 'practice', 'illustrate',
        'gamitin', 'ilapat', 'isagawa', 'lutasin', 'ipakita'
    ],
    'Analyze': [
        'analyze', 'differentiate', 'examine', 'compare', 'contrast',
        'investigate', 'categorize', 'deconstruct', 'organize', 'attribute',
        'suriin', 'ihambing', 'siyasatin', 'pag-aralan', 'tuklasin'
    ],
    'Evaluate': [
        'evaluate', 'judge', 'justify', 'critique', 'assess', 'argue',
        'defend', 'support', 'rate', 'prioritize', 'recommend',
        'tasahin', 'husgahan', 'bigyang-halaga', 'patunayan', 'ipagtanggol'
    ],
    'Create': [
        'create', 'design', 'develop', 'compose', 'construct', 'produce',
        'generate', 'plan', 'invent', 'formulate', 'propose', 'build',
        'lumikha', 'bumuo', 'magplano', 'gumawa', 'magdisenyo'
    ]
};

// ─── Stop Words & Tokenizer ─────────────────────────────────────────────────

const STOP_WORDS = new Set([
    'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
    'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
    'should', 'may', 'might', 'shall', 'can', 'to', 'of', 'in', 'for',
    'on', 'with', 'at', 'by', 'from', 'as', 'into', 'through', 'during',
    'before', 'after', 'and', 'but', 'or', 'not', 'no', 'so', 'if',
    'ng', 'na', 'sa', 'ang', 'mga', 'ay', 'at', 'ni', 'si', 'nila',
    'ito', 'ako', 'siya', 'para', 'mula', 'dahil', 'kung', 'pero', 'o'
]);

function tokenize(text: string): string[] {
    return text.toLowerCase()
        .replace(/[^a-z0-9\s\-áàâäéèêëíìîïóòôöúùûüñ]/g, '')
        .split(/\s+/)
        .filter(w => w.length > 2 && !STOP_WORDS.has(w));
}

// ─── TF-IDF Vector & Cosine Similarity ──────────────────────────────────────

function buildTFVector(tokens: string[]): Record<string, number> {
    const tf: Record<string, number> = {};
    for (const t of tokens) {
        tf[t] = (tf[t] || 0) + 1;
    }
    // Normalize by total tokens
    const total = tokens.length || 1;
    for (const key in tf) {
        tf[key] = tf[key] / total;
    }
    return tf;
}

function cosineSimilarity(vecA: Record<string, number>, vecB: Record<string, number>): number {
    const allKeys = new Set([...Object.keys(vecA), ...Object.keys(vecB)]);
    let dotProduct = 0;
    let magA = 0;
    let magB = 0;

    for (const key of allKeys) {
        const a = vecA[key] || 0;
        const b = vecB[key] || 0;
        dotProduct += a * b;
        magA += a * a;
        magB += b * b;
    }

    const magnitude = Math.sqrt(magA) * Math.sqrt(magB);
    return magnitude === 0 ? 0 : dotProduct / magnitude;
}

// ─── Scoring Functions ──────────────────────────────────────────────────────

/**
 * Coherence Score: How well do the learning activities align with stated objectives?
 * Uses cosine similarity between TF-IDF vectors of objectives vs. activities.
 */
function scoreCoherence(content: DLLContent): { score: number; suggestion: string | null } {
    const objectiveText = [
        ...content.contentStandards,
        ...content.performanceStandards,
        ...content.learningCompetencies
    ].join(' ');

    const activityText = [
        ...content.learningActivities,
        ...content.assessment
    ].join(' ');

    const objTokens = tokenize(objectiveText);
    const actTokens = tokenize(activityText);

    if (objTokens.length < 3 || actTokens.length < 3) {
        return { score: 0, suggestion: 'Insufficient content to measure objective-activity alignment.' };
    }

    const vecObj = buildTFVector(objTokens);
    const vecAct = buildTFVector(actTokens);
    const similarity = cosineSimilarity(vecObj, vecAct);

    // Scale to 0-100
    const score = Math.round(Math.min(100, similarity * 150));

    let suggestion: string | null = null;
    if (score < 40) {
        suggestion = 'Learning activities appear disconnected from stated objectives. Consider aligning activities with competency goals.';
    } else if (score < 65) {
        suggestion = 'Moderate alignment between objectives and activities. Try weaving competency keywords into activity descriptions.';
    }

    return { score, suggestion };
}

/**
 * Completeness Score: Are all required sections filled with adequate depth?
 * Minimum word thresholds per section.
 */
function scoreCompleteness(content: DLLContent): { score: number; suggestions: string[] } {
    const requirements: { name: string; field: keyof DLLContent; minWords: number }[] = [
        { name: 'Content Standards', field: 'contentStandards', minWords: 5 },
        { name: 'Performance Standards', field: 'performanceStandards', minWords: 5 },
        { name: 'Learning Competencies', field: 'learningCompetencies', minWords: 8 },
        { name: 'Content/Subject Matter', field: 'content', minWords: 5 },
        { name: 'Learning Activities', field: 'learningActivities', minWords: 15 },
        { name: 'Assessment', field: 'assessment', minWords: 5 },
        { name: 'Resources', field: 'resources', minWords: 3 }
    ];

    let totalScore = 0;
    const suggestions: string[] = [];

    for (const req of requirements) {
        const value = content[req.field];
        let words = 0;

        if (Array.isArray(value)) {
            words = tokenize((value as string[]).join(' ')).length;
        } else if (typeof value === 'string' && value) {
            words = tokenize(value).length;
        }

        if (words === 0) {
            suggestions.push(`${req.name} section is missing. This is a required DLL component.`);
        } else if (words < req.minWords) {
            totalScore += 50;
            suggestions.push(`${req.name} section is too brief (${words} words, expected ≥${req.minWords}).`);
        } else {
            totalScore += 100;
        }
    }

    const score = Math.round(totalScore / requirements.length);
    return { score, suggestions };
}

/**
 * Depth Score: Measures cognitive complexity using Bloom's taxonomy verb detection
 * and lexical diversity (type-token ratio).
 */
function scoreDepth(content: DLLContent): {
    score: number;
    bloomsLevel: string;
    bloomsDistribution: Record<string, number>;
    suggestion: string | null;
} {
    const allText = [
        ...content.learningCompetencies,
        ...content.learningActivities,
        ...content.assessment,
        ...content.content
    ].join(' ');

    const tokens = tokenize(allText);

    // 1. Bloom's Taxonomy Detection
    const bloomsCounts: Record<string, number> = {
        'Remember': 0, 'Understand': 0, 'Apply': 0,
        'Analyze': 0, 'Evaluate': 0, 'Create': 0
    };

    for (const token of tokens) {
        for (const [level, verbs] of Object.entries(BLOOMS_VERBS)) {
            if (verbs.includes(token)) {
                bloomsCounts[level]++;
            }
        }
    }

    // Determine dominant Bloom's level
    const levels = Object.entries(bloomsCounts).sort((a, b) => b[1] - a[1]);
    const dominantLevel = levels[0][1] > 0 ? levels[0][0] : 'Remember';

    // Bloom's complexity score (higher levels = better)
    const levelWeights: Record<string, number> = {
        'Remember': 20, 'Understand': 35, 'Apply': 50,
        'Analyze': 70, 'Evaluate': 85, 'Create': 100
    };

    // Weighted Bloom's score based on distribution
    const totalBlooms = Object.values(bloomsCounts).reduce((a, b) => a + b, 0);
    let bloomsScore = 0;
    if (totalBlooms > 0) {
        for (const [level, count] of Object.entries(bloomsCounts)) {
            bloomsScore += (count / totalBlooms) * levelWeights[level];
        }
    } else {
        bloomsScore = 20; // Default to Remember-level
    }

    // 2. Lexical Diversity (Type-Token Ratio)
    const uniqueTokens = new Set(tokens);
    const ttr = tokens.length > 0 ? uniqueTokens.size / tokens.length : 0;
    // TTR typically ranges 0.3-0.8 for educational texts
    const diversityScore = Math.round(Math.min(100, ttr * 150));

    // 3. Combined Depth Score
    const score = Math.round(bloomsScore * 0.6 + diversityScore * 0.4);

    // Bloom's distribution as percentages
    const bloomsDistribution: Record<string, number> = {};
    for (const [level, count] of Object.entries(bloomsCounts)) {
        bloomsDistribution[level] = totalBlooms > 0 ? Math.round((count / totalBlooms) * 100) : 0;
    }

    let suggestion: string | null = null;
    if (bloomsScore < 40) {
        suggestion = `Lesson primarily uses lower-order thinking (${dominantLevel}). Consider adding activities that Analyze, Evaluate, or Create.`;
    } else if (ttr < 0.3) {
        suggestion = 'Low vocabulary diversity detected. Use more varied terminology to enrich the lesson.';
    }

    return { score, bloomsLevel: dominantLevel, bloomsDistribution, suggestion };
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Score the quality of a parsed DLL document.
 * Returns scores across three dimensions: coherence, completeness, and depth.
 */
export function scoreDLLQuality(content: DLLContent): QualityReport {
    const coherence = scoreCoherence(content);
    const completeness = scoreCompleteness(content);
    const depth = scoreDepth(content);

    // Weighted overall: Completeness 40%, Coherence 30%, Depth 30%
    const overallScore = Math.round(
        completeness.score * 0.4 +
        coherence.score * 0.3 +
        depth.score * 0.3
    );

    // Collect all suggestions
    const suggestions: string[] = [];
    if (coherence.suggestion) suggestions.push(coherence.suggestion);
    suggestions.push(...completeness.suggestions);
    if (depth.suggestion) suggestions.push(depth.suggestion);

    // Letter grade
    let grade: QualityReport['grade'] = 'A';
    if (overallScore < 40) grade = 'F';
    else if (overallScore < 55) grade = 'D';
    else if (overallScore < 70) grade = 'C';
    else if (overallScore < 85) grade = 'B';

    return {
        overallScore,
        dimensions: {
            coherence: {
                score: coherence.score,
                details: coherence.suggestion || 'Objectives and activities are well-aligned.'
            },
            completeness: {
                score: completeness.score,
                details: completeness.suggestions.length > 0
                    ? `${completeness.suggestions.length} section(s) need attention.`
                    : 'All required DLL sections are present and non-trivial.'
            },
            depth: {
                score: depth.score,
                details: depth.suggestion || `Lesson demonstrates ${depth.bloomsLevel} level cognitive challenge.`
            }
        },
        bloomsLevel: depth.bloomsLevel,
        bloomsDistribution: depth.bloomsDistribution,
        suggestions,
        grade
    };
}
