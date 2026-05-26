// ═══════════════════════════════════════════════════════════════
// DLL Review API — POST /api/dll/review
// Smart E-VISION 2.0 — Create or manage review
// ═══════════════════════════════════════════════════════════════

import { json, type RequestHandler } from '@sveltejs/kit';
import {
    createReview,
    approveReview,
    returnReview,
} from '$lib/utils/dllReviewWorkflow';
import type { CreateReviewInput, ApproveReviewInput, ReturnReviewInput } from '$lib/types/dll-review';

export const POST: RequestHandler = async ({ request, locals, url }) => {
    try {
        // Verify authentication (user is pre-validated by hooks.server.ts)
        const user = locals.user;
        if (!user?.id) {
            return json({ error: 'Unauthorized' }, { status: 401 });
        }

        const action = url.searchParams.get('action') || 'create';
        const body = await request.json();

        if (action === 'create') {
            const input: CreateReviewInput = body;

            // Validate input
            if (!input.submission_id) {
                return json({ error: 'Missing required field: submission_id' }, { status: 400 });
            }

            const { data, error } = await createReview(input, user.id);
            if (error) {
                return json({ error }, { status: 400 });
            }

            return json({ data }, { status: 201 });
        } else if (action === 'approve') {
            const input: ApproveReviewInput = body;

            if (!input.review_id) {
                return json({ error: 'Missing required field: review_id' }, { status: 400 });
            }

            const { data, error } = await approveReview(input, user.id);
            if (error) {
                return json({ error }, { status: 400 });
            }

            return json({ data }, { status: 200 });
        } else if (action === 'return') {
            const input: ReturnReviewInput = body;

            if (!input.review_id || !input.return_reason) {
                return json(
                    { error: 'Missing required fields: review_id, return_reason' },
                    { status: 400 },
                );
            }

            const { data, error } = await returnReview(input, user.id);
            if (error) {
                return json({ error }, { status: 400 });
            }

            return json({ data }, { status: 200 });
        } else {
            return json({ error: 'Invalid action' }, { status: 400 });
        }
    } catch (err) {
        console.error('Review API error:', err);
        return json({ error: 'Internal server error' }, { status: 500 });
    }
};
