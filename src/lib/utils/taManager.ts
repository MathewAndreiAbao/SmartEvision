import { supabase } from "./supabase";

export interface TechnicalAssistance {
    id: string;
    supervisor_id: string;
    teacher_id?: string;
    school_id?: string;
    status: 'Suggested' | 'Offered' | 'Completed' | 'Cancelled';
    support_type: string;
    notes: string;
    offered_at: string;
    completed_at?: string;
    updated_at: string;
}

/**
 * Log a Technical Assistance outreach/offer
 */
export async function logTAOutreach(
    supervisorId: string,
    target: { teacherId?: string; schoolId?: string },
    supportType: string = 'Instructional Guidance'
): Promise<{ data: TechnicalAssistance | null, error: any }> {
    const { data, error } = await supabase
        .from('technical_assistance')
        .insert([{
            supervisor_id: supervisorId,
            teacher_id: target.teacherId,
            school_id: target.schoolId,
            status: 'Offered',
            support_type: supportType
        }])
        .select()
        .single();

    return { data, error };
}

/**
 * Fetch TA history for a specific teacher (Supervisor view)
 */
export async function getTeacherTAHistory(teacherId: string): Promise<TechnicalAssistance[]> {
    const { data, error } = await supabase
        .from('technical_assistance')
        .select('*')
        .eq('teacher_id', teacherId)
        .order('offered_at', { ascending: false });

    if (error) {
        console.error('Error fetching TA history:', error);
        return [];
    }
    return data || [];
}

/**
 * Fetch all TA records for a specific supervisor (School Head/District view)
 */
export async function getSupervisorTAWorkflow(supervisorId: string): Promise<TechnicalAssistance[]> {
    const { data, error } = await supabase
        .from('technical_assistance')
        .select('*')
        .eq('supervisor_id', supervisorId)
        .order('updated_at', { ascending: false });

    if (error) {
        console.error('Error fetching supervisor TA records:', error);
        return [];
    }
    return data || [];
}

/**
 * Update the notes or status of a TA session
 */
export async function updateTASession(
    taId: string, 
    updates: Partial<Pick<TechnicalAssistance, 'status' | 'notes' | 'completed_at' | 'support_type'>>
): Promise<any> {
    const { error } = await supabase
        .from('technical_assistance')
        .update({
            ...updates,
            updated_at: new Date().toISOString()
        })
        .eq('id', taId);

    return { error };
}
