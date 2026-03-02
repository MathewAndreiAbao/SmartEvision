/**
 * Offline Sync Queue — IndexedDB via idb-keyval
 * Persists pending uploads in the browser.
 * Auto-resumes when connectivity is restored.
 */

import { get, set, del, keys } from 'idb-keyval';
import { writable } from 'svelte/store';
import { supabase } from './supabase';
import { env } from '$env/dynamic/public';

export const pendingSyncCount = writable<number>(0);

const CACHE_PREFIX_DOCS = 'cached_docs_';
const CACHE_PREFIX_HISTORY = 'cached_history_';
const CACHE_PREFIX_METADATA = 'cached_metadata_';

/**
 * Cache a verified document hash locally for offline verification.
 * Part of Phase 4.7 Smart Caching.
 */
export async function cacheVerifiedDoc(hash: string, metadata: any) {
    await set(`${CACHE_PREFIX_DOCS}${hash}`, metadata);
}

/**
 * Lookup a document hash in the local offline cache.
 */
export async function lookupOfflineDoc(hash: string) {
    return await get(`${CACHE_PREFIX_DOCS}${hash}`);
}

/**
 * Cache current dashboard data for offline viewing.
 */
export async function cacheDashboardData(userId: string, data: any) {
    await set(`${CACHE_PREFIX_HISTORY}${userId}`, {
        data,
        timestamp: Date.now()
    });
}

/**
 * Retrieve cached dashboard data.
 */
export async function getCachedDashboardData(userId: string) {
    return await get(`${CACHE_PREFIX_HISTORY}${userId}`);
}

/**
 * Generic metadata caching for offline fallbacks.
 */
export async function cacheMetadata(key: string, data: any) {
    await set(`${CACHE_PREFIX_METADATA}${key}`, {
        data,
        timestamp: Date.now()
    });
}

/**
 * Retrieve generic cached metadata.
 */
export async function getCachedMetadata(key: string) {
    return await get(`${CACHE_PREFIX_METADATA}${key}`);
}

/**
 * WBS 20.4 — Pre-fetch essential metadata for offline upload manual selection.
 * Fetches teaching loads and academic calendar, caching them in IndexedDB.
 */
export async function prefetchOfflineMetadata(userId: string, districtId?: string): Promise<void> {
    if (!navigator.onLine) return;

    try {
        console.log('[offline] Pre-fetching metadata for offline upload...');

        // 1. Fetch Teaching Loads
        const { data: loads, error: loadsErr } = await supabase
            .from('teaching_loads')
            .select('id, subject, grade_level')
            .eq('user_id', userId)
            .eq('is_active', true);

        if (!loadsErr && loads) {
            await cacheMetadata(`teaching_loads_${userId}`, loads);
            console.log(`[offline] Cached ${loads.length} teaching loads`);
        }

        // 2. Fetch Academic Calendar (Upcoming weeks)
        if (districtId) {
            const { data: calendar, error: calErr } = await supabase
                .from('academic_calendar')
                .select('week_number, deadline_date, description')
                .eq('district_id', districtId)
                .gte('deadline_date', new Date().toISOString())
                .order('deadline_date', { ascending: true })
                .limit(10);

            if (!calErr && calendar) {
                await cacheMetadata(`calendar_${districtId}`, calendar);
                console.log(`[offline] Cached ${calendar.length} calendar events`);
            }
        }
    } catch (err) {
        console.warn('[offline] prefetchOfflineMetadata error:', err);
    }
}

/**
 * WBS 20.3 — Pre-cache ALL verified document hashes for full offline verification.
 * 
 * Fetches all submission hashes from Supabase and stores them in IndexedDB.
 * This allows the verify page to work offline for ANY document,
 * not just previously-verified ones.
 * 
 * Should be called on login and periodically when online.
 */
export async function preloadVerificationHashes(): Promise<number> {
    try {
        // Check if we're online
        if (!navigator.onLine) return 0;

        const { data, error } = await supabase
            .from('submissions')
            .select(`
                file_hash, file_name, doc_type, compliance_status, created_at, 
                file_size, week_number, subject, school_year,
                profiles:user_id ( full_name, schools:school_id ( name ) ),
                teaching_loads ( subject, grade_level )
            `)
            .not('file_hash', 'like', 'missing_%')
            .order('created_at', { ascending: false })
            .limit(500);

        if (error || !data) return 0;

        let cached = 0;
        for (const item of data) {
            const profileData = item.profiles as any;
            const teachingLoadData = item.teaching_loads as any;

            const metadata = {
                file_name: item.file_name,
                doc_type: item.doc_type,
                compliance_status: item.compliance_status,
                created_at: item.created_at,
                file_size: item.file_size,
                week_number: item.week_number,
                subject: item.subject,
                school_year: item.school_year,
                teacher_name: profileData?.full_name || null,
                school_name: profileData?.schools?.name || null,
                teaching_load_subject: teachingLoadData?.subject || null,
                teaching_load_grade: teachingLoadData?.grade_level || null,
            };

            await cacheVerifiedDoc(item.file_hash, metadata);
            cached++;
        }

        console.log(`[offline] Pre-cached ${cached} document hashes for offline verification`);
        return cached;
    } catch (err) {
        console.warn('[offline] preloadVerificationHashes error:', err);
        return 0;
    }
}

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
        teachingLoadId?: string;
    };
    timestamp: number;
}

export async function enqueue(item: QueueItem): Promise<void> {
    const key = `${QUEUE_PREFIX}${item.timestamp}_${item.fileHash.slice(0, 8)}`;
    await set(key, item);
    await updatePendingCount();

    // Auto-sync if online
    if (typeof navigator !== 'undefined' && navigator.onLine) {
        processQueue();
    }
}

export async function getQueueSize(): Promise<number> {
    const allKeys = await keys();
    return allKeys.filter((k: any) => String(k).startsWith(QUEUE_PREFIX)).length;
}

export async function updatePendingCount(): Promise<void> {
    const size = await getQueueSize();
    pendingSyncCount.set(size);
}

export async function getQueueItems(): Promise<QueueItem[]> {
    const allKeys = await keys();
    const queueKeys = allKeys.filter((k: any) => String(k).startsWith(QUEUE_PREFIX));
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
    const queueKeys = allKeys.filter((k: any) => String(k).startsWith(QUEUE_PREFIX));

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

                // 1. Upload to Supabase Storage via DIRECT REST API
                // The supabase.storage.upload() client hangs on mobile devices.
                // Bypassing it with a direct fetch + FormData for maximum compatibility.
                const { data: sessionData } = await supabase.auth.getSession();
                const accessToken = sessionData?.session?.access_token;
                if (!accessToken) throw new Error('Not authenticated for background sync');

                const storageUrl = `${env.PUBLIC_SUPABASE_URL}/storage/v1/object/submissions/${item.filePath}`;

                // Create a file object from the Uint8Array
                const uploadFile = new File([item.pdfBytes as any], item.fileName, { type: 'application/pdf' });

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
                    throw new Error(`Storage upload failed (${uploadResponse.status}): ${errBody}`);
                }

                // 2. Fetch deadline if possible for compliance calculation
                let deadlineDate: Date | undefined;
                if (item.options.calendarId) {
                    const { data } = await supabase.from('academic_calendar').select('deadline_date').eq('id', item.options.calendarId).single();
                    if (data?.deadline_date) deadlineDate = new Date(data.deadline_date);
                } else if (item.options.weekNumber) {
                    const { data: profileData } = await supabase.from('profiles').select('district_id').eq('id', item.options.userId).single();
                    if (profileData?.district_id) {
                        const { data: calData } = await supabase
                            .from('academic_calendar')
                            .select('deadline_date')
                            .eq('district_id', profileData.district_id)
                            .eq('week_number', item.options.weekNumber)
                            .maybeSingle();
                        if (calData?.deadline_date) deadlineDate = new Date(calData.deadline_date);
                    }
                }

                // 3. Insert database record
                const complianceStatus = calculateComplianceStatus(new Date(), deadlineDate);

                const { error: dbError } = await supabase.from('submissions').insert({
                    user_id: item.options.userId,
                    file_name: item.fileName,
                    file_path: item.filePath,
                    file_hash: item.fileHash,
                    file_size: item.fileSize,
                    doc_type: item.options.docType || 'Unknown',
                    week_number: item.options.weekNumber,
                    school_year: item.options.schoolYear || '2025-2026',
                    subject: item.options.subject,
                    calendar_id: item.options.calendarId || null,
                    teaching_load_id: item.options.teachingLoadId || null,
                    compliance_status: complianceStatus
                });

                if (dbError) {
                    // If DB insert fails but file uploaded, we might want to retry DB insert?
                    // For now, treat as failure to be safe and retry whole thing later (overwriting file is fine or we handle conflict)
                    console.error('[pipeline] DB insert error:', dbError);
                    throw new Error(`DB Insert failed: ${dbError.message}`);
                }

                // Success! Remove from queue
                await del(key);
                await updatePendingCount();
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

/**
 * Shared compliance logic (WBS 14.5)
 */
export function calculateComplianceStatus(
    submissionDate: Date,
    deadlineDate?: Date,
    windowDays: number = 5
): 'compliant' | 'late' | 'non-compliant' {
    const now = submissionDate;

    if (deadlineDate) {
        const deadline = new Date(deadlineDate);
        deadline.setHours(23, 59, 59, 999);

        if (now <= deadline) return 'compliant';

        const lateDeadline = new Date(deadline);
        lateDeadline.setDate(lateDeadline.getDate() + (windowDays || 5));

        if (now <= lateDeadline) return 'late';

        return 'non-compliant';
    }

    // Fallback if no supervisor deadline is set:
    const dayOfWeek = now.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
    if (dayOfWeek === 1 || dayOfWeek === 0) return 'compliant';
    if (dayOfWeek === 2) return 'late';
    return 'non-compliant';
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
    updatePendingCount();
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

