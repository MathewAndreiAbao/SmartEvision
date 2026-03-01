<script lang="ts">
  import { fade } from "svelte/transition";

  interface Props {
    error?: Error | string | null;
    onretry?: () => void;
    children?: import("svelte").Snippet;
  }

  let { error = null, onretry, children }: Props = $props();

  function errorMessage(): string {
    if (!error) return "";
    if (typeof error === "string") return error;
    return error.message || "An unexpected error occurred";
  }
</script>

{#if error}
  <div
    class="glass-card-static p-8 my-6 border-l-4 border-gov-red"
    in:fade={{ duration: 300 }}
  >
    <div class="flex items-start gap-4">
      <span class="text-3xl flex-shrink-0 font-bold text-gov-red">!</span>
      <div class="flex-1">
        <h3 class="text-lg font-bold text-gov-red mb-1">
          Something went wrong
        </h3>
        <p class="text-sm text-text-secondary mb-4">
          {errorMessage()}
        </p>
        {#if onretry}
          <button
            onclick={onretry}
            class="px-5 py-2.5 bg-gradient-to-r from-gov-red to-red-700 text-white text-sm font-semibold rounded-xl shadow-md hover:shadow-lg transition-all min-h-[48px]"
          >
            Try Again
          </button>
        {/if}
      </div>
    </div>
  </div>
{:else if children}
  {@render children()}
{/if}
