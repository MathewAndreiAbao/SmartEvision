PHILIPPINE PATENT APPLICATION

TITLE OF INVENTION

Educational Document Processing Pipeline with Client-Side Optical Character Recognition, Cryptographic Hashing, QR Code Stamping, and Compliance Verification

Applicant: [Name of Applicant]
Inventor: Mathew Andrei Abao
Email: abaomathew91625@gmail.com

10 DESCRIPTION

15 1.1 Technical Field

20 The present invention relates generally to electronic document processing systems and, more specifically, to a client-side document pipeline for educational environments that receives uploaded lesson documents, automatically transcodes them via a server proxy or serverless function, compresses the resulting PDF, extracts metadata through in-browser text extraction or optical character recognition, performs cryptographic hashing via the Web Crypto API in a web worker thread for duplicate detection and subsequent verification, stamps a QR code containing a verification URL onto the document, determines compliance status against an academic calendar deadline with a configurable grace window, and archives the processed document to cloud storage.

25 1.2 Background of the Invention

30 Teachers under the Philippine Department of Education (DepEd) must submit Daily Lesson Logs (DLLs), Instructional Supervisory Plans (ISPs), and Instructional Supervisory Reports (ISRs) on a recurring basis, each tied to a specific teaching load and curriculum week. School heads and district supervisors review these documents to ensure instructional quality, curriculum alignment, and regulatory compliance. Despite technological advances in document management, existing systems suffer from six technical deficiencies.

35 First, document processing is fragmented with no integrated client-side pipeline. Existing systems separate document ingestion, format conversion, text recognition, compression, hashing, encoding, and verification into disconnected modules. No system provides an integrated pipeline that takes a raw document through the complete ordered sequence. Prior art such as US8503924B2 (Dion, 2013) directed to education compliance management and US20250370663A1 (Jaworski/Kyocera, 2025) directed to compliance document submission address institutional compliance but do not teach an integrated processing pipeline. Verified at https://patents.google.com/patent/US8503924B2 and https://patents.google.com/patent/US20250370663A1.

40 Second, optical character recognition remains server-dependent. Prior art OCR systems such as US10740638B2 (Grooper, 2020) and US10679089B2 (Grooper, 2020) require transmitting document images to a remote server for text recognition, introducing latency, bandwidth costs, and privacy concerns. Verified at https://patents.google.com/patent/US10740638B2 and https://patents.google.com/patent/US10679089B2. No prior art teaches OCR executed entirely within a web browser using Tesseract.js compiled to WebAssembly with educational document metadata extraction.

45 Third, QR code verification tools exist standalone outside the submission workflow. US10404462B2 (Carter/Unisys, 2019) and US12602560B1 (Glenn/Bank of America, 2026) teach QR validation and verification but operate independently of document creation pipelines. Verified at https://patents.google.com/patent/US10404462B2 and https://patents.google.com/patent/US12602560B1. No prior art teaches generating a QR code with embedded SHA-256 hash during submission and stamping it onto the document for dual-purpose duplicate detection and verification.

50 Fourth, no automated compliance determination exists. Systems do not automatically evaluate each document against academic calendar deadlines with a configurable grace window. Compliance determination is performed manually.

55 Fifth, offline document processing is absent. Existing systems require continuous connectivity. In rural schools with unreliable internet, teachers cannot submit documents when offline.

Sixth, metadata entry is manual. Teachers must manually enter subject, grade level, week number, and school year for each document, which is error-prone and time-consuming.

60 None of the prior art references teaches the combination of an integrated client-side pipeline comprising all of the foregoing elements in a single unified workflow.

65 1.3 Summary of the Invention

The invention provides an integrated educational document processing pipeline comprising nine sequential stages: document receipt, dual-path DOCX-to-PDF transcoding using a LibreOffice server proxy with Google Apps Script fallback, PDF compression via pdf-lib, dual-path text extraction using PDF.js with Tesseract.js WebAssembly OCR fallback using English and Filipino language models, metadata parsing using regex pattern matching, Dice coefficient fuzzy matching at a 0.4 threshold, and Naive Bayes classification, Web Worker SHA-256 hashing with three-level duplicate detection across local IndexedDB cache, server database, and slot uniqueness, Web Worker QR code generation and PDF stamping at 72 pixels with 30-pixel margin bottom-right, compliance status determination producing compliant, late with a 5-day grace window, or non-compliant against academic calendar deadlines, archival to S3-compatible cloud storage via server proxy, and public document verification via two-tier lookup in offline IndexedDB cache then server database. An offline-first mode queues fully-processed documents in IndexedDB when network connectivity is unavailable and auto-syncs via four trigger mechanisms comprising online events, visibility changes, window focus, and a 60-second heartbeat interval.

70 1.4 Brief Description of the Drawings

FIG. 1 is a system architecture block diagram showing the client device with eight pipeline stages, server infrastructure including Supabase, Backblaze B2, server proxy, and Google Apps Script, and a verification zone, with network decision branching to online upload or offline IndexedDB queue.

75 FIG. 2 is a detailed submission flowchart showing file detection, dual transcoding, compression, PDF.js and Tesseract.js extraction, regex, Dice coefficient, and Naive Bayes parsing, Web Worker hash computation, QR stamping, three-level duplicate detection, calendar deadline lookup, compliance output, and online and offline archival.

80 FIG. 3 is a block diagram of the dual-path text extraction and metadata parsing module showing the PDF.js primary path, Tesseract.js with English and Filipino language models fallback, and a three-stage parser combining regex, Dice coefficient at 0.4 threshold, and Naive Bayes classification producing ten metadata fields.

85 FIG. 4 is a flowchart of the cryptographic verification system showing QR code scanning via jsQR and BarcodeDetector, hash extraction, Tier 1 IndexedDB cache lookup, Tier 2 Supabase database query, and VERIFIED or NOT FOUND results.

90 FIG. 5 is a block diagram of the offline-first queuing and auto-sync system showing online normal flow, offline deferred flow with IndexedDB queue via idb-keyval, four auto-sync triggers comprising online events, visibility changes, focus events, and a 60-second heartbeat, and a queue processor with re-validation.

95 FIG. 6 is a block diagram of the dual-path transcoding system showing the primary LibreOffice server proxy path using soffice --headless --convert-to pdf and the fallback Google Apps Script path using Drive API, Docs API, and base64 encoding.

100 FIG. 7 is a flowchart of the compliance determination module showing two-level calendar lookup at the school-year level then district level, deadline comparison at 23:59:59.999, a 5-day grace window, and three-status output comprising compliant, late, and non-compliant.

105 FIG. 8 is a system architecture diagram showing the SvelteKit client, Web Worker, IndexedDB, Tesseract.js, PDF.js, server proxy endpoints, Supabase with PostgreSQL, Auth, and Row-Level Security, Backblaze B2, and the verification page.

110 1.5 Detailed Description

The pipeline executes entirely in a web browser on a client device as a Progressive Web Application built with SvelteKit. The pipeline comprises nine sequential stages plus an offline deferred processing mode and a verification system.

115 Stage 1 Document Receipt. A user selects or drops a document file in DOCX or PDF format into a web interface. The file is read into memory as an ArrayBuffer. The file extension and MIME type are validated. An early SHA-256 hash may be computed from the original file buffer for pre-submission duplicate detection. If the file format is unsupported the pipeline halts and displays an error message.

120 Stage 2 Format Transcoding. If the document is in DOCX format the system initiates a dual-path conversion strategy. The primary path transmits the file via HTTPS POST to a server proxy endpoint at /api/convert with a Bearer authentication token. The server proxy invokes LibreOffice with the command soffice --headless --convert-to pdf to perform the conversion and returns the resulting PDF bytes. If the primary path fails the system falls back to a Google Apps Script web application. The file is transmitted as a base64-encoded JSON payload. The Google Apps Script creates a temporary file in Google Drive using the Drive API, opens the file via the Google Docs API which automatically converts the DOCX to Google Docs format, exports the document as PDF, base64-encodes the result, deletes the temporary Drive file, and returns the PDF in a JSON response. If the original document is already in PDF format Stage 2 is skipped entirely. If both transcoding paths fail the pipeline halts with an error.

125 Stage 3 PDF Compression. The PDF bytes are evaluated for compression. If the PDF exceeds a configurable size threshold of 2 megabytes or if the device is not in a low-power or slow-connection state the PDF is compressed using the pdf-lib library. The compression operation removes redundant metadata and optimizes embedded font subsets. If the device is in a low-power state and the PDF is below the threshold compression is skipped.

130 Stage 4 Text Extraction and Metadata Parsing. The system performs dual-path text extraction. The primary path loads PDF.js from a content delivery network and extracts text content directly using its text layer extraction API. If PDF.js fails to load, fails to extract text, or returns insufficient text the system falls back to Tesseract.js compiled to WebAssembly. Each PDF page is rendered onto an HTML Canvas element, converted to a blob, and processed by a Tesseract.js worker initialized with both English and Filipino language models. The worker performs layout analysis, text line detection, character segmentation, and character recognition. The extracted text from either path is parsed by a metadata extraction module applying three techniques in combination. Regex pattern matching detects document type markers for DLL, ISP, and ISR, week number indicators, school year ranges, date fields, and grade level designations. Dice coefficient fuzzy matching compares extracted subject names and grade levels against known reference lists with a configurable similarity threshold of 0.4. Naive Bayes classifiers predict subject and document type from pre-trained word frequency models loaded from JSON configuration files. The extracted metadata comprises document type, week number, school year, subject with confidence score, grade level, teacher name, submission date, date range, detected language, and raw extracted text. The metadata is presented to the user for confirmation.

135 Stage 5 Hashing and Duplicate Detection. The compressed PDF bytes are transferred to a dedicated Web Worker thread via a COMPRESS_AND_HASH message. The worker computes a SHA-256 hash using the Web Crypto API via crypto.subtle.digest and returns both the compressed bytes and the hex-encoded hash string. Duplicate detection operates at three levels. A local IndexedDB cache is checked for a matching hash. Upon a cache miss the server database is queried for a matching file_hash value with a configurable timeout of 30 seconds. A slot uniqueness check verifies that no existing submission matches the same teaching load identifier, week number, school year, and document type combination.

140 Stage 6 QR Code Generation and Stamping. The computed SHA-256 hash is transferred to the Web Worker via a STAMP_QR message along with the compressed PDF bytes. The worker generates a QR code using Reed-Solomon error correction at Level M providing 15 percent damage tolerance. The QR code encodes a verification URL in the format APPLICATION_URL followed by /verify/ followed by the SHA-256 hash. The worker uses pdf-lib to embed the QR code image onto a new page appended to the PDF. The QR code is placed at the bottom-right of the last page at a size of 72 pixels with a 30-pixel margin from the edges.

145 Stage 7 Compliance Determination. The system retrieves an academic calendar from the database. It first attempts to look up a calendar entry matching the detected week number and the current school year. If no entry is found at the school-year level it falls back to looking up a calendar entry matching the week number and the submitting users district identifier. If a calendar entry with a deadline date is found the deadline is set to 23:59:59.999 on that day. The submission timestamp is compared against the deadline. If the submission is on or before the deadline the status is compliant. If the submission is after the deadline but within a grace window of 5 days the status is late. If the submission is beyond the grace window the status is non-compliant. If no calendar entry with a deadline date is found the submission defaults to compliant.

150 Stage 8 Archival. The QR-stamped document is uploaded to cloud storage through a server proxy endpoint at /api/storage/upload with a Bearer authentication token. The server proxy forwards the document to Backblaze B2 S3-compatible cloud storage under a path structure of submissions followed by user identifier, document type, timestamp, and file name. A database record is inserted into the submissions table containing user identifier, file name, file path, file hash, file size, document type, week number, school year, subject, calendar identifier, teaching load identifier, compliance status, and raw extracted text. A success notification is displayed and the verified document hash is cached locally for future offline verification.

155 Offline Deferred Processing. When the client device lacks network connectivity Stages 1 through 6 execute normally. Upon reaching Stage 8 the QR-stamped document bytes, file hash, file path, raw text, and associated options are bundled into a queue item and stored in IndexedDB using the idb-keyval library. The queue item is keyed by a string combining a prefix, the submission timestamp, and a short hash prefix. An offline sync initialization module registers four trigger mechanisms for automatic queue processing. A window online event listener with a 3-second stabilization delay invokes queue processing when connectivity is restored. A visibility change listener processes the queue when the document becomes visible and the device is online. A window focus listener processes the queue when the window receives focus and the device is online. A periodic heartbeat interval of 60 seconds checks connectivity and processes the queue. During queue processing each item is re-validated against the server for slot uniqueness and hash uniqueness before upload. Successfully uploaded items are removed from the queue. Failed items are retained for retry.

160 Verification System. A publicly accessible verification page at the URL path /verify/ followed by a hash performs two-tier document lookup. Tier 1 queries a local IndexedDB cache populated by a pre-fetching mechanism and updated after each successful archival. If a cached record matches the hash the metadata is displayed. If not found Tier 2 queries the Supabase database submissions table for a record matching the file hash. If a record is found its metadata including file name, document type, compliance status, creation timestamp, file size, week number, subject, school year, teacher name, school name, grade level, uploader identifier, and uploader school identifier is displayed. If no record is found in either tier a not-found result is displayed. The verification page includes a camera-based QR scanner using the jsQR library and the native BarcodeDetector API. When a QR code is scanned the verification URL is parsed, the hash is extracted, and the page navigates to the corresponding verification URL.

165 CLAIMS

170 1. A method for educational document processing comprising:
    (a) receiving a document file at a client device;
    (b) if the document file is in a Word format, transmitting the document file to a server proxy endpoint for conversion to PDF via a headless office suite, and upon failure of the server proxy, transmitting the document file to a serverless transcoding function and receiving a PDF version of the document in return;
    (c) compressing the PDF using a client-side PDF manipulation library;
    (d) attempting text extraction on the PDF using a JavaScript PDF rendering library, and upon failure of text extraction, performing optical character recognition on the PDF entirely within the client device using Tesseract.js compiled to WebAssembly with English and Filipino language models to produce extracted text;
    (e) parsing the extracted text using regex pattern matching, Dice coefficient fuzzy matching, and Naive Bayes classification to identify metadata fields including document type, subject, grade level, week number, school year, teacher name, and date;
    (f) transferring the compressed PDF to a Web Worker thread and computing a SHA-256 hash of the compressed PDF within the worker thread using the Web Crypto API;
    (g) comparing the computed hash against a local IndexedDB cache and a server database to determine whether the document is a duplicate;
    (h) generating, within the Web Worker thread, a QR code encoding a verification URL containing the computed hash, using a QR code generation library with Reed-Solomon error correction;
    (i) stamping, within the Web Worker thread, the QR code onto a new page appended to the PDF using a PDF manipulation library, producing a QR-stamped document;
    (j) retrieving a deadline date from an academic calendar database entry associated with the detected week number and a submitting users district identifier;
    (k) comparing a submission timestamp against the deadline date to determine a compliance status selected from the group consisting of compliant when the submission is on or before the deadline, late when the submission is within a configurable grace window after the deadline, and non-compliant when the submission is outside the grace window;
    (l) uploading the QR-stamped document to a server proxy endpoint that forwards the document to S3-compatible cloud storage; and
    (m) inserting a database record containing the file hash, file path, detected metadata, compliance status, and raw extracted text.

175 2. The method of claim 1, wherein the server proxy endpoint invokes a headless LibreOffice process with the command soffice --headless --convert-to pdf to perform Word to PDF conversion, and wherein the serverless transcoding function is a Google Apps Script web application that receives the document file as a base64-encoded payload, creates a temporary file in Google Drive, opens the file via the Google Docs API to convert the file to Google Docs format, exports the document as PDF via the Google Drive API, base64-encodes the PDF, deletes the temporary file, and returns the PDF in a JSON response.

180 3. The method of claim 1, wherein optical character recognition is performed by rendering each page of the PDF onto an HTML Canvas element, converting the Canvas to a blob, and passing each blob to a Tesseract.js worker initialized with both English and Filipino language models.

185 4. The method of claim 1, wherein parsing the extracted text comprises: applying regex patterns to detect document type markers, week number indicators, and school year ranges; applying Dice coefficient string similarity to match subject names and grade levels against reference lists with a configurable similarity threshold; and applying pre-trained Naive Bayes classifiers for subject and document type prediction.

190 5. The method of claim 1, wherein the Web Worker thread receives messages of a first message type for performing compression and SHA-256 hashing and messages of a second message type for performing QR code generation and PDF stamping, each message correlated with a unique request identifier.

195 6. The method of claim 1, wherein duplicate detection comprises: looking up the computed hash in a local IndexedDB cache; upon a cache miss, querying the server database for a matching file hash with a configurable timeout; and checking that no existing submission matches the same teaching load identifier, week number, school year, and document type combination.

200 7. The method of claim 1, wherein the QR code encodes a verification URL in the format of an application URL followed by /verify/ followed by the SHA-256 hash, and the QR code is stamped at the bottom-right of the last page of the PDF at a size of 72 pixels with a 30-pixel margin.

205 8. The method of claim 1, wherein the configurable grace window for the late compliance status is 5 days.

210 9. The method of claim 1, further comprising, when the client device lacks network connectivity, storing the QR-stamped document, file hash, file path, raw text, and submission options in IndexedDB as a queue item; monitoring for restoration of connectivity through online events, visibility changes, window focus events, and periodic heartbeat checks; and upon detection of connectivity, automatically processing queued items through uploading to the server proxy endpoint and inserting database records.

215 10. The method of claim 9, wherein the periodic heartbeat checks occur at a 60-second interval, and the online event monitoring includes a 3-second stabilization delay before processing.

220 ABSTRACT

A client-side educational document processing pipeline receives a document file, transcodes DOCX to PDF via LibreOffice server proxy with Google Apps Script fallback, compresses via pdf-lib, extracts text via PDF.js with Tesseract.js WebAssembly fallback using English and Filipino language models for optical character recognition, and parses metadata using regex pattern matching, Dice coefficient fuzzy matching at 0.4 threshold, and Naive Bayes classification to identify document type, subject, grade level, week number, and school year. SHA-256 cryptographic hashing and QR code generation and PDF stamping execute in a Web Worker via Web Crypto API with Reed-Solomon error correction. The hash is checked against IndexedDB cache and server database for three-level duplicate detection. Compliance status is determined against an academic calendar deadline with a 5-day grace window producing compliant, late, or non-compliant. The QR-stamped document uploads to S3-compatible cloud storage via server proxy. Offline documents queue in IndexedDB and auto-sync via online events, visibility changes, window focus, and a 60-second heartbeat. A verification page checks cache then database for authenticity confirmation.

---PAGE BREAK---

DRAWINGS

FIG. 1

[Page 1 of Drawings]

High-level block diagram showing three zones connected by arrows.

Zone 1 CLIENT DEVICE on the left side shows eight stages arranged vertically from top to bottom in a sequential pipeline. Stage 1 Document Receipt is represented by a rectangle at the top. Downward arrow leads to Stage 2 Format Transcoding marked DOCX to PDF. Downward arrow leads to Stage 3 PDF Compression marked pdf-lib. Downward arrow leads to Stage 4 Text Extraction and OCR marked PDF.js to Tesseract.js. Downward arrow leads to Stage 5 Hashing and Dedup marked Web Worker plus SHA-256. Downward arrow leads to Stage 6 QR Generation and Stamp marked Web Worker plus pdf-lib. Downward arrow leads to Stage 7 Compliance Check marked Calendar deadline comparison. Downward arrow leads to a diamond-shaped Network Available decision node. From the diamond two arrows emerge. A solid arrow labeled Yes leads to Stage 8a Upload to Server Proxy which shows an arrow pointing right to Backblaze B2. A dashed arrow labeled No leads to Stage 8b Queue to IndexedDB marked Deferred sync.

Zone 2 SERVER INFRASTRUCTURE in the center shows four boxes arranged horizontally. From left to right: Server Proxy labeled LibreOffice, Google Apps Script labeled Fallback, Supabase labeled PostgreSQL plus Auth plus RLS, and Backblaze B2 labeled S3-compatible Storage. A solid arrow from Stage 2 Format Transcoding connects to Server Proxy labeled Primary. A dashed arrow from Stage 2 connects to Google Apps Script labeled Fallback. An arrow from Stage 8a Upload connects to Backblaze B2. An arrow from Stage 8a also connects to Supabase. A dashed arrow from Stage 8b Queue to IndexedDB loops back to Stage 8a Upload labeled On reconnect.

Zone 3 VERIFICATION at the bottom shows two boxes. Public Verify Page at /verify/ followed by hash on the left. QR Scanner labeled jsQR plus BarcodeDetector on the right. A bidirectional arrow connects the Verify Page to Supabase. A bidirectional arrow connects the Verify Page to the QR Scanner.

---PAGE BREAK---

FIG. 2

[Page 2 of Drawings]

Flowchart starting from a rounded rectangle labeled START User selects document. A downward arrow leads to a diamond labeled File Type with two options PDF and DOCX or DOC.

The PDF path proceeds right to a rectangle Load PDF bytes.

The DOCX path proceeds down to a rectangle Try Server Proxy POST to /api/convert. An arrow leads to a diamond labeled Success. Yes arrow leads to Load PDF bytes. No arrow leads to a rectangle Fallback Google Apps Script Base64 to Drive to Docs API to PDF. An arrow leads to a diamond labeled Success. Yes arrow leads to Load PDF bytes. No arrow leads to a rectangle Error Conversion failed.

From Load PDF bytes a downward arrow leads to a diamond labeled File greater than 2MB or not slow connection. Yes arrow leads to a rectangle Compress PDF via pdf-lib. No arrow leads to a rectangle Skip compression. Both converge to a rectangle Try PDF.js text extraction. An arrow leads to a diamond labeled Text found. Yes arrow leads to a rectangle Use extracted text. No arrow leads to a rectangle Render pages to Canvas. An arrow leads to a rectangle Tesseract.js OCR eng plus fil models. An arrow leads to Use extracted text.

From Use extracted text a downward arrow leads to a rectangle Parse metadata. An arrow leads to a rectangle Regex patterns DLL ISP ISR week year. An arrow leads to a rectangle Dice coefficient subject grade matching. An arrow leads to a rectangle Naive Bayes doc type plus subject. An arrow leads to a rectangle Metadata identified.

A downward arrow leads to a rectangle Web Worker COMPRESS_AND_HASH. An arrow leads to a rectangle SHA-256 hash computed. An arrow leads to a diamond Check local IndexedDB cache. Duplicate arrow leads to a rectangle Error Duplicate detected. Not found arrow leads to a diamond Check server DB file_hash match. Duplicate arrow leads to Error. Not found arrow leads to a diamond Check slot load plus week plus type. Taken arrow leads to Error. Free arrow leads to a rectangle Web Worker STAMP_QR.

A downward arrow leads to a rectangle Generate QR code URL /verify/ hash. An arrow leads to a rectangle Stamp QR on PDF bottom-right 72px 30px margin. An arrow leads to a diamond Calendar entry for week plus district. Found arrow leads to a rectangle Get deadline_date. An arrow leads to a diamond Submission less than or equal to deadline. Yes arrow leads to a rectangle Status compliant. No arrow leads to a diamond Within 5-day grace. Yes arrow leads to a rectangle Status late. No arrow leads to a rectangle Status non-compliant. Not found arrow from Calendar entry leads to a rectangle Status compliant.

All three status rectangles converge to a rectangle Upload QR-stamped PDF to /api/storage/upload. An arrow leads to a rectangle Backblaze B2 storage submissions user type ts file. An arrow leads to a rectangle Insert DB record file_hash metadata compliance. An arrow leads to a rounded rectangle Success. The Error rectangles converge to a rounded rectangle Failure.

---PAGE BREAK---

FIG. 3

[Page 3 of Drawings]

Block diagram with four sub-blocks connected by arrows from top to bottom.

The first sub-block at the top is labeled INPUT and contains a single rectangle labeled PDF bytes.

A downward arrow splits into two paths.

The PRIMARY PATH on the left side is enclosed in a dashed border labeled PRIMARY PATH PDF.js Text Extraction. Inside from top to bottom: rectangle Load PDF.js from CDN, downward arrow to rectangle Render each page, downward arrow to rectangle Extract text layer via API, downward arrow to diamond Extraction successful. A Yes arrow exits the dashed border rightward to a rectangle labeled Extracted text. A No arrow crosses downward to the FALLBACK PATH.

The FALLBACK PATH on the right side is enclosed in a dashed border labeled FALLBACK PATH Tesseract.js OCR. Inside from top to bottom: rectangle Render PDF page to HTML Canvas, downward arrow to rectangle Convert Canvas to Blob, downward arrow to rectangle Create Tesseract.js worker Language eng plus fil, downward arrow to rectangle Run OCR on each page blob, downward arrow to rectangle Layout analysis plus line detection, downward arrow to rectangle Character segmentation plus recognition, downward arrow to rectangle Output text plus confidence scores. An arrow exits the dashed border to join Extracted text.

The third sub-block is labeled PARSER Metadata Parsing Engine enclosed in a dashed border. An arrow from Extracted text enters the parser. Inside three parallel rectangles arranged horizontally. Left rectangle labeled Regex Pattern Matcher listing bullet items DLL ISP ISR markers, Week number indicators, School year ranges, Date fields, Grade level. Center rectangle labeled Dice Coefficient Fuzzy Matcher listing Subject names vs reference list, Grade levels vs reference list, Threshold 0.4. Right rectangle labeled Naive Bayes Classifier listing Subject prediction model, Doc type prediction model, Word frequency from JSON. All three rectangles have arrows converging downward.

The fourth sub-block at the bottom is labeled OUTPUT enclosed in a dashed border showing ten metadata fields arranged in two columns. Left column: docType DLL ISP ISR Unknown, weekNumber 1 to 40, schoolYear e.g. 2024-2025, subject string plus confidence, gradeLevel string. Right column: teacher string, date ISO date string, dateRange start plus end, language English or Filipino, rawText full extracted text.

---PAGE BREAK---

FIG. 4

[Page 4 of Drawings]

Flowchart with three sub-blocks arranged vertically.

The top sub-block is labeled QR Code Scanning enclosed in a dashed border. Inside from left to right: rectangle Document with QR code, arrow to rectangle Camera scan or image upload, arrow to rectangle Decode QR via jsQR or BarcodeDetector, arrow to rectangle Parse verification URL format /verify/ SHA256_HASH, arrow to rectangle Extract SHA-256 hash. A downward arrow exits the sub-block.

The middle sub-block on the left is labeled TIER 1 Offline Cache Check enclosed in a dashed border. Inside: rectangle Query IndexedDB cache key cached_docs_hash, arrow to diamond Found. A Yes arrow leads to rectangle Display cached metadata file_name doc_type etc. An arrow leads to a rectangle below labeled Verified result. A No arrow leads to rectangle Cache miss proceed to Tier 2.

The middle sub-block on the right is labeled TIER 2 Server Database Query enclosed in a dashed border. Inside: rectangle Query Supabase submissions table WHERE file_hash equals hash, arrow to diamond Record found. A Yes arrow leads to rectangle Display metadata name type status date teacher school grade. An arrow leads to Verified result. A No arrow leads to rectangle Not found result.

The bottom sub-block shows three result boxes side by side. Left box labeled Verified showing a check mark and text Hash matches. Center box labeled Tampered showing a warning symbol and text Hash mismatch. Right box labeled Not Found showing an X symbol and text No record. Arrows from the Verified result rectangles in Tier 1 and Tier 2 point to the Verified box. An arrow from the Not found result in Tier 2 points to the Not Found box.

---PAGE BREAK---

FIG. 5

[Page 5 of Drawings]

Block diagram with four sub-blocks.

The top-left sub-block is labeled ONLINE Normal Flow enclosed in a dashed border. Inside: rectangle Pipeline Stages 1 to 6 execute normally, arrow to rectangle Stage 8 Upload to server, arrow to rectangle Success.

The top-right sub-block is labeled OFFLINE Deferred Flow enclosed in a dashed border. Inside: rectangle Pipeline Stages 1 to 6 execute normally, arrow to rectangle Stage 8b Enqueue to IndexedDB, arrow to rectangle Queue item stored key sync_queue_ts_hash pdfBytes fileHash metadata, arrow to rectangle pendingSyncCount incremented.

The middle sub-block is labeled AUTO-SYNC TRIGGERS enclosed in a dashed border showing four rectangles arranged horizontally. From left to right: rectangle window online event plus 3-second stabilization, rectangle visibilitychange to visible plus online check, rectangle window focus event plus online check, rectangle Periodic heartbeat every 60 seconds. Arrows from all four rectangles point downward to the QUEUE PROCESSOR sub-block.

The bottom sub-block is labeled QUEUE PROCESSOR enclosed in a dashed border. Inside: rectangle Get all queue items sorted by timestamp, arrow to diamond Re-validate slot and hash on server. An Already exists arrow leads to rectangle Remove from queue Mark as synced, arrow to rectangle Next item. An Available arrow leads to rectangle Upload to server proxy, arrow to diamond Upload OK. A Yes arrow leads to rectangle Insert DB record Delete queue item, arrow to Next item. A No arrow leads to rectangle Keep in queue for retry, arrow to Next item.

---PAGE BREAK---

FIG. 6

[Page 6 of Drawings]

Block diagram with three sub-blocks.

The top sub-block is labeled CLIENT SIDE. Inside: a central rectangle labeled Original .docx file. Two arrows emerge rightward. A solid line arrow labeled Primary leads to the PRIMARY PATH sub-block. A dashed line arrow labeled Fallback leads to the FALLBACK PATH sub-block.

The middle-left sub-block is labeled PRIMARY PATH Server Proxy LibreOffice enclosed in a dashed border. Inside from top to bottom: rectangle Receive file as multipart FormData Auth Bearer token, arrow to rectangle Invoke soffice --headless --convert-to pdf, arrow to rectangle Return PDF bytes, arrow to diamond Success. A solid arrow labeled Yes exits rightward. A dashed arrow labeled No exits downward to the FALLBACK PATH.

The middle-right sub-block is labeled FALLBACK PATH Google Apps Script enclosed in a dashed border. Inside from top to bottom: rectangle Receive base64 plus fileName in JSON, arrow to rectangle Create temp file in Google Drive MIME application/vnd.google-apps.document, arrow to rectangle Open via Google Docs API auto-converts DOCX to Google Doc, arrow to rectangle Export as PDF via Drive API, arrow to rectangle Base64-encode PDF bytes, arrow to rectangle Delete temp file from Drive, arrow to rectangle Return JSON success pdfBase64. An arrow exits rightward.

The bottom sub-block is labeled CLIENT RECEIVE enclosed in a dashed border. Inside: a diamond labeled Primary OK. A Yes arrow leads to rectangle Use PDF bytes as Uint8Array. A No arrow leads to an arrow from the Fallback path. Below the diamond a second diamond labeled Success. A Yes arrow leads to rectangle Use PDF bytes. A No arrow leads to rectangle Error Conversion failed.

---PAGE BREAK---

FIG. 7

[Page 7 of Drawings]

Flowchart with two sub-blocks.

The top sub-block is labeled INPUTS and shows four rectangles arranged horizontally: detected weekNumber, submission timestamp, current schoolYear, user district_id. Arrows from all four point downward to the CALENDAR LOOKUP sub-block.

The middle-left sub-block is labeled CALENDAR LOOKUP enclosed in a dashed border. Inside from top to bottom: rectangle Query academic_calendar WHERE week equals weekNumber AND school_year equals schoolYear, arrow to diamond Found. A Yes arrow leads to rectangle Use calendar entry. A No arrow leads to rectangle Query academic_calendar WHERE week equals weekNumber AND district_id equals user dot district_id, arrow to diamond Found. A Yes arrow leads to Use calendar entry. A No arrow leads to rectangle No deadline default compliant. An arrow from No deadline leads to rectangle Record to DB. An arrow from Use calendar entry leads to the COMPLIANCE LOGIC sub-block.

The middle-right sub-block is labeled COMPLIANCE LOGIC enclosed in a dashed border. Inside from top to bottom: diamond Has deadline_date. A No arrow exits left to No deadline default compliant. A Yes arrow leads to rectangle Set deadline to 23:59:59.999, arrow to diamond now less than or equal to deadline. A Yes arrow leads to rectangle compliant. A No arrow leads to diamond now less than or equal to deadline plus 5 days. A Yes arrow leads to rectangle late. A No arrow leads to rectangle non-compliant.

The bottom sub-block shows a single rectangle labeled Record in DB submissions table compliance_status column. Arrows from compliant, late, non-compliant, and No deadline default compliant all converge to Record in DB.

---PAGE BREAK---

FIG. 8

[Page 8 of Drawings]

System architecture block diagram with four horizontal tiers connected by arrows.

The top tier is labeled CLIENT DEVICE and contains six rectangles connected by lines. Center rectangle labeled SvelteKit Web App Tailwind CSS UI. Connected leftward a rectangle labeled Web Worker PdfWorker listing COMPRESS_AND_HASH and STAMP_QR. Connected rightward a rectangle labeled IndexedDB idb-keyval listing Queue and Cache. Below Web Worker a rectangle labeled Tesseract.js WASM eng plus fil OCR Engine. Below IndexedDB a rectangle labeled PDF.js Text Extraction. The SvelteKit Web App has arrows pointing downward to the server tier.

The second tier is labeled SERVER PROXY ENDPOINTS and shows three rectangles. Left rectangle labeled POST /api/convert LibreOffice DOCX to PDF with an arrow pointing left to a rectangle labeled LibreOffice headless and an arrow pointing right to a rectangle labeled Google Apps Script fallback. Center rectangle labeled POST /api/storage/upload Proxy upload to B2 with an arrow pointing right to the storage tier. Right rectangle labeled GET /api/storage/presign Pre-signed download URLs.

The third tier shows two sub-blocks side by side. On the left is labeled SUPABASE BACKEND and contains three stacked rectangles: top rectangle labeled PostgreSQL submissions profiles teaching_loads academic_calendar, middle rectangle labeled Auth Service JWT plus Email/Password, bottom rectangle labeled Row-Level Security Teacher self School Head school District Supervisor district. On the right is labeled CLOUD STORAGE containing a single rectangle labeled Backblaze B2 S3-compatible Path submissions user type file.

The bottom tier is labeled VERIFICATION and contains a single rectangle labeled /verify/hash page Offline cache to DB query with QR scanner jsQR plus BarcodeDetector. An arrow points from this rectangle to the PostgreSQL rectangle in the Supabase tier. An arrow also points from the SvelteKit Web App rectangle down to the /verify/hash page.

Arrows show data flow from SvelteKit Web App to POST /api/convert, POST /api/storage/upload, /verify/hash page, PostgreSQL, and Auth Service. POST /api/convert arrows connect to LibreOffice headless and Google Apps Script. POST /api/storage/upload arrow connects to Backblaze B2. The verification page arrow connects to PostgreSQL.

---END OF DOCUMENT---
