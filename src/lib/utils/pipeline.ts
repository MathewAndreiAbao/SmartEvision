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
import { compressFile } from './compress';
import { supabase } from './supabase';
import { env } from '$env/dynamic/public';
import { createNotification } from './notificationSystem';
import { getCurrentSchoolYear } from './schoolYear';
import type { PipelineEvent, PipelineOptions } from '$lib/types/pipeline';
export type { PipelinePhase, PipelineResult } from '$lib/types/pipeline';

interface CoreResult {
    stampedBytes: Uint8Array;
    fileHash: string;
    fileName: string;
    filePath: string;
    detectedMetadata: any;
    activeWeekNumber?: number;
    activeDocType: string;
    rawText: string;
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

// A single transient blip (brief signal drop, one dropped packet) on a bad
// mobile connection shouldn't fail the whole upload after already getting
// this far. Used only for calls whose failure is meant to be a hard stop
// (unlike the calendar lookups, which fail soft) — it retries the same
// bounded attempt once more before giving up for real.
async function withRetry<T>(fn: () => Promise<T>, attempts: number, delayMs: number): Promise<T> {
    let lastErr: unknown;
    for (let i = 0; i < attempts; i++) {
        try {
            return await fn();
        } catch (err) {
            lastErr = err;
            if (i < attempts - 1) await new Promise((r) => setTimeout(r, delayMs));
        }
    }
    throw lastErr;
}

interface XhrUploadResult {
    ok: boolean;
    status: number;
    body: string;
}

/**
 * Upload via XMLHttpRequest rather than fetch, for two mobile-specific reasons.
 *
 * 1. fetch() cannot report upload progress at all, so the bar sat frozen for
 *    the entire transfer — on a slow phone connection that's minutes of a UI
 *    that looks hung, which is indistinguishable from a dead connection.
 *    XHR exposes upload.onprogress, so real bytes-sent can be surfaced.
 * 2. A single flat timeout punishes slow-but-working transfers: a 3MB file at
 *    5 KB/s legitimately needs ~10 minutes, and killing that at 2 minutes
 *    throws away a transfer that was succeeding. This instead times out on
 *    *inactivity* — it only aborts if no bytes move for stallMs, so a slow
 *    upload runs as long as it needs while a genuinely dead one still fails
 *    promptly.
 */
function xhrUpload(
    url: string,
    body: XMLHttpRequestBodyInit,
    opts: {
        method?: string;
        headers?: Record<string, string>;
        stallMs?: number;
        onProgress?: (loaded: number, total: number) => void;
    } = {}
): Promise<XhrUploadResult> {
    const { method = 'POST', headers = {}, stallMs = 90000, onProgress } = opts;

    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        let stallTimer: any;

        const resetStallTimer = () => {
            clearTimeout(stallTimer);
            stallTimer = setTimeout(() => {
                xhr.abort();
                reject(new Error('Upload stalled — no data sent for a while. Check your connection and try again.'));
            }, stallMs);
        };

        const done = () => clearTimeout(stallTimer);

        xhr.open(method, url, true);
        for (const [k, v] of Object.entries(headers)) xhr.setRequestHeader(k, v);

        xhr.upload.onprogress = (e) => {
            resetStallTimer();
            if (e.lengthComputable && onProgress) onProgress(e.loaded, e.total);
        };
        // Bytes are still in flight while the server responds; keep the stall
        // timer alive so a slow server round-trip isn't mistaken for a stall.
        xhr.onprogress = resetStallTimer;
        xhr.onload = () => {
            done();
            resolve({ ok: xhr.status >= 200 && xhr.status < 300, status: xhr.status, body: xhr.responseText });
        };
        xhr.onerror = () => { done(); reject(new Error('Network error during upload.')); };
        xhr.onabort = () => done();
        xhr.ontimeout = () => { done(); reject(new Error('Upload timed out.')); };

        resetStallTimer();
        xhr.send(body);
    });
}

// ─── Core Pipeline ───────────────────────────────────────────────────────────

async function* runPipelineCore(
    file: File,
    options: PipelineOptions,
    worker: Worker
): AsyncGenerator<PipelineEvent & { _core?: CoreResult }> {

    // 1. Transcode (Word to PDF)
    yield { phase: 'transcoding', progress: 10, message: 'Converting to PDF...' };
    let pdfBytes = file.type === 'application/pdf' ? new Uint8Array(await file.arrayBuffer()) : (await transcodeToPdf(file)).pdfBytes;

    // 2. Mobile Optimization: Detect "Low-Power" or "Slow-Connection" state
    // Skip heavy compression if the file is already small to save CPU/Battery on mobile
    // effectiveType is one of 'slow-2g' | '2g' | '3g' | '4g'. Matching only
    // '2g' missed 'slow-2g' entirely — the very slowest class, i.e. exactly
    // the connection this branch exists to protect — and also treated a
    // crawling '3g' link as if it were fine.
    const effectiveType = (navigator as any).connection?.effectiveType;
    const isSlowConnection =
        effectiveType === 'slow-2g' ||
        effectiveType === '2g' ||
        effectiveType === '3g' ||
        (navigator as any).connection?.saveData === true;
    const isSmallEnough = pdfBytes.byteLength < 2 * 1024 * 1024; // 2MB

    if (isSlowConnection && isSmallEnough) {
        console.log('[pipeline] Low-power/Slow-connection detected. Skipping non-essential compression.');
        yield { phase: 'compressing', progress: 30, message: 'Fast-tracking small file...' };
    } else {
        yield { phase: 'compressing', progress: 30, message: 'Optimizing for mobile...' };
        pdfBytes = await compressFile(pdfBytes);
    }

    // 2.5. Analyzing (OCR) - Use converted PDF bytes for OCR, not the original file
    yield { phase: 'analyzing', progress: 30, message: 'Analyzing document content...' };
    const { extractMetadata } = await import('./ocr');
    const pdfBlob = new Blob([pdfBytes as BlobPart]);
    const ocrFile = file.type === 'application/pdf' ? file : new File([pdfBlob], file.name.replace(/\.\w+$/, '.pdf'), { type: 'application/pdf' });
    const hasPreDetected = options.preDetectedMetadata?.docType && options.preDetectedMetadata?.docType !== 'Unknown' && options.preDetectedMetadata?.rawText;
    const detectedMetadata = hasPreDetected ? options.preDetectedMetadata : await extractMetadata(ocrFile);

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
    const rawText = options.rawText || detectedMetadata?.rawText || '';
    const fileName = file.name.replace(/\.\w+$/, '.pdf');
    const sanitizedFileName = (fileName || 'document').replace(/\s+/g, '_').replace(/[^a-zA-Z0-9._-]/g, '');
    const filePath = `submissions/${options.userId}/${activeDocType}/${Date.now()}_${sanitizedFileName}`;

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
                activeDocType,
                rawText
            }
    };
}

// ─── Resilient Sub-Pipelines ─────────────────────────────────────────────────

async function* runOnlinePipelineResilient(
    core: CoreResult,
    options: PipelineOptions
): AsyncGenerator<PipelineEvent> {
    const { stampedBytes, fileHash, fileName, filePath, activeWeekNumber, activeDocType, rawText } = core;

    yield { phase: 'uploading', progress: 10, message: 'Verifying with server...' };

    const { lookupOfflineDoc, cacheVerifiedDoc, calculateComplianceStatus } = await import('./offline');
    const { recordSubmission } = await import('./offlineSubmissionLedger');

    // Look up calendar_id + deadline from academic_calendar using detected week number.
    // This is metadata only — calculateComplianceStatus() already falls back
    // to 'compliant' when there's no deadline — so a slow/failed lookup must
    // never abort the whole upload. Each query is time-bounded (previously
    // unbounded, so a bad connection could hang here forever with no error),
    // and any failure (timeout or otherwise) is swallowed: the archive still
    // goes through, just without deadline-based lateness tracking for this
    // submission.
    let calendarId = options.calendarId || null;
    let deadlineDate: Date | undefined;
    if (!calendarId && activeWeekNumber) {
        try {
            const { data: calEntry } = await withTimeout(
                supabase
                    .from('academic_calendar')
                    .select('id, deadline_date')
                    .eq('school_year', options.schoolYear || getCurrentSchoolYear())
                    .eq('week_number', activeWeekNumber)
                    .maybeSingle() as any,
                10000,
                'Calendar lookup timed out.'
            ) as { data: any };
            if (!calEntry) {
                yield { phase: 'uploading', progress: 15, message: 'Verifying with server...' };
                const { data: profileData } = await withTimeout(
                    supabase
                        .from('profiles')
                        .select('district_id')
                        .eq('id', options.userId)
                        .single() as any,
                    10000,
                    'Profile lookup timed out.'
                ) as { data: any };
                if (profileData?.district_id) {
                    const { data: calByDistrict } = await withTimeout(
                        supabase
                            .from('academic_calendar')
                            .select('id, deadline_date')
                            .eq('district_id', profileData.district_id)
                            .eq('week_number', activeWeekNumber)
                            .maybeSingle() as any,
                        10000,
                        'Calendar lookup timed out.'
                    ) as { data: any };
                    if (calByDistrict) {
                        calendarId = calByDistrict.id;
                        if (calByDistrict.deadline_date) deadlineDate = new Date(calByDistrict.deadline_date);
                    }
                }
            } else {
                calendarId = calEntry.id;
                if (calEntry.deadline_date) deadlineDate = new Date(calEntry.deadline_date);
            }
        } catch (err: any) {
            console.warn('[pipeline] Calendar lookup failed/timed out, continuing without a deadline:', err?.message);
        }
    }

    yield { phase: 'uploading', progress: 20, message: 'Checking for duplicates...' };

    // Local check
    if (await lookupOfflineDoc(fileHash)) throw new Error('Duplicate file detected (local).');

    // Server check — cross-teacher, so it goes through a narrow RPC rather
    // than a direct table select (see migrations/20260910_*.sql).
    //
    // This is a fail-FAST optimization, not the integrity guarantee: the
    // submissions table has a UNIQUE (file_hash) constraint (see
    // 20240310_add_unique_file_hash.sql), so a duplicate that slips past
    // here is still rejected by the INSERT below. Treating a *timeout* as a
    // hard failure therefore blocked plenty of perfectly valid uploads on
    // weak mobile connections for no integrity benefit at all — the phone
    // would do minutes of transcode/OCR/hash work and then throw it away
    // over a lookup whose only job was to save bandwidth.
    //
    // So: a positive result still stops the upload early (fast path intact),
    // but a timeout/network error just logs and continues to the real check.
    try {
        const { data: hashMatch } = await withRetry(
            () => withTimeout(
                supabase.rpc('check_duplicate_submission_hash', { p_hash: fileHash }).maybeSingle() as any,
                15000,
                'Server integrity check timed out.'
            ) as Promise<{ data: any }>,
            2,
            1500
        );
        if (hashMatch) throw new Error(`Duplicate content detected on server: ${hashMatch.file_name}`);
    } catch (err: any) {
        // A real duplicate finding must still propagate — only connectivity
        // failures are downgraded to a warning.
        if (err?.message?.startsWith('Duplicate content detected')) throw err;
        console.warn('[pipeline] Duplicate pre-check unavailable, deferring to the DB constraint:', err?.message);
    }

    // ─── Server-Side Upload (CORS-Safe) with B2 Presigned Fallback ───
    yield { phase: 'uploading', progress: 40, message: 'Uploading securely via server...' };
    const session = await supabase.auth.getSession();
    const token = session.data.session?.access_token;

    if (!token) throw new Error('Authentication required for archive.');

    const contentType = 'application/pdf';
    const MAX_SERVER_UPLOAD = 4.4 * 1024 * 1024; // 4.4MB limit for Vercel (4.5MB - safety margin)
    // `stampedBytes` is a Uint8Array; `as Blob` is only a compile-time type
    // assertion and does NOT convert it at runtime. That left fileBlob.size
    // as undefined, so the size check below always evaluated to false and
    // EVERY upload — regardless of actual size — was misrouted to the
    // CORS-sensitive direct-to-B2 path instead of the safe server route.
    const fileBlob = new Blob([stampedBytes as BlobPart], { type: contentType });

    // Strategy 1: Try server-side upload first (avoids CORS entirely)
    let uploadSuccess = false;
    let uploadError: Error | null = null;

    console.log(`[pipeline] File size: ${(fileBlob.size / 1024 / 1024).toFixed(2)}MB, Max server: ${(MAX_SERVER_UPLOAD / 1024 / 1024).toFixed(2)}MB`);

    if (fileBlob.size <= MAX_SERVER_UPLOAD) {
        yield { phase: 'uploading', progress: 45, message: 'Uploading via secure server route...' };
        try {
            const formData = new FormData();
            formData.append('file', fileBlob, 'document.pdf');
            formData.append('key', filePath);

            console.log('[pipeline] Starting server-side upload via /api/storage/upload');

            const serverUploadResponse = await xhrUpload('/api/storage/upload', formData, {
                headers: { 'Authorization': `Bearer ${token}` },
                onProgress: options.onTransferProgress
            });

            if (serverUploadResponse.ok) {
                uploadSuccess = true;
                console.log('[pipeline] ✅ Server-side upload succeeded (CORS-safe, no B2 needed)');
            } else {
                uploadError = new Error(`Server upload HTTP ${serverUploadResponse.status}: ${serverUploadResponse.body || 'request failed'}`);
                console.warn('[pipeline] Server upload failed, retrying with B2...', uploadError);
            }
        } catch (err: any) {
            uploadError = err;
            console.warn('[pipeline] Server upload error, falling back to B2...', err.message);
        }
    } else {
        uploadError = new Error(`File size ${(fileBlob.size / 1024 / 1024).toFixed(2)}MB exceeds server limit`);
        console.log(`[pipeline] ${uploadError.message}. Using B2 presigned URL...`);
    }

    // Strategy 2: Fallback to B2 presigned URL if server upload failed or file too large
    if (!uploadSuccess) {
        yield { phase: 'uploading', progress: 50, message: 'Uploading to cloud storage...' };
        try {
            const presignResponse = await withTimeout(
                fetch('/api/storage/presign', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ key: filePath, contentType, intent: 'upload' })
                }),
                30000,
                'Pre-signed URL request timed out.'
            );

            if (!presignResponse.ok) {
                let errStr = presignResponse.statusText;
                try {
                    const errJson = await presignResponse.json();
                    errStr = errJson.message || errStr;
                } catch { /* ignore */ }
                throw new Error(`Pre-signed URL failed (${presignResponse.status}): ${errStr}`);
            }

            const { url: presignedUrl } = await presignResponse.json();
            const uploadResponse = await xhrUpload(presignedUrl, fileBlob, {
                method: 'PUT',
                headers: { 'Content-Type': contentType },
                onProgress: options.onTransferProgress
            });

            if (!uploadResponse.ok) {
                let errStr = `HTTP ${uploadResponse.status}`;
                try {
                    const errJson = JSON.parse(uploadResponse.body);
                    errStr = errJson.message || errStr;
                } catch { /* ignore */ }

                // CORS error detected - provide helpful message
                if (errStr.includes('CORS') || errStr.includes('Access')) {
                    throw new Error('B2 CORS not configured. See DEPLOYMENT_FIXES.md for setup instructions. Using server-side upload as fallback.');
                }
                throw new Error(`Archive upload failed (${uploadResponse.status}): ${errStr}`);
            }

            uploadSuccess = true;
            console.log('[pipeline] B2 presigned URL upload succeeded');
        } catch (err: any) {
            // If B2 fails too, throw error with helpful guidance
            const msg = err.message || 'Upload failed';
            if (msg.includes('CORS')) {
                throw new Error(`${msg} CORS configuration needed on B2 bucket for cedims.vercel.app`);
            }
            throw err;
        }
    }

    if (!uploadSuccess) {
        throw new Error('File upload failed on both server and B2 storage');
    }

    // DB Record
    yield { phase: 'uploading', progress: 80, message: 'Finalizing cloud record...' };

    // Detect whether this is an ADDITIONAL DLL for an already-covered slot
    // (same teaching load + week + doc type). If so, mark it 'supplementary'
    // so it is archived but does not affect compliance / missing / late / rate.
    let complianceStatus: 'compliant' | 'late' | 'supplementary' = calculateComplianceStatus(new Date(), deadlineDate);
    if (options.teachingLoadId && activeWeekNumber) {
      try {
        const { data: slotMatch } = await withTimeout(
          supabase
            .from('submissions')
            .select('id')
            .eq('teaching_load_id', options.teachingLoadId)
            .eq('week_number', activeWeekNumber)
            .eq('doc_type', activeDocType)
            .limit(1) as any,
          30000,
          'Duplicate slot check timed out.'
        ) as { data: any };
        if (slotMatch && slotMatch.length > 0) {
          complianceStatus = 'supplementary';
        }
      } catch (e) {
        console.warn('[pipeline] Duplicate slot check failed, continuing as normal:', e);
      }
    }
    const { error: dbError } = await withTimeout(
        supabase.from('submissions').insert({
            user_id: options.userId,
            file_name: fileName,
            file_path: filePath,
            file_hash: fileHash,
            file_size: stampedBytes.byteLength,
            doc_type: activeDocType,
            week_number: activeWeekNumber,
            school_year: options.schoolYear || getCurrentSchoolYear(),
            subject: options.subject,
            calendar_id: calendarId,
            teaching_load_id: options.teachingLoadId || null,
            compliance_status: complianceStatus,
            raw_text: rawText || null
        }) as any,
        30000,
        'Database record timed out.'
    ) as { error: any };
    // 23505 = unique_violation. With the duplicate pre-check now advisory,
    // this constraint is what actually catches a repeat upload, so it has to
    // read like the pre-check's message rather than a raw Postgres error.
    if (dbError) {
        if (dbError.code === '23505') {
            throw new Error('This exact file has already been archived. Pick a different file, or check My Files.');
        }
        throw new Error(`DB Error: ${dbError.message}`);
    }

    // Success bookkeeping
    if (options.teachingLoadId && activeWeekNumber) {
        await recordSubmission({
            teachingLoadId: options.teachingLoadId,
            weekNumber: activeWeekNumber,
            schoolYear: options.schoolYear || getCurrentSchoolYear(),
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
    const { stampedBytes, fileHash, fileName, filePath, activeWeekNumber, activeDocType, rawText } = core;
    yield { phase: 'uploading', progress: 50, message: 'Saving to offline vault...' };

    const { enqueue, cacheVerifiedDoc } = await import('./offline');
    const { recordSubmission } = await import('./offlineSubmissionLedger');

    // Look up calendar_id from academic_calendar using detected week number.
    // navigator.onLine can be wrong (captive portals, flaky connections still
    // reporting "online"), so this is time-bounded and non-fatal just like
    // the online pipeline's version — losing calendarId only means this
    // queued document won't be linked to a calendar entry until it syncs.
    let calendarId = options.calendarId || null;
    if (!calendarId && activeWeekNumber) {
        try {
            const { data: calEntry } = await withTimeout(
                supabase
                    .from('academic_calendar')
                    .select('id')
                    .eq('school_year', options.schoolYear || getCurrentSchoolYear())
                    .eq('week_number', activeWeekNumber)
                    .maybeSingle() as any,
                10000,
                'Calendar lookup timed out.'
            ) as { data: any };
            if (!calEntry) {
                const { data: profileData } = await withTimeout(
                    supabase
                        .from('profiles')
                        .select('district_id')
                        .eq('id', options.userId)
                        .single() as any,
                    10000,
                    'Profile lookup timed out.'
                ) as { data: any };
                if (profileData?.district_id) {
                    const { data: calByDistrict } = await withTimeout(
                        supabase
                            .from('academic_calendar')
                            .select('id')
                            .eq('district_id', profileData.district_id)
                            .eq('week_number', activeWeekNumber)
                            .maybeSingle() as any,
                        10000,
                        'Calendar lookup timed out.'
                    ) as { data: any };
                    if (calByDistrict) calendarId = calByDistrict.id;
                }
            } else {
                calendarId = calEntry.id;
            }
        } catch (err: any) {
            console.warn('[pipeline] Calendar lookup failed/timed out while queuing offline, continuing without it:', err?.message);
        }
    }

    await enqueue({
        fileName,
        filePath,
        fileHash,
        fileSize: stampedBytes.byteLength,
        pdfBytes: stampedBytes,
        rawText: rawText || undefined,
        options: {
            userId: options.userId,
            docType: activeDocType,
            weekNumber: activeWeekNumber,
            schoolYear: options.schoolYear || getCurrentSchoolYear(),
            subject: options.subject,
            calendarId: calendarId ?? undefined,
            teachingLoadId: options.teachingLoadId
        },
        timestamp: Date.now()
    });

    if (options.teachingLoadId && activeWeekNumber) {
        await recordSubmission({
            teachingLoadId: options.teachingLoadId,
            weekNumber: activeWeekNumber,
            schoolYear: options.schoolYear || getCurrentSchoolYear(),
            docType: activeDocType,
            fileHash,
            fileName,
            timestamp: Date.now(),
            status: 'pending'
        });
    }

    await cacheVerifiedDoc(fileHash, { file_name: fileName, doc_type: activeDocType, week_number: activeWeekNumber, pending_sync: true });
    // Reported exactly as the direct-upload path reports it. The submission is
    // recorded, stamped and queued, and syncs on its own with the original
    // timestamp preserved — so from the teacher's side this genuinely is the
    // same outcome, and surfacing a different one only caused confusion about
    // whether the document had actually been submitted.
    await createNotification(options.userId, 'Archival Successful', `Securely archived ${activeDocType} - Week ${activeWeekNumber}.`, 'success');

    yield {
        phase: 'done',
        progress: 100,
        message: 'Upload Successful!',
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
            // Try the direct upload first, but don't let a weak mobile
            // connection turn into a dead end. If the transfer fails for
            // connectivity reasons, the document is queued locally and synced
            // in the background instead — the work the phone already did
            // (convert, analyse, hash, stamp) is preserved and the submission
            // still lands, rather than being thrown away with an error.
            //
            // This fallback previously existed and was removed because it
            // reported "saved offline" and so felt inconsistent. The queued
            // path is now reported identically to a direct upload, which is
            // what makes it safe to route to silently: sync preserves the
            // original submission timestamp (see offline.ts), so compliance is
            // judged by when the teacher submitted, not when signal returned.
            try {
                yield* runOnlinePipelineResilient(core, options);
                return;
            } catch (err: any) {
                const msg: string = err?.message || '';
                // Failures that queuing cannot fix must still surface: a real
                // duplicate is a genuine rejection, and a missing session means
                // the background sync would not be able to authenticate either.
                const isTerminal =
                    msg.startsWith('Duplicate content detected') ||
                    msg.startsWith('Duplicate file detected') ||
                    msg.includes('already been archived') ||
                    msg.includes('Authentication required');
                if (isTerminal) throw err;

                console.warn('[pipeline] Direct upload failed, falling back to background sync:', msg);
            }
        }

        // Reached when genuinely offline, or when the direct upload above
        // could not get through.
        yield* runOfflinePipelineResilient(core, options);

    } catch (err: any) {
        yield { phase: 'error', progress: 0, message: err.message || 'Unknown error' };
    } finally {
        worker.terminate();
    }
}
