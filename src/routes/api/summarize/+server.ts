import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { env } from '$env/dynamic/public';

const HF_API_TOKEN = env.PUBLIC_HF_API_TOKEN;
const HF_MODEL_URL = env.PUBLIC_HF_MODEL_URL || 'https://api-inference.huggingface.co/models/csebuetnlp/mT5_multilingual_XLSum';

export const POST: RequestHandler = async ({ request }) => {
    try {
        if (!HF_API_TOKEN) {
            return json({ error: 'HF_API_TOKEN is not configured.' }, { status: 500 });
        }

        const body = await request.json();
        const { text } = body;

        if (!text) {
            return json({ error: 'Text input is required.' }, { status: 400 });
        }

        const controller = new AbortController();
        // Hugging Face cold starts or long generations can take up to 2 minutes
        const timeoutId = setTimeout(() => controller.abort(), 120000); // 120s timeout on server

        const response = await fetch(HF_MODEL_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${HF_API_TOKEN.trim()}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                inputs: text,
                parameters: {
                    max_length: 300,
                    min_length: 40 // Reduced from 80 to prevent the model from struggling/looping
                },
                options: {
                    wait_for_model: true
                }
            }),
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error('[API/Summarize] HF API Error:', response.status, errorData);
            return json({ error: 'Failed to fetch from Hugging Face API', details: errorData }, { status: response.status });
        }

        const result = await response.json();
        return json({ result });

    } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {
            console.error('[API/Summarize] Timeout');
            return json({ error: 'Request timed out waiting for the AI model to wake up.' }, { status: 504 });
        }
        console.error('[API/Summarize] Server Error:', err);
        return json({ error: 'Internal server error while summarizing.' }, { status: 500 });
    }
};
