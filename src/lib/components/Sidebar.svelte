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
		section: string;			mobileNav: true,
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
			section: "Management",			mobileNav: true,
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
			roles: ["School Head"],		},
		{
			href: "/dashboard/monitoring/district",
			label: "District Monitor",
			icon: Map,
			section: "Review",		},
		{
			href: "/dashboard/settings",
			label: "Settings",
			icon: Settings,
			section: "System",			roles: ["District Supervisor"],
		},
		{
			href: "#scan",
			label: "Scan Document",
			icon: QrCode,
			section: "Tools",	let mobileOpen = $state(false);

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
		onclick={() => (mobileOpen = false)}
		role="presentation"
	></div>
{/if}

<!-- Sidebar -->
<aside
	class="fixed top-0 left-0 h-full w-64 z-50 flex flex-col bg-surface-white border-r border-border-subtle shadow-sm transition-transform duration-300 ease-smooth		{mobileOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0"
	role="navigation"
	aria-label="Main Sidebar Navigation"
>
	<!-- Logo Section -->
	<a
		href="/dashboard"
		class="block border-b border-border-subtle px-5 py-5 no-underline"		aria-label="Go to Dashboard"
	>
		<div class="flex items-center gap-3">
			<img
				src="/app_icon.png"
				alt="CEDIMS"
				class="h-10 w-10 rounded-lg"			/>
			<div>
				<h1
					id="dashboard-title"
					class="text-sm font-semibold text-text-primary leading-tight"
				>
					CEDIMS
				</h1>
				<p
					class="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.25em] text-gov-blue"
				>
					Monitoring Hub				</p>
			</div>
		</div>
	</a>

	<!-- Navigation -->
	<nav class="flex-1 overflow-y-auto px-3 py-3" aria-label="Sidebar Menu">
		{#each groupedItems as group}
			<div class="mb-4 last:mb-0">
				<p
					class="px-3 mb-1 text-[10px] font-bold uppercase tracking-[0.2em] text-text-muted"
					aria-hidden="true"
				>
					{group.section}
				</p>
				<ul class="space-y-0.5">
					{#each group.items as item}
						{@const Icon = item.icon}
						<li>
							<a
								href={item.href}
								class="flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium transition-colors duration-150
									{isActive(item.href)
									? 'bg-gov-blue text-white shadow-sm'
									: 'text-text-secondary hover:bg-surface-muted hover:text-text-primary'}"
								aria-current={isActive(item.href) ? "page" : undefined}
								onclick={(e) => {
									if (item.onClick) {
										item.onClick(e);
									}
									mobileOpen = false;
								}}
							>
								<div class="flex items-center gap-2.5">
									<Icon
										size={18}
										strokeWidth={isActive(item.href) ? 1.75 : 1.5}
										aria-hidden="true"
									/>
									<span>{item.label}</span>
								</div>
								{#if isActive(item.href)}
									<ChevronRight
										size={14}
										strokeWidth={1.5}
										aria-hidden="true"
									/>
								{/if}
							</a>
						</li>
					{/each}
				</ul>
			</div>
		{/each}	</nav>

	<!-- Footer Info -->
	{#if $profile}
		<div
			class="border-t border-border-subtle px-4 py-4"			role="contentinfo"
			aria-label="User Profile Summary"
		>
			<div class="flex items-center gap-3 mb-3">
				{#if $profile.avatar_url}
					<img 
						src={$profile.avatar_url} 
						alt={$profile.full_name} 
						class="w-8 h-8 rounded-md border border-border-subtle object-cover"
					/>
				{:else}
					<div
						class="w-8 h-8 rounded-md bg-gov-blue/10 flex items-center justify-center text-xs font-semibold text-gov-blue"
						aria-hidden="true"
					>
						{$profile.full_name?.charAt(0) || "?"}
					</div>
				{/if}
				<div class="flex-1 min-w-0">
					<p class="truncate text-sm font-semibold text-text-primary">
						{$profile.full_name}
					</p>
					<p
						class="truncate text-[10px] font-semibold uppercase tracking-[0.2em] text-text-secondary"					>
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
	class="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-surface-white border-t border-border-subtle"	aria-label="Mobile Navigation Bar"
>
	<div class="flex items-center justify-around px-1 py-1.5">
		{#each mobileNavItems as item}
			{@const MobileIcon = item.icon}
			<a
				href={item.href}
				class="flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-md transition-colors duration-150 min-h-[44px] min-w-[44px]
					{isActive(item.href)
					? 'text-gov-blue bg-gov-blue/5'
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
					size={20}
					strokeWidth={isActive(item.href) ? 1.75 : 1.5}
					aria-hidden="true"
				/>
				<span class="text-[9px] font-medium"
					>{item.label.split(" ")[0]}</span
				>
			</a>
		{/each}
	</div>
</nav>
