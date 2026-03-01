<script lang="ts">
    import { onMount } from "svelte";

    let showUpdate = $state(false);
    let waitingWorker: ServiceWorker | null = $state(null);

    onMount(() => {
        if (!("serviceWorker" in navigator)) return;

        navigator.serviceWorker.ready.then((registration) => {
            // Check if a new SW is already waiting
            if (registration.waiting) {
                waitingWorker = registration.waiting;
                showUpdate = true;
            }

            // Listen for new SW installations
            registration.addEventListener("updatefound", () => {
                const newWorker = registration.installing;
                if (!newWorker) return;

                newWorker.addEventListener("statechange", () => {
                    if (
                        newWorker.state === "installed" &&
                        navigator.serviceWorker.controller
                    ) {
                        waitingWorker = newWorker;
                        showUpdate = true;
                    }
                });
            });
        });

        // Reload when the new SW takes over
        let refreshing = false;
        navigator.serviceWorker.addEventListener("controllerchange", () => {
            if (!refreshing) {
                refreshing = true;
                window.location.reload();
            }
        });
    });

    function handleUpdate() {
        if (waitingWorker) {
            waitingWorker.postMessage({ type: "SKIP_WAITING" });
        }
        showUpdate = false;
    }

    function dismiss() {
        showUpdate = false;
    }
</script>

{#if showUpdate}
    <div
        class="fixed top-4 left-4 right-4 lg:left-auto lg:right-6 lg:w-96 z-[60] animate-slide-up"
    >
        <div class="glass-card p-4 border-l-4 border-gov-green shadow-elevated">
            <div class="flex items-center gap-3">
                <div
                    class="w-10 h-10 rounded-xl bg-gov-green flex items-center justify-center text-white text-[10px] font-black shrink-0"
                >
                    NEW
                </div>
                <div class="flex-1 min-w-0">
                    <h3 class="font-bold text-text-primary text-sm">
                        Update Available
                    </h3>
                    <p class="text-xs text-text-muted mt-0.5">
                        A new version of Smart E-VISION is ready.
                    </p>
                </div>
                <button
                    onclick={dismiss}
                    class="text-text-muted hover:text-text-primary text-sm p-1 cursor-pointer font-bold"
                    aria-label="Dismiss"
                >
                    CLOSE
                </button>
            </div>
            <div class="flex gap-2 mt-3">
                <button
                    onclick={handleUpdate}
                    class="flex-1 py-2 px-4 bg-gov-green text-white rounded-xl font-semibold text-sm hover:shadow-lg transition-all cursor-pointer"
                >
                    Refresh Now
                </button>
                <button
                    onclick={dismiss}
                    class="py-2 px-4 text-text-muted text-sm font-medium cursor-pointer"
                >
                    Later
                </button>
            </div>
        </div>
    </div>
{/if}
