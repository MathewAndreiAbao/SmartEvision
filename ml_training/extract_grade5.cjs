const fs = require('fs');
const path = require('path');
const https = require('https');
const mammoth = require('mammoth');

const DL_DIR = path.join(__dirname, 'grade5_dlls');
const DATA_DIR = path.join(__dirname, 'data');

if (!fs.existsSync(DL_DIR)) fs.mkdirSync(DL_DIR, { recursive: true });

const FILE_MAP = [
  // Week 1 – 8 files
  { id: '1qE4j-o7pBHckJsv_4Jr7WRrfX3unEeXd', file: 'AP_5_T1W1_ILAW.docx', subject: 'AP', grade: 'Grade 5', doctype: 'DLL', week: 'Week 1' },
  { id: '1x6moZsoTm0dEQ4QhWdwRXcIEaah5ypfw', file: 'English_5_T1W1_ILAW.docx', subject: 'English', grade: 'Grade 5', doctype: 'DLL', week: 'Week 1' },
  { id: '1GKvmKFy4DRNh5lFYl0IR2JxLhsUazqXp', file: 'EPP_5_T1W1_ILAW.docx', subject: 'EPP', grade: 'Grade 5', doctype: 'DLL', week: 'Week 1' },
  { id: '1VdXRxYmDSp9er-xNu3vEnnYbJxoHtu2h', file: 'Filipino_5_T1W1_ILAW.docx', subject: 'Filipino', grade: 'Grade 5', doctype: 'DLL', week: 'Week 1' },
  { id: '1ThO5rpRhYTAja0Au1xXPK4Iq0aV5v08g', file: 'GMRC_5_T1W1_ILAW.docx', subject: 'GMRC', grade: 'Grade 5', doctype: 'DLL', week: 'Week 1' },
  { id: '12IR2N7_vAGSYtICn5DayTBjqpb_IBVC7', file: 'MAPEH_5_T1W1_ILAW.docx', subject: 'MAPEH', grade: 'Grade 5', doctype: 'DLL', week: 'Week 1' },
  { id: '1H1NF7wu3CGv0Re1f68OPbwMr36Jl-udA', file: 'Mathematics_5_T1W1_ILAW.docx', subject: 'Mathematics', grade: 'Grade 5', doctype: 'DLL', week: 'Week 1' },
  { id: '19okNOCLdwMBLRr6aFey7W3AO4elwXNs0', file: 'Science_5_T1W1_ILAW.docx', subject: 'Science', grade: 'Grade 5', doctype: 'DLL', week: 'Week 1' },
  // Week 2 – 8 files
  { id: '1M56u2nz2OIg6Bpwh38dpPvdtYX3v7G8A', file: 'AP_5_T1W2_ILAW.docx', subject: 'AP', grade: 'Grade 5', doctype: 'DLL', week: 'Week 2' },
  { id: '1xIlY9KEgGGzB1ldrT-aNJvkuE9UTe0EZ', file: 'English_5_T1W2_ILAW.docx', subject: 'English', grade: 'Grade 5', doctype: 'DLL', week: 'Week 2' },
  { id: '1bGp2Z0K-PmmYP-DSJuMkieNK0G2WFUhe', file: 'EPP_5_T1W2_ILAW.docx', subject: 'EPP', grade: 'Grade 5', doctype: 'DLL', week: 'Week 2' },
  { id: '1-xqPu5VxXavBzN_u0jsJAL2SJIsmAAop', file: 'Filipino_5_T1W2_ILAW.docx', subject: 'Filipino', grade: 'Grade 5', doctype: 'DLL', week: 'Week 2' },
  { id: '1mSmQz8il6-7QAGwaun7ztOqS7EefgdU-', file: 'GMRC_5_T1W2_ILAW.docx', subject: 'GMRC', grade: 'Grade 5', doctype: 'DLL', week: 'Week 2' },
  { id: '1fVCkbjZUPkjvbNQK2hadGVrPy4lB41gv', file: 'MAPEH_5_T1W2_ILAW.docx', subject: 'MAPEH', grade: 'Grade 5', doctype: 'DLL', week: 'Week 2' },
  { id: '1GUlWWlp4o1BtE1vpAc-0xzlIXe3hpNgH', file: 'Mathematics_5_T1W2_ILAW.docx', subject: 'Mathematics', grade: 'Grade 5', doctype: 'DLL', week: 'Week 2' },
  { id: '1uO-ESWmC4lE7L7c7a196ozoN3mODaoYt', file: 'Science_5_T1W2_ILAW.docx', subject: 'Science', grade: 'Grade 5', doctype: 'DLL', week: 'Week 2' },
  // Week 3 – 9 files (MAPEH split into Music & Arts + PE & Health)
  { id: '1n45X9uXpk8LJkQhr6huug9L5RI5OBeJS', file: 'AP_5_T1W3_ILAW.docx', subject: 'AP', grade: 'Grade 5', doctype: 'DLL', week: 'Week 3' },
  { id: '143_CD73tmNJr_09OAuLKzrwCxEgbfBWl', file: 'English_5_T1W3_ILAW.docx', subject: 'English', grade: 'Grade 5', doctype: 'DLL', week: 'Week 3' },
  { id: '1UoUJc_vLqIcYHkgTzZsYigelLpKpB3uo', file: 'EPP_5_T1W3_ILAW.docx', subject: 'EPP', grade: 'Grade 5', doctype: 'DLL', week: 'Week 3' },
  { id: '1tD1zmsaC6VElISVVqgSUv1PLS37I2oUV', file: 'Filipino_5_T1W3_ILAW.docx', subject: 'Filipino', grade: 'Grade 5', doctype: 'DLL', week: 'Week 3' },
  { id: '1iawlubhV55CkCm4hcqxtSGGdjqbSl8Gi', file: 'GMRC_5_T1W3_ILAW.docx', subject: 'GMRC', grade: 'Grade 5', doctype: 'DLL', week: 'Week 3' },
  { id: '1kZlNi8BcMDIOPzgByO9q37xvkHgG8dfe', file: 'MAPEH_MusicArts_5_T1W3_ILAW.docx', subject: 'MAPEH', grade: 'Grade 5', doctype: 'DLL', week: 'Week 3' },
  { id: '1E-BcEbBpEujXx1ZXErxfYZHIptZOCi-h', file: 'MAPEH_PEHealth_5_T1W3_ILAW.docx', subject: 'MAPEH', grade: 'Grade 5', doctype: 'DLL', week: 'Week 3' },
  { id: '1l28jfVbg2BtayvEyRAx2U1bzhAfrmxX1', file: 'Mathematics_5_T1W3_ILAW.docx', subject: 'Mathematics', grade: 'Grade 5', doctype: 'DLL', week: 'Week 3' },
  { id: '1nN0wdHTCDxXcfGlaF5Lqagsei_7F2Sgc', file: 'Science_5_T1W3_ILAW.docx', subject: 'Science', grade: 'Grade 5', doctype: 'DLL', week: 'Week 3' },
  // Week 4 – 9 files (MAPEH split)
  { id: '1LAF1kss4DZ4Dkwv7Vis9WASBsHWqQgEx', file: 'AP_5_T1W4_ILAW.docx', subject: 'AP', grade: 'Grade 5', doctype: 'DLL', week: 'Week 4' },
  { id: '1cSI201hjsgLCqeramGT-tu_qwmR1vqu_', file: 'English_5_T1W4_ILAW.docx', subject: 'English', grade: 'Grade 5', doctype: 'DLL', week: 'Week 4' },
  { id: '1SvQX4tSv5puMwffTF5VzjtJWIaz_tLwi', file: 'EPP_5_T1W4_ILAW.docx', subject: 'EPP', grade: 'Grade 5', doctype: 'DLL', week: 'Week 4' },
  { id: '1gLxk89ULqgLBAWLo614qlzBEo3AV_e4W', file: 'Filipino_5_T1W4_ILAW.docx', subject: 'Filipino', grade: 'Grade 5', doctype: 'DLL', week: 'Week 4' },
  { id: '1O-Jkzu8ETfQCdtfyiQSz8bkPNxQ9Zm_l', file: 'GMRC_5_T1W4_ILAW.docx', subject: 'GMRC', grade: 'Grade 5', doctype: 'DLL', week: 'Week 4' },
  { id: '1_jOAvXx8zWSNqDJjR7pmeJ4RkGDD7YKP', file: 'MAPEH_MusicArts_5_T1W4_ILAW.docx', subject: 'MAPEH', grade: 'Grade 5', doctype: 'DLL', week: 'Week 4' },
  { id: '11_LidTQxgfJSAXr4ZxtNKtz38zjY73qs', file: 'MAPEH_PEHealth_5_T1W4_ILAW.docx', subject: 'MAPEH', grade: 'Grade 5', doctype: 'DLL', week: 'Week 4' },
  { id: '1D1hUeweqFDoyj_YcwY0UugMn1ZcN8Y2R', file: 'Mathematics_5_T1W4_ILAW.docx', subject: 'Mathematics', grade: 'Grade 5', doctype: 'DLL', week: 'Week 4' },
  { id: '1Lbr5KalM-BQtNodd_ymlvOprZLbnBaSr', file: 'Science_5_T1W4_ILAW.docx', subject: 'Science', grade: 'Grade 5', doctype: 'DLL', week: 'Week 4' },
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
  console.log('=== Downloading 34 Grade 5 ILAW DLLs ===\n');

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

    const headerMatch = text.match(/(GRADE 5 DAILY LESSON LOGS[\s\S]{0,500})/i);
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