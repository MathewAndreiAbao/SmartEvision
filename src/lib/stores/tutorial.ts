import { writable } from "svelte/store";

// Set to true (e.g. from Settings > "Replay Tutorial") to force the
// TutorialOverlay to show again even though the dashboard layout — and
// thus its own $effect guard — stays mounted across client-side navigation.
export const tutorialReplayRequested = writable(false);

// Tracks whether a user has already seen the first-time onboarding tour.
// Persisted per-user in localStorage so it only shows once, and can be
// re-triggered manually (e.g. a "Show tutorial" link in Settings).
function storageKey(userId: string) {
    return `cedims_tutorial_seen_${userId}`;
}

export function hasSeenTutorial(userId: string): boolean {
    if (typeof localStorage === "undefined") return true;
    try {
        return localStorage.getItem(storageKey(userId)) === "true";
    } catch {
        return true;
    }
}

export function markTutorialSeen(userId: string) {
    if (typeof localStorage === "undefined") return;
    try {
        localStorage.setItem(storageKey(userId), "true");
    } catch {
        /* ignore quota/privacy errors */
    }
}

export function resetTutorial(userId: string) {
    if (typeof localStorage === "undefined") return;
    try {
        localStorage.removeItem(storageKey(userId));
    } catch {
        /* ignore */
    }
}
