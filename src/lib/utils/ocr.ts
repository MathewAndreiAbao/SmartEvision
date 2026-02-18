/**
 * OCR Metadata Extraction — Tesseract.js (Client-Side)
 * Dynamically imported to avoid blocking initial bundle.
 * Scans the first page ROI to extract document type, week, and school year.
 */

export interface DocMetadata {
    docType: 'DLL' | 'ISP' | 'ISR' | 'Unknown';
    weekNumber: number | null;
    schoolYear: string | null;
    rawText: string;
}

export async function extractMetadata(file: File): Promise<DocMetadata> {
    const { createWorker } = await import('tesseract.js');
    const worker = await createWorker('eng');

    try {
        // Convert file to image-like data URL for OCR
        const dataUrl = await fileToDataUrl(file);
        const { data: { text } } = await worker.recognize(dataUrl);
        return parseMetadata(text);
    } finally {
        await worker.terminate();
    }
}

function fileToDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

export function parseMetadata(text: string): DocMetadata {
    const upper = text.toUpperCase();

    // Detect document type
    let docType: DocMetadata['docType'] = 'Unknown';
    if (/DAILY\s*LESSON\s*LOG|D\.?L\.?L\.?/i.test(upper)) {
        docType = 'DLL';
    } else if (/INSTRUCTIONAL\s*SUPERVISORY\s*PLAN|I\.?S\.?P\.?/i.test(upper)) {
        docType = 'ISP';
    } else if (/INSTRUCTIONAL\s*SUPERVISORY\s*REPORT|I\.?S\.?R\.?/i.test(upper)) {
        docType = 'ISR';
    }

    // Extract week number
    const weekMatch = upper.match(/WEEK\s*#?\s*(\d+)/);
    const weekNumber = weekMatch ? parseInt(weekMatch[1], 10) : null;

    // Extract school year
    const syMatch = text.match(/S\.?Y\.?\s*(\d{4}\s*[-–]\s*\d{4})/i) ||
        text.match(/(\d{4}\s*[-–]\s*\d{4})/);
    const schoolYear = syMatch ? syMatch[1].replace(/\s/g, '') : null;

    return { docType, weekNumber, schoolYear, rawText: text };
}
