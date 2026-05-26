-- Migration: Update compliance_status values from old to new terminology
-- Old: 'on-time', 'late', 'missing'
-- New: 'compliant', 'late', 'non-compliant'

BEGIN;

-- 1. Update existing submissions data
UPDATE submissions SET compliance_status = 'compliant' WHERE compliance_status = 'on-time';
UPDATE submissions SET compliance_status = 'non-compliant' WHERE compliance_status = 'missing';

-- 2. Drop the old constraint
ALTER TABLE submissions DROP CONSTRAINT submissions_compliance_status_check;

-- 3. Add new constraint with updated values
ALTER TABLE submissions ADD CONSTRAINT submissions_compliance_status_check 
  CHECK (compliance_status IN ('compliant', 'late', 'non-compliant'));

-- 4. Update default value
ALTER TABLE submissions ALTER COLUMN compliance_status SET DEFAULT 'compliant';

COMMIT;
