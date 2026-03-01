<script lang="ts">
    import { onMount } from "svelte";

    let deferredPrompt: any = $state(null);
    let showPrompt = $state(false);
    let isIOS = $state(false);
    let isInstalled = $state(false);
    let dismissed = $state(false);

    onMount(() => {
        // Check if already installed
        if (window.matchMedia("(display-mode: standalone)").matches) {
            isInstalled = true;
            return;
        }

        // Check if iOS (needs manual install instructions)
        const ua = navigator.userAgent;
        isIOS =
            /iPad|iPhone|iPod/.test(ua) ||
            (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

        // Listen for the install prompt event (Chrome/Edge/Android)
        window.addEventListener("beforeinstallprompt", (e: Event) => {
            e.preventDefault();
            deferredPrompt = e;
            // Show our custom prompt after a short delay
            setTimeout(() => {
                if (!dismissed) showPrompt = true;
            }, 3000);
        });

        // Detect if app was just installed
        window.addEventListener("appinstalled", () => {
            isInstalled = true;
            showPrompt = false;
            deferredPrompt = null;
        });

        // Show iOS instructions after delay if not installed
        if (isIOS && !isInstalled) {
            setTimeout(() => {
                if (!dismissed) showPrompt = true;
            }, 5000);
        }
    });

    async function handleInstall() {
        if (!deferredPrompt) return;
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === "accepted") {
            isInstalled = true;
        }
        deferredPrompt = null;
        showPrompt = false;
    }

    function dismiss() {
        showPrompt = false;
        dismissed = true;
    }
</script>

{#if showPrompt && !isInstalled && !dismissed}
    <div
        class="fixed bottom-24 lg:bottom-6 left-4 right-4 lg:left-auto lg:right-6 lg:w-96 z-50 animate-slide-up"
    >
        <div
            class="glass-card p-5 border-l-4 border-gov-blue shadow-elevated"
        >
            <div class="flex items-start gap-3">
                <div
                    class="w-12 h-12 rounded-xl bg-gradient-to-br from-gov-blue to-gov-blue-dark flex items-center justify-center text-white text-xl font-bold shrink-0"
                >
                    E
                </div>
                <div class="flex-1 min-w-0">
                    <h3 class="font-bold text-text-primary text-sm">
                        Install Smart E-VISION
                    </h3>
                    {#if isIOS}
                        <p class="text-xs text-text-muted mt-1 leading-relaxed">
                            Tap <strong>Share</strong> (□↑) then
                            <strong>"Add to Home Screen"</strong> for the full app
                            experience.
                        </p>
                    {:else}
                        <p class="text-xs text-text-muted mt-1 leading-relaxed">
                            Install as an app for faster access, offline
                            support, and push notifications.
                        </p>
                    {/if}
                </div>
                <button
                    onclick={dismiss}
                    class="text-text-muted hover:text-text-primary transition-colors text-lg leading-none p-1 cursor-pointer"
                    aria-label="Dismiss"
                >
                    ✕
                </button>
            </div>

            {#if !isIOS}
                <div class="flex gap-2 mt-4">
                    <button
                        onclick={handleInstall}
                        class="flex-1 py-2.5 px-4 bg-gradient-to-r from-gov-blue to-gov-blue-dark text-white rounded-xl font-semibold text-sm hover:shadow-lg transition-all hover:-translate-y-0.5 cursor-pointer"
                    >
                        Install App
                    </button>
                    <button
                        onclick={dismiss}
                        class="py-2.5 px-4 text-text-muted hover:text-text-primary text-sm font-medium transition-colors cursor-pointer"
                    >
                        Not now
                    </button>
                </div>
            {/if}
        </div>
    </div>
{/if}
