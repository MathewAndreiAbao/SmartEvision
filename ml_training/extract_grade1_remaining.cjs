const fs = require('fs');
const path = require('path');
const mammoth = require('mammoth');

const DL_DIR = path.join(__dirname, 'grade1_dlls');
const DATA_DIR = path.join(__dirname, 'data');

function sanitize(t) { return t.replace(/\s+/g, ' ').replace(/["']/g, "'").trim(); }

function makeCSVSafe(t) {
  if (t.includes(',') || t.includes('"') || t.includes('\n')) return '"' + t.replace(/"/g, '""') + '"';
  return t;
}

function loadExisting(p) {
  const s = new Set();
  if (fs.existsSync(p)) {
    fs.readFileSync(p, 'utf8').split('\n').slice(1).forEach(l => { if (l.trim()) s.add(l.trim()); });
  }
  return s;
}

function appendCSV(p, newLines) {
  if (newLines.length > 0) {
    fs.appendFileSync(p, '\n' + newLines.join('\n') + '\n', 'utf8');
  }
}

const extraFiles = [
  { file: 'Language_1_T1W3_ILAW.docx', subj: 'Language', grade: 'Grade 1', doctype: 'DLL' },
  { file: 'Makabansa_1_T1W3_ILAW.docx', subj: 'Makabansa', grade: 'Grade 1', doctype: 'DLL' },
  { file: 'Mathematics_1_T1W4_ILAW.docx', subj: 'Mathematics', grade: 'Grade 1', doctype: 'DLL' },
];

async function main() {
  let total = 0;
  for (const entry of extraFiles) {
    const fp = path.join(DL_DIR, entry.file);
    if (!fs.existsSync(fp)) { console.log('SKIP ' + entry.file); continue; }
    const buf = fs.readFileSync(fp);
    const result = await mammoth.extractRawText({ buffer: buf });
    const text = sanitize(result.value || '');
    if (text.length < 50) { console.log('SKIP ' + entry.file + ' (short text)'); continue; }

    const sections = text.split(/(?=GRADE 1 DAILY LESSON LOGS|ILAW Format|\bIntentions\b|\bPre-Lesson\b|\bFlow\b|\bFormative Assessment\b)/i);
    const allSamples = [{ text, subject: entry.subj, grade: entry.grade, doctype: entry.doctype }];
    for (const chunk of sections) {
      const clean = sanitize(chunk);
      if (clean.length >= 30) allSamples.push({ text: clean, subject: entry.subj, grade: entry.grade, doctype: entry.doctype });
    }
    const headerMatch = text.match(/(GRADE 1 DAILY LESSON LOGS[\s\S]{0,500})/i);
    if (headerMatch) allSamples.push({ text: sanitize(headerMatch[1]), subject: entry.subj, grade: entry.grade, doctype: entry.doctype });

    const paths = {
      grade: path.join(DATA_DIR, 'gradelevel_training.csv'),
      subject: path.join(DATA_DIR, 'subject_training.csv'),
      doctype: path.join(DATA_DIR, 'doctype_training.csv'),
    };

    for (const key of ['grade', 'subject', 'doctype']) {
      const seen = loadExisting(paths[key]);
      const newRows = [];
      for (const row of allSamples) {
        const t = sanitize(row.text);
        if (!t || t.length < 10) continue;
        const csvLine = makeCSVSafe(t) + ',' + row[key];
        if (!seen.has(csvLine)) { newRows.push(csvLine); seen.add(csvLine); }
      }
      appendCSV(paths[key], newRows);
      total += newRows.length;
    }
    console.log('  ' + entry.file + ': ' + allSamples.length + ' samples, ' + text.length + ' chars');
  }

  console.log('\nTotal added (including dedup): ' + total);
  for (const f of ['gradelevel_training.csv', 'subject_training.csv', 'doctype_training.csv']) {
    const fp = path.join(DATA_DIR, f);
    const lines = fs.readFileSync(fp, 'utf8').split('\n').filter(l => l.trim()).length - 1;
    console.log('  ' + f + ': ' + lines + ' rows');
  }
}

main().catch(e => { console.error(e.message); process.exit(1); });