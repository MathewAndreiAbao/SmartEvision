<script lang="ts">
    import { profile, authLoading } from "$lib/utils/auth";
    import { goto } from "$app/navigation";
    import { onMount } from "svelte";
    import { ArrowRight } from "lucide-svelte";
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
    <!-- Navbar -->
    <nav
        class="w-full px-6 py-4 border-b border-border-subtle flex items-center justify-between bg-white"
    >
        <div class="flex items-center gap-2">
            <img
                src="/app_icon.png"
                alt="Smart E-VISION"
                class="w-8 h-8 rounded-md"
            />
            <div class="flex flex-col">
                <span class="text-sm font-bold text-text-primary"
                    >Smart E-VISION</span
                >
                <span
                    class="text-[10px] uppercase tracking-wide font-medium text-gov-blue"
                    >Document Hub</span
                >
            </div>
        </div>

        <div>
            {#if !$authLoading}
                {#if $profile}
                    <button
                        onclick={() => goto("/dashboard")}
                        class="text-sm font-medium text-gov-blue hover:text-gov-blue-dark transition-colors"
                    >
                        Go to Dashboard
                    </button>
                {:else}
                    <div class="flex items-center gap-3">
                        <button
                            onclick={() => goto("/auth/login")}
                            class="text-sm font-medium text-text-secondary hover:text-gov-blue transition-colors px-4 py-2"
                        >
                            Sign In
                        </button>
                        <button
                            onclick={() => goto("/auth/login")}
                            class="gov-btn-primary"
                        >
                            Get Started
                        </button>
                    </div>
                {/if}
            {/if}
        </div>
    </nav>

    <!-- Hero -->
    <main
        class="flex-grow flex flex-col items-center justify-center px-6 text-center"
    >
        <div in:fly={{ y: 15, duration: 500 }} class="max-w-2xl">
            <div
                class="inline-block px-2.5 py-1 rounded-md bg-gov-blue/5 text-gov-blue text-xs font-medium uppercase tracking-wide mb-5"
            >
                DepEd Calapan City
            </div>

            <h1
                class="text-3xl md:text-4xl font-bold text-text-primary leading-tight mb-6"
            >
                Official Document
                <span class="text-gov-blue">Transparency</span> Portal
            </h1>

            <p
                class="text-base text-text-secondary mb-8 max-w-lg mx-auto leading-relaxed"
            >
                A unified hub for teachers, school heads, and district
                supervisors for secure document management and compliance
                tracking.
            </p>

            <div
                class="flex flex-col sm:flex-row items-center justify-center gap-4"
            >
                <button
                    onclick={() => goto("/auth/login")}
                    class="gov-btn-primary text-base px-8 py-3"
                >
                    Access Portal
                    <ArrowRight size={18} />
                </button>
                <div
                    class="text-text-muted text-xs font-medium uppercase tracking-wide"
                >
                    Restricted Access Hub
                </div>
            </div>
        </div>
    </main>

    <!-- Footer -->
    <footer
        class="w-full px-6 py-6 border-t border-border-subtle flex flex-col md:flex-row items-center justify-between gap-3"
    >
        <p class="text-xs text-text-muted font-medium">
            © 2026 Smart E-VISION Hub
        </p>
        <div class="flex items-center gap-4">
            <span class="text-xs text-text-muted font-medium"
                >Public Portal</span
            >
            <span
                class="text-xs text-text-muted font-medium px-2 py-0.5 border border-border-subtle rounded-md"
                >v1.2 Pilot</span
            >
        </div>
    </footer>
</div>
