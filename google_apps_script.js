/**
 * GOOGLE APPS SCRIPT - DOCX TO PDF CONVERTER
 * 
 * INSTRUCTIONS:
 * 1. Go to https://script.google.com/
 * 2. Create a "New Project".
 * 3. CRITICAL STEP: On the left sidebar, click the "+" next to "Services".
 * 4. Select "Drive API" (leave default settings) and click "Add".
 * 5. Delete all code in the editor and PASTE this entire script.
 * 6. Click "Deploy" -> "New Deployment".
 * 7. Select type: "Web App".
 * 8. Description: "SmartEvision PDF Converter".
 * 9. Execute as: "Me".
 * 10. Who has access: "Anyone" (This is required so your app can call it).
 * 11. Click "Deploy".
 * 12. Copy the "Web App URL" and paste it into your .env file as PUBLIC_GOOGLE_SCRIPT_URL.
 * 
 * NOTE: If updating an existing deployment, click "Deploy" -> "Manage Deployments",
 * edit the existing one by selecting "New version", and click "Deploy".
 */

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var fileName = data.fileName;
    var base64Data = data.base64Data;
    
    // 1. Decode base64 as DOCX
    var blob = Utilities.newBlob(
      Utilities.base64Decode(base64Data), 
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 
      fileName
    );
    
    // 2. Convert to Google Doc (Required before exporting to PDF)
    // We try both v2 and v3 syntax in case the user has either version enabled
    var docFile;
    if (Drive.Files.insert) {
      // Drive API v2
      docFile = Drive.Files.insert({
        title: fileName,
        mimeType: 'application/vnd.google-apps.document'
      }, blob);
    } else {
      // Drive API v3
      docFile = Drive.Files.create({
        name: fileName,
        mimeType: 'application/vnd.google-apps.document'
      }, blob);
    }
    
    // 3. Export Google Doc to PDF
    var pdfBlob = DriveApp.getFileById(docFile.id).getAs('application/pdf');
    var pdfBase64 = Utilities.base64Encode(pdfBlob.getBytes());
    
    // 4. Cleanup: Remove temp Google Doc
    DriveApp.getFileById(docFile.id).setTrashed(true);
    
    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      pdfBase64: pdfBase64
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}
