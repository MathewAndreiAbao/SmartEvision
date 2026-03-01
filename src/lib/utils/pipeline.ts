/**
 * Upload Pipeline Orchestrator
 * Chains: Transcode → Compress → Hash → QR-Stamp → Upload/Queue
 * Yields status events for the multi-phase UI indicator.
 */

import { transcodeToPdf } from './transcode';
import { compressFile } from './compress';
import { hashFromBuffer } from './hash';
import { stampQrCode } from './qr-stamp';
import { supabase } from './supabase';
import { enqueue } from './offline';

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

export async function* runPipeline(
    file: File,
    options: PipelineOptions
): AsyncGenerator<PipelineEvent> {
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

        // Phase 3: Compress
        yield { phase: 'compressing', progress: 0, message: 'Compressing file...' };
        const compressed = await compressFile(pdfBytes);
        yield { phase: 'compressing', progress: 100, message: `Compressed to ${(compressed.byteLength / 1024).toFixed(0)}KB` };

        // Phase 3: Hash
        yield { phase: 'hashing', progress: 0, message: 'Computing SHA-256 hash...' };
        const fileHash = await hashFromBuffer(compressed.buffer as ArrayBuffer);
        yield { phase: 'hashing', progress: 100, message: `Hash: ${fileHash.slice(0, 12)}...` };

        // Check for duplicates (ONLY if online)
        if (navigator.onLine) {
            const { data: existing } = await supabase
                .from('submissions')
                .select('id')
                .eq('file_hash', fileHash)
                .maybeSingle();

            if (existing) {
                throw new Error('Duplicate file detected. This document has already been archived.');
            }
        }

        // Phase 4: QR Stamp
        yield { phase: 'stamping', progress: 0, message: 'Embedding verification QR code...' };
        const stamped = await stampQrCode(compressed, fileHash);
        yield { phase: 'stamping', progress: 100, message: 'QR code stamped' };

        // Phase 5: Upload
        yield { phase: 'uploading', progress: 0, message: 'Uploading to secure storage...' };

        const isOnline = navigator.onLine;
        const fileName = file.name.replace(/\.\w+$/, '.pdf');
        const filePath = `${options.userId}/${Date.now()}_${fileName}`;

        if (isOnline) {
            // Upload to Supabase Storage
            const { error: uploadError } = await supabase.storage
                .from('submissions')
                .upload(filePath, stamped, {
                    contentType: 'application/pdf',
                    upsert: false
                });

            if (uploadError) {
                throw new Error(`Upload failed: ${uploadError.message}`);
            }

            // Fetch deadline if possible
            let deadlineDate: Date | undefined;
            if (options.calendarId) {
                const { data } = await supabase.from('academic_calendar').select('deadline_date').eq('id', options.calendarId).single();
                if (data?.deadline_date) deadlineDate = new Date(data.deadline_date);
            } else if (options.weekNumber) {
                // Try to find deadline for this week and user's district
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

            // Insert submission record with matching database column values
            const complianceStatus = calculateComplianceStatus(
                new Date(),
                deadlineDate,
                options.submissionWindowDays
            );
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

            if (dbError) {
                console.error('[pipeline] DB insert error:', dbError);
                throw new Error(`Archiving failed: ${dbError.message}`);
            }

            yield {
                phase: 'done',
                progress: 100,
                message: 'Upload complete!',
                result: { fileHash, filePath, fileSize: stamped.byteLength, fileName }
            };
        } else {
            // Offline: queue for later
            await enqueue({
                fileName,
                filePath,
                fileHash,
                fileSize: stamped.byteLength,
                pdfBytes: stamped,
                options,
                timestamp: Date.now()
            });

            yield {
                phase: 'done',
                progress: 100,
                message: 'Queued for upload — will sync when online',
                result: { fileHash, filePath, fileSize: stamped.byteLength, fileName }
            };
        }
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        yield { phase: 'error', progress: 0, message, error: message };
    }
}
