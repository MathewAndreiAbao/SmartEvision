/**
 * Google Apps Script for Word Document Conversion
 * 
 * Deploy as a standalone web app:
 * 1. Copy this code into Google Apps Script (script.google.com)
 * 2. Deploy as web app: Deploy > New Deployment > Select type: Web app
 * 3. Execute as: Me
 * 4. Who has access: Anyone
 * 5. Copy the deployment URL and add to PUBLIC_GOOGLE_SCRIPT_URL in .env
 * 
 * Function: Converts DOCX files to PDF via Google Drive API
 */

function doPost(e) {
  try {
    if (!e.postData || !e.postData.contents) {
      return ContentService.createTextOutput(JSON.stringify({
        success: false,
        error: 'No file data provided'
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // Decode the base64 file data
    const fileData = Utilities.newBlob(
      Utilities.base64Decode(e.postData.contents),
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    );

    // Create a temporary file in Google Drive
    const folder = DriveApp.getRootFolder();
    const file = folder.createFile(fileData);
    file.setName('temp_conversion_' + Date.now() + '.docx');

    try {
      // Convert DOCX to PDF using Drive API
      const pdfBlob = DriveApp.getFileById(file.getId())
        .getAs('application/pdf');

      // Convert PDF to base64 for transmission
      const pdfBase64 = Utilities.base64Encode(pdfBlob.getBytes());

      // Extract text from the original document for metadata
      const docText = DocumentApp.openById(file.getId()).getBody().getText();

      return ContentService.createTextOutput(JSON.stringify({
        success: true,
        pdf: pdfBase64,
        text: docText,
        fileName: pdfBlob.getName()
      })).setMimeType(ContentService.MimeType.JSON);

    } finally {
      // Clean up temporary file
      file.setTrashed(true);
    }

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: error.message || 'Conversion failed'
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Test function to verify the script is working
 * Run this in the Apps Script editor to test
 */
function test() {
  const testFile = Utilities.newBlob('Test content', 'text/plain');
  const result = doPost({
    postData: {
      contents: Utilities.base64Encode(testFile.getBytes())
    }
  });
  Logger.log(result.getContent());
}
