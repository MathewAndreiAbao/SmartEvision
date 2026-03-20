import { json, error } from '@sveltejs/kit';
import { getPresignedUploadUrl, getPresignedDownloadUrl } from '$lib/utils/b2.server';
import { supabase } from '$lib/utils/supabase';

export async function POST({ request }) {
    // 1. Authenticate with Supabase
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) throw error(401, 'Unauthorized');

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
        console.error('[presign] Auth error:', authError);
        throw error(401, 'Unauthorized');
    }

    // 2. Get request body
    const { key, contentType, intent = 'upload' } = await request.json();
    if (!key) throw error(400, 'Missing key');

    // 3. Generate pre-signed URL
    try {
        let url;
        if (intent === 'download') {
            url = await getPresignedDownloadUrl(key);
        } else {
            if (!contentType) throw error(400, 'Missing contentType for upload');
            url = await getPresignedUploadUrl(key, contentType);
        }
        return json({ url });
    } catch (err: any) {
        console.error('[presign] Generation error:', err);
        throw error(500, `Failed to generate pre-signed URL: ${err.message}`);
    }
}
