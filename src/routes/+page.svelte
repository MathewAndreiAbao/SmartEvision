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
    <title>Smart E-VISION — Official Portal</title>
</svelte:head>

<div
    class="min-h-screen bg-white flex flex-col font-sans selection:bg-gov-blue/10 selection:text-gov-blue"
>
    <!-- Simple Navbar -->
    <nav
        class="w-full px-8 py-6 border-b border-gray-100 flex items-center justify-between"
    >
        <div class="flex items-center gap-2">
            <div
                class="w-10 h-10 rounded-xl bg-gov-blue flex items-center justify-center text-white shadow-lg shadow-gov-blue/20"
            >
                <ShieldCheck size={24} />
            </div>
            <div class="flex flex-col">
                <span
                    class="text-lg font-black tracking-tight text-text-primary"
                    >Smart E-VISION</span
                >
                <span
                    class="text-[10px] uppercase tracking-[0.2em] font-bold text-gov-blue"
                    >Educational Hub</span
                >
            </div>
        </div>

        <div>
            {#if !$authLoading}
                {#if $profile}
                    <button
                        onclick={() => goto("/dashboard")}
                        class="text-sm font-bold text-gov-blue hover:underline"
                    >
                        Go to Dashboard
                    </button>
                {:else}
                    <div class="flex items-center gap-4">
                        <button
                            onclick={() => goto("/auth/login")}
                            class="text-sm font-bold text-text-primary hover:text-gov-blue transition-colors px-6 py-2"
                        >
                            Sign In
                        </button>
                        <button
                            onclick={() => goto("/auth/login")}
                            class="px-6 py-2 rounded-full bg-gov-blue text-white text-sm font-bold shadow-lg shadow-gov-blue/20 hover:bg-gov-blue-dark transition-all"
                        >
                            Get Started
                        </button>
                    </div>
                {/if}
            {/if}
        </div>
    </nav>

    <!-- Simple Hero -->
    <main
        class="flex-grow flex flex-col items-center justify-center px-6 text-center"
    >
        <div in:fly={{ y: 20, duration: 800 }} class="max-w-3xl">
            <div
                class="inline-block px-3 py-1 rounded-full bg-gov-blue/5 text-gov-blue text-[10px] font-black uppercase tracking-[0.2em] mb-6"
            >
                DepEd Calapan City
            </div>

            <h1
                class="text-5xl md:text-6xl font-black text-text-primary tracking-tight leading-tight mb-8"
            >
                Official Document <br />
                <span class="text-gov-blue">Transparency</span> Portal.
            </h1>

            <p
                class="text-xl text-text-secondary mb-12 max-w-xl mx-auto leading-relaxed font-medium"
            >
                A unified hub for teachers, school heads, and district
                supervisors for secure document management and compliance
                tracking.
            </p>

            <div
                class="flex flex-col sm:flex-row items-center justify-center gap-6"
            >
                <button
                    onclick={() => goto("/auth/login")}
                    class="w-full sm:w-auto px-10 py-4 rounded-full bg-gov-blue text-white text-lg font-black shadow-xl shadow-gov-blue/30 hover:bg-gov-blue-dark transition-all flex items-center justify-center gap-2"
                >
                    Access Portal
                    <ArrowRight size={20} />
                </button>
                <div
                    class="text-text-muted text-xs font-black uppercase tracking-widest"
                >
                    Restricted Access Hub
                </div>
            </div>
        </div>
    </main>

    <!-- Simple Footer -->
    <footer
        class="w-full px-8 py-10 border-t border-gray-100 flex flex-col md:flex-row items-center justify-between gap-4"
    >
        <p
            class="text-[10px] text-text-muted font-black uppercase tracking-[0.2em]"
        >
            © 2026 Smart E-VISION Hub
        </p>
        <div class="flex items-center gap-6">
            <span
                class="text-[10px] text-text-muted font-black uppercase tracking-widest"
                >Public Portal</span
            >
            <span
                class="text-[10px] text-text-muted font-black uppercase tracking-widest px-2 py-0.5 border border-gray-200 rounded"
                >v1.2 Pilot</span
            >
        </div>
    </footer>
</div>

<style>
    :global(html) {
        scroll-behavior: smooth;
    }
</style>
