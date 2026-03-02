<script lang="ts">
    import Sidebar from "$lib/components/Sidebar.svelte";
    import InstallPrompt from "$lib/components/InstallPrompt.svelte";
    import UpdatePrompt from "$lib/components/UpdatePrompt.svelte";
    import { authLoading, profile, user } from "$lib/utils/auth";
    import { preloadVerificationHashes } from "$lib/utils/offline";
    import { settings } from "$lib/stores/settings";
    import { goto } from "$app/navigation";
    import { onMount } from "svelte";

    let { children } = $props();

    // Auth guard
    $effect(() => {
        if (!$authLoading && !$user) {
            goto("/auth/login");
        }
    });

    // WBS 20.3 — Proactive Hash Pre-caching for full offline verification
    onMount(async () => {
        settings.init(); // Initialize real-time settings
        if ($user) {
            await preloadVerificationHashes();
        }
    });
</script>

<svelte:head>
    <title>Smart E-VISION — DASHBOARD</title>
</svelte:head>

<!-- WBS 21.2 — Accessibility: Skip to Content Link -->
<a
    href="#main-content"
    class="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:px-6 focus:py-3 focus:bg-gov-blue focus:text-white focus:font-bold focus:rounded-xl focus:shadow-2xl"
>
    Skip to Content
</a>

{#if $authLoading}
    <!-- Loading skeleton -->
    <div
        class="min-h-screen gradient-mesh flex items-center justify-center"
        role="status"
        aria-label="Loading Dashboard"
    >
        <div class="text-center animate-fade-in">
            <img
                src="/app_icon.png"
                alt="Smart E-VISION"
                class="w-20 h-20 mx-auto rounded-2xl shadow-elevated mb-6 animate-pulse-glow"
            />
            <p
                class="text-sm font-bold text-text-secondary uppercase tracking-[0.25em]"
            >
                Loading...
            </p>
        </div>
    </div>
{:else if $user}
    <div class="min-h-screen bg-surface">
        <Sidebar />

        <!-- Main content area — pushed right on desktop, bottom-padded on mobile -->
        <!-- WBS 21.2 — Proper main role and id for skip-link -->
        <main
            id="main-content"
            class="lg:ml-72 min-h-screen"
            aria-labelledby="dashboard-title"
        >
            <div
                class="p-4 pt-16 lg:pt-8 lg:p-8 pb-24 lg:pb-8 max-w-7xl mx-auto"
            >
                {@render children()}
            </div>
        </main>

        <!-- PWA prompts -->
        <InstallPrompt />
        <UpdatePrompt />
    </div>
{/if}
