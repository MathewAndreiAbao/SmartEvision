import { googleConvertToPdf } from './googleConvert';

export interface TranscodeResult {
    pdfBytes: Uint8Array;
    text?: string;
}

export async function transcodeToPdf(file: File): Promise<TranscodeResult> {
    const ext = file.name.split('.').pop()?.toLowerCase();

    console.log(`[transcode] Processing file: ${file.name} (${(file.size / 1024).toFixed(0)}KB)`);

    // 1. If already PDF, return as-is
    if (ext === 'pdf') {
        const buffer = await file.arrayBuffer();
        console.log(`[transcode] File is already PDF, returning as-is`);
        return { pdfBytes: new Uint8Array(buffer) };
    }

    // 2. If Word document, use Google Apps Script (High Volume Fallback)
    if (ext === 'docx' || ext === 'doc') {
        try {
            const pdfBytes = await googleConvertToPdf(file);
            return { pdfBytes };
        } catch (err: any) {
            console.error('[transcode] Word conversion failed:', err);
            throw new Error(`Failed to convert Word document: ${err.message}`);
        }
    }

    throw new Error(`Unsupported file type: .${ext}. Only .pdf, .docx, and .doc files are accepted.`);
}
