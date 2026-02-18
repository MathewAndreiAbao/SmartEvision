import { writable } from 'svelte/store';
import { supabase } from './supabase';
import type { User } from '@supabase/supabase-js';

export interface Profile {
    id: string;
    full_name: string;
    role: 'Teacher' | 'School Head' | 'Master Teacher' | 'District Supervisor';
    school_id: string | null;
    district_id: string | null;
    avatar_url: string | null;
}

export const user = writable<User | null>(null);
export const profile = writable<Profile | null>(null);
export const authLoading = writable<boolean>(true);

export async function initAuth(): Promise<void> {
    authLoading.set(true);
    try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
            user.set(session.user);
            await fetchProfile(session.user.id);
        }

        supabase.auth.onAuthStateChange(async (_event, session) => {
            if (session?.user) {
                user.set(session.user);
                await fetchProfile(session.user.id);
            } else {
                user.set(null);
                profile.set(null);
            }
        });
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
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };
    return { error: null };
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
        case 'Master Teacher':
            return '/dashboard/monitoring/school';
        default:
            return '/dashboard';
    }
}
