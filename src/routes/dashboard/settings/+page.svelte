<script lang="ts">
    import { profile, user, signOut } from "$lib/utils/auth";
    import { addToast } from "$lib/stores/toast";
    import { goto } from "$app/navigation";
    import { supabase } from "$lib/utils/supabase";
    import { getQueueSize } from "$lib/utils/offline";
    import { onMount } from "svelte";
    import ProfileUploader from "$lib/components/ProfileUploader.svelte";
    import { User, Shield, Phone, Bell, Languages, ShieldCheck, LogOut } from "lucide-svelte";

    let fullName = $state("");
    let avatarUrl = $state<string | null>(null);
    let saving = $state(false);
    let queueCount = $state(0);
    let voiceEnabled = $state(false);
    let pushEnabled = $state(false);

    onMount(async () => {
        if ($profile) {
            fullName = $profile.full_name || "";
            avatarUrl = $profile.avatar_url || null;
        }
        getQueueSize().then((c) => (queueCount = c));

        const { isVoiceEnabled } = await import("$lib/utils/voiceGuide");
        voiceEnabled = isVoiceEnabled();

        if ("Notification" in window) {
            pushEnabled = Notification.permission === "granted";
        }
    });

    async function updateProfile() {
        if (!$profile) return;
        saving = true;
        const { error } = await supabase
            .from("profiles")
            .update({ 
                full_name: fullName,
                avatar_url: avatarUrl 
            })
            .eq("id", $profile.id);

        if (error) {
            addToast("error", error.message);
        } else {
            addToast("success", "Profile updated successfully");
            // Update local store if needed (though it should auto-sync if subscribed)
            profile.update(p => p ? { ...p, full_name: fullName, avatar_url: avatarUrl } : null);
        }
        saving = false;
    }

    async function handleToggleVoice() {
        const { toggleVoiceGuidance } = await import("$lib/utils/voiceGuide");
        voiceEnabled = toggleVoiceGuidance();
    }

    async function handleSignOut() {
        await signOut();
        goto("/");
    }
</script>

<svelte:head>
    <title>Profile Settings — Smart E-VISION</title>
</svelte:head>

<div class="max-w-3xl mx-auto space-y-8 pb-12">
    <!-- Header -->
    <div class="mb-2">
        <h1 class="text-3xl font-bold text-text-primary tracking-tight">Account Identity</h1>
        <p class="text-text-secondary mt-1 font-medium">
            Manage your personal profile and system preferences.
        </p>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <!-- Left Column: Identity Card -->
        <div class="lg:col-span-1">
            <div class="gov-card-static p-8 flex flex-col items-center text-center">
                <ProfileUploader 
                    bind:url={avatarUrl} 
                    id={$profile?.id || ''}
                    label="Profile Photo"
                    path="users"
                    size="xl"
                    onUpload={(newUrl) => {
                       avatarUrl = newUrl;
                       updateProfile();
                    }}
                />
                
                <div class="mt-6 w-full">
                    <h2 class="text-xl font-bold text-text-primary truncate">{fullName || 'User Name'}</h2>
                    <p class="text-xs font-bold text-gov-blue uppercase tracking-widest mt-1">{$profile?.role || 'User'}</p>
                </div>

                <div class="mt-8 w-full space-y-3 pt-6 border-t border-gray-50 text-left">
                    <div class="flex items-center gap-3 text-text-secondary">
                        <ShieldCheck size={14} class="text-gov-blue" />
                        <span class="text-[10px] font-bold uppercase tracking-wider">Access Secured</span>
                    </div>
                </div>
            </div>
        </div>

        <!-- Right Column: Details & Preferences -->
        <div class="lg:col-span-2 space-y-8">
            <!-- Basic Information -->
            <div class="gov-card-static p-6">
                <div class="flex items-center gap-2 mb-6 text-gov-blue">
                    <User size={18} />
                    <h2 class="text-sm font-bold uppercase tracking-widest">Personal Details</h2>
                </div>

                <div class="space-y-6">
                    <div>
                        <label for="fullName" class="block text-[10px] font-bold text-text-muted uppercase tracking-wider mb-2">Display Name (User Name)</label>
                        <input
                            id="fullName"
                            type="text"
                            bind:value={fullName}
                            placeholder="Enter your full name"
                            class="w-full px-4 py-3 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-gov-blue/20 focus:border-gov-blue outline-none transition-all font-bold"
                        />
                    </div>

                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <span class="block text-[10px] font-bold text-text-muted uppercase tracking-wider mb-2">Official Email</span>
                            <div class="px-4 py-3 text-sm bg-gray-50/50 border border-gray-100 rounded-xl text-text-muted italic flex items-center min-h-[48px]">
                                {$user?.email || 'Not verified'}
                            </div>
                        </div>
                        <div>
                            <span class="block text-[10px] font-bold text-text-muted uppercase tracking-wider mb-2">Connection Status</span>
                            <div class="px-4 py-3 text-sm bg-gray-50/50 border border-gray-100 rounded-xl text-text-muted flex items-center min-h-[48px]">
                                 <LogOut size={14} class="mr-2 rotate-180 opacity-40" />
                                 {queueCount > 0 ? `${queueCount} Pending Sync` : 'Synchronized'}
                            </div>
                        </div>
                    </div>

                    <div class="pt-4 flex justify-end">
                        <button
                            onclick={updateProfile}
                            disabled={saving}
                            class="px-8 py-3 bg-gov-blue text-white font-bold rounded-xl text-xs uppercase tracking-widest hover:bg-gov-blue-dark active:scale-95 transition-all disabled:opacity-50 shadow-sm"
                        >
                            {saving ? 'Syncing...' : 'Update Identity'}
                        </button>
                    </div>
                </div>
            </div>

            <!-- System Preferences -->
            <div class="gov-card-static p-6">
                <div class="flex items-center gap-2 mb-6 text-gov-blue">
                    <Bell size={18} />
                    <h2 class="text-sm font-bold uppercase tracking-widest">System Experience</h2>
                </div>

                <div class="space-y-4">
                    <!-- Voice Guidance -->
                    <div class="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
                        <div class="flex items-center gap-3">
                            <div class="w-10 h-10 rounded-full bg-white flex items-center justify-center text-gov-blue shadow-sm">
                                <Languages size={18} />
                            </div>
                            <div>
                                <span class="block text-sm font-bold text-text-primary">Voice Assistance</span>
                                <p class="text-[10px] text-text-muted font-medium">Auditory feedback for accessibility.</p>
                            </div>
                        </div>
                        <button
                            onclick={handleToggleVoice}
                            class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:ring-2 focus:ring-gov-blue focus:ring-offset-2 {voiceEnabled ? 'bg-gov-blue' : 'bg-gray-300'}"
                        >
                            <span class="sr-only">Toggle voice guidance</span>
                            <span class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform {voiceEnabled ? 'translate-x-6' : 'translate-x-1'}"></span>
                        </button>
                    </div>

                    <!-- Push Notifications -->
                    <div class="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
                        <div class="flex items-center gap-3">
                            <div class="w-10 h-10 rounded-full bg-white flex items-center justify-center text-gov-green shadow-sm">
                                <Bell size={18} />
                            </div>
                            <div>
                                <span class="block text-sm font-bold text-text-primary">Live Alerts</span>
                                <p class="text-[10px] text-text-muted font-medium">Real-time deadline and review notifications.</p>
                            </div>
                        </div>
                        <button
                            onclick={async () => {
                                const { subscribeToPush, unsubscribeFromPush } = await import("$lib/utils/notifications");
                                if (pushEnabled) {
                                    const success = await unsubscribeFromPush();
                                    if (success) {
                                        pushEnabled = false;
                                        addToast("success", "Notifications disabled");
                                    }
                                } else {
                                    const granted = await subscribeToPush();
                                    if (granted) {
                                        pushEnabled = true;
                                        addToast("success", "Notifications enabled");
                                    }
                                }
                            }}
                            class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:ring-2 focus:ring-gov-blue focus:ring-offset-2 {pushEnabled ? 'bg-gov-green' : 'bg-gray-300'}"
                        >
                            <span class="sr-only">Toggle push notifications</span>
                            <span class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform {pushEnabled ? 'translate-x-6' : 'translate-x-1'}"></span>
                        </button>
                    </div>
                </div>
            </div>

            <!-- Danger Zone -->
            <div class="pt-4">
                <button
                    onclick={handleSignOut}
                    class="w-full py-4 border-2 border-gov-red/20 text-gov-red font-bold rounded-2xl text-xs uppercase tracking-widest hover:bg-gov-red/5 transition-all flex items-center justify-center gap-2 group"
                >
                    <LogOut size={16} class="group-hover:translate-x-1 transition-transform" />
                    Sign Out Securely
                </button>
            </div>
        </div>
    </div>
</div>
