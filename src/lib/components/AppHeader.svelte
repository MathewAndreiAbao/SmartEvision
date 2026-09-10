<script lang="ts">
    import NotificationCenter from "./NotificationCenter.svelte";
    import { profile } from "$lib/utils/auth";
    import { theme } from "$lib/stores/theme";
    import { connectivity } from "$lib/stores/connectivity";
    import { signOut } from "$lib/utils/auth";
    import { goto } from "$app/navigation";
    import { page } from "$app/stores";
    import { Sun, Moon, LogOut, WifiOff, RefreshCw, QrCode, Settings } from "lucide-svelte";
    import { focusTrap } from "$lib/actions/focusTrap";
    import { getNavItemsForRole } from "$lib/config/navigation";
    import { showQRScanner } from "$lib/stores/ui";

    const { isOnline: onlineStatus, pendingCount } = connectivity;

    // Section navigation as a persistent row at lg+ (a District Supervisor
    // on a desktop workstation gets real navigation instead of a 5-tab
    // phone bar stretched across an otherwise-empty header). Below lg the
    // bottom tab bar (Sidebar.svelte) remains the single nav surface.
    // Same role-filtered source of truth as the mobile bar; the "Scan"
    // quick-action isn't a real route (href="#scan"), so it gets its own
    // icon button instead of a broken nav-tab link.
    const desktopNavItems = $derived(
        getNavItemsForRole($profile?.role).filter((item) => !item.href.startsWith("#")),
    );

    function isActive(href: string): boolean {
        const currentPath = $page.url.pathname;
        if (href === "/dashboard") return currentPath === "/dashboard";
        return currentPath.startsWith(href);
    }

    let profileMenuOpen = $state(false);
    let profileMenuRef: HTMLDivElement | undefined = $state();
    let profileMenuDropdown: HTMLDivElement | undefined = $state();

    async function handleLogout() {
        await signOut();
    }

    // ↑/↓ cycles focus between menu items; Home/End jump to the ends.
    // Tab-cycling and focus-in/focus-restore are handled by the focusTrap
    // action on the dropdown itself.
    function handleMenuKeydown(e: KeyboardEvent) {
        if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(e.key)) return;
        e.preventDefault();
        const items = Array.from(
            profileMenuDropdown?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [],
        );
        if (items.length === 0) return;
        const current = items.indexOf(document.activeElement as HTMLElement);
        let next: number;
        if (e.key === "Home") next = 0;
        else if (e.key === "End") next = items.length - 1;
        else if (e.key === "ArrowDown") next = current < items.length - 1 ? current + 1 : 0;
        else next = current > 0 ? current - 1 : items.length - 1;
        items[next].focus();
    }
</script>

<header
    class="sticky top-0 z-30 w-full border-b border-border-subtle bg-surface-white/95 backdrop-blur-md shadow-sm"
>
    <div class="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <!-- Left: Logo -->
        <div class="flex items-center gap-1 min-w-0 shrink-0">
            <a href="/dashboard" class="shrink-0" aria-label="CEDIMS Dashboard">
                <!-- Weight/size carries emphasis, not a gradient — craft-floor:
                     "Gradient text. Emphasis comes from weight or size." -->
                <span class="text-lg font-extrabold tracking-tight text-gov-blue">
                    CEDIMS
                </span>
            </a>
        </div>

        <!-- Center: Desktop section nav (lg+ only — bottom tab bar covers narrower viewports) -->
        <nav class="hidden lg:flex nav-tabs border-b-0 bg-transparent min-w-0 overflow-x-auto" aria-label="Section navigation">
            {#each desktopNavItems as item}
                {@const NavIcon = item.icon}
                <a
                    href={item.href}
                    class="nav-tab flex items-center gap-2 whitespace-nowrap {isActive(item.href) ? 'active' : ''}"
                    aria-current={isActive(item.href) ? "page" : undefined}
                >
                    <NavIcon size={16} strokeWidth={isActive(item.href) ? 2.5 : 2} aria-hidden="true" />
                    {item.label}
                </a>
            {/each}
        </nav>

        <!-- Right: Actions & Profile -->
        <div class="flex items-center gap-1 sm:gap-2 flex-shrink-0">
            <!-- Global Connectivity / Pending Sync Indicator — visible at every
                 width (was hidden entirely below the xs breakpoint, exactly
                 where a flaky connection is most likely). Text label
                 collapses on the smallest screens; the colored icon does not. -->
            {#if !$onlineStatus || $pendingCount > 0}
                <button
                    onclick={() => goto("/dashboard/upload")}
                    class="flex items-center gap-1.5 rounded-lg border px-2 xs:px-2.5 py-1.5 text-xs font-semibold transition-colors {$onlineStatus
                        ? 'border-gov-gold/30 bg-gov-gold/10 text-gov-gold-dark hover:bg-gov-gold/20'
                        : 'border-gov-red/30 bg-gov-red/10 text-gov-red hover:bg-gov-red/20'}"
                    aria-label={$onlineStatus
                        ? `${$pendingCount} file(s) waiting to sync`
                        : "You are offline — changes will sync once reconnected"}
                    title={$onlineStatus
                        ? `${$pendingCount} file(s) waiting to sync`
                        : "You are offline — changes will sync once reconnected"}
                >
                    {#if $onlineStatus}
                        <RefreshCw size={14} strokeWidth={2} />
                        <span class="hidden xs:inline">{$pendingCount} pending</span>
                    {:else}
                        <WifiOff size={14} strokeWidth={2} />
                        <span class="hidden xs:inline">Offline</span>
                    {/if}
                </button>
            {/if}

            <!-- QR Scan — desktop-only icon button. The mobile bottom nav has
                 no room for a 6th item on District Supervisor's 6-tab layout,
                 so this quick action previously had a home only on the
                 dashboard page itself. -->
            <button
                onclick={() => showQRScanner.set(true)}
                class="hidden lg:flex h-10 w-10 items-center justify-center rounded-lg text-text-muted hover:text-gov-blue hover:bg-gov-blue/10 transition-colors duration-200"
                aria-label="Scan QR code"
            >
                <QrCode size={20} strokeWidth={1.5} aria-hidden="true" />
            </button>

            <!-- Theme Toggle -->
            <button
                data-tour="theme-toggle"
                onclick={() => theme.toggle()}
                class="flex h-10 w-10 items-center justify-center rounded-lg text-text-muted hover:text-gov-blue hover:bg-gov-blue/10 transition-colors duration-200"
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
            <div class="relative" data-tour="profile-menu" bind:this={profileMenuRef}>
                <button
                    onclick={() => profileMenuOpen = !profileMenuOpen}
                    class="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-gov-blue/10 transition-colors duration-200 relative z-20"
                    aria-expanded={profileMenuOpen}
                    aria-haspopup="true"
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
                        tabindex="-1"
                        bind:this={profileMenuDropdown}
                        use:focusTrap
                        onkeydown={handleMenuKeydown}
                    >
                        <a
                            href="/dashboard/settings"
                            class="flex items-center gap-2 px-4 py-3 text-sm font-medium text-text-primary hover:bg-gov-blue/10 first:rounded-t-lg transition-colors"
                            role="menuitem"
                            onclick={() => profileMenuOpen = false}
                        >
                            <Settings size={16} strokeWidth={2} aria-hidden="true" />
                            Settings
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

<!-- Close profile menu on escape or outside click. focusTrap's destroy()
     restores focus to the trigger button in both cases. -->
<svelte:window
    onkeydown={(e) => {
        if (e.key === "Escape" && profileMenuOpen) {
            profileMenuOpen = false;
        }
    }}
    onclick={(e) => {
        const target = e.target as Node;
        if (profileMenuOpen && profileMenuRef && !profileMenuRef.contains(target)) {
            profileMenuOpen = false;
        }
    }}
/>
