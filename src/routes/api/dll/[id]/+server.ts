// ═══════════════════════════════════════════════════════════════
// DLL Submission Details API — GET /api/dll/[id]
// CEDIMS 2.0 — Get submission with review context
// ═══════════════════════════════════════════════════════════════

import { json, type RequestHandler } from '@sveltejs/kit';
import { supabase } from '$lib/utils/supabase';
import { getAnnotations, getReview, getAuditTrail } from '$lib/utils/dllReviewWorkflow';
import type { SubmissionWithReview } from '$lib/types/dll-review';

export const GET: RequestHandler = async ({ params, locals, url }) => {
    try {
        // Verify authentication (user is pre-validated by hooks.server.ts)
        const user = locals.user;
        if (!user?.id) {
            return json({ error: 'Unauthorized' }, { status: 401 });
        }

        const submissionId = params.id!;
        const includeAudit = url.searchParams.get('includeAudit') === 'true';

        // Get submission
        const { data: submission } = await supabase
            .from('submissions')
            .select(
                '*, teaching_loads(subject, grade_level), uploader:profiles(full_name, avatar_url)',
            )
            .eq('id', submissionId)
            .single();

        if (!submission) {
            return json({ error: 'Submission not found' }, { status: 404 });
        }

        // Verify access
        const { data: userProfile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        const isOwner = submission.user_id === user.id;
        const isSupervisor = userProfile?.role !== 'Teacher';

        if (!isOwner && !isSupervisor) {
            return json({ error: 'Forbidden' }, { status: 403 });
        }

        // Get related data
        const review = await getReview(submissionId);
        const annotations = await getAnnotations(submissionId);
        let auditLogs: any[] = [];
        if (includeAudit) {
            auditLogs = await getAuditTrail(submissionId);
        }

        const result: SubmissionWithReview = {
            ...submission,
            review: review || undefined,
            annotations: annotations.length > 0 ? annotations : undefined,
            audit_logs: auditLogs.length > 0 ? auditLogs : undefined,
        };

        return json(result, { status: 200 });
    } catch (err) {
        console.error('Submission details API error:', err);
        return json({ error: 'Internal server error' }, { status: 500 });
    }
};
