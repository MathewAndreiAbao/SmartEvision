<script lang="ts">
	import { page } from "$app/stores";
	import { profile } from "$lib/utils/auth";
	import SyncStatus from "./SyncStatus.svelte";

	interface NavItem {
		href: string;
		label: string;
		icon: string;
		roles: string[];
	}

	const navItems: NavItem[] = [
		{
			href: "/dashboard",
			label: "Dashboard",
			icon: "📊",
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
			icon: "📤",
			roles: ["Teacher"],
		},
		{
			href: "/dashboard/archive",
			label: "Archive",
			icon: "🗄️",
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
			icon: "📚",
			roles: ["Teacher"],
		},
		{
			href: "/dashboard/monitoring/school",
			label: "School Monitor",
			icon: "🏫",
			roles: ["School Head", "Master Teacher"],
		},
		{
			href: "/dashboard/monitoring/district",
			label: "District Monitor",
			icon: "🌐",
			roles: ["District Supervisor"],
		},
		{
			href: "/dashboard/analytics",
			label: "Analytics",
			icon: "📈",
			roles: ["School Head", "Master Teacher", "District Supervisor"],
		},
		{
			href: "/dashboard/settings",
			label: "Settings",
			icon: "⚙️",
			roles: [
				"Teacher",
				"School Head",
				"Master Teacher",
				"District Supervisor",
			],
		},
	];

	let mobileOpen = $state(false);

	const filteredItems = $derived(
		navItems.filter((item) => {
			const role = $profile?.role;
			return role ? item.roles.includes(role) : false;
		}),
	);

	function isActive(href: string): boolean {
		const currentPath = $page.url.pathname;
		if (href === "/dashboard") return currentPath === "/dashboard";
		return currentPath.startsWith(href);
	}
</script>

<!-- Mobile Toggle -->
<button
	class="lg:hidden fixed top-4 left-4 z-50 w-12 h-12 flex items-center justify-center rounded-xl glass-card text-xl"
	onclick={() => (mobileOpen = !mobileOpen)}
	aria-label="Toggle menu"
>
	{mobileOpen ? "✕" : "☰"}
</button>

<!-- Backdrop for mobile -->
{#if mobileOpen}
	<div
		class="lg:hidden fixed inset-0 bg-black/30 backdrop-blur-sm z-40"
		onclick={() => (mobileOpen = false)}
		role="presentation"
	></div>
{/if}

<!-- Sidebar -->
<aside
	class="fixed top-0 left-0 h-full w-72 z-50 flex flex-col bg-white/70 backdrop-blur-2xl border-r border-white/30 shadow-glass transition-transform duration-300 ease-smooth
		{mobileOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0"
>
	<!-- Logo -->
	<div class="p-6 pb-4 border-b border-white/20">
		<div class="flex items-center gap-3">
			<div
				class="w-11 h-11 rounded-xl bg-gradient-to-br from-deped-blue to-deped-blue-dark flex items-center justify-center text-white text-xl font-bold shadow-md"
			>
				E
			</div>
			<div>
				<h1 class="text-lg font-bold text-text-primary leading-tight">
					Smart E-VISION
				</h1>
				<p class="text-xs text-text-muted">Instructional Supervision</p>
			</div>
		</div>
	</div>

	<!-- Navigation -->
	<nav class="flex-1 p-4 overflow-y-auto">
		<ul class="space-y-1.5">
			{#each filteredItems as item}
				<li>
					<a
						href={item.href}
						class="flex items-center gap-3 px-4 py-3 rounded-xl text-base font-medium transition-all duration-200 min-h-[48px]
							{isActive(item.href)
							? 'bg-deped-blue text-white shadow-md'
							: 'text-text-secondary hover:bg-glass-blue hover:text-deped-blue'}"
						onclick={() => (mobileOpen = false)}
					>
						<span class="text-xl w-7 text-center flex-shrink-0"
							>{item.icon}</span
						>
						<span>{item.label}</span>
					</a>
				</li>
			{/each}
		</ul>
	</nav>

	<!-- User Info -->
	{#if $profile}
		<div class="p-4 border-t border-white/20">
			<div class="flex items-center gap-3 px-3 py-2">
				<div
					class="w-10 h-10 rounded-full bg-gradient-to-br from-deped-gold to-deped-gold-dark flex items-center justify-center text-sm font-bold text-text-primary"
				>
					{$profile.full_name?.charAt(0) || "?"}
				</div>
				<div class="flex-1 min-w-0">
					<p class="text-sm font-semibold text-text-primary truncate">
						{$profile.full_name}
					</p>
					<p class="text-xs text-text-muted truncate">
						{$profile.role}
					</p>
				</div>
			</div>
		</div>

		<SyncStatus />
	{/if}
</aside>
