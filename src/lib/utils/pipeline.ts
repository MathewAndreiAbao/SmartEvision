/**
 * Upload Pipeline Orchestrator (Worker-Powered) — Dual Mode
 * 
 * Two distinct paths optimized for their environment:
 * 
 * ONLINE:  Transcode → OCR → Worker(Compress+Hash) → Integrity Check →
 *          Worker(QR-Stamp) → Direct Supabase Upload → DB Insert → Ledger
 * 
 * OFFLINE: Transcode → OCR → Worker(Compress+Hash) → Ledger Check →
 *          Worker(QR-Stamp) → IndexedDB Queue → Ledger
 * 
 * Both paths share the same core processing pipeline and enforce:
 * - SHA-256 hash deduplication (no identical content)
 * - One upload per teaching load per week per doc type
 * - Naive Bayes classification
 * - QR code stamping for authenticity
 */

import { transcodeToPdf } from './transcode';
import { supabase } from './supabase';
import { createNotification } from './notificationSystem';
import { env } from '$env/dynamic/public';
import PdfWorker from './pdf.worker?worker';
import {
    validateUploadIntegrity,
    recordSubmission,
    type LedgerEntry
} from './offlineSubmissionLedger';
import { calculateComplianceStatus } from './offline';

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

// ─── Worker Helper ───────────────────────────────────────────────────────────

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

// ─── Core Pipeline (shared by online + offline) ─────────────────────────────

interface CoreResult {
    stampedBytes: Uint8Array;
    fileHash: string;
    fileName: string;
    filePath: string;
    detectedMetadata: any;
    activeWeekNumber?: number;
    activeDocType: string;
}

async function* runPipelineCore(
    file: File,
    options: PipelineOptions,
    worker: Worker
): AsyncGenerator<PipelineEvent & { _core?: CoreResult }> {

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
            const { extractMetadata, parseMetadata, resolveWeekFromDates } = await import('./ocr');
            if (transcodeResult.text) {
                console.log('[pipeline] Using text from Word doc for metadata extraction');
                detectedMetadata = parseMetadata(transcodeResult.text);
            } else {
                detectedMetadata = await extractMetadata(file);
            }

            console.log('[pipeline] Metadata Result:', detectedMetadata);

            // Calendar-Aware Week Resolution
            if (detectedMetadata?.dateRange && !detectedMetadata.weekNumber && !options.weekNumber) {
                try {
                    const { getCachedMetadata } = await import('./offline');

                    let calendar: any[] = [];
                    if (options.preDetectedMetadata?.district_id) {
                        const cached = await getCachedMetadata(`calendar_${options.preDetectedMetadata.district_id}`);
                        calendar = cached?.data || [];
                    }

                    if (calendar.length === 0) {
                        const cachedCal = await getCachedMetadata('calendar_all');
                        calendar = cachedCal?.data || [];
                    }

                    if (calendar.length === 0 && navigator.onLine) {
                        const { data } = await (await import('./supabase')).supabase
                            .from('academic_calendar')
                            .select('id, week_number, deadline_date')
                            .order('week_number', { ascending: true });
                        calendar = data || [];
                    }

                    if (calendar.length > 0) {
                        const resolved = resolveWeekFromDates(detectedMetadata.dateRange, calendar);
                        if (resolved) {
                            detectedMetadata.weekNumber = resolved.weekNumber;
                            detectedMetadata.weekSource = 'calendar';
                            if (resolved.calendarId && !options.calendarId) {
                                options.calendarId = resolved.calendarId;
                            }
                            console.log(`[pipeline] Calendar resolved: Week ${resolved.weekNumber}`);
                        }
                    }
                } catch (calErr) {
                    console.warn('[pipeline] Calendar-based week resolution failed:', calErr);
                }
            }

            // OCR Enforcement (WBS 19.3)
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

    const { compressedBytes, fileHash } = await runWorkerTask(
        worker,
        'COMPRESS_AND_HASH',
        { pdfBytes },
        [pdfBytes.buffer]
    );
    yield { phase: 'hashing', progress: 100, message: `SHA-256: ${fileHash.slice(0, 12)}...` };

    // Resolve active values
    const activeWeekNumber = options.weekNumber || detectedMetadata?.weekNumber;
    const activeDocType = options.docType || detectedMetadata?.docType || 'DLL';

    // Phase 5: QR Stamp (Worker-managed)
    yield { phase: 'stamping', progress: 0, message: 'Embedding verification QR code...' };
    const { generateQrPng } = await import('./qr-stamp');
    const qrBytes = await generateQrPng(fileHash);

    const { stampedBytes } = await runWorkerTask(
        worker,
        'STAMP_QR',
        { compressedBytes, qrBytes, fileHash },
        [compressedBytes.buffer, qrBytes.buffer]
    );
    yield { phase: 'stamping', progress: 100, message: 'QR code stamped — document is verifiable' };

    const fileName = file.name.replace(/\.\w+$/, '.pdf');
    const filePath = `${options.userId}/${Date.now()}_${fileName}`;

    // Yield the core result for the caller to use
    yield {
        phase: 'uploading',
        progress: 0,
        message: 'Preparing upload...',
        _core: {
            stampedBytes: new Uint8Array(stampedBytes),
            fileHash,
            fileName,
            filePath,
            detectedMetadata,
            activeWeekNumber,
            activeDocType
        }
    };
}

// ─── ONLINE Pipeline ─────────────────────────────────────────────────────────
// Direct upload to Supabase — no queue, instant confirmation.

export async function* runOnlinePipeline(
    file: File,
    options: PipelineOptions
): AsyncGenerator<PipelineEvent> {
    const worker = new PdfWorker();

    try {
        let core: CoreResult | null = null;

        // Run shared core pipeline
        for await (const event of runPipelineCore(file, options, worker)) {
            if (event._core) {
                core = event._core;
                // Don't yield the internal _core event — yield a clean one
                yield { phase: event.phase, progress: event.progress, message: event.message };
            } else {
                yield event;
            }
        }

        if (!core) throw new Error('Pipeline core failed to produce result');

        const { stampedBytes, fileHash, fileName, filePath, activeWeekNumber, activeDocType } = core;

        // ── Integrity Check 1: Offline Ledger (instant, local) ──
        yield { phase: 'uploading', progress: 5, message: 'Checking local integrity ledger...' };

        // Local offline cache check first (instant)
        const { lookupOfflineDoc } = await import('./offline');
        const cachedDuplicate = await lookupOfflineDoc(fileHash);
        if (cachedDuplicate) {
            throw new Error('Duplicate file detected. This document has already been archived (cached hash match).');
        }

        // Check ledger for slot + hash
        if (options.teachingLoadId && activeWeekNumber) {
            const integrity = await validateUploadIntegrity(
                options.teachingLoadId,
                activeWeekNumber,
                options.schoolYear || '2025-2026',
                activeDocType,
                fileHash
            );
            if (!integrity.allowed) {
                throw new Error(integrity.reason || 'Upload blocked by integrity check.');
            }
        }

        // ── Integrity Check 2: Server-side (authoritative) ──
        yield { phase: 'uploading', progress: 15, message: 'Verifying with server — hash integrity...' };

        // Hash uniqueness
        try {
            const { data: hashMatch, error: hashErr } = await supabase
                .from('submissions')
                .select('id, file_name, doc_type, week_number')
                .eq('file_hash', fileHash)
                .limit(1)
                .maybeSingle();

            if (hashErr) throw new Error(`Integrity check failed: ${hashErr.message}`);

            if (hashMatch) {
                throw new Error(`Duplicate content detected. This exact document was already archived as "${hashMatch.file_name}" (${hashMatch.doc_type}, Week ${hashMatch.week_number}).`);
            }
        } catch (err: any) {
            // Rethrow if it's a duplicate error, otherwise fail strictly
            if (err?.message?.includes('Duplicate') || err?.message?.includes('already archived')) throw err;
            throw new Error(`Integrity verification unavailable: ${err?.message || 'Check failed'}. Please try again when online.`);
        }

        // Metadata uniqueness (one-per-week-per-load)
        if (options.teachingLoadId && activeWeekNumber) {
            yield { phase: 'uploading', progress: 20, message: 'Verifying slot uniqueness...' };

            try {
                const metaCheckPromise = supabase
                    .from('submissions')
                    .select('id')
                    .eq('teaching_load_id', options.teachingLoadId)
                    .eq('week_number', activeWeekNumber)
                    .eq('school_year', options.schoolYear || '2025-2026')
                    .eq('doc_type', activeDocType)
                    .maybeSingle();

                const metaTimeout = new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('Meta check timeout')), 5000)
                );

                const { data: metaMatch }: any = await Promise.race([metaCheckPromise, metaTimeout]);

                if (metaMatch) {
                    throw new Error(`Archival blocked: A ${activeDocType} document has already been submitted for this teaching load in Week ${activeWeekNumber}.`);
                }
            } catch (err: any) {
                if (err?.message?.includes('Archival blocked') || err?.message?.includes('already been submitted')) throw err;
                console.warn('[pipeline] Meta check warning (proceeding):', err?.message);
            }
        }

        // ── Direct Upload to Supabase Storage ──
        yield { phase: 'uploading', progress: 30, message: 'Uploading to secure cloud storage...' };

        const { data: sessionData } = await supabase.auth.getSession();
        const accessToken = sessionData?.session?.access_token;
        if (!accessToken) throw new Error('Not authenticated. Please sign in again.');

        const storageUrl = `${env.PUBLIC_SUPABASE_URL}/storage/v1/object/submissions/${filePath}`;
        const uploadFile = new File([stampedBytes as any], fileName, { type: 'application/pdf' });

        const uploadResponse = await fetch(storageUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'x-upsert': 'false'
            },
            body: uploadFile
        });

        if (!uploadResponse.ok) {
            const errBody = await uploadResponse.text().catch(() => 'Unknown error');
            const isDuplicate = uploadResponse.status === 409 ||
                (uploadResponse.status === 400 && errBody.includes('"statusCode":"409"')) ||
                errBody.toLowerCase().includes('already exists') ||
                errBody.toLowerCase().includes('duplicate');

            if (isDuplicate) {
                console.info(`[pipeline] File exists in storage (OK): ${fileName}`);
            } else {
                throw new Error(`Storage upload failed (${uploadResponse.status}): ${errBody}`);
            }
        }

        yield { phase: 'uploading', progress: 70, message: 'Recording to database...' };

        // ── Fetch deadline for compliance ──
        let deadlineDate: Date | undefined;
        if (options.calendarId) {
            const { data } = await supabase.from('academic_calendar').select('deadline_date').eq('id', options.calendarId).single();
            if (data?.deadline_date) deadlineDate = new Date(data.deadline_date);
        } else if (activeWeekNumber) {
            const { data: profileData } = await supabase.from('profiles').select('district_id').eq('id', options.userId).single();
            if (profileData?.district_id) {
                const { data: calData } = await supabase
                    .from('academic_calendar')
                    .select('deadline_date')
                    .eq('district_id', profileData.district_id)
                    .eq('week_number', activeWeekNumber)
                    .maybeSingle();
                if (calData?.deadline_date) deadlineDate = new Date(calData.deadline_date);
            }
        }

        // ── DB Insert ──
        const complianceStatus = calculateComplianceStatus(new Date(), deadlineDate);

        const { error: dbError } = await supabase.from('submissions').insert({
            user_id: options.userId,
            file_name: fileName,
            file_path: filePath,
            file_hash: fileHash,
            file_size: stampedBytes.byteLength,
            doc_type: activeDocType,
            week_number: activeWeekNumber,
            school_year: options.schoolYear || '2025-2026',
            subject: options.subject,
            calendar_id: options.calendarId || null,
            teaching_load_id: options.teachingLoadId || null,
            compliance_status: complianceStatus
        });

        if (dbError) {
            // Handle unique constraint violation
            if (dbError.code === '23505' || dbError.message?.includes('unique_submission_per_load_week')) {
                throw new Error(`Archival blocked: A ${activeDocType} document is already archived for Week ${activeWeekNumber}.`);
            }
            throw new Error(`Database error: ${dbError.message}`);
        }

        yield { phase: 'uploading', progress: 90, message: 'Finalizing integrity records...' };

        // ── Record to Ledger + Hash Cache ──
        if (options.teachingLoadId && activeWeekNumber) {
            await recordSubmission({
                teachingLoadId: options.teachingLoadId,
                weekNumber: activeWeekNumber,
                schoolYear: options.schoolYear || '2025-2026',
                docType: activeDocType,
                fileHash,
                fileName,
                timestamp: Date.now(),
                status: 'synced'
            });
        }

        // Cache the hash for future offline verification
        const { cacheVerifiedDoc } = await import('./offline');
        await cacheVerifiedDoc(fileHash, {
            file_name: fileName,
            doc_type: activeDocType,
            week_number: activeWeekNumber,
            school_year: options.schoolYear || '2025-2026',
            teaching_load_id: options.teachingLoadId,
            created_at: new Date().toISOString()
        });

        // Create notification
        await createNotification(
            options.userId,
            'Archival Successful',
            `Successfully archived ${activeDocType} for ${options.subject || 'Subject'} - Week ${activeWeekNumber}.`,
            'success',
            '/dashboard/archive'
        );

        yield {
            phase: 'done',
            progress: 100,
            message: 'Upload Successful! Document archived securely.',
            result: { fileHash, filePath, fileSize: stampedBytes.byteLength, fileName }
        };
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        yield { phase: 'error', progress: 0, message, error: message };
    } finally {
        worker.terminate();
    }
}

// ─── OFFLINE Pipeline ────────────────────────────────────────────────────────
// Processes locally, saves to IndexedDB queue, syncs when online.

export async function* runOfflinePipeline(
    file: File,
    options: PipelineOptions
): AsyncGenerator<PipelineEvent> {
    const worker = new PdfWorker();

    try {
        let core: CoreResult | null = null;

        // Run shared core pipeline
        for await (const event of runPipelineCore(file, options, worker)) {
            if (event._core) {
                core = event._core;
                yield { phase: event.phase, progress: event.progress, message: event.message };
            } else {
                yield event;
            }
        }

        if (!core) throw new Error('Pipeline core failed to produce result');

        const { stampedBytes, fileHash, fileName, filePath, activeWeekNumber, activeDocType } = core;

        // ── Local Integrity Check (offline ledger + hash cache) ──
        yield { phase: 'uploading', progress: 10, message: 'Checking local integrity...' };

        // Check offline hash cache
        const { lookupOfflineDoc } = await import('./offline');
        const cachedDuplicate = await lookupOfflineDoc(fileHash);
        if (cachedDuplicate) {
            throw new Error('Duplicate file detected. This document has already been archived (offline hash match).');
        }

        // Check ledger for slot + hash uniqueness
        if (options.teachingLoadId && activeWeekNumber) {
            const integrity = await validateUploadIntegrity(
                options.teachingLoadId,
                activeWeekNumber,
                options.schoolYear || '2025-2026',
                activeDocType,
                fileHash
            );
            if (!integrity.allowed) {
                throw new Error(integrity.reason || 'Upload blocked by offline integrity check.');
            }
        }

        // ── Enqueue to IndexedDB ──
        yield { phase: 'uploading', progress: 40, message: 'Saving to offline queue...' };

        const { enqueue } = await import('./offline');

        await enqueue({
            fileName,
            filePath,
            fileHash,
            fileSize: stampedBytes.byteLength,
            pdfBytes: stampedBytes,
            options: {
                userId: options.userId,
                docType: activeDocType,
                weekNumber: activeWeekNumber,
                schoolYear: options.schoolYear || '2025-2026',
                subject: options.subject,
                calendarId: options.calendarId,
                teachingLoadId: options.teachingLoadId
            },
            timestamp: Date.now()
        });

        yield { phase: 'uploading', progress: 70, message: 'Recording to integrity ledger...' };

        // ── Record to Ledger (as pending) ──
        if (options.teachingLoadId && activeWeekNumber) {
            await recordSubmission({
                teachingLoadId: options.teachingLoadId,
                weekNumber: activeWeekNumber,
                schoolYear: options.schoolYear || '2025-2026',
                docType: activeDocType,
                fileHash,
                fileName,
                timestamp: Date.now(),
                status: 'pending'
            });
        }

        // Cache hash locally for future duplicate checks
        const { cacheVerifiedDoc } = await import('./offline');
        await cacheVerifiedDoc(fileHash, {
            file_name: fileName,
            doc_type: activeDocType,
            week_number: activeWeekNumber,
            school_year: options.schoolYear || '2025-2026',
            teaching_load_id: options.teachingLoadId,
            created_at: new Date().toISOString(),
            pending_sync: true
        });

        // Create local notification
        await createNotification(
            options.userId,
            'Queued for Sync',
            `Saved offline: ${activeDocType} for ${options.subject || 'Subject'} - Week ${activeWeekNumber}. Will sync when online.`,
            'info',
            '/dashboard/upload'
        );

        yield {
            phase: 'done',
            progress: 100,
            message: 'Saved offline! Will auto-sync when connection is restored.',
            result: { fileHash, filePath, fileSize: stampedBytes.byteLength, fileName }
        };
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        yield { phase: 'error', progress: 0, message, error: message };
    } finally {
        worker.terminate();
    }
}

// ─── Legacy Compatibility ────────────────────────────────────────────────────
// Auto-selects the appropriate pipeline based on connectivity.

export async function* runPipeline(
    file: File,
    options: PipelineOptions
): AsyncGenerator<PipelineEvent> {
    const isOnline = typeof navigator !== 'undefined' && navigator.onLine;

    if (isOnline) {
        yield* runOnlinePipeline(file, options);
    } else {
        yield* runOfflinePipeline(file, options);
    }
}
