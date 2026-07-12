// ═══════════════════════════════════════════════════════════════
// DLL Review Workflow — Utilities & Logic
// CEDIMS 2.0 — Business logic layer// ═══════════════════════════════════════════════════════════════

import { supabase } from '$lib/utils/supabase';
import type { 
    DLLAnnotation, 
    DLLReview, 
    DLLAuditLog,
    CreateAnnotationInput,
    CreateReviewInput,
    SaveReviewCommentInput,export async function approveReview(
    input: ApproveReviewInput,
    reviewerId: string,
): Promise<{ data?: DLLReview; error?: string }> {
    try {
        // Verify ownership
        const { data: review } = await supabase
            .from('dll_reviews')
            .select('submission_id, reviewer_id')
            .eq('id', input.review_id)
            .single();

        if (!review || review.reviewer_id !== reviewerId) {
            return { error: 'Unauthorized: Not the assigned reviewer' };
        }

        // Get reviewer role
        const { data: reviewer } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', reviewerId)
            .single();

        // Update review status
        const { data, error } = await supabase
            .from('dll_reviews')
            .update({
                status: 'approved',
                approved_at: new Date().toISOString(),
            })
            .eq('id', input.review_id)
            .select()
            .single();

        if (error) {
            return { error: error.message };
        }
        // Update submission compliance status
        await supabase
            .from('submissions')
            .update({ compliance_status: 'compliant' })
            .eq('id', review.submission_id);
        // Log approval
        await createAuditLog({
            submission_id: review.submission_id,
            action: 'approved',
            actor_id: reviewerId,
            actor_role: reviewer?.role || 'Reviewer',
            details: { review_id: input.review_id },
        });

        return { data };
    } catch (err) {
        return { error: (err as Error).message };
    }
}

/**
 * Return submission for revisions
 */
export async function returnReview(
    input: ReturnReviewInput,
    reviewerId: string,
): Promise<{ data?: DLLReview; error?: string }> {
    try {
        // Verify ownership
        const { data: review } = await supabase
            .from('dll_reviews')
            .select('submission_id, reviewer_id')
            .eq('id', input.review_id)
            .single();

        if (!review || review.reviewer_id !== reviewerId) {
            return { error: 'Unauthorized: Not the assigned reviewer' };
        }

        // Get reviewer role
        const { data: reviewer } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', reviewerId)
            .single();

        // Update review status
        const { data, error } = await supabase
            .from('dll_reviews')
            .update({
                status: 'returned',
                return_reason: input.return_reason,
                returned_at: new Date().toISOString(),
            })
            .eq('id', input.review_id)
            .select()
            .single();

        if (error) {
            return { error: error.message };
        }
        await createAuditLog({
            submission_id: review.submission_id,
            action: 'returned',
            actor_id: reviewerId,
            actor_role: reviewer?.role || 'Reviewer',
            details: {
                review_id: input.review_id,
                reason: input.return_reason,
            },
        });

        return { data };
    } catch (err) {
        return { error: (err as Error).message };
    }
}

/**
 * Get review for a submission
 */
export async function getReview(submissionId: string): Promise<DLLReview | null> {
    const { data } = await supabase
        .from('dll_reviews')
        .select('*')
        .eq('submission_id', submissionId)
        .single();

    return data || null;
}

// ─── AUDIT LOGGING ──────────────────────────────────────────

/**
 * Create an immutable audit log entry
 * Includes HMAC signature for tamper detection
 */
export async function createAuditLog(
    input: CreateAuditLogInput,
): Promise<{ data?: DLLAuditLog; error?: string }> {
    try {
        // Generate signature hash (HMAC-SHA256)
        const secret = (typeof process !== 'undefined' && process.env?.AUDIT_LOG_SECRET) || 'default-secret';
        const logData = `${input.submission_id}|${input.action}|${input.actor_id}|${new Date().toISOString()}`;
        const signatureHash = await hmacSha256(secret, logData);

        // Insert immutable log
        const { data, error } = await supabase
            .from('dll_audit_logs')
            .insert([
                {
                    submission_id: input.submission_id,
                    action: input.action,
                    actor_id: input.actor_id,
                    actor_role: input.actor_role,
                    details: input.details,
                    file_hash: input.file_hash,
                    signature_hash: signatureHash,
                },
            ])
            .select()
            .single();

        if (error) {
            console.error('Audit log creation failed:', error);
            return { error: error.message };
        }

        return { data };
    } catch (err) {
        console.error('Audit log error:', err);
        return { error: (err as Error).message };
    }
}

/**
 * Get audit trail for a submission
 */
export async function getAuditTrail(submissionId: string): Promise<DLLAuditLog[]> {
    const { data } = await supabase
        .from('dll_audit_logs')
        .select('*')
        .eq('submission_id', submissionId)
        .order('created_at', { ascending: true });

    return data || [];
}

/**
 * Verify audit log integrity
 */
export async function verifyAuditLogSignature(log: DLLAuditLog, secret: string = 'default-secret'): Promise<boolean> {
    const logData = `${log.submission_id}|${log.action}|${log.actor_id}|${log.created_at}`;
    const expectedHash = await hmacSha256(secret, logData);
    return expectedHash === log.signature_hash;
}

// ─── REVIEW SUMMARY ────────────────────────────────────────

/**
 * Get review summary statistics
 */
export async function getReviewSummary(scope: { school_id?: string; district_id?: string }) {
    let query = supabase.from('dll_reviews').select('*');

    if (scope.school_id) {
        query = query.in(
            'submission_id',
            (
                await supabase
                    .from('submissions')
                    .select('id')
                    .in(
                        'user_id',
                        (
                            await supabase
                                .from('profiles')
                                .select('id')
                                .eq('school_id', scope.school_id)
                        ).data?.map((p) => p.id) || [],
                    )
            ).data?.map((s) => s.id) || [],
        );
    }

    const { data } = await query;

    const reviews = data || [];

    return {
        total_submissions: reviews.length,
        pending_review: reviews.filter((r) => r.status === 'needs-check').length,
        approved: reviews.filter((r) => r.status === 'approved').length,
        returned: reviews.filter((r) => r.status === 'returned').length,
        compliance_rate: reviews.length > 0 
            ? Math.round((reviews.filter((r) => r.status === 'approved').length / reviews.length) * 100)
            : 0,
    };
}

/**
 * Delete an annotation
 */
export async function deleteAnnotation(
    annotationId: string,
    userId: string,
): Promise<{ success: boolean; error?: string }> {
    try {
        const { data: annotation } = await supabase
            .from('dll_annotations')
            .select('annotator_id, submission_id')
            .eq('id', annotationId)
            .single();

        if (!annotation) {
            return { success: false, error: 'Annotation not found' };
        }

        const { data: review } = await supabase
            .from('dll_reviews')
            .select('reviewer_id')
            .eq('submission_id', annotation.submission_id)
            .single();

        const isOwner = annotation.annotator_id === userId;
        const isReviewer = review?.reviewer_id === userId;

        if (!isOwner && !isReviewer) {
            return { success: false, error: 'Unauthorized: Not annotation owner or reviewer' };
        }

        const { error } = await supabase
            .from('dll_annotations')
            .delete()
            .eq('id', annotationId);

        if (error) {
            return { success: false, error: error.message };
        }

        return { success: true };
    } catch (err) {
        return { success: false, error: (err as Error).message };
    }
}
