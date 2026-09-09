<script lang="ts">
    import { page } from "$app/stores";
    import { profile } from "$lib/utils/auth";
    import { getNavItemsForRole } from "$lib/config/navigation";

    // Desktop-only primary navigation. The mobile bottom nav (Sidebar.svelte)
    // covers small screens; on lg+ screens there was previously no way to
    // switch sections other than typing a URL, so this fills that gap using
    // the same role-filtered nav source as the mobile nav.
    const items = $derived(getNavItemsForRole($profile?.role));

    function isActive(href: string): boolean {
        const currentPath = $page.url.pathname;
        if (href === "/dashboard") return currentPath === "/dashboard";
        return currentPath.startsWith(href);
    }
</script>

<nav
    class="sticky top-16 z-20 hidden lg:block border-b border-border-subtle bg-surface-white/95 backdrop-blur-md"
    aria-label="Primary"
>
    <div class="mx-auto flex max-w-7xl items-center gap-1 px-6 lg:px-8">
        {#each items as item (item.href + item.label)}
            {@const ItemIcon = item.icon}
            <a
                href={item.href}
                class="group relative flex items-center gap-2 px-4 py-3 text-sm font-semibold transition-colors {isActive(item.href)
                    ? 'text-gov-blue'
                    : 'text-text-secondary hover:text-gov-blue'}"
                aria-current={isActive(item.href) ? "page" : undefined}
                data-nav={item.navKey || null}
                onclick={(e) => {
                    if (item.onClick) item.onClick(e);
                }}
            >
                <ItemIcon size={16} strokeWidth={isActive(item.href) ? 2.5 : 2} aria-hidden="true" />
                {item.label}
                <span
                    class="absolute inset-x-3 -bottom-px h-0.5 rounded-full transition-all {isActive(item.href)
                        ? 'bg-gov-blue'
                        : 'bg-transparent group-hover:bg-gov-blue/30'}"
                ></span>
            </a>
        {/each}
    </div>
</nav>
