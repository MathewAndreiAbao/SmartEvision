# PATENT SEARCH REPORT

## Invention Title 1:
**"System and Method for Self-Verifying Document Archival with Content-Invariant Cryptographic Stamping"**

| Field | Detail |
|---|---|
| **Search Report Date** | 2026-08-02 |
| **Prepared For** | Smart E-VISION (CEDIMS) project |
| **Technical Field** | Document management; cryptographic document verification; content-addressable archival |
| **IPC Classifications (proposed)** | G06F 21/64 (data integrity), G06F 16/23 (database update), G06Q 10/10 (admin mgmt), G06F 16/174 (deduplication), H04L 9/32 (digital signatures) |
| **CPC Classifications (proposed)** | G06F 21/645, G06F 16/1744, G06F 21/64, H04L 2209/38 |

---

## 1. ABSTRACT OF THE INVENTION

A method and system for archiving documents with an embedded, **content-invariant**
cryptographic self-verification code. A document is converted to a canonical representation
(PDF). A cryptographic fingerprint (SHA-256) is computed over the **original, pre-compression**
canonical bytes, then the bytes are compressed for storage. A machine-readable code (QR)
encoding the fingerprint (and a verification locator containing the fingerprint) is generated and
embedded onto the archived document artifact. The fingerprint is deliberately computed **before**
compression so that it is invariant to re-encoding; a single fingerprint therefore serves as (a)
the archive deduplication key, (b) the offline verification lookup key, and (c) the printed-copy
authentication token. Stamped artifacts are stored in an object store (Backblaze B2) via a
server-side proxy, with the fingerprint recorded in a central registry (Supabase). Verification is
performed offline-first against a pre-distributed {fingerprint → metadata} cache, falling back to a
live registry query when connectivity exists.

---

## 2. KEYWORDS / SEARCH TERMS (for databases: Google Patents, Espacenet, USPTO, WIPO, JPO, KIPO, Patentscope)

**Primary:** "content-invariant hash", "hash before compression", "fingerprint document QR",
"self-verifying document", "embedded verification QR PDF", "document deduplication hash",
"QR code SHA-256 document", "offline document verification cache"

**Secondary:** "printed document authentication", "QR stamped PDF", "digital fingerprint document
archival", "content addressable storage document", "hash original bytes compression",
"pre-compression fingerprint", "document registry hash lookup", "offline QR verify"

**Boolean queries used (recommended):**
- `("hash" AND "before compression" AND "document")`
- `("QR" AND "SHA-256" AND "document" AND "verify")`
- `("content-based deduplication" AND "document" AND "fingerprint")`
- `("offline" AND "document verification" AND "cache" AND "fingerprint")`

---

## 3. EXTRACTION OF FUNCTIONS, FEATURES, WORDING, AND DETAILS (from implementation)

### 3.1 Core pipeline function: `runPipelineCore` — `src/lib/utils/pipeline.ts`

| Order | Phase | Message wording (as shown to user) | Function / action |
|---|---|---|---|
| 1 | `transcoding` | "Converting to PDF..." | Convert DOC/DOCX/JPG/PNG to canonical PDF (`transcodeToPdf`) |
| 2 | `compressing` | "Optimizing for mobile..." | Adaptive compression decision based on connection type + file size |
| 3 | `analyzing` | "Analyzing document content..." | OCR/metadata extraction on converted PDF bytes |
| 4 | `compressing` | "Compressing and hashing..." | **Worker task `COMPRESS_AND_HASH`** |
| 5 | `stamping` | "Embedding verification stamp..." | **Worker task `STAMP_QR`** |
| 6 | `uploading` | "Processing complete, ready to archive." | Returns `stampedBytes`, `fileHash`, `filePath` |

### 3.2 THE KEY NOVELTY — `COMPRESS_AND_HASH` worker — `src/lib/utils/pdf.worker.ts:67-87`

```ts
if (type === 'COMPRESS_AND_HASH') {
    const { pdfBytes } = payload;
    // 1. Compress
    const compressedBytes = await compressPdf(pdfBytes);
    // 2. Hash ORIGINAL bytes (prevents compression metadata changes
    //    from creating unique hashes for renamed duplicates)
    const fileHash = await hashPdf(pdfBytes);   // <-- hashes pdfBytes, NOT compressedBytes
    ...
}
```

**Exact code comment (evidence wording):**
> "Hash ORIGINAL bytes (prevents compression metadata changes from creating unique hashes for renamed duplicates)"

**Two-step ordering:**
1. `compressPdf(pdfBytes)` — pdf-lib re-encode (`useObjectStreams: true, compress: true`)
2. `hashPdf(pdfBytes)` — Web Crypto `crypto.subtle.digest('SHA-256', input)` on the **original** buffer

**Significance:** the fingerprint is invariant to the compression step. A re-encoded or renamed
copy of identical content produces the same hash → duplicate detection works at content level.

### 3.3 `hashPdf` worker implementation — `pdf.worker.ts:12-22`

- `crypto.subtle.digest('SHA-256', input.buffer)` executed inside a **Web Worker**
- Hex-encoded 64-character digest produced on the **original ArrayBuffer**
- Purpose comment: "Offloads pdf-lib and Web Crypto API from the main UI thread"

### 3.4 Stamping — `STAMP_QR` worker — `pdf.worker.ts:88-101`

- Loads stamped PDF via `PDFDocument.load(compressedBytes)`
- `embedPng(qrBytes)` embeds QR image onto the **last page** (`getPage(pageCount - 1)`)
- QR size = `72` points (~1 inch), margin = `30`; positioned bottom-right
- Returns `stampedBytes` transferred back to main thread

### 3.5 QR generation — `generateQrPng` — `src/lib/utils/qr-stamp.ts:11-27`

| Detail | Value |
|---|---|
| Library | `qrcode` (lazy-loaded) |
| Payload | `` `${baseUrl}/verify/${fileHash}` `` |
| Base URL source | `config.APP_URL` (PUBLIC_APP_URL → window.location.origin → default) |
| QR config | `width: 100`, `margin: 1`, dark `#000000`, light `#FFFFFF` |
| Return | `Uint8Array` of PNG |

### 3.6 Main-thread hashing for early duplicate detection — upload page `+page.svelte:608-620`

```ts
const buffer = await file.arrayBuffer();
const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
const hashArray = Array.from(new Uint8Array(hashBuffer));
fileHash = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
```

- Early hash computed on the **raw uploaded file** for pre-upload duplicate checking
- Comment: `"Early hash calculation for Early Duplicate Detection"`
- Checked against local ledger (`hasHash`) and server (`file_hash` query) **before** upload

### 3.7 Registry storage — central record

Inserted into `submissions` table (`pipeline.ts:238-256`):
- `file_hash` (content-invariant fingerprint)
- `file_name`, `file_path` (e.g., `submissions/{userId}/{docType}/{timestamp}_{fileName}.pdf`)
- `file_size`, `doc_type`, `week_number`, `school_year`, `subject`, `compliance_status`, `raw_text`

### 3.8 Server-proxy upload (B2) — `src/routes/api/storage/upload/+server.ts`

- Auth: `Authorization: Bearer <access_token>` → `supabase.auth.getUser(token)`
- Accepts FormData: `file` (PDF Blob) + `key` (filePath)
- Puts to Backblaze B2 via AWS S3 client (`PutObjectCommand`)
- 4.2MB size limit (Vercel serverless constraint)

### 3.9 Verification flow — `src/routes/verify/[hash]/+page.svelte`

| Step | Action | Wording shown to user |
|---|---|---|
| 1 | `lookupOfflineDoc(hash)` — local IndexedDB cache | "Offline Mode Verification" badge |
| 2 | Live query `submissions` by `file_hash`, `.maybeSingle()` | "Authenticating Hash..." |
| 3 | Success | "Verified" / "Official CEDIMS Record" |
| 4 | No match | "Invalid Document" / "The scanned hash does not match any official record in our secure registry." |
| 5 | Display | "Registry Hash (SHA-256)" + full 64-char hash |
| 6 | Access control | Role/school-scoped view permission ("Access Restricted — {school} personnel only") |

### 3.10 QR scanning — `src/lib/components/QRScanner.svelte`

- Native `BarcodeDetector` (high-perf) with **jsQR fallback** (reliability)
- Extracts hash from scanned payload: `data.match(/\/verify\/([a-f0-9]{64})/i)` → `goto('/verify/' + hash)`
- Camera: `facingMode: "environment"`, frame-skip every 3rd frame (CPU optimization)
- Overlay wording: "Scan QR Code" / "Position the document's QR code within the frame"

### 3.11 Preload of verification cache — `preloadVerificationHashes` — `src/lib/utils/offline.ts:201-256`

- Fetches submissions (`.not('file_hash', 'like', 'missing_%')`) scoped to current user, limit 200
- Builds `{fingerprint → metadata}` records (file_name, doc_type, compliance_status, created_at,
  file_size, week_number, subject, school_year, teacher_name, school_name, subject/grade)
- Stores each via `cacheVerifiedDoc(hash, metadata)` in IndexedDB
- Called on login and periodically (`dashboard/+layout.svelte:39`)

### 3.12 UI wording extracted (user-facing "fingerprint" language)

| Location | Exact wording |
|---|---|
| Upload success toast | `"Archived successfully! Hash: {fileHash.slice(0,12)}..."` |
| Offline saved toast | `"Saved offline! Will sync when connected. Hash: {fileHash.slice(0,12)}..."` |
| Security panel | `"Your documents are secured with SHA-256 digital fingerprinting."` |
| Anti-tampering | `"Any change to the file content will alter its hash, making it invalid."` |
| Result card | `"SHA-256:"` + full hash value |

### 3.13 Pipeline type definitions — `src/lib/types/pipeline.ts`

- Phases: `'transcoding' | 'compressing' | 'analyzing' | 'hashing' | 'stamping' | 'uploading' | 'done' | 'error'`
- `PipelineResult`: `{ fileHash, filePath, fileSize, fileName }`

### 3.14 Client-side generic hashing utility — `src/lib/utils/hash.ts`

- `computeHash(file)` / `hashFromBuffer(buffer)` — SHA-256 via Web Crypto
- Hex conversion optimized (no large intermediate arrays)
- Error wording: `"Security Error: Cryptographic hashing requires a secure context (HTTPS)."`

---

## 4. PRIOR ART SEARCH RESULTS (candidate references to be verified)

> **NOTE:** Requires verification in patent databases. Placeholders pending attorney-conducted search.

### Category A — Content-based deduplication / CAS (HIGH relevance)

| Ref | Title | Relevance | Distinction over invention |
|---|---|---|---|
| A1 | Content-addressable storage systems (CAS) — e.g., EMC, Venti | Hash of content as storage key | CAS hashes **stored** bytes; invention hashes **pre-compression** bytes and embeds the hash in the document |
| A2 | Deduplication before/after compression patents (e.g., NetApp, Dell/EMC dedupe) | Hash ordering vs compression | Many dedupe systems hash chunks pre- or post- compression; invention applies this to **user documents + self-verifying stamp**, not storage blocks |

### Category B — Document QR/watermark verification (HIGH relevance)

| Ref | Title | Relevance | Distinction over invention |
|---|---|---|---|
| B1 | QR-code-stamped certificates/diplomas (common in credential verification) | QR embedding on documents | Typically link-only (server round-trip), not content-invariant fingerprint + offline cache |
| B2 | Digital watermarking / steganography for document authentication | Hidden integrity markers | Invention uses overt QR encoding a cryptographic hash, not watermarking |

### Category C — Offline verification / caching (MEDIUM relevance)

| Ref | Title | Relevance | Distinction over invention |
|---|---|---|---|
| C1 | Offline-first sync frameworks (PouchDB/CouchDB, SQLite sync) | Local queue + sync | Do not embed verification codes or verify printed copies offline |
| C2 | Ticket/QR offline validation systems | Offline QR validation | Validate against pre-loaded ticket data; invention validates arbitrary archived documents |

### Category D — Document registry / compliance systems (MEDIUM relevance)

| Ref | Title | Relevance | Distinction over invention |
|---|---|---|---|
| D1 | Government document management / e-filing systems | Central document registry | Business-logic focus; no content-invariant self-verifying stamp |

---

## 5. NOVELTY / INVENTIVE-STEP ANALYSIS

### 5.1 What appears novel (candidate claim elements)

1. **Hash-before-compression ordering** for *user-facing archived documents*, with the hash then
   **embedded into the artifact itself** as a machine-readable code (not merely used as a storage key).
2. **Single content-invariant fingerprint serving three roles**: dedup key + offline cache lookup key +
   printed-copy authentication token.
3. **Offline verification of printed documents** by scanning the embedded code against a
   pre-distributed {fingerprint → metadata} cache (no server, no original digital bytes needed).
4. **Pre-sync re-validation** combining metadata-slot check AND content-fingerprint check before each
   queued upload (multi-device race resolution).

### 5.2 Prior-art risk areas (weakness to disclose)

- Individual elements (QR stamping, SHA-256, IndexedDB cache, dedup) are each known → risk of
  **obviousness rejection** under 35 U.S.C. § 103 if the combination is seen as obvious.
- **Alice risk**: compliance/status business logic must be de-emphasized; claims must be tied to the
  concrete technical mechanism (hash ordering + embedded stamp + offline cache).

### 5.3 Most differentiating feature (lead independent claim)

> The **content-invariant fingerprinting step**: computing the cryptographic fingerprint of the
> document **prior to compression**, and embedding that fingerprint in the document artifact, such
> that the embedded verification code remains valid and deduplicatable regardless of compression or
> re-encoding of the stored copy.

---

## 6. SEARCH STRATEGY / DATABASES

| Database | Query | Priority |
|---|---|---|
| Google Patents | `("hash" AND "compression" AND "document" AND "verify")` | HIGH |
| Espacenet | `G06F21/64 AND (hash OR fingerprint) AND QR` | HIGH |
| USPTO (PatFT/AppFT) | `((fingerprint OR hash) NEAR compression) AND document AND QR` | HIGH |
| WIPO Patentscope | `content-invariant fingerprint document` | HIGH |
| JPO/KIPO | `文書 ハッシュ QR 圧縮 検証` | MEDIUM |

---

## 7. CONCLUSION & RECOMMENDATION

**Novelty outlook: FAVORABLE but requires formal search.** The content-invariant fingerprint
ordering combined with embedding the fingerprint into the document and an offline distributed
verification cache forms a coherent technical solution not found in any single known reference.
The highest-risk area is obviousness (combination of known parts); the strongest defense is the
cooperative effect in Section 5.3.

**Recommended next step:** File a provisional application (or at minimum complete the § 4 formal
search) before public disclosure/defense. Do **not** publicly demonstrate the hash-ordering + stamp
+ offline-verify combination prior to filing, or the filing will be barred by prior disclosure
(35 U.S.C. § 102).

---

## 8. APPENDIX — REFERENCE IMPLEMENTATION FILES

| File | Role |
|---|---|
| `src/lib/utils/pdf.worker.ts` | `COMPRESS_AND_HASH` + `STAMP_QR` worker (core novelty) |
| `src/lib/utils/qr-stamp.ts` | QR PNG generation + stamp function |
| `src/lib/utils/pipeline.ts` | Pipeline orchestration (phase order) |
| `src/lib/utils/hash.ts` | SHA-256 hash utilities |
| `src/lib/utils/offline.ts` | Offline verification cache (`preloadVerificationHashes`, `cacheVerifiedDoc`, `lookupOfflineDoc`) |
| `src/routes/verify/[hash]/+page.svelte` | Verification page (offline-first) |
| `src/lib/components/QRScanner.svelte` | QR scanning (BarcodeDetector + jsQR) |
| `src/routes/api/storage/upload/+server.ts` | Server-proxy upload to B2 |
| `src/lib/types/pipeline.ts` | Pipeline type definitions |
