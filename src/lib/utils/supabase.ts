import { createClient } from '@supabase/supabase-js';
import { env } from '$env/dynamic/public';

if (!env.PUBLIC_SUPABASE_URL || !env.PUBLIC_SUPABASE_ANON_KEY) {
    throw new Error(
        'Missing Supabase environment variables. Please set PUBLIC_SUPABASE_URL and PUBLIC_SUPABASE_ANON_KEY.'
    );
}

// Create a resilient storage adapter that doesn't block on locks
class ReslientStorage implements Storage {
    private data = new Map<string, string>();

    getItem(key: string): string | null {
        try {
            // Try localStorage first for persistence
            if (typeof window !== 'undefined' && window.localStorage) {
                return window.localStorage.getItem(key);
            }
        } catch (e) {
            console.warn('[v0] localStorage access failed:', e);
        }
        // Fall back to in-memory storage
        return this.data.get(key) ?? null;
    }

    setItem(key: string, value: string): void {
        this.data.set(key, value);
        try {
            // Try to persist to localStorage without blocking
            if (typeof window !== 'undefined' && window.localStorage) {
                window.localStorage.setItem(key, value);
            }
        } catch (e) {
            console.warn('[v0] localStorage write failed:', e);
        }
    }

    removeItem(key: string): void {
        this.data.delete(key);
        try {
            if (typeof window !== 'undefined' && window.localStorage) {
                window.localStorage.removeItem(key);
            }
        } catch (e) {
            console.warn('[v0] localStorage remove failed:', e);
        }
    }

    clear(): void {
        this.data.clear();
        try {
            if (typeof window !== 'undefined' && window.localStorage) {
                window.localStorage.clear();
            }
        } catch (e) {
            console.warn('[v0] localStorage clear failed:', e);
        }
    }

    key(index: number): string | null {
        const keys = Array.from(this.data.keys());
        return keys[index] ?? null;
    }

    get length(): number {
        return this.data.size;
    }
}

export const supabase = createClient(
    env.PUBLIC_SUPABASE_URL,
    env.PUBLIC_SUPABASE_ANON_KEY,
    {
        auth: {
            debug: false,
            autoRefreshToken: true,
            persistSession: true,
            detectSessionInUrl: true,
            flowType: 'pkce',
            storage: new ReslientStorage(),
            storageKey: 'sb-auth-token-v3', // Changed key to bypass any existing deadlocks
            lock: (name: string, acquireTimeout: number, callback: () => Promise<any>) => {
                return callback();
            }
        },
        global: {
            headers: {
                'X-Client-Info': 'smart-evision'
            }
        }
    }
);

