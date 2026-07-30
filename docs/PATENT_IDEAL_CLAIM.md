PHILIPPINE PATENT APPLICATION

TITLE OF INVENTION

Educational Document Processing Pipeline with Client-Side Optical Character Recognition, Cryptographic Hashing, QR Code Stamping, and Compliance Verification

DESCRIPTION

Technical Field

Electronic document processing system for educational compliance management; client-side pipeline integrating OCR, cryptographic hashing, QR verification, and academic calendar-based compliance determination with offline-first queuing capability.

Background of the Invention

Teachers under the Philippine Department of Education (DepEd) must submit Daily Lesson Logs (DLLs), Instructional Supervisory Plans (ISPs), and reports tied to specific teaching loads and curriculum weeks. School heads and district supervisors review these for instructional quality and regulatory compliance. Existing systems suffer from six technical deficiencies: (1) fragmented document processing with no integrated client-side pipeline; (2) server-dependent OCR requiring remote transmission of documents; (3) standalone QR verification tools not integrated into the submission workflow; (4) no automated compliance determination against academic calendar deadlines; (5) no offline document processing for intermittent connectivity environments; and (6) manual metadata entry with no automated extraction. Prior art (US8503924B2, US20250370663A1, US12602560B1, US10404462B2, US10740638B2, US10679089B2) addresses these deficiencies individually but none teaches their combination in a single integrated pipeline executing from a client device.

Summary of the Invention

The invention provides an integrated document processing pipeline comprising nine sequential stages executing from a client web browser: (1) document receipt, (2) dual-path DOCX-to-PDF transcoding (LibreOffice server proxy then Google Apps Script fallback), (3) PDF compression via pdf-lib, (4) dual-path text extraction (PDF.js then Tesseract.js WebAssembly OCR with English and Filipino language models) with metadata parsing using regex, Dice coefficient fuzzy matching, and Naive Bayes classification, (5) Web Worker SHA-256 hashing with three-level duplicate detection (local IndexedDB cache, server database, slot uniqueness), (6) Web Worker QR code generation and PDF stamping, (7) compliance status determination (compliant, late with 5-day grace window, or non-compliant) against academic calendar deadlines, (8) archival to S3-compatible cloud storage via server proxy, and (9) public document verification via two-tier lookup (offline IndexedDB cache then server database). An offline-first mode queues fully-processed documents in IndexedDB when offline and auto-syncs via four trigger mechanisms (online event, visibility change, window focus, 60-second heartbeat).

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

CLAIM

1. A method for educational document processing executed entirely within a client web browser, comprising:

   (a) receiving a document file and, if in Word format, converting to PDF via a server proxy running headless LibreOffice with fallback to a Google Apps Script web app that creates a temporary Drive file, converts via Docs API, and exports PDF;

   (b) extracting text by first attempting PDF.js text layer extraction and, upon failure, performing optical character recognition using Tesseract.js compiled to WebAssembly with English and Filipino language models;

   (c) parsing the extracted text using regex, Dice coefficient fuzzy matching at 0.4 threshold, and Naive Bayes classification to identify document type, week number, subject, grade level, and school year;

   (d) computing a SHA-256 hash in a Web Worker via Web Crypto API and checking for duplicates against IndexedDB, then a server database with 30-second timeout, then against a slot comprising teaching load, week, school year, and document type;

   (e) generating a QR code in the Web Worker encoding a verification URL with the hash and stamping it onto the PDF at bottom-right at 72 pixels with 30-pixel margin;

   (f) determining compliance by comparing submission time against an academic calendar deadline set to 23:59:59.999 for the detected week and user's district, yielding compliant, late within 5 days, or non-compliant;

   (g) when offline, queuing the document in IndexedDB and auto-processing upon reconnection via online event with 3-second delay, visibility change, focus, and 60-second heartbeat, with re-validation before upload;

   (h) providing a public verification page at /verify/{hash} that checks IndexedDB cache then server database and returns metadata or not-found.

ABSTRACT

A client-side educational document processing pipeline. A document file is received and, if in Word format, transcoded to PDF via a LibreOffice server proxy with Google Apps Script fallback. The PDF is compressed via pdf-lib. Text is extracted via PDF.js with Tesseract.js WebAssembly fallback (English and Filipino). Metadata is parsed using regex, Dice coefficient fuzzy matching, and Naive Bayes classification. SHA-256 hashing and QR code generation and PDF stamping execute in a Web Worker. The hash is checked against an IndexedDB cache and server database for duplicate detection. Compliance status (compliant, late with 5-day grace window, or non-compliant) is determined against an academic calendar deadline. The QR-stamped document is uploaded to S3-compatible cloud storage via a server proxy. When offline, documents are queued in IndexedDB and auto-processed upon connectivity restoration via online events, visibility changes, window focus, and periodic heartbeats. A verification page checks an offline cache and server database for document authenticity confirmation.

ACCOMPANYING FIGURES

FIG. 1  - PATENT_PIPELINE_DIAGRAM.svg  - Pipeline architecture: client stages, server infrastructure, verification, online/offline branching
FIG. 4  - PATENT_VERIFICATION_DIAGRAM.svg  - Two-tier verification: offline cache, server query, VERIFIED/NOT FOUND
FIG. 5  - PATENT_OFFLINE_DIAGRAM.svg  - Offline queuing: IndexedDB queue, 4 auto-sync triggers, queue processor
FIG. 2,3,6,7,8  - PATENT_FIGURES.md  - Full process flowchart, OCR parsing, transcoding, compliance, system architecture
