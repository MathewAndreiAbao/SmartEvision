import { createClient } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';

/**
 * Create a Supabase client authenticated as the given user.
 * Needed for server-side API routes: the global client from $lib/utils/supabase
 * has no browser session, so auth.uid() is NULL and RLS policies would deny access.
 *
 * We pass the access token via `global.headers.Authorization` rather than
 * `setSession(...)`: setSession with an empty refresh_token can leave the client
 * without a session, which makes auth.uid() NULL server-side and RLS then denies
 * the request. The global header is applied to every PostgREST call.
 */
export async function createAuthedSupabase(accessToken: string) {
    return createClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
            detectSessionInUrl: false,
        },
        global: {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        },
    });
}
