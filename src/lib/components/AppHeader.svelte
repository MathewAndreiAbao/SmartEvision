<script lang="ts">
    import NotificationCenter from "./NotificationCenter.svelte";
    import { profile } from "$lib/utils/auth";
    import { theme } from "$lib/stores/theme";
    import { connectivity } from "$lib/stores/connectivity";
    import { signOut } from "$lib/utils/auth";
    import { goto } from "$app/navigation";
    import { Sun, Moon, LogOut, WifiOff, RefreshCw } from "lucide-svelte";

    const { isOnline: onlineStatus, pendingCount } = connectivity;

    // Logo + utility controls only. Section navigation lives exclusively in
    // the bottom tab bar (Sidebar.svelte), shown at every screen size, so
    // there is a single, consistent place to switch tabs instead of two.
    let profileMenuOpen = $state(false);

    async function handleLogout() {
        await signOut();
    }
</script>

<header
    class="sticky top-0 z-30 w-full border-b border-border-subtle bg-surface-white/95 backdrop-blur-md shadow-sm"
>
    <div class="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <!-- Left: Logo -->
        <div class="flex items-center gap-1 min-w-0">
            <a href="/dashboard" class="shrink-0" aria-label="CEDIMS Dashboard">
                <span class="text-lg font-bold bg-gradient-to-br from-gov-blue to-gov-blue-vibrant bg-clip-text text-transparent">
                    CEDIMS
                </span>
            </a>
        </div>

        <!-- Right: Actions & Profile -->
        <div class="flex items-center gap-1 sm:gap-2 flex-shrink-0">
            <!-- Global Connectivity / Pending Sync Indicator -->
            {#if !$onlineStatus || $pendingCount > 0}
                <button
                    onclick={() => goto("/dashboard/upload")}
                    class="hidden xs:flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-colors {$onlineStatus
                        ? 'border-gov-gold/30 bg-gov-gold/10 text-gov-gold-dark hover:bg-gov-gold/20'
                        : 'border-gov-red/30 bg-gov-red/10 text-gov-red hover:bg-gov-red/20'}"
                    title={$onlineStatus
                        ? `${$pendingCount} file(s) waiting to sync`
                        : "You are offline — changes will sync once reconnected"}
                >
                    {#if $onlineStatus}
                        <RefreshCw size={14} strokeWidth={2} />
                        {$pendingCount} pending
                    {:else}
                        <WifiOff size={14} strokeWidth={2} />
                        Offline
                    {/if}
                </button>
            {/if}

            <!-- Theme Toggle -->
            <button
                data-tour="theme-toggle"
                onclick={() => theme.toggle()}
                class="flex h-10 w-10 items-center justify-center rounded-lg text-text-muted hover:text-gov-blue hover:bg-gov-blue/10 transition-all duration-200"
                aria-label={$theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            >
                {#if $theme === 'dark'}
                    <Sun size={20} strokeWidth={1.5} />
                {:else}
                    <Moon size={20} strokeWidth={1.5} />
                {/if}
            </button>

            <!-- Notifications -->
            <div data-tour="notifications">
                <NotificationCenter />
            </div>

            <!-- Divider -->
            <div class="mx-1.5 h-6 w-px bg-border-subtle hidden sm:block"></div>

            <!-- Profile Menu -->
            <div class="relative" data-tour="profile-menu">
                <button
                    onclick={() => profileMenuOpen = !profileMenuOpen}
                    class="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-gov-blue/10 transition-colors duration-200 relative z-20"
                    aria-expanded={profileMenuOpen}
                    aria-label="Profile menu"
                >
                    {#if $profile?.avatar_url}
                        <img
                            src={$profile.avatar_url}
                            alt={$profile.full_name}
                            class="h-8 w-8 rounded-lg border-2 border-gov-blue/20 object-cover flex-shrink-0"
                            loading="lazy"
                        />
                    {:else}
                        <div
                            class="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-gov-blue to-gov-blue-vibrant text-xs font-bold text-white flex-shrink-0"
                        >
                            {$profile?.full_name?.charAt(0) || "U"}
                        </div>
                    {/if}
                    <span class="hidden sm:block truncate max-w-[150px] text-sm font-semibold text-text-primary">
                        {$profile?.full_name}
                    </span>
                </button>

                <!-- Profile Dropdown -->
                {#if profileMenuOpen}
                    <div
                        class="absolute right-0 mt-2 w-48 rounded-lg border border-border-subtle bg-surface-white shadow-xl"
                        role="menu"
                        aria-orientation="vertical"
                    >
                        <a
                            href="/dashboard/settings"
                            class="block px-4 py-3 text-sm font-medium text-text-primary hover:bg-gov-blue/10 first:rounded-t-lg transition-colors"
                            role="menuitem"
                            onclick={() => profileMenuOpen = false}
                        >
                            ⚙️ Settings
                        </a>
                        <button
                            onclick={handleLogout}
                            class="w-full text-left px-4 py-3 text-sm font-medium text-gov-red hover:bg-gov-red/10 last:rounded-b-lg transition-colors flex items-center gap-2"
                            role="menuitem"
                        >
                            <LogOut size={16} strokeWidth={2} />
                            Sign Out
                        </button>
                    </div>
                {/if}
            </div>
        </div>
    </div>
</header>

<!-- Close profile menu on escape or outside click -->
<svelte:window
    onkeydown={(e) => {
        if (e.key === "Escape" && profileMenuOpen) {
            profileMenuOpen = false;
        }
    }}
    onclick={(e) => {
        const target = e.target as HTMLElement;
        const profileMenu = target.closest('div');
        if (!profileMenu?.querySelector('button[aria-expanded]')?.contains(target) && profileMenuOpen) {
            profileMenuOpen = false;
        }
    }}
/>
