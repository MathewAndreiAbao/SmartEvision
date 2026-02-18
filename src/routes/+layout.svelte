<script lang="ts">
	import "../app.css";
	import Toast from "$lib/components/Toast.svelte";
	import { initAuth } from "$lib/utils/auth";
	import { initOfflineSync } from "$lib/utils/offline";
	import { onMount } from "svelte";

	let { children } = $props();

	onMount(async () => {
		initAuth();
		initOfflineSync();

		// Register Service Worker
		if ("serviceWorker" in navigator && import.meta.env.PROD) {
			try {
				const registration =
					await navigator.serviceWorker.register(
						"/service-worker.js",
					);
				console.log("Service Worker registered:", registration);
			} catch (error) {
				console.error("Service Worker registration failed:", error);
			}
		}
	});
</script>

<svelte:head>
	<title>Smart E-VISION — Instructional Supervision Archiving</title>
</svelte:head>

<Toast />
{@render children()}
