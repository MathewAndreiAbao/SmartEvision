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
			roles: ["Teacher"],
		},
		{
			href: "/dashboard/archive",
			label: "My Files",
			icon: Archive,
			mobileNav: true,
			priority: 3,
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
			roles: ["Master Teacher"],
		},
		{
			href: "/dashboard/monitoring/school",
			label: "School",
			icon: ShieldCheck,
			mobileNav: true,
			priority: 3,
			roles: ["Master Teacher"],
		},
		{
			href: "/dashboard/archive",
			label: "Documents",
			icon: Archive,
			mobileNav: true,
			priority: 4,
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
			roles: ["School Head"],
		},
		{
			href: "/dashboard/monitoring/school",
			label: "Staff",
			icon: Briefcase,
			mobileNav: true,
			priority: 3,
			roles: ["School Head"],
		},
		{
			href: "/dashboard/archive",
			label: "Submissions",
			icon: Archive,
			mobileNav: true,
			priority: 4,
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
			roles: ["District Supervisor"],
		},
		{
			href: "/dashboard/archive",
			label: "Submissions",
			icon: Archive,
			mobileNav: true,
			priority: 3,
			roles: ["District Supervisor"],
		},
		{
			href: "/dashboard/analytics",
			label: "Alerts",
			icon: TrendingUp,
			mobileNav: true,
			priority: 4,
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

<!-- Mobile Hamburger Toggle -->
<button
	class="lg:hidden fixed top-4 left-4 z-50 w-11 h-11 flex items-center justify-center rounded-lg bg-gov-blue text-white shadow-md hover:bg-gov-blue-dark active:scale-95 transition-all duration-200"
	onclick={() => (mobileOpen = !mobileOpen)}
	aria-label="Toggle menu"
>
	{#if mobileOpen}
		<X size={22} strokeWidth={2} />
	{:else}
		<Menu size={22} strokeWidth={2} />
	{/if}
</button>

<!-- Backdrop -->
{#if mobileOpen}
	<div
		class="lg:hidden fixed inset-0 bg-black/50 z-40 transition-opacity duration-300"
		onclick={() => (mobileOpen = false)}
		role="presentation"
	></div>
{/if}

<!-- Sidebar — Modern, Education-Focused -->
<aside
	class="fixed top-0 left-0 h-full w-64 z-50 flex flex-col bg-gradient-to-b from-surface-white via-surface-white to-surface-muted border-r border-border-subtle shadow-lg transition-transform duration-300 ease-smooth
		{mobileOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0"
	role="navigation"
	aria-label="Main Sidebar Navigation"
>
	<!-- Logo Section — Enhanced -->
	<a
		href="/dashboard"
		class="block border-b border-border-subtle px-6 py-6 no-underline hover:bg-gov-blue/5 transition-colors duration-200 relative z-10"
		aria-label="Go to Dashboard"
	>
		<div class="flex items-center gap-4">
			<div class="relative p-2.5 bg-gradient-to-br from-gov-blue to-gov-blue-vibrant rounded-xl shadow-md flex-shrink-0 z-20 flex items-center justify-center">
				<img
					src="/app_icon.png"
					alt="CEDIMS"
					class="h-8 w-8 rounded-md brightness-0 invert flex-shrink-0"
					loading="eager"
				/>
			</div>
			<div class="relative z-10">
				<h1
					id="dashboard-title"
					class="text-base font-bold text-text-primary leading-tight"
				>
					CEDIMS
				</h1>
				<p
					class="mt-1 text-[9px] font-bold uppercase tracking-[0.3em] text-gov-blue/80"
				>
					Calapan East District
				</p>
			</div>
		</div>
	</a>

	<!-- Navigation — Minimalist Professional Menu (4-5 items per role) -->
	<nav class="flex-1 overflow-y-auto px-3 py-6 cedims-scroll" aria-label="Main Navigation">
		<ul class="space-y-2">
			{#each filteredItems as item}
				{@const Icon = item.icon}
				<li>
					<a
						href={item.href}
						class="flex items-center justify-between gap-3 rounded-lg px-4 py-3 text-sm font-semibold transition-all duration-200
							{isActive(item.href)
							? 'bg-gov-blue/10 text-gov-blue border-l-4 border-gov-blue pl-3'
							: 'text-text-secondary hover:bg-surface-muted hover:text-gov-blue'}"
						aria-current={isActive(item.href) ? "page" : undefined}
						onclick={(e) => {
							if (item.onClick) {
								item.onClick(e);
							}
							mobileOpen = false;
						}}
					>
						<div class="flex items-center gap-3 min-w-0">
							<Icon
								size={20}
								strokeWidth={isActive(item.href) ? 2.5 : 2}
								aria-hidden="true"
								class="flex-shrink-0 transition-colors duration-200"
							/>
							<span class="truncate">{item.label}</span>
						</div>
						{#if isActive(item.href)}
							<ChevronRight
								size={16}
								strokeWidth={2.5}
								aria-hidden="true"
								class="flex-shrink-0"
							/>
						{/if}
					</a>
				</li>
			{/each}
		</ul>
	</nav>

	<!-- Footer Info — Improved -->
	{#if $profile}
		<div
			class="border-t border-border-subtle bg-gov-blue/5 px-4 py-4"
			role="contentinfo"
			aria-label="User Profile Summary"
		>
			<div class="flex items-center gap-3 mb-3">
				{#if $profile.avatar_url}
					<img
						src={$profile.avatar_url}
						alt={$profile.full_name}
						class="w-10 h-10 rounded-lg border-2 border-gov-blue/20 object-cover"
					/>
				{:else}
					<div
						class="w-10 h-10 rounded-lg bg-gradient-to-br from-gov-blue to-gov-blue-vibrant flex items-center justify-center text-sm font-bold text-white"
						aria-hidden="true"
					>
						{$profile.full_name?.charAt(0) || "?"}
					</div>
				{/if}
				<div class="flex-1 min-w-0">
					<p class="truncate text-sm font-bold text-text-primary">
						{$profile.full_name}
					</p>
					<p
						class="truncate text-[10px] font-semibold uppercase tracking-[0.15em] text-gov-blue/80"
					>
						{$profile.role}
					</p>
				</div>
			</div>
			<SyncStatus />
		</div>
	{/if}
</aside>

<!-- Mobile Bottom Nav — Professional Design -->
<nav
	class="lg:hidden fixed bottom-0 left-0 right-0 z-40 mobile-nav-bar"
	aria-label="Mobile Navigation Bar"
>
	<div class="flex items-center justify-around w-full px-0 py-0">
		{#each mobileNavItems as item}
			{@const MobileIcon = item.icon}
			<a
				href={item.href}
				class="mobile-nav-item {isActive(item.href) ? 'active' : ''}"
				aria-current={isActive(item.href) ? "page" : undefined}
				aria-label={item.label}
				onclick={(e) => {
					if (item.onClick) {
						item.onClick(e);
					}
					mobileOpen = false;
				}}
			>
				<div class="mobile-nav-icon">
					<MobileIcon
						size={22}
						strokeWidth={isActive(item.href) ? 2 : 1.5}
						aria-hidden="true"
					/>
				</div>
				<span class="text-[10px] font-semibold"
					>{item.label.split(" ")[0]}</span
				>
			</a>
		{/each}
	</div>
</nav>
