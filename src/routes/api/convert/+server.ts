import { error } from '@sveltejs/kit';
import { env as publicEnv } from '$env/dynamic/public';
import { supabase } from '$lib/utils/supabase';

const MAX_FILE_BYTES = 25 * 1024 * 1024; // 25 MB — GAS base64 headroom

export async function POST({ request }) {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) throw error(401, 'Unauthorized');

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) throw error(401, 'Unauthorized');

    const formData = await request.formData();
    const file = formData.get('file');
    if (!file || !(file instanceof Blob)) throw error(400, 'Missing or invalid file');

    const f = file as File;
    const ext = f.name?.split('.').pop()?.toLowerCase();
    if (!ext || !['doc', 'docx'].includes(ext)) {
        throw error(400, 'Only .doc and .docx files are supported');
    }
    if (f.size > MAX_FILE_BYTES) {
        throw error(413, 'File too large. Maximum size is 25 MB.');
    }

    const GAS_URL = publicEnv.PUBLIC_GOOGLE_SCRIPT_URL;
    if (!GAS_URL) {
        throw error(503, 'Conversion service not configured. Set PUBLIC_GOOGLE_SCRIPT_URL.');
    }

    try {
        const base64Data = Buffer.from(await f.arrayBuffer()).toString('base64');

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 55_000); // 55s — under Vercel 60s limit

        const response = await fetch(GAS_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain' },
            body: JSON.stringify({ fileName: f.name, base64Data }),
            signal: controller.signal
        });
        clearTimeout(timeout);

        if (!response.ok) throw new Error(`GAS responded ${response.status}: ${response.statusText}`);

        const result = await response.json();
        if (!result.success) throw new Error(result.error || 'Conversion failed');

        const pdfBytes = Uint8Array.from(atob(result.pdfBase64), c => c.charCodeAt(0));
        const safeName = f.name.replace(/\.\w+$/, '.pdf').replace(/[^\w\-. ]/g, '_');

        return new Response(pdfBytes, {
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename="${safeName}"`
            }
        });
    } catch (err: any) {
        if (err.name === 'AbortError') throw error(504, 'Conversion timed out. Try again.');
        throw error(502, `Conversion failed: ${err.message}`);
    }
}
