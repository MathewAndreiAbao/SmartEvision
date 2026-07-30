# PATENT APPLICATION DRAFT

## TITLE OF THE INVENTION

Classroom Education Documentation and Instructional Monitoring System (CEDIMS) / Smart E-VISION

---

## FIELD OF THE INVENTION

The present invention relates generally to educational management systems and, more specifically, to a web-based platform for classroom education documentation, instructional monitoring, compliance tracking, document verification, and role-based analytics. The invention operates as a Progressive Web Application (PWA) with offline-first capabilities, client-side optical character recognition (OCR), cryptographic document verification via QR codes, predictive risk analytics, and an on-device artificial intelligence (AI) chatbot for role-scoped query resolution.

---

## BACKGROUND OF THE INVENTION

Educational institutions, particularly under the Department of Education (DepEd) in the Philippines, require teachers to submit daily lesson logs (DLLs), instructional supervisory plans, and compliance reports on a regular basis. School heads and district supervisors must then monitor, review, and evaluate these submissions to ensure instructional quality and regulatory compliance. The current manual process presents several limitations:

1. **Paper-based documentation:** Teachers print and manually submit physical documents, resulting in significant paper consumption, storage costs, and risk of document loss or damage.

2. **No automated compliance tracking:** School heads and district supervisors lack real-time visibility into submission compliance rates, making it difficult to identify non-compliant teachers or schools until after the deadline has passed.

3. **Manual document processing:** When documents are submitted electronically, they must be manually reviewed, categorized, and filed — no automated metadata extraction or document transcoding exists.

4. **No document verification system:** There is no mechanism to verify the authenticity of submitted documents, making the system vulnerable to forgery or tampering.

5. **Limited offline capability:** Many schools in rural areas have intermittent internet connectivity, yet existing systems require continuous online access for document submission.

6. **Absence of predictive analytics:** Educational supervisors cannot forecast future compliance risks or identify at-risk teachers or schools before non-compliance occurs.

7. **No role-based query system:** Teachers, school heads, and district supervisors lack an intelligent assistant that can answer role-scoped queries regarding submission status, compliance rates, and deadlines.

8. **No document authentication for external stakeholders:** Parents, accreditors, and other third parties have no way to independently verify the authenticity of submitted educational documents.

Prior art includes education compliance management systems such as US8503924B2 (Dion) which tracks compliance requirements and manages documents for institutions. Document submission platforms such as US20250370663A1 (Jaworski/Kyocera) provide online compliance document management with e-signing capability. QR code verification systems such as US12602560B1 (Glenn et al./Bank of America) provide multi-layered QR security frameworks. Dashboard analytics systems such as US20260080490A1 (Wright) provide educational monitoring dashboards. However, none of these references individually or in combination disclose or suggest a unified system that integrates client-side OCR, offline-first PWA architecture, QR-based document verification, predictive compliance risk analytics, and an on-device AI chatbot for educational document management and instructional monitoring.

What is needed is a comprehensive system that addresses all of the foregoing limitations.

---

## SUMMARY OF THE INVENTION

The present invention provides a Classroom Education Documentation and Instructional Monitoring System (CEDIMS) that integrates document management, compliance tracking, QR-based verification, offline-first operation, client-side OCR, predictive analytics, and an on-device AI chatbot into a single unified platform. The system is designed specifically for the Department of Education (DepEd) workflow and provides role-based access for teachers, school heads, and district supervisors.

In one aspect, the invention comprises a web-based document submission pipeline that receives uploaded documents (including .docx or .pdf files), automatically transcodes Word documents to PDF using a serverless function, runs client-side OCR via Tesseract.js compiled to WebAssembly to extract metadata (subject, grade level, week number, school year, teacher name, dates), checks for duplicate submissions via SHA-256 hashing against existing documents in cloud storage, stamps a QR verification code onto the PDF, determines compliance status against academic calendar deadlines, and archives everything to cloud storage.

In another aspect, the invention comprises a role-based dashboard system that provides tailored views: for teachers (personal compliance status, submission history, pending reviews), for school heads (school-wide compliance heatmaps, trend charts, peer review module for quality assessment), and for district supervisors (cross-school comparison, risk analytics, school-level compliance breakdown, account creation and system administration).

In another aspect, the invention comprises a QR-based document verification system accessible via a public-facing web page. Documents stamped with a QR code containing a SHA-256 hash of the original file can be scanned by any external party (parents, accreditors, auditors) to verify document authenticity without authentication. The system retrieves the original hash from cloud storage and compares it against the scanned QR code to confirm or deny authenticity.

In another aspect, the invention operates as a Progressive Web Application (PWA) with offline-first capabilities. When connectivity is unavailable, documents submitted through the upload pipeline are queued in IndexedDB and automatically synchronized when connectivity is restored. Service workers manage caching strategies to ensure core functionality remains available offline.

In another aspect, the invention comprises an on-device AI chatbot that uses logistic regression for intent classification of user queries. The chatbot answers role-scoped questions: a teacher can ask about their own submission status or deadlines, a school head can ask about school-wide compliance rates, and a district supervisor can ask about district-level data. The chatbot runs entirely in-browser without server-side inference costs.

In another aspect, the invention comprises a predictive compliance risk analytics module that uses in-browser linear regression to forecast future compliance risk for individual teachers or schools based on historical submission patterns. Risk scores and trend predictions are displayed on dashboards for proactive intervention by supervisors.

In another aspect, the invention comprises role-based data security through Supabase Row-Level Security (RLS) policies. Teachers can only access their own data, school heads can access data for their assigned school, and district supervisors can access data across all schools in their district. The system uses Supabase authentication with JSON Web Tokens (JWT) and integrates with a custom admin API for creating user accounts with appropriate role-based metadata.

In another aspect, the invention comprises a peer review module that allows school heads to assign and manage quality reviews of submitted documents. The module provides a rubric-based assessment interface, tracks review completion, and generates quality scores that appear on compliance dashboards.

---

## BRIEF DESCRIPTION OF THE DRAWINGS

| Drawing | Description |
|---|---|
| **FIG. 1** | High-level system architecture diagram showing the web application, Supabase backend, cloud storage, Google Apps Script function, and external OCR engine, with data flow between components |
| **FIG. 2** | Document upload pipeline flow diagram illustrating the sequence from file selection through transcoding, OCR, duplicate detection, QR stamping, compliance checking, and archival |
| **FIG. 3** | Dashboard architecture diagram showing the role-based views for Teacher, School Head, and District Supervisor with their respective data sources and filtering logic |
| **FIG. 4** | QR code verification process flow diagram showing the public-facing verification page, QR scanner, hash comparison logic, and authenticity determination results |
| **FIG. 5** | Offline-first architecture diagram showing the IndexedDB queue, service worker caching strategies, and synchronization flow when connectivity is restored |
| **FIG. 6** | AI chatbot architecture diagram showing the intent classification pipeline using logistic regression, role-scoped query filtering, and response generation |
| **FIG. 7** | Predictive compliance risk analytics flow diagram showing historical data input, linear regression model, risk score calculation, and dashboard visualization |
| **FIG. 8** | Peer review module diagram showing the review assignment, rubric-based assessment, quality scoring, and compliance dashboard integration |

---

## DETAILED DESCRIPTION OF THE INVENTION

The present invention will now be described in detail with reference to the accompanying drawings. The following description is illustrative and not intended to limit the invention to the specific embodiments shown. Various modifications and variations are possible within the scope of the invention.

### Section 1: System Architecture (FIG. 1)

Referring to FIG. 1, the system comprises a frontend web application built with SvelteKit and Tailwind CSS, a Supabase backend providing PostgreSQL database with Row-Level Security (RLS), authentication, and cloud storage, and integration with Google Apps Script for serverless document transcoding (Word to PDF). The system is deployed as a Progressive Web Application (PWA) and can be accessed via any modern web browser on desktop or mobile devices.

The frontend communicates with Supabase via the Supabase JavaScript client library. Database queries are executed through the Supabase API with RLS policies enforcing role-based data access. File storage uses Supabase Storage for archival of submitted documents. Document transcoding is performed by a Google Apps Script web app that accepts .docx files and returns PDF output, invoked via HTTPS POST request from the frontend.

### Section 2: Document Upload Pipeline (FIG. 2)

Referring to FIG. 2, the document upload pipeline operates as follows:

1. **File Selection:** A teacher selects a document file (.docx or .pdf) through the web interface.
2. **Word-to-PDF Transcoding:** If the file is .docx format, it is sent to the Google Apps Script web app for conversion to PDF. The script uses Google Docs API to open the document and export as PDF, then returns the PDF to the client.
3. **Client-Side OCR:** The PDF is processed client-side using Tesseract.js, an open-source OCR engine compiled to WebAssembly. The OCR engine extracts text from the PDF and parses it to identify metadata fields including subject, grade level, week number, school year, teacher name, and date of submission.
4. **Duplicate Detection:** A SHA-256 hash of the original file is computed and compared against hashes stored in the database. If a match is found, the upload is rejected as a duplicate.
5. **QR Code Stamping:** A QR code containing the SHA-256 hash is generated and stamped onto the PDF document. The QR-embedded PDF is created client-side using a PDF manipulation library.
6. **Compliance Checking:** The system checks whether the submission meets academic calendar deadlines, class schedule requirements, and submission format requirements. Compliance status is recorded as "compliant," "late," or "non-compliant" in the database.
7. **Archival:** The final QR-stamped PDF is uploaded to Supabase Storage. Metadata and compliance status are stored in the PostgreSQL database.

### Section 3: Role-Based Dashboard System (FIG. 3)

Referring to FIG. 3, the dashboard system provides three distinct views based on user role:

**Teacher View:** Displays personal compliance rate (percentage of compliant and late submissions), submission history with dates and statuses, pending reviews from school head, and upcoming deadlines based on the academic calendar.

**School Head View:** Displays school-wide compliance heatmap showing compliance rates across teachers, subjects, and grade levels. Trend charts show compliance over time. A peer review module allows assignment and management of document quality reviews. School heads can also view individual teacher breakdowns.

**District Supervisor View:** Displays cross-school comparison charts, district-wide compliance rates, risk analytics identifying at-risk schools, and school-level breakdowns. District supervisors also have administrative capabilities including user account creation.

Each view queries the Supabase database with RLS policies that filter data based on the authenticated user's role and organizational affiliation (school_id, district_id).

### Section 4: QR Code Document Verification (FIG. 4)

Referring to FIG. 4, the QR code verification system provides a public-facing web page accessible without authentication. External stakeholders (parents, accreditors, auditors) can upload or scan a document bearing the QR code. The system:

1. Reads the QR code from the document image using a JavaScript QR scanner library.
2. Extracts the SHA-256 hash contained in the QR code.
3. Queries the database for the original hash stored at the time of submission.
4. Compares the scanned hash against the stored hash.
5. Returns a verification result: "Verified" if hashes match, "Tampered" if they do not, or "Not Found" if the hash is not in the database.

### Section 5: Offline-First Architecture (FIG. 5)

Referring to FIG. 5, the system manifests as a Progressive Web Application (PWA) with offline-first capabilities. The architecture comprises:

**Service Worker:** Registered at application startup, the service worker intercepts network requests and serves cached responses when offline. Caching strategies include Cache First for static assets and Network First for API requests with fallback to cache.

**IndexedDB Queue:** When the application is offline, uploaded documents and form submissions are stored in IndexedDB using the idb-keyval library. Each queued item includes the file data, metadata, timestamp, and a unique identifier.

**Background Sync:** When connectivity is restored, the system detects the online state and processes queued items sequentially. Each item is submitted through the standard upload pipeline. Successfully processed items are removed from the queue; failed items are retried.

### Section 6: AI Chatbot (FIG. 6)

Referring to FIG. 6, the on-device AI chatbot provides natural language query processing for role-scoped questions. The chatbot operates entirely in the browser without server-side inference costs.

**Intent Classification:** User queries are classified into intents using a logistic regression model trained on educational query data. Supported intents include queries about compliance status ("What is my compliance rate?"), deadlines ("When is the next DLL submission?"), submission history ("Show my submitted documents"), school-wide statistics ("How is the school performing on compliance?"), and district-level analytics ("Which school has the lowest compliance?").

**Role Scoping:** The chatbot filters query results based on the authenticated user's role. A teacher receives only personal data, a school head receives school-level data, and a district supervisor receives district-level data. Role information is passed to the chatbot through application state.

**Response Generation:** Based on the classified intent and role-scoped data, the chatbot formulates a natural language response. The response includes relevant data from the database and, where applicable, links to relevant dashboard sections.

### Section 7: Predictive Compliance Risk Analytics (FIG. 7)

Referring to FIG. 7, the predictive analytics module forecasts future compliance risk for individual teachers or schools. The module comprises:

**Data Input:** Historical compliance data including submission timestamps, compliance status, and deadline information for each teacher-school-week combination.

**Linear Regression Model:** An in-browser linear regression algorithm (using a JavaScript numeric computing library) is trained on historical data to predict future compliance probability. Features include historical compliance rate, number of late submissions, and submission recency.

**Risk Score Calculation:** The model outputs a risk score from 0 to 100, where higher scores indicate higher risk of future non-compliance.

**Dashboard Visualization:** Risk scores and trend directions are displayed on dashboards using graphical indicators (color-coded: green for low risk, yellow for moderate risk, red for high risk). Trend lines show projected compliance rates for upcoming weeks.

### Section 8: Peer Review Module (FIG. 8)

Referring to FIG. 8, the peer review module enables school heads to manage quality assessments of submitted documents. The module provides:

**Review Assignment:** School heads can assign submitted documents to peer teachers or reviewers within the school for quality evaluation.

**Rubric-Based Assessment:** Reviewers evaluate documents against a configurable rubric that may include criteria such as completeness, accuracy of content, alignment with curriculum, timeliness, and formatting. Each criterion is scored on a numeric scale.

**Quality Scoring:** Rubric scores are aggregated into a composite quality score displayed alongside compliance data on dashboards.

**Review Tracking:** The module tracks review assignment status (pending, in-progress, completed), reviewer comments, and score history.

### Section 9: Deployment and Infrastructure

The web application is deployed on Vercel's edge network. The Supabase backend is cloud-hosted, providing PostgreSQL database, authentication, and storage services. Google Apps Script provides serverless document transcoding. Continuous deployment is managed through a GitHub Actions workflow that automatically builds and deploys the application on each push to the main branch.

The system requires the following environment configuration:
- Supabase project URL and anonymous API key (public)
- Supabase service role key (admin-level, server-side only)
- Google Apps Script web app URL for document transcoding

### Section 10: User Authentication and Authorization

Authentication is handled through Supabase Auth, which supports email/password authentication. On login, the system retrieves the user's role and organizational metadata from the profiles table (auto-created via a database trigger on user creation).

User accounts are created by district supervisors through a privileged API endpoint (`/api/admin/create-user`). The endpoint:
1. Verifies the requesting user is authenticated and has district_supervisor role.
2. Creates the user in Supabase Auth with email, password, and user_metadata (including role, school_id, district_id, full_name).
3. A database trigger (`handle_new_user()`) automatically creates a corresponding profile record.

Row-Level Security (RLS) policies enforce the following access controls:
- Teachers: `user_id = auth.uid()` — access only their own submissions and reviews.
- School Heads: `school_id = (SELECT school_id FROM profiles WHERE user_id = auth.uid())` — access all data for their school.
- District Supervisors: `district_id = (SELECT district_id FROM profiles WHERE user_id = auth.uid())` — access all data for schools in their district.

---

## CLAIMS

### Claim 1 (System)

A web-based educational documentation and monitoring system comprising:

(a) a document submission pipeline configured to receive uploaded documents from a client device, automatically transcode Word documents to PDF using a serverless function, perform client-side optical character recognition (OCR) via Tesseract.js compiled to WebAssembly to extract metadata including subject, grade level, week number, school year, teacher name, and date, compute a SHA-256 hash of the original file for duplicate detection, generate and stamp a QR code containing said hash onto the document, determine compliance status against an academic calendar, and archive the document to cloud storage;

(b) a role-based dashboard system providing a teacher view displaying personal compliance rate and submission history, a school head view displaying school-wide compliance heatmaps and trend charts, and a district supervisor view displaying cross-school comparisons and district-level analytics;

(c) a QR-based document verification system accessible via a public web page that reads the QR code from a document, extracts the SHA-256 hash, retrieves a stored hash from the database, compares the hashes, and returns an authenticity result; and

(d) an offline-first Progressive Web Application (PWA) architecture comprising a service worker for caching strategies and an IndexedDB queue for storing uploaded documents when connectivity is unavailable, with automatic synchronization when connectivity is restored.

### Claim 2

The system of Claim 1, wherein the serverless function for Word-to-PDF transcoding is a Google Apps Script web app that uses the Google Docs API to open a .docx file and export it as PDF.

### Claim 3

The system of Claim 1, wherein the client-side OCR further comprises automatic parsing of extracted text to populate metadata fields in the submission form, pre-filling subject, grade level, week number, school year, teacher name, and dates.

### Claim 4

The system of Claim 1, wherein the duplicate detection uses SHA-256 hashing computed client-side, compared against hashes stored in the database, and the upload is rejected if a match is found.

### Claim 5

The system of Claim 1, wherein the QR code is generated and stamped onto the document client-side using a PDF manipulation library, and the stamped document is uploaded to cloud storage.

### Claim 6

The system of Claim 1, wherein the compliance status determination considers academic calendar deadlines, class schedule requirements, and submission format requirements.

### Claim 7

The system of Claim 1, further comprising an on-device AI chatbot that uses logistic regression for intent classification of user queries and filters responses based on the authenticated user's role.

### Claim 8

The system of Claim 7, wherein the chatbot supports intents including compliance status queries, deadline inquiries, submission history requests, school-wide statistics queries, and district-level analytics queries.

### Claim 9

The system of Claim 1, further comprising a predictive compliance risk analytics module that uses in-browser linear regression trained on historical compliance data to forecast future compliance risk for individual teachers or schools.

### Claim 10

The system of Claim 9, wherein the predictive module outputs a risk score from 0 to 100 and displays trend lines showing projected compliance rates for upcoming weeks on the dashboard.

### Claim 11

The system of Claim 1, wherein the role-based dashboard system further comprises a peer review module enabling school heads to assign submitted documents for quality evaluation, manage rubric-based assessments, and track review completion.

### Claim 12

The system of Claim 1, wherein database access is controlled by Row-Level Security (RLS) policies that restrict data visibility based on the authenticated user's role and organizational metadata including school_id and district_id.

### Claim 13

The system of Claim 1, further comprising a privileged user creation endpoint accessible only to district supervisors, configured to create authenticated user accounts with role-based metadata including user role, school affiliation, and district affiliation.

### Claim 14

The system of Claim 13, further comprising a database trigger that automatically creates a profile record upon user account creation, configured to extract metadata from the authentication system's user metadata.

### Claim 15

The system of Claim 1, wherein the offline-first PWA architecture further comprises background synchronization that processes queued items sequentially when connectivity is restored, removing successfully processed items and retrying failed items.

### Claim 16

The system of Claim 1, wherein the QR-based document verification system is configured to return a result selected from the group consisting of: "Verified" when hashes match, "Tampered" when hashes do not match, and "Not Found" when the hash is not stored in the database.

### Claim 17

The system of Claim 1, wherein the role-based dashboard system further comprises a compliance heatmap visualization showing compliance rates color-coded across teachers, subjects, grade levels, and time periods.

### Claim 18

The system of Claim 1, wherein the system is deployed as a Progressive Web Application installable on desktop and mobile devices, accessible via a web browser without requiring native application installation.

### Claim 19 (Method)

A method for educational documentation and monitoring comprising the steps of:

(a) receiving an uploaded document at a client device;
(b) automatically transcoding the document from Word format to PDF using a serverless function;
(c) performing client-side OCR using Tesseract.js compiled to WebAssembly to extract metadata from the document;
(d) computing a SHA-256 hash of the document for duplicate detection;
(e) generating a QR code containing the hash and stamping it onto the document;
(f) determining compliance status against an academic calendar;
(g) archiving the document to cloud storage;
(h) presenting a role-based dashboard with views configured according to teacher, school head, or district supervisor roles;
(i) providing a QR-based document verification system accessible via a public web page;
(j) operating as a Progressive Web Application with offline-first capabilities; and
(k) providing an on-device AI chatbot for role-scoped query resolution.

### Claim 20 (Non-Transitory Computer-Readable Medium)

A non-transitory computer-readable medium storing instructions that, when executed by one or more processors, cause the processors to perform the method of Claim 19.

---

## ABSTRACT OF THE DISCLOSURE

A web-based Classroom Education Documentation and Instructional Monitoring System (CEDIMS) integrating document management, compliance tracking, QR-based verification, offline-first operation, client-side OCR, predictive analytics, and on-device AI chatbot for the Department of Education. The system provides a document submission pipeline with automatic Word-to-PDF transcoding, client-side OCR via Tesseract.js for metadata extraction, SHA-256 duplicate detection, QR code stamping for verification, and compliance status determination against academic calendar deadlines. Role-based dashboards display tailored views for teachers, school heads, and district supervisors with compliance heatmaps, trend charts, and cross-school comparisons. A public-facing QR verification page allows document authenticity checking by external stakeholders. The Progressive Web Application operates offline-first with an IndexedDB queue and service worker caching, auto-syncing when connectivity is restored. An on-device AI chatbot using logistic regression provides role-scoped query responses. Predictive linear regression analytics forecast future compliance risk. All data access is secured through Row-Level Security policies based on user role and organizational metadata.

---

**Patent data sourced from official records:**
- **USPTO** (United States Patent and Trademark Office) — uspto.gov
- **Google Patents** (aggregating USPTO, WIPO, EPO, JPO, CNIPA) — patents.google.com
- **WIPO PATENTSCOPE** — wipo.int/patentscope
- **EPO Espacenet** — worldwide.espacenet.com

*Classification codes per WIPO IPC Publication (ipcpub.wipo.int). Prior art analysis based on official publication data available at the respective patent offices.*
