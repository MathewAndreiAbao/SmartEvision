const fs = require('fs');
const path = require('path');
const mammoth = require('mammoth');

const DL_DIR = path.join(__dirname, 'grade6_dlls');
const DATA_DIR = path.join(__dirname, 'data');
const filePath = path.join(DL_DIR, 'EPP_6_T1W4_ILAW.docx');

async function main() {
  const buf = fs.readFileSync(filePath);
  const result = await mammoth.extractRawText({ buffer: buf });
  let text = result.value || '';
  text = text.replace(/\s+/g, ' ').replace(/["']/g, "'").trim();
  if (text.length < 50) { console.log('Too short: ' + text.length); return; }

  const sections = text.split(/(?=Intentions|Pre-Lesson|Flow|Formative Assessment)/i);
  const allSamples = [];
  allSamples.push({ text, subject: 'EPP', grade: 'Grade 6', doctype: 'DLL' });
  for (const chunk of sections) {
    const clean = chunk.replace(/\s+/g, ' ').replace(/["']/g, "'").trim();
    if (clean.length >= 30) allSamples.push({ text: clean, subject: 'EPP', grade: 'Grade 6', doctype: 'DLL' });
  }
  const h = text.match(/(GRADE 6 DAILY LESSON LOGS[\s\S]{0,500})/i);
  if (h) allSamples.push({ text: h[1].replace(/\s+/g, ' ').replace(/["']/g, "'").trim(), subject: 'EPP', grade: 'Grade 6', doctype: 'DLL' });

  function csvSafe(t) {
    if (t.includes(',') || t.includes('"') || t.includes('\n')) return '"' + t.replace(/"/g, '""') + '"';
    return t;
  }

  function loadExisting(p) {
    const seen = new Set();
    if (fs.existsSync(p)) {
      fs.readFileSync(p, 'utf8').split('\n').slice(1).forEach(l => { if (l.trim()) seen.add(l.trim()); });
    }
    return seen;
  }

  function appendToCSV(p, rows, seen, key) {
    let added = 0;
    for (const row of rows) {
      const t = row.text.replace(/\s+/g, ' ').replace(/["']/g, "'").trim();
      if (!t || t.length < 10) continue;
      const line = csvSafe(t) + ',' + row[key];
      if (!seen.has(line)) { added++; fs.appendFileSync(p, '\n' + line + '\n', 'utf8'); seen.add(line); }
    }
    return added;
  }

  const paths = {
    grade: path.join(DATA_DIR, 'gradelevel_training.csv'),
    subject: path.join(DATA_DIR, 'subject_training.csv'),
    doctype: path.join(DATA_DIR, 'doctype_training.csv')
  };

  let total = 0;
  for (const key of ['grade', 'subject', 'doctype']) {
    const seen = loadExisting(paths[key]);
    total += appendToCSV(paths[key], allSamples, seen, key);
  }
  console.log(allSamples.length + ' samples, ' + text.length + ' chars, ' + total + ' new rows');
}
main().catch(e => console.log(e.message));