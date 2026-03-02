/**
 * Upload Pipeline Orchestrator (Worker-Powered)
 * Chains: Transcode → OCR/Analyze → Worker(Compress+Hash) → Worker(QR-Stamp) → Upload/Queue
 * Offloads heavy PDF operations to a background thread to keep UI responsive.
 */

import { transcodeToPdf } from './transcode';
import { supabase } from './supabase';
import { env } from '$env/dynamic/public';
import PdfWorker from './pdf.worker?worker';

export type PipelinePhase = 'transcoding' | 'compressing' | 'analyzing' | 'hashing' | 'stamping' | 'uploading' | 'done' | 'error';

export interface PipelineEvent {
    phase: PipelinePhase;
    progress: number; // 0-100
    message: string;
    result?: PipelineResult;
    metadata?: any;
    error?: string;
}

export interface PipelineResult {
    fileHash: string;
    filePath: string;
    fileSize: number;
    fileName: string;
}

export interface PipelineOptions {
    userId: string;
    docType?: string;
    weekNumber?: number;
    schoolYear?: string;
    subject?: string;
    calendarId?: string;
    teachingLoadId?: string;
    enforceOcr?: boolean;
    submissionWindowDays?: number;
    preDetectedMetadata?: any;
}



// Helper to wrap worker calls in a promise with Transferable support
function runWorkerTask(worker: Worker, type: string, payload: any, transfer: Transferable[] = []): Promise<any> {
    return new Promise((resolve, reject) => {
        const id = Math.random().toString(36).substring(7);
        const handler = (e: MessageEvent) => {
            if (e.data.id === id) {
                worker.removeEventListener('message', handler);
                if (e.data.success) resolve(e.data.payload);
                else reject(new Error(e.data.error));
            }
        };
        worker.addEventListener('message', handler);
        worker.postMessage({ type, payload, id }, transfer);
    });
}

export async function* runPipeline(
    file: File,
    options: PipelineOptions
): AsyncGenerator<PipelineEvent> {
    const worker = new PdfWorker();
    try {
        // Phase 1: Transcode
        yield { phase: 'transcoding', progress: 0, message: 'Converting document to PDF...' };
        const transcodeResult = await transcodeToPdf(file);
        const pdfBytes = transcodeResult.pdfBytes;
        yield { phase: 'transcoding', progress: 100, message: 'Document converted' };

        // Phase 2: OCR Scanning / Metadata Extraction
        yield { phase: 'analyzing', progress: 0, message: 'Analyzing document content...' };
        let detectedMetadata: any = options.preDetectedMetadata || null;

        if (detectedMetadata) {
            console.log('[pipeline] Using pre-detected metadata');
            yield {
                phase: 'analyzing',
                progress: 100,
                message: `Analyzed: ${detectedMetadata.docType} for Week ${detectedMetadata.weekNumber || '#'}`,
                metadata: detectedMetadata
            };
        } else {
            try {
                const { extractMetadata, parseMetadata } = await import('./ocr');
                if (transcodeResult.text) {
                    console.log('[pipeline] Using text from Word doc for metadata extraction');
                    detectedMetadata = parseMetadata(transcodeResult.text);
                } else {
                    detectedMetadata = await extractMetadata(file);
                }

                console.log('[pipeline] Metadata Result:', detectedMetadata);

                // ── OCR Enforcement (WBS 19.3) ──
                if (options.enforceOcr) {
                    const isUnknown = !detectedMetadata || detectedMetadata.docType === 'Unknown';
                    const hasManualOverride = options.docType && options.docType !== 'Unknown';

                    if (isUnknown && !hasManualOverride) {
                        throw new Error('OCR Enforcement: Document type could not be verified from the file content. Please ensure the document header is correct.');
                    }
                    const hasNoWeek = !detectedMetadata?.weekNumber && !options.weekNumber;
                    if (hasNoWeek) {
                        throw new Error('OCR Enforcement: Week number not found in document. Please ensure "(WEEK X)" is present in the header.');
                    }
                }

                yield {
                    phase: 'analyzing',
                    progress: 100,
                    message: `Filtered: ${detectedMetadata.docType} for Week ${detectedMetadata.weekNumber || '#'}`,
                    metadata: detectedMetadata
                };
            } catch (ocrErr) {
                console.warn('[pipeline] Metadata extraction failed:', ocrErr);
                if (options.enforceOcr) throw ocrErr;
            }
        }

        // Phase 3 & 4: Worker-powered Compress & Hash
        yield { phase: 'compressing', progress: 0, message: 'Compressing and hashing PDF...' };

        // OPTIMIZATION: Use Transferables for zero-copy move to worker
        const { compressedBytes, fileHash } = await runWorkerTask(
            worker,
            'COMPRESS_AND_HASH',
            { pdfBytes },
            [pdfBytes.buffer]
        );
        yield { phase: 'hashing', progress: 100, message: `Hash: ${fileHash.slice(0, 12)}...` };

        // Check for duplicates (ONLY if online)
        if (navigator.onLine) {
            yield { phase: 'hashing', progress: 100, message: 'Verifying uniqueness with server...' };

            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Uniqueness check timeout')), 5000)
            );

            try {
                const duplicateCheckPromise = supabase
                    .from('submissions')
                    .select('id')
                    .eq('file_hash', fileHash)
                    .maybeSingle();

                const { data: existing, error: checkError }: any = await Promise.race([
                    duplicateCheckPromise,
                    timeoutPromise
                ]);

                if (checkError) throw checkError;
                if (existing) {
                    throw new Error('Duplicate file detected. This document has already been archived.');
                }
            } catch (checkErr: any) {
                const isTimeout = checkErr?.message === 'Uniqueness check timeout';
                console.warn(`[pipeline] Uniqueness check ${isTimeout ? 'timed out' : 'warning'}:`, checkErr);

                // If it's a real duplicate error, rethrow it
                if (checkErr?.message?.includes('Duplicate')) throw checkErr;

                // Otherwise (network error or timeout), proceed to let the upload attempt happen
                console.info('[pipeline] Proceeding despite uniqueness check failure/timeout.');
            }
        }

        // Phase 5: QR Stamp (Managed by Worker)
        yield { phase: 'stamping', progress: 0, message: 'Embedding verification QR code...' };
        const { generateQrPng } = await import('./qr-stamp');
        const qrBytes = await generateQrPng(fileHash);

        const { stampedBytes } = await runWorkerTask(
            worker,
            'STAMP_QR',
            {
                compressedBytes,
                qrBytes,
                fileHash
            },
            [compressedBytes.buffer, qrBytes.buffer] // TRANSFER
        );

        const stamped = stampedBytes;
        yield { phase: 'stamping', progress: 100, message: 'QR code stamped' };

        // Phase 6: Sync to Background Queue (WBS 20.1)
        yield { phase: 'uploading', progress: 0, message: 'Queueing for background sync...' };

        const { enqueue } = await import('./offline');

        const fileName = file.name.replace(/\.\w+$/, '.pdf');
        // Standardize file path format
        const filePath = `${options.userId}/${Date.now()}_${fileName}`;

        await enqueue({
            fileName,
            filePath,
            fileHash,
            fileSize: stamped.byteLength,
            pdfBytes: new Uint8Array(stamped),
            options: {
                userId: options.userId,
                docType: options.docType,
                weekNumber: options.weekNumber,
                schoolYear: options.schoolYear,
                subject: options.subject,
                calendarId: options.calendarId,
                teachingLoadId: options.teachingLoadId,
            },
            timestamp: Date.now()
        });

        yield {
            phase: 'done',
            progress: 100,
            message: 'Queued for background sync!',
            result: { fileHash, filePath, fileSize: stamped.byteLength, fileName }
        };

        yield {
            phase: 'done',
            progress: 100,
            message: 'Upload Successful!',
            result: { fileHash, filePath, fileSize: stamped.byteLength, fileName }
        };
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        yield { phase: 'error', progress: 0, message, error: message };
    }
}

