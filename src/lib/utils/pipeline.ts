/**
 * Upload Pipeline Orchestrator (Worker-Powered) — Resilient Hybrid Mode
 * 
 * This orchestrator manages the high-stakes document archival pipeline.
 * It is designed to be extremely resilient, especially on mobile devices.
 * 
 * HYBRID STRATEGY:
 * 1. Attempt secure cloud archival (Online).
 * 2. If the server check/upload stalls (timeout) or network fails, 
 *    automatically move the document to the local persistent vault (Offline).
 * 3. Sync background processes will attempt to finalize the archive later.
 */

import { transcodeToPdf } from './transcode';
import PdfWorker from './pdf.worker?worker';
import { supabase } from './supabase';
import { env } from '$env/dynamic/public';
import { createNotification } from './notificationSystem';

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

interface CoreResult {
    stampedBytes: Uint8Array;
    fileHash: string;
    fileName: string;
    filePath: string;
    detectedMetadata: any;
    activeWeekNumber?: number;
    activeDocType: string;
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

// ─── Timeout Helper ──────────────────────────────────────────────────────────

export async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, errorMessage: string): Promise<T> {
    let timeoutId: any;
    const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error(errorMessage)), timeoutMs);
    });

    try {
        const result = await Promise.race([promise, timeoutPromise]);
        return result as T;
    } finally {
        clearTimeout(timeoutId);
    }
}

// ─── Core Pipeline ───────────────────────────────────────────────────────────

async function* runPipelineCore(
    file: File,
    options: PipelineOptions,
    worker: Worker
): AsyncGenerator<PipelineEvent & { _core?: CoreResult }> {

    // 1. Transcode
    yield { phase: 'transcoding', progress: 10, message: 'Converting document to PDF...' };
    const transcodeResult = await transcodeToPdf(file);
    const pdfBytes = transcodeResult.pdfBytes;

    // 2. Analyzing (OCR)
    yield { phase: 'analyzing', progress: 30, message: 'Analyzing document content...' };
    const { extractMetadata } = await import('./ocr');
    const detectedMetadata = options.preDetectedMetadata || await extractMetadata(file);

    // 3. Compress & Hash
    yield { phase: 'compressing', progress: 50, message: 'Compressing and hashing...' };
    const { compressedBytes, fileHash } = await runWorkerTask(
        worker,
        'COMPRESS_AND_HASH',
        { pdfBytes },
        [pdfBytes.buffer]
    );

    // 4. Stamping
    yield { phase: 'stamping', progress: 70, message: 'Embedding verification stamp...' };
    const { generateQrPng } = await import('./qr-stamp');
    const qrBytes = await generateQrPng(fileHash);
    const { stampedBytes } = await runWorkerTask(
        worker,
        'STAMP_QR',
        { compressedBytes, qrBytes, fileHash },
        [compressedBytes.buffer, qrBytes.buffer]
    );

    const activeWeekNumber = options.weekNumber || detectedMetadata?.weekNumber;
    const activeDocType = options.docType || detectedMetadata?.docType || 'DLL';
    const fileName = file.name.replace(/\.\w+$/, '.pdf');
    const filePath = `${options.userId}/${Date.now()}_${fileName}`;

    yield {
        phase: 'uploading',
        progress: 90,
        message: 'Processing complete, ready to archive.',
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

// ─── Resilient Sub-Pipelines ─────────────────────────────────────────────────

async function* runOnlinePipelineResilient(
    core: CoreResult,
    options: PipelineOptions
): AsyncGenerator<PipelineEvent> {
    const { stampedBytes, fileHash, fileName, filePath, activeWeekNumber, activeDocType } = core;

    yield { phase: 'uploading', progress: 10, message: 'Verifying with server...' };

    const { lookupOfflineDoc, cacheVerifiedDoc, calculateComplianceStatus } = await import('./offline');
    const { recordSubmission, validateUploadIntegrity } = await import('./offlineSubmissionLedger');

    // Local check
    if (await lookupOfflineDoc(fileHash)) throw new Error('Duplicate file detected (local).');

    // Integrity check
    if (options.teachingLoadId && activeWeekNumber) {
        const integrity = await validateUploadIntegrity(
            options.teachingLoadId,
            activeWeekNumber,
            options.schoolYear || '2025-2026',
            activeDocType,
            fileHash
        );
        if (!integrity.allowed) throw new Error(integrity.reason || 'Integrity block.');
    }

    // Server check
    const { data: hashMatch } = await withTimeout(
        supabase.from('submissions').select('file_name, week_number').eq('file_hash', fileHash).maybeSingle() as any,
        15000,
        'Server integrity check timed out.'
    ) as { data: any };
    if (hashMatch) throw new Error(`Duplicate content detected on server: ${hashMatch.file_name}`);

    // Storage Upload
    yield { phase: 'uploading', progress: 40, message: 'Uploading to cloud storage...' };
    const { data: session } = await supabase.auth.getSession();
    const storageUrl = `${env.PUBLIC_SUPABASE_URL}/storage/v1/object/submissions/${filePath}`;

    const uploadResponse = await withTimeout(
        fetch(storageUrl, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${session?.session?.access_token}`, 'x-upsert': 'false' },
            body: new File([stampedBytes as any], fileName, { type: 'application/pdf' })
        }),
        30000,
        'Storage upload timed out.'
    );
    if (!uploadResponse.ok && !uploadResponse.status.toString().startsWith('409')) {
        throw new Error(`Upload failed: ${await uploadResponse.text()}`);
    }

    // DB Record
    yield { phase: 'uploading', progress: 80, message: 'Finalizing cloud record...' };
    const complianceStatus = calculateComplianceStatus(new Date());
    const { error: dbError } = await withTimeout(
        supabase.from('submissions').insert({
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
        }) as any,
        15000,
        'Database record timed out.'
    ) as { error: any };
    if (dbError) throw new Error(`DB Error: ${dbError.message}`);

    // Success bookkeeping
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
    await cacheVerifiedDoc(fileHash, { file_name: fileName, doc_type: activeDocType, week_number: activeWeekNumber });

    await createNotification(options.userId, 'Archival Successful', `Securely archived ${activeDocType} - Week ${activeWeekNumber}.`, 'success');

    yield {
        phase: 'done',
        progress: 100,
        message: 'Upload Successful!',
        result: { fileHash, filePath, fileSize: stampedBytes.byteLength, fileName }
    };
}

async function* runOfflinePipelineResilient(
    core: CoreResult,
    options: PipelineOptions
): AsyncGenerator<PipelineEvent> {
    const { stampedBytes, fileHash, fileName, filePath, activeWeekNumber, activeDocType } = core;
    yield { phase: 'uploading', progress: 50, message: 'Saving to offline vault...' };

    const { enqueue, cacheVerifiedDoc } = await import('./offline');
    const { recordSubmission } = await import('./offlineSubmissionLedger');

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

    await cacheVerifiedDoc(fileHash, { file_name: fileName, doc_type: activeDocType, week_number: activeWeekNumber, pending_sync: true });
    await createNotification(options.userId, 'Saved Locally', `Document saved to offline queue.`, 'info');

    yield {
        phase: 'done',
        progress: 100,
        message: 'Saved offline!',
        result: { fileHash, filePath, fileSize: stampedBytes.byteLength, fileName }
    };
}

// ─── Main Entry Point ────────────────────────────────────────────────────────

export async function* runPipeline(
    file: File,
    options: PipelineOptions
): AsyncGenerator<PipelineEvent> {
    const isOnline = typeof navigator !== 'undefined' && navigator.onLine;
    const worker = new PdfWorker();

    try {
        let core: CoreResult | null = null;
        for await (const event of runPipelineCore(file, options, worker)) {
            if (event._core) core = event._core;
            yield { phase: event.phase, progress: event.progress, message: event.message, metadata: event.metadata };
        }
        if (!core) throw new Error('Processing failed.');

        if (isOnline) {
            try {
                yield* runOnlinePipelineResilient(core, options);
                return;
            } catch (err: any) {
                const isStall = err.message?.includes('timeout') || err.message?.includes('fetch') || err.message?.includes('Network');
                if (isStall) {
                    console.warn('[pipeline] Online stall, falling back to offline vault.');
                    yield { phase: 'uploading', progress: 0, message: 'Connection unstable. Saving locally...' };
                } else {
                    throw err; // Hard error (Duplicate)
                }
            }
        }

        yield* runOfflinePipelineResilient(core, options);

    } catch (err: any) {
        yield { phase: 'error', progress: 0, message: err.message || 'Unknown error' };
    } finally {
        worker.terminate();
    }
}
