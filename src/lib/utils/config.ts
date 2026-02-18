import { PUBLIC_APP_URL } from '$env/static/public';

/**
 * Global Configuration
 * Centralizes environment variables and constants.
 */
export const config = {
    // Fallback order:
    // 1. PUBLIC_APP_URL from .env
    // 2. window.location.origin (browser only)
    // 3. Default local dev URL
    APP_URL: PUBLIC_APP_URL || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173')
};
