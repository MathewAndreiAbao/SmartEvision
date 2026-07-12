const fs = require('fs');
const path = require('path');
const https = require('https');
const mammoth = require('mammoth');

const DL_DIR = path.join(__dirname, 'grade3_dlls');
const DATA_DIR = path.join(__dirname, 'data');

if (!fs.existsSync(DL_DIR)) fs.mkdirSync(DL_DIR, { recursive: true });

const FILE_MAP = [
  // Week 1 – 6 files
  { id: '1AvkiwpfA0Ezcnx4VDaXCipZOL6z4fVmg', file: 'English_3_T1W1_ILAW.docx', subject: 'English', grade: 'Grade 3', doctype: 'DLL', week: 'Week 1' },
  { id: '1c4wDIU75ANQw21gx2mQkf8N2QKwV3dgv', file: 'Filipino_3_T1W1_ILAW.docx', subject: 'Filipino', grade: 'Grade 3', doctype: 'DLL', week: 'Week 1' },
  { id: '197UygzfLRM7VbBSRTqmCMPTsXzT-_9je', file: 'GMRC_3_T1W1_ILAW.docx', subject: 'GMRC', grade: 'Grade 3', doctype: 'DLL', week: 'Week 1' },
  { id: '1QCSJEQrP4x5I-LThUHq6fo0c3dd4YkxF', file: 'Makabansa_3_T1W1_ILAW.docx', subject: 'Makabansa', grade: 'Grade 3', doctype: 'DLL', week: 'Week 1' },
  { id: '16olbxnloYeJqRuN6CrhGljHvgGrM22Mm', file: 'Mathematics_3_T1W1_ILAW.docx', subject: 'Mathematics', grade: 'Grade 3', doctype: 'DLL', week: 'Week 1' },
  { id: '1MP1isRAuB81eY73ZaNdFMtTdfrZFgxGm', file: 'Science_3_T1W1_ILAW.docx', subject: 'Science', grade: 'Grade 3', doctype: 'DLL', week: 'Week 1' },
  // Week 2 – 6 files
  { id: '1asShCCXuah2p5tbhH0o7Fqbqt6H3mEvE', file: 'English_3_T1W2_ILAW.docx', subject: 'English', grade: 'Grade 3', doctype: 'DLL', week: 'Week 2' },
  { id: '1zl0l3DHjNljXhh_zQXLns9iL3uQqTPgS', file: 'Filipino_3_T1W2_ILAW.docx', subject: 'Filipino', grade: 'Grade 3', doctype: 'DLL', week: 'Week 2' },
  { id: '1wNNLuTxZLrKHr5SwUxEL9G09cl1sHPYl', file: 'GMRC_3_T1W2_ILAW.docx', subject: 'GMRC', grade: 'Grade 3', doctype: 'DLL', week: 'Week 2' },
  { id: '1-_yeDeNAiN6JDi9cCETQJhwgmmfkCdLr', file: 'Makabansa_3_T1W2_ILAW.docx', subject: 'Makabansa', grade: 'Grade 3', doctype: 'DLL', week: 'Week 2' },
  { id: '1WjYVxJI0aRovW5G8P6Yb9KPAS3u0Yz49', file: 'Mathematics_3_T1W2_ILAW.docx', subject: 'Mathematics', grade: 'Grade 3', doctype: 'DLL', week: 'Week 2' },
  { id: '1tANQJcK5icv4m3YNoU6Qe_AwoBEpDVVJ', file: 'Science_3_T1W2_ILAW.docx', subject: 'Science', grade: 'Grade 3', doctype: 'DLL', week: 'Week 2' },
  // Week 3 – 6 files
  { id: '1vC8d6fcAquNLwkA1IDq8_WNpQ-gSaniP', file: 'English_3_T1W3_ILAW.docx', subject: 'English', grade: 'Grade 3', doctype: 'DLL', week: 'Week 3' },
  { id: '1qU2nZpt0y-932CizBObzqjK1OwNM0GHe', file: 'Filipino_3_T1W3_ILAW.docx', subject: 'Filipino', grade: 'Grade 3', doctype: 'DLL', week: 'Week 3' },
  { id: '1LXmwspYGpCupg_Z2u0LlHKDxqR866MFg', file: 'GMRC_3_T1W3_ILAW.docx', subject: 'GMRC', grade: 'Grade 3', doctype: 'DLL', week: 'Week 3' },
  { id: '1UBl-H_3s_qvtrL4gyFhk2ADeNmgVZxxC', file: 'Makabansa_3_T1W3_ILAW.docx', subject: 'Makabansa', grade: 'Grade 3', doctype: 'DLL', week: 'Week 3' },
  { id: '1uIRYWu0R2K9EB6uZe-yIsQATUeF9-Ac7', file: 'Mathematics_3_T1W3_ILAW.docx', subject: 'Mathematics', grade: 'Grade 3', doctype: 'DLL', week: 'Week 3' },
  { id: '1VdQhIw61p7hzSjJ1vIN_ME6XebrAQVx4', file: 'Science_3_T1W3_ILAW.docx', subject: 'Science', grade: 'Grade 3', doctype: 'DLL', week: 'Week 3' },
  // Week 4 – 6 files
  { id: '14tzGEihwDFvvusDCPPAf7YfCttX-3mZC', file: 'English_3_T1W4_ILAW.docx', subject: 'English', grade: 'Grade 3', doctype: 'DLL', week: 'Week 4' },
  { id: '1zJ5d-w5a_rbuBXYQ0N81IsIX9D37Wq5k', file: 'Filipino_3_T1W4_ILAW.docx', subject: 'Filipino', grade: 'Grade 3', doctype: 'DLL', week: 'Week 4' },
  { id: '1i8X9VMDfeOF6xC2e0rKxqk72sYsgs0mM', file: 'GMRC_3_T1W4_ILAW.docx', subject: 'GMRC', grade: 'Grade 3', doctype: 'DLL', week: 'Week 4' },
  { id: '1U-C1sEZ0S6Cp8zEXKqlHtk-yvnw9tW8j', file: 'Makabansa_3_T1W4_ILAW.docx', subject: 'Makabansa', grade: 'Grade 3', doctype: 'DLL', week: 'Week 4' },
  { id: '17TVkIb8tHfD8jtoS-HMCW8Z5Ja701eCh', file: 'Mathematics_3_T1W4_ILAW.docx', subject: 'Mathematics', grade: 'Grade 3', doctype: 'DLL', week: 'Week 4' },
  { id: '1RdDta3rrRPze5gR8KE8W_Vgcf1VTm6OB', file: 'Science_3_T1W4_ILAW.docx', subject: 'Science', grade: 'Grade 3', doctype: 'DLL', week: 'Week 4' },
];

function downloadFile(id, dest) {
  return new Promise((resolve, reject) => {
    const url = `https://drive.usercontent.google.com/download?id=${id}&export=download`;
    const file = fs.createWriteStream(dest);
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' } }, (res) => {
      if (res.statusCode !== 200) {
        file.close();
        if (fs.existsSync(dest)) fs.unlinkSync(dest);
        return reject(new Error(`HTTP ${res.statusCode}`));
      }
      res.pipe(file);
      file.on('finish', () => { file.close(); resolve(); });
      file.on('error', (e) => { file.close(); if (fs.existsSync(dest)) fs.unlinkSync(dest); reject(e); });
    }).on('error', (e) => { if (fs.existsSync(dest)) fs.unlinkSync(dest); reject(e); });
  });
}

async function extractText(filePath) {
  const buffer = fs.readFileSync(filePath);
  const result = await mammoth.extractRawText({ buffer });
  return result.value || '';
}

function sanitize(text) {
  return text.replace(/\s+/g, ' ').replace(/["']/g, "'").trim();
}

function makeCSVSafe(text) {
  if (text.includes(',') || text.includes('"') || text.includes('\n')) return '"' + text.replace(/"/g, '""') + '"';
  return text;
}

async function main() {
  console.log('=== Downloading 24 Grade 3 ILAW DLLs ===\n');

  for (const entry of FILE_MAP) {
    const filePath = path.join(DL_DIR, entry.file);
    if (fs.existsSync(filePath) && fs.statSync(filePath).size > 1000) {
      console.log(`[SKIP] ${entry.file} (already exists)`);
      continue;
    }
    console.log(`[DL] ${entry.file}...`);
    let ok = false;
    for (const attempt of [1, 2, 3]) {
      try {
        await downloadFile(entry.id, filePath);
        const size = fs.statSync(filePath).size;
        if (size > 1000) { ok = true; console.log(`  OK (${(size / 1024).toFixed(1)} KB)`); break; }
        console.log(`  too small (${size} bytes), retrying...`);
      } catch (e) {
        if (attempt < 3) console.log(`  retry ${attempt}: ${e.message}`);
        else console.log(`  FAILED: ${e.message}`);
      }
    }
    if (!ok && fs.existsSync(filePath)) fs.unlinkSync(filePath);
  }

  console.log('\n=== Extracting Text and Appending to CSVs ===\n');

  function loadExisting(p) {
    const seen = new Set();
    if (fs.existsSync(p)) {
      const content = fs.readFileSync(p, 'utf8');
      content.split('\n').slice(1).forEach(l => { if (l.trim()) seen.add(l.trim()); });
    }
    return seen;
  }

  function appendToCSV(p, rows, seen, labelKey) {
    const newRows = [];
    for (const row of rows) {
      const text = sanitize(row.text);
      if (!text || text.length < 10) continue;
      const label = row[labelKey];
      const csvLine = `${makeCSVSafe(text)},${label}`;
      if (!seen.has(csvLine)) { newRows.push(csvLine); seen.add(csvLine); }
    }
    if (newRows.length > 0) {
      fs.appendFileSync(p, '\n' + newRows.join('\n') + '\n', 'utf8');
    }
    return newRows.length;
  }

  const paths = {
    grade: path.join(DATA_DIR, 'gradelevel_training.csv'),
    subject: path.join(DATA_DIR, 'subject_training.csv'),
    doctype: path.join(DATA_DIR, 'doctype_training.csv'),
  };

  let totalAdded = 0;
  let successCount = 0;

  for (const entry of FILE_MAP) {
    const filePath = path.join(DL_DIR, entry.file);
    if (!fs.existsSync(filePath)) {
      console.log(`[SKIP] ${entry.file} (not downloaded)`);
      continue;
    }

    console.log(`[READ] ${entry.file}`);
    const rawText = await extractText(filePath);
    const text = sanitize(rawText);

    if (text.length < 50) {
      console.log(`  too short (${text.length} chars), skipping`);
      continue;
    }

    successCount++;

    const sections = text.split(/(?=Intentions|Pre-Lesson|Flow|Formative Assessment)/i);

    const allSamples = [];
    allSamples.push({ text, subject: entry.subject, grade: entry.grade, doctype: entry.doctype });

    for (const chunk of sections) {
      const clean = sanitize(chunk);
      if (clean.length >= 30) {
        allSamples.push({ text: clean, subject: entry.subject, grade: entry.grade, doctype: entry.doctype });
      }
    }

    const headerMatch = text.match(/(GRADE 3 DAILY LESSON LOGS[\s\S]{0,500})/i);
    if (headerMatch) {
      allSamples.push({ text: sanitize(headerMatch[1]), subject: entry.subject, grade: entry.grade, doctype: entry.doctype });
    }

    for (const key of ['grade', 'subject', 'doctype']) {
      const seen = loadExisting(paths[key]);
      const n = appendToCSV(paths[key], allSamples, seen, key);
      totalAdded += n;
    }

    console.log(`  ${allSamples.length} samples from ${entry.file} (${text.length} chars)`);
  }

  console.log(`\n=== Summary ===`);
  console.log(`  Files processed: ${successCount}/${FILE_MAP.length}`);
  console.log(`  Total new rows added: ${totalAdded}`);
  for (const key of ['gradelevel_training.csv', 'subject_training.csv', 'doctype_training.csv']) {
    const fp = path.join(DATA_DIR, key);
    if (fs.existsSync(fp)) {
      const lines = fs.readFileSync(fp, 'utf8').split('\n').filter(l => l.trim()).length - 1;
      console.log(`  ${key}: ${lines} rows`);
    }
  }
}

main().catch(err => { console.error(err.message); process.exit(1); });