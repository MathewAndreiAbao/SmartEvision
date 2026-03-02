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
	}

	const navItems: NavItem[] = [
		{
			href: "/dashboard",
			label: "Dashboard",
			icon: LayoutDashboard,
			mobileNav: true,
			roles: [
				"Teacher",
				"School Head",
				"Master Teacher",
				"District Supervisor",
			],
		},
		{
			href: "/dashboard/calendar",
			label: "Calendar",
			icon: Calendar,
			mobileNav: true,
			roles: [
				"Teacher",
				"School Head",
				"Master Teacher",
				"District Supervisor",
			],
		},
		{
			href: "/dashboard/upload",
			label: "Upload",
			icon: CloudUpload,
			mobileNav: true,
			roles: ["Teacher"],
		},
		{
			href: "/dashboard/archive",
			label: "Archive",
			icon: Archive,
			mobileNav: true,
			roles: [
				"Teacher",
				"School Head",
				"Master Teacher",
				"District Supervisor",
			],
		},
		{
			href: "/dashboard/load",
			label: "Teaching Load",
			icon: Briefcase,
			roles: ["Teacher"],
		},
		{
			href: "/dashboard/monitoring/school",
			label: "School Monitor",
			icon: ShieldCheck,
			mobileNav: true,
			roles: ["School Head", "Master Teacher"],
		},
		{
			href: "/dashboard/monitoring/district",
			label: "District Monitor",
			icon: Map,
			mobileNav: true,
			roles: ["District Supervisor"],
		},
		{
			href: "/dashboard/analytics",
			label: "Analytics",
			icon: TrendingUp,
			roles: ["School Head", "Master Teacher", "District Supervisor"],
		},
		{
			href: "/dashboard/settings",
			label: "Settings",
			icon: Settings,
			roles: [
				"Teacher",
				"School Head",
				"Master Teacher",
				"District Supervisor",
			],
		},
		{
			href: "/dashboard/admin",
			label: "Admin Panel",
			icon: ShieldCheck,
			roles: ["District Supervisor"],
		},
		{
			href: "#scan",
			label: "Scan Document",
			icon: QrCode,
			mobileNav: true,
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

	const filteredItems = $derived(
		navItems.filter((item) => {
			const currentRole = $profile?.role?.toLowerCase() || "";
			return item.roles.some((r) =>
				currentRole.includes(r.toLowerCase().trim()),
			);
		}),
	);

	const mobileNavItems = $derived(
		filteredItems.filter((item) => item.mobileNav).slice(0, 5),
	);

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

<svelte:window
	ontouchstart={handleTouchStart}
	ontouchmove={handleTouchMove}
	ontouchend={handleTouchEnd}
/>

<!-- Mobile Hamburger Toggle -->
<button
	class="lg:hidden fixed top-4 left-4 z-50 w-12 h-12 flex items-center justify-center rounded-2xl bg-gov-blue text-white shadow-lg active:scale-95 transition-all"
	onclick={() => (mobileOpen = !mobileOpen)}
	aria-label="Toggle menu"
>
	{#if mobileOpen}
		<X size={24} />
	{:else}
		<Menu size={24} />
	{/if}
</button>

<!-- Backdrop -->
{#if mobileOpen}
	<div
		class="lg:hidden fixed inset-0 bg-slate-900/60 backdrop-blur-md z-40 transition-opacity duration-500"
		onclick={() => (mobileOpen = false)}
		role="presentation"
	></div>
{/if}

<!-- Sidebar -->
<aside
	class="fixed top-0 left-0 h-full w-72 z-50 flex flex-col bg-white border-r border-border-subtle shadow-xl transition-transform duration-500 ease-pop
		{mobileOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0"
	role="navigation"
	aria-label="Main Sidebar Navigation"
>
	<!-- Logo Section -->
	<a
		href="/dashboard"
		class="block p-8 mb-4 no-underline group"
		aria-label="Go to Dashboard"
	>
		<div class="flex items-center gap-4">
			<img
				src="/app_icon.png"
				alt="Smart E-VISION"
				class="w-12 h-12 rounded-2xl shadow-lg shadow-gov-blue/20 group-hover:scale-105 transition-transform"
			/>
			<div>
				<h1
					id="dashboard-title"
					class="text-lg font-black text-text-primary leading-none tracking-tighter"
				>
					Smart E-VISION
				</h1>
				<p
					class="text-[10px] text-text-muted font-bold uppercase tracking-[0.2em] mt-1"
				>
					System Hub
				</p>
			</div>
		</div>
	</a>

	<!-- Navigation -->
	<nav class="flex-1 px-4 overflow-y-auto" aria-label="Sidebar Menu">
		<ul class="space-y-2">
			{#each filteredItems as item}
				{@const Icon = item.icon}
				<li>
					<a
						href={item.href}
						class="flex items-center justify-between px-4 py-3 rounded-xl text-sm font-bold transition-all duration-200 group
							{isActive(item.href)
							? 'bg-gov-blue text-white shadow-lg shadow-gov-blue/10'
							: 'text-text-secondary hover:bg-surface-muted hover:text-gov-blue'}"
						aria-current={isActive(item.href) ? "page" : undefined}
						onclick={(e) => {
							if (item.onClick) {
								item.onClick(e);
							}
							mobileOpen = false;
						}}
					>
						<div class="flex items-center gap-3">
							<Icon
								size={20}
								strokeWidth={isActive(item.href) ? 2.5 : 2}
								aria-hidden="true"
							/>
							<span>{item.label}</span>
						</div>
						{#if isActive(item.href)}
							<ChevronRight size={16} aria-hidden="true" />
						{/if}
					</a>
				</li>
			{/each}
		</ul>
	</nav>

	<!-- Footer Info -->
	{#if $profile}
		<div
			class="p-6 border-t border-border-subtle bg-surface-muted/30"
			role="contentinfo"
			aria-label="User Profile Summary"
		>
			<div class="flex items-center gap-4 mb-4">
				<div
					class="w-11 h-11 rounded-2xl bg-gov-blue/10 flex items-center justify-center text-sm font-black text-gov-blue border-2 border-white shadow-sm"
					aria-hidden="true"
				>
					{$profile.full_name?.charAt(0) || "?"}
				</div>
				<div class="flex-1 min-w-0">
					<p class="text-sm font-black text-text-primary truncate">
						{$profile.full_name}
					</p>
					<p
						class="text-[10px] text-text-muted font-bold uppercase tracking-wider truncate"
					>
						{$profile.role}
					</p>
				</div>
			</div>
			<SyncStatus />
		</div>
	{/if}
</aside>

<!-- Mobile Bottom Nav -->
<nav
	class="lg:hidden fixed bottom-6 left-6 right-6 z-40 glass-card-static border border-white/40 shadow-2xl"
	aria-label="Mobile Navigation Bar"
>
	<div class="flex items-center justify-around p-2">
		{#each mobileNavItems as item}
			{@const MobileIcon = item.icon}
			<a
				href={item.href}
				class="flex flex-col items-center gap-1 p-2 rounded-xl transition-all duration-300 min-h-[48px] min-w-[48px]
					{isActive(item.href)
					? 'text-gov-blue bg-gov-blue/10 scale-110'
					: 'text-text-muted hover:text-gov-blue'}"
				aria-current={isActive(item.href) ? "page" : undefined}
				aria-label={item.label}
				onclick={(e) => {
					if (item.onClick) {
						item.onClick(e);
					}
					mobileOpen = false;
				}}
			>
				<MobileIcon
					size={22}
					strokeWidth={isActive(item.href) ? 2.5 : 2}
					aria-hidden="true"
				/>
				<span class="text-[9px] font-black uppercase tracking-tighter"
					>{item.label.split(" ")[0]}</span
				>
			</a>
		{/each}
	</div>
</nav>
