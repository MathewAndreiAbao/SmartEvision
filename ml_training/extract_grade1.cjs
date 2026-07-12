const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const mammoth = require('mammoth');

const DL_DIR = path.join(__dirname, 'grade1_dlls');
const DATA_DIR = path.join(__dirname, 'data');

if (!fs.existsSync(DL_DIR)) fs.mkdirSync(DL_DIR, { recursive: true });

// Week 1 – 5 files
const FILE_MAP = [
  { id: '1LzNTJxVO9ytzXLhTqKvE2mDcEH1h4JI5', file: 'GMRC_1_T1W1_ILAW.docx', subject: 'GMRC', grade: 'Grade 1', doctype: 'DLL', week: 'Week 1' },
  { id: '1HOjcb8AczaR4pMU7V0joxmarjSOjUpjD', file: 'Language_1_T1W1_ILAW.docx', subject: 'Language', grade: 'Grade 1', doctype: 'DLL', week: 'Week 1' },
  { id: '1Ql6i3E8AvdfpQXhWFo2M5iW0yeZbRoUn', file: 'Makabansa_1_T1W1_ILAW.docx', subject: 'Makabansa', grade: 'Grade 1', doctype: 'DLL', week: 'Week 1' },
  { id: '173WPWZSTRxy8gL9Ts9lGMZa35YNkloR5', file: 'Mathematics_1_T1W1_ILAW.docx', subject: 'Mathematics', grade: 'Grade 1', doctype: 'DLL', week: 'Week 1' },
  { id: '12trEQUzBLBFdhc-vGjqn2eVBeE_ZA6Ri', file: 'Reading_Literacy_1_T1W1_ILAW.docx', subject: 'Reading and Literacy', grade: 'Grade 1', doctype: 'DLL', week: 'Week 1' },
  // Week 2 – 5 files
  { id: '1t4-wW1nG656DgyW2OJm-rDgVcdI2_L3u', file: 'GMRC_1_T1W2_ILAW.docx', subject: 'GMRC', grade: 'Grade 1', doctype: 'DLL', week: 'Week 2' },
  { id: '1xVuavw3YWKSrs285CYzVdeokwMPe7USu', file: 'Language_1_T1W2_ILAW.docx', subject: 'Language', grade: 'Grade 1', doctype: 'DLL', week: 'Week 2' },
  { id: '19Aa7ko04cYILxphELqbgaSZtHnYy_RZh', file: 'Makabansa_1_T1W2_ILAW.docx', subject: 'Makabansa', grade: 'Grade 1', doctype: 'DLL', week: 'Week 2' },
  { id: '1NAeDfXdi1cbKkJ-nMcZGqvXluMnbXnkC', file: 'Mathematics_1_T1W2_ILAW.docx', subject: 'Mathematics', grade: 'Grade 1', doctype: 'DLL', week: 'Week 2' },
  { id: '1qZFrtPG2JF7oZMAGlnHxVXElDJAsea0q', file: 'Reading_Literacy_1_T1W2_ILAW.docx', subject: 'Reading and Literacy', grade: 'Grade 1', doctype: 'DLL', week: 'Week 2' },
  // Week 3 – 5 files
  { id: '1Pwk__b-vPzvkfjmZcb0oEfwcHt3g-Cvf', file: 'GMRC_1_T1W3_ILAW.docx', subject: 'GMRC', grade: 'Grade 1', doctype: 'DLL', week: 'Week 3' },
  { id: '1ACbf4k7f-hD8VIl3oYri1ikSUdW4RJeI', file: 'Language_1_T1W3_ILAW.docx', subject: 'Language', grade: 'Grade 1', doctype: 'DLL', week: 'Week 3' },
  { id: '1Xav8fPTJE2KUAaFJAnlaj6H1QlK7R8By', file: 'Makabansa_1_T1W3_ILAW.docx', subject: 'Makabansa', grade: 'Grade 1', doctype: 'DLL', week: 'Week 3' },
  { id: '1VTeD_M1a6m3lO35Z0zTpVS92IjfrjdC_', file: 'Mathematics_1_T1W3_ILAW.docx', subject: 'Mathematics', grade: 'Grade 1', doctype: 'DLL', week: 'Week 3' },
  { id: '1vjxtu6BApNAMrOXtX6WN2Nm7mZZuXIn6', file: 'Reading_Literacy_1_T1W3_ILAW.docx', subject: 'Reading and Literacy', grade: 'Grade 1', doctype: 'DLL', week: 'Week 3' },
  // Week 4 – 5 files
  { id: '134OXkQ_Zk9PHX_FtO_f0i9BqtJ6h7SdN', file: 'GMRC_1_T1W4_ILAW.docx', subject: 'GMRC', grade: 'Grade 1', doctype: 'DLL', week: 'Week 4' },
  { id: '1jBHYuPpz6ougU28LEBFbvzHYbhtDnhUc', file: 'Language_1_T1W4_ILAW.docx', subject: 'Language', grade: 'Grade 1', doctype: 'DLL', week: 'Week 4' },
  { id: '1ze-WgqtN5Ms6ShM-HDATizN1v_nSNyoN', file: 'Makabansa_1_T1W4_ILAW.docx', subject: 'Makabansa', grade: 'Grade 1', doctype: 'DLL', week: 'Week 4' },
  { id: '1d2cZOZd34qQbe2yNabXB5NcOkXngfszW', file: 'Mathematics_1_T1W4_ILAW.docx', subject: 'Mathematics', grade: 'Grade 1', doctype: 'DLL', week: 'Week 4' },
  { id: '1MVR6_ucSwATp65C3dovP2NErdqSXp3js', file: 'Reading_Literacy_1_T1W4_ILAW.docx', subject: 'Reading and Literacy', grade: 'Grade 1', doctype: 'DLL', week: 'Week 4' },
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
  console.log('=== Downloading 20 Grade 1 ILAW DLLs ===\n');

  // Download all files
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

  // Load existing rows for deduplication
  function loadExisting(path) {
    const seen = new Set();
    if (fs.existsSync(path)) {
      const content = fs.readFileSync(path, 'utf8');
      content.split('\n').slice(1).forEach(l => { if (l.trim()) seen.add(l.trim()); });
    }
    return seen;
  }

  function appendToCSV(path, rows, seen, labelKey) {
    const newRows = [];
    for (const row of rows) {
      const text = sanitize(row.text);
      if (!text || text.length < 10) continue;
      const label = row[labelKey];
      const csvLine = `${makeCSVSafe(text)},${label}`;
      if (!seen.has(csvLine)) { newRows.push(csvLine); seen.add(csvLine); }
    }
    if (newRows.length > 0) {
      fs.appendFileSync(path, '\n' + newRows.join('\n') + '\n', 'utf8');
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

    // Split into sections for more training samples
    const sections = text.split(/(?=GRADE 1 DAILY LESSON LOGS|ILAW Format|\bIntentions\b|\bPre-Lesson\b|\bFlow\b|\bFormative Assessment\b)/i);

    const allSamples = [];

    // Add full text
    allSamples.push({ text, subject: entry.subject, grade: entry.grade, doctype: entry.doctype });

    // Add section chunks
    for (const chunk of sections) {
      const clean = sanitize(chunk);
      if (clean.length >= 30) {
        allSamples.push({ text: clean, subject: entry.subject, grade: entry.grade, doctype: entry.doctype });
      }
    }

    // Also create header-only sample
    const headerMatch = text.match(/(GRADE 1 DAILY LESSON LOGS[\s\S]{0,500})/i);
    if (headerMatch) {
      allSamples.push({ text: sanitize(headerMatch[1]), subject: entry.subject, grade: entry.grade, doctype: entry.doctype });
    }

    // Append to all 3 CSV files
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