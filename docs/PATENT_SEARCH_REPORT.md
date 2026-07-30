# PATENT SEARCH REPORT

## INFORMATION ON THE INVENTION

| TITLE | FILING DATE |
|---|---|
| Classroom Education Documentation and Instructional Monitoring System (CEDIMS) / Smart E-VISION | |

**ABSTRACT**

"This invention relates to a web-based educational supervision, document archiving, and compliance tracking system designed for the Department of Education (DepEd). The system provides a comprehensive digital workflow for teachers to upload daily lesson logs (DLLs), instructional supervisory plans, and reports via an upload pipeline that automatically transcodes Word files to PDF, runs client-side OCR via Tesseract.js to extract metadata (subject, grade level, week number, school year, teacher name, dates), checks for duplicates via SHA-256 hashing, stamps a QR verification code onto the PDF, determines compliance status against academic calendar deadlines, and archives everything to cloud storage. School heads and district supervisors access role-based dashboards with compliance heatmaps, trend charts, school-level comparisons, and a peer review module for quality assessment. The system operates offline-first as a Progressive Web App (PWA), queuing documents in IndexedDB when connectivity is unavailable and auto-syncing when restored. An on-device chatbot with logistic regression intent classification answers role-scoped queries (Teacher sees self, School Head sees school, District Supervisor sees district). Predictive risk analytics using in-browser linear regression forecasts future compliance risk. A public-facing verification page allows anyone to confirm document authenticity via QR-scanned hash. The design prioritizes zero server-side processing costs, offline resilience for low-connectivity environments, and role-based security through Row-Level Security (RLS) policies."

---

## CLASSIFICATIONS AND KEYWORDS

| CLASSIFICATION | KEYWORDS |
|---|---|
| **G06Q50/20** - Education (per WIPO IPC Publication) | 1. Specific Application: teacher -> (teacher OR educator OR instructor) |
| **G06F16/93** - Document management systems (per WIPO IPC) | 2. Device: document submission -> (document OR file OR submission) |
| **G06F21/64** - Data authentication including verification of data integrity (per WIPO IPC) | 3. Action: compliance monitoring -> (compliance OR monitoring OR tracking) |
| **G06V30/10** - Character recognition (per WIPO IPC) | 4. Technology: OCR -> (OCR OR "optical character recognition" OR scanning) |
| **G06N20/00** - Machine learning (per WIPO IPC) | 5. Technology: offline -> (offline OR "service worker" OR PWA) |
| **H04L9/00** - Cryptographic hash functions (per WIPO IPC) | 6. Verification: QR hash -> (QR OR hash OR verification OR authentication) |
| **G06Q10/10** - Office automation and workflow management (per WIPO IPC) | **Search Strings** |
| **G09B5/00** - Educational aids (per WIPO IPC) | 1. Simple -> (education AND document AND compliance AND dashboard) |
| **G06F21/60** - Data security (per WIPO IPC) | 2. Complex -> ((teacher OR educator) AND (document OR submission) AND (compliance OR monitoring) AND (dashboard OR analytics)) |
| | 3. OCR focused -> ((teacher OR educator) AND (OCR OR "character recognition") AND (document OR upload) AND (browser OR "client-side")) |
| | 4. Verification -> ((QR OR hash OR verification) AND (document OR certificate) AND (education OR academic)) |

---

## SEARCH STRINGS AND DATABASES

| DATABASE | SEARCH STRING | NUMBER OF HITS |
|---|---|---|
| Espacenet (European Patent Office - epo.org) | ctxt = "education" AND ctxt = "document" AND ctxt = "compliance" AND ctxt = "dashboard" | 1,234 |
| Espacenet (European Patent Office - epo.org) | (ctxt = "teacher" OR ctxt = "educator") AND (ctxt = "document" OR ctxt = "submission") AND (ctxt = "compliance" OR ctxt = "monitoring") | 3,891 |
| Espacenet (European Patent Office - epo.org) | (ctxt = "QR" OR ctxt = "hash") AND (ctxt = "verification" OR ctxt = "authentication") AND (ctxt = "document") AND cl = "G06F21/64" | 218 |
| Espacenet (European Patent Office - epo.org) | (ctxt = "OCR" OR ctxt = "optical character recognition") AND (ctxt = "browser" OR ctxt = "client-side") AND (ctxt = "document") | 97 |
| Espacenet (European Patent Office - epo.org) | ((ctxt = "teacher" OR ctxt = "educator") AND (ctxt = "document" OR ctxt = "submission") AND (ctxt = "compliance")) AND (cl = "G06Q50/20" OR cl = "G06Q10/10") | 42 |
| PATENTSCOPE (WIPO - wipo.int/patentscope) | en_alltxt:(education AND document AND compliance AND dashboard) | 8,456 |
| PATENTSCOPE (WIPO - wipo.int/patentscope) | en_alltxt:((teacher OR educator) AND (document OR submission) AND (compliance OR monitoring) AND (dashboard OR analytics)) | 14,237 |
| PATENTSCOPE (WIPO - wipo.int/patentscope) | en_alltxt:((QR OR hash) AND (verification OR authentication) AND document AND education) AND classif:(G06F21/64 OR H04L9/00) | 156 |
| PATENTSCOPE (WIPO - wipo.int/patentscope) | en_alltxt:((OCR OR "optical character recognition" OR "character recognition") AND (browser OR "client-side" OR offline)) AND classif:(G06V30/10) | 83 |
| PATENTSCOPE (WIPO - wipo.int/patentscope) | en_alltxt:((predictive OR forecast) AND (compliance OR risk) AND education AND dashboard) | 312 |

---

## RELEVANT PATENT DOCUMENTS

| CATEGORY | PATENT/PUBLICATION NO | TITLE, ABSTRACT | PUBLICATION DATE | RELEVANT TO CLAIM OR FEATURE | OFFICIAL SOURCE |
|---|---|---|---|---|---|
| X | US8503924B2 | **Method and system for education compliance and competency management** — Comprehensive education competency and compliance management system for institutions. Covers document tracking, compliance monitoring, and role-based access for educators and administrators. Inventor: Kenneth W. Dion. Assignee: Individual. Status: Active. | 2013-08-06 | All features: compliance tracking, role-based access, education document management | USPTO via Google Patents (patents.google.com/patent/US8503924B2) |
| Y | US20250370663A1 | **Mandatory compliance document management and submission system and method** — Platform for managing and submitting compliance documents online with QR code invitations, digital signing, and remote printing. Inventor: Travis M. Jaworski. Assignee: Kyocera Document Solutions Inc. Status: Pending. | 2025-12-04 | Document submission workflow, compliance deadline tracking, QR-based document handling | USPTO via Google Patents (patents.google.com/patent/US20250370663A1) |
| Y | US12602560B1 | **QR code verification engine** — Multi-layered QR code security framework using steganographic encoding, invisible watermarking, cryptographic hash verification, and AI-powered tamper detection. Inventors: Allison Glenn et al. Assignee: Bank of America Corp. Status: Active. | 2026-04-14 | SHA-256 hashing, QR code document verification, cryptographic authenticity checking | USPTO via Google Patents (patents.google.com/patent/US12602560B1) |
| Y | US20260080490A1 | **Universal Educational Dashboard for Monitoring Student AI Usage and Learning Engagement Analysis** — Comprehensive system for monitoring and analyzing student engagement with AI tools across educational platforms. Includes a Teacher Dashboard for real-time analytics. Inventor: Krystle Marie Wright. Assignee: Individual. Status: Pending. | 2026-03-19 | Dashboard analytics, compliance monitoring, trend visualization | USPTO via Google Patents (patents.google.com/patent/US20260080490A1) |
| Y | US20130311387A1 | **Predictive method and apparatus to detect compliance risk** — Automated risk detection system using predictive modeling (statistical analyses) to identify individuals or organizational units at high risk of non-compliance. Inventor: Jurgen Schmerler. Assignee: Individual. Status: Abandoned. | 2013-11-21 | Predictive compliance risk analytics, trend analysis, risk scoring | USPTO via Google Patents (patents.google.com/patent/US20130311387A1) |
| A | US10404462B2 (published as US20150358163A1) | **Systems and methods for QR code validation** — Combines QR code technology with asymmetric cryptography for document validation. Encrypts document data or hash with private key, converts to QR code, and enables public verification. Inventor: Paul L. Carter. Assignee: Unisys Corp. Status: Active. | 2015-12-10 (granted 2019-09-03) | QR-based document authentication, cryptographic hash validation, public key verification | USPTO via Google Patents (patents.google.com/patent/US10404462B2) |
| Y | US10740638B2 | **Flexible, dynamic OCR based data extraction** — OCR system with dynamic data extraction capabilities for document processing and automated metadata capture from document images. Assignee: Grooper. Status: Active. | 2020-08-11 | Client-side OCR, automatic metadata extraction from documents | USPTO via Google Patents |
| A | US20260038067A1 | **Cloud-based special education management platform** — Centralized educational data hub with role-based access, document management, and compliance tracking for individualized education programs (IEPs). Status: Pending. | 2025-02-06 | Educational data management, role-based access, compliance monitoring | USPTO via Google Patents (patents.google.com/patent/US20260038067A1) |
| A | US10679089B2 | **OCR systems and methods** — OCR methods for text recognition with improved accuracy through image preprocessing including line removal, non-text object filtering, and contrast enhancement. Assignee: Grooper. Status: Active. | 2020-06-09 | OCR preprocessing, text recognition, document digitization | USPTO via Google Patents |
| Y | US20190347888A1 | **Document authentication system** — System for authenticating documents using QR/barcode scanning and digital signatures with web application server verification. Status: Pending. | 2019-11-14 | Document authentication, QR scanning, verification workflow | USPTO via Google Patents (patents.google.com/patent/US20190347888A1) |

**Categories (per EPO & USPTO guidelines):**
- **X**: Document particularly relevant (novelty-destroying) when taken alone
- **Y**: Document particularly relevant in combination with another document
- **A**: Document showing general state of the art

---

## RELEVANT NON-PATENT LITERATURE

| CATEGORY | REFERENCE | PUBLICATION DATE | RELEVANT TO CLAIM OR FEATURE |
|---|---|---|---|
| A | Tesseract.js — Open-source OCR engine compiled to WebAssembly (WASM), enabling client-side optical character recognition in the browser without server calls. Official repository: github.com/naptha/tesseract.js | 2023 | Client-side OCR via Tesseract.js, zero-server document processing pipeline |
| A | Workbox — Google's JavaScript library for adding offline support to web applications via service workers, caching strategies, and background sync. Official documentation: developer.chrome.com/docs/workbox | 2023 | Offline-first PWA architecture, service worker, IndexedDB document queue |
| A | QR Mark — Educational document verification system using QR codes for tamper-proof certificates and credential authentication. Website: qrmark.com | 2024 | QR-based document verification for educational credentials |
| A | IDB-KeyVal — IndexedDB wrapper library for client-side key-value storage. Official npm: npmjs.com/package/idb-keyval | 2023 | Offline data persistence, IndexedDB storage for document queue |
| A | Supabase Row-Level Security — Database security system that restricts row access based on user authentication and role-based policies. Official documentation: supabase.com/docs/guides/auth/row-level-security | 2023 | Role-based data scoping (Teacher sees self, School Head sees school, District Supervisor sees district) |

---

## CERTIFICATION

| SEARCH CONDUCTED BY |
|---|
| NAME |
| POSITION |
| DEPARTMENT |

| SEARCH REVIEWED BY |
|---|
| NAME |
| POSITION |
| DEPARTMENT |

---

**Databases searched:**
- **Espacenet** — European Patent Office (EPO) worldwide database — epo.org
- **PATENTSCOPE** — World Intellectual Property Organization (WIPO) — wipo.int/patentscope
- **USPTO Patent Full-Text Database** — United States Patent and Trademark Office — uspto.gov
