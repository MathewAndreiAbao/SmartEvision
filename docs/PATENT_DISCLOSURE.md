# Technical Disclosure

## System and Method for Offline-First, Self-Verifying Document Archival and Synchronization

**Non-legal technical disclosure.** For review by a registered patent attorney before any filing.
No patent claim is made here; this document describes the technical mechanisms of the invention
for the purpose of prior-art searching and claim drafting.

---

## 1. Field of the Invention

The disclosure relates generally to digital document management, and more specifically to
systems and methods for:

- archiving documents with cryptographic self-verification embedded within the document itself,
- verifying the authenticity of such documents (including **printed copies**) with **zero server
  round-trips** and **zero network connectivity**, using a distributed offline verification cache, and
- synchronizing offline-queued uploads to a central registry while preventing duplicates that arise
  from multi-device races and compression metadata variation.

The invention is particularly suited to low-bandwidth, intermittent-connectivity environments such
as school districts in remote areas, but is not limited to such environments.

---

## 2. Background of the Invention

### 2.1 Problem 1 — Verification of physical/printed documents

In conventional digital document verification systems, authenticity is established by querying a
central server (database lookup) using a hash or identifier. This fails in two important scenarios:

1. **Offline verification** — When the verifying party has no network access, no server lookup is
   possible and verification fails outright.
2. **Printed document verification** — When the document has been printed and physically exchanged,
   the verifying party cannot compute a hash of the original digital bytes, and a QR code on the
   paper merely encodes a *link* that still requires a server round-trip to resolve.

There is a need for a document that can be verified **offline** and **when printed**, using only
local data pre-distributed to the verifying device.

### 2.2 Problem 2 — Offline upload with multi-device conflict

In offline-first archival systems, a client queues uploads locally when offline and transmits them
when connectivity returns. A known failure mode is the **multi-device race**: a teacher uploads the
same document from Device A while it is offline, and later re-uploads it from Device B. Without
careful handling, either:

- the system stores two near-identical records (duplicate content), or
- the system rejects the second device's upload incorrectly, or
- the same "slot" (load + week + document type) gets double-submitted.

### 2.3 Problem 3 — Compression metadata evades content deduplication

When a document is compressed or re-encoded before hashing, the resulting bytes differ from the
original. Systems that hash the *stored/compressed* representation can be fooled: a teacher could
rename or trivially re-encode a file and produce a different hash, defeating content-level
duplicate detection even though the underlying content is identical.

---

## 3. Summary of the Invention

The invention is a computer-implemented method and system for offline-first, self-verifying
document archival. It combines three cooperating mechanisms:

1. **Self-verifying document stamping.** A cryptographic fingerprint of the document's *original*
   (pre-compression) content is computed and encoded into a machine-readable code (e.g., QR) that is
   embedded into the archived document itself, making the document self-describing and verifiable
   even when printed.

2. **Distributed offline verification cache.** A registry of {fingerprint → authoritative metadata}
   pairs is pre-distributed to (and periodically refreshed on) verifying client devices, so that a
   document bearing a fingerprint can be authenticated locally — offline — without contacting the
   central server, and without needing the original digital bytes (the fingerprint itself is the
   key, so printed copies remain verifiable).

3. **Pre-sync integrity re-validation.** Before each queued offline upload is transmitted to the
   central registry, the sync engine re-validates (a) the target metadata slot and (b) the content
   fingerprint against the server state, so that multi-device races and already-archived content are
   detected and resolved deterministically at sync time rather than at upload time.

### 3.1 Technical effects (non-obvious, cooperative)

- The three mechanisms interact: the *original-content hash* from mechanism 1 is the *same
  fingerprint* used as the dedup key in mechanism 3 and as the lookup key in mechanism 2. One
  fingerprint serves authentication, offline verification, and synchronization integrity.
- Because the fingerprint is derived from **pre-compression bytes**, the stamped document remains
  deduplicatable against other instances of the same content even after compression alters the
  stored representation (Problem 3 solved), and the fingerprint embedded in the QR is stable across
  compressions (mechanisms 1 and 2 remain consistent).
- Verification of printed documents is possible because the QR encodes a fingerprint, not a network
  link that requires server access (Problem 1 solved).

---

## 4. Detailed Description

### 4.1 System architecture (overview)

- **Client application** (browser/mobile web app) — performs document intake, fingerprinting,
  stamping, offline queueing, local verification, and offline verification cache maintenance.
- **Central registry** — an authoritative database of submissions keyed by fingerprint, plus an
  object store for archived file bytes.
- **Server-side upload proxy** — a same-origin endpoint that relays the archived bytes to the object
  store, bypassing client-side CORS restrictions.
- **Pre-distributed cache** — client-local (IndexedDB) store of {fingerprint → metadata} records.

### 4.2 Mechanism 1 — Self-verifying document stamping (client-side pipeline)

The intake pipeline performs, in order:

1. **Transcoding.** The input document is converted to a canonical representation (PDF) if it is not
   already in that form.
2. **Compression decision.** A client-side determination is made whether to compress the canonical
   representation, influenced by detected device conditions (e.g., effective connection type, data
   saver mode, file size). Small files on constrained connections may skip non-essential
   compression.
3. **Fingerprinting of ORIGINAL bytes.** A cryptographic hash (e.g., SHA-256) is computed over the
   **pre-compression canonical bytes** — the bytes as they exist immediately after transcoding and
   before any lossy/lossless re-encoding. This is the stable content fingerprint.
4. **Compression.** The canonical bytes are compressed for storage economy.
5. **Stamp generation.** A machine-readable code (QR) is generated encoding a verification payload
   that includes the fingerprint (and, in one embodiment, a verification URL embedding the
   fingerprint).
6. **Embedding.** The generated code is rendered onto the document image (e.g., drawn onto a page of
   the PDF) to produce the **stamped archive artifact**.

Notably, the fingerprint (step 3) is computed **before** compression (step 4), so that the
fingerprint is invariant to the compression step. This is a deliberate ordering distinct from
naive pipelines that hash the final stored artifact.

### 4.3 Mechanism 2 — Distributed offline verification cache

- **Population.** Authoritative {fingerprint → metadata} records are fetched from the central
  registry (in one embodiment, restricted to records relevant to the current user, and to records
  whose fingerprint does not correspond to placeholder/“missing” markers) and stored in the client's
  local persistent store (IndexedDB), with persistent-storage requested to prevent eviction.
- **Refreshing.** The cache is refreshed periodically and on reconnection, but the key property is
  that **verification does not require a live connection**.
- **Verification flow (offline).** A verifying party obtains a document (digital or printed). The
  fingerprint is extracted from the stamped code (e.g., by scanning the QR, or by reading the URL
  segment). The client first queries its local cache:
  - If a matching {fingerprint → metadata} record exists, the document is **verified offline** and
    the authoritative metadata (e.g., document type, week, teacher, school, status) is displayed
    from the cached record.
  - If no local record exists **and** connectivity is available, the client falls back to a live
    server query and, on success, refreshes the local cache.
  - If no local record exists **and** the device is offline, verification reports "unknown / not
    found."
- **Printed verification.** Because verification is keyed by the fingerprint embedded in the printed
  code (not by a network-resolvable link alone), a printed document can be verified against the
  local cache with no server contact and no need to hash the physical object.

### 4.4 Mechanism 3 — Pre-sync integrity re-validation

When the client is offline, completed stamping pipeline outputs (the stamped archive artifact plus
its metadata, including the fingerprint) are **enqueued** to a local persistent queue.

Upon reconnection (and on heartbeat/visibility/focus triggers), the sync engine processes the queue
and, **for each queued item, before transmission**, performs:

1. **Metadata-slot re-validation.** A query is issued to the central registry to determine whether
   the target slot (teaching load + week + school year + document type) is already occupied. If so,
   the queued item is deterministically classified as "already archived," removed from the queue,
   and the local ledger is marked as synchronized — preventing double submission from the multi-device
   race (Problem 2).
2. **Content-fingerprint re-validation.** A query is issued to the central registry for any record
   with the same fingerprint. If found, the queued item is classified as a duplicate, removed from
   the queue, and the local ledger is marked synchronized — preventing content duplication from
   multi-device races and from compression metadata variation (because the fingerprint is
   content-invariant per Mechanism 1).
3. **Transmission.** Only if both re-validations pass is the artifact transmitted (via the server
   proxy) and the registry record inserted. The compliance status is computed at sync time from the
   current time versus the calendar deadline, then the ledger entry is marked synchronized and the
   fingerprint is added to the local verification cache (tying mechanism 3 back to mechanism 2).

The sync engine also checks connectivity per-item and pauses without data loss if connectivity is
lost mid-queue.

### 4.5 Worked example (multi-device race resolution)

Teacher T uploads document D (content X) from Device A while offline → queued locally on A.
Teacher T later uploads a re-encoded instance of the same content X from Device B while offline →
queued locally on B. On reconnection:

- Device A syncs first. Its metadata-slot check passes (slot empty); its fingerprint check passes
  (no record with fingerprint(X)); it transmits and inserts the record.
- Device B syncs. Its metadata-slot check now finds the slot occupied; its fingerprint check finds
  record fingerprint(X). Both guards fire. The queued item is classified "already archived" and is
  not transmitted. The registry contains exactly one record for content X. No duplicate is created.

---

## 5. Claims Outline (informal — for attorney review)

> Draft claim structure only. Not legal claims.

**Claim 1 (system/method, self-verifying stamp):** A method for archiving a document with embedded
self-verification, comprising: converting the document to a canonical representation; computing a
cryptographic fingerprint of the canonical representation **prior to compression**; compressing the
canonical representation to a stored representation; generating a machine-readable code encoding the
fingerprint; embedding the code into the document; and storing the stored representation and the
fingerprint in a registry.

**Claim 2 (distributed offline verification):** The method of claim 1, further comprising
distributing a plurality of {fingerprint → metadata} records to a client device; and, upon obtaining
a candidate document, extracting a candidate fingerprint from a machine-readable code of the
candidate document and verifying the candidate document against said records **without a network
connection**.

**Claim 3 (pre-sync re-validation):** The method of claim 1, further comprising: queueing the stored
representation locally while offline; upon reconnection, before transmitting a queued item, (a)
querying the registry for a record matching a target metadata slot and (b) querying the registry for
a record matching the fingerprint; and suppressing transmission when (a) or (b) matches.

**Dependent/independent variations to consider with counsel:** verification of printed documents;
refresh scheduling of the cache; per-item connectivity re-check; placeholder/missing-record
exclusion from the cache; server-proxy transmission; persistent-storage request.

---

## 6. Implementation Notes (as actually built)

Reference implementation locations (within the source project "SmartEvision"):

| Mechanism | Module | Key routine |
|---|---|---|
| 1 — Fingerprint-before-compression | `src/lib/utils/pdf.worker.ts` | `COMPRESS_AND_HASH`: `compressPdf(bytes)` then `hashPdf(bytes)` on original |
| 1 — Stamping | `src/lib/utils/qr-stamp.ts`, `src/lib/utils/pdf.worker.ts` | `STAMP_QR` embedding QR of `verify/<hash>` |
| 1 — Pipeline order | `src/lib/utils/pipeline.ts` | `runPipelineCore` |
| 2 — Cache population | `src/lib/utils/offline.ts` | `preloadVerificationHashes`, `cacheVerifiedDoc`, `requestPersistentStorage` |
| 2 — Offline verify | `src/routes/verify/[hash]/+page.svelte` | `lookupOfflineDoc` before live query |
| 3 — Queue + re-validation | `src/lib/utils/offline.ts` | `enqueue`, `processQueue` (metadata slot + fingerprint re-checks) |
| 3 — Sync triggers | `src/lib/utils/offline.ts` | `initOfflineSync` (online/focus/visibility/heartbeat) |

Dependencies used (all standard/public libraries): `pdf-lib`, `qrcode`, `tesseract.js`,
`idb-keyval`, Web Crypto API (`crypto.subtle`). The novelty claimed is the *system and method*, not
the libraries.

---

## 7. Prior Art Considerations (candor checklist for counsel)

The following areas should be searched by a patent attorney:

- Offline-first sync with conflict detection (e.g., Google Drive offline, CouchDB/PouchDB sync).
- Document watermarking / QR stamping for anti-forgery (ticketing, diplomas, land-title
  verification systems).
- Content-based deduplication (CAS — content-addressable storage).
- "Hash original vs. stored representation" — any system that deliberately hashes pre-transform
  bytes.
- Compliance/deadline-based document status systems (business-method risk under *Alice*).

Known weaknesses to address with counsel:

- Offline-first sync per se is well known; the *dual re-validation* and *content-invariant
  fingerprint ordering* are the distinguishing features.
- Business-logic aspects (compliance classification, calendar deadlines) should be de-emphasized in
  claims and treated as environment, not the invention.
- Standard libraries must be framed as implementation detail, not invention.

---

## 8. Recommendation

File a **single** utility application (provisional preferred) covering the combined system:
offline-first archival + self-verifying stamping + distributed offline verification + pre-sync
re-validation, with claims drafted around the three mechanisms in Section 5 and the cooperative
effects in Section 3.1. Conduct the Section 7 prior-art search first.
