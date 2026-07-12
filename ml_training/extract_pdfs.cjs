/**
 * Extract text from ILAW DLL PDFs and generate training CSV rows.
 * Usage: node extract_pdfs.js
 */
const fs = require('fs');
const path = require('path');
const { PDFParse } = require('pdf-parse');

const PDF_DIR = 'C:\\Users\\ASUS\\Downloads\\datas';
const OUTPUT_DIR = path.join(__dirname, 'data');

// Map filenames -> label pairs
const FILE_MAP = [
  { file: 'DTC_ILAW_DLL_GMRC 1_T1_W1_with Rubric.pdf', subject: 'GMRC', grade: 'Grade 1', doctype: 'DLL' },
  { file: 'DTC_ILAW_DLL_LANGUAGE 1_T1_W1_with Rubric.pdf', subject: 'English', grade: 'Grade 1', doctype: 'DLL' },
  { file: 'DTC_ILAW_DLL_MAKABANSA 1_T1_W1_with Rubric.pdf', subject: 'AP', grade: 'Grade 1', doctype: 'DLL' },
  { file: 'DTC_ILAW_DLL_MATHEMATICS 1_T1_W1_with Rubric.pdf', subject: 'Mathematics', grade: 'Grade 1', doctype: 'DLL' },
  { file: 'DTC_ILAW_DLL_READING AND LITERACY 1_T1_W1_with Rubric.pdf', subject: 'English', grade: 'Grade 1', doctype: 'DLL' },
];

async function extractText(filePath) {
  const buffer = new Uint8Array(fs.readFileSync(filePath));
  const pdf = new PDFParse(buffer);
  await pdf.load();
  const result = await pdf.getText();
  pdf.destroy();
  return result.text || '';
}

function sanitize(text) {
  return text
    .replace(/\s+/g, ' ')
    .replace(/["']/g, "'")
    .trim();
}

function makeCSVSafe(text) {
  if (text.includes(',') || text.includes('"') || text.includes('\n')) {
    return '"' + text.replace(/"/g, '""') + '"';
  }
  return text;
}

async function main() {
  const subjectRows = [];
  const gradeRows = [];
  const doctypeRows = [];
  const seenSubjects = new Set();
  const seenGrades = new Set();
  const seenDoctypes = new Set();

  // Read existing CSVs to avoid exact duplicates
  if (fs.existsSync(path.join(OUTPUT_DIR, 'subject_training.csv'))) {
    const existing = fs.readFileSync(path.join(OUTPUT_DIR, 'subject_training.csv'), 'utf8');
    existing.split('\n').slice(1).forEach(line => {
      if (line.trim()) seenSubjects.add(line.trim());
    });
  }
  if (fs.existsSync(path.join(OUTPUT_DIR, 'gradelevel_training.csv'))) {
    const existing = fs.readFileSync(path.join(OUTPUT_DIR, 'gradelevel_training.csv'), 'utf8');
    existing.split('\n').slice(1).forEach(line => {
      if (line.trim()) seenGrades.add(line.trim());
    });
  }
  if (fs.existsSync(path.join(OUTPUT_DIR, 'doctype_training.csv'))) {
    const existing = fs.readFileSync(path.join(OUTPUT_DIR, 'doctype_training.csv'), 'utf8');
    existing.split('\n').slice(1).forEach(line => {
      if (line.trim()) seenDoctypes.add(line.trim());
    });
  }

  for (const entry of FILE_MAP) {
    const filePath = path.join(PDF_DIR, entry.file);
    if (!fs.existsSync(filePath)) {
      console.log(`[SKIP] ${entry.file} not found`);
      continue;
    }

    console.log(`[READ] ${entry.file}`);
    const rawText = await extractText(filePath);
    const text = sanitize(rawText);

    // Split into chunks (sections) for more training samples per PDF
    const sections = text.split(/(?=GRADE \d+ DAILY LESSON LOGS|\bIntentions\b|\bPre-Lesson\b|\bFlow\b|\bFormative Assessment\b)/i);

    for (const chunk of sections) {
      const clean = sanitize(chunk);
      if (clean.length < 20) continue;

      // Subject row
      const subRow = `${makeCSVSafe(clean)},${entry.subject}`;
      if (!seenSubjects.has(subRow)) {
        subjectRows.push(subRow);
        seenSubjects.add(subRow);
      }

      // Grade row
      const gradeRow = `${makeCSVSafe(clean)},${entry.grade}`;
      if (!seenGrades.has(gradeRow)) {
        gradeRows.push(gradeRow);
        seenGrades.add(gradeRow);
      }

      // Doc type row
      const docRow = `${makeCSVSafe(clean)},${entry.doctype}`;
      if (!seenDoctypes.has(docRow)) {
        doctypeRows.push(docRow);
        seenDoctypes.add(docRow);
      }
    }

    // Also add the full text as one row per classifier
    const fullRow = `${makeCSVSafe(text)},${entry.subject}`;
    if (!seenSubjects.has(fullRow)) {
      subjectRows.unshift(fullRow);
      seenSubjects.add(fullRow);
    }
    const fullGradeRow = `${makeCSVSafe(text)},${entry.grade}`;
    if (!seenGrades.has(fullGradeRow)) {
      gradeRows.unshift(fullGradeRow);
      seenGrades.add(fullGradeRow);
    }
    const fullDocRow = `${makeCSVSafe(text)},${entry.doctype}`;
    if (!seenDoctypes.has(fullDocRow)) {
      doctypeRows.unshift(fullDocRow);
      seenDoctypes.add(fullDocRow);
    }
  }

  // Append to existing CSVs
  if (subjectRows.length > 0) {
    fs.appendFileSync(
      path.join(OUTPUT_DIR, 'subject_training.csv'),
      '\n' + subjectRows.join('\n') + '\n',
      'utf8'
    );
    console.log(`[ADDED] ${subjectRows.length} rows to subject_training.csv`);
  }

  if (gradeRows.length > 0) {
    fs.appendFileSync(
      path.join(OUTPUT_DIR, 'gradelevel_training.csv'),
      '\n' + gradeRows.join('\n') + '\n',
      'utf8'
    );
    console.log(`[ADDED] ${gradeRows.length} rows to gradelevel_training.csv`);
  }

  if (doctypeRows.length > 0) {
    fs.appendFileSync(
      path.join(OUTPUT_DIR, 'doctype_training.csv'),
      '\n' + doctypeRows.join('\n') + '\n',
      'utf8'
    );
    console.log(`[ADDED] ${doctypeRows.length} rows to doctype_training.csv`);
  }

  console.log('\n[DONE] Extraction complete. Run python train_all_classifiers.py to retrain models.');
}

main().catch(err => {
  console.error('[ERROR]', err.message);
  process.exit(1);
});
