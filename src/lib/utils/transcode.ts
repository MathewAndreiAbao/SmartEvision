/**
 * DOCX → PDF Transcoding via Google Apps Script
 * Converts Word documents to PDF using Google Drive API via a deployed Google Apps Script.
 * The file is sent to the script, converted server-side, and returned as PDF + extracted text.
 */

import { env } from '$env/dynamic/public';

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

    // Handle Word documents (.docx, .doc)
    if (ext === 'docx' || ext === 'doc') {
        const scriptUrl = env.PUBLIC_GOOGLE_SCRIPT_URL;

        if (!scriptUrl) {
            throw new Error(
                'Google Script URL is missing. Please deploy scripts/google_apps_script.js and add PUBLIC_GOOGLE_SCRIPT_URL to your .env file.'
            );
        }

        console.log(`[transcode] Converting ${ext.toUpperCase()} to PDF via Google Apps Script...`);

        try {
            // Read file as base64 for transmission
            const arrayBuffer = await file.arrayBuffer();
            const bytes = new Uint8Array(arrayBuffer);
            const base64 = btoa(String.fromCharCode.apply(null, Array.from(bytes) as any));

            // Send to Google Apps Script
            const response = await fetch(scriptUrl, {
                method: 'POST',
                body: base64,
                headers: {
                    'Content-Type': 'application/octet-stream'
                }
            });

            if (!response.ok) {
                throw new Error(`Google Apps Script returned ${response.status}: ${response.statusText}`);
            }

            const result = await response.json();

            if (!result.success) {
                throw new Error(`Conversion failed: ${result.error || 'Unknown error'}`);
            }

            // Decode the returned base64 PDF
            const pdfBytes = Uint8Array.from(
                atob(result.pdf),
                (c) => c.charCodeAt(0)
            );

            console.log(`[transcode] Successfully converted to PDF (${(pdfBytes.byteLength / 1024).toFixed(0)}KB)`);

            return {
                pdfBytes,
                text: result.text || undefined
            };

        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            console.error(`[transcode] Conversion error:`, message);
            throw new Error(`Word to PDF conversion failed: ${message}`);
        }
    }

    throw new Error(`Unsupported file type: .${ext}. Only .pdf and .docx files are accepted.`);
}
