import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ═══════════════════════════════════════════════════════════════════════════════
// SUBJECT CLASSIFIER — Training Data
// ═══════════════════════════════════════════════════════════════════════════════

const subjectTrainingData = [
    // English Headers
    { text: "School: DepEdClub.com Grade Level: 2 Name of Teacher Learning Area: English Teaching Dates and Time: FEBRUARY 9 - 13, 2026 (WEEK 3) Quarter: 4th", label: "English" },
    { text: "Learning Area English", label: "English" },
    { text: "Subject English Wika", label: "English" },
    { text: "Reading Comprehension Grammar Phonics Vocabulary", label: "English" },

    // Filipino Headers
    { text: "MATATAG K to 10 Kurikulum Lingguhang Aralin Paaralan: DepEdClub.com Baitang: 2 Pangalan ng Guro: Asignatura: FILIPINO Petsa at Oras ng Pagtuturo: FEBRUARY 9 - 13, 2026 (WEEK 3) Markahan at Linggo: Ika-apat na Markahan", label: "Filipino" },
    { text: "Asignatura Filipino Tagalog Wikang Pilipino", label: "Filipino" },
    { text: "Pagbasa Pagsulat Panitikan Wika", label: "Filipino" },

    // Math Headers
    { text: "Learning Area Mathematics Math Matematika", label: "Mathematics" },
    { text: "Asignatura Mathematics Math Numeracy", label: "Mathematics" },
    { text: "Numbers Addition Subtraction Multiplication Division Geometry Algebra Fractions", label: "Mathematics" },

    // Science Headers
    { text: "Learning Area Science Agham", label: "Science" },
    { text: "Asignatura Science Agham", label: "Science" },
    { text: "Biology Physics Chemistry Earth Space Matter Energy Ecosystems", label: "Science" },

    // AP / Social Studies Headers
    { text: "Learning Area Araling Panlipunan AP Social Studies", label: "AP" },
    { text: "Asignatura Araling Panlipunan AP Lipunan", label: "AP" },
    { text: "History Kasaysayan Kultura Heograpiya Ekonomiks", label: "AP" },

    // GMRC Headers
    { text: "Learning Area Edukasyon sa Pagpapakatao ESP GMRC Values Moral", label: "GMRC" },
    { text: "Asignatura Edukasyon sa Pagpapakatao ESP GMRC Values", label: "GMRC" },

    // MAPEH Headers
    { text: "Learning Area MAPEH Arts Music Physical Education Health PE", label: "MAPEH" },
    { text: "Asignatura MAPEH Sining Musika Kalusugan", label: "MAPEH" },

    // EPP / TLE Headers
    { text: "Learning Area EPP Edukasyong Pantahanan at Pangkabuhayan Vocational", label: "EPP" },
    { text: "Asignatura EPP TLE Technology and Livelihood Education", label: "TLE" }
];

// ═══════════════════════════════════════════════════════════════════════════════
// DOCUMENT TYPE CLASSIFIER — Training Data
// Based on real DepEd DLL, ISP, and ISR samples
// ═══════════════════════════════════════════════════════════════════════════════

const docTypeTrainingData = [
    // ── DLL (Daily Lesson Log / Weekly Lesson Log) ──────────────────────────
    // English DLL Header
    {
        text: "MATATAG K to 10 Curriculum Weekly Lesson Log School: DepEdClub.com Grade Level: 2 Name of Teacher Learning Area: English Teaching Dates and Time: FEBRUARY 9 - 13, 2026 (WEEK 3) Quarter: 4th",
        label: "DLL"
    },
    // Filipino DLL Header
    {
        text: "MATATAG K to 10 Kurikulum Lingguhang Aralin Paaralan: DepEdClub.com Baitang: 2 Pangalan ng Guro: Asignatura: FILIPINO Petsa at Oras ng Pagtuturo: FEBRUARY 9 - 13, 2026 (WEEK 3) Markahan at Linggo: Ika-apat na Markahan",
        label: "DLL"
    },
    // DLL Section Structure - English
    {
        text: "Content Standards Performance Standards Learning Competencies Learning Objectives Content Learning Resources Teaching and Learning Procedures Activating Prior Knowledge Lesson Purpose Reading the Key Idea Developing Understanding Deepening Understanding Evaluating Learning Remarks Reflection",
        label: "DLL"
    },
    // DLL Section Structure - Filipino
    {
        text: "Pamantayang Pangnilalaman Pamantayan sa Pagganap Mga Kasanayang Pampagkatuto Mga Layunin Nilalaman Mga Kagamitang Panturo Mga Pamaraang Panturo Panimulang Gawain Gawaing Paglalahad Pagbasa Pagtataya Mga Tala Repleksiyon",
        label: "DLL"
    },
    // DLL content keywords
    {
        text: "Daily Lesson Log Lesson Plan Detalyadong Plano Banghay Aralin Pang-araw-araw na Tala Weekly Lesson Log DAY 1 DAY 2 DAY 3 DAY 4 Before Lesson During Lesson After Lesson Pre-Lesson Post-Lesson",
        label: "DLL"
    },
    // DLL subject integration markers
    {
        text: "Curriculum Content Standards Lesson Competencies Learning Objectives Additional Activities Application Remediation Making Generalizations Abstractions",
        label: "DLL"
    },

    // ── ISP (Instructional Supervisory Plan) ────────────────────────────────
    {
        text: "INSTRUCTIONAL SUPERVISORY PLAN School Year 2017-2018 Objectives During the School Year the teachers shall be able to Upgrade the quality of classroom instruction through regular monitoring and observation",
        label: "ISP"
    },
    {
        text: "Program Improvement Areas Targets for Program Improvement Means of Verification Strategies for School Improvement Time Frame Persons Involved",
        label: "ISP"
    },
    {
        text: "Regular monitoring of teachers attendance and actual classroom teaching Quality classroom instruction Monthly Pop-in visits Monthly Classroom observation Monthly Pre-observation Conference Monthly Post-Observation Conference Teacher Observation Guide",
        label: "ISP"
    },
    {
        text: "Improvement of student academic achievement Dissemination of least mastered skills Continuous Improvement Program Teacher Training Action Research Community Support for Classroom Instruction",
        label: "ISP"
    },
    {
        text: "Supervisory Plan Division Coordinator School Principal Head Teacher Classroom Teachers Supervision Monitoring Instructional Supervisory",
        label: "ISP"
    },
    {
        text: "Implement programs to help increase the level of student academic achievement Assist the students to achieve a better quality of life provision of needed knowledge skills values attitudes and resources",
        label: "ISP"
    },

    // ── ISR (Instructional Supervisory Report) ──────────────────────────────
    {
        text: "CURRICULUM IMPLEMENTATION DIVISION MONTHLY INSTRUCTIONAL SUPERVISORY REPORT MONTH SEPTEMBER",
        label: "ISR"
    },
    {
        text: "KRA OBJECTIVE STRATEGIES ACTIVITIES DATE KEY PERSONS INVOLVED FOCUS AREA TARGET ACTUAL NAME OF TEACHER OBSERVED FINDINGS TA PROVIDED REMARKS",
        label: "ISR"
    },
    {
        text: "Curriculum Instruction Development Upgrade the quality of classroom instruction through utilization of localized curriculum Classroom observation Content and Pedagogy",
        label: "ISR"
    },
    {
        text: "The teacher was able to execute the lesson chronologically based on the DLL she prepared The objectives the activities the evaluation and the assignment given are congruent to one another",
        label: "ISR"
    },
    {
        text: "The observer suggested the teacher to present the poem by stanzas so that the pupils can have a better understanding and interpretation of the poem",
        label: "ISR"
    },
    {
        text: "Instructional Supervisory Report Submitted by Master Teacher Noted by Principal Monthly Report Teacher Observed Findings Remarks TA Provided",
        label: "ISR"
    }
];

// ═══════════════════════════════════════════════════════════════════════════════
// TOKENIZER
// ═══════════════════════════════════════════════════════════════════════════════

function tokenize(text) {
    return text.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(w => w.length > 2);
}

// ═══════════════════════════════════════════════════════════════════════════════
// NAIVE BAYES TRAINER
// ═══════════════════════════════════════════════════════════════════════════════

function trainModel(trainingData, modelName) {
    console.log(`\nTraining "${modelName}" Naive Bayes Classifier...`);

    let vocabulary = new Set();
    let classCounts = {};
    let wordCountsPerClass = {};
    let totalDocs = trainingData.length;

    // First pass: collect vocabulary and document counts per class
    trainingData.forEach(doc => {
        const tokens = tokenize(doc.text);
        const label = doc.label;

        if (!classCounts[label]) {
            classCounts[label] = 0;
            wordCountsPerClass[label] = {};
        }
        classCounts[label]++;

        tokens.forEach(token => {
            vocabulary.add(token);
            wordCountsPerClass[label][token] = (wordCountsPerClass[label][token] || 0) + 1;
        });
    });

    // Calculate probabilities
    let model = {
        classes: {},
        vocabularySize: vocabulary.size
    };

    const V = vocabulary.size;

    for (let label in classCounts) {
        let totalWordsInClass = 0;
        for (let word in wordCountsPerClass[label]) {
            totalWordsInClass += wordCountsPerClass[label][word];
        }

        model.classes[label] = {
            priorProbability: Math.log(classCounts[label] / totalDocs),
            wordProbabilities: {}
        };

        // Calculate conditional probability with Laplace smoothing
        vocabulary.forEach(word => {
            const count = wordCountsPerClass[label][word] || 0;
            const prob = Math.log((count + 1) / (totalWordsInClass + V));
            model.classes[label].wordProbabilities[word] = prob;
        });

        // Default probability for words not seen in training
        model.classes[label].defaultWordProb = Math.log(1 / (totalWordsInClass + V));
    }

    return { model, V, totalDocs };
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════════

function main() {
    const outputDir = path.join(__dirname, '../src/lib/models');
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    // Train Subject Classifier
    const subjectResult = trainModel(subjectTrainingData, "Subject");
    const subjectOutputPath = path.join(outputDir, 'subject_classifier_model.json');
    fs.writeFileSync(subjectOutputPath, JSON.stringify(subjectResult.model, null, 2));
    console.log(`✅ Subject model: ${subjectResult.totalDocs} samples, ${subjectResult.V} vocab → ${subjectOutputPath}`);

    // Train Document Type Classifier
    const docTypeResult = trainModel(docTypeTrainingData, "Document Type");
    const docTypeOutputPath = path.join(outputDir, 'doctype_classifier_model.json');
    fs.writeFileSync(docTypeOutputPath, JSON.stringify(docTypeResult.model, null, 2));
    console.log(`✅ DocType model: ${docTypeResult.totalDocs} samples, ${docTypeResult.V} vocab → ${docTypeOutputPath}`);

    console.log("\n🎯 All models trained successfully!");
}

main();
