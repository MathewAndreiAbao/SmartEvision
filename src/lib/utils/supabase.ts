import { createClient } from '@supabase/supabase-js';
import { env } from '$env/dynamic/public';

export const supabase = createClient(
    env.PUBLIC_SUPABASE_URL || 'https://YOUR_PROJECT.supabase.co',
    env.PUBLIC_SUPABASE_ANON_KEY || 'YOUR_ANON_KEY',
    {
        auth: {
            autoRefreshToken: true,
            persistSession: true,
            detectSessionInUrl: true
        }
    }
);

