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
		success: "bg-gov-green text-white",
		error: "bg-gov-red text-white",
		info: "bg-gov-blue text-white",
		warning: "bg-gov-gold text-white",
	};
</script>

<div
	class="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 max-w-sm w-full pointer-events-none"
>
	{#each $toasts as toast (toast.id)}
		<div
			class="pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-md shadow-sm {colors[
				toast.type
			]}"
			role="alert"
		>
			<div
				class="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-md bg-white/15"
			>
				<svelte:component this={icons[toast.type]} size={18} />
			</div>
			<div class="flex-1 min-w-0">
				<p class="text-sm font-semibold">
					{toast.type.charAt(0).toUpperCase() + toast.type.slice(1)}
				</p>
				<p class="text-xs font-normal opacity-90 truncate">
					{toast.message}
				</p>
			</div>
			<button
				class="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-md hover:bg-white/15 transition-colors"
				onclick={() => toasts.remove(toast.id)}
				aria-label="Dismiss"
			>
				<X size={14} />
			</button>
		</div>
	{/each}
</div>
