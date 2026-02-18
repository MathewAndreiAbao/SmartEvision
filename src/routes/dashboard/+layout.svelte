<script lang="ts">
    import Sidebar from "$lib/components/Sidebar.svelte";
    import { authLoading, profile, user } from "$lib/utils/auth";
    import { goto } from "$app/navigation";

    let { children } = $props();

    // Auth guard
    $effect(() => {
        if (!$authLoading && !$user) {
            goto("/auth/login");
        }
    });
</script>

<svelte:head>
    <title>Dashboard — Smart E-VISION</title>
</svelte:head>

{#if $authLoading}
    <!-- Loading skeleton -->
    <div class="min-h-screen gradient-mesh flex items-center justify-center">
        <div class="text-center animate-fade-in">
            <div
                class="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-deped-blue to-deped-blue-dark flex items-center justify-center text-white text-3xl font-bold shadow-elevated mb-4 animate-pulse-glow"
            >
                E
            </div>
            <p class="text-lg text-text-secondary font-medium">
                Loading Smart E-VISION...
            </p>
        </div>
    </div>
{:else if $user}
    <div class="min-h-screen bg-surface">
        <Sidebar />

        <!-- Main content area — pushed right to account for sidebar -->
        <main class="lg:ml-72 min-h-screen">
            <div class="p-6 lg:p-8 max-w-7xl mx-auto">
                {@render children()}
            </div>
        </main>
    </div>
{/if}
