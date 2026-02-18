/**
 * Offline Sync Queue — IndexedDB via idb-keyval
 * Persists pending uploads in the browser.
 * Auto-resumes when connectivity is restored.
 */

import { get, set, del, keys } from 'idb-keyval';
import { supabase } from './supabase';

const QUEUE_PREFIX = 'sync_queue_';

export interface QueueItem {
    fileName: string;
    filePath: string;
    fileHash: string;
    fileSize: number;
    pdfBytes: Uint8Array;
    options: {
        userId: string;
        docType?: string;
        weekNumber?: number;
        schoolYear?: string;
        subject?: string;
        calendarId?: string;
    };
    timestamp: number;
}

export async function enqueue(item: QueueItem): Promise<void> {
    const key = `${QUEUE_PREFIX}${item.timestamp}_${item.fileHash.slice(0, 8)}`;
    await set(key, item);
}

export async function getQueueSize(): Promise<number> {
    const allKeys = await keys();
    return allKeys.filter((k) => String(k).startsWith(QUEUE_PREFIX)).length;
}

export async function getQueueItems(): Promise<QueueItem[]> {
    const allKeys = await keys();
    const queueKeys = allKeys.filter((k) => String(k).startsWith(QUEUE_PREFIX));
    const items: QueueItem[] = [];

    for (const key of queueKeys) {
        const item = await get<QueueItem>(key);
        if (item) items.push(item);
    }

    return items.sort((a, b) => a.timestamp - b.timestamp);
}

import { addToast } from '$lib/stores/toast';

// ... (previous imports)

let isSyncing = false;

// ... (getQueueSize, getQueueItems remain same)

// Robust connectivity check
// Robust connectivity check with timeout
async function checkConnection(): Promise<boolean> {
    if (typeof navigator !== 'undefined' && !navigator.onLine) return false;

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout

        // Try to reach the app itself (HEAD request is lightweight)
        const res = await fetch(window.location.origin, {
            method: 'HEAD',
            cache: 'no-store',
            signal: controller.signal
        });

        clearTimeout(timeoutId);
        return res.ok || res.status === 405; // 405 is fine (method not allowed), just means server responded
    } catch (e) {
        console.warn('[offline] Connection check failed:', e);
        return false;
    }
}

export async function processQueue(force = false): Promise<{ success: number; failed: number }> {
    // If not forcing, check connection status first
    const isOnline = force ? true : await checkConnection();

    if (!isOnline) {
        // console.log('[offline] processQueue skipped: Offline');
        return { success: 0, failed: 0 };
    }

    if (isSyncing && !force) {
        console.log('[offline] processQueue skipped: Already syncing');
        return { success: 0, failed: 0 };
    }

    const allKeys = await keys();
    const queueKeys = allKeys.filter((k) => String(k).startsWith(QUEUE_PREFIX));

    if (queueKeys.length === 0) {
        // console.log('[offline] Queue is empty.');
        return { success: 0, failed: 0 };
    }

    console.log(`[offline] Found ${queueKeys.length} items to sync...`);
    isSyncing = true;
    let success = 0;
    let failed = 0;

    // Notify start
    addToast('info', `Syncing ${queueKeys.length} offline file(s)...`);

    try {
        for (const key of queueKeys) {
            // Re-check connection before each item to be safe
            if (!force && !(await checkConnection())) {
                console.log('[offline] Connection lost during sync. Pausing...');
                break;
            }

            const item = await get<QueueItem>(key);

            // Handle corrupted/missing data
            if (!item) {
                console.warn(`[offline] Found ghost key ${key}, removing...`);
                await del(key);
                continue;
            }

            try {
                // Check for duplicates before upload
                const { data: existing } = await supabase
                    .from('submissions')
                    .select('id')
                    .eq('file_hash', item.fileHash)
                    .maybeSingle();

                if (existing) {
                    console.warn(`[offline] Skipping duplicate file: ${item.fileName}`);
                    await del(key); // Remove from queue
                    addToast('warning', `Skipped duplicate: ${item.fileName}`);
                    continue;
                }

                // Upload to Supabase Storage
                const { error: uploadError } = await supabase.storage
                    .from('submissions')
                    .upload(item.filePath, item.pdfBytes, {
                        contentType: 'application/pdf',
                        upsert: false
                    });

                if (uploadError) {
                    throw new Error(`Upload failed: ${uploadError.message}`);
                }

                // Insert submission record
                const { error: dbError } = await supabase.from('submissions').insert({
                    user_id: item.options.userId,
                    file_name: item.fileName,
                    file_path: item.filePath,
                    file_hash: item.fileHash,
                    file_size: item.fileSize,
                    doc_type: item.options.docType || 'Unknown',
                    week_number: item.options.weekNumber,
                    school_year: item.options.schoolYear,
                    subject: item.options.subject,
                    calendar_id: item.options.calendarId,
                    status: 'Compliant'
                });

                if (dbError) {
                    // If DB insert fails but file uploaded, we might want to retry DB insert?
                    // For now, treat as failure to be safe and retry whole thing later (overwriting file is fine or we handle conflict)
                    console.error('[pipeline] DB insert error:', dbError);
                    throw new Error(`DB Insert failed: ${dbError.message}`);
                }

                // Success! Remove from queue
                await del(key);
                success++;
                console.log(`[offline] Successfully synced: ${item.fileName}`);

            } catch (err: any) {
                console.error(`[offline] Failed to sync ${item.fileName}:`, err);
                failed++;
            }
        }
    } finally {
        isSyncing = false;
    }

    if (success > 0) {
        addToast('success', `Synced ${success} file(s) successfully!`);
    }
    if (failed > 0) {
        addToast('error', `Failed to sync ${failed} file(s). Will retry automatically.`);
    }

    return { success, failed };
}

// Auto-resume when online + Periodic Check
export function initOfflineSync(): void {
    if (typeof window === 'undefined') return;

    // 1. Event Listener for Network Status
    window.addEventListener('online', () => {
        console.log('[offline] Network "online" event detected.');
        addToast('info', 'Connection restored. Attempting verification...');

        // Wait a moment for connection to stabilize
        setTimeout(() => {
            processQueue();
        }, 3000);
    });

    // 2. Periodic "Heartbeat" (every 30s)
    setInterval(() => {
        if (navigator.onLine) {
            processQueue();
        }
    }, 30000);

    // 3. Initial check on load
    if (navigator.onLine) {
        setTimeout(() => {
            console.log('[offline] Initial load check...');
            processQueue();
        }, 5000);
    }

    // 4. Aggressive Sync Triggers (Visibility & Focus)
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible' && navigator.onLine) {
            processQueue();
        }
    });

    window.addEventListener('focus', () => {
        if (navigator.onLine) {
            processQueue();
        }
    });
}

