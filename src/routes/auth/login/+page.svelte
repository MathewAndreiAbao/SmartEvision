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
        }

        loading = false;
    }
</script>

<svelte:head>
    <title>Sign In — Smart E-VISION</title>
</svelte:head>

<div class="min-h-screen bg-surface flex items-center justify-center p-6">
    <div class="w-full max-w-sm">
        <!-- Logo -->
        <div class="text-center mb-8">
            <img
                src="/app_icon.png"
                alt="Smart E-VISION"
                class="w-12 h-12 mx-auto rounded-md shadow-sm mb-3"
            />
            <h1 class="text-xl font-bold text-text-primary">Welcome Back</h1>
            <p class="text-sm text-text-secondary mt-1">
                Sign in to Smart E-VISION
            </p>
        </div>

        <!-- Login Card -->
        <div class="gov-card-static p-6">
            <form onsubmit={handleSubmit}>
                <!-- Email -->
                <div class="mb-4">
                    <label
                        for="email"
                        class="block text-sm font-medium text-text-primary mb-1.5"
                    >
                        Email Address
                    </label>
                    <input
                        id="email"
                        type="email"
                        bind:value={email}
                        placeholder="your.email@deped.gov.ph"
                        class="gov-input"
                        autocomplete="email"
                        required
                    />
                </div>

                <!-- Password -->
                <div class="mb-5">
                    <label
                        for="password"
                        class="block text-sm font-medium text-text-primary mb-1.5"
                    >
                        Password
                    </label>
                    <input
                        id="password"
                        type="password"
                        bind:value={password}
                        placeholder="Enter your password"
                        class="gov-input"
                        autocomplete="current-password"
                        required
                    />
                </div>

                <!-- Error -->
                {#if errorMsg}
                    <div
                        class="mb-4 px-3 py-2 rounded-md bg-gov-red/10 text-gov-red text-sm font-medium flex items-center gap-2"
                    >
                        <span>Warning:</span>
                        {errorMsg}
                    </div>
                {/if}

                <!-- Submit -->
                <button
                    type="submit"
                    disabled={loading}
                    class="gov-btn-primary w-full py-3 text-base"
                >
                    {#if loading}
                        <span
                            class="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                            style="animation: spin 0.8s linear infinite;"
                        ></span>
                        Signing in...
                    {:else}
                        Sign In
                    {/if}
                </button>
            </form>
        </div>

        <!-- Back link -->
        <div class="text-center mt-4">
            <a
                href="/dashboard"
                class="text-sm text-text-muted hover:text-gov-blue transition-colors"
            >
                Back to Smart E-VISION
            </a>
        </div>
    </div>
</div>
