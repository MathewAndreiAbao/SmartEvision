<script lang="ts">
    import Sidebar from "$lib/components/Sidebar.svelte";
    import AppSidebar from "$lib/components/AppSidebar.svelte";
    import AppHeader from "$lib/components/AppHeader.svelte";
    import InstallPrompt from "$lib/components/InstallPrompt.svelte";
    import UpdatePrompt from "$lib/components/UpdatePrompt.svelte";
    import SystemWalkthrough from "$lib/components/SystemWalkthrough.svelte";
    import { notifications } from "$lib/stores/notifications";
    import { authLoading, profile, user, isChangingPassword } from "$lib/utils/auth";
    import {
        preloadVerificationHashes,
        prefetchOfflineMetadata,
    } from "$lib/utils/offline";
    import { settings } from "$lib/stores/settings";
    import { theme } from "$lib/stores/theme";
    import { connectivity } from "$lib/stores/connectivity";
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
        connectivity.init(); // Track online/offline + pending sync queue globally
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
    class="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[var(--z-skip-link)] focus:px-4 focus:py-2 focus:bg-gov-blue focus:text-white focus:font-semibold focus:rounded-md focus:shadow-sm"
>
    Skip to Content
</a>

{#if $user}
    <!-- AppSidebar, Sidebar (bottom tabs), and the PWA/walkthrough overlays
         are all position:fixed, so they don't participate in this flex
         layout at all — flex-col only ever governs AppHeader vs <main>,
         and AppHeader is lg:hidden, so there's nothing for flex-direction
         to do at lg+. The sidebar offset is handled by <main>'s lg:ml-64. -->
    <div class="min-h-dvh bg-surface flex flex-col">
        <!-- Mobile bottom navigation (Sidebar component, but only mobile nav rendered) -->
        <Sidebar />

        <!-- Persistent left sidebar at lg+ — the desktop nav surface -->
        <AppSidebar />

        <!-- Mobile-only utility strip (logo, connectivity, theme, profile).
             No top bar at all at lg+: AppSidebar covers that ground. -->
        <AppHeader />

        <!-- Main content area — offset past the fixed lg+ sidebar -->
        <main
            id="main-content"
            class="flex-1 min-h-dvh flex flex-col bg-surface lg:ml-64"
            aria-label="Dashboard content"
        >
            <!-- Content with proper spacing. Bottom padding clears the fixed
                 bottom tab bar below lg; at lg+ that bar is hidden (the
                 sidebar takes over), so the clearance drops to the ordinary
                 section padding instead of wasting space. -->
            <div class="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 pb-32 sm:pb-24 lg:pb-8 flex-1">
                {@render children()}
            </div>
        </main>

        <!-- PWA prompts -->
        <InstallPrompt />
        <UpdatePrompt />

        <!-- Full system interactive walkthrough -->
        <SystemWalkthrough />
    </div>
{/if}
