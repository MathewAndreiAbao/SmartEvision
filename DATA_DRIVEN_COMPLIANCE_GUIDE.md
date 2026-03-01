# Data-Driven Compliance Logic - Complete Guide
## Smart E-vision Instructional Supervision

---

## Overview

The new data-driven compliance system automatically generates all expected submission slots based on:
- **Teaching Loads Count** (from `teaching_loads` table)
- **Academic Weeks** (from `academic_calendar` table with deadlines)

Each expected slot (load × week) starts as **missing** and changes status only when an actual submission arrives.

---

## Key Concepts

### 1. Expected Submissions
Each teacher's expected submissions = **Teaching Loads × Academic Weeks**

**Example:**
- Teacher has **4 teaching loads**
- Academic calendar has **10 weeks**
- **Expected total: 4 × 10 = 40 submissions**

### 2. Status Determination

When a submission arrives, the system determines its status based on submission date vs deadline:

| Scenario | Status | Description |
|----------|--------|-------------|
| No submission yet | `missing` | Auto-marked, updated when submission arrives |
| Submitted ≤ deadline | `compliant` | On-time submission |
| deadline < Submitted ≤ deadline+7days | `late` | Late but within grace period (default 7 days) |
| Submitted > deadline+7days | `non-compliant` | Submission rejected, outside allowed window |

### 3. Compliance Calculation

```
Compliance % = (Compliant Count / Expected Total) × 100
```

**Example Scenario:**
```
- Expected: 40 submissions (4 loads × 10 weeks)
- Teacher submits 10 compliant documents
- 8 late submissions
- 22 remain missing

Breakdown:
  Compliant: 10
  Late: 8
  Missing: 22
  Compliance Rate: (10/40) × 100 = 25%
```

---

## Implementation Details

### Core Functions

#### 1. `generateExpectedSubmissions()`
Generates all possible submission slots for a teacher.

```typescript
const expected = generateExpectedSubmissions(
  teachingLoadsCount,  // 4
  academicWeeks        // Array of AcademicWeek objects
);
// Returns: 40 expected submission objects
```

#### 2. `determineSubmissionStatus()`
Determines status of a single submission based on dates.

```typescript
const status = determineSubmissionStatus(
  submissionDate,    // "2025-09-10T14:30:00Z"
  deadlineDate,      // "2025-09-07T23:59:59Z"
  gracePeriodDays    // 7
);
// Returns: 'compliant' | 'late' | 'non-compliant' | 'missing'
```

#### 3. `calculateDataDrivenCompliance()`
Main function that orchestrates the complete compliance calculation.

```typescript
const report = calculateDataDrivenCompliance(
  teacherId,           // "user-123"
  teachingLoadsCount,  // 4
  academicWeeks,       // Array of weeks from calendar
  actualSubmissions    // Array of submissions from DB
);

// Returns:
{
  teacher_id: "user-123",
  teaching_loads_count: 4,
  total_weeks: 10,
  expected_total: 40,
  expected_submissions: [...],  // All 40 slots with their statuses
  actual_submissions: [...],    // Actual submissions from DB
  summary: {
    compliant_count: 10,
    late_count: 8,
    missing_count: 22,
    non_compliant_count: 0,
    compliance_percentage: 25
  },
  weekly_breakdown: [...]  // Week-by-week stats
}
```

---

## Dashboard Integration

The teacher dashboard now uses data-driven compliance:

1. **Fetch teaching loads count** from `teaching_loads` table
2. **Fetch academic calendar** for the active school year
3. **Fetch actual submissions** for the teacher
4. **Call `calculateDataDrivenCompliance()`** with all three inputs
5. **Display results** in compliance cards:
   - Compliant/Expected submissions (e.g., 10/40)
   - Compliance rate (e.g., 25%)
   - Late submissions (e.g., 8)
   - Non-compliant count (e.g., 22)
   - Weekly breakdown chart

---

## Test Scenarios

### Scenario 1: No Submissions Yet
```
Teacher: Jane Doe
Teaching Loads: 4
Academic Weeks: 10
Submissions: 0

Expected Total: 40
Status: All 40 marked as 'missing'
Compliance: 0%
```

### Scenario 2: Partial Submissions
```
Teacher: John Smith
Teaching Loads: 3
Academic Weeks: 8
Submissions: 12 total
  - 6 compliant (on time)
  - 3 late (within 7 days)
  - 3 non-compliant (beyond grace period)

Expected Total: 24
Compliant: 6
Late: 3
Missing: 15 (24 - 6 - 3)
Compliance Rate: (6/24) × 100 = 25%

Weekly Breakdown:
  Week 1: Expected 3, Received 2 compliant, 1 late → 67%
  Week 2: Expected 3, Received 1 compliant, 2 missing → 33%
  ... etc
```

### Scenario 3: Full Compliance
```
Teacher: Alice Johnson
Teaching Loads: 2
Academic Weeks: 5
Submissions: 10 total
  - 10 compliant (all on time)

Expected Total: 10
Compliant: 10
Late: 0
Missing: 0
Compliance Rate: (10/10) × 100 = 100%
```

---

## Database Relationships

```
Teacher (profiles)
├── teaching_loads (1 to many)
│   └── subject, grade_level, is_active
└── submissions (1 to many)
    ├── week_number
    ├── compliance_status ('compliant', 'late', 'non-compliant', 'missing')
    ├── created_at (submission date)
    └── calendar_id (FK to academic_calendar)

Academic Calendar (academic_calendar)
├── week_number
├── start_date
├── end_date
├── deadline_date (used for status determination)
└── school_year
```

---

## Grace Period Configuration

The default grace period is **7 days** after the deadline:
- Submissions arriving within 7 days = `late` status
- Submissions arriving after 7 days = `non-compliant` status

To change, modify the grace period parameter in `determineSubmissionStatus()`:

```typescript
const status = determineSubmissionStatus(
  submissionDate,
  deadlineDate,
  14  // Change to 14 days instead of 7
);
```

---

## Key Differences from Previous Logic

| Aspect | Old Logic | New (Data-Driven) |
|--------|-----------|-------------------|
| Expected Submissions | Hardcoded or estimated | Auto-generated from DB |
| Missing Status | Inferred from absence | Automatically created at start |
| Status Change | Manual intervention | Automatic on submission |
| Deadline Tracking | Simple late/on-time | Grace period with dates |
| Weekly Breakdown | Based on submissions only | Expected vs actual per week |
| Compliance %| (Compliant/Total Submitted) | (Compliant/Expected Total) |

---

## Troubleshooting

### Issue: All submissions showing as missing
**Solution:** Check that `academic_calendar` has `deadline_date` populated

### Issue: Compliance % incorrect
**Solution:** Verify `teaching_loads` count and that `is_active = true`

### Issue: Weekly data not showing
**Solution:** Ensure `academic_calendar` has entries for all weeks in the school year

---

## Future Enhancements

- [ ] Configurable grace period per school/district
- [ ] Bulk status corrections for past submissions
- [ ] Automatic deadline reminders based on calendar
- [ ] Per-load compliance tracking (identify which loads have issues)
- [ ] Predictive compliance analysis
