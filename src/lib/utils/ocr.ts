/**
 * OCR Metadata Extraction — Tesseract.js (Client-Side)
 * Dynamically imported to avoid blocking initial bundle.
 * Scans the first page ROI to extract document type, week, and school year.
 */
import { subjectClassifier } from './nlpClassifier';

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

        // Detect language first (quick scan with English)
        const engWorker = await createWorker('eng');
        const { data: { text: engText } } = await engWorker.recognize(dataUrl);
        await engWorker.terminate();

        const language = detectLanguage(engText);
        console.log(`[ocr] Detected language: ${language}`);

        // Use appropriate worker for full extraction
        const lang = language === 'Filipino' ? 'fil' : 'eng';
        const worker = await createWorker(lang);

        try {
            const { data: { text, confidence } } = await worker.recognize(dataUrl);
            const metadata = parseMetadata(text);
            console.log('[ocr] Image OCR metadata extracted:', metadata);
            return { ...metadata, confidence, language };
        } finally {
            await worker.terminate();
        }
    } catch (err) {
        console.error('[ocr] Image OCR failed:', err);
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
        date: null
    };
}

async function extractRasterMetadata(page: any, pdfjsLib: any): Promise<DocMetadata> {
    try {
        console.log('[ocr] Starting raster OCR fallback...');
        const viewport = page.getViewport({ scale: 2.5 }); // Higher scale for better OCR
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        if (!context) throw new Error('Could not get canvas context');

        canvas.height = viewport.height;
        canvas.width = viewport.width;

        await page.render({ canvasContext: context, viewport }).promise;
        const dataUrl = canvas.toDataURL('image/png');

        const { createWorker } = await import('tesseract.js');
        const worker = await createWorker('eng');
        try {
            const { data: { text, confidence } } = await worker.recognize(dataUrl);
            console.log(`[ocr] Raster OCR complete (${text.length} chars), confidence:`, confidence);
            const metadata = parseMetadata(text);
            return { ...metadata, rawText: text, confidence, language: 'English' };
        } finally {
            await worker.terminate();
        }
    } catch (err) {
        console.error('[ocr] Raster fallback failed:', err);
        return createDefaultMetadata();
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
    if (/DAILY\s*LESSON\s*(LOG|PLAN)|D\.?L\.?L\.?|DETALYADONG\s*PLANO|ARAW-ARAW\s*LEKSYON|LINGGUHANG\s*ARALIN|BANGHAY\s*ARALIN|MATATAG|PANG-ARAW-ARAW\s*NA\s*TALA|WEEKLY\s*LESSON\s*LOG/i.test(upper)) {
        docType = 'DLL';
    } else if (/INSTRUCTIONAL\s*SUPERVISORY\s*PLAN|I\.?S\.?P\.?|SUPERVISORY\s*PLAN/i.test(upper)) {
        docType = 'ISP';
    } else if (/INSTRUCTIONAL\s*SUPERVISORY\s*REPORT|I\.?S\.?R\.?|SUPERVISORY\s*REPORT/i.test(upper)) {
        docType = 'ISR';
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

    // Extract week number (English: WEEK, Filipino: LINGGO)
    // Support "LINGGO [Number]", "WEEK [Number]", "IKA- [Number] LINGGO"
    const weekMatch = upper.match(/(?:WEEK|LINGGO)\s*[#:]*\s*(\d+)/i) ||
        upper.match(/IKA-\s*(\d+)\s*LINGGO/i);
    const weekNumber = weekMatch ? parseInt(weekMatch[1], 10) : null;

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

    // Extract date (Filipino: Petsa, English: Date)
    // Handle: "Petsa at Oras ng Pagtuturo:", "Teaching Dates and Time:", "Date:", etc.
    const dateMatch = text.match(/(?:Teaching\s*Dates?(?:\s*and\s*Time)?|DATE|PETSA(?:\s*(?:at|[/|])\s*(?:ORAS|DATE))?(?:\s*ng\s*Pagtuturo)?)\s*[:\t\-\s]*\s*([^\n\t|]{5,})/i);
    const date = dateMatch ? dateMatch[1].trim() : null;

    console.log('[ocr] Extracted date raw:', dateMatch ? dateMatch[0] : 'NONE');
    console.log('[ocr] Extracted date value:', date);

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
        date
    };
}
