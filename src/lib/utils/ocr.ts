/**
 * OCR Metadata Extraction — Tesseract.js (Client-Side)
 * Dynamically imported to avoid blocking initial bundle.
 * Scans the first page ROI to extract document type, week, and school year.
 */
import { subjectClassifier, docTypeClassifier } from './nlpClassifier';

export interface DateRange {
    start: Date;
    end: Date;
    raw: string;
}

export interface DocMetadata {
    docType: 'DLL' | 'ISP' | 'ISR' | 'Unknown';
    weekNumber: number | null;
    schoolYear: string | null;
    subject: string | null;
    subjectConfidence?: number;
    gradeLevel: string | null;
    rawText: string;
    confidence: number;
    language: 'English' | 'Filipino' | 'Unknown';
    school: string | null;
    teacher: string | null;
    date: string | null;
    dateRange: DateRange | null;
    weekSource?: 'calendar' | 'header-date' | 'regex' | 'none';
}

export interface DLLContent {
    metadata: DocMetadata;
    contentStandards: string[];
    performanceStandards: string[];
    learningCompetencies: string[];
    content: string[];
    learningActivities: string[];
    resources: string[];
    assessment: string[];
    remarks: string | null;
}

export async function extractMetadata(file: File): Promise<DocMetadata> {
    const ext = file.name.split('.').pop()?.toLowerCase();

    // 1. Handle PDF OCR/Extraction
    if (file.type === 'application/pdf' || ext === 'pdf') {
        try {
            const pdfjsLib = (window as any)['pdfjsLib'];
            if (!pdfjsLib) {
                console.warn('[ocr] PDF.js (pdfjsLib) not found on window. OCR for PDF skipped.');
                return createDefaultMetadata();
            }

            // Set worker source for pdf.js (crucial for some environments)
            if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
                const version = pdfjsLib.version || '3.11.174';
                pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${version}/pdf.worker.min.js`;
            }

            const arrayBuffer = await file.arrayBuffer();
            const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
            const page = await pdf.getPage(1);
            const textContent = await page.getTextContent();
            const text = textContent.items.map((item: any) => item.str).join(' ');
            console.log(`[ocr] PDF text extracted (${text.length} chars):`, text.substring(0, 200) + '...');

            // If text is too short, fallback to raster OCR
            if (text.length < 50) {
                console.warn('[ocr] PDF text too sparse. Falling back to raster OCR...');
                return await extractRasterMetadata(page, pdfjsLib);
            }

            const metadata = parseMetadata(text);
            return { ...metadata, rawText: text, confidence: 100, language: 'Unknown' };
        } catch (err) {
            console.error('[ocr] PDF extraction failed:', err);
            return createDefaultMetadata();
        }
    }

    // 2. Handle Image OCR (Tesseract - multilingual)
    if (!file.type.startsWith('image/')) {
        console.warn('[ocr] Skipping OCR for unsupported file type:', file.type || 'unknown');
        return createDefaultMetadata();
    }

    const { createWorker } = await import('tesseract.js');

    try {
        const dataUrl = await fileToDataUrl(file);
        const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

        // SINGLE PASS OPTIMIZATION (WBS 14.5 Mobile)
        // Instead of separate language detection pass, use combined 'eng+fil'
        const worker = await createWorker('eng+fil');

        try {
            // OPTIMIZATION: Manual thresholding for low-end mobile CPUs
            // Tesseract's internal binarization can be slow on low-end devices
            const { data: { text, confidence } } = await worker.recognize(dataUrl);

            // Post-process language detection from result
            const language = detectLanguage(text);
            const metadata = parseMetadata(text);

            console.log(`[ocr] Optimized single-pass OCR results (Language: ${language}, Confidence: ${confidence}%)`);
            return { ...metadata, confidence, language };
        } finally {
            await worker.terminate();
        }
    } catch (err) {
        console.error('[ocr] Optimized Image OCR failed:', err);
        return createDefaultMetadata();
    }
}

function createDefaultMetadata(): DocMetadata {
    return {
        docType: 'Unknown',
        weekNumber: null,
        schoolYear: null,
        subject: null,
        subjectConfidence: 0,
        gradeLevel: null,
        rawText: '',
        confidence: 0,
        language: 'Unknown',
        school: null,
        teacher: null,
        date: null,
        dateRange: null,
        weekSource: 'none'
    };
}

async function extractRasterMetadata(page: any, pdfjsLib: any): Promise<DocMetadata> {
    try {
        console.log('[ocr] Starting raster OCR fallback...');

        // Detect mobile to use a lower scale if needed
        // Low-End Mobile Optimization: Force 1.0x scale for mobile to save CPU/RAM
        const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
        const scale = isMobile ? 1.0 : 2.5;

        const viewport = page.getViewport({ scale });
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        if (!context) throw new Error('Could not get canvas context');

        canvas.height = viewport.height;
        canvas.width = viewport.width;

        await page.render({ canvasContext: context, viewport }).promise;

        // ADAPTIVE PRE-PROCESSING: Convert to Grayscale + Threshold for low-end CPUs
        // This makes Tesseract's job MUCH easier and faster
        if (isMobile) {
            const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
            const data = imageData.data;
            for (let i = 0; i < data.length; i += 4) {
                const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
                // Thresholding: Black or White only (Binary)
                const val = avg > 128 ? 255 : 0;
                data[i] = data[i + 1] = data[i + 2] = val;
            }
            context.putImageData(imageData, 0, 0);
        }

        const dataUrl = canvas.toDataURL('image/png', 0.7);

        const { createWorker } = await import('tesseract.js');
        const worker = await createWorker('eng+fil'); // Optimized single pass
        try {
            const { data: { text, confidence } } = await worker.recognize(dataUrl);
            console.log(`[ocr] Raster OCR complete (${text.length} chars), scale: ${scale}, confidence:`, confidence);
            const metadata = parseMetadata(text);
            return { ...metadata, rawText: text, confidence, language: detectLanguage(text) };
        } finally {
            await worker.terminate();
        }
    } catch (err) {
        console.error('[ocr] Raster fallback failed:', err);
        return createDefaultMetadata();
    }
}

function fileToDataUrl(file: File): Promise<string> {
    // Optimization: createObjectURL is much lighter than FileReader for large images
    return Promise.resolve(URL.createObjectURL(file));
}

/**
 * Extract and parse DLL content from a document
 * Supports both English and Filipino DLL documents
 */
export async function extractDLLContent(file: File): Promise<DLLContent> {
    const { parseDLLContent } = await import('./dll-parser');

    console.log('[ocr] Extracting DLL content from file:', file.name);

    const metadata = await extractMetadata(file);

    if (metadata.docType !== 'DLL') {
        console.warn('[ocr] Document is not a DLL, parsing as DLL anyway...');
    }

    const dllContent = await parseDLLContent(metadata.rawText, metadata);
    return dllContent;
}

function detectLanguage(text: string): 'English' | 'Filipino' | 'Unknown' {
    const upper = text.toUpperCase();

    // Filipino/Tagalog indicators
    const filipinoPatterns = [
        /PAARALAN|GURO|PETSA|ORAS|BAITANG|ASIGNATURA|MARKAHAN|LUNES|MARTES|MIYERKULES|HUWEBES|BIYERNES/,
        /NILALAMAN|PAMANTAYAN|KASANAYAN|KURIKULUM|LAYUNIN|GAWAIN/,
        /EDUKASYON\s*SA\s*PAGPAPAKATAO|ARALING\s*PANLIPUNAN|PILIPINAS/
    ];

    // English indicators  
    const englishPatterns = [
        /SCHOOL|TEACHER|DATE|TIME|GRADE|SUBJECT|MARK|MONDAY|TUESDAY|WEDNESDAY|THURSDAY|FRIDAY/,
        /CONTENT|STANDARDS|COMPETENCIES|ACTIVITIES|ASSESSMENT|RESOURCES/,
        /LEARNING\s*OBJECTIVES|PERFORMANCE|QUARTER|WEEK/
    ];

    let filipinoScore = 0;
    let englishScore = 0;

    for (const pattern of filipinoPatterns) {
        const matches = text.match(pattern);
        filipinoScore += matches ? matches.length : 0;
    }

    for (const pattern of englishPatterns) {
        const matches = text.match(pattern);
        englishScore += matches ? matches.length : 0;
    }

    if (filipinoScore > englishScore && filipinoScore > 0) return 'Filipino';
    if (englishScore > filipinoScore && englishScore > 0) return 'English';
    return 'Unknown';
}

export function parseMetadata(text: string): Omit<DocMetadata, 'confidence' | 'language'> {
    const upper = text.toUpperCase();

    // Helper to convert Roman numerals to numbers
    const romanToNum = (roman: string): string => {
        const map: Record<string, string> = {
            'I': '1', 'II': '2', 'III': '3', 'IV': '4', 'V': '5', 'VI': '6',
            'VII': '7', 'VIII': '8', 'IX': '9', 'X': '10', 'XI': '11', 'XII': '12'
        };
        return map[roman] || roman;
    };

    // Detect document type
    let docType: DocMetadata['docType'] = 'Unknown';
    // Tier 1: Regex-based detection (highest confidence)
    if (/DAILY\s*LESSON\s*(LOG|PLAN)|D\.?L\.?L\.?|DETALYADONG\s*PLANO|ARAW-ARAW\s*LEKSYON|LINGGUHANG\s*ARALIN|BANGHAY\s*ARALIN|MATATAG|PANG-ARAW-ARAW\s*NA\s*TALA|WEEKLY\s*LESSON\s*LOG/i.test(upper)) {
        docType = 'DLL';
    } else if (/INSTRUCTIONAL\s*SUPERVISORY\s*PLAN|I\.?S\.?P\.?|SUPERVISORY\s*PLAN/i.test(upper)) {
        docType = 'ISP';
    } else if (/INSTRUCTIONAL\s*SUPERVISORY\s*REPORT|I\.?S\.?R\.?|SUPERVISORY\s*REPORT/i.test(upper)) {
        docType = 'ISR';
    }

    // Tier 2: NLP-based classification fallback (if regex failed)
    if (docType === 'Unknown') {
        const nlpDocType = docTypeClassifier.predictDocType(upper);
        if (nlpDocType.docType && nlpDocType.confidence > 0) {
            docType = nlpDocType.docType;
            console.log(`[ocr] NLP classified doc type as ${docType} (confidence: ${nlpDocType.confidence}%)`);
        }
    }

    // --- PRIORITY SUBJECT DETECTION (WBS 19.3 & 14.5 Bug Fix) ---
    // Specifically look for labels like "Asignatura: [Subject]" or "Subject: [Subject]"
    const explicitSubjectMatch = upper.match(/(?:ASIGNATURA|SUBJECT|LEARNING\s*AREA)\s*[:\t]*\s*([^\n\t|]{3,20})/i);
    let subject: string | null = null;
    let subjectConfidence = 0;

    if (explicitSubjectMatch) {
        const candidate = explicitSubjectMatch[1].trim();
        const subjectPatterns = [
            { name: 'English', regex: /ENGLISH|WIKA/i },
            { name: 'Filipino', regex: /FILIPINO|TAGALOG|WIKANG\s*PILIPINO/i },
            { name: 'Mathematics', regex: /MATHEMATICS|MATH|MATEMATIKA/i },
            { name: 'Science', regex: /SCIENCE|AGHAM/i },
            { name: 'AP', regex: /ARALING\s*PANLIPUNAN|A\.?P\.?|SOCIAL\s*STUDIES/i },
            { name: 'GMRC', regex: /EDUKASYON\s*SA\s*PAGPAPAKATAO|E\.?S\.?P\.?|GMRC|VALUES|MORAL/i },
            { name: 'MAPEH', regex: /MAPEH|ARTS|MUSIC|PHYSICAL|HEALTH|PE/i },
            { name: 'EPP', regex: /E\.?P\.?P\.?|EDUKASYON.*PRODUKTIBO|VOCATIONAL/i },
            { name: 'TLE', regex: /T\.?L\.?E\.?|TECHNOLOGY.*LIVELIHOOD/i }
        ];

        for (const p of subjectPatterns) {
            if (p.regex.test(candidate)) {
                subject = p.name;
                subjectConfidence = 100; // High confidence for explicit labels
                break;
            }
        }
    }

    // --- ML FALLBACK (If no explicit subject label found) ---
    if (!subject) {
        const mlPrediction = subjectClassifier.predict(upper);
        subject = mlPrediction.subject;
        subjectConfidence = mlPrediction.confidence;
    }

    // Final fallback if both header and ML are weak
    if (!subject) {
        const subjectPatterns = [
            { name: 'English', regex: /ENGLISH|WIKA/i },
            { name: 'Filipino', regex: /FILIPINO|TAGALOG|WIKANG\s*PILIPINO/i },
            { name: 'Mathematics', regex: /MATHEMATICS|MATH|MATEMATIKA/i },
            { name: 'Science', regex: /SCIENCE|AGHAM/i },
            { name: 'AP', regex: /ARALING\s*PANLIPUNAN|A\.?P\.?|SOCIAL\s*STUDIES/i },
            { name: 'GMRC', regex: /EDUKASYON\s*SA\s*PAGPAPAKATAO|E\.?S\.?P\.?|GMRC|VALUES|MORAL/i },
            { name: 'MAPEH', regex: /MAPEH|ARTS|MUSIC|PHYSICAL|HEALTH|PE/i },
            { name: 'EPP', regex: /E\.?P\.?P\.?|EDUKASYON.*PRODUKTIBO|VOCATIONAL/i },
            { name: 'TLE', regex: /T\.?L\.?E\.?|TECHNOLOGY.*LIVELIHOOD/i }
        ];

        for (const p of subjectPatterns) {
            if (p.regex.test(upper)) {
                subject = p.name;
                break;
            }
        }
    }

    // Detect Grade/Level (Filipino: Baitang, English: Grade)
    const gradeMatch = upper.match(/(?:GRADE|GR\.?|BAITANG|ANTAS)\s*[/]?\s*(?:LEVEL|ANTAS)?\s*[:\t]*\s*([IVX1-9]+)/i);
    let gradeLevel = gradeMatch ? gradeMatch[1].trim() : null;
    if (gradeLevel && isNaN(parseInt(gradeLevel))) {
        gradeLevel = romanToNum(gradeLevel);
    }

    // Extract week number — Tier 1: Regex (English: WEEK, Filipino: LINGGO)
    const weekMatch = upper.match(/(?:WEEK|LINGGO)\s*[#:]*\s*(\d+)/i) ||
        upper.match(/IKA-\s*(\d+)\s*LINGGO/i);
    let weekNumber = weekMatch ? parseInt(weekMatch[1], 10) : null;
    let weekSource: 'calendar' | 'header-date' | 'regex' | 'none' = weekNumber ? 'regex' : 'none';

    // Extract school year
    const syMatch = text.match(/S\.?Y\.?\s*(\d{4}\s*[-–]\s*\d{4})/i) ||
        text.match(/(\d{4}\s*[-–]\s*\d{4})/);
    const schoolYear = syMatch ? syMatch[1].replace(/\s/g, '') : null;

    // Extract school name (Filipino: Paaralan, English: School)
    const schoolMatch = text.match(/(?:SCHOOL|PAARALAN)\s*[:\t]*\s*([^\n\t|]+)/i);
    const school = schoolMatch ? schoolMatch[1].trim() : null;

    // Extract teacher name (Filipino: Guro, English: Teacher)
    const teacherMatch = text.match(/(?:TEACHER|GURO|EDUCATOR)\s*[:\t]*\s*([^\n\t|]+)/i);
    const teacher = teacherMatch ? teacherMatch[1].trim() : null;

    // Extract date string (Filipino: Petsa, English: Date)
    const dateMatch = text.match(/(?:Teaching\s*Dates?(?:\s*and\s*Time)?|DATE|PETSA(?:\s*(?:at|[/|])\s*(?:ORAS|DATE))?(?:\s*ng\s*Pagtuturo)?)\s*[:\t\-\s]*\s*([^\n\t|]{5,})/i);
    const date = dateMatch ? dateMatch[1].trim() : null;

    // Tier 0: Parse date range from header for calendar-based resolution
    const dateRange = parseDateRange(text);
    if (dateRange && !weekNumber) {
        weekSource = 'header-date';
        console.log(`[ocr] Parsed date range: ${dateRange.start.toDateString()} - ${dateRange.end.toDateString()}`);
    }

    console.log('[ocr] Extracted date raw:', dateMatch ? dateMatch[0] : 'NONE');
    console.log('[ocr] Week detection source:', weekSource);

    return {
        docType,
        weekNumber,
        schoolYear,
        subject,
        subjectConfidence,
        gradeLevel,
        rawText: text,
        school,
        teacher,
        date,
        dateRange,
        weekSource
    };
}

// ─── Date Range Parsing ─────────────────────────────────────────────────────

const MONTH_MAP: Record<string, number> = {
    // English
    JANUARY: 0, FEBRUARY: 1, MARCH: 2, APRIL: 3, MAY: 4, JUNE: 5,
    JULY: 6, AUGUST: 7, SEPTEMBER: 8, OCTOBER: 9, NOVEMBER: 10, DECEMBER: 11,
    JAN: 0, FEB: 1, MAR: 2, APR: 3, JUN: 5, JUL: 6, AUG: 7, SEP: 8, OCT: 9, NOV: 10, DEC: 11,
    // Filipino
    ENERO: 0, PEBRERO: 1, MARSO: 2, ABRIL: 3, MAYO: 4, HUNYO: 5,
    HULYO: 6, AGOSTO: 7, SETYEMBRE: 8, OKTUBRE: 9, NOBYEMBRE: 10, DISYEMBRE: 11
};

/**
 * Parse date ranges from DLL/ISP headers.
 * Handles formats like:
 *   "FEBRUARY 9 - 13, 2026"
 *   "ENERO 15 - 19, 2026"  
 *   "FEBRUARY 25 - 29, 2026"
 *   "March 30 - April 3, 2026"
 *   "FEBRUARY 9-13, 2026"
 */
export function parseDateRange(text: string): DateRange | null {
    const upper = text.toUpperCase();

    // Build month name regex from our map
    const monthNames = Object.keys(MONTH_MAP).join('|');

    // Pattern 1: "MONTH DAY - DAY, YEAR" (same month)
    const sameMonth = new RegExp(
        `(${monthNames})\\s+(\\d{1,2})\\s*[-–]\\s*(\\d{1,2})[,\\s]+(\\d{4})`,
        'i'
    );

    // Pattern 2: "MONTH DAY - MONTH DAY, YEAR" (cross-month)
    const crossMonth = new RegExp(
        `(${monthNames})\\s+(\\d{1,2})\\s*[-–]\\s*(${monthNames})\\s+(\\d{1,2})[,\\s]+(\\d{4})`,
        'i'
    );

    // Try cross-month first (more specific)
    let match = upper.match(crossMonth);
    if (match) {
        const startMonth = MONTH_MAP[match[1]];
        const startDay = parseInt(match[2]);
        const endMonth = MONTH_MAP[match[3]];
        const endDay = parseInt(match[4]);
        const year = parseInt(match[5]);

        if (startMonth !== undefined && endMonth !== undefined && !isNaN(year)) {
            const start = new Date(year, startMonth, startDay);
            const end = new Date(year, endMonth, endDay);
            if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
                return { start, end, raw: match[0] };
            }
        }
    }

    // Try same-month pattern
    match = upper.match(sameMonth);
    if (match) {
        const month = MONTH_MAP[match[1]];
        const startDay = parseInt(match[2]);
        const endDay = parseInt(match[3]);
        const year = parseInt(match[4]);

        if (month !== undefined && !isNaN(year)) {
            const start = new Date(year, month, startDay);
            const end = new Date(year, month, endDay);
            if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
                return { start, end, raw: match[0] };
            }
        }
    }

    return null;
}

/**
 * Resolve a parsed date range to an academic calendar week.
 * Compares the document's date range against the calendar's start/end dates.
 * Returns the matching week number and calendar ID, or null if no match.
 */
export function resolveWeekFromDates(
    dateRange: DateRange,
    calendar: { id?: string; week_number: number; start_date?: string; end_date?: string; deadline_date?: string }[]
): { weekNumber: number; calendarId?: string } | null {
    if (!calendar || calendar.length === 0) return null;

    const docStart = dateRange.start.getTime();
    const docEnd = dateRange.end.getTime();

    // Strategy 1: Exact overlap — find calendar week whose date range overlaps the document's
    for (const week of calendar) {
        if (week.start_date && week.end_date) {
            const calStart = new Date(week.start_date).getTime();
            const calEnd = new Date(week.end_date).getTime();

            // Check if document dates overlap with this calendar week
            if (docStart <= calEnd && docEnd >= calStart) {
                console.log(`[ocr] Date range matched calendar Week ${week.week_number}`);
                return { weekNumber: week.week_number, calendarId: week.id };
            }
        }
    }

    // Strategy 2: Closest match — find the calendar week with the smallest distance
    let closest: { weekNumber: number; calendarId?: string; distance: number } | null = null;
    for (const week of calendar) {
        if (week.start_date) {
            const calStart = new Date(week.start_date).getTime();
            const distance = Math.abs(docStart - calStart);
            if (!closest || distance < closest.distance) {
                closest = { weekNumber: week.week_number, calendarId: week.id, distance };
            }
        }
    }

    // Only accept closest match if within 7 days
    if (closest && closest.distance <= 7 * 24 * 60 * 60 * 1000) {
        console.log(`[ocr] Date range closest-matched to calendar Week ${closest.weekNumber} (${Math.round(closest.distance / 86400000)}d distance)`);
        return { weekNumber: closest.weekNumber, calendarId: closest.calendarId };
    }

    return null;
}
