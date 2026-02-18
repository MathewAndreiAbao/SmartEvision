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

export type PipelinePhase = 'transcoding' | 'compressing' | 'hashing' | 'stamping' | 'uploading' | 'done' | 'error';

export interface PipelineEvent {
    phase: PipelinePhase;
    progress: number; // 0-100
    message: string;
    result?: PipelineResult;
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
}

export async function* runPipeline(
    file: File,
    options: PipelineOptions
): AsyncGenerator<PipelineEvent> {
    try {
        // Phase 1: Transcode
        yield { phase: 'transcoding', progress: 0, message: 'Converting document to PDF...' };
        const pdfBytes = await transcodeToPdf(file);
        yield { phase: 'transcoding', progress: 100, message: 'Document converted' };

        // Phase 2: Compress
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

            // Insert submission record
            const { error: dbError } = await supabase.from('submissions').insert({
                user_id: options.userId,
                file_name: fileName,
                file_path: filePath,
                file_hash: fileHash,
                file_size: stamped.byteLength,
                doc_type: options.docType || 'Unknown',
                week_number: options.weekNumber,
                school_year: options.schoolYear,
                subject: options.subject,
                calendar_id: options.calendarId,
                status: 'Compliant'
            });

            if (dbError) {
                console.error('[pipeline] DB insert error:', dbError);
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
