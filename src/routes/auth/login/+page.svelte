<script lang="ts">
    import {
        signIn,
        getRoleDashboardPath,
        profile,
        authLoading,
    } from "$lib/utils/auth";
    import { addToast } from "$lib/stores/toast";
    import { goto } from "$app/navigation";

    let email = $state("");
    let password = $state("");
    let loading = $state(false);
    let errorMsg = $state("");

    // If already logged in, redirect
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

        loading = true;
        errorMsg = "";

        const result = await signIn(email, password);

        if (result.error) {
            errorMsg = result.error;
            addToast("error", result.error);
        } else {
            addToast("success", "Welcome back!");
            // Redirect is handled by the $effect above when profile loads
        }

        loading = false;
    }
</script>

<svelte:head>
    <title>Sign In — Smart E-VISION</title>
</svelte:head>

<div class="min-h-screen gradient-mesh flex items-center justify-center p-6">
    <!-- Decorative blurs -->
    <div
        class="fixed top-20 left-20 w-72 h-72 bg-gov-blue/10 rounded-full blur-3xl pointer-events-none"
    ></div>
    <div
        class="fixed bottom-20 right-20 w-96 h-96 bg-gov-gold/10 rounded-full blur-3xl pointer-events-none"
    ></div>

    <div class="w-full max-w-md animate-slide-up">
        <!-- Logo -->
        <div class="text-center mb-10">
            <div
                class="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-gov-blue to-gov-blue-dark flex items-center justify-center text-white text-3xl font-bold shadow-elevated mb-4"
            >
                E
            </div>
            <h1 class="text-2xl font-bold text-text-primary">Welcome Back</h1>
            <p class="text-base text-text-secondary mt-1">
                Sign in to Smart E-VISION
            </p>
        </div>

        <!-- Login Card -->
        <div class="glass-card-static p-8">
            <form onsubmit={handleSubmit}>
                <!-- Email -->
                <div class="mb-5">
                    <label
                        for="email"
                        class="block text-sm font-semibold text-text-primary mb-2"
                    >
                        Email Address
                    </label>
                    <input
                        id="email"
                        type="email"
                        bind:value={email}
                        placeholder="your.email@deped.gov.ph"
                        class="w-full px-5 py-3.5 text-base bg-white/60 border border-gray-200 rounded-xl focus:ring-2 focus:ring-gov-blue/30 focus:border-gov-blue outline-none transition-all min-h-[48px]"
                        autocomplete="email"
                        required
                    />
                </div>

                <!-- Password -->
                <div class="mb-6">
                    <label
                        for="password"
                        class="block text-sm font-semibold text-text-primary mb-2"
                    >
                        Password
                    </label>
                    <input
                        id="password"
                        type="password"
                        bind:value={password}
                        placeholder="Enter your password"
                        class="w-full px-5 py-3.5 text-base bg-white/60 border border-gray-200 rounded-xl focus:ring-2 focus:ring-gov-blue/30 focus:border-gov-blue outline-none transition-all min-h-[48px]"
                        autocomplete="current-password"
                        required
                    />
                </div>

                <!-- Error -->
                {#if errorMsg}
                    <div
                        class="mb-5 px-4 py-3 rounded-xl bg-gov-red/10 text-gov-red text-sm font-medium flex items-center gap-2"
                    >
                        <span>Warning:</span>
                        {errorMsg}
                    </div>
                {/if}

                <!-- Submit -->
                <button
                    type="submit"
                    disabled={loading}
                    class="w-full py-4 bg-gradient-to-r from-gov-blue to-gov-blue-dark text-white text-lg font-bold rounded-xl shadow-md hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 min-h-[56px] disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-2"
                >
                    {#if loading}
                        <span
                            class="inline-block w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
                            style="animation: spin 0.8s linear infinite;"
                        ></span>
                        Signing in...
                    {:else}
                        Sign In
                    {/if}
                </button>
            </form>
        </div>

        <!-- Back to dashboard -->
        <div class="text-center mt-6">
            <a
                href="/dashboard"
                class="text-sm text-text-muted hover:text-gov-blue transition-colors"
            >
                Back to Smart E-VISION
            </a>
        </div>
    </div>
</div>
