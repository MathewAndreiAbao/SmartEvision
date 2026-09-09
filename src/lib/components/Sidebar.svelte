<script lang="ts">
	import { page } from "$app/stores";
	import { profile } from "$lib/utils/auth";
	import SyncStatus from "./SyncStatus.svelte";
	import { getNavItemsForRole } from "$lib/config/navigation";

	let mobileOpen = $state(false);

	// Filter items by current role (shared source of truth with AppHeader.svelte)
	const filteredItems = $derived(getNavItemsForRole($profile?.role));

	// For mobile: show only mobileNav items
	const mobileNavItems = $derived(filteredItems.filter((item) => item.mobileNav));

	function isActive(href: string): boolean {
		const currentPath = $page.url.pathname;
		if (href === "/dashboard") return currentPath === "/dashboard";
		return currentPath.startsWith(href);
	}

	// Swipe-to-open gesture
	let touchStartX = 0;
	let touchCurrentX = 0;
	let isSwiping = false;

	function handleTouchStart(e: TouchEvent) {
		touchStartX = e.touches[0].clientX;
		if (touchStartX < 30) {
			isSwiping = true;
		}
	}

	function handleTouchMove(e: TouchEvent) {
		if (!isSwiping) return;
		touchCurrentX = e.touches[0].clientX;
	}

	function handleTouchEnd() {
		if (!isSwiping) return;
		const swipeDistance = touchCurrentX - touchStartX;
		if (swipeDistance > 80) {
			mobileOpen = true;
		}
		isSwiping = false;
	}
</script>

<style>
	:global(.mobile-nav-bar) {
		border-top: 1px solid var(--color-border-subtle);
		background: linear-gradient(to top, var(--color-surface-white), var(--color-surface-muted));
		backdrop-filter: blur(12px);
		box-shadow: 0 -4px 12px rgba(0, 0, 0, 0.08);
		padding-bottom: env(safe-area-inset-bottom);
	}

	:global(.mobile-nav-item) {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 0.25rem;
		flex: 1;
		padding: 0.75rem 0.5rem;
		color: var(--color-text-secondary);
		transition: all 200ms ease;
	}

	:global(.mobile-nav-item:hover) {
		color: var(--color-gov-blue);
	}

	:global(.mobile-nav-item.active) {
		color: var(--color-gov-blue);
		font-weight: 600;
		position: relative;
	}

	:global(.mobile-nav-item.active::after) {
		content: '';
		position: absolute;
		bottom: 0;
		left: 0;
		right: 0;
		height: 3px;
		background: linear-gradient(to right, var(--color-gov-blue), var(--color-gov-blue-vibrant));
		border-radius: 2px 2px 0 0;
	}

	:global(.mobile-nav-icon) {
		transition: transform 200ms ease;
	}

	:global(.mobile-nav-item:active .mobile-nav-icon) {
		transform: scale(1.1);
	}

	:global(.cedims-scroll) {
		scroll-behavior: smooth;
	}

	:global(.cedims-scroll::-webkit-scrollbar) {
		width: 6px;
	}

	:global(.cedims-scroll::-webkit-scrollbar-track) {
		background: transparent;
	}

	:global(.cedims-scroll::-webkit-scrollbar-thumb) {
		background: var(--color-border-subtle);
		border-radius: 3px;
	}

	:global(.cedims-scroll::-webkit-scrollbar-thumb:hover) {
		background: var(--color-border-muted);
	}
</style>

<svelte:window
	ontouchstart={handleTouchStart}
	ontouchmove={handleTouchMove}
	ontouchend={handleTouchEnd}
/>

<!-- Mobile Bottom Navigation — hidden on lg+ where AppHeader carries the section nav instead -->
<nav
	class="fixed bottom-0 left-0 right-0 z-40 mobile-nav-bar lg:hidden"
	aria-label="Main Navigation"
>
	<div class="flex items-center justify-around w-full px-0 py-0">
		{#each mobileNavItems as item}
			{@const MobileIcon = item.icon}
			<a
				href={item.href}
				class="mobile-nav-item {isActive(item.href) ? 'active' : ''}"
				aria-current={isActive(item.href) ? "page" : undefined}
				aria-label={item.label}
				data-nav={item.navKey || null}
				onclick={(e) => {
					if (item.onClick) {
						item.onClick(e);
					}
				}}
			>
				<div class="mobile-nav-icon">
					<MobileIcon
						size={24}
						strokeWidth={isActive(item.href) ? 2.5 : 2}
						aria-hidden="true"
					/>
				</div>
				<span class="text-[10px] font-semibold leading-tight"
					>{item.label}</span
				>
			</a>
		{/each}
	</div>
</nav>
