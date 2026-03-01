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
    try {
        // Use a longer timeout to prevent lock manager from hanging
        console.log('[v0] Auth: starting session check...');
        const sessionPromise = supabase.auth.getSession();
        const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Session check timeout')), 20000)
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

        // Set up auth state listener without waiting for it
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
        // Don't throw - allow the app to continue even if auth check fails
        authInitialized = true;
    } finally {
        authLoading.set(false);
    }
}

async function fetchProfile(userId: string): Promise<void> {
    const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, role, school_id, district_id, avatar_url')
        .eq('id', userId)
        .single();

    if (error) {
        console.error('Error fetching profile:', error.message);
        profile.set(null);
    } else if (data) {
        profile.set(data as Profile);
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

export function getRoleDashboardPath(role: string): string {
    switch (role) {
        case 'District Supervisor':
            return '/dashboard/monitoring/district';
        case 'School Head':
            return '/dashboard/monitoring/school';
        case 'Master Teacher':
            return '/dashboard/master-teacher';
        default:
            return '/dashboard';
    }
}
