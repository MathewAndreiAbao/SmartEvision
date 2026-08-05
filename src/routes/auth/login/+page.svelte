<script lang="ts">
    import {
        signIn,
        getRoleDashboardPath,
        profile,
        authLoading,
    } from "$lib/utils/auth";
    import { addToast } from "$lib/stores/toast";
    import { goto } from "$app/navigation";
    import { Lock, ShieldCheck, ArrowLeft, Eye, EyeOff } from "lucide-svelte";

    let email = $state("");
    let password = $state("");
    let loading = $state(false);
    let errorMsg = $state("");
    let showPassword = $state(false);

    $effect(() => {
        if (!$authLoading && $profile) {
            goto(getRoleDashboardPath($profile.role));
        }
    });

    async function handleSubmit(e: Event) {
        e.preventDefault();
        if (!email || !password) {
            errorMsg = "Please enter both email and password.";
            return;
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            errorMsg = "Please enter a valid email address.";
            return;
        }
        if (password.length < 6) {
            errorMsg = "Password must be at least 6 characters.";
            return;
        }

        loading = true;
        errorMsg = "";

        const result = await signIn(email, password);

        if (result.error) {
            errorMsg = result.error;
            addToast("error", result.error);
        } else {
            addToast("success", "Welcome to CEDIMS.");
        }

        loading = false;
    }
</script>

<svelte:head>
    <title>Sign In — CEDIMS · Powered by Smart E-VISION</title>
</svelte:head>

<div class="min-h-screen bg-gradient-to-br from-surface-muted via-surface-white to-gov-blue/5 px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
    <div class="mx-auto flex max-w-6xl flex-col gap-6 sm:gap-8 lg:flex-row lg:items-center lg:justify-between">
        <div class="max-w-xl space-y-4 sm:space-y-6">
            <div class="inline-flex items-center gap-2 rounded-full border border-gov-blue/10 bg-gov-blue/5 px-2.5 sm:px-3 py-1 text-[10px] sm:text-xs font-semibold uppercase tracking-[0.25em] text-gov-blue">
                <ShieldCheck size={12} class="sm:size-[14]" />
                DepEd Calapan East District
            </div>
            <div>
                <h1 class="text-3xl sm:text-4xl lg:text-5xl font-semibold leading-tight text-text-primary">
                    Instructional monitoring,<br class="hidden sm:block" />made clearer.
                </h1>
                <p class="mt-3 sm:mt-4 text-sm sm:text-lg leading-7 sm:leading-8 text-text-secondary max-w-lg">
                    CEDIMS helps teachers, school leaders, and district supervisors manage DLL submissions, checking, and compliance tracking in one system.
                </p>
            </div>
            <div class="flex flex-wrap gap-x-3 sm:gap-x-4 gap-y-1 text-xs sm:text-sm text-text-secondary">
                <span class="inline-flex items-center gap-1 sm:gap-2">
                    Bulusan ES
                </span>
                <span class="inline-flex items-center gap-1 sm:gap-2">
                    Guinobatan ES
                </span>
                <span class="inline-flex items-center gap-1 sm:gap-2">
                    Ibaba ES
                </span>
                <span class="inline-flex items-center gap-1 sm:gap-2">
                    Salong ES
                </span>
                <span class="inline-flex items-center gap-1 sm:gap-2">
                    Suqui ES
                </span>
            </div>
        </div>

        <div class="w-full max-w-md mx-auto lg:mx-0">
            <div class="rounded-2xl sm:rounded-3xl border border-border-subtle bg-surface-white/80 backdrop-blur-sm p-6 sm:p-8 shadow-lg">
                <div class="mb-5 sm:mb-6 text-center">
                    <img src="/app_icon.png" alt="CEDIMS" class="mx-auto h-12 w-12 sm:h-14 sm:w-14 rounded-xl shadow-sm mb-3 sm:mb-4" />
                    <h2 class="text-lg sm:text-xl font-semibold text-text-primary">Welcome back</h2>
                    <p class="mt-1 text-xs sm:text-sm text-text-secondary">Sign in to your district account.</p>
                    <p class="mt-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-text-muted">Powered by Smart E-VISION</p>
                </div>
                <form onsubmit={handleSubmit} class="space-y-4 sm:space-y-5">
                    <div>
                        <label for="email" class="mb-1 sm:mb-1.5 block text-xs sm:text-sm font-semibold text-text-secondary">Email Address</label>
                        <input id="email" type="email" bind:value={email} placeholder="your.email@deped.gov.ph" class="w-full rounded-xl border border-border-subtle px-3 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm outline-none focus:border-gov-blue focus:ring-2 focus:ring-gov-blue/10 transition-all" autocomplete="email" required />
                    </div>
                    <div>
                        <div class="flex items-center justify-between mb-1 sm:mb-1.5">
                            <label for="password" class="block text-xs sm:text-sm font-semibold text-text-secondary">Password</label>
                            <a href="/auth/forgot-password" class="text-[10px] sm:text-xs font-medium text-gov-blue hover:text-gov-blue-dark transition-colors">Forgot password?</a>
                        </div>
                        <div class="relative">
                            <input id="password" type={showPassword ? "text" : "password"} bind:value={password} placeholder="Enter your password" class="w-full rounded-xl border border-border-subtle px-3 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm outline-none focus:border-gov-blue focus:ring-2 focus:ring-gov-blue/10 transition-all pr-10 sm:pr-11" autocomplete="current-password" required minlength="6" />
                            <button type="button" onclick={() => showPassword = !showPassword} class="absolute right-2.5 sm:right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary transition-colors p-1" tabindex="-1" aria-label={showPassword ? "Hide password" : "Show password"}>
                                {#if showPassword}
                                    <EyeOff size={16} class="sm:size-[18]" />
                                {:else}
                                    <Eye size={16} class="sm:size-[18]" />
                                {/if}
                            </button>
                        </div>
                    </div>
                    {#if errorMsg}
                        <div class="rounded-xl border border-red-200 bg-red-50 p-2.5 sm:p-3 text-xs sm:text-sm font-medium text-red-600">{errorMsg}</div>
                    {/if}
                    <button type="submit" disabled={loading} class="w-full rounded-xl bg-gov-blue px-4 py-2.5 sm:py-3 text-xs sm:text-sm font-semibold text-white shadow-sm hover:bg-gov-blue-dark disabled:opacity-60 transition-all flex items-center justify-center gap-2">
                        {#if loading}
                            <span class="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white"></span>
                            Signing in...
                        {:else}
                            <Lock size={16} />
                            Sign In
                        {/if}
                    </button>
                </form>
                <div class="mt-6 pt-4 border-t border-slate-100 text-center">
                    <a href="/" class="inline-flex items-center gap-1.5 text-sm font-medium text-text-muted hover:text-gov-blue transition-colors">
                        <ArrowLeft size={14} />
                        Back to public portal
                    </a>
                </div>
            </div>
        </div>
    </div>
</div>

