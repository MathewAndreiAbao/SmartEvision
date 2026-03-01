import { env } from '$env/dynamic/public';

/**
 * Global Configuration
 * Centralizes environment variables and constants.
 */
export const config = {
    // Fallback order:
    // 1. PUBLIC_APP_URL from .env or Vercel
    // 2. Production Vercel URL
    // 3. window.location.origin (browser onl
    // 4. Default local dev URL
    APP_URL: env.PUBLIC_APP_URL ||
        'https://v0-s-evision.vercel.app' ||
        (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173')
};
