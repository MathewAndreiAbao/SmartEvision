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
        (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173'),
    HF_API_TOKEN: env.PUBLIC_HF_API_TOKEN || '',
    HF_MODEL_URL: env.PUBLIC_HF_MODEL_URL || 'https://router.huggingface.co/hf-inference/models/csebuetnlp/mT5_multilingual_XLSum'
};
