<script lang="ts">
    import NotificationCenter from "./NotificationCenter.svelte";
    import { page } from "$app/stores";
    import { profile } from "$lib/utils/auth";
    import { theme } from "$lib/stores/theme";
    import { fade } from "svelte/transition";
    import { ChevronRight, Home, Sun, Moon, LogOut } from "lucide-svelte";
    import { signOut } from "$lib/utils/auth";

    const breadcrumbMap: Record<string, string> = {
        "dashboard": "Dashboard",
        "upload": "Upload",
        "archive": "Archive",
        "load": "Teaching Load",
        "calendar": "Calendar",
        "monitoring": "Monitoring",
        "school": "School",
        "district": "District",
        "analytics": "Analytics",
        "settings": "Settings",
        "admin": "Admin Panel",
    };

    let crumbs = $derived.by(() => {
        const path = $page.url.pathname;
        const segments = path.split("/").filter(Boolean);
        const result: { label: string; href: string }[] = [];
        let accumulated = "";
        for (const seg of segments) {
            accumulated += "/" + seg;
            const label = breadcrumbMap[seg] || seg.charAt(0).toUpperCase() + seg.slice(1);
            result.push({ label, href: accumulated });
        }
        return result;
    });

    let profileMenuOpen = $state(false);

    async function handleLogout() {
        await signOut();
    }
</script>

<header
    class="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-color-border-subtle bg-color-surface-white backdrop-blur-md shadow-sm px-4 sm:px-6 lg:px-8"
    in:fade={{ duration: 300 }}
>
    <!-- Left: Logo (hidden on desktop, shown on mobile) -->
    <div class="lg:hidden shrink-0">
        <div class="text-lg font-bold bg-gradient-to-br from-gov-blue to-gov-blue-vibrant bg-clip-text text-transparent">
            CEDIMS
        </div>
    </div>

    <!-- Center: Breadcrumbs (hidden on mobile) -->
    <div class="hidden lg:flex items-center gap-2 min-w-0 flex-1 mx-6">
        <nav aria-label="Breadcrumb" class="flex items-center gap-1.5 text-sm min-w-0 overflow-hidden">
            <a
                href="/dashboard"
                class="shrink-0 text-text-muted hover:text-gov-blue hover:bg-gov-blue/10 rounded-lg p-1 transition-all duration-200"
                aria-label="Home"
            >
                <Home size={18} strokeWidth={1.75} />
            </a>
            {#each crumbs as crumb, i}
                <ChevronRight size={12} class="shrink-0 text-text-muted/60" aria-hidden="true" />
                {#if i < crumbs.length - 1}
                    <a
                        href={crumb.href}
                        class="truncate text-text-secondary hover:text-gov-blue transition-colors font-medium shrink min-w-0"
                    >
                        {crumb.label}
                    </a>
                {:else}
                    <span class="truncate text-text-primary font-bold shrink min-w-0" aria-current="page">
                        {crumb.label}
                    </span>
                {/if}
            {/each}
        </nav>
    </div>

    <!-- Right: Actions & Profile -->
    <div class="flex items-center gap-1 sm:gap-2 flex-shrink-0 ml-4">
        <!-- Theme Toggle -->
        <button
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
        <NotificationCenter />

        <!-- Divider -->
        <div class="mx-1.5 h-6 w-px bg-border-subtle"></div>

        <!-- Profile Menu -->
        <div class="relative">
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
