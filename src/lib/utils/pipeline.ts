/**
 * Upload Pipeline Orchestrator (Worker-Powered)
 * Chains: Transcode → OCR/Analyze → Worker(Compress+Hash) → Worker(QR-Stamp) → Upload/Queue
 * Offloads heavy PDF operations to a background thread to keep UI responsive.
 */

import { transcodeToPdf } from './transcode';
import { supabase } from './supabase';
import { enqueue } from './offline';
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

function calculateComplianceStatus(
    submissionDate: Date,
    deadlineDate?: Date,
    windowDays: number = 5
): 'compliant' | 'late' | 'non-compliant' {
    const now = submissionDate;

    if (deadlineDate) {
        const deadline = new Date(deadlineDate);
        deadline.setHours(23, 59, 59, 999);

        if (now <= deadline) return 'compliant';

        // Use dynamic window days for "late" status (WBS 14.5)
        const lateDeadline = new Date(deadline);
        lateDeadline.setDate(lateDeadline.getDate() + (windowDays || 5));

        if (now <= lateDeadline) return 'late';

        return 'non-compliant';
    }

    // Fallback if no supervisor deadline is set:
    const dayOfWeek = now.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
    if (dayOfWeek === 1) return 'compliant';
    if (dayOfWeek === 2) return 'late';
    return 'non-compliant';
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

            try {
                const { data: existing, error: checkError } = await supabase
                    .from('submissions')
                    .select('id')
                    .eq('file_hash', fileHash)
                    .maybeSingle();

                if (checkError) throw checkError;
                if (existing) {
                    throw new Error('Duplicate file detected. This document has already been archived.');
                }
            } catch (checkErr: any) {
                console.warn('[pipeline] Uniqueness check warning:', checkErr);
                // If it's a real duplicate error, rethrow it
                if (checkErr?.message?.includes('Duplicate')) throw checkErr;
                // Otherwise (network error), proceed to let the upload attempt happen or fallback
                console.info('[pipeline] Proceeding despite uniqueness check failure.');
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

        // Phase 6: Upload
        yield { phase: 'uploading', progress: 0, message: 'Uploading to secure storage...' };

        const isOnline = navigator.onLine;
        const fileName = file.name.replace(/\.\w+$/, '.pdf');
        const filePath = `${options.userId}/${Date.now()}_${fileName}`;

        // Sanitize options to prevent IndexedDB cloning errors (Svelte proxies)
        const sanitizedOptions = JSON.parse(JSON.stringify(options));

        if (isOnline) {
            try {
                // DIRECT UPLOAD: No artificial sync timeouts
                // 1. Storage Upload
                const { error: uploadError } = await supabase.storage
                    .from('submissions')
                    .upload(filePath, stamped, {
                        contentType: 'application/pdf',
                        upsert: false
                    });

                if (uploadError) throw new Error(`Storage error: ${uploadError.message}`);

                // 2. Fetch deadline
                let deadlineDate: Date | undefined;
                if (options.calendarId) {
                    const { data } = await supabase.from('academic_calendar').select('deadline_date').eq('id', options.calendarId).single();
                    if (data?.deadline_date) deadlineDate = new Date(data.deadline_date);
                } else if (options.weekNumber) {
                    const { data: profileData } = await supabase.from('profiles').select('district_id').eq('id', options.userId).single();
                    if (profileData?.district_id) {
                        const { data: calData } = await supabase
                            .from('academic_calendar')
                            .select('deadline_date')
                            .eq('district_id', profileData.district_id)
                            .eq('week_number', options.weekNumber)
                            .maybeSingle();
                        if (calData?.deadline_date) deadlineDate = new Date(calData.deadline_date);
                    }
                }

                // 3. Database Entry
                const complianceStatus = calculateComplianceStatus(new Date(), deadlineDate, options.submissionWindowDays);
                const { error: dbError } = await supabase.from('submissions').insert({
                    user_id: options.userId,
                    file_name: fileName,
                    file_path: filePath,
                    file_hash: fileHash,
                    file_size: stamped.byteLength,
                    doc_type: options.docType || 'Unknown',
                    week_number: options.weekNumber,
                    subject: options.subject,
                    school_year: options.schoolYear || '2025-2026',
                    calendar_id: options.calendarId,
                    teaching_load_id: options.teachingLoadId,
                    compliance_status: complianceStatus
                });

                if (dbError) throw new Error(`Database error: ${dbError.message}`);

                yield {
                    phase: 'done',
                    progress: 100,
                    message: 'Upload Successful!',
                    result: { fileHash, filePath, fileSize: stamped.byteLength, fileName }
                };
            } catch (syncErr) {
                console.warn('[pipeline] Online sync failed. Falling back to offline queue:', syncErr);

                yield {
                    phase: 'uploading',
                    progress: 50,
                    message: 'Scan complete. Network unstable — finishing in background...'
                };

                await enqueue({
                    fileName,
                    filePath,
                    fileHash,
                    fileSize: stamped.byteLength,
                    pdfBytes: stamped,
                    options: sanitizedOptions,
                    timestamp: Date.now()
                });

                yield {
                    phase: 'done',
                    progress: 100,
                    message: 'Queued for background sync — will finish automatically',
                    result: { fileHash, filePath, fileSize: stamped.byteLength, fileName }
                };
            }
        } else {
            // Offline: queue for later
            await enqueue({
                fileName,
                filePath,
                fileHash,
                fileSize: stamped.byteLength,
                pdfBytes: stamped,
                options: sanitizedOptions,
                timestamp: Date.now()
            });

            yield {
                phase: 'done',
                progress: 100,
                message: 'Offline — will sync when connection is restored',
                result: { fileHash, filePath, fileSize: stamped.byteLength, fileName }
            };
        }
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        yield { phase: 'error', progress: 0, message, error: message };
    }
}
