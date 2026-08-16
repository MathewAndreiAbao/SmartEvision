<script lang="ts">
	import "../app.css";
	import Toast from "$lib/components/Toast.svelte";
	import QRScanner from "$lib/components/QRScanner.svelte";
	import ChatBot from "$lib/components/ChatBot.svelte";
	import { showQRScanner } from "$lib/stores/ui";
	import { goto } from "$app/navigation";
	import { initAuth, profile, authLoading } from "$lib/utils/auth";
	import CEDIMSLoader from "$lib/components/CEDIMSLoader.svelte";
	import {
		initOfflineSync,
		prefetchOfflineMetadata,
	} from "$lib/utils/offline";
	import { onMount } from "svelte";
	import { get } from "svelte/store";

	let { children } = $props();

	// Keeps the loader visible for at least a minimum duration on every refresh,
	// even when a cached profile unlocks the UI instantly (fast offline load).
	let initialLoadDone = $state(false);

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

	onMount(() => {
		const handleModuleError = (e: ErrorEvent) => {
			if (
				e.message?.includes(
					"Failed to fetch dynamically imported module",
				)
			) {
				console.warn("[v0] Build mismatch detected. Reloading...");
				window.location.reload();
			}
		};
		window.addEventListener("error", handleModuleError);

		(async () => {
			// Initialize auth first
			try {
				await initAuth();
			} catch (err) {
				console.error("[v0] Failed to initialize auth:", err);
			}

			// Then initialize offline sync
			initOfflineSync();

			// Pre-fetch metadata if online (Phase 20.4)
			const user = get(profile);
			if (user && user.id) {
				prefetchOfflineMetadata(user.id, user.district_id || undefined);
			}

			// Defer service worker registration
			setTimeout(() => {
				if ("serviceWorker" in navigator && import.meta.env.PROD) {
					try {
						navigator.serviceWorker
							.register("/service-worker.js")
							.then(
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
						console.error(
							"Service Worker registration error:",
							error,
						);
					}
				}
			}, 2000);
		})();

		// Ensure the loader is perceivable on refresh by holding it for a floor duration.
		const minLoaderTimer = setTimeout(() => {
			initialLoadDone = true;
		}, 900);

		return () => {
			clearTimeout(minLoaderTimer);
			window.removeEventListener("error", handleModuleError);
		};
	});
</script>

<svelte:head>
	<title>CEDIMS · Powered by Smart E-VISION</title>
</svelte:head>

<Toast />

{#if $showQRScanner}
	<QRScanner onScan={handleScan} onClose={() => showQRScanner.set(false)} />
{/if}

<!-- Global full-screen loader: initial load / refresh (min duration).
     Per-tab navigation is handled by the dashboard layout loader. -->
{#if $authLoading || !initialLoadDone}
	<div class="cedims-global-loader" role="status" aria-label="Loading CEDIMS">
		<CEDIMSLoader label="Loading CEDIMS..." />
	</div>
{/if}

<ChatBot />

{@render children()}
