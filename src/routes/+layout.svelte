<script lang="ts">
	import "../app.css";
	import Toast from "$lib/components/Toast.svelte";
	import QRScanner from "$lib/components/QRScanner.svelte";
	import { showQRScanner } from "$lib/stores/ui";
	import { goto } from "$app/navigation";
	import { initAuth } from "$lib/utils/auth";
	import { initOfflineSync } from "$lib/utils/offline";
	import { onMount } from "svelte";

	let { children } = $props();

	function handleScan(data: string) {
		if (data.includes("/verify/")) {
			const hash = data.split("/verify/").pop();
			if (hash) {
				goto(`/verify/${hash}`);
				showQRScanner.set(false);
			}
		} else {
			// Fallback for non-verify QR codes
			console.log(`[QR] Scanned data:`, data);
		}
	}

	onMount(async () => {
		// Initialize auth first
		try {
			await initAuth();
		} catch (err) {
			console.error("[v0] Failed to initialize auth:", err);
		}

		// Then initialize offline sync
		initOfflineSync();

		// Defer service worker registration to prevent interference with auth
		// Use a longer timeout to ensure auth is fully initialized
		setTimeout(() => {
			if ("serviceWorker" in navigator && import.meta.env.PROD) {
				try {
					navigator.serviceWorker.register("/service-worker.js").then(
						(registration) => {
							console.log(
								"Service Worker registered:",
								registration,
							);
						},
						(error) => {
							console.error(
								"Service Worker registration failed:",
								error,
							);
						},
					);
				} catch (error) {
					console.error("Service Worker registration error:", error);
				}
			}
		}, 2000);
	});
</script>

<svelte:head>
	<title>Smart E-VISION</title>
</svelte:head>

<Toast />

{#if $showQRScanner}
	<QRScanner onScan={handleScan} onClose={() => showQRScanner.set(false)} />
{/if}

{@render children()}
