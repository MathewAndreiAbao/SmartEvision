/**
 * Offline Submission Ledger — IndexedDB-backed
 * 
 * Tracks all submissions (online + offline) for strict enforcement:
 * - One upload per teaching load per week per doc type (no duplicates)
 * - SHA-256 hash deduplication (no identical content)
 * - Survives browser refresh, cache clear, and offline periods
 * - Syncs with server when online for ground-truth consistency
 * 
 * Uses idb-keyval with dedicated prefixes to avoid conflicts with
 * the sync queue or other cached data.
 */

import { get, set, del, keys } from 'idb-keyval';
import { getCurrentSchoolYear } from './schoolYear';            .order('created_at', { ascending: false })
            .limit(200);

        if (error || !data) {
            console.warn('[ledger] Server sync failed:', error?.message);
            return 0;
        }

        let synced = 0;
        for (const row of data) {
            if (!row.teaching_load_id || !row.week_number || !row.file_hash) continue;

            await recordSubmission({
                teachingLoadId: row.teaching_load_id,
                weekNumber: row.week_number,
                schoolYear: row.school_year || getCurrentSchoolYear(),                docType: row.doc_type || 'DLL',
                fileHash: row.file_hash,
                fileName: row.file_name || 'unknown',
                timestamp: new Date(row.created_at).getTime(),
                status: 'synced'
            });
            synced++;
        }

        console.log(`[ledger] Synced ${synced} entries from server`);
        return synced;
    } catch (err) {
        console.warn('[ledger] syncLedgerFromServer error:', err);
        return 0;
    }
}

/**
 * Request persistent storage from the browser.
 * Prevents the browser from evicting IndexedDB data under storage pressure.
 * 
 * Should be called once on app startup.
 */
export async function requestPersistentStorage(): Promise<boolean> {
    if (typeof navigator === 'undefined') return false;

    try {
        if (navigator.storage && navigator.storage.persist) {
            const granted = await navigator.storage.persist();
            console.log(`[ledger] Persistent storage ${granted ? 'GRANTED' : 'denied'}`);
            return granted;
        }
    } catch (err) {
        console.warn('[ledger] requestPersistentStorage error:', err);
    }
    return false;
}

/**
 * Full integrity check: validates both slot uniqueness and content hash uniqueness.
 * Returns a detailed result object for the UI to display.
 */
export async function validateUploadIntegrity(
    teachingLoadId: string,
    weekNumber: number,
    schoolYear: string,
    docType: string,
    fileHash: string
): Promise<{
    allowed: boolean;
    reason?: string;
    existingEntry?: LedgerEntry;
    blockType?: 'slot_taken' | 'duplicate_content';
}> {
    // Check 1: Slot uniqueness (one per teaching load per week per doc type)
    const slotEntry = await hasSubmission(teachingLoadId, weekNumber, schoolYear, docType);
    if (slotEntry) {
        return {
            allowed: false,
            reason: `A ${docType} document for Week ${weekNumber} has already been ${slotEntry.status === 'synced' ? 'archived' : 'queued for upload'}.`,
            existingEntry: slotEntry,
            blockType: 'slot_taken'
        };
    }

    // Check 2: Content hash uniqueness (no identical documents)
    const hashEntry = await hasHash(fileHash);
    if (hashEntry) {
        return {
            allowed: false,
            reason: `This exact document has already been submitted as "${hashEntry.fileName}" (${hashEntry.docType}, Week ${hashEntry.weekNumber}).`,
            existingEntry: hashEntry,
            blockType: 'duplicate_content'
        };
    }

    return { allowed: true };
}
