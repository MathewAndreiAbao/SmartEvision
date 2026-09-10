<script lang="ts">
    import {
        signIn,
        getRoleDashboardPath,
        profile,
        authLoading,
    } from "$lib/utils/auth";
    import { addToast } from "$lib/stores/toast";
    import { goto } from "$app/navigation";
    import { Lock, ShieldCheck, ArrowLeft, Eye, EyeOff, CheckCircle2 } from "lucide-svelte";

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

<div class="min-h-dvh bg-gradient-to-br from-gov-blue/5 via-surface-white to-surface-muted px-4 py-8 sm:px-6 sm:py-12 lg:px-8 flex items-center">
    <div class="mx-auto w-full flex max-w-7xl flex-col gap-8 sm:gap-10 lg:flex-row lg:items-center lg:justify-between">
        <!-- Left Section — Value Proposition -->
        <div class="max-w-2xl space-y-6 sm:space-y-8">
            <div class="inline-flex items-center gap-2.5 rounded-full border border-gov-blue/20 bg-gov-blue/10 px-4 py-2 text-xs sm:text-sm font-bold uppercase tracking-[0.1em] text-gov-blue">
                <ShieldCheck size={16} strokeWidth={2} />
                Trusted by DepEd Calapan East
            </div>
            <div class="space-y-3 sm:space-y-4">
                <h1 class="text-heading-lg text-text-primary">
                    Monitor instruction, <br class="hidden sm:block" />support learning.
                </h1>
                <p class="text-body-lg text-text-secondary">
                    CEDIMS helps educators manage Daily Lesson Logs, compliance tracking, and school-wide instruction quality in one unified system.
                </p>
            </div>

            <!-- Features List -->
            <div class="space-y-3 pt-4">
                {#each [
                    "Real-time document monitoring",
                    "AI-powered compliance checking",
                    "School & district analytics",
                ] as feature}
                    <div class="flex items-center gap-3">
                        <div class="flex-shrink-0 w-5 h-5 rounded-full bg-gov-green/20 flex items-center justify-center">
                            <CheckCircle2 size={16} class="text-gov-green" strokeWidth={2.5} />
                        </div>
                        <span class="text-sm font-medium text-text-primary">{feature}</span>
                    </div>
                {/each}
            </div>
        </div>

        <!-- Right Section — Login Form -->
        <div class="w-full max-w-md mx-auto lg:mx-0 shrink-0">
            <div class="rounded-2xl border border-border-subtle bg-surface-white backdrop-blur-sm p-6 sm:p-8 shadow-xl">
                <!-- Header -->
                <div class="mb-7 sm:mb-8 text-center">
                    <div class="mx-auto w-16 h-16 bg-surface-white border border-border-subtle rounded-2xl flex items-center justify-center shadow-lg mb-4">
                        <img src="/app_icon.png" alt="CEDIMS — DepEd Calapan East District" class="h-12 w-12 object-contain" />
                    </div>
                    <h2 class="text-xl sm:text-2xl font-bold text-text-primary">Welcome back</h2>
                    <p class="mt-1 text-sm text-text-secondary">Sign in to your educator account</p>
                </div>

                <!-- Form -->
                <form onsubmit={handleSubmit} class="space-y-5 sm:space-y-6">
                    <!-- Email Input -->
                    <div>
                        <label for="email" class="mb-2 block text-sm font-semibold text-text-primary">
                            Email Address
                        </label>
                        <div class="relative">
                            <input
                                id="email"
                                type="email"
                                bind:value={email}
                                placeholder="your.email@deped.gov.ph"
                                class="gov-input w-full"
                                autocomplete="email"
                                required
                            />
                        </div>
                    </div>

                    <!-- Password Input -->
                    <div>
                        <div class="flex items-center justify-between mb-2">
                            <label for="password" class="block text-sm font-semibold text-text-primary">Password</label>
                            <a href="/auth/forgot-password" class="text-xs font-semibold text-gov-blue hover:text-gov-blue-dark transition-colors">
                                Forgot?
                            </a>
                        </div>
                        <div class="relative">
                            <input
                                id="password"
                                type={showPassword ? "text" : "password"}
                                bind:value={password}
                                placeholder="••••••••"
                                class="gov-input w-full pr-11"
                                autocomplete="current-password"
                                required
                                minlength="6"
                            />
                            <button
                                type="button"
                                onclick={() => showPassword = !showPassword}
                                class="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-gov-blue transition-colors p-1"
                                tabindex="-1"
                                aria-label={showPassword ? "Hide password" : "Show password"}
                            >
                                {#if showPassword}
                                    <EyeOff size={18} strokeWidth={1.5} />
                                {:else}
                                    <Eye size={18} strokeWidth={1.5} />
                                {/if}
                            </button>
                        </div>
                    </div>

                    <!-- Error Message -->
                    {#if errorMsg}
                        <div class="rounded-lg border border-gov-red/30 bg-gov-red/10 p-3 sm:p-4 text-sm font-semibold text-gov-red">
                            {errorMsg}
                        </div>
                    {/if}

                    <!-- Submit Button -->
                    <button
                        type="submit"
                        disabled={loading}
                        class="gov-btn-primary w-full justify-center text-sm"
                    >
                        {#if loading}
                            <span class="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white"></span>
                            <span>Signing in...</span>
                        {:else}
                            <Lock size={18} strokeWidth={2} />
                            <span>Sign In</span>
                        {/if}
                    </button>
                </form>

                <!-- Footer -->
                <div class="mt-6 pt-6 border-t border-border-subtle text-center">
                    <a href="/" class="inline-flex items-center gap-1.5 text-sm font-medium text-text-muted hover:text-gov-blue transition-colors">
                        <ArrowLeft size={16} strokeWidth={2} />
                        Back to home
                    </a>
                </div>
            </div>
        </div>
    </div>
</div>

