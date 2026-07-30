# Patent Generation Prompt

Copy and paste the entire block below into an AI assistant (ChatGPT, Claude, Gemini, etc.) to generate a complete Philippine patent application in IPOPHL format.

---

You are a Philippine patent agent preparing a utility patent application for filing with the Intellectual Property Office of the Philippines (IPOPHL). Generate a complete patent document in plain text with line-numbered formatting (line numbers 10, 15, 20, 25, 30... in the left margin, incrementing by 5 every 5 lines, starting at 10 on the first content line).

## Patent Specifications

**Title of Invention:**
Educational Document Processing Pipeline with Client-Side Optical Character Recognition, Cryptographic Hashing, QR Code Stamping, and Compliance Verification

**Applicant:** [Name of Applicant]
**Author/Inventor:** Mathew Andrei Abao
**Email:** abaomathew91625@gmail.com

## Required Structure

Generate ALL four sections in the following order:

### 1. DESCRIPTION

Must contain the following subsections in order:

**1.1 Technical Field** (2-3 sentences)
The technical field of the invention. Example: "The present invention relates generally to electronic document processing systems and, more specifically, to a client-side document pipeline for educational environments that receives uploaded lesson documents, automatically transcodes them via a server proxy or serverless function, compresses the resulting PDF, extracts metadata through in-browser text extraction or optical character recognition, performs cryptographic hashing via the Web Crypto API in a web worker thread for duplicate detection and subsequent verification, stamps a QR code containing a verification URL onto the document, determines compliance status against an academic calendar deadline with a configurable grace window, and archives the processed document to cloud storage."

**1.2 Background of the Invention** (2-3 paragraphs)
Describe the technical problem: teachers under DepEd must submit DLLs/ISPs/ISRs tied to teaching loads and curriculum weeks. Existing systems suffer from: (1) fragmented document processing with no integrated client-side pipeline; (2) server-dependent OCR requiring remote document transmission; (3) standalone QR verification not integrated into submission workflow; (4) no automated compliance determination against academic calendar deadlines; (5) no offline document processing for intermittent connectivity; (6) manual metadata entry with no automated extraction. Cite prior art: US8503924B2 (Dion, education compliance management), US20250370663A1 (Jaworski/Kyocera, compliance document submission), US10740638B2 (Grooper, server-based OCR data extraction), US10679089B2 (Grooper, OCR systems), US10404462B2 (Carter/Unisys, QR code validation), US12602560B1 (Glenn/Bank of America, QR verification engine). Explain how none teaches the claimed combination.

**1.3 Summary of the Invention** (1-2 paragraphs)
The invention provides an integrated pipeline comprising: document receipt, dual-path DOCX-to-PDF transcoding (LibreOffice server proxy then Google Apps Script fallback), PDF compression via pdf-lib, dual-path text extraction (PDF.js then Tesseract.js WebAssembly OCR with English and Filipino language models) with metadata parsing using regex, Dice coefficient fuzzy matching at 0.4 threshold, and Naive Bayes classification, Web Worker SHA-256 hashing with three-level duplicate detection (local IndexedDB cache, server database, slot uniqueness), Web Worker QR code generation and PDF stamping (72px, 30px margin, bottom-right), compliance status determination (compliant, late with 5-day grace window, non-compliant) against academic calendar deadlines, archival to S3-compatible cloud storage via server proxy, and public document verification via two-tier lookup (offline IndexedDB cache then server database). An offline-first mode queues documents in IndexedDB and auto-syncs via four triggers (online event, visibility change, window focus, 60-second heartbeat).

**1.4 Brief Description of the Drawings** (list of 8 figures)
List each figure number and a one-line description:
- FIG. 1 — System architecture block diagram: Client Device (Stages 1-8b), Server Infrastructure (Supabase, Backblaze B2, server proxy, Google Apps Script), and Verification zone, with network decision branching to online upload or offline IndexedDB queue
- FIG. 2 — Detailed submission flowchart: file detection, dual transcoding, compression, PDF.js/Tesseract.js extraction, regex/Dice/Naive Bayes parsing, Web Worker hash, QR stamp, three-level dedup, calendar deadline lookup, compliance output, and online/offline archival
- FIG. 3 — Dual-path OCR and metadata parsing: PDF.js primary path, Tesseract.js (eng+fil) fallback, three-stage parser (regex, Dice coefficient at 0.4 threshold, Naive Bayes) producing 10 metadata fields
- FIG. 4 — Two-tier verification: QR scan via jsQR/BarcodeDetector, hash extraction, Tier 1 IndexedDB cache lookup, Tier 2 Supabase query, producing VERIFIED or NOT FOUND results
- FIG. 5 — Offline queuing and sync: online flow (upload + DB insert), offline flow (IndexedDB queue via idb-keyval), four auto-sync triggers (online event, visibility, focus, 60s heartbeat), queue processor with re-validation
- FIG. 6 — Dual-path transcoding: primary LibreOffice (soffice --headless --convert-to pdf), fallback Google Apps Script (Drive API, Docs API, base64 encoding)
- FIG. 7 — Compliance determination: two-level calendar lookup (school-year then district), deadline comparison at 23:59:59.999, 5-day grace window, three-status output
- FIG. 8 — System architecture: SvelteKit client, Web Worker, IndexedDB, Tesseract.js, PDF.js; server proxy endpoints; Supabase (PostgreSQL, Auth, RLS); Backblaze B2; verification page

**1.5 Detailed Description** (comprehensive — at least 3-4 pages)
Describe the pipeline in 9 stages with full technical detail:

Stage 1 — Document Receipt. User selects or drops .docx or .pdf. File read as ArrayBuffer. Extension and MIME type validated. Early SHA-256 hash for pre-submission dedup.

Stage 2 — Format Transcoding. If .docx, POST to /api/convert with Bearer token; LibreOffice runs soffice --headless --convert-to pdf. On failure, fallback to Google Apps Script: base64 JSON POST → Drive file → Docs API (auto-converts) → export PDF → base64 → delete Drive file → return PDF. PDF files skip.

Stage 3 — PDF Compression. If >2MB (or not low-power/slow-connection), compress via pdf-lib to remove redundant metadata and optimize fonts.

Stage 4 — Text Extraction and Metadata Parsing. PDF.js loads from CDN, extracts text via text layer API. If fails or insufficient, render each page to Canvas → blob → Tesseract.js (eng+fil). Parse via: (i) regex for DLL/ISP/ISR markers, week numbers, school years, dates; (ii) Dice coefficient fuzzy matching of subjects and grade levels at 0.4 threshold; (iii) Naive Bayes classifiers for subject and doc type from JSON word frequency models. Output: docType, weekNumber, schoolYear, subject, gradeLevel, teacher, date, dateRange, language, rawText. Presented to user for confirmation.

Stage 5 — Hashing and Duplicate Detection. Send compressed PDF to Web Worker via COMPRESS_AND_HASH. Worker computes SHA-256 via crypto.subtle.digest('SHA-256', ...). Three-level dedup: (i) local IndexedDB cache; (ii) server DB query for matching file_hash with 30s timeout; (iii) slot uniqueness (teaching_load_id + week + school_year + doc_type).

Stage 6 — QR Generation and Stamping. Send hash to Web Worker via STAMP_QR. Generate QR (Reed-Solomon Level M) encoding {APP_URL}/verify/{SHA256_HASH}. Stamp onto last PDF page via pdf-lib at 72px, 30px margin, bottom-right.

Stage 7 — Compliance Determination. Query academic_calendar for detected week number and school year, fallback to district-level. Deadline set to 23:59:59.999. Before deadline = compliant; within 5 days after = late; beyond = non-compliant. No deadline = default compliant.

Stage 8 — Archival. POST QR-stamped PDF to /api/storage/upload which forwards to Backblaze B2 under submissions/{userId}/{docType}/{timestamp}_{fileName}. Insert DB record with: user_id, file_name, file_path, file_hash, file_size, doc_type, week_number, school_year, subject, calendar_id, teaching_load_id, compliance_status, raw_text.

Offline Deferred Processing. When offline, Stages 1-6 execute normally. At Stage 8, queue to IndexedDB via idb-keyval with key sync_queue_{timestamp}_{shortHash}. Four auto-sync triggers: (i) window online event plus 3s delay; (ii) visibilitychange to visible while online; (iii) window focus while online; (iv) 60-second heartbeat. Each item re-validated before upload. Success removes from queue.

Verification System. Public page at /verify/{hash}. Tier 1: IndexedDB cache. Tier 2: Supabase submissions table. Found = displays metadata. Not found = unverified. QR scanner using jsQR and BarcodeDetector navigates to verification URL on scan.

### 2. CLAIMS

Write exactly **TEN (10) claims** structured as:

**Claim 1** (Independent — Method) — 13 sub-elements (a) through (m):
(a) receiving a document file at a client device
(b) if Word format, transmitting to server proxy for PDF conversion via headless office suite; upon failure, transmitting to serverless transcoding function and receiving PDF
(c) compressing PDF using client-side PDF manipulation library
(d) attempting text extraction via JavaScript PDF rendering library; upon failure, performing client-side OCR using Tesseract.js compiled to WebAssembly with English and Filipino language models
(e) parsing extracted text using regex pattern matching, Dice coefficient fuzzy matching, and Naive Bayes classification to identify metadata fields (document type, subject, grade level, week number, school year, teacher name, date)
(f) transferring compressed PDF to Web Worker thread and computing SHA-256 hash via Web Crypto API
(g) comparing hash against local IndexedDB cache and server database for duplicate detection
(h) generating, within Web Worker, QR code encoding verification URL containing hash with Reed-Solomon error correction
(i) stamping, within Web Worker, QR code onto new PDF page using PDF manipulation library
(j) retrieving deadline date from academic calendar entry associated with detected week number and submitting user's district identifier
(k) comparing submission timestamp against deadline to determine compliance status: compliant if on/before deadline, late if within configurable grace window, non-compliant if beyond
(l) uploading QR-stamped document to server proxy for forwarding to S3-compatible cloud storage
(m) inserting database record containing file hash, file path, detected metadata, compliance status, and raw extracted text

**Claim 2** (Dependent on Claim 1) — The server proxy invokes soffice --headless --convert-to pdf via LibreOffice; the serverless function is a Google Apps Script webapp that creates a Drive file, converts via Docs API, exports PDF, base64-encodes, deletes the Drive file, and returns PDF in JSON.

**Claim 3** (Dependent on Claim 1) — OCR is performed by rendering each PDF page to HTML Canvas, converting to blob, and passing to Tesseract.js worker with eng+fil language models.

**Claim 4** (Dependent on Claim 1) — Parsing comprises: regex detection of document type markers, week indicators, and school year ranges; Dice coefficient matching of subjects and grade levels against reference lists at configurable threshold; Naive Bayes classifiers for subject and document type prediction.

**Claim 5** (Dependent on Claim 1) — Web Worker receives COMPRESS_AND_HASH and STAMP_QR messages, each correlated by unique request identifier.

**Claim 6** (Dependent on Claim 1) — Duplicate detection comprises: local IndexedDB cache lookup; server DB query for matching file_hash with configurable timeout; slot uniqueness check for teaching load, week, school year, and document type combination.

**Claim 7** (Dependent on Claim 1) — QR code encodes {APPLICATION_URL}/verify/{SHA256_HASH} stamped at bottom-right of last PDF page at 72 pixels with 30-pixel margin.

**Claim 8** (Dependent on Claim 1) — Grace window is 5 days.

**Claim 9** (Dependent on Claim 1) — When offline, storing QR-stamped document and metadata in IndexedDB; monitoring connectivity via online events, visibility changes, window focus, and periodic heartbeats; automatically processing queued items upon reconnection.

**Claim 10** (Dependent on Claim 9) — Monitoring comprises window online listener with 3-second stabilization, visibilitychange listener, focus listener, and 60-second heartbeat interval.

### 3. ABSTRACT

Write a **150-word abstract** that includes the technical function of the system. It must describe: a client-side educational document processing pipeline; DOCX-to-PDF transcoding via LibreOffice proxy with Google Apps Script fallback; PDF compression via pdf-lib; text extraction via PDF.js with Tesseract.js WebAssembly fallback (English and Filipino); metadata parsing using regex, Dice coefficient, and Naive Bayes; SHA-256 hashing and QR code generation/stamping in a Web Worker; three-level duplicate detection; compliance determination against academic calendar with 5-day grace window; archival to S3-compatible cloud storage; offline IndexedDB queuing with auto-sync via online events, visibility changes, focus, and heartbeat; two-tier verification (offline cache + server database).

### 4. DRAWINGS (One Figure Per Page)

List the following 8 figures, each on a separate page, described in words for the patent illustrator:

**FIG. 1** — High-level block diagram. Three zones connected by arrows: (1) CLIENT DEVICE showing 8 stages in a vertical sequence — Document Receipt → Format Transcoding (DOCX→PDF) → PDF Compression → Text Extraction & OCR → Hashing & Dedup (Web Worker) → QR Generation & Stamp (Web Worker) → Compliance Check → Network Decision diamond branching to ONLINE (Upload to Server Proxy) or OFFLINE (Queue to IndexedDB). (2) SERVER INFRASTRUCTURE showing Server Proxy (LibreOffice), Google Apps Script (fallback), Supabase (PostgreSQL + Auth + RLS), Backblaze B2. (3) VERIFICATION showing Public Verify Page and QR Scanner. Arrows: Format Transcoding to Server Proxy (primary, solid line) and to Google Apps Script (fallback, dashed line); Upload to Backblaze B2 and Supabase; Offline Queue to Upload (on reconnect, dashed); Verify Page to Supabase and QR Scanner (bidirectional).

**FIG. 2** — Flowchart. Start: User selects document → File Type diamond (PDF or DOCX/DOC). DOCX path: Try Server Proxy → Success? → Yes to Load PDF bytes, No to Google Apps Script fallback → Success? → Yes to Load PDF bytes, No to Error. PDF path: Check Size diamond (>2MB or not slow connection?) → Yes to Compress PDF via pdf-lib, No to Skip compression → Try PDF.js text extraction → Text found? → Yes to Use extracted text, No to Render pages to Canvas → Tesseract.js OCR eng+fil → Use extracted text → Parse metadata → Regex patterns → Dice coefficient → Naive Bayes → Metadata identified → Web Worker COMPRESS_AND_HASH → SHA-256 hash → Check local IndexedDB cache (Duplicate→Error, Not found→Check server DB) → Check server DB file_hash (Duplicate→Error, Not found→Check slot) → Check slot load+week+type (Taken→Error, Free→Web Worker STAMP_QR) → Generate QR → Stamp QR on PDF bottom-right 72px 30px → Calendar entry for week+district? → Found→Get deadline_date→Compare submission≤deadline?→Yes Compliant, No→Within 5-day grace?→Yes Late, No Non-compliant → Not found→Default Compliant → All statuses converge to Upload QR-stamped PDF to /api/storage/upload → Backblaze B2 → Insert DB record → Success. Error paths lead to Failure.

**FIG. 3** — Block diagram with four sub-blocks connected by arrows. INPUT: PDF bytes. PRIMARY PATH (top): PDF.js from CDN → Render each page → Extract text layer via API → Extraction successful? diamond → Yes arrow to Extracted text, No arrow to FALLBACK PATH. FALLBACK PATH (middle): Render PDF page to HTML Canvas → Convert Canvas to Blob → Create Tesseract.js worker (eng+fil) → Run OCR on each page blob → Layout analysis + line detection → Character segmentation + recognition → Output text + confidence scores → joins Extracted text. PARSER (bottom): Extracted text enters Metadata Parsing Engine with three parallel boxes: (1) Regex Pattern Matcher — DLL/ISP/ISR markers, Week # indicators, School year ranges, Date fields, Grade level; (2) Dice Coefficient Fuzzy Matcher — Subject names vs reference list, Grade levels vs reference list, Threshold 0.4; (3) Naive Bayes Classifier — Subject prediction model, Doc type prediction model, Word frequency from JSON. All three connect to OUTPUT: 10 fields — docType, weekNumber, schoolYear, subject, gradeLevel, teacher, date, dateRange, language, rawText.

**FIG. 4** — Flowchart. QR Code Scanning sub-block: Document with QR code → Camera scan or image upload → Decode QR via jsQR/BarcodeDetector → Parse verification URL /verify/{SHA256_HASH} → Extract SHA-256 hash. TIER 1 — Offline Cache Check sub-block: Query IndexedDB cache key cached_docs_{hash} → Found? diamond → Yes arrow to Display cached metadata (file_name, doc_type, etc.) → Verified result. No arrow to Cache miss — proceed to Tier 2. TIER 2 — Server Database Query sub-block: Query Supabase submissions table WHERE file_hash = {hash} → Record found? diamond → Yes arrow to Display metadata (name, type, status, date, teacher, school, grade) → Verified result. No arrow to Not found result. Three result boxes: ✓ Verified (hash matches), ⚠ Tampered (hash mismatch), ✗ Not Found (no record).

**FIG. 5** — Block diagram with four sub-blocks. ONLINE — Normal Flow: Pipeline Stages 1-6 execute normally → Stage 8 Upload to server → Success. OFFLINE — Deferred Flow: Pipeline Stages 1-6 execute normally → Stage 8b Enqueue to IndexedDB → Queue item stored (key: sync_queue_{ts}_{hash}, pdfBytes, fileHash, metadata) → pendingSyncCount++. AUTO-SYNC TRIGGERS: Four boxes pointing to QUEUE PROCESSOR — (1) window online event + 3-second stabilization, (2) visibilitychange → visible + online check, (3) window focus event + online check, (4) Periodic heartbeat every 60 seconds. QUEUE PROCESSOR: Get all queue items sorted by timestamp → Re-validate slot & hash on server diamond → Already exists? → Remove from queue, Mark as synced → Next item. Available? → Upload to server proxy → Upload OK? diamond → Yes: Insert DB record, Delete queue item → Next item. No: Keep in queue for retry → Next item.

**FIG. 6** — Block diagram with three sub-blocks. CLIENT SIDE: Original .docx file → two arrows: Primary: POST to /api/convert (solid line), Fallback: POST to Google Apps Script (dashed line). PRIMARY PATH — Server Proxy (LibreOffice): Receive file as multipart FormData, Auth Bearer token → Invoke soffice --headless --convert-to pdf → Return PDF bytes → Success? diamond → Yes arrow to CLIENT RECEIVE, No arrow to FALLBACK PATH. FALLBACK PATH — Google Apps Script: Receive base64 + fileName in JSON → Create temp file in Google Drive (MIME: application/vnd.google-apps.document) → Open via Google Docs API (auto-converts DOCX to Google Doc) → Export as PDF via Drive API → Base64-encode PDF bytes → Delete temp file from Drive → Return JSON {success, pdfBase64}. CLIENT RECEIVE: Primary OK? diamond → Yes: Use PDF bytes as Uint8Array. No → try Fallback. Fallback Success? diamond → Yes: Use PDF bytes. No: Error — Conversion failed.

**FIG. 7** — Flowchart with two sub-blocks. INPUTS: detected weekNumber, submission timestamp, current schoolYear, user district_id. CALENDAR LOOKUP: Query academic_calendar WHERE week = weekNumber AND school_year = schoolYear → Found? diamond → Yes: Use calendar entry → to COMPLIANCE LOGIC. No: Query academic_calendar WHERE week = weekNumber AND district_id = user.district_id → Found? diamond → Yes: Use calendar entry. No: No deadline — default compliant → Record to DB. COMPLIANCE LOGIC: Calendar entry → Has deadline_date? diamond → No: default compliant. Yes: Set deadline to 23:59:59.999 → now ≤ deadline? → Yes: compliant. No: now ≤ deadline + 5 days? → Yes: late. No: non-compliant. All three statuses go to Record in DB → submissions table compliance_status column.

**FIG. 8** — System architecture block diagram. CLIENT DEVICE (top): SvelteKit Web App (Tailwind CSS UI) connected to Web Worker (PdfWorker, COMPRESS_AND_HASH, STAMP_QR), IndexedDB (idb-keyval, Queue + Cache), Tesseract.js WASM (eng+fil OCR Engine), PDF.js (Text Extraction). SERVER PROXY ENDPOINTS (middle row): POST /api/convert (LibreOffice DOCX→PDF) connected to LibreOffice headless and Google Apps Script (fallback); POST /api/storage/upload (Proxy upload to B2) connected to Backblaze B2; GET /api/storage/presign (Pre-signed download URLs). SUPABASE BACKEND (middle row): PostgreSQL (submissions, profiles, teaching_loads, academic_calendar), Auth Service (JWT + Email/Password), Row-Level Security (Teacher: self, School Head: school, District Supervisor: district). VERIFICATION (bottom): /verify/{hash} page connected to IndexedDB and PostgreSQL. Arrows show data flow between components.

---

## Formatting Rules

1. Use **line-numbered format** — every 5th line numbered in the left margin: 10, 15, 20, 25, 30... starting at 10 on the first content line
2. The ABSTRACT must be exactly **150 words** and include technical function
3. Each DRAWING (FIG. 1-8) must start on a **new page** — write "---PAGE BREAK---" between figures
4. CLAIMS section must contain exactly **10 claims**
5. Use plain text only (no markdown formatting like ##, **, ---, or bullet asterisks)
6. All IPC codes must reference WIPO IPC Publication 2024.01: G06Q50/20, G06F16/93, G06F21/64, G06V30/10, G06V30/12, G06N20/00, H04L9/00, G06Q10/10, G06F16/13, G06F16/174, G06F9/54
7. All prior art must reference verified Google Patents URLs: US8503924B2 (https://patents.google.com/patent/US8503924B2), US20250370663A1 (https://patents.google.com/patent/US20250370663A1), US12602560B1 (https://patents.google.com/patent/US12602560B1), US10404462B2 (https://patents.google.com/patent/US10404462B2), US10740638B2 (https://patents.google.com/patent/US10740638B2), US10679089B2 (https://patents.google.com/patent/US10679089B2)

Generate the complete patent document now.
