/**
 * DLL Parser - Detailed Lesson Plan Content Extraction
 * Supports both English and Filipino (Tagalog) DLL documents
 * Extracts structured content from OCR-extracted text or PDFs
 */

import type { DocMetadata, DLLContent } from './ocr';

export async function parseDLLContent(
    text: string,
    metadata: DocMetadata
): Promise<DLLContent> {
    const language = metadata.language;

    console.log(`[dll-parser] Parsing DLL content (${language})...`);

    const sections = extractDLLSections(text, language);

    return {
        metadata,
        contentStandards: sections.contentStandards,
        performanceStandards: sections.performanceStandards,
        learningCompetencies: sections.learningCompetencies,
        content: sections.content,
        learningActivities: sections.learningActivities,
        resources: sections.resources,
        assessment: sections.assessment,
        remarks: sections.remarks
    };
}

interface DLLSections {
    contentStandards: string[];
    performanceStandards: string[];
    learningCompetencies: string[];
    content: string[];
    learningActivities: string[];
    resources: string[];
    assessment: string[];
    remarks: string | null;
}

function extractDLLSections(text: string, language: string): DLLSections {
    const sections: DLLSections = {
        contentStandards: [],
        performanceStandards: [],
        learningCompetencies: [],
        content: [],
        learningActivities: [],
        resources: [],
        assessment: [],
        remarks: null
    };

    if (language === 'Filipino') {
        return extractDLLSectionsFil(text, sections);
    } else {
        return extractDLLSectionsEng(text, sections);
    }
}

function extractDLLSectionsFil(text: string, sections: DLLSections): DLLSections {
    // Filipino/Tagalog section headers
    const patterns = {
        contentStandards: /(?:A\.|CONTENT STANDARDS|PAMANTAYAN SA NILALAMAN)([\s\S]*?)(?=B\.|PERFORMANCE STANDARDS|PAMANTAYAN SA PAGGANAP|$)/i,
        performanceStandards: /(?:B\.|PERFORMANCE STANDARDS|PAMANTAYAN SA PAGGANAP)([\s\S]*?)(?=C\.|LEARNING COMPETENCIES|KASANAYAN|$)/i,
        learningCompetencies: /(?:C\.|LEARNING COMPETENCIES|KASANAYAN SA PANANALIKSIK)([\s\S]*?)(?=D\.|CONTENT|NILALAMAN|IV\.|$)/i,
        content: /(?:D\.|CONTENT|NILALAMAN|IV\.|MGA NILALAMAN)([\s\S]*?)(?=V\.|LEARNING ACTIVITIES|MGA GAWAIN|REFERENCES|$)/i,
        learningActivities: /(?:V\.|LEARNING ACTIVITIES|MGA GAWAIN SA PAARALAN|MGA HAKBANG SA PAGTUTURO)([\s\S]*?)(?=ASSESSMENT|EVALUATION|RESOURCES|VI\.|$)/i,
        resources: /(?:REFERENCES|RESOURCES|KAGAMITAN|SANGGUNIAN)([\s\S]*?)(?=ASSESSMENT|EVALUATION|REMARKS|$)/i,
        assessment: /(?:ASSESSMENT|EVALUATION|PAGTATAYA|SUKAT)([\s\S]*?)(?=REMARKS|PANGHUNAHUNAN|$)/i,
        remarks: /(?:REMARKS|PANGHUNAHUNAN|CATATAN)([\s\S]*?)$/i
    };

    sections.contentStandards = extractBulletPoints(text, patterns.contentStandards);
    sections.performanceStandards = extractBulletPoints(text, patterns.performanceStandards);
    sections.learningCompetencies = extractBulletPoints(text, patterns.learningCompetencies);
    sections.content = extractBulletPoints(text, patterns.content);
    sections.learningActivities = extractBulletPoints(text, patterns.learningActivities);
    sections.resources = extractBulletPoints(text, patterns.resources);
    sections.assessment = extractBulletPoints(text, patterns.assessment);
    sections.remarks = extractSection(text, patterns.remarks);

    return sections;
}

function extractDLLSectionsEng(text: string, sections: DLLSections): DLLSections {
    // English section headers
    const patterns = {
        contentStandards: /(?:A\.|CONTENT STANDARDS)([\s\S]*?)(?=B\.|PERFORMANCE STANDARDS|$)/i,
        performanceStandards: /(?:B\.|PERFORMANCE STANDARDS)([\s\S]*?)(?=C\.|LEARNING COMPETENCIES|$)/i,
        learningCompetencies: /(?:C\.|LEARNING COMPETENCIES)([\s\S]*?)(?=D\.|CONTENT|IV\.|$)/i,
        content: /(?:D\.|CONTENT|IV\.|SUBJECT MATTER)([\s\S]*?)(?=V\.|LEARNING ACTIVITIES|REFERENCES|$)/i,
        learningActivities: /(?:V\.|LEARNING ACTIVITIES|INSTRUCTIONAL ACTIVITIES|LEARNING EXPERIENCES)([\s\S]*?)(?=ASSESSMENT|EVALUATION|RESOURCES|VI\.|$)/i,
        resources: /(?:REFERENCES|RESOURCES|LEARNING MATERIALS)([\s\S]*?)(?=ASSESSMENT|EVALUATION|REMARKS|$)/i,
        assessment: /(?:ASSESSMENT|EVALUATION|ASSESSMENT TOOLS)([\s\S]*?)(?=REMARKS|NOTES|$)/i,
        remarks: /(?:REMARKS|NOTES|REFLECTION)([\s\S]*?)$/i
    };

    sections.contentStandards = extractBulletPoints(text, patterns.contentStandards);
    sections.performanceStandards = extractBulletPoints(text, patterns.performanceStandards);
    sections.learningCompetencies = extractBulletPoints(text, patterns.learningCompetencies);
    sections.content = extractBulletPoints(text, patterns.content);
    sections.learningActivities = extractBulletPoints(text, patterns.learningActivities);
    sections.resources = extractBulletPoints(text, patterns.resources);
    sections.assessment = extractBulletPoints(text, patterns.assessment);
    sections.remarks = extractSection(text, patterns.remarks);

    return sections;
}

function extractBulletPoints(text: string, pattern: RegExp): string[] {
    const match = text.match(pattern);
    if (!match || !match[1]) return [];

    const sectionText = match[1];

    // Match various bullet point formats
    const bulletPattern = /(?:^|\n)[\s]*(?:[a-z]\.|[-•*]|[0-9]+\.|[A-Z]\))\s*([^\n]+)/gm;
    const points: string[] = [];
    let bulletMatch;

    while ((bulletMatch = bulletPattern.exec(sectionText)) !== null) {
        const point = bulletMatch[1].trim();
        if (point && point.length > 5) { // Filter out noise
            points.push(point);
        }
    }

    return points;
}

function extractSection(text: string, pattern: RegExp): string | null {
    const match = text.match(pattern);
    if (!match || !match[1]) return null;

    const sectionText = match[1].trim();

    // Clean up the text
    return sectionText
        .replace(/^\s*[-•*]\s*/gm, '')
        .replace(/\s+/g, ' ')
        .trim() || null;
}

/**
 * Validate DLL content completeness
 * Checks if all required sections have content
 */
export function validateDLLCompletion(content: DLLContent): {
    isComplete: boolean;
    missingFields: string[];
    completionPercentage: number;
} {
    const requiredFields = [
        'contentStandards',
        'performanceStandards',
        'learningCompetencies',
        'content',
        'learningActivities',
        'assessment'
    ];

    const missingFields: string[] = [];
    let filledCount = 0;

    for (const field of requiredFields) {
        const value = content[field as keyof DLLContent];

        if (Array.isArray(value)) {
            if (value.length > 0) {
                filledCount++;
            } else {
                missingFields.push(field);
            }
        } else if (typeof value === 'string') {
            if (value && value.length > 0) {
                filledCount++;
            } else {
                missingFields.push(field);
            }
        }
    }

    const completionPercentage = Math.round((filledCount / requiredFields.length) * 100);
    const isComplete = missingFields.length === 0;

    return {
        isComplete,
        missingFields,
        completionPercentage
    };
}

/**
 * Generate a DLL summary for quick verification
 */
export function generateDLLSummary(content: DLLContent): string {
    const metadata = content.metadata;
    const validation = validateDLLCompletion(content);

    let summary = `
DLL Document Summary
====================
School: ${metadata.school || 'Not specified'}
Teacher: ${metadata.teacher || 'Not specified'}
Subject: ${metadata.subject || 'Not specified'}
Grade Level: ${metadata.gradeLevel || 'Not specified'}
Week: ${metadata.weekNumber || 'Not specified'}
School Year: ${metadata.schoolYear || 'Not specified'}
Language: ${metadata.language}

Content Status:
- Content Standards: ${content.contentStandards.length} items
- Performance Standards: ${content.performanceStandards.length} items
- Learning Competencies: ${content.learningCompetencies.length} items
- Content: ${content.content.length} sections
- Learning Activities: ${content.learningActivities.length} items
- Assessment: ${content.assessment.length} items
- Resources: ${content.resources.length} items

Completion: ${validation.completionPercentage}%
Status: ${validation.isComplete ? '[OK] Complete' : '[X] Incomplete'}
${validation.missingFields.length > 0 ? `Missing: ${validation.missingFields.join(', ')}` : ''}
    `.trim();

    return summary;
}
