const fs = require('fs');
const path = require('path');
const https = require('https');
const mammoth = require('mammoth');

const DL_DIR = path.join(__dirname, 'grade6_dlls');
const DATA_DIR = path.join(__dirname, 'data');

if (!fs.existsSync(DL_DIR)) fs.mkdirSync(DL_DIR, { recursive: true });

const FILE_MAP = [
  // Week 1 – 8 files
  { id: '1Udz0bDyqK4S59NVnwWV4Pd3e3UOvIheA', file: 'AP_6_T1W1_ILAW.docx', subject: 'AP', grade: 'Grade 6', doctype: 'DLL', week: 'Week 1' },
  { id: '19Mhpbj8X2knkiXNyAxhUW8FqmZBD47gx', file: 'English_6_T1W1_ILAW.docx', subject: 'English', grade: 'Grade 6', doctype: 'DLL', week: 'Week 1' },
  { id: '1T2XuLwGwqmWV2qdkLkVefSpGa_4sIdXS', file: 'EPP_6_T1W1_ILAW.docx', subject: 'EPP', grade: 'Grade 6', doctype: 'DLL', week: 'Week 1' },
  { id: '1hvDEivgvlwe9pORyp3RIFJ_-s0e5Ex5Z', file: 'Filipino_6_T1W1_ILAW.docx', subject: 'Filipino', grade: 'Grade 6', doctype: 'DLL', week: 'Week 1' },
  { id: '1FNwFwao4vjT_d0A6hd3CAUfWCGRC0RGd', file: 'GMRC_6_T1W1_ILAW.docx', subject: 'GMRC', grade: 'Grade 6', doctype: 'DLL', week: 'Week 1' },
  { id: '1SKNBTN_beXAVgdZolHvj7W8XGKmwVNwx', file: 'MAPEH_6_T1W1_ILAW.docx', subject: 'MAPEH', grade: 'Grade 6', doctype: 'DLL', week: 'Week 1' },
  { id: '1Z3Lv-l8Y4D3lbHy19QOwesubflc-Fcl7', file: 'Mathematics_6_T1W1_ILAW.docx', subject: 'Mathematics', grade: 'Grade 6', doctype: 'DLL', week: 'Week 1' },
  { id: '19Nu4XSZUO-i2dq8d1dY7TsLG4cFOE4_8', file: 'Science_6_T1W1_ILAW.docx', subject: 'Science', grade: 'Grade 6', doctype: 'DLL', week: 'Week 1' },
  // Week 2 – 8 files
  { id: '1EqNMZmSB4wXZW3rVwYLaUXmBC6BRNn1m', file: 'AP_6_T1W2_ILAW.docx', subject: 'AP', grade: 'Grade 6', doctype: 'DLL', week: 'Week 2' },
  { id: '1K6Vnm3dzts7zGW4zc6qzAMLX_etGqgTr', file: 'English_6_T1W2_ILAW.docx', subject: 'English', grade: 'Grade 6', doctype: 'DLL', week: 'Week 2' },
  { id: '1f7e01ZkMxwy7lzhcaECqUYBfdi67v93S', file: 'EPP_6_T1W2_ILAW.docx', subject: 'EPP', grade: 'Grade 6', doctype: 'DLL', week: 'Week 2' },
  { id: '1I62YdHuKT-46N8mHKcgTFIW1W0xu__bA', file: 'Filipino_6_T1W2_ILAW.docx', subject: 'Filipino', grade: 'Grade 6', doctype: 'DLL', week: 'Week 2' },
  { id: '10-2AKaaOw8b_07VseHDtuVhfxP-Ab5Sm', file: 'GMRC_6_T1W2_ILAW.docx', subject: 'GMRC', grade: 'Grade 6', doctype: 'DLL', week: 'Week 2' },
  { id: '1MzVKCBmkPA8XJfUWFDoA0buXXLLJS50d', file: 'MAPEH_6_T1W2_ILAW.docx', subject: 'MAPEH', grade: 'Grade 6', doctype: 'DLL', week: 'Week 2' },
  { id: '1uvpQ9eqPRIGRLRv-RKJ8S_LdvqnEyPkx', file: 'Mathematics_6_T1W2_ILAW.docx', subject: 'Mathematics', grade: 'Grade 6', doctype: 'DLL', week: 'Week 2' },
  { id: '18JxmKDeNHfuVv2jEom-qiBx4-IY4aXYb', file: 'Science_6_T1W2_ILAW.docx', subject: 'Science', grade: 'Grade 6', doctype: 'DLL', week: 'Week 2' },
  // Week 3 – 9 files (MAPEH split)
  { id: '1jALgIF1IUEWtqJ8JlIlWmNb3s9cosbe_', file: 'AP_6_T1W3_ILAW.docx', subject: 'AP', grade: 'Grade 6', doctype: 'DLL', week: 'Week 3' },
  { id: '14YIfY02iDuzKJQefZ4vR3n670zBWCFqt', file: 'English_6_T1W3_ILAW.docx', subject: 'English', grade: 'Grade 6', doctype: 'DLL', week: 'Week 3' },
  { id: '1lZ5WqVYASlESPtu8NbKXzuhHf9n5RANS', file: 'EPP_6_T1W3_ILAW.docx', subject: 'EPP', grade: 'Grade 6', doctype: 'DLL', week: 'Week 3' },
  { id: '1XoMIswZVFDbm4-rkC89-xtNfBdBOdEAK', file: 'Filipino_6_T1W3_ILAW.docx', subject: 'Filipino', grade: 'Grade 6', doctype: 'DLL', week: 'Week 3' },
  { id: '1Q9TFGfRgcSvK9IkXyLGVO7QwbLLK4Ajf', file: 'GMRC_6_T1W3_ILAW.docx', subject: 'GMRC', grade: 'Grade 6', doctype: 'DLL', week: 'Week 3' },
  { id: '1hyZoKgt8HIewJ5Wj2jne0gj2f9Gq6pjv', file: 'MAPEH_MusicArts_6_T1W3_ILAW.docx', subject: 'MAPEH', grade: 'Grade 6', doctype: 'DLL', week: 'Week 3' },
  { id: '1PpmHVU0gJyflT1NOdABzEu4aBAgoCXwq', file: 'MAPEH_PEHealth_6_T1W3_ILAW.docx', subject: 'MAPEH', grade: 'Grade 6', doctype: 'DLL', week: 'Week 3' },
  { id: '1kZXRsx84zsqoeY1_-i2DI1C3sueBlJCK', file: 'Mathematics_6_T1W3_ILAW.docx', subject: 'Mathematics', grade: 'Grade 6', doctype: 'DLL', week: 'Week 3' },
  { id: '1uzrCxahc5QgtKfjG5_6c2JVDUSioIHFW', file: 'Science_6_T1W3_ILAW.docx', subject: 'Science', grade: 'Grade 6', doctype: 'DLL', week: 'Week 3' },
  // Week 4 – 9 files (MAPEH split)
  { id: '1r6D77H0GR_8UBFG7F8pQ7GoJXofx6b3K', file: 'AP_6_T1W4_ILAW.docx', subject: 'AP', grade: 'Grade 6', doctype: 'DLL', week: 'Week 4' },
  { id: '1SqDSqz5kK6o-Qsd7Xg3uAWM_GyBbj_NY', file: 'English_6_T1W4_ILAW.docx', subject: 'English', grade: 'Grade 6', doctype: 'DLL', week: 'Week 4' },
  { id: '11P8jmOP9aD9Z677oHP-2foop0NpO2Xcm', file: 'EPP_6_T1W4_ILAW.docx', subject: 'EPP', grade: 'Grade 6', doctype: 'DLL', week: 'Week 4' },
  { id: '1ItUrwctYjt7uu7LRH4DIal3Up6b9KtoI', file: 'Filipino_6_T1W4_ILAW.docx', subject: 'Filipino', grade: 'Grade 6', doctype: 'DLL', week: 'Week 4' },
  { id: '1G-BQ5n2GJPzP7atySmao9LQBr82_qAqt', file: 'GMRC_6_T1W4_ILAW.docx', subject: 'GMRC', grade: 'Grade 6', doctype: 'DLL', week: 'Week 4' },
  { id: '1dcARCLlglAHEOWw1uDu3SyzBUYrtLRe6', file: 'MAPEH_MusicArts_6_T1W4_ILAW.docx', subject: 'MAPEH', grade: 'Grade 6', doctype: 'DLL', week: 'Week 4' },
  { id: '1oqTtA_3Pu1kVsmlWu31kQiGWFqXuywQ8', file: 'MAPEH_PEHealth_6_T1W4_ILAW.docx', subject: 'MAPEH', grade: 'Grade 6', doctype: 'DLL', week: 'Week 4' },
  { id: '1C1QTdsFIo8EdfSzaRt_cZrCd4p2pzjjH', file: 'Mathematics_6_T1W4_ILAW.docx', subject: 'Mathematics', grade: 'Grade 6', doctype: 'DLL', week: 'Week 4' },
  { id: '1ue2JS8yWZ47Fg48NrAAWEvyI1vmGadez', file: 'Science_6_T1W4_ILAW.docx', subject: 'Science', grade: 'Grade 6', doctype: 'DLL', week: 'Week 4' },
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
  console.log('=== Downloading 34 Grade 6 ILAW DLLs ===\n');

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

    const headerMatch = text.match(/(GRADE 6 DAILY LESSON LOGS[\s\S]{0,500})/i);
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