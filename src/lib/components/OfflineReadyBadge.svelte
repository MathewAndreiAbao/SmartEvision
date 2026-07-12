<script lang="ts">
    import { onMount } from "svelte";
    import { verifyOfflineReadiness } from "$lib/utils/offline";
    import { profile } from "$lib/utils/auth";
    import { fade } from "svelte/transition";

    let ready = $state(false);
    let checking = $state(true);
    let missing: string[] = $state([]);

    async function checkReadiness() {
        if (!$profile) return;
        checking = true;
        const status = await verifyOfflineReadiness(
            $profile.id,
            $profile.district_id || undefined,
        );
        ready = status.ready;
        missing = status.missing;
        checking = false;
    }

    onMount(() => {
        checkReadiness();

        // Refresh when coming back online as pre-fetch might have triggered
        const handleOnline = () => {
            setTimeout(checkReadiness, 2000); // Give it time to sync
        };
        window.addEventListener("online", handleOnline);
        return () => window.removeEventListener("online", handleOnline);
    });

    // Re-check when profile is loaded
    $effect(() => {
        if ($profile) checkReadiness();
    });
</script>

{#if !checking}
    <div
        class="flex items-center gap-1.5 px-2 py-1 rounded-full border transition-all duration-500 {ready
            ? 'bg-gov-green/5 border-gov-green/20'
            : 'bg-gov-red/5 border-gov-red/20'}"
        title={ready
            ? "All systems ready for offline use"
            : `Missing offline data: ${missing.join(", ")}`}
        transition:fade
    >
        <div
            class="w-1.5 h-1.5 rounded-full {ready
                ? 'bg-gov-green animate-pulse'
                : 'bg-gov-red'}"
        ></div>
        <span
            class="text-[9px] font-bold uppercase tracking-wider {ready
                ? 'text-gov-green'
                : 'text-gov-red'}"
        >
            {ready ? "Offline Ready" : "Sync Pending"}
        </span>
    </div>
{/if}
