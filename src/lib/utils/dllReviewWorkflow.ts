// ═══════════════════════════════════════════════════════════════
// DLL Review Workflow — Utilities & Logic
// CEDIMS 2.0 — Business logic layer
// ═══════════════════════════════════════════════════════════════

import { supabase } from '$lib/utils/supabase';
import type { 
    DLLAnnotation, 
    DLLReview, 
    DLLAuditLog,
    CreateAnnotationInput,
    CreateReviewInput,
    SaveReviewCommentInput,
    ApproveReviewInput,
    ReturnReviewInput,
    CreateAuditLogInput,
} from '$lib/types/dll-review';
// ─── ANNOTATION MANAGEMENT ───────────────────────────────────

// Web Crypto helper (works in Node 18+ and browsers)
async function hmacSha256(secret: string, data: string): Promise<string> {
    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey(
        'raw',
        enc.encode(secret),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign'],
    );
    const sig = await crypto.subtle.sign('HMAC', key, enc.encode(data));
    return Array.from(new Uint8Array(sig))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
}

/**
 * Create a new annotation on a DLL submission
 * Validates that the user is the submission owner or assigned reviewer
 */
export async function createAnnotation(
    input: CreateAnnotationInput,
    userId: string,
): Promise<{ data?: DLLAnnotation; error?: string }> {
    try {
        // Verify user is submission owner or reviewer
        const { data: submission } = await supabase
            .from('submissions')
            .select('user_id')
            .eq('id', input.submission_id)
            .single();

        if (!submission) {
            return { error: 'Submission not found' };
        }

        const { data: review } = await supabase
            .from('dll_reviews')
            .select('reviewer_id')
            .eq('submission_id', input.submission_id)
            .single();

        const isOwner = submission.user_id === userId;
        const isReviewer = review?.reviewer_id === userId;

        if (!isOwner && !isReviewer) {
            return { error: 'Unauthorized: Not submission owner or reviewer' };
        }

        // Create annotation
        const { data, error } = await supabase
            .from('dll_annotations')
            .insert([
                {
                    submission_id: input.submission_id,
                    annotator_id: userId,
                    annotation_type: input.annotation_type,
                    content: input.content,
                    page_number: input.page_number,
                    position: input.position,
                    color: input.color || '#FFFF00',
                    is_official: input.is_official || false,
                },
            ])
            .select()
            .single();

        if (error) {
            return { error: error.message };
        }

        // Log annotation action
        await createAuditLog({
            submission_id: input.submission_id,
            action: 'annotated',
            actor_id: userId,
            actor_role: isReviewer ? 'Reviewer' : 'Teacher',
            details: { annotation_id: data.id },
        });

        return { data };
    } catch (err) {
        return { error: (err as Error).message };
    }
}

/**
 * Get all annotations for a submission
 */
export async function getAnnotations(
    submissionId: string,
): Promise<DLLAnnotation[]> {
    const { data } = await supabase
        .from('dll_annotations')
        .select('*')
        .eq('submission_id', submissionId)
        .order('created_at', { ascending: true });

    return data || [];
}

// ─── REVIEW WORKFLOW ────────────────────────────────────────

/**
 * Create a new review for a submission
 * Assigns a reviewer to check the DLL
 */
export async function createReview(
    input: CreateReviewInput,
    reviewerId: string,
): Promise<{ data?: DLLReview; error?: string }> {
    try {
        // Verify reviewer has proper role
        const { data: reviewer } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', reviewerId)
            .single();

        if (!reviewer || !['Master Teacher', 'School Head', 'District Supervisor'].includes(reviewer.role)) {
            return { error: 'Unauthorized: Only supervisors/master teachers can review' };
        }

        // Check if review already exists
        const { data: existing } = await supabase
            .from('dll_reviews')
            .select('id')
            .eq('submission_id', input.submission_id)
            .single();

        if (existing) {
            return { error: 'Review already exists for this submission' };
        }

        // Get current file hash for immutable record
        const { data: submission } = await supabase
            .from('submissions')
            .select('file_hash')
            .eq('id', input.submission_id)
            .single();

        if (!submission) {
            return { error: 'Submission not found' };
        }

        // Create review
        const { data, error } = await supabase
            .from('dll_reviews')
            .insert([
                {
                    submission_id: input.submission_id,
                    reviewer_id: reviewerId,
                    status: 'needs-check',
                    reviewer_comment: input.reviewer_comment,
                    file_hash_at_review: submission.file_hash,
                },
            ])
            .select()
            .single();

        if (error) {
            return { error: error.message };
        }

        // Log review creation
        await createAuditLog({
            submission_id: input.submission_id,
            action: 'reviewed',
            actor_id: reviewerId,
            actor_role: reviewer.role,
            details: { review_id: data.id },
        });

        return { data };
    } catch (err) {
        return { error: (err as Error).message };
    }
}

/**
 * Approve a submission (mark as compliant)
 */
export async function saveReviewComment(
    input: SaveReviewCommentInput,
    reviewerId: string,
): Promise<{ data?: DLLReview; error?: string }> {
    try {
        const { data: reviewer } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', reviewerId)
            .single();

        if (!reviewer || reviewer.role !== 'Master Teacher') {
            return { error: 'Unauthorized: Only master teachers can add remarks' };
        }

        const { data: existing } = await supabase
            .from('dll_reviews')
            .select('id')
            .eq('submission_id', input.submission_id)
            .maybeSingle();

        const reviewPayload = {
            submission_id: input.submission_id,
            reviewer_id: reviewerId,
            status: 'needs-check',
            reviewer_comment: input.reviewer_comment || null,
        };

        const { data, error } = existing
            ? await supabase
                .from('dll_reviews')
                .update(reviewPayload)
                .eq('id', existing.id)
                .select()
                .single()
            : await supabase
                .from('dll_reviews')
                .insert([reviewPayload])
                .select()
                .single();

        if (error) {
            return { error: error.message };
        }

        await createAuditLog({
            submission_id: input.submission_id,
            action: 'reviewed',
            actor_id: reviewerId,
            actor_role: reviewer.role,
            details: { review_id: data.id, reason: input.reviewer_comment },
        });

        return { data };
    } catch (err) {
        return { error: (err as Error).message };
    }
}

export async function approveReview(
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

        // Log return
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
