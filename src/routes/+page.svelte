<script lang="ts">
    import { profile, authLoading } from "$lib/utils/auth";
    import { goto } from "$app/navigation";
    import { onMount } from "svelte";
    import { ShieldCheck, ArrowRight } from "lucide-svelte";
    import { fade, fly } from "svelte/transition";

    onMount(() => {
        // Automatic redirection for authenticated users
        const unsubscribe = profile.subscribe((p) => {
            if (p) {
                goto("/dashboard");
            }
        });

        return unsubscribe;
    });
</script>

<svelte:head>
    <title>Smart E-vision Instructional Supervision</title>
</svelte:head>

<div class="min-h-screen bg-white flex flex-col items-center justify-center px-6 font-sans">
    <!-- Logo and System Name -->
    <div class="mb-8">
        <div class="w-16 h-16 rounded-2xl bg-gov-blue flex items-center justify-center text-white mb-4 mx-auto shadow-lg shadow-gov-blue/20">
            <ShieldCheck size={32} />
        </div>
        <h1 class="text-3xl font-black text-text-primary text-center tracking-tight">
            Smart E-vision
        </h1>
        <p class="text-sm font-bold uppercase tracking-widest text-gov-blue text-center mt-2">
            Instructional Supervision
        </p>
    </div>

    <!-- Login Button -->
    <div class="flex flex-col items-center gap-4">
        {#if !$authLoading}
            {#if $profile}
                <button
                    onclick={() => goto("/dashboard")}
                    class="px-8 py-3 rounded-full bg-gov-blue text-white font-bold shadow-lg shadow-gov-blue/20 hover:bg-gov-blue-dark transition-all"
                >
                    Go to Dashboard
                </button>
            {:else}
                <button
                    onclick={() => goto("/auth/login")}
                    class="px-8 py-3 rounded-full bg-gov-blue text-white font-bold shadow-lg shadow-gov-blue/20 hover:bg-gov-blue-dark transition-all flex items-center gap-2"
                >
                    Sign In
                    <ArrowRight size={18} />
                </button>
            {/if}
        {/if}
    </div>
</div>

<style>
    :global(html) {
        scroll-behavior: smooth;
    }
</style>
