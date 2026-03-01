# Load-Based Compliance Logic
## Smart E-vision Instructional Supervision

### Overview

The new compliance system calculates compliance based on **expected submissions**, which is determined by:

```
Expected Submissions = Teaching Loads Count × Academic Weeks
```

Instead of tracking just the count of uploaded documents, the system now tracks what teachers **should have submitted** versus what they **actually submitted** and in what compliance status.

---

## Key Concepts

### 1. Expected Submissions Formula

For each teacher:
- **Teaching Loads**: Number of distinct classes/subjects assigned
- **Academic Weeks**: Number of weeks in the academic calendar (typically 10)
- **Expected Total**: Teaching Loads × Academic Weeks

**Example:**
- Teacher has 4 teaching loads (Math, Science, English, PE)
- Academic calendar has 10 weeks
- **Expected submissions**: 4 × 10 = **40 total submissions**

### 2. Non-Compliance Tracking

Each missing or non-compliant submission is tracked as one "non-compliant" entry.

**Automatic Marking:**
- When a deadline passes for a week with no submission, the system automatically marks that week as having a **non-compliant entry**
- Status only changes when a submission occurs (either compliant or late)

**Example with 4 loads, 10 weeks (40 expected total):**
- **Scenario 1**: Teacher uploads 0 documents
  - Non-compliant count: 40
  - Compliance rate: 0%

- **Scenario 2**: Teacher uploads 10 compliant documents across various weeks/loads
  - Compliant count: 10
  - Non-compliant count: 30
  - Compliance rate: (10/40) × 100 = 25%

- **Scenario 3**: Teacher uploads 8 compliant + 2 late documents
  - Compliant count: 8
  - Late count: 2
  - Non-compliant count: 30
  - Compliance rate: (8/40) × 100 = 20%

### 3. Compliance Rate Calculation

```
Compliance Rate (%) = (Compliant Submissions / Expected Total Submissions) × 100
```

Only **compliant** submissions count toward a positive compliance rate. Late submissions are tracked separately.

---

## Implementation Details

### Submission Statuses

Each submission can have one of three statuses:
- **compliant**: Submitted on time, before deadline
- **late**: Submitted after deadline but has been submitted
- **non-compliant**: Missing or not submitted

### Weekly Breakdown

For tracking purposes, submissions are grouped by:
- **Week Number**: Which week the submission belongs to
- **Teaching Load**: Which class/subject the submission is for

**Weekly Expected**: For each week, the expected count = number of active teaching loads

Example weekly view (4 loads × 10 weeks):
```
Week 1: Expected 4 submissions
  - Load 1: Compliant ✓
  - Load 2: Compliant ✓
  - Load 3: Non-compliant ✗
  - Load 4: Non-compliant ✗
  - Week 1 rate: 50%

Week 2: Expected 4 submissions
  - Load 1: Compliant ✓
  - Load 2: Late (submitted but after deadline)
  - Load 3: Compliant ✓
  - Load 4: Non-compliant ✗
  - Week 2 rate: 50%

Overall Rate: (6 compliant / 40 expected) × 100 = 15%
```

---

## Database Representation

The system uses the existing `submissions` table with these key fields:
- `user_id`: Teacher ID
- `week_number`: Academic calendar week
- `compliance_status`: "compliant", "late", or "non-compliant"
- `created_at`: When the submission was uploaded
- `teaching_loads(id)`: Reference to which teaching load this submission is for

### Automatic Non-Compliance Marking

When a week's deadline passes without a submission from a teacher for a specific teaching load, the system automatically creates a placeholder submission record with:
- `compliance_status`: "non-compliant"
- `file_name`: "[MISSING] Week X"
- `file_hash`: Unique identifier to prevent duplicates

This ensures that missing submissions are explicitly tracked rather than inferred.

---

## Usage in Code

### Calculate Load-Based Compliance

```typescript
import { calculateLoadBasedCompliance } from "$lib/utils/useDashboardData";

const submissions = [...]; // Array of submission objects
const teachingLoadsCount = 4;
const totalWeeks = 10;

const stats = calculateLoadBasedCompliance(
  submissions,
  teachingLoadsCount,
  totalWeeks
);

// Returns:
// {
//   expected_total: 40,
//   compliant_count: 10,
//   late_count: 2,
//   non_compliant_count: 28,
//   compliance_percentage: 25,
//   breakdown_by_status: { compliant: 10, late: 2, non_compliant: 28 }
// }
```

### Get Weekly Breakdown

```typescript
import { getWeeklyLoadBreakdown } from "$lib/utils/useDashboardData";

const weeklyData = getWeeklyLoadBreakdown(
  submissions,
  teachingLoadsCount,
  totalWeeks
);

// Returns array of:
// {
//   week_number: 1,
//   expected_per_week: 4,
//   received_compliant: 2,
//   received_late: 1,
//   received_non_compliant: 0,
//   received_total: 3,
//   pending_count: 1,  // 4 - 3
//   week_compliance_percentage: 50  // (2/4) × 100
// }
```

### Get Comprehensive Summary

```typescript
import { getLoadBasedComplianceSummary } from "$lib/utils/useDashboardData";

const summary = getLoadBasedComplianceSummary(
  submissions,
  teachingLoadsCount,
  totalWeeks
);

// Returns:
// {
//   overall_stats: { ... },          // Overall compliance stats
//   weekly_breakdown: [ ... ],       // Week-by-week breakdown
//   total_submissions: 15,           // Total received (compliant + late + non-compliant)
//   submission_rate: 37.5            // (15/40) × 100
// }
```

---

## Display in Dashboard

The teacher dashboard now displays:

1. **Submissions Stat Card**: `{compliant}/{expected}` (e.g., "10/40")
2. **Compliance Rate**: Percentage based on compliant submissions only (e.g., "25%")
3. **Late Submissions**: Count of late submissions (e.g., "2")
4. **Non-Compliant Count**: Total missing/non-compliant submissions (e.g., "28")

The **Compliance Rate** is the key metric that supervisors monitor. A teacher with 0% compliance rate means they have submitted no compliant documents within the expected timeframe.

---

## Migration from Previous Logic

Previously, the system calculated:
```
Compliance Rate = (Total Uploaded / Total Uploaded) × 100
```

This only tracked what was uploaded, not what was expected.

**New system calculates:**
```
Compliance Rate = (Compliant Submissions / Expected Submissions) × 100
```

This properly tracks supervisory compliance by measuring against the expected workload.

---

## Examples

### Example 1: Perfect Compliance
- **Teacher**: 4 loads, 10 weeks
- **Expected**: 40 submissions
- **Actual**: 40 compliant submissions
- **Non-compliant count**: 0
- **Compliance rate**: 100%

### Example 2: Partial Compliance
- **Teacher**: 4 loads, 10 weeks
- **Expected**: 40 submissions
- **Actual**: 20 compliant submissions
- **Late**: 5 submissions
- **Non-compliant count**: 15 (40 - 20 - 5)
- **Compliance rate**: (20/40) × 100 = 50%

### Example 3: No Compliance
- **Teacher**: 4 loads, 10 weeks
- **Expected**: 40 submissions
- **Actual**: 0 submissions
- **Non-compliant count**: 40
- **Compliance rate**: 0%

### Example 4: Partial Period
- **Teacher**: 4 loads
- **Academic period**: Only 5 weeks have passed (deadline-wise)
- **Expected**: 20 submissions (4 × 5)
- **Actual**: 8 compliant, 2 late
- **Non-compliant count**: 10 (20 - 8 - 2)
- **Compliance rate**: (8/20) × 100 = 40%
