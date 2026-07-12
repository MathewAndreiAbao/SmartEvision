<script lang="ts">
    import NotificationCenter from "./NotificationCenter.svelte";
    import { page } from "$app/stores";
    import { profile } from "$lib/utils/auth";
    import { theme } from "$lib/stores/theme";
    import { fade } from "svelte/transition";
    import { ChevronRight, Home, Sun, Moon } from "lucide-svelte";

    const breadcrumbMap: Record<string, string> = {
        "dashboard": "Dashboard",
        "upload": "Upload",
        "archive": "Archive",
        "load": "Teaching Load",
        "calendar": "Calendar",
        "review": "Review Queue",
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
</script>

<header
    class="sticky top-0 z-30 flex h-14 sm:h-16 w-full items-center justify-between border-b border-border-subtle bg-surface-glass/90 px-3 pl-12 backdrop-blur-sm sm:px-6 lg:pl-6"
    in:fade={{ duration: 300 }}
>
    <div class="flex items-center gap-1 sm:gap-2 min-w-0 max-w-[55%] sm:max-w-none">
        <nav aria-label="Breadcrumb" class="flex items-center gap-1 sm:gap-1.5 text-xs sm:text-sm min-w-0 overflow-hidden">
            <a
                href="/dashboard"
                class="shrink-0 text-text-muted hover:text-gov-blue transition-colors"
                aria-label="Home"
            >
                <Home size={14} />
            </a>
            {#each crumbs as crumb, i}
                <ChevronRight size={10} class="shrink-0 sm:size-[12] text-text-muted" aria-hidden="true" />
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

    <div class="flex items-center gap-4 flex-shrink-0">
        <!-- Theme Toggle -->
        <button
            onclick={() => theme.toggle()}
            class="flex h-8 w-8 items-center justify-center rounded-lg text-text-muted hover:text-gov-blue hover:bg-gov-blue/10 transition-colors"
            aria-label={$theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
            {#if $theme === 'dark'}
                <Sun size={16} />
            {:else}
                <Moon size={16} />
            {/if}
        </button>
        <NotificationCenter />
        <div class="mx-1 h-8 w-px bg-border-subtle"></div>
        <div class="flex items-center gap-2.5">
            {#if $profile?.avatar_url}
                <img
                    src={$profile.avatar_url}
                    alt={$profile.full_name}
                    class="h-9 w-9 rounded-full border border-border-subtle object-cover"
                />
            {:else}
                <div
                    class="flex h-9 w-9 items-center justify-center rounded-full border border-gov-blue/10 bg-gov-blue/10 text-[10px] font-semibold uppercase text-gov-blue"
                >
                    {$profile?.full_name?.charAt(0) || "U"}
                </div>
            {/if}
        </div>
    </div>
</header>
