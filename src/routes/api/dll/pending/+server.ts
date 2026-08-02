// ═══════════════════════════════════════════════════════════════
// DLL Pending Reviews API — GET /api/dll/pending
// CEDIMS 2.0 — Fetch submissions awaiting review
// ═══════════════════════════════════════════════════════════════

import { json, type RequestHandler } from '@sveltejs/kit';
import { createAuthedSupabase } from '$lib/server/authClient';

export const GET: RequestHandler = async ({ locals, url }) => {
    try {
        // Verify authentication (user is pre-validated by hooks.server.ts)
        const user = locals.user;
        if (!user?.id || !locals.authToken) {
            return json({ error: 'Unauthorized' }, { status: 401 });
        }

        const supabase = await createAuthedSupabase(locals.authToken);

        // Get reviewer's profile and role
        const { data: reviewer } = await supabase
            .from('profiles')
            .select('id, role, school_id, district_id')
            .eq('id', user.id)
            .single();

        if (!reviewer) {
            return json({ error: 'Profile not found' }, { status: 404 });
        }

        // Only supervisors can view pending reviews
        if (reviewer.role === 'Teacher') {
            return json({ data: [] }, { status: 200 });
        }

        // Build query based on role
        let query = supabase
            .from('submissions')
            .select(`
                id,
                file_name,
                user_id,
                doc_type,
                compliance_status,
                created_at,
                week_number,
                uploader:profiles!inner(full_name, school_id, district_id),
                dll_review:dll_reviews(id, status, reviewer_id, reviewed_at)
            `)
            .order('created_at', { ascending: false });

        // Filter by scope
        if (reviewer.role === 'School Head' || reviewer.role === 'Master Teacher') {
            if (reviewer.school_id) {
                query = query.eq('profiles.school_id', reviewer.school_id);
            }
        } else if (reviewer.role === 'District Supervisor') {
            if (reviewer.district_id) {
                query = query.eq('profiles.district_id', reviewer.district_id);
            }
        }

        const { data: submissions, error } = await query;

        if (error) {
            console.error('Pending reviews query error:', error);
            return json({ error: 'Failed to fetch pending reviews' }, { status: 500 });
        }

        // Filter for submissions needing review
        const pending = (submissions || []).filter((sub: any) => {
            const review = Array.isArray(sub.dll_review) ? sub.dll_review[0] : sub.dll_review;
            return !review || review.status === 'needs-check' || review.status === 'returned';
        });

        return json({ data: pending }, { status: 200 });
    } catch (err) {
        console.error('Pending reviews API error:', err);
        return json({ error: 'Internal server error' }, { status: 500 });
    }
};
