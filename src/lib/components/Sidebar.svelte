<script lang="ts">
	import { page } from "$app/stores";
	import { profile } from "$lib/utils/auth";
	import SyncStatus from "./SyncStatus.svelte";
	import {
		LayoutDashboard,
		Calendar,
		CloudUpload,
		Archive,
		Briefcase,
		ShieldCheck,
		Map,
		TrendingUp,
		Settings,
		ChevronRight,
		Menu,
		X,
		QrCode,
	} from "lucide-svelte";
	import { showQRScanner } from "$lib/stores/ui";

	interface NavItem {
		href: string;
		label: string;
		icon: any;
		roles: string[];
		mobileNav?: boolean;
		onClick?: (e: Event) => void;
		priority?: number; // 1-5: higher = show first
		navKey?: string; // For quick guide targeting
	}

	// Minimalist navigation: 4-5 items per role, no section grouping
	const navItems: NavItem[] = [
		// ========== SHARED ACROSS ALL ROLES ==========
		{
			href: "/dashboard",
			label: "Dashboard",
			icon: LayoutDashboard,
			mobileNav: true,
			priority: 1,
			navKey: "dashboard",
			roles: [
				"Teacher",
				"School Head",
				"Master Teacher",
				"District Supervisor",
			],
		},

		// ========== TEACHER (4 tabs) ==========
		{
			href: "/dashboard/upload",
			label: "Upload",
			icon: CloudUpload,
			mobileNav: true,
			priority: 2,
			navKey: "upload",
			roles: ["Teacher"],
		},
		{
			href: "/dashboard/archive",
			label: "My Files",
			icon: Archive,
			mobileNav: true,
			priority: 3,
			navKey: "archive",
			roles: ["Teacher"],
		},
		{
			href: "/dashboard/settings",
			label: "Settings",
			icon: Settings,
			mobileNav: true,
			priority: 4,
			roles: ["Teacher"],
		},

		// ========== MASTER TEACHER (5 tabs) ==========
		{
			href: "/dashboard/upload",
			label: "Upload",
			icon: CloudUpload,
			mobileNav: true,
			priority: 2,
			navKey: "upload",
			roles: ["Master Teacher"],
		},
		{
			href: "/dashboard/monitoring/school",
			label: "School",
			icon: ShieldCheck,
			mobileNav: true,
			priority: 3,
			navKey: "school",
			roles: ["Master Teacher"],
		},
		{
			href: "/dashboard/archive",
			label: "Documents",
			icon: Archive,
			mobileNav: true,
			priority: 4,
			navKey: "documents",
			roles: ["Master Teacher"],
		},
		{
			href: "/dashboard/settings",
			label: "Settings",
			icon: Settings,
			mobileNav: true,
			priority: 5,
			roles: ["Master Teacher"],
		},

		// ========== SCHOOL HEAD (5 tabs) ==========
		{
			href: "/dashboard/upload",
			label: "Upload",
			icon: CloudUpload,
			mobileNav: true,
			priority: 2,
			navKey: "upload",
			roles: ["School Head"],
		},
		{
			href: "/dashboard/monitoring/school",
			label: "Staff",
			icon: Briefcase,
			mobileNav: true,
			priority: 3,
			navKey: "staff",
			roles: ["School Head"],
		},
		{
			href: "/dashboard/archive",
			label: "Submissions",
			icon: Archive,
			mobileNav: true,
			priority: 4,
			navKey: "submissions",
			roles: ["School Head"],
		},
		{
			href: "/dashboard/settings",
			label: "Settings",
			icon: Settings,
			mobileNav: true,
			priority: 5,
			roles: ["School Head"],
		},

		// ========== DISTRICT SUPERVISOR (5 tabs) ==========
		{
			href: "/dashboard/monitoring/district",
			label: "Schools",
			icon: Map,
			mobileNav: true,
			priority: 2,
			navKey: "schools",
			roles: ["District Supervisor"],
		},
		{
			href: "/dashboard/archive",
			label: "Submissions",
			icon: Archive,
			mobileNav: true,
			priority: 3,
			navKey: "submissions",
			roles: ["District Supervisor"],
		},
		{
			href: "/dashboard/analytics",
			label: "Alerts",
			icon: TrendingUp,
			mobileNav: true,
			priority: 4,
			navKey: "alerts",
			roles: ["District Supervisor"],
		},
		{
			href: "/dashboard/settings",
			label: "Settings",
			icon: Settings,
			mobileNav: true,
			priority: 5,
			roles: ["District Supervisor"],
		},

		// ========== OPTIONAL TOOLS ==========
		{
			href: "#scan",
			label: "Scan",
			icon: QrCode,
			mobileNav: false, // Don't show in tab bar
			priority: 99,
			roles: [
				"Teacher",
				"School Head",
				"Master Teacher",
				"District Supervisor",
			],
			onClick: (e: Event) => {
				e.preventDefault();
				showQRScanner.set(true);
			},
		},
	];

	let mobileOpen = $state(false);

	// Filter items by current role
	const filteredItems = $derived(
		navItems
			.filter((item) => {
				const currentRole = $profile?.role?.toLowerCase() || "";
				return item.roles.some((r) =>
					currentRole.includes(r.toLowerCase().trim()),
				);
			})
			.sort((a, b) => (a.priority || 99) - (b.priority || 99)),
	);

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

<!-- Desktop Sidebar: HIDDEN (using bottom nav only) -->

<!-- Mobile Bottom Navigation — Only Navigation (No Sidebar) -->
<nav
	class="fixed bottom-0 left-0 right-0 z-40 mobile-nav-bar"
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
