<script lang="ts">
    import Sidebar from "$lib/components/Sidebar.svelte";
    import TopBar from "$lib/components/TopBar.svelte";
    import InstallPrompt from "$lib/components/InstallPrompt.svelte";
    import UpdatePrompt from "$lib/components/UpdatePrompt.svelte";
    import { notifications } from "$lib/stores/notifications";
    import { authLoading, profile, user, isChangingPassword } from "$lib/utils/auth";
    import {
        preloadVerificationHashes,
        prefetchOfflineMetadata,
    } from "$lib/utils/offline";
    import { settings } from "$lib/stores/settings";
    import { theme } from "$lib/stores/theme";
    import { goto } from "$app/navigation";
    import { onMount } from "svelte";

    let { children } = $props();

    // Auth guard — skip during password change to avoid redirect when supabase temporarily signs out
    $effect(() => {
        if (!$authLoading && !$user && !$isChangingPassword) {
            goto("/auth/login");
        }
    });

    // WBS 20.3 & 20.4 — Proactive caching for full offline functionality
    let prefetchDone = false;

    onMount(() => {
        theme.init(); // Apply saved theme
        settings.init(); // Initialize real-time settings
    });

    // Reactive prefetch: triggers as soon as profile is available
    $effect(() => {
        if ($user && $profile && !prefetchDone) {
            prefetchDone = true;
            Promise.all([
                preloadVerificationHashes($profile.id),
                prefetchOfflineMetadata(
                    $profile.id,
                    $profile.district_id || undefined,
                ),
                notifications.init($user.id),
                import("$lib/utils/deadlineNotifier").then((m) =>
                    m.checkUpcomingDeadlines(
                        $profile!.id,
                        $profile!.district_id || "",
                    ),
                ),
            ]).catch((err) => {
                console.warn("[dashboard] Prefetch error:", err);
            });
        }
    });
</script>

<svelte:head>
    <title>CEDIMS — Dashboard · Powered by Smart E-VISION</title>
</svelte:head>

<!-- WBS 21.2 — Accessibility: Skip to Content Link -->
<a
    href="#main-content"
    class="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:px-4 focus:py-2 focus:bg-gov-blue focus:text-white focus:font-semibold focus:rounded-md focus:shadow-sm"
>
    Skip to Content
</a>

{#if $user}
    <div class="min-h-screen bg-surface">
        <Sidebar />

        <!-- Main content area -->
        <main
            id="main-content"
            class="lg:ml-60 min-h-screen flex flex-col"
            aria-labelledby="dashboard-title"
        >
            <TopBar />

            <div class="relative p-3 sm:p-4 lg:p-6 pb-24 sm:pb-20 lg:pb-6 flex-1">
                {@render children()}
            </div>
        </main>

        <!-- PWA prompts -->
        <InstallPrompt />
        <UpdatePrompt />
    </div>
{/if}
