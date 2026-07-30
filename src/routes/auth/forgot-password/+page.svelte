<script lang="ts">
    import { resetPasswordForEmail } from "$lib/utils/auth";
    import { addToast } from "$lib/stores/toast";
    import { Mail, ShieldCheck, ArrowLeft, ArrowRight } from "lucide-svelte";

    let email = $state("");
    let loading = $state(false);
    let sent = $state(false);
    let errorMsg = $state("");

    async function handleSubmit(e: Event) {
        e.preventDefault();
        if (!email) {
            errorMsg = "Please enter your email address.";
            return;
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            errorMsg = "Please enter a valid email address.";
            return;
        }

        loading = true;
        errorMsg = "";

        const result = await resetPasswordForEmail(email);

        if (result.error) {
            errorMsg = result.error;
            addToast("error", result.error);
        } else {
            sent = true;
            addToast("success", "Password reset link sent to your email.");
        }

        loading = false;
    }
</script>

<svelte:head>
    <title>Forgot Password — CEDIMS</title>
</svelte:head>

<div class="min-h-screen bg-gradient-to-br from-surface-muted via-surface-white to-gov-blue/5 px-4 py-8 sm:px-6 sm:py-10 lg:px-8 flex items-center justify-center">
    <div class="w-full max-w-md">
        <div class="rounded-2xl sm:rounded-3xl border border-border-subtle bg-surface-white/80 backdrop-blur-sm p-6 sm:p-8 shadow-lg">
            <div class="mb-5 sm:mb-6 text-center">
                <img src="/app_icon.png" alt="CEDIMS" class="mx-auto h-12 w-12 sm:h-14 sm:w-14 rounded-xl shadow-sm mb-3 sm:mb-4" />
                {#if sent}
                    <div class="inline-flex items-center gap-2 rounded-full bg-green-50 border border-green-200 px-3 py-1 mb-3">
                        <ShieldCheck size={14} class="text-green-600" />
                        <span class="text-[10px] font-semibold uppercase tracking-wider text-green-600">Email Sent</span>
                    </div>
                    <h2 class="text-lg sm:text-xl font-semibold text-text-primary">Check your inbox</h2>
                    <p class="mt-2 text-xs sm:text-sm text-text-secondary leading-relaxed">
                        We sent a password reset link to <strong class="text-text-primary">{email}</strong>.<br />
                        Click the link in the email to reset your password. It expires in 1 hour.
                    </p>
                    <div class="mt-6 pt-4 border-t border-slate-100">
                        <a href="/auth/login" class="inline-flex items-center gap-1.5 text-sm font-medium text-gov-blue hover:text-gov-blue-dark transition-colors">
                            <ArrowLeft size={14} />
                            Back to sign in
                        </a>
                    </div>
                {:else}
                    <h2 class="text-lg sm:text-xl font-semibold text-text-primary">Forgot password?</h2>
                    <p class="mt-1 text-xs sm:text-sm text-text-secondary">Enter your email and we'll send a reset link.</p>
                {/if}
            </div>

            {#if !sent}
                <form onsubmit={handleSubmit} class="space-y-4 sm:space-y-5">
                    <div>
                        <label for="email" class="mb-1 sm:mb-1.5 block text-xs sm:text-sm font-semibold text-text-secondary">Email Address</label>
                        <input id="email" type="email" bind:value={email} placeholder="your.email@deped.gov.ph" class="w-full rounded-xl border border-border-subtle px-3 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm outline-none focus:border-gov-blue focus:ring-2 focus:ring-gov-blue/10 transition-all" autocomplete="email" required />
                    </div>

                    {#if errorMsg}
                        <div class="rounded-xl border border-red-200 bg-red-50 p-2.5 sm:p-3 text-xs sm:text-sm font-medium text-red-600">{errorMsg}</div>
                    {/if}

                    <button type="submit" disabled={loading} class="w-full rounded-xl bg-gov-blue px-4 py-2.5 sm:py-3 text-xs sm:text-sm font-semibold text-white shadow-sm hover:bg-gov-blue-dark disabled:opacity-60 transition-all flex items-center justify-center gap-2">
                        {#if loading}
                            <span class="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white"></span>
                            Sending link...
                        {:else}
                            <Mail size={16} />
                            Send Reset Link
                        {/if}
                    </button>
                </form>

                <div class="mt-6 pt-4 border-t border-slate-100 text-center">
                    <a href="/auth/login" class="inline-flex items-center gap-1.5 text-sm font-medium text-text-muted hover:text-gov-blue transition-colors">
                        <ArrowLeft size={14} />
                        Back to sign in
                    </a>
                </div>
            {/if}
        </div>
    </div>
</div>
