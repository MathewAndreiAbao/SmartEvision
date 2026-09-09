import { writable } from "svelte/store";
import { getQueueSize } from "$lib/utils/offline";

// Centralizes online/offline + pending-sync-queue state so any page
// (not just the upload page) can show a consistent connectivity signal.
function createConnectivityStore() {
    const isOnline = writable<boolean>(
        typeof navigator !== "undefined" ? navigator.onLine : true,
    );
    const pendingCount = writable<number>(0);

    let initialized = false;

    async function refreshPendingCount() {
        try {
            const size = await getQueueSize();
            pendingCount.set(size);
        } catch (err) {
            console.warn("[connectivity] Failed to read queue size:", err);
        }
    }

    function init() {
        if (initialized || typeof window === "undefined") return;
        initialized = true;

        isOnline.set(navigator.onLine);
        refreshPendingCount();

        window.addEventListener("online", () => {
            isOnline.set(true);
            refreshPendingCount();
        });
        window.addEventListener("offline", () => {
            isOnline.set(false);
        });

        // Periodic refresh in case the queue changes from another tab/page
        // without going through refreshPendingCount() directly.
        setInterval(refreshPendingCount, 15000);
    }

    return {
        isOnline: { subscribe: isOnline.subscribe },
        pendingCount: { subscribe: pendingCount.subscribe },
        init,
        refreshPendingCount,
    };
}

export const connectivity = createConnectivityStore();
