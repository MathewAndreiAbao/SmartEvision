<script lang="ts">
    import { profile, signOut } from "$lib/utils/auth";
    import { addToast } from "$lib/stores/toast";
    import { goto } from "$app/navigation";
    import { supabase } from "$lib/utils/supabase";
    import { getQueueSize } from "$lib/utils/offline";
    import { onMount } from "svelte";

    let fullName = $state("");
    let currentPassword = $state("");
    let newPassword = $state("");
    let confirmPassword = $state("");
    let saving = $state(false);
    let queueCount = $state(0);
    let voiceEnabled = $state(false);
    let pushEnabled = $state(false);

    onMount(async () => {
        if ($profile) {
            fullName = $profile.full_name || "";
        }
        getQueueSize().then((c) => (queueCount = c));

        const { isVoiceEnabled } = await import("$lib/utils/voiceGuide");
        voiceEnabled = isVoiceEnabled();

        if ("Notification" in window) {
            pushEnabled = Notification.permission === "granted";
        }
    });

    async function handleToggleVoice() {
        const { toggleVoiceGuidance } = await import("$lib/utils/voiceGuide");
        voiceEnabled = toggleVoiceGuidance();
    }

    async function updateProfile() {
        saving = true;
        const { error } = await supabase
            .from("profiles")
            .update({ full_name: fullName })
            .eq("id", $profile!.id);

        if (error) {
            addToast("error", error.message);
        } else {
            addToast("success", "Profile updated");
        }
        saving = false;
    }

    async function changePassword() {
        if (newPassword !== confirmPassword) {
            addToast("warning", "Passwords do not match");
            return;
        }
        if (newPassword.length < 6) {
            addToast("warning", "Password must be at least 6 characters");
            return;
        }

        saving = true;
        const { error } = await supabase.auth.updateUser({
            password: newPassword,
        });

        if (error) {
            addToast("error", error.message);
        } else {
            addToast("success", "Password changed");
            currentPassword = "";
            newPassword = "";
            confirmPassword = "";
        }
        saving = false;
    }

    async function handleSignOut() {
        await signOut();
        goto("/");
    }
</script>

<svelte:head>
    <title>Settings — Smart E-VISION</title>
</svelte:head>

<div class="max-w-2xl">
    <div class="mb-8">
        <h1 class="text-2xl font-bold text-text-primary">Settings</h1>
        <p class="text-base text-text-secondary mt-1">
            Manage your profile and preferences
        </p>
    </div>

    <div class="space-y-8">
        <!-- Profile Section -->
        <div class="glass-card-static p-6">
            <h2 class="text-lg font-bold text-text-primary mb-5">Profile</h2>

            <div class="space-y-4">
                <div>
                    <label
                        for="fullName"
                        class="block text-sm font-semibold text-text-primary mb-2"
                        >Full Name</label
                    >
                    <input
                        id="fullName"
                        type="text"
                        bind:value={fullName}
                        class="w-full px-4 py-3 text-base bg-white/60 border border-gray-200 rounded-xl min-h-[48px]"
                    />
                </div>

                <div>
                    <span
                        class="block text-sm font-semibold text-text-primary mb-2"
                        >Email</span
                    >
                    <p
                        class="px-4 py-3 text-base bg-gray-50 border border-gray-200 rounded-xl text-text-muted min-h-[48px] flex items-center"
                    >
                        {$profile?.id ? "Loaded from Supabase" : "—"}
                    </p>
                </div>

                <div>
                    <span
                        class="block text-sm font-semibold text-text-primary mb-2"
                        >Role</span
                    >
                    <p
                        class="px-4 py-3 text-base bg-gray-50 border border-gray-200 rounded-xl text-text-muted min-h-[48px] flex items-center"
                    >
                        {$profile?.role || "—"}
                    </p>
                </div>

                <button
                    onclick={updateProfile}
                    disabled={saving}
                    class="px-6 py-3 bg-gradient-to-r from-gov-blue to-gov-blue-dark text-white font-semibold rounded-xl min-h-[48px] shadow-md hover:shadow-lg transition-all disabled:opacity-60"
                >
                    {saving ? "Saving..." : "Save Changes"}
                </button>
            </div>
        </div>

        <!-- Password Section -->
        <div class="glass-card-static p-6">
            <h2 class="text-lg font-bold text-text-primary mb-5">
                Change Password
            </h2>

            <div class="space-y-4">
                <div>
                    <label
                        for="newPass"
                        class="block text-sm font-semibold text-text-primary mb-2"
                        >New Password</label
                    >
                    <input
                        id="newPass"
                        type="password"
                        bind:value={newPassword}
                        placeholder="Minimum 6 characters"
                        class="w-full px-4 py-3 text-base bg-white/60 border border-gray-200 rounded-xl min-h-[48px]"
                    />
                </div>

                <div>
                    <label
                        for="confirmPass"
                        class="block text-sm font-semibold text-text-primary mb-2"
                        >Confirm Password</label
                    >
                    <input
                        id="confirmPass"
                        type="password"
                        bind:value={confirmPassword}
                        placeholder="Re-enter new password"
                        class="w-full px-4 py-3 text-base bg-white/60 border border-gray-200 rounded-xl min-h-[48px]"
                    />
                </div>

                <button
                    onclick={changePassword}
                    disabled={saving}
                    class="px-6 py-3 bg-gradient-to-r from-gov-blue to-gov-blue-dark text-white font-semibold rounded-xl min-h-[48px] shadow-md hover:shadow-lg transition-all disabled:opacity-60"
                >
                    {saving ? "Updating..." : "Change Password"}
                </button>
            </div>
        </div>

        <!-- System Status & Preferences -->
        <div class="glass-card-static p-6">
            <h2 class="text-lg font-bold text-text-primary mb-5">
                Preferences & Status
            </h2>
            <div class="space-y-4">
                <!-- Voice Guidance Toggle -->
                <div
                    class="flex items-center justify-between py-2 border-b border-gray-100"
                >
                    <div>
                        <span
                            class="block text-sm font-semibold text-text-primary"
                            >Voice Guidance</span
                        >
                        <p class="text-[10px] text-text-muted">
                            Grandparent UX: Spoken feedback for system actions
                        </p>
                    </div>
                    <button
                        onclick={handleToggleVoice}
                        class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-gov-blue focus:ring-offset-2 {voiceEnabled
                            ? 'bg-gov-blue'
                            : 'bg-gray-200'}"
                    >
                        <span class="sr-only">Toggle voice guidance</span>
                        <span
                            class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform {voiceEnabled
                                ? 'translate-x-6'
                                : 'translate-x-1'}"
                        ></span>
                    </button>
                </div>

                <!-- Web Push Notifications -->
                <div
                    class="flex items-center justify-between py-2 border-b border-gray-100"
                >
                    <div>
                        <span
                            class="block text-sm font-semibold text-text-primary"
                            >Push Notifications</span
                        >
                        <p class="text-[10px] text-text-muted">
                            Receive alerts for deadlines and reviews
                        </p>
                    </div>
                    <button
                        onclick={async () => {
                            const { subscribeToPush } = await import(
                                "$lib/utils/notifications"
                            );
                            const granted = await subscribeToPush();
                            if (granted) pushEnabled = true;
                        }}
                        class="px-3 py-1.5 text-xs font-bold rounded-lg border-2 {pushEnabled
                            ? 'border-gov-green text-gov-green bg-gov-green/5'
                            : 'border-gov-blue text-gov-blue hover:bg-gov-blue/5'} transition-colors"
                    >
                        {pushEnabled ? "SUBSCRIBED" : "Subscribe Now"}
                    </button>
                </div>

                <div class="flex items-center justify-between py-2">
                    <span class="text-sm text-text-secondary"
                        >Offline Queue</span
                    >
                    <span
                        class="text-sm font-semibold {queueCount > 0
                            ? 'text-gov-gold-dark'
                            : 'text-gov-green'}"
                    >
                        {queueCount} file{queueCount !== 1 ? "s" : ""} pending
                    </span>
                </div>

                <div class="flex items-center justify-between py-2">
                    <span class="text-sm text-text-secondary">Connection</span>
                    <span class="text-sm font-semibold text-gov-green"
                        >Online</span
                    >
                </div>
            </div>
        </div>

        <!-- Sign Out -->
        <button
            onclick={handleSignOut}
            class="w-full py-4 border-2 border-gov-red/30 text-gov-red font-semibold rounded-xl min-h-[56px] hover:bg-gov-red/5 transition-colors"
        >
            Sign Out
        </button>
    </div>
</div>
