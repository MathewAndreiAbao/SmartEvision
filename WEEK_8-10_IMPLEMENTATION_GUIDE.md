# Weeks 8-10 Implementation Guide
**Project:** Smart E-VISION  
**Status:** Week 7 Complete → Week 8 Ready  
**Developers:** Team Assignment Required

---

## WEEK 8: ADVANCED ANALYTICS & NLP (Critical Path)

### Phase 8.1: NLP Document Classification (Days 1-3)

#### 8.1.1 Rule-Based Subject Extraction
**File:** `src/lib/utils/nlp-classifier.ts` (NEW)

```typescript
// Features:
// - Parse OCR output for subject keywords
// - Map to predefined subject list
// - Return confidence score (0-100%)

interface ClassificationResult {
  subject: string;
  confidence: number;
  keywords: string[];
  fallback: boolean;
}

function classifySubject(ocrText: string): ClassificationResult {
  // Implement keyword matching against:
  // - Mathematics, English, Science, Filipino, etc.
  // - Grade-level specific terms
  // - Confidence scoring based on keyword density
}
```

**Test Checklist:**
- [ ] Test with 20+ sample PDFs (mixed subjects)
- [ ] Verify confidence > 80% for clear subjects
- [ ] Handle edge cases (mixed subjects, poor OCR)

#### 8.1.2 Grade Level Detection
**File:** `src/lib/utils/nlp-classifier.ts` (extend)

```typescript
// Features:
// - Extract grade/year from document
// - Validate against teaching load
// - Flag mismatches

function detectGradeLevel(ocrText: string): string {
  // Look for: "Grade 1-6", "First Year", numeric patterns
  // Return normalized format (e.g., "Grade 3")
  // Flag if conflicts with submission metadata
}
```

#### 8.1.3 Document Type Confidence
**File:** `src/lib/utils/nlp-classifier.ts` (extend)

```typescript
// Features:
// - Classify as DLL, ISP, ISR
// - Use content patterns (lesson plans → DLL, supervision → ISP)
// - Suggest type with confidence

interface DocumentTypeResult {
  type: "DLL" | "ISP" | "ISR" | "UNKNOWN";
  confidence: number;
  suggestion: string;
}

function classifyDocumentType(ocrText: string): DocumentTypeResult {
  // Pattern matching:
  // - DLL: "lesson plan", "learning competencies", "subject"
  // - ISP: "supervisory plan", "teacher", "observation"
  // - ISR: "report", "findings", "recommendations"
}
```

#### 8.1.4 Metadata Enrichment Pipeline
**Integration Points:**
- Trigger on submission upload (in `pipeline.ts`)
- Store results in `submissions.metadata` JSON field
- Create `submission_metadata` table:
  ```sql
  CREATE TABLE submission_metadata (
    id UUID PRIMARY KEY,
    submission_id UUID REFERENCES submissions(id),
    classified_subject VARCHAR,
    classified_grade VARCHAR,
    classified_doc_type VARCHAR,
    confidence_score FLOAT,
    needs_review BOOLEAN,
    created_at TIMESTAMP
  );
  ```

**Test Checklist:**
- [ ] NLP runs without blocking pipeline
- [ ] Results stored within 2 seconds
- [ ] Metadata queryable for admin review

---

### Phase 8.2: Compliance Analytics (Days 2-5)

#### 8.2.1 Heatmap Data Aggregation
**File:** `src/routes/dashboard/analytics/+page.server.ts` (NEW)

```typescript
interface HeatmapCell {
  school_id: string;
  school_name: string;
  week_number: number;
  compliant: number;
  late: number;
  non_compliant: number;
  total: number;
  compliance_rate: number; // 0-100%
}

async function fetchHeatmapData(districtId: string): Promise<HeatmapCell[]> {
  // Query submissions grouped by school × week
  // Calculate compliance % per cell
  // Return grid structure (5 schools × 10 weeks = 50 cells)
  
  const query = `
    SELECT 
      s.school_id,
      sc.name as school_name,
      sub.week_number,
      COUNT(*) as total,
      COUNT(CASE WHEN sub.status = 'Compliant' THEN 1 END) as compliant,
      COUNT(CASE WHEN sub.status = 'Late' THEN 1 END) as late,
      COUNT(CASE WHEN sub.status = 'Non-compliant' THEN 1 END) as non_compliant
    FROM submissions sub
    JOIN schools sc ON sub.school_id = sc.id
    WHERE sc.district_id = $1
    GROUP BY s.school_id, sc.name, sub.week_number
    ORDER BY sc.name, sub.week_number
  `;
}
```

**Database Changes:**
- Add `submissions.week_number` index (if not exists)
- Add `submissions.status` index (if not exists)
- Add composite index: `(school_id, week_number, status)`

#### 8.2.2 Predictive Risk Flagging
**File:** `src/lib/utils/risk-calculator.ts` (NEW)

```typescript
interface TeacherRisk {
  teacher_id: string;
  risk_score: number; // 0-100
  flags: string[];
  alert_level: "LOW" | "MEDIUM" | "HIGH";
}

function calculateRiskScore(submissionHistory: any[]): TeacherRisk {
  // Analyze:
  // - Count late submissions (last 4 weeks)
  // - Check for zero submissions in weeks
  // - Trend (improving vs. worsening)
  // - Score: 0 (compliant) → 100 (chronic non-compliant)
  
  let score = 0;
  const flags: string[] = [];
  
  // Logic:
  // +25 per late submission (last 4 weeks)
  // +15 per missing week
  // -5 if improving trend
  
  const alertLevel = score >= 75 ? "HIGH" : score >= 50 ? "MEDIUM" : "LOW";
  
  return { teacher_id, risk_score: score, flags, alert_level };
}
```

**Test Checklist:**
- [ ] Test with 50 teachers across 5 schools
- [ ] Verify HIGH alerts for chronically late teachers
- [ ] Check alerts update weekly

#### 8.2.3 School-Level Aggregation
**File:** `src/lib/utils/school-analytics.ts` (NEW)

```typescript
interface SchoolAnalytics {
  school_id: string;
  school_name: string;
  total_teachers: number;
  compliant_count: number;
  late_count: number;
  non_compliant_count: number;
  average_compliance: number;
  trend: "improving" | "declining" | "stable";
  high_risk_teachers: number;
}

async function getSchoolAnalytics(schoolId: string): Promise<SchoolAnalytics> {
  // Aggregate across all teachers in school
  // Calculate trends (this week vs. last week)
}
```

---

### Phase 8.3: Enhanced Analytics Page (Days 4-7)

#### 8.3.1 Heatmap Component
**File:** `src/lib/components/ComplianceHeatmap.svelte` (REWRITE)

```svelte
<script lang="ts">
  // Features:
  // - Grid layout: 5 schools (rows) × 10 weeks (columns)
  // - Color cells: Green (>80%), Yellow (50-80%), Red (<50%)
  // - Interactive: Hover for %, Click for drill-down
  // - Responsive: Scroll on mobile
  
  let heatmapData = $state<HeatmapCell[]>([]);
  let selectedCell = $state<HeatmapCell | null>(null);
  let showDrillDown = $state(false);
  
  function getColorForRate(rate: number): string {
    if (rate >= 80) return "bg-deped-green";
    if (rate >= 50) return "bg-deped-gold";
    return "bg-deped-red";
  }
  
  function handleCellClick(cell: HeatmapCell) {
    selectedCell = cell;
    showDrillDown = true;
  }
</script>

<div class="overflow-x-auto bg-white/50 rounded-2xl p-4">
  <table class="w-full border-collapse">
    <!-- Grid structure -->
    {#each schoolList as school (school.id)}
      <tr>
        <th class="font-bold text-left px-2 py-2">{school.name}</th>
        {#each [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as week}
          {#if heatmapData.find(c => c.school_id === school.id && c.week_number === week) as cell}
            <td 
              class="w-12 h-12 cursor-pointer text-center text-xs font-bold transition-transform hover:scale-110
                     {getColorForRate(cell.compliance_rate)}"
              onclick={() => handleCellClick(cell)}
              title={`Week ${week}: ${cell.compliance_rate}%`}
            >
              {cell.compliance_rate}%
            </td>
          {/if}
        {/each}
      </tr>
    {/each}
  </table>
</div>

<!-- Drill-down Modal -->
{#if showDrillDown && selectedCell}
  <DrillDownModal 
    schoolName={selectedCell.school_name}
    weekNumber={selectedCell.week_number}
    compliance={selectedCell}
    onclose={() => showDrillDown = false}
  />
{/if}
```

#### 8.3.2 Drill-Down Modal
**File:** `src/lib/components/DrillDownModal.svelte` (UPDATE)

```svelte
<!-- Show teacher list for selected school × week -->
<!-- Teachers marked: Green (submitted), Yellow (late), Red (missing) -->
<!-- Allow filter/search by teacher name -->
```

#### 8.3.3 Trend Analysis
**File:** `src/routes/dashboard/analytics/+page.svelte` (EXTEND)

```svelte
<!-- Add:
  - 30-day rolling average chart
  - Semester vs. SY comparison toggle
  - Moving average visualization
  - Forecast for next 2 weeks (simple trend line)
-->
```

---

### Phase 8.4: Supervisor Alert System
**File:** `src/lib/utils/alerts.ts` (NEW)

```typescript
interface AlertEvent {
  id: string;
  supervisor_id: string;
  teacher_id: string;
  alert_type: "HIGH_RISK" | "NEW_SUBMISSION" | "DEADLINE_PASSED";
  risk_score?: number;
  message: string;
  created_at: Date;
  read: boolean;
}

async function generateRiskAlerts(districtId: string) {
  // Trigger weekly (Monday 6 AM)
  // For each HIGH-risk teacher:
  // - Create alert for school head & district supervisor
  // - Include teacher name, risk score, recommended actions
  // - Store in database for dashboard notification area
}
```

**Database:**
```sql
CREATE TABLE alerts (
  id UUID PRIMARY KEY,
  supervisor_id UUID REFERENCES profiles(id),
  teacher_id UUID REFERENCES profiles(id),
  alert_type VARCHAR,
  risk_score FLOAT,
  message TEXT,
  created_at TIMESTAMP,
  read BOOLEAN DEFAULT FALSE
);

CREATE TRIGGER alert_generator
AFTER UPDATE ON submissions
FOR EACH ROW
EXECUTE FUNCTION generate_weekly_alerts();
```

---

## WEEK 9: PEER REVIEW & CONFIGURATION

### Phase 9.1: Master Teacher Module

#### 9.1.1 Dashboard Page
**File:** `src/routes/dashboard/master-teacher/+page.svelte` (CREATE)

```svelte
<!-- Features:
  - List of assigned teachers (from master_teacher_assignments table)
  - Quick filters: School, Subject, Compliance Status
  - Recent submission link with "Review" button
  - Batch review mode (select multiple teachers)
  - Performance metrics per teacher (compliance %)
-->
```

#### 9.1.2 Review Workflow
**Database:**
```sql
CREATE TABLE master_teacher_assignments (
  id UUID PRIMARY KEY,
  master_teacher_id UUID REFERENCES profiles(id),
  assigned_teacher_id UUID REFERENCES profiles(id),
  school_id UUID REFERENCES schools(id),
  created_at TIMESTAMP
);

CREATE TABLE submission_reviews (
  id UUID PRIMARY KEY,
  submission_id UUID REFERENCES submissions(id),
  reviewer_id UUID REFERENCES profiles(id),
  review_status VARCHAR, -- "pending", "in_progress", "approved", "flagged"
  rating INT, -- 1-5 stars
  comments TEXT,
  observation_categories JSONB, -- {"format": "good", "content": "needs_work"}
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

CREATE TABLE review_comments (
  id UUID PRIMARY KEY,
  review_id UUID REFERENCES submission_reviews(id),
  commenter_id UUID REFERENCES profiles(id),
  comment_text TEXT,
  created_at TIMESTAMP
);
```

**File:** `src/lib/components/ReviewModal.svelte` (CREATE)

```svelte
<!-- Features:
  - Document preview (embedded PDF viewer)
  - 5-star rating slider
  - Rich text comment editor
  - Category checkboxes:
    - Format & Structure
    - Content Accuracy
    - Delivery & Presentation
    - Alignment with Competencies
  - Submit / Save as Draft buttons
  - Shows previous reviews (read-only)
-->
```

---

### Phase 9.2: Settings Module

#### 9.2.1 User Profile Page
**File:** `src/routes/dashboard/settings/+page.svelte` (EXTEND)

```svelte
<!-- Add:
  - Full name editor with save
  - Email change (with verification)
  - Password change with current password check
  - Profile picture upload
  - School/role display (read-only)
  - Account deletion option (with warning)
-->
```

#### 9.2.2 District Configuration
**File:** `src/routes/dashboard/settings/admin/+page.svelte` (CREATE)

```svelte
<!-- Supervisor/Admin only:
  - Set compliance threshold (default 80%)
  - Set submission deadline time (11:59 PM)
  - Edit school names
  - Define custom doc types (beyond DLL/ISP/ISR)
  - Configure TA templates (see below)
  - Manage user roles
-->
```

#### 9.2.3 TA Template Management
**Database:**
```sql
CREATE TABLE ta_templates (
  id UUID PRIMARY KEY,
  district_id UUID REFERENCES districts(id),
  category VARCHAR, -- "Lesson Planning", "Classroom Management", etc.
  template_name VARCHAR,
  template_text TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP
);
```

**File:** `src/lib/components/TATemplateEditor.svelte` (CREATE)

```svelte
<!-- Features:
  - List of TA templates by category
  - Add new template (admin only)
  - Edit/delete template (created by user)
  - Use template when logging intervention
-->
```

---

## WEEK 10: OPTIMIZATION & POLISH

### Phase 10.1: Mobile QR Scanner

#### 10.1.1 Camera Access
**File:** `src/routes/dashboard/verify-scan/+page.svelte` (CREATE)

```svelte
<script lang="ts">
  import { onMount } from "svelte";
  
  let videoRef: HTMLVideoElement;
  let cameraActive = $state(false);
  let cameraError = $state<string | null>(null);
  
  onMount(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false
      });
      
      if (videoRef) {
        videoRef.srcObject = stream;
        cameraActive = true;
      }
    } catch (err) {
      cameraError = "Camera permission denied. Use manual entry below.";
    }
  });
</script>

<div class="space-y-6">
  <!-- Camera Preview -->
  {#if cameraActive}
    <div class="relative bg-black rounded-2xl overflow-hidden aspect-square">
      <video 
        bind:this={videoRef}
        autoplay
        playsinline
        class="w-full h-full object-cover"
      />
      <!-- Focus Frame Overlay -->
      <div class="absolute inset-0 border-4 border-deped-blue m-8 rounded-lg"></div>
    </div>
  {:else if cameraError}
    <div class="p-6 bg-deped-red/10 rounded-2xl text-deped-red">
      {cameraError}
    </div>
  {/if}
  
  <!-- Manual Entry -->
  <input 
    type="text"
    placeholder="Or paste verification URL here..."
    class="w-full px-4 py-3 border rounded-xl"
    onchange={(e) => handleManualEntry(e.target.value)}
  />
</div>
```

#### 10.1.2 QR Detection
**File:** `src/lib/utils/qr-scanner.ts` (NEW)

```typescript
import jsQR from "jsqr";

export async function scanQRFrame(canvas: HTMLCanvasElement): Promise<string | null> {
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const code = jsQR(imageData.data, canvas.width, canvas.height);
  
  if (code) {
    return code.data; // Returns verification URL or hash
  }
  return null;
}

export function parseVerificationURL(url: string): string | null {
  // Extract hash from: /verify/[hash]
  const match = url.match(/\/verify\/([a-f0-9]+)/);
  return match?.[1] || null;
}
```

**Integration:**
```svelte
<!-- In camera loop -->
<script>
  import { scanQRFrame } from "$lib/utils/qr-scanner";
  
  function processFrame() {
    const canvas = document.querySelector("canvas") as HTMLCanvasElement;
    const hash = await scanQRFrame(canvas);
    
    if (hash) {
      // Verify offline (cached) or online
      const verified = await verifyHash(hash);
      if (verified) {
        addToast("success", "Document verified!");
      }
    }
  }
  
  // Call processFrame every 300ms
  const interval = setInterval(processFrame, 300);
</script>
```

---

### Phase 10.2: Advanced Search & Export

#### 10.2.1 Full-Text Search
**Database Setup:**
```sql
-- Enable full-text search on submissions
ALTER TABLE submissions ADD COLUMN 
  search_vector tsvector 
  GENERATED ALWAYS AS (
    to_tsvector('english', coalesce(file_name, '') || ' ' || 
                          coalesce(ocr_text, '') || ' ' ||
                          coalesce(doc_type, ''))
  ) STORED;

CREATE INDEX search_vector_idx ON submissions 
  USING GIN(search_vector);
```

**File:** `src/lib/utils/search.ts` (NEW)

```typescript
export async function searchDocuments(
  query: string,
  filters: SearchFilters
): Promise<SearchResult[]> {
  // Query: Full-text search on file_name + OCR text
  // Filters: teacher, school, date range, status, doc_type
  // Return ranked results (relevance score)
  
  const fuzzyQuery = `${query}:*`; // Fuzzy matching
  
  const sql = `
    SELECT id, file_name, user_id, created_at, relevance
    FROM submissions
    WHERE search_vector @@ to_tsquery('english', $1)
    AND user_id = $2 -- Apply filters
    AND created_at BETWEEN $3 AND $4
    ORDER BY relevance DESC, created_at DESC
    LIMIT 50
  `;
}
```

**File:** `src/routes/dashboard/archive/+page.svelte` (EXTEND)

```svelte
<!-- Add Advanced Filter Sidebar:
  - Search box with FTS
  - Date range picker (calendar)
  - Teacher dropdown with search
  - School dropdown
  - Doc type checkboxes
  - Status checkboxes (Compliant/Late/Missing)
  - Save filter as favorite
  - "Save this search" button
-->
```

#### 10.2.2 Data Export
**File:** `src/lib/utils/export.ts` (NEW)

```typescript
export async function exportToCSV(submissions: any[]) {
  // Columns: Date, Teacher, School, Week, DocType, Status, Hash
  // Generate CSV blob
  // Trigger browser download
  
  const headers = ["Date", "Teacher Name", "School", "Week", "Type", "Status", "Hash"];
  const rows = submissions.map(s => [
    s.created_at,
    s.profiles.full_name,
    s.schools.name,
    s.week_number,
    s.doc_type,
    s.status,
    s.file_hash
  ]);
  
  const csv = [headers, ...rows]
    .map(row => row.map(cell => `"${cell}"`).join(","))
    .join("\n");
  
  return new Blob([csv], { type: "text/csv" });
}

export async function generatePDFReport(analytics: AnalyticsData) {
  // Use pdfkit or similar
  // Generate formatted report with:
  // - Cover page (school, district, date range)
  // - Summary statistics
  // - School comparison table
  // - Compliance trends chart
  // - High-risk teacher list
  // - Recommendations section
}
```

**File:** `src/routes/dashboard/analytics/+page.svelte` (EXTEND)

```svelte
<!-- Add Export Buttons:
  - "Export Current Week (CSV)"
  - "Export Quarter Data (CSV)"
  - "Generate PDF Report"
  - "Schedule Weekly Report Delivery"
-->
```

---

### Phase 10.3: Performance Optimization

#### 10.3.1 Code Splitting
**Update:** `vite.config.ts`

```typescript
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'chart-lib': ['chart.js'],
          'pdf-lib': ['pdf-lib', 'pdfkit'],
          'ocr-lib': ['tesseract.js'],
          'vendor': ['svelte']
        }
      }
    }
  }
});
```

#### 10.3.2 Lazy Loading
**Update:** `src/routes/dashboard/analytics/+page.svelte`

```svelte
<script>
  import { lazy } from "svelte";
  
  // Lazy load chart library only on demand
  const ComplianceHeatmap = lazy(() => 
    import("$lib/components/ComplianceHeatmap.svelte")
  );
</script>

<!-- Use Suspense boundaries -->
<Suspense fallback={<SkeletonLoader />}>
  <ComplianceHeatmap />
</Suspense>
```

#### 10.3.3 Image Optimization
**Create:** `scripts/optimize-images.js`

```javascript
// Convert PNG→WebP, optimize JPG
// Run before deployment
// Target: public/images folder
```

---

### Phase 10.4: Accessibility & Polish

#### 10.4.1 ARIA Labels
**Audit Checklist:**
- [ ] All buttons have `aria-label`
- [ ] Form fields have `<label>` associations
- [ ] Modal dialogs use `role="dialog"`
- [ ] Tables have `<caption>` and `scope` attributes
- [ ] Icons have alt text or are marked as decorative
- [ ] Color contrast checked (WCAG AA minimum)

#### 10.4.2 Keyboard Navigation
- [ ] Tab through all interactive elements
- [ ] Escape closes modals
- [ ] Enter/Space activates buttons
- [ ] Arrow keys work in dropdowns

#### 10.4.3 Mobile Testing
- [ ] Test on Android 6+ devices
- [ ] Verify touch targets (min 48×48px)
- [ ] Test offline functionality
- [ ] Verify camera/microphone access
- [ ] Test on slow 3G networks

---

## TESTING CHECKLIST (WEEKS 8-10)

### Week 8 Testing
- [ ] NLP classification accuracy >85%
- [ ] Heatmap loads <2 seconds
- [ ] Risk alerts trigger correctly
- [ ] Analytics page responsive (mobile)
- [ ] No console errors

### Week 9 Testing
- [ ] Master teacher review workflow end-to-end
- [ ] Settings changes persist
- [ ] TA template creation/deletion works
- [ ] Profile editing secure (password validation)

### Week 10 Testing
- [ ] QR scanner works on 5+ Android devices
- [ ] CSV export opens in Excel/Sheets
- [ ] PDF report formatting correct
- [ ] Full-text search finds documents
- [ ] Advanced filters work together

---

## DEPLOYMENT CHECKLIST

**Pre-Deployment (Week 10):**
- [ ] All console errors resolved
- [ ] Performance audit (Lighthouse >85)
- [ ] Security audit (OWASP Top 10)
- [ ] Database backups tested
- [ ] Disaster recovery plan documented
- [ ] User documentation updated
- [ ] Admin training prepared

**Deployment Steps:**
1. Create release branch from main
2. Final code review & testing
3. Deploy to staging environment
4. User acceptance testing (UAT)
5. Fix UAT issues
6. Deploy to production
7. Monitor error rates (24 hours)

---

**Document Version:** v1.0  
**Next Update:** Week 8 Kickoff  
**Questions:** Contact Technical Lead
