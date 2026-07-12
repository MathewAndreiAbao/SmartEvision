const fs = require('fs');
const path = require('path');
const mammoth = require('mammoth');

const PDF_DIR = path.join(__dirname, 'grade4_dlls');
const OUTPUT_DIR = path.join(__dirname, 'data');

const FILE_MAP = [
  { file: 'AP_4_T1W2_ILAW.docx', subject: 'AP', grade: 'Grade 4', doctype: 'DLL' },
  { file: 'English_4_T1W2_ILAW.docx', subject: 'English', grade: 'Grade 4', doctype: 'DLL' },
  { file: 'EPP_4_T1W2_ILAW.docx', subject: 'EPP', grade: 'Grade 4', doctype: 'DLL' },
  { file: 'Filipino_4_T1W2_ILAW.docx', subject: 'Filipino', grade: 'Grade 4', doctype: 'DLL' },
  { file: 'GMRC_4_T1W2_ILAW.docx', subject: 'GMRC', grade: 'Grade 4', doctype: 'DLL' },
  { file: 'MAPEH_4_T1W2_ILAW.docx', subject: 'MAPEH', grade: 'Grade 4', doctype: 'DLL' },
  { file: 'Math_4_T1W2_ILAW.docx', subject: 'Mathematics', grade: 'Grade 4', doctype: 'DLL' },
  { file: 'Science_4_T1W2_ILAW.docx', subject: 'Science', grade: 'Grade 4', doctype: 'DLL' },
  { file: 'AP_4_T1W3_ILAW.docx', subject: 'AP', grade: 'Grade 4', doctype: 'DLL' },
  { file: 'English_4_T1W3_ILAW.docx', subject: 'English', grade: 'Grade 4', doctype: 'DLL' },
  { file: 'EPP_4_T1W3_ILAW.docx', subject: 'EPP', grade: 'Grade 4', doctype: 'DLL' },
  { file: 'Filipino_4_T1W3_ILAW.docx', subject: 'Filipino', grade: 'Grade 4', doctype: 'DLL' },
  { file: 'GMRC_4_T1W3_ILAW.docx', subject: 'GMRC', grade: 'Grade 4', doctype: 'DLL' },
  { file: 'MusicArts_4_T1W3_ILAW.docx', subject: 'MAPEH', grade: 'Grade 4', doctype: 'DLL' },
  { file: 'PEHealth_4_T1W3_ILAW.docx', subject: 'MAPEH', grade: 'Grade 4', doctype: 'DLL' },
  { file: 'Math_4_T1W3_ILAW.docx', subject: 'Mathematics', grade: 'Grade 4', doctype: 'DLL' },
  { file: 'Science_4_T1W3_ILAW.docx', subject: 'Science', grade: 'Grade 4', doctype: 'DLL' },
];

async function extractText(filePath) {
  const buffer = fs.readFileSync(filePath);
  const result = await mammoth.extractRawText({ buffer });
  return result.value || '';
}

function sanitize(text) {
  return text.replace(/\s+/g, ' ').replace(/["']/g, "'").trim();
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

  // Load existing rows to avoid duplicates
  for (const [fname, set] of [['subject_training.csv', seenSubjects], ['gradelevel_training.csv', seenGrades], ['doctype_training.csv', seenDoctypes]]) {
    const fp = path.join(OUTPUT_DIR, fname);
    if (fs.existsSync(fp)) {
      fs.readFileSync(fp, 'utf8').split('\n').slice(1).forEach(l => { if (l.trim()) set.add(l.trim()); });
    }
  }

  for (const entry of FILE_MAP) {
    const filePath = path.join(PDF_DIR, entry.file);
    if (!fs.existsSync(filePath)) { console.log(`[SKIP] ${entry.file}`); continue; }

    console.log(`[READ] ${entry.file}`);
    const rawText = await extractText(filePath);
    const text = sanitize(rawText);
    if (text.length < 20) { console.log(`  too short, skipping`); continue; }

    // Split into sections for more samples
    const sections = text.split(/(?=GRADE \d+ DAILY LESSON LOGS|ILAW Format|\bIntentions\b|\bPre-Lesson\b|\bFlow\b|\bFormative Assessment\b|\bLearning Experience\b)/i);

    for (const chunk of sections) {
      const clean = sanitize(chunk);
      if (clean.length < 30) continue;

      for (const [rows, set, label] of [[subjectRows, seenSubjects, entry.subject], [gradeRows, seenGrades, entry.grade], [doctypeRows, seenDoctypes, entry.doctype]]) {
        const row = `${makeCSVSafe(clean)},${label}`;
        if (!set.has(row)) { rows.push(row); set.add(row); }
      }
    }

    // Also add the full text
    for (const [rows, set, label] of [[subjectRows, seenSubjects, entry.subject], [gradeRows, seenGrades, entry.grade], [doctypeRows, seenDoctypes, entry.doctype]]) {
      const row = `${makeCSVSafe(text)},${label}`;
      if (!set.has(row)) { rows.unshift(row); set.add(row); }
    }
  }

  for (const [rows, fname] of [[subjectRows, 'subject_training.csv'], [gradeRows, 'gradelevel_training.csv'], [doctypeRows, 'doctype_training.csv']]) {
    if (rows.length > 0) {
      const fp = path.join(OUTPUT_DIR, fname);
      fs.appendFileSync(fp, '\n' + rows.join('\n') + '\n', 'utf8');
      console.log(`[ADDED] ${rows.length} rows to ${fname}`);
    }
  }

  console.log('\n[DONE]');
}

main().catch(err => { console.error(err.message); process.exit(1); });