<script lang="ts">
	import { supabase } from '$lib/utils/supabase';
	import { onMount } from 'svelte';

	let loading = false;
	let calendar: any[] = [];
	
	// Form state
	let schoolYear = '2025-2026';
	let quarter = 1;
	let weekNumber = 1;
	let deadlineDate = '';
	let description = '';

	async function fetchCalendar() {
		const { data, error } = await supabase
			.from('academic_calendar')
			.select('*')
			.order('week_number', { ascending: true });
		
		if (!error) calendar = data;
	}

	async function addDeadline() {
		loading = true;
		// Note: In a real app, we'd get the district_id from the user's profile
		// For this "fresh start" we'll assume the supervisor is linked to the seeded district
		const { data: profile } = await supabase.auth.getUser();
		const { data: profData } = await supabase.from('profiles').select('district_id').eq('id', profile.user?.id).single();

		const { error } = await supabase.from('academic_calendar').insert({
			district_id: profData?.district_id,
			school_year: schoolYear,
			quarter,
			week_number: weekNumber,
			deadline_date: deadlineDate,
			description
		});

		if (!error) {
			await fetchCalendar();
			description = '';
			weekNumber++;
		} else {
			alert(error.message);
		}
		loading = false;
	}

	onMount(fetchCalendar);
</script>

<div class="p-8 max-w-4xl mx-auto">
	<header class="mb-8">
		<h1 class="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
			Academic Calendar Management
		</h1>
		<p class="text-slate-500">Set submission deadlines for the district.</p>
	</header>

	<!-- Add Deadline Form -->
	<section class="bg-white/80 backdrop-blur-md border border-slate-200 rounded-2xl p-6 shadow-sm mb-8">
		<h2 class="text-xl font-semibold mb-4 text-slate-800">Add New Deadline</h2>
		<form on:submit|preventDefault={addDeadline} class="grid grid-cols-1 md:grid-cols-2 gap-4">
			<div>
				<label class="block text-sm font-medium text-slate-600 mb-1">School Year</label>
				<input type="text" bind:value={schoolYear} class="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none" />
			</div>
			<div>
				<label class="block text-sm font-medium text-slate-600 mb-1">Quarter</label>
				<select bind:value={quarter} class="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none">
					<option value={1}>Quarter 1</option>
					<option value={2}>Quarter 2</option>
					<option value={3}>Quarter 3</option>
					<option value={4}>Quarter 4</option>
				</select>
			</div>
			<div>
				<label class="block text-sm font-medium text-slate-600 mb-1">Week Number</label>
				<input type="number" bind:value={weekNumber} min="1" max="52" class="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none" />
			</div>
			<div>
				<label class="block text-sm font-medium text-slate-600 mb-1">Deadline Date</label>
				<input type="date" bind:value={deadlineDate} class="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none" />
			</div>
			<div class="md:col-span-2">
				<label class="block text-sm font-medium text-slate-600 mb-1">Description</label>
				<input type="text" bind:value={description} placeholder="e.g., Week 1 DLL Submission" class="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none" />
			</div>
			<div class="md:col-span-2 mt-2">
				<button type="submit" disabled={loading} class="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-all shadow-lg shadow-blue-200 disabled:opacity-50">
					{loading ? 'Saving...' : 'Add to Calendar'}
				</button>
			</div>
		</form>
	</section>

	<!-- Calendar List -->
	<section class="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
		<table class="w-full text-left border-collapse">
			<thead class="bg-slate-50 border-b border-slate-200">
				<tr>
					<th class="px-6 py-4 text-sm font-semibold text-slate-700">Week</th>
					<th class="px-6 py-4 text-sm font-semibold text-slate-700">Quarter</th>
					<th class="px-6 py-4 text-sm font-semibold text-slate-700">Deadline</th>
					<th class="px-6 py-4 text-sm font-semibold text-slate-700">Status</th>
				</tr>
			</thead>
			<tbody class="divide-y divide-slate-100">
				{#each calendar as entry}
					<tr class="hover:bg-slate-50 transition-colors">
						<td class="px-6 py-4 text-slate-700 font-medium">Week {entry.week_number}</td>
						<td class="px-6 py-4 text-slate-600">Q{entry.quarter}</td>
						<td class="px-6 py-4 text-slate-600">{new Date(entry.deadline_date).toLocaleDateString()}</td>
						<td class="px-6 py-4">
							<span class="px-2 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700">Active</span>
						</td>
					</tr>
				{:else}
					<tr>
						<td colspan="4" class="px-6 py-12 text-center text-slate-400">No deadlines set yet.</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</section>
</div>
