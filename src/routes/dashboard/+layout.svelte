<script lang="ts">
    import Sidebar from "$lib/components/Sidebar.svelte";
    import TopBar from "$lib/components/TopBar.svelte";
    import InstallPrompt from "$lib/components/InstallPrompt.svelte";
    import UpdatePrompt from "$lib/components/UpdatePrompt.svelte";
    import { notifications } from "$lib/stores/notifications";
    import { authLoading, profile, user } from "$lib/utils/auth";
    import {
        preloadVerificationHashes,
        prefetchOfflineMetadata,
    } from "$lib/utils/offline";
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

    // WBS 20.3 & 20.4 — Proactive caching for full offline functionality
    onMount(async () => {
        settings.init(); // Initialize real-time settings
        if ($user && $profile) {
            await Promise.all([
                preloadVerificationHashes(),
                prefetchOfflineMetadata(
                    $profile.id,
                    $profile.district_id || undefined,
                ),
                notifications.init($user.id),
            ]);
        }
    });
</script>

<svelte:head>
    <title>Smart E-VISION — DASHBOARD</title>
</svelte:head>

<!-- WBS 21.2 — Accessibility: Skip to Content Link -->
<a
    href="#main-content"
    class="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:px-4 focus:py-2 focus:bg-gov-blue focus:text-white focus:font-semibold focus:rounded-md focus:shadow-sm"
>
    Skip to Content
</a>

{#if $authLoading}
    <!-- Loading state -->
    <div
        class="min-h-screen bg-surface flex items-center justify-center"
        role="status"
        aria-label="Loading Dashboard"
    >
        <div class="text-center">
            <img
                src="/app_icon.png"
                alt="Smart E-VISION"
                class="w-14 h-14 mx-auto rounded-md shadow-sm mb-4 animate-pulse"
            />
            <p
                class="text-sm font-medium text-text-muted uppercase tracking-wide"
            >
                Loading...
            </p>
        </div>
    </div>
{:else if $user}
    <div class="min-h-screen bg-surface">
        <Sidebar />

        <!-- Main content area -->
        <main
            id="main-content"
            class="lg:ml-60 min-h-screen flex flex-col"
            aria-labelledby="dashboard-title"
        >
            <TopBar />

            <div class="p-4 lg:p-6 pb-20 lg:pb-6 flex-1">
                {@render children()}
            </div>
        </main>

        <!-- PWA prompts -->
        <InstallPrompt />
        <UpdatePrompt />
    </div>
{/if}
