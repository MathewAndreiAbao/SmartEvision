PHILIPPINE PATENT APPLICATION

TITLE OF INVENTION

EDUCATIONAL DOCUMENT PROCESSING PIPELINE WITH CLIENT-SIDE OPTICAL CHARACTER RECOGNITION, CRYPTOGRAPHIC HASHING, QR CODE STAMPING, AND COMPLIANCE VERIFICATION

DESCRIPTION

Technical Field

Electronic document processing system for educational compliance management; client-side pipeline integrating OCR, cryptographic hashing, QR verification, and academic calendar-based compliance determination with offline-first queuing capability.

Background of the Invention

Teachers under the Philippine Department of Education (DepEd) must submit Daily Lesson Logs (DLLs), Instructional Supervisory Plans (ISPs), and reports tied to specific teaching loads and curriculum weeks. School heads and district supervisors review these for instructional quality and regulatory compliance. Existing systems suffer from six technical deficiencies: (1) fragmented document processing with no integrated client-side pipeline; (2) server-dependent OCR requiring remote transmission of documents; (3) standalone QR verification tools not integrated into the submission workflow; (4) no automated compliance determination against academic calendar deadlines; (5) no offline document processing for intermittent connectivity environments; and (6) manual metadata entry with no automated extraction. Prior art (US8503924B2, US20250370663A1, US12602560B1, US10404462B2, US10740638B2, US10679089B2) addresses these deficiencies individually but none teaches their combination in a single integrated pipeline executing from a client device.

Summary of the Invention

The invention provides an integrated document processing pipeline comprising nine sequential stages executing from a client web browser: (1) document receipt, (2) dual-path DOCX-to-PDF transcoding (LibreOffice server proxy then Google Apps Script fallback), (3) PDF compression via pdf-lib, (4) dual-path text extraction (PDF.js then Tesseract.js WebAssembly OCR with English and Filipino language models) with metadata parsing using regex, Dice coefficient fuzzy matching, and Naive Bayes classification, (5) Web Worker SHA-256 hashing with three-level duplicate detection (local IndexedDB cache, server database, slot uniqueness), (6) Web Worker QR code generation and PDF stamping, (7) compliance status determination (compliant, late with 5-day grace window, or non-compliant) against academic calendar deadlines, (8) archival to S3-compatible cloud storage via server proxy, and (9) public document verification via two-tier lookup (offline IndexedDB cache then server database). An offline-first mode queues fully-processed documents in IndexedDB when offline and auto-syncs via four trigger mechanisms (online event, visibility change, window focus, 60-second heartbeat).

Brief Description of the Drawings

FIG. 1 (PATENT_PIPELINE_DIAGRAM.svg) — System architecture block diagram: Client Device (Stages 1-8b), Server Infrastructure (Supabase, Backblaze B2, server proxy, Google Apps Script), and Verification zone, with network decision branching to online upload or offline IndexedDB queue.

FIG. 2 (PATENT_FIGURES.md) — Detailed submission flowchart: file detection, dual transcoding, compression, PDF.js/Tesseract.js extraction, regex/Dice/Naive Bayes parsing, Web Worker hash, QR stamp, three-level dedup, calendar deadline lookup, compliance output, and online/offline archival.

FIG. 3 (PATENT_FIGURES.md) — Dual-path OCR and metadata parsing: PDF.js primary path, Tesseract.js (eng+fil) fallback, three-stage parser (regex, Dice coefficient at 0.4 threshold, Naive Bayes) producing 10 metadata fields.

FIG. 4 (PATENT_VERIFICATION_DIAGRAM.svg) — Two-tier verification: QR scan via jsQR/BarcodeDetector, hash extraction, Tier 1 IndexedDB cache lookup, Tier 2 Supabase query, producing VERIFIED or NOT FOUND results.

FIG. 5 (PATENT_OFFLINE_DIAGRAM.svg) — Offline queuing and sync: online flow (upload + DB insert), offline flow (IndexedDB queue via idb-keyval), four auto-sync triggers (online event, visibility, focus, 60s heartbeat), queue processor with re-validation.

FIG. 6 (PATENT_FIGURES.md) — Dual-path transcoding: primary LibreOffice (soffice --headless --convert-to pdf), fallback Google Apps Script (Drive API, Docs API, base64 encoding).

FIG. 7 (PATENT_FIGURES.md) — Compliance determination: two-level calendar lookup (school-year then district), deadline comparison at 23:59:59.999, 5-day grace window, three-status output.

FIG. 8 (PATENT_FIGURES.md) — System architecture: SvelteKit client, Web Worker, IndexedDB, Tesseract.js, PDF.js; server proxy endpoints; Supabase (PostgreSQL, Auth, RLS); Backblaze B2; verification page.

Detailed Description

The pipeline executes entirely in a web browser on a client device (desktop, laptop, tablet, or smartphone) as a Progressive Web Application built with SvelteKit.

Stage 1 — Document Receipt. A user selects or drops a .docx or .pdf file. The file is read as an ArrayBuffer; extension and MIME type are validated. Early SHA-256 hash may be computed for pre-submission dedup.

Stage 2 — Format Transcoding. If .docx, the system first POSTs to /api/convert with Bearer token where LibreOffice runs soffice --headless --convert-to pdf. On failure, it POSTs the file as base64 JSON to a Google Apps Script webapp which creates a Drive file, opens via Docs API (auto-converts), exports PDF, base64-encodes, deletes the Drive file, and returns the PDF. PDF files skip this stage.

Stage 3 — PDF Compression. PDFs larger than 2MB (or when not on low-power/slow-connection) are compressed via pdf-lib to remove redundant metadata and optimize fonts.

Stage 4 — Text Extraction and Metadata Parsing. PDF.js loads from CDN and extracts text via its text layer API. If extraction fails or returns insufficient text, each page is rendered to Canvas, converted to blob, and processed by Tesseract.js (eng+fil). The extracted text is parsed by: (i) regex patterns detecting DLL/ISP/ISR markers, week numbers, school years, dates; (ii) Dice coefficient fuzzy matching of subjects and grade levels against reference lists at 0.4 threshold; (iii) Naive Bayes classifiers predicting subject and doc type from JSON word frequency models. Output includes docType, weekNumber, schoolYear, subject, gradeLevel, teacher, date, dateRange, language, rawText. Metadata is presented to the user for confirmation.

Stage 5 — Hashing and Duplicate Detection. Compressed PDF is sent to a Web Worker via COMPRESS_AND_HASH message. The worker computes SHA-256 using crypto.subtle.digest('SHA-256', ...) and returns the hash plus compressed bytes. Three-level dedup: (i) local IndexedDB cache check; (ii) server DB query for matching file_hash with 30s timeout; (iii) slot uniqueness check (teaching_load_id + week + school_year + doc_type).

Stage 6 — QR Generation and Stamping. The hash is sent to the Web Worker via STAMP_QR message. The worker generates a QR code (Reed-Solomon Level M) encoding {APP_URL}/verify/{SHA256_HASH} and stamps it onto the last PDF page using pdf-lib at 72px, 30px margin, bottom-right.

Stage 7 — Compliance Determination. The system queries academic_calendar for the detected week number and school year, falling back to district-level lookup. If a deadline is found, it is set to 23:59:59.999. Submission before deadline = compliant; within 5 days after = late; beyond = non-compliant. No deadline = default compliant.

Stage 8 — Archival. QR-stamped PDF is POSTed to /api/storage/upload which forwards to Backblaze B2 under path submissions/{userId}/{docType}/{timestamp}_{fileName}. A database record is inserted with: user_id, file_name, file_path, file_hash, file_size, doc_type, week_number, school_year, subject, calendar_id, teaching_load_id, compliance_status, raw_text. Success notification is shown and hash is cached locally.

Offline Deferred Processing. When offline, Stages 1-6 execute normally. At Stage 8, the document and metadata are queued to IndexedDB via idb-keyval with key sync_queue_{timestamp}_{shortHash}. Four triggers auto-process the queue on reconnect: (i) window online event plus 3s delay; (ii) visibilitychange to visible while online; (iii) window focus while online; (iv) 60-second heartbeat. Each queued item is re-validated for slot and hash uniqueness before upload. Success removes from queue; failure retains for retry.

Verification System. A public page at /verify/{hash} performs two-tier lookup: Tier 1 checks IndexedDB cache (populated by preloadVerificationHashes() on login and after each archival); Tier 2 queries the Supabase submissions table. Found = displays document metadata. Not found = displays unverified result. A QR scanner using jsQR and BarcodeDetector navigates to the corresponding verification URL on scan.

CLAIMS

1. A method for educational document processing comprising:
   (a) receiving a document file at a client device;
   (b) if in Word format, transmitting to a server proxy for PDF conversion via headless office suite, and upon failure, transmitting to a serverless transcoding function and receiving a PDF;
   (c) compressing the PDF using a client-side PDF manipulation library;
   (d) attempting text extraction via a JavaScript PDF rendering library, and upon failure, performing client-side OCR using Tesseract.js compiled to WebAssembly with English and Filipino language models;
   (e) parsing extracted text using regex pattern matching, Dice coefficient fuzzy matching, and Naive Bayes classification to identify metadata fields including document type, subject, grade level, week number, school year, teacher name, and date;
   (f) transferring the compressed PDF to a Web Worker thread and computing a SHA-256 hash therein using the Web Crypto API;
   (g) comparing the hash against a local IndexedDB cache and a server database for duplicate detection;
   (h) generating, within the Web Worker, a QR code encoding a verification URL containing the hash with Reed-Solomon error correction;
   (i) stamping, within the Web Worker, the QR code onto a new PDF page using a PDF manipulation library;
   (j) retrieving a deadline date from an academic calendar entry associated with the detected week number and a submitting user's district identifier;
   (k) comparing a submission timestamp against the deadline date to determine compliance status: compliant if on or before deadline, late if within a configurable grace window, or non-compliant if beyond;
   (l) uploading the QR-stamped document to a server proxy for forwarding to S3-compatible cloud storage; and
   (m) inserting a database record containing the file hash, file path, detected metadata, compliance status, and raw extracted text.

2. The method of claim 1, wherein the server proxy invokes soffice --headless --convert-to pdf via LibreOffice, and the serverless function is a Google Apps Script webapp that creates a Drive file, converts via Docs API, exports PDF, base64-encodes, deletes the Drive file, and returns the PDF in JSON.

3. The method of claim 1, wherein OCR is performed by rendering each PDF page to HTML Canvas, converting to blob, and passing to a Tesseract.js worker initialized with eng+fil language models.

4. The method of claim 1, wherein parsing comprises: regex detection of document type markers, week indicators, and school year ranges; Dice coefficient matching of subjects and grade levels against reference lists at a configurable threshold; and Naive Bayes classifiers for subject and document type prediction.

5. The method of claim 1, wherein the Web Worker receives COMPRESS_AND_HASH messages and STAMP_QR messages, each correlated by a unique request identifier.

6. The method of claim 1, wherein duplicate detection comprises: local IndexedDB cache lookup; server database query for matching file_hash with a configurable timeout; and slot uniqueness check for teaching load, week, school year, and document type combination.

7. The method of claim 1, wherein the QR code encodes {APPLICATION_URL}/verify/{SHA256_HASH} and is stamped at bottom-right of the last PDF page at 72 pixels with a 30-pixel margin.

8. The method of claim 1, wherein the grace window is 5 days.

9. The method of claim 1, further comprising, when offline, storing the QR-stamped document and metadata in IndexedDB; monitoring connectivity via online events, visibility changes, window focus, and periodic heartbeats; and automatically processing queued items upon reconnection.

10. The method of claim 9, wherein monitoring comprises a window online listener with 3-second stabilization, a visibilitychange listener, a focus listener, and a 60-second heartbeat interval.

11. The method of claim 1, further comprising a verification page that: receives a hash from a URL parameter; queries IndexedDB cache; upon cache miss, queries the server database; and returns document metadata if found or a not-found result otherwise.

12. The method of claim 11, wherein the verification page includes a camera-based QR scanner using a JavaScript QR library and BarcodeDetector API, parsing the verification URL to extract the hash and navigating to the corresponding page.

13. The method of claim 1, further comprising pre-fetching teaching loads, academic calendar entries, and submission history into IndexedDB cache when online to enable offline metadata selection.

14. A system for educational document processing comprising:
    a client device with a processor executing a web browser application as a Progressive Web App, the application including instructions for:
    (a) receiving a document file;
    (b) if in Word format, transmitting to a server proxy and upon failure to a serverless function for PDF conversion;
    (c) compressing the PDF via a client-side library;
    (d) extracting text via PDF.js with Tesseract.js WebAssembly fallback using English and Filipino models;
    (e) parsing text using regex, Dice coefficient, and Naive Bayes to identify metadata;
    (f) transferring to a Web Worker for SHA-256 hashing via Web Crypto API;
    (g) comparing the hash against IndexedDB cache and server database for dedup;
    (h) generating a QR code encoding a verification URL in the Web Worker;
    (i) stamping the QR code onto the PDF in the Web Worker;
    (j) retrieving a deadline date from an academic calendar entry;
    (k) determining compliance status (compliant, late with grace window, non-compliant);
    (l) uploading to a server proxy for S3-compatible storage; and
    (m) inserting a database record with hash, path, metadata, status, and raw text.

15. The system of claim 14, further comprising an offline queue storing documents in IndexedDB when offline and an offline sync module processing queued items via online events, visibility changes, focus events, and periodic heartbeats.

16. The system of claim 14, further comprising a verification page module checking IndexedDB cache then server database for document hash lookup.

17. The system of claim 14, further comprising a pre-fetching module retrieving teaching loads, calendar entries, and submission history into IndexedDB cache when online.

18. A computer-readable medium storing instructions that, when executed, cause a processor to:
    (a) receive a document file;
    (b) if in Word format, convert to PDF via server proxy with serverless function fallback;
    (c) compress the PDF;
    (d) extract text via PDF.js with Tesseract.js WebAssembly fallback;
    (e) parse text using regex, Dice coefficient, and Naive Bayes for metadata;
    (f) compute SHA-256 hash in a Web Worker via Web Crypto API;
    (g) compare hash against IndexedDB cache and server database for dedup;
    (h) generate a QR code with verification URL in the Web Worker;
    (i) stamp the QR code onto the PDF in the Web Worker;
    (j) retrieve a deadline from an academic calendar;
    (k) determine compliance status with a grace window;
    (l) upload to server proxy for cloud storage; and
    (m) insert a database record.

19. The medium of claim 18, the method further comprising, when offline, storing in IndexedDB; monitoring connectivity via online events, visibility changes, focus events, and heartbeats; and processing queued items on reconnection.

20. The medium of claim 18, the method further comprising providing a verification page that checks IndexedDB cache then server database for a document hash and returns a verified or not-found result.

ABSTRACT

A client-side educational document processing pipeline. A document file is received and, if in Word format, transcoded to PDF via a LibreOffice server proxy with Google Apps Script fallback. The PDF is compressed via pdf-lib. Text is extracted via PDF.js with Tesseract.js WebAssembly fallback (English and Filipino). Metadata is parsed using regex, Dice coefficient fuzzy matching, and Naive Bayes classification. SHA-256 hashing and QR code generation and PDF stamping execute in a Web Worker. The hash is checked against an IndexedDB cache and server database for duplicate detection. Compliance status (compliant, late with 5-day grace window, or non-compliant) is determined against an academic calendar deadline. The QR-stamped document is uploaded to S3-compatible cloud storage via a server proxy. When offline, documents are queued in IndexedDB and auto-processed upon connectivity restoration via online events, visibility changes, window focus, and periodic heartbeats. A verification page checks an offline cache and server database for document authenticity confirmation.

ACCOMPANYING FIGURES

FIG. 1  - PATENT_PIPELINE_DIAGRAM.svg  - Pipeline architecture: client stages, server infrastructure, verification, online/offline branching
FIG. 4  - PATENT_VERIFICATION_DIAGRAM.svg  - Two-tier verification: offline cache, server query, VERIFIED/NOT FOUND
FIG. 5  - PATENT_OFFLINE_DIAGRAM.svg  - Offline queuing: IndexedDB queue, 4 auto-sync triggers, queue processor
FIG. 2,3,6,7,8  - PATENT_FIGURES.md  - Full process flowchart, OCR parsing, transcoding, compliance, system architecture
