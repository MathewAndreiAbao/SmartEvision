-- ═══════════════════════════════════════════════════════════════
-- Migration: Add Week-Based Compliance Tracking
-- Smart E-vision Instructional Supervision
-- ═══════════════════════════════════════════════════════════════

-- This migration ensures the submissions table has proper week tracking
-- for the new compliance calculation logic.

-- Add week_compliance_status column if it doesn't exist
-- This tracks: compliant, late, non_compliant, no_submission
ALTER TABLE submissions 
ADD COLUMN IF NOT EXISTS week_compliance_status TEXT DEFAULT 'no_submission' 
CHECK (week_compliance_status IN ('compliant', 'late', 'non_compliant', 'no_submission'));

-- Add a function to calculate non-compliance score for a week
-- Score: 0 = fully compliant, 1 = partial compliance, 2 = no submission
CREATE OR REPLACE FUNCTION calculate_week_non_compliance_score(
    p_user_id UUID,
    p_week_number INTEGER,
    p_school_year TEXT
) RETURNS INTEGER AS $$
DECLARE
    submission_count INTEGER;
    compliant_count INTEGER;
BEGIN
    -- Count total submissions for this user in this week
    SELECT COUNT(*) INTO submission_count
    FROM submissions
    WHERE user_id = p_user_id
      AND week_number = p_week_number
      AND school_year = p_school_year;
    
    -- If no submissions, return 2 (non-compliant)
    IF submission_count = 0 THEN
        RETURN 2;
    END IF;
    
    -- Count compliant submissions (on-time or compliant)
    SELECT COUNT(*) INTO compliant_count
    FROM submissions
    WHERE user_id = p_user_id
      AND week_number = p_week_number
      AND school_year = p_school_year
      AND compliance_status IN ('compliant', 'on-time');
    
    -- If all are compliant, return 0
    IF compliant_count = submission_count THEN
        RETURN 0;
    END IF;
    
    -- If some are compliant, return 1
    IF compliant_count > 0 THEN
        RETURN 1;
    END IF;
    
    -- Default: non-compliant submissions only
    RETURN 2;
END;
$$ LANGUAGE plpgsql;

-- Add index for week-based queries
CREATE INDEX IF NOT EXISTS idx_submissions_week_school_year 
ON submissions(week_number, school_year, user_id);

-- Create view for week compliance summary
CREATE OR REPLACE VIEW week_compliance_summary AS
SELECT 
    user_id,
    week_number,
    school_year,
    calculate_week_non_compliance_score(user_id, week_number, school_year) AS non_compliance_score,
    COUNT(*) AS submission_count,
    SUM(CASE WHEN compliance_status IN ('compliant', 'on-time') THEN 1 ELSE 0 END) AS compliant_count
FROM submissions
WHERE week_number IS NOT NULL AND school_year IS NOT NULL
GROUP BY user_id, week_number, school_year;
