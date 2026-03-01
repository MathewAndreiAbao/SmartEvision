<script lang="ts">
	import { toasts, type ToastMessage } from "$lib/stores/toast";
	import {
		CheckCircle,
		AlertCircle,
		Info,
		AlertTriangle,
		X,
	} from "lucide-svelte";

	const icons: Record<ToastMessage["type"], any> = {
		success: CheckCircle,
		error: AlertCircle,
		info: Info,
		warning: AlertTriangle,
	};

	const colors: Record<ToastMessage["type"], string> = {
		success: "bg-gov-green text-white shadow-gov-green/20",
		error: "bg-gov-red text-white shadow-gov-red/20",
		info: "bg-gov-blue text-white shadow-gov-blue/20",
		warning: "bg-gov-gold text-white shadow-gov-gold/20",
	};
</script>

<div
	class="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 max-w-sm w-full pointer-events-none"
>
	{#each $toasts as toast (toast.id)}
		<div
			class="pointer-events-auto flex items-center gap-4 px-5 py-4 rounded-xl shadow-elevated animate-pop {colors[
				toast.type
			]}"
			role="alert"
		>
			<div
				class="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-full bg-white/20 backdrop-blur-sm"
			>
				<svelte:component this={icons[toast.type]} size={20} />
			</div>
			<div class="flex-1 min-w-0">
				<p class="text-sm font-bold tracking-tight">
					{toast.type.toUpperCase()}
				</p>
				<p class="text-xs font-medium opacity-90 truncate">
					{toast.message}
				</p>
			</div>
			<button
				class="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/20 transition-all active:scale-95"
				onclick={() => toasts.remove(toast.id)}
				aria-label="Dismiss"
			>
				<X size={16} />
			</button>
		</div>
	{/each}
</div>
