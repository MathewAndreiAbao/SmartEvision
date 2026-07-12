<script lang="ts">
	import "../app.css";
	import Toast from "$lib/components/Toast.svelte";
	import QRScanner from "$lib/components/QRScanner.svelte";
	import ChatBot from "$lib/components/ChatBot.svelte";</svelte:head>

<Toast />

{#if $showQRScanner}
	<QRScanner onScan={handleScan} onClose={() => showQRScanner.set(false)} />
{/if}

<ChatBot />
{@render children()}
