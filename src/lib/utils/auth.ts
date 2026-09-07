import { writable } from 'svelte/store';
import { supabase } from './supabase';
import type { User } from '@supabase/supabase-js';

export interface Profile {
    id: string;
    full_name: string;
    role: 'Teacher' | 'School Head' | 'Master Teacher' | 'District Supervisor' | 'Admin';
    school_id: string | null;
    district_id: string | null;
    avatar_url: string | null;
}

export const user = writable<User | null>(null);
export const profile = writable<Profile | null>(null);
export const authLoading = writable<boolean>(true);
export const isChangingPassword = writable<boolean>(false);

let authInitialized = false;
let authInitPromise: Promise<void> | null = null;

export async function initAuth(): Promise<void> {
    // Prevent multiple simultaneous initialization attempts
    if (authInitialized) {
        return;
    }

    if (authInitPromise) {
        return authInitPromise;
    }

    authInitPromise = performAuthInit();
    return authInitPromise;
}

async function performAuthInit(): Promise<void> {
    if (authInitialized) return;

    authLoading.set(true);

    // 1. INSTANT: Load cached profile + user from localStorage BEFORE any network call.
    // This makes the dashboard render immediately even when fully offline.
    let hasCachedProfile = false;
    const cachedKeys = Object.keys(localStorage).filter(k => k.startsWith('auth_profile_'));
    if (cachedKeys.length > 0) {
        try {
            const cached = localStorage.getItem(cachedKeys[0]);
            if (cached) {
                const parsed = JSON.parse(cached);
                profile.set(parsed);
                // Extract userId from the cache key (format: auth_profile_{userId})
                const cachedUserId = cachedKeys[0].replace('auth_profile_', '');
                // Set a minimal user object so dashboard layout guard ($user) passes
                user.set({ id: cachedUserId } as any);
                hasCachedProfile = true;
                console.log('[v0] Auth: Instant profile + user set from cache');
            }
        } catch (e) {
            console.error('[v0] Error loading cached profile:', e);
        }
    }

    // If we have cached data, unlock the UI immediately — network will update in background
    if (hasCachedProfile) {
        authLoading.set(false);
    }

    try {
        const timeout = navigator.onLine ? 8000 : 3000;
        console.log('[v0] Auth: starting session check...');
        const sessionPromise = supabase.auth.getSession();
        const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Session check timeout')), timeout)
        );

        const { data: { session }, error } = await Promise.race([
            sessionPromise,
            timeoutPromise
        ]) as any;

        if (error) {
            console.error('[v0] Error getting session:', error.message);
        }

        if (session?.user) {
            user.set(session.user);
            await fetchProfile(session.user.id);
        }

        // Set up auth state listener
        supabase.auth.onAuthStateChange(async (_event: string, session: any) => {
            if (session?.user) {
                user.set(session.user);
                await fetchProfile(session.user.id);
            } else {
                user.set(null);
                profile.set(null);
            }
        });

        authInitialized = true;
    } catch (err) {
        console.error('[v0] Auth initialization error:', err instanceof Error ? err.message : String(err));
        authInitialized = true;
    } finally {
        authLoading.set(false);
    }
}

async function fetchProfile(userId: string): Promise<void> {
    const CACHE_KEY = `auth_profile_${userId}`;

    // 1. Try to load from cache first if offline or for immediate UI feedback
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
        try {
            const parsed = JSON.parse(cached);
            profile.set(parsed);
            console.log('[v0] Auth: loaded profile from cache');
        } catch (e) {
            console.error('[v0] Error parsing cached profile:', e);
        }
    }

    if (!navigator.onLine && cached) return;

    try {
        const { data, error } = await supabase
            .from('profiles')
            .select('id, full_name, role, school_id, district_id, avatar_url')
            .eq('id', userId)
            .single();

        if (error) {
            console.error('Error fetching profile:', error.message);
            // If offline, we already set it from cache. If it's a real error (not just fetch), maybe don't clear it yet.
            if (navigator.onLine) profile.set(null);
        } else if (data) {
            profile.set(data as Profile);
            localStorage.setItem(CACHE_KEY, JSON.stringify(data));
        }
    } catch (err) {
        console.warn('[v0] Auth: fetchProfile failed (ignoring if offline):', err);
    }
}

export async function signIn(email: string, password: string): Promise<{ error: string | null }> {
    try {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
            console.error('[v0] Sign in error:', error.message);
            return { error: error.message };
        }
        return { error: null };
    } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'An unexpected error occurred during sign in';
        console.error('[v0] Sign in exception:', errorMsg);
        return { error: errorMsg };
    }
}

export async function signOut(): Promise<void> {
    await supabase.auth.signOut();
    user.set(null);
    profile.set(null);
}

export async function changePassword(currentPassword: string, newPassword: string): Promise<{ error: string | null }> {
    isChangingPassword.set(true);
    try {
        const { error: signInError } = await supabase.auth.signInWithPassword({
            email: (await supabase.auth.getUser()).data.user?.email || '',
            password: currentPassword
        });
        if (signInError) return { error: 'Current password is incorrect.' };

        const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
        if (updateError) return { error: updateError.message };
        return { error: null };
    } catch (err) {
        return { error: err instanceof Error ? err.message : 'Failed to change password.' };
    } finally {
        isChangingPassword.set(false);
    }
}

export async function resetPasswordForEmail(email: string): Promise<{ error: string | null }> {
    try {
        const redirectTo = typeof window !== 'undefined'
            ? `${window.location.origin}/auth/update-password`
            : undefined;
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo
        });
        if (error) return { error: error.message };
        return { error: null };
    } catch (err) {
        return { error: err instanceof Error ? err.message : 'Failed to send reset email.' };
    }
}

export async function updatePassword(newPassword: string): Promise<{ error: string | null }> {
    try {
        const { error } = await supabase.auth.updateUser({ password: newPassword });
        if (error) return { error: error.message };
        return { error: null };
    } catch (err) {
        return { error: err instanceof Error ? err.message : 'Failed to update password.' };
    }
}

export function getRoleDashboardPath(role: string): string {
    switch (role) {
        case 'District Supervisor':
            return '/dashboard/monitoring/district';
        case 'School Head':
            return '/dashboard/monitoring/school';
        case 'Master Teacher':
            return '/dashboard';
        default:
            return '/dashboard';
    }
}
