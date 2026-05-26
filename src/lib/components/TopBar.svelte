<script lang="ts">
    import NotificationCenter from "./NotificationCenter.svelte";
    import OfflineReadyBadge from "./OfflineReadyBadge.svelte";
    import { profile } from "$lib/utils/auth";
    import { fade } from "svelte/transition";
</script>

<header
    class="sticky top-0 z-30 flex h-14 w-full items-center justify-between border-b border-border-subtle bg-white/80 px-4 sm:px-6 pl-14 lg:pl-6 backdrop-blur-md"
    in:fade={{ duration: 300 }}
>
    <div class="flex items-center gap-2 lg:hidden">
        <h1
            class="text-xs font-bold text-text-primary tracking-tight uppercase"
        >
            Smart E-VISION
        </h1>
    </div>
    <div class="hidden lg:block"></div>

    <div class="flex items-center gap-4">
        <NotificationCenter />

        <div class="h-8 w-px bg-border-subtle mx-1"></div>

        <div class="flex items-center gap-2.5">
            {#if $profile?.avatar_url}
                <img 
                    src={$profile.avatar_url} 
                    alt={$profile.full_name} 
                    class="h-8 w-8 rounded-full border border-border-subtle object-cover"
                />
            {:else}
                <div
                    class="h-8 w-8 rounded-full bg-gov-blue/5 border border-gov-blue/10 flex items-center justify-center text-[10px] font-bold text-gov-blue uppercase"
                >
                    {$profile?.full_name?.charAt(0) || "U"}
                </div>
            {/if}
        </div>
    </div>
</header>
