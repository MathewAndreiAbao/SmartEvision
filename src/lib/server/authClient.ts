import { createClient } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';

/**
 * Create a Supabase client authenticated as the given user.
 * Needed for server-side API routes: the global client from $lib/utils/supabase
 * has no browser session, so auth.uid() is NULL and RLS policies would deny access.
 */
export async function createAuthedSupabase(accessToken: string) {
    const client = createClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
            detectSessionInUrl: false,
        },
    });
    await client.auth.setSession({ access_token: accessToken, refresh_token: '' });
    return client;
}
