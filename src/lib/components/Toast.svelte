<script lang="ts">
	import { toasts, type ToastMessage } from '$lib/stores/toast';

	const icons: Record<ToastMessage['type'], string> = {
		success: '✓',
		error: '✕',
		info: 'ℹ',
		warning: '⚠'
	};

	const colors: Record<ToastMessage['type'], string> = {
		success: 'bg-deped-green text-white',
		error: 'bg-deped-red text-white',
		info: 'bg-deped-blue text-white',
		warning: 'bg-deped-gold text-text-primary'
	};
</script>

<div class="fixed top-6 right-6 z-[9999] flex flex-col gap-3 max-w-sm w-full pointer-events-none">
	{#each $toasts as toast (toast.id)}
		<div
			class="pointer-events-auto flex items-center gap-3 px-5 py-4 rounded-xl shadow-elevated animate-slide-up {colors[toast.type]}"
			role="alert"
		>
			<span class="text-xl font-bold flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-white/20">
				{icons[toast.type]}
			</span>
			<p class="text-sm font-medium flex-1">{toast.message}</p>
			<button
				class="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/20 transition-colors"
				onclick={() => toasts.remove(toast.id)}
				aria-label="Dismiss"
			>
				✕
			</button>
		</div>
	{/each}
</div>
