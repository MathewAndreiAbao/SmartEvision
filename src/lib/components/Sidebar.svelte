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
		section: string;
		mobileNav?: boolean;
		onClick?: (e: Event) => void;
	}

	const navItems: NavItem[] = [
		{
			href: "/dashboard",
			label: "Dashboard",
			icon: LayoutDashboard,
			section: "Overview",
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
			section: "Management",
			mobileNav: true,
			roles: ["Teacher", "School Head", "Master Teacher", "District Supervisor"],
		},
		{
			href: "/dashboard/archive",
			label: "Archive",
			icon: Archive,
			section: "Management",
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
			section: "Management",
			roles: ["Teacher"],
		},
		{
			href: "/dashboard/calendar",
			label: "Calendar",
			icon: Calendar,
			section: "Management",
			mobileNav: true,
			roles: [
				"Teacher",
				"School Head",
				"Master Teacher",
				"District Supervisor",
			],
		},
		{
			href: "/dashboard/monitoring/school",
			label: "School Monitor",
			icon: ShieldCheck,
			section: "Review",
			mobileNav: true,
			roles: ["School Head"],
		},
		{
			href: "/dashboard/monitoring/district",
			label: "District Monitor",
			icon: Map,
			section: "Review",
			mobileNav: true,
			roles: ["District Supervisor"],
		},
		{
			href: "/dashboard/analytics",
			label: "Analytics",
			icon: TrendingUp,
			section: "Review",
			roles: ["School Head", "District Supervisor"],
		},
		{
			href: "/dashboard/settings",
			label: "Settings",
			icon: Settings,
			section: "System",
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
			section: "System",
			roles: ["District Supervisor"],
		},
		{
			href: "#scan",
			label: "Scan Document",
			icon: QrCode,
			section: "Tools",
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

	const sectionOrder = ["Overview", "Management", "Review", "Tools", "System"];

	let mobileOpen = $state(false);

	const filteredItems = $derived(
		navItems.filter((item) => {
			const currentRole = $profile?.role?.toLowerCase() || "";
			return item.roles.some((r) =>
				currentRole.includes(r.toLowerCase().trim()),
			);
		}),
	);

	const groupedItems = $derived.by(() => {
		const groups: { section: string; items: NavItem[] }[] = [];
		for (const section of sectionOrder) {
			const items = filteredItems.filter((i) => i.section === section);
			if (items.length > 0) {
				groups.push({ section, items });
			}
		}
		return groups;
	});

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

	<!-- Navigation — Improved Styling -->
	<nav class="flex-1 overflow-y-auto px-4 py-5 cedims-scroll" aria-label="Sidebar Menu">
		{#each groupedItems as group}
			<div class="mb-6 last:mb-2">
				<p
					class="px-4 mb-2.5 text-[11px] font-bold uppercase tracking-[0.25em] text-text-muted"
					aria-hidden="true"
				>
					{group.section}
				</p>
				<ul class="space-y-1">
					{#each group.items as item}
						{@const Icon = item.icon}
						<li>
							<a
								href={item.href}
								class="flex items-center justify-between gap-3 rounded-lg px-4 py-3 text-sm font-semibold transition-all duration-200
									{isActive(item.href)
									? 'bg-gradient-to-r from-gov-blue to-gov-blue-vibrant text-white shadow-md'
									: 'text-text-secondary hover:bg-gov-blue/10 hover:text-gov-blue'}"
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
										strokeWidth={isActive(item.href) ? 2 : 1.75}
										aria-hidden="true"
										class="flex-shrink-0"
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
			</div>
		{/each}
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

<!-- Mobile Bottom Nav — Modern -->
<nav
	class="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-surface-white border-t border-border-subtle shadow-2xl"
	aria-label="Mobile Navigation Bar"
>
	<div class="flex items-center justify-around px-2 py-2">
		{#each mobileNavItems as item}
			{@const MobileIcon = item.icon}
			<a
				href={item.href}
				class="flex flex-col items-center justify-center gap-1 px-3 py-2.5 rounded-lg transition-all duration-200 min-h-[56px] min-w-[56px] flex-1
					{isActive(item.href)
					? 'text-gov-blue bg-gov-blue/10'
					: 'text-text-muted hover:bg-gov-blue/5 hover:text-gov-blue'}"
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
					strokeWidth={isActive(item.href) ? 2 : 1.5}
					aria-hidden="true"
				/>
				<span class="text-[10px] font-semibold"
					>{item.label.split(" ")[0]}</span
				>
			</a>
		{/each}
	</div>
</nav>
