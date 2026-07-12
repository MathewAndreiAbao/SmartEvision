// ═══════════════════════════════════════════════════════════════
// DLL Review API — POST /api/dll/annotate
// CEDIMS 2.0 — Add annotation to submission// ═══════════════════════════════════════════════════════════════

import { json, type RequestHandler } from '@sveltejs/kit';
import { createAnnotation } from '$lib/utils/dllReviewWorkflow';
import type { CreateAnnotationInput } from '$lib/types/dll-review';

export const POST: RequestHandler = async ({ request, locals }) => {
    try {
        // Verify authentication (user is pre-validated by hooks.server.ts)
        const user = locals.user;
        if (!user?.id) {
            return json({ error: 'Unauthorized' }, { status: 401 });
        }

        const input: CreateAnnotationInput = await request.json();

        // Validate input
        if (!input.submission_id || !input.annotation_type || !input.content) {
            return json(
                { error: 'Missing required fields: submission_id, annotation_type, content' },
                { status: 400 },
            );
        }

        const { data, error } = await createAnnotation(input, user.id);

        if (error) {
            return json({ error }, { status: 400 });
        }

        return json({ data }, { status: 201 });
    } catch (err) {
        console.error('Annotation API error:', err);
        return json({ error: 'Internal server error' }, { status: 500 });
    }
};

export const DELETE: RequestHandler = async ({ url, locals }) => {
    try {
        // Verify authentication
        const user = locals.user;
        if (!user?.id) {
            return json({ error: 'Unauthorized' }, { status: 401 });
        }

        const id = url.searchParams.get('id');
        if (!id) {
            return json({ error: 'Missing annotation ID' }, { status: 400 });
        }

        const { deleteAnnotation } = await import('$lib/utils/dllReviewWorkflow');
        const { success, error } = await deleteAnnotation(id, user.id);

        if (!success) {
            return json({ error }, { status: 400 });
        }

        return json({ success: true }, { status: 200 });
    } catch (err) {
        console.error('Delete annotation API error:', err);
        return json({ error: 'Internal server error' }, { status: 500 });
    }
};

