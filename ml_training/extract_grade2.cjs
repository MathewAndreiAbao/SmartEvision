const fs = require('fs');
const path = require('path');
const https = require('https');
const mammoth = require('mammoth');

const DL_DIR = path.join(__dirname, 'grade2_dlls');
const DATA_DIR = path.join(__dirname, 'data');

if (!fs.existsSync(DL_DIR)) fs.mkdirSync(DL_DIR, { recursive: true });

const FILE_MAP = [
  // Week 1 – 4 files (Filipino, GMRC, Makabansa, Mathematics)
  { id: '1twMrYsTVMDbG_vFlPMOkYAea9mcErDYk', file: 'Filipino_2_T1W1_ILAW.docx', subject: 'Filipino', grade: 'Grade 2', doctype: 'DLL', week: 'Week 1' },
  { id: '19GkXjML9K2eGbVul-KMXl-XmUDNnPCzz', file: 'GMRC_2_T1W1_ILAW.docx', subject: 'GMRC', grade: 'Grade 2', doctype: 'DLL', week: 'Week 1' },
  { id: '1bZ6R-0v7f9NuKHfZY7X8XOPfWqXHF1Bn', file: 'Makabansa_2_T1W1_ILAW.docx', subject: 'Makabansa', grade: 'Grade 2', doctype: 'DLL', week: 'Week 1' },
  { id: '1N66mnfItCFyIxHuNXhhdpNfvxOIGNkyl', file: 'Mathematics_2_T1W1_ILAW.docx', subject: 'Mathematics', grade: 'Grade 2', doctype: 'DLL', week: 'Week 1' },
  // Week 2 – 4 files
  { id: '1bBPhdXM3cJVMY3dQUeyNn-jy45_3PM5u', file: 'Filipino_2_T1W2_ILAW.docx', subject: 'Filipino', grade: 'Grade 2', doctype: 'DLL', week: 'Week 2' },
  { id: '1baIIU7yrm7y19mBASLWQw2ZpqTXtS2By', file: 'GMRC_2_T1W2_ILAW.docx', subject: 'GMRC', grade: 'Grade 2', doctype: 'DLL', week: 'Week 2' },
  { id: '1ln6R_-W6ep5n7yDOi2Wu-ddAZ9zk1emB', file: 'Makabansa_2_T1W2_ILAW.docx', subject: 'Makabansa', grade: 'Grade 2', doctype: 'DLL', week: 'Week 2' },
  { id: '1ZB1nq9VGpcsB7zJaSHfrlfNQdy_lGMVt', file: 'Mathematics_2_T1W2_ILAW.docx', subject: 'Mathematics', grade: 'Grade 2', doctype: 'DLL', week: 'Week 2' },
  // Week 3 – 4 files
  { id: '1lTphaNrA9YZuo6wGPf9uR5ZET9VewD-c', file: 'Filipino_2_T1W3_ILAW.docx', subject: 'Filipino', grade: 'Grade 2', doctype: 'DLL', week: 'Week 3' },
  { id: '19f4Kx7wZ7L9yu7I3-SU44j4lMxDBI_MU', file: 'GMRC_2_T1W3_ILAW.docx', subject: 'GMRC', grade: 'Grade 2', doctype: 'DLL', week: 'Week 3' },
  { id: '1WjGMZQmxYuUIx7PXzsTyHsd_UELR60s3', file: 'Makabansa_2_T1W3_ILAW.docx', subject: 'Makabansa', grade: 'Grade 2', doctype: 'DLL', week: 'Week 3' },
  { id: '1KJ2KzsbCG94zbpfsTIHaNBJkfdiCGNZG', file: 'Mathematics_2_T1W3_ILAW.docx', subject: 'Mathematics', grade: 'Grade 2', doctype: 'DLL', week: 'Week 3' },
  // Week 4 – 4 files
  { id: '1JV1FcMAunQ7uHsgnYsDtS9zVb3EVTR_z', file: 'Filipino_2_T1W4_ILAW.docx', subject: 'Filipino', grade: 'Grade 2', doctype: 'DLL', week: 'Week 4' },
  { id: '1Uc2PjzQwXDFnSslVhkLrwKKc2ffmD2qU', file: 'GMRC_2_T1W4_ILAW.docx', subject: 'GMRC', grade: 'Grade 2', doctype: 'DLL', week: 'Week 4' },
  { id: '1SJBeKp5D_coJ8ajtRXdMGHHvVc5Q3fvR', file: 'Makabansa_2_T1W4_ILAW.docx', subject: 'Makabansa', grade: 'Grade 2', doctype: 'DLL', week: 'Week 4' },
  { id: '1YVDkfqT5dJYNYUXlccw0k6_mOYlgylG0', file: 'Mathematics_2_T1W4_ILAW.docx', subject: 'Mathematics', grade: 'Grade 2', doctype: 'DLL', week: 'Week 4' },
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
  console.log('=== Downloading 16 Grade 2 ILAW DLLs ===\n');

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

    const headerMatch = text.match(/(GRADE 2 DAILY LESSON LOGS[\s\S]{0,500})/i);
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