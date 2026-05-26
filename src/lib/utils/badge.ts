
import { get } from 'svelte/store';
import { keys } from 'idb-keyval';

/**
 * Global PWA Badge SYNC
 * Aggregates notification counts and offline sync queue counts
 */
export async function updateAppBadge() {
    if (typeof navigator === 'undefined' || !('setAppBadge' in navigator)) return;

    try {
        // 1. Get Notification count (optional: if you want to import the store directly)
        // Since we want to avoid circular imports, we can use a more generic way 
        // or just have each store call this with its current value.

        let notifCount = 0;
        try {
            // Attempt to get notification unread count from the store if it's already in memory
            const { unreadCount } = await import('$lib/stores/notifications');
            notifCount = get(unreadCount);
        } catch (e) {
            // Fallback: if store isn't loaded, we just use 0 or skip
        }

        // 2. Get Offline Sync Queue count
        const QUEUE_PREFIX = 'sync_queue_';
        const allKeys = await keys();
        const syncCount = allKeys.filter((k: any) => String(k).startsWith(QUEUE_PREFIX)).length;

        const total = notifCount + syncCount;

        if (total > 0) {
            (navigator as any).setAppBadge(total).catch(() => { });
        } else {
            (navigator as any).clearAppBadge().catch(() => { });
        }
    } catch (err) {
        console.debug('[badge] Sync failed:', err);
    }
}
