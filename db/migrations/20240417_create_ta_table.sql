-- Migrations: 20240417_create_ta_table.sql
-- Purpose: Enable state-driven technical assistance logging

-- Create the technical_assistance table
CREATE TABLE IF NOT EXISTS technical_assistance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    supervisor_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    teacher_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('Suggested', 'Offered', 'Completed', 'Cancelled')) DEFAULT 'Offered',
    support_type TEXT DEFAULT 'Instructional Guidance',
    notes TEXT, -- Private notes for the supervisor
    offered_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE technical_assistance ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- 1. Supervisors can see all TA records within their scope (handled via profiles join logic in application)
-- But for strict DB security:
CREATE POLICY "Supervisors manage their TA sessions" ON technical_assistance
FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('School Head', 'District Supervisor', 'Master Teacher'))
);

-- 2. Teachers can see their own support history
CREATE POLICY "Teachers view their own TA history" ON technical_assistance
FOR SELECT USING (auth.uid() = teacher_id);

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_ta_teacher_id ON technical_assistance(teacher_id);
CREATE INDEX IF NOT EXISTS idx_ta_supervisor_id ON technical_assistance(supervisor_id);
CREATE INDEX IF NOT EXISTS idx_ta_status ON technical_assistance(status);
