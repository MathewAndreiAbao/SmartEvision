import { g as get } from "./index.js";
import { keys } from "idb-keyval";
async function updateAppBadge() {
  if (typeof navigator === "undefined" || !("setAppBadge" in navigator)) return;
  try {
    let notifCount = 0;
    try {
      const { unreadCount } = await import("./_layout.js").then((n) => n.n);
      notifCount = get(unreadCount);
    } catch (e) {
    }
    const QUEUE_PREFIX = "sync_queue_";
    const allKeys = await keys();
    const syncCount = allKeys.filter((k) => String(k).startsWith(QUEUE_PREFIX)).length;
    const total = notifCount + syncCount;
    if (total > 0) {
      navigator.setAppBadge(total).catch(() => {
      });
    } else {
      navigator.clearAppBadge().catch(() => {
      });
    }
  } catch (err) {
    console.debug("[badge] Sync failed:", err);
  }
}
export {
  updateAppBadge
};
