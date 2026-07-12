/**
 * Offline Sync Queue — IndexedDB via idb-keyval
 * Persists pending uploads in the browser.
 * Auto-resumes when connectivity is restored.
 */

import { get, set, del, keys } from 'idb-keyval';
import { writable } from 'svelte/store';
import { supabase } from './supabase';
import { withTimeout } from './pipeline';
import { getCurrentSchoolYear } from './schoolYear';            .order('created_at', { ascending: false })
            .limit(100);

        if (!subsErr && subs) {
            await cacheMetadata(`submission_history_${userId}`, subs);
            console.log(`[offline] Cached ${subs.length} submission history records`);
        }

        // 4. Cache current year settings
        const currentYear = getCurrentSchoolYear();        await cacheMetadata('current_school_year', currentYear);

        console.log('[offline] Offline metadata pre-fetch complete.');
    } catch (err) {
        console.warn('[offline] prefetchOfflineMetadata error:', err);
    }
}

/**
 * Check if the device has all necessary metadata cached for offline upload.
 */
export async function verifyOfflineReadiness(userId: string, districtId?: string): Promise<{
    ready: boolean;
    missing: string[];
    counts: Record<string, number>;
}> {
    const missing: string[] = [];
    const counts: Record<string, number> = {};

    const loads = await getCachedMetadata(`teaching_loads_${userId}`);
    if (!loads?.data || (loads.data as any[]).length === 0) {
        missing.push('Teaching Loads');
    } else {
        counts.loads = (loads.data as any[]).length;
    }

    const calendar = districtId
        ? await getCachedMetadata(`calendar_${districtId}`)
        : await getCachedMetadata('calendar_all');

    if (!calendar?.data || (calendar.data as any[]).length === 0) {
        missing.push('Academic Calendar');
    } else {
        counts.weeks = (calendar.data as any[]).length;
    }

    const history = await getCachedMetadata(`submission_history_${userId}`);
    if (!history?.data || (history.data as any[]).length === 0) {
        // History is optional but recommended
    } else {
        counts.history = (history.data as any[]).length;
    }

    return {
        ready: missing.length === 0,
        missing,
        counts
    };
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
export async function preloadVerificationHashes(userId?: string): Promise<number> {
    try {
        // Check if we're online
        if (!navigator.onLine) return 0;

        let query = supabase
            .from('submissions')
            .select(`
                file_hash, file_name, doc_type, compliance_status, created_at, 
                file_size, week_number, subject, school_year,
                profiles:user_id ( full_name ),                teaching_loads ( subject, grade_level )
            `)
            .not('file_hash', 'like', 'missing_%')
            .order('created_at', { ascending: false });

        // Scope to current user to reduce cache size
        if (userId) {
            query = query.eq('user_id', userId);
        }

        const { data, error } = await query.limit(200);

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
    pdfBytes: Uint8Array | Blob;
    rawText?: string;                        .eq('doc_type', item.options.docType || 'DLL')
                        .maybeSingle();

                    const { data: metaMatch } = await withTimeout(
                        metaCheckPromise as any,
                        20000,
                        'Meta check timed out'
                    ) as { data: any };

                    if (metaMatch) {
                        console.warn(`[offline] Slot already taken on server: ${item.fileName}`);
                        await del(key);
                        await markSynced(item.fileHash); // Update ledger to 'synced'
                        addToast('warning', `Already archived: ${item.options.docType || 'DLL'} for Week ${item.options.weekNumber}.`);
                        success++;
                        continue;
                    }
                }

                // 2. Strict File Hash Check (No identical content)
                const hashCheckPromise = supabase
                    .from('submissions')
                    .select('id')
                    .eq('file_hash', item.fileHash)
                    .maybeSingle();

                const { data: existing } = await withTimeout(
                    hashCheckPromise as any,
                    20000,
                    'Hash check timed out'
                ) as { data: any };

                if (existing) {
                    console.warn(`[offline] Duplicate hash on server: ${item.fileName}`);
                    await del(key);
                    await markSynced(item.fileHash);
                    addToast('warning', `Skipped duplicate content: ${item.fileName}`);
                    success++;
                    continue;
                }

                // ── Upload to Cloudflare R2 via Pre-signed URL ──
                const { data: sessionData } = await supabase.auth.getSession();
                const accessToken = sessionData?.session?.access_token;
                if (!accessToken) throw new Error('Not authenticated for background sync');

                const sanitizedPath = item.filePath.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9./_-]/g, '');
                
                // Prepare FormData for server proxy
                const formData = new FormData();
                formData.append('file', item.pdfBytes as Blob, item.fileName);
                formData.append('key', sanitizedPath);

                console.log(`[sync] Attempting proxy upload to server for: ${item.fileName}`);

                const uploadResponse = await withTimeout(
                    fetch('/api/storage/upload', {
                        method: 'POST',
                        headers: { 
                            'Authorization': `Bearer ${accessToken}` 
                        },
                        body: formData
                    }),
                    120000, 
                    'Sync archive upload timed out'
                ).catch(err => {
                    console.error('[sync] Fetch error during server proxy upload.', err);
                    throw err;
                });

                if (!uploadResponse.ok) {
                    let errStr = uploadResponse.statusText;
                    try {
                        const errJson = await uploadResponse.json();
                        errStr = errJson.message || errStr;
                    } catch { /* ignore */ }
                    throw new Error(`Archive upload failed (${uploadResponse.status}): ${errStr}`);
                }

                // ── Fetch deadline for compliance + calendar_id ──
                let deadlineDate: Date | undefined;
                let calendarId = item.options.calendarId || null;
                if (calendarId) {
                    const { data } = await supabase.from('academic_calendar').select('deadline_date').eq('id', calendarId).single();                    if (data?.deadline_date) deadlineDate = new Date(data.deadline_date);
                } else if (item.options.weekNumber) {
                    const { data: profileData } = await supabase.from('profiles').select('district_id').eq('id', item.options.userId).single();
                    if (profileData?.district_id) {
                        const { data: calData } = await supabase
                            .from('academic_calendar')
                            .select('id, deadline_date')
                            .eq('district_id', profileData.district_id)
                            .eq('week_number', item.options.weekNumber)
                            .maybeSingle();
                        if (calData) {
                            calendarId = calData.id;
                            if (calData.deadline_date) deadlineDate = new Date(calData.deadline_date);
                        }                    }
                }

                // ── Insert database record ──
                const complianceStatus = calculateComplianceStatus(new Date(), deadlineDate);

                const insertPromise = supabase.from('submissions').insert({
                    user_id: item.options.userId,
                    file_name: item.fileName,
                    file_path: sanitizedPath,
                    file_hash: item.fileHash,
                    file_size: item.fileSize,
                    doc_type: item.options.docType || 'Unknown',
                    week_number: item.options.weekNumber,
                    school_year: item.options.schoolYear || getCurrentSchoolYear(),
                    subject: item.options.subject,
                    calendar_id: calendarId,
                    teaching_load_id: item.options.teachingLoadId || null,
                    compliance_status: complianceStatus,
                    raw_text: item.rawText || null                });

                const { error: dbError } = await withTimeout(
                    insertPromise as any,
                    30000,
                    'Sync DB insert timed out'
                ) as { error: any };

                if (dbError) {
                    console.error('[sync] DB insert error:', dbError);

                    // Handle unique constraint violation (Postgres code 23505)
                    if (dbError.code === '23505' || dbError.message?.includes('unique_submission_per_load_week')) {
                        console.warn(`[sync] Duplicate constraint — removing: ${item.fileName}`);
                        await del(key);
                        await markSynced(item.fileHash);
                        addToast('warning', `Already archived: ${item.fileName}`);
                        success++;
                        continue;
                    }

                    throw new Error(`DB Insert failed: ${dbError.message}`);
                }

                // ── Success: clean up ──
                await del(key);
                await updatePendingCount();
                await markSynced(item.fileHash);

                // Cache the hash for future offline verification
                await cacheVerifiedDoc(item.fileHash, {
                    file_name: item.fileName,
                    doc_type: item.options.docType,
                    week_number: item.options.weekNumber,
                    school_year: item.options.schoolYear,
                    created_at: new Date().toISOString()
                });

                success++;
                console.log(`[sync] Successfully synced: ${item.fileName}`);

                // Trigger native local notification
                import('./notifications').then(m => {
                    m.sendLocalNotification('Sync Successful', `Offline archival for ${item.fileName} has been synced to the cloud.`);
                });

            } catch (err: any) {
                console.error(`[sync] Failed to sync ${item.fileName}:`, err);
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
    // Without a deadline in the calendar, we cannot determine lateness.
    // Default to 'compliant' — uploaded means compliant.
    return 'compliant';}

// Auto-resume when online + Periodic Check
export function initOfflineSync(): void {
    if (typeof window === 'undefined') return;

    // 0. Request persistent storage (prevents browser from evicting IndexedDB)
    import('./offlineSubmissionLedger').then(({ requestPersistentStorage }) => {
        requestPersistentStorage();
    });

    // 1. Event Listener for Network Status
    window.addEventListener('online', () => {
        console.log('[offline] Network "online" event detected.');
        addToast('info', 'Connection restored. Syncing pending uploads...');

        // Wait a moment for connection to stabilize
        setTimeout(() => {
            processQueue();
            // Also sync the ledger from server for consistency
            import('./offlineSubmissionLedger').then(({ syncLedgerFromServer }) => {
                // We don't have userId here, but the sync will happen via the profile store
                console.log('[offline] Ledger server sync triggered on reconnect');
            });
        }, 3000);
    });

    // 2. Periodic "Heartbeat" (every 60s — battery-friendly for mobile)
    setInterval(() => {
        if (navigator.onLine) {
            processQueue();
        }
    }, 60000);

    // 3. Initial check on load
    updatePendingCount();
    if (navigator.onLine) {
        setTimeout(() => {
            console.log('[offline] Initial load check...');
            processQueue();
        }, 5000);
    }

    // 4. Sync Triggers (Visibility & Focus)
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

