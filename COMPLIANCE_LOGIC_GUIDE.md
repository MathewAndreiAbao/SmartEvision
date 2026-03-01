# Smart E-vision Instructional Supervision — Compliance Logic Guide

## System Rebranding
The system has been fully rebranded from "Smart E-VISION" to **"Smart E-vision Instructional Supervision"** across all components:
- Sidebar navigation
- Landing page
- Dashboard titles
- Web app manifest
- Page titles and meta descriptions

The landing page has also been simplified to a minimal design with only the logo, system name, and login button.

## New Week-Based Compliance Calculation

### Overview
The compliance system now uses a **week-based calculation model** where each academic week is evaluated independently. The overall compliance percentage is determined by counting how many weeks are fully compliant.

### Non-Compliance Score Per Week

Each week is assigned a non-compliance score that represents its compliance status:

| Score | Meaning | Condition |
|-------|---------|-----------|
| **0** | Fully Compliant | All submissions in the week are compliant/on-time |
| **1** | Partial Compliance | Mix of compliant and non-compliant submissions |
| **2** | Non-Compliant | No submissions OR only non-compliant submissions |

### Calculation Rules

1. **No Submission = 2 (Non-Compliant)**
   - If a teacher has zero submissions for a week, the week scores 2 points
   - This week will NOT count toward the compliance percentage

2. **Partial Submissions = 1**
   - If a teacher has 1+ documents submitted, the score improves from 2 to 1
   - Can be compliant, late, or marked as compliant submission
   - This week will NOT count toward the compliance percentage

3. **Full Compliance = 0**
   - Only when ALL submissions in a week are compliant/on-time
   - This week COUNTS toward the compliance percentage

### Overall Compliance Percentage

**Formula:**
```
Compliance Rate = (Fully Compliant Weeks / Total Weeks) × 100
```

**Examples:**
- Week 1: Compliant (score 0) | Week 2: No submission (score 2) → **50% Compliance** (1 out of 2 weeks)
- Week 1: Compliant (score 0) | Week 2: Compliant (score 0) → **100% Compliance** (2 out of 2 weeks)
- Week 1: Mixed submissions (score 1) | Week 2: No submission (score 2) → **0% Compliance** (0 out of 2 weeks)

### Key Differences from Traditional Model

**Old Model (Submission-Based):**
- Compliance Rate = Compliant Documents / Total Documents
- Result: 50% if 1 out of 2 documents is compliant

**New Model (Week-Based):**
- Compliance Rate = Fully Compliant Weeks / Total Weeks
- Result: 50% if 1 out of 2 weeks has only compliant submissions
- More holistic view of teacher compliance across the academic period

## Implementation

### New Functions in `useDashboardData.ts`

#### `calculateWeekNonComplianceScore(submissions)`
Calculates the non-compliance score (0, 1, or 2) for a set of submissions from a single week.

**Parameters:**
- `submissions`: Array of submission objects with `compliance_status`

**Returns:** Integer (0, 1, or 2)

#### `getWeeklyComplianceDetails(submissions, totalWeeks)`
Returns week-by-week breakdown showing:
- Week number
- Non-compliance score
- Submission count
- Compliant count
- Boolean flag indicating if week is fully compliant

#### `calculateWeekBasedCompliancePercentage(submissions, totalWeeks)`
Calculates the overall compliance percentage using the new week-based logic.

**Parameters:**
- `submissions`: Array of all submissions
- `totalWeeks`: Total weeks to evaluate (default: 10)

**Returns:** Percentage (0-100)

#### `getComplianceSummary(submissions, totalWeeks)`
Returns comprehensive compliance summary including:
- Weekly details for each week
- Week-based percentage
- Traditional percentage (for comparison)
- Count of compliant weeks
- Count of non-compliant weeks

### Database Schema

The system uses the existing `academic_calendar` table to track weeks:
```sql
CREATE TABLE academic_calendar (
    id UUID PRIMARY KEY,
    district_id UUID,
    school_year TEXT,
    quarter INTEGER,
    week_number INTEGER,
    deadline_date TIMESTAMPTZ,
    ...
)
```

Submissions are linked to weeks via `week_number`:
```sql
CREATE TABLE submissions (
    id UUID PRIMARY KEY,
    user_id UUID,
    week_number INTEGER,
    compliance_status TEXT,  -- 'compliant', 'late', or 'non-compliant'
    ...
)
```

## Migration Guide

### For Dashboard Display
To use the new compliance calculation in components:

```typescript
import { calculateWeekBasedCompliancePercentage, getComplianceSummary } from '$lib/utils/useDashboardData';

// Option 1: Just get the percentage
const complianceRate = calculateWeekBasedCompliancePercentage(submissions, 10);

// Option 2: Get detailed summary
const summary = getComplianceSummary(submissions, 10);
// summary.week_based_percentage → new calculation
// summary.traditional_percentage → old calculation for comparison
// summary.compliant_weeks_count → number of fully compliant weeks
```

### Transitioning Components

The old `calculateCompliance()` function still works for traditional compliance calculations. To transition to the new model:

1. Replace compliance rate calculation with `calculateWeekBasedCompliancePercentage()`
2. Use `getWeeklyComplianceDetails()` for per-week status indicators
3. Update dashboard displays to show week-based breakdown

## Questions & Support

For implementation questions or compliance calculation details, refer to the function documentation in `useDashboardData.ts`.
