/**
 * DOCX → PDF Transcoding — mammoth.js + html2canvas + jsPDF
 * All processing happens client-side.
 * The original Word document never leaves the teacher's device.
 */

export interface TranscodeResult {
    pdfBytes: Uint8Array;
    text?: string;
}

export async function transcodeToPdf(file: File): Promise<TranscodeResult> {
    const ext = file.name.split('.').pop()?.toLowerCase();

    console.log(`[transcode] Processing file: ${file.name} (${(file.size / 1024).toFixed(0)}KB)`);

    // If already PDF, return as-is
    if (ext === 'pdf') {
        const buffer = await file.arrayBuffer();
        console.log(`[transcode] File is already PDF, returning as-is`);
        return { pdfBytes: new Uint8Array(buffer) };
    }

    throw new Error(`Unsupported file type: .${ext}. Only .pdf files are accepted.`);
}
