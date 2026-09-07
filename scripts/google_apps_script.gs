/**
 * CEDIMS — Google Apps Script DOCX → PDF Converter
 *
 * Deploy as a Web App:
 *   1. Open script.google.com → New Project → paste this code
 *   2. No extra APIs needed — uses only built-in DriveApp (always available)
 *   3. Deploy → New Deployment → Web App
 *      - Execute as: Me
 *      - Who has access: Anyone
 *   4. Copy the deployment URL → set as PUBLIC_GOOGLE_SCRIPT_URL in .env
 *
 * How it works:
 *   - Receives base64-encoded DOCX from the SvelteKit server
 *   - Saves DOCX temporarily to the script owner's Google Drive
 *   - Google Drive converts it to a Google Doc (native format)
 *   - Exports the Google Doc as PDF bytes
 *   - Deletes the temporary Drive file immediately
 *   - Returns PDF as base64 JSON response
 *
 * Quotas (free Google account — well within limits for 200 conversions/day):
 *   - DriveApp operations: 2,000 file creates/day (using 200)
 *   - Script runtime: 6 min max/execution (each conversion: ~5–30s)
 *   - Total daily quota: ~1 hr of runtime (200 × 10s avg = ~33 min used)
 */

function doPost(e) {
  try {
    var payload = JSON.parse(e.postData.contents);
    var fileName = payload.fileName;
    var base64Data = payload.base64Data;

    if (!fileName || !base64Data) {
      return buildResponse({ success: false, error: 'Missing fileName or base64Data' });
    }

    var ext = fileName.split('.').pop().toLowerCase();
    if (ext !== 'doc' && ext !== 'docx') {
      return buildResponse({ success: false, error: 'Only .doc and .docx files are supported' });
    }

    // 1. Decode base64 DOCX → Blob
    var decoded = Utilities.base64Decode(base64Data);
    var mimeType = ext === 'docx'
      ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      : 'application/msword';
    var blob = Utilities.newBlob(decoded, mimeType, fileName);

    // 2. Upload DOCX to Drive and immediately convert to Google Doc format.
    //    Drive.Files.insert with convert:true is the only reliable free method.
    //    Requires: GAS editor → Services (+) → Drive API → Add (one-time setup).
    var driveFile = Drive.Files.insert(
      { title: fileName, mimeType: 'application/vnd.google-apps.document' },
      blob,
      { convert: true }
    );

    // 3. Export the Google Doc as PDF
    var pdfBlob = DriveApp.getFileById(driveFile.id).getAs('application/pdf');
    var pdfBase64 = Utilities.base64Encode(pdfBlob.getBytes());

    // 4. Trash the temporary Google Doc immediately — nothing stays in Drive
    DriveApp.getFileById(driveFile.id).setTrashed(true);

    return buildResponse({ success: true, pdfBase64: pdfBase64 });

  } catch (err) {
    return buildResponse({ success: false, error: err.toString() });
  }
}

function doGet(e) {
  return buildResponse({ status: 'ok', service: 'CEDIMS Converter', version: '1.0' });
}

function buildResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
