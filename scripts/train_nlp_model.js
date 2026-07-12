/**
 * ML Training Pipeline — Naive Bayes Classifiers
 * Trains: Subject Classifier, Grade Level Classifier, Document Type Classifier
 * Outputs: Model JSON files + Training Results with metrics for capstone
 *
 * Usage: node scripts/train_nlp_model.js
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// =============================================================================
// TRAINING DATA GENERATION
// =============================================================================

const SUBJECTS = ['English', 'Filipino', 'Mathematics', 'Science', 'AP', 'GMRC', 'MAPEH', 'EPP', 'TLE'];
const GRADE_LEVELS = ['Kindergarten', 'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6'];
const DOC_TYPES = ['DLL', 'ISP', 'ISR'];

const SCHOOLS = [
    'DepEdClub.com', 'Calapan Central School', 'Maya Elementary School',
    'San Vicente Elementary School', 'Sta. Maria Elementary School',
    'Navotas Elementary School', 'Talahib Elementary School', 'Sapad Elementary School',
    'Guinobatan Elementary School', 'Bancoro Elementary School'
];

const TEACHERS = [
    'Maria Santos', 'Juan Cruz', 'Ana Gonzales', 'Pedro Reyes', 'Liza Mercado',
    'Ramon Villanueva', 'Cecilia Lopez', 'Roberto Garcia', 'Linda Fernandez', 'Mark Dela Cruz'
];

function generateSubjectSamples() {
    const samples = [];

    const subjectKeywords = {
        'English': ['English', 'Reading', 'Grammar', 'Vocabulary', 'Phonics', 'Comprehension', 'Writing', 'Spelling', 'Language', 'Wika', 'Communication', 'Literature'],
        'Filipino': ['Filipino', 'Tagalog', 'Pagbasa', 'Pagsulat', 'Wika', 'Panitikan', 'Gramatika', 'Pagpapahayag', 'Asignatura Filipino'],
        'Mathematics': ['Mathematics', 'Math', 'Matematika', 'Numbers', 'Addition', 'Subtraction', 'Multiplication', 'Division', 'Geometry', 'Fractions', 'Numeracy'],
        'Science': ['Science', 'Agham', 'Biology', 'Physics', 'Chemistry', 'Earth Science', 'Matter', 'Energy', 'Ecosystems', 'Environment'],
        'AP': ['Araling Panlipunan', 'AP', 'Social Studies', 'History', 'Heograpiya', 'Ekonomiks', 'Kultura', 'Kasaysayan', 'Sibika'],
        'GMRC': ['GMRC', 'Edukasyon sa Pagpapakatao', 'ESP', 'Values', 'Moral', 'Character', 'Values Education', 'Good Manners'],
        'MAPEH': ['MAPEH', 'Music', 'Arts', 'Physical Education', 'Health', 'PE', 'Musika', 'Sining', 'Kalusugan'],
        'EPP': ['EPP', 'Edukasyong Pantahanan', 'Agriculture', 'Agrikultura', 'Entrepreneurship', 'ICT', 'Home Economics'],
        'TLE': ['TLE', 'Technology and Livelihood', 'Cookery', 'Bread and Pastry', 'Dressmaking', 'Caregiving', 'Technical Skills']
    };

    for (const subject of SUBJECTS) {
        const keywords = subjectKeywords[subject];

        // English format DLL headers
        for (let i = 0; i < 12; i++) {
            const school = SCHOOLS[i % SCHOOLS.length];
            const teacher = TEACHERS[i % TEACHERS.length];
            const week = Math.floor(Math.random() * 13) + 1;
            const month = ['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE', 'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'][i % 12];
            const day = Math.floor(Math.random() * 20) + 1;
            const grade = Math.floor(Math.random() * 6) + 1;
            const quarter = Math.floor(Math.random() * 4) + 1;

            samples.push({
                text: `MATATAG K to 10 Curriculum Weekly Lesson Log School: ${school} Grade Level: ${grade} Name of Teacher: ${teacher} Learning Area: ${keywords[0]} Teaching Dates and Time: ${month} ${day} - ${day + 4}, 2026 (WEEK ${week}) Quarter: ${quarter}th`,
                label: subject
            });
        }

        // Filipino format DLL headers
        for (let i = 0; i < 8; i++) {
            const school = SCHOOLS[(i + 3) % SCHOOLS.length];
            const teacher = TEACHERS[(i + 5) % TEACHERS.length];
            const week = Math.floor(Math.random() * 13) + 14;
            const month = ['ENERO', 'PEBRERO', 'MARSO', 'ABRIL', 'MAYO', 'HUNYO', 'HULYO', 'AGOSTO', 'SEPTIYEMBRE', 'OKTUBRE', 'NOBYEMBRE', 'DISYEMBRE'][i % 12];
            const day = Math.floor(Math.random() * 20) + 1;
            const grade = Math.floor(Math.random() * 6) + 1;
            const quarter = Math.floor(Math.random() * 4) + 1;

            const filipinoSubjects = {
                'English': 'ENGLISH',
                'Filipino': 'FILIPINO',
                'Mathematics': 'MATHEMATICS',
                'Science': 'SCIENCE',
                'AP': 'ARALING PANLIPUNAN',
                'GMRC': 'GMRC',
                'MAPEH': 'MAPEH',
                'EPP': 'EPP',
                'TLE': 'TLE'
            };

            samples.push({
                text: `MATATAG K to 10 Kurikulum Lingguhang Aralin Paaralan: ${school} Baitang: ${grade} Pangalan ng Guro: ${teacher} Asignatura: ${filipinoSubjects[subject]} Petsa at Oras ng Pagtuturo: ${month} ${day} - ${day + 4}, 2026 (LINGGO ${week}) Markahan at Linggo: Ika-${quarter} na Markahan`,
                label: subject
            });
        }

        // Keyword-heavy samples (for robustness)
        for (let i = 0; i < 6; i++) {
            const shuffled = [...keywords].sort(() => Math.random() - 0.5);
            samples.push({
                text: `Learning Area ${shuffled.slice(0, 5).join(' ')} ${subject} Curriculum Content Standards Performance Standards`,
                label: subject
            });
        }

        // Section header samples
        const sectionHeaders = {
            'English': 'Reading Comprehension Phonics Grammar Vocabulary Writing Spelling English Language Arts',
            'Filipino': 'Pagbasa Pag-unawa Gramatika Bokabularyo Pagsulat Filipino Wika',
            'Mathematics': 'Numbers Operations Algebra Geometry Measurement Data Statistics Mathematics',
            'Science': 'Matter Energy Force Motion Living Things Earth Science Environment',
            'AP': 'History Heograpiya Ekonomiks Pamahalaan Kultura Araling Panlipunan',
            'GMRC': 'Values Education Character Building Moral Ethics GMRC Pagpapakatao',
            'MAPEH': 'Music Arts Physical Education Health Fitness MAPEH',
            'EPP': 'ICT Agriculture Entrepreneurship Home Economics EPP',
            'TLE': 'Cookery Dressmaking Bread and Pastry Caregiving Technical TLE'
        };

        samples.push({
            text: sectionHeaders[subject],
            label: subject
        });
    }

    return samples;
}

function generateGradeLevelSamples() {
    const samples = [];

    const gradeContent = {
        'Kindergarten': ['Kindergarten', 'Kinder', 'Pre-school', 'Reading Readiness', 'Letter Recognition', 'Phonological Awareness'],
        'Grade 1': ['Grade 1', 'Baitang 1', 'Gr. 1', 'Reading and Literacy', 'Language', 'Makabansa'],
        'Grade 2': ['Grade 2', 'Baitang 2', 'Gr. 2', 'Reading', 'Writing', 'Numeracy'],
        'Grade 3': ['Grade 3', 'Baitang 3', 'Gr. 3', 'Science', 'Social Studies', 'GMRC'],
        'Grade 4': ['Grade 4', 'Baitang 4', 'Gr. 4', 'Science', 'MAPEH', 'EPP', 'Araling Panlipunan'],
        'Grade 5': ['Grade 5', 'Baitang 5', 'Gr. 5', 'Advanced Reading', 'Mathematics', 'Science', 'Filipino'],
        'Grade 6': ['Grade 6', 'Baitang 6', 'Gr. 6', 'Advanced Mathematics', 'Science', 'English', 'Graduating']
    };

    for (const grade of GRADE_LEVELS) {
        const content = gradeContent[grade];

        for (let i = 0; i < 15; i++) {
            const school = SCHOOLS[i % SCHOOLS.length];
            const teacher = TEACHERS[(i + 2) % TEACHERS.length];
            const week = Math.floor(Math.random() * 13) + 1;
            const month = ['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE', 'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'][i % 12];
            const day = Math.floor(Math.random() * 20) + 1;

            const gradeLabel = grade;
            const subject = content[Math.floor(Math.random() * content.length)];

            samples.push({
                text: `MATATAG K to 10 Curriculum Weekly Lesson Log School: ${school} Grade Level: ${gradeLabel} Name of Teacher: ${teacher} Learning Area: ${subject} Teaching Dates and Time: ${month} ${day} - ${day + 4}, 2026 (WEEK ${week})`,
                label: grade
            });
        }

        for (let i = 0; i < 10; i++) {
            const school = SCHOOLS[(i + 4) % SCHOOLS.length];
            const teacher = TEACHERS[(i + 7) % TEACHERS.length];
            const week = Math.floor(Math.random() * 13) + 14;
            const month = ['ENERO', 'PEBRERO', 'MARSO', 'ABRIL', 'MAYO', 'HUNYO', 'HULYO', 'AGOSTO', 'SEPTIYEMBRE', 'OKTUBRE', 'NOBYEMBRE', 'DISYEMBRE'][i % 12];
            const day = Math.floor(Math.random() * 20) + 1;

            const gradeLabel = ['Kindergarten', 'Baitang 1', 'Baitang 2', 'Baitang 3', 'Baitang 4', 'Baitang 5', 'Baitang 6'][GRADE_LEVELS.indexOf(grade)];
            const subject = content[Math.floor(Math.random() * content.length)];

            samples.push({
                text: `MATATAG K to 10 Kurikulum Lingguhang Aralin Paaralan: ${school} Baitang: ${gradeLabel} Pangalan ng Guro: ${teacher} Asignatura: ${subject} Petsa at Oras ng Pagtuturo: ${month} ${day} - ${day + 4}, 2026 (LINGGO ${week})`,
                label: grade
            });
        }

        // Short format samples
        for (let i = 0; i < 6; i++) {
            const shortGrade = grade === 'Kindergarten' ? 'Kinder' : `Gr. ${grade.replace('Grade ', '')}`;
            samples.push({
                text: `${shortGrade} ${content.slice(0, 3).join(' ')} Lesson Plan Weekly Lesson Log DLL`,
                label: grade
            });
        }
    }

    return samples;
}

function generateDocTypeSamples() {
    const samples = [];

    // DLL samples
    const dllHeaders = [
        'MATATAG K to 10 Curriculum Weekly Lesson Log',
        'Daily Lesson Log',
        'Lingguhang Aralin',
        'Pang-araw-araw na Tala sa Pagtuturo',
        'Weekly Learning Plan',
        'Banghay Aralin',
        'Detalyadong Banghay Aralin',
        'Lesson Plan'
    ];

    const dllSections = [
        'Content Standards Performance Standards Learning Competencies Learning Objectives',
        'Pamantayang Pangnilalaman Pamantayan sa Pagganap Mga Kasanayang Pampagkatuto',
        'Teaching and Learning Procedures Activating Prior Knowledge Lesson Purpose',
        'Developing Understanding Deepening Understanding Evaluating Learning Remarks Reflection',
        'Mga Pamaraang Panturo Panimulang Gawain Gawaing Paglalahad Pagbasa Pagtataya',
        'Content Learning Resources Teaching and Learning Procedures',
        'Activating Prior Knowledge Lesson Purpose Reading the Key Idea'
    ];

    for (let i = 0; i < 15; i++) {
        const school = SCHOOLS[i % SCHOOLS.length];
        const grade = Math.floor(Math.random() * 6) + 1;
        const subject = SUBJECTS[i % SUBJECTS.length];
        const week = Math.floor(Math.random() * 13) + 1;
        const section = dllSections[i % dllSections.length];
        const header = dllHeaders[i % dllHeaders.length];

        samples.push({
            text: `${header} School: ${school} Grade Level: ${grade} Learning Area: ${subject} WEEK ${week} ${section}`,
            label: 'DLL'
        });
    }

    for (let i = 0; i < 10; i++) {
        samples.push({
            text: `${dllSections[(i + 3) % dllSections.length]} DAY ${Math.floor(Math.random() * 5) + 1} ${dllHeaders[(i + 2) % dllHeaders.length]}`,
            label: 'DLL'
        });
    }

    // ISP samples
    const ispHeaders = [
        'INSTRUCTIONAL SUPERVISORY PLAN',
        'School Year 2026-2027 Instructional Supervisory Plan',
        'Supervisory Plan',
        'School Improvement Plan'
    ];

    const ispContent = [
        'Program Improvement Areas Targets for Program Improvement Means of Verification Strategies for School Improvement Time Frame Persons Involved',
        'Regular monitoring of teachers attendance and actual classroom teaching Quality classroom instruction Monthly Pop-in visits Monthly Classroom observation',
        'Improvement of student academic achievement Dissemination of least mastered skills Continuous Improvement Program Teacher Training',
        'Supervisory Plan Division Coordinator School Principal Head Teacher Classroom Teachers Supervision Monitoring Instructional Supervisory',
        'Objectives During the School Year the teachers shall be able to Upgrade the quality of classroom instruction through regular monitoring and observation'
    ];

    for (let i = 0; i < 12; i++) {
        const school = SCHOOLS[(i + 2) % SCHOOLS.length];
        const header = ispHeaders[i % ispHeaders.length];
        const content = ispContent[i % ispContent.length];

        samples.push({
            text: `${header} School: ${school} ${content}`,
            label: 'ISP'
        });
    }

    for (let i = 0; i < 8; i++) {
        samples.push({
            text: `ISP ${ispContent[(i + 2) % ispContent.length]} School: ${SCHOOLS[i % SCHOOLS.length]}`,
            label: 'ISP'
        });
    }

    // ISR samples
    const isrHeaders = [
        'CURRICULUM IMPLEMENTATION DIVISION MONTHLY INSTRUCTIONAL SUPERVISORY REPORT',
        'Instructional Supervisory Report',
        'Monthly Supervisory Report',
        'Supervisory Report'
    ];

    const isrContent = [
        'KRA OBJECTIVE STRATEGIES ACTIVITIES DATE KEY PERSONS INVOLVED FOCUS AREA TARGET ACTUAL NAME OF TEACHER OBSERVED FINDINGS TA PROVIDED REMARKS',
        'The teacher was able to execute the lesson chronologically based on the DLL she prepared The objectives the activities the evaluation and the assignment given are congruent to one another',
        'The observer suggested the teacher to present the poem by stanzas so that the pupils can have a better understanding and interpretation of the poem',
        'Instructional Supervisory Report Submitted by Master Teacher Noted by Principal Monthly Report Teacher Observed Findings Remarks TA Provided',
        'Curriculum Instruction Development Upgrade the quality of classroom instruction through utilization of localized curriculum Classroom observation'
    ];

    for (let i = 0; i < 12; i++) {
        const school = SCHOOLS[(i + 5) % SCHOOLS.length];
        const header = isrHeaders[i % isrHeaders.length];
        const teacher = TEACHERS[(i + 3) % TEACHERS.length];
        const content = isrContent[i % isrContent.length];

        samples.push({
            text: `${header} School: ${school} Teacher Observed: ${teacher} Month: ${['SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'][i % 4]} ${content}`,
            label: 'ISR'
        });
    }

    for (let i = 0; i < 8; i++) {
        samples.push({
            text: `ISR ${isrContent[(i + 1) % isrContent.length]} Teacher: ${TEACHERS[(i + 6) % TEACHERS.length]}`,
            label: 'ISR'
        });
    }

    return samples;
}

// =============================================================================
// NAIVE BAYES TRAINER
// =============================================================================
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
function trainModel(trainingData) {
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
        model.classes[label].defaultWordProb = Math.log(1 / (totalWordsInClass + V));
    }

    return { model, totalDocs, vocabularySize: V };
}

// =============================================================================
// CROSS-VALIDATION & METRICS
// =============================================================================

function kFoldSplit(data, k = 5) {
    const shuffled = [...data].sort(() => Math.random() - 0.5);
    const folds = [];
    const foldSize = Math.floor(shuffled.length / k);

    for (let i = 0; i < k; i++) {
        const testStart = i * foldSize;
        const testEnd = i === k - 1 ? shuffled.length : testStart + foldSize;
        const testSet = shuffled.slice(testStart, testEnd);
        const trainSet = [...shuffled.slice(0, testStart), ...shuffled.slice(testEnd)];
        folds.push({ train: trainSet, test: testSet });
    }

    return folds;
}

function predict(tokens, model) {
    let bestClass = null;
    let maxLogProb = -Infinity;
    const scores = [];

    for (const [label, classData] of Object.entries(model.classes)) {
        let logProb = classData.priorProbability;

        for (const token of tokens) {
            if (classData.wordProbabilities[token] !== undefined) {
                logProb += classData.wordProbabilities[token];
            } else {
                logProb += classData.defaultWordProb;
            }
        }

        scores.push({ label, prob: logProb });

        if (logProb > maxLogProb) {
            maxLogProb = logProb;
            bestClass = label;
        }
    }

    if (!bestClass) return { label: null, confidence: 0 };

    let sumExp = 0;
    for (const s of scores) sumExp += Math.exp(s.prob - maxLogProb);
    const confidenceScore = (1 / sumExp) * 100;

    return {
        label: bestClass,
        confidence: confidenceScore > 40 ? Math.round(confidenceScore) : 0
    };
}

function evaluateModel(trainedModel, testData) {
    const classLabels = [...new Set(testData.map(d => d.label))].sort();
    const confusionMatrix = {};
    const metrics = {};

    classLabels.forEach(trueLabel => {
        confusionMatrix[trueLabel] = {};
        classLabels.forEach(predLabel => {
            confusionMatrix[trueLabel][predLabel] = 0;
        });
        metrics[trueLabel] = { tp: 0, fp: 0, fn: 0, tn: 0, precision: 0, recall: 0, f1: 0, support: 0 };
    });

    let correct = 0;

    testData.forEach(doc => {
        const tokens = tokenize(doc.text);
        const prediction = predict(tokens, trainedModel);
        const trueLabel = doc.label;
        const predLabel = prediction.label || 'Unknown';

        if (predLabel === trueLabel) correct++;

        if (confusionMatrix[trueLabel]) {
            if (confusionMatrix[trueLabel][predLabel] !== undefined) {
                confusionMatrix[trueLabel][predLabel]++;
            }
        }

        classLabels.forEach(label => {
            if (label === trueLabel && label === predLabel) metrics[label].tp++;
            else if (label !== trueLabel && label === predLabel) metrics[label].fp++;
            else if (label === trueLabel && label !== predLabel) metrics[label].fn++;
            else metrics[label].tn++;
        });
    });

    const accuracy = (correct / testData.length) * 100;

    classLabels.forEach(label => {
        const m = metrics[label];
        m.precision = m.tp + m.fp > 0 ? (m.tp / (m.tp + m.fp)) * 100 : 0;
        m.recall = m.tp + m.fn > 0 ? (m.tp / (m.tp + m.fn)) * 100 : 0;
        m.f1 = m.precision + m.recall > 0 ? (2 * m.precision * m.recall) / (m.precision + m.recall) : 0;
        m.support = testData.filter(d => d.label === label).length;
        m.precision = Math.round(m.precision * 100) / 100;
        m.recall = Math.round(m.recall * 100) / 100;
        m.f1 = Math.round(m.f1 * 100) / 100;
    });

    return {
        accuracy: Math.round(accuracy * 100) / 100,
        confusionMatrix,
        perClass: metrics
    };
}

function runCrossValidation(data, k = 5, modelName) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`  ${modelName} - ${k}-Fold Cross-Validation`);
    console.log(`  Total samples: ${data.length}`);
    console.log(`${'='.repeat(60)}`);

    const folds = kFoldSplit(data, k);
    let totalAccuracy = 0;
    let foldResults = [];

    folds.forEach((fold, i) => {
        const { model } = trainModel(fold.train);
        const evalResult = evaluateModel(model, fold.test);
        console.log(`  Fold ${i + 1}: Accuracy = ${evalResult.accuracy}%`);
        totalAccuracy += evalResult.accuracy;
        foldResults.push(evalResult);
    });

    const meanAccuracy = totalAccuracy / k;
    console.log(`  Mean Accuracy: ${meanAccuracy.toFixed(2)}%`);

    // Full training on all data
    const { model, totalDocs, vocabularySize } = trainModel(data);
    const fullEval = evaluateModel(model, data);

    return {
        model,
        metadata: { totalSamples: totalDocs, vocabularySize, modelName },
        crossValidation: {
            folds: k,
            foldResults,
            meanAccuracy: Math.round(meanAccuracy * 100) / 100
        },
        evaluation: fullEval
    };
}

// =============================================================================
// FORMAT CONFUSION MATRIX FOR CONSOLE
// =============================================================================

function printConfusionMatrix(confusionMatrix, classLabels) {
    const cellWidth = 14;
    const header = ' '.repeat(cellWidth) + classLabels.map(l => l.padStart(cellWidth)).join('');
    console.log(`\n  Confusion Matrix:`);
    console.log(`  ${header}`);

    classLabels.forEach(trueLabel => {
        const row = trueLabel.padStart(cellWidth);
        const cells = classLabels.map(predLabel => {
            const val = confusionMatrix[trueLabel][predLabel];
            return String(val).padStart(cellWidth);
        }).join('');
        console.log(`  ${row}${cells}`);
    });
    console.log(`  (Rows = True, Columns = Predicted)`);
}

function printMetrics(perClass) {
    console.log(`\n  Per-Class Metrics:`);
    console.log(`  ${'Class'.padStart(12)} ${'Precision'.padStart(10)} ${'Recall'.padStart(10)} ${'F1'.padStart(10)} ${'Support'.padStart(10)}`);
    console.log(`  ${'-'.repeat(52)}`);

    const classes = Object.keys(perClass).sort();
    classes.forEach(label => {
        const m = perClass[label];
        console.log(`  ${label.padStart(12)} ${String(m.precision).padStart(10)} ${String(m.recall).padStart(10)} ${String(m.f1).padStart(10)} ${String(m.support).padStart(10)}`);
    });
}

// =============================================================================
// MAIN
// =============================================================================

function main() {
    console.log(`\n${'█'.repeat(60)}`);
    console.log(`  ML TRAINING PIPELINE — NAIVE BAYES CLASSIFIERS`);
    console.log(`  SmartEvision DepEd Document Management System`);
    console.log(`${'█'.repeat(60)}\n`);

    const outputDir = path.join(__dirname, '../src/lib/models');
    const resultsDir = path.join(__dirname, '../ml_results');
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
    if (!fs.existsSync(resultsDir)) fs.mkdirSync(resultsDir, { recursive: true });

    // ── 1. SUBJECT CLASSIFIER ──
    console.log(`\n${'─'.repeat(60)}`);
    console.log(`  PHASE 1: SUBJECT CLASSIFIER`);
    console.log(`${'─'.repeat(60)}`);

    const subjectData = generateSubjectSamples();
    const subjectResult = runCrossValidation(subjectData, 5, 'Subject Classifier');
    printConfusionMatrix(subjectResult.evaluation.confusionMatrix, [...new Set(subjectData.map(d => d.label))].sort());
    printMetrics(subjectResult.evaluation.perClass);

    const subjectModelPath = path.join(outputDir, 'subject_classifier_model.json');
    fs.writeFileSync(subjectModelPath, JSON.stringify(subjectResult.model, null, 2));
    console.log(`\n  ✅ Subject model saved: ${subjectModelPath}`);

    // ── 2. GRADE LEVEL CLASSIFIER ──
    console.log(`\n${'─'.repeat(60)}`);
    console.log(`  PHASE 2: GRADE LEVEL CLASSIFIER`);
    console.log(`${'─'.repeat(60)}`);

    const gradeData = generateGradeLevelSamples();
    const gradeResult = runCrossValidation(gradeData, 5, 'Grade Level Classifier');
    printConfusionMatrix(gradeResult.evaluation.confusionMatrix, GRADE_LEVELS);
    printMetrics(gradeResult.evaluation.perClass);

    const gradeModelPath = path.join(outputDir, 'gradelevel_classifier_model.json');
    fs.writeFileSync(gradeModelPath, JSON.stringify(gradeResult.model, null, 2));
    console.log(`\n  ✅ Grade level model saved: ${gradeModelPath}`);

    // ── 3. DOCUMENT TYPE CLASSIFIER ──
    console.log(`\n${'─'.repeat(60)}`);
    console.log(`  PHASE 3: DOCUMENT TYPE CLASSIFIER`);
    console.log(`${'─'.repeat(60)}`);

    const docTypeData = generateDocTypeSamples();
    const docTypeResult = runCrossValidation(docTypeData, 5, 'Document Type Classifier');
    printConfusionMatrix(docTypeResult.evaluation.confusionMatrix, DOC_TYPES);
    printMetrics(docTypeResult.evaluation.perClass);

    const docTypeModelPath = path.join(outputDir, 'doctype_classifier_model.json');
    fs.writeFileSync(docTypeModelPath, JSON.stringify(docTypeResult.model, null, 2));
    console.log(`\n  ✅ DocType model saved: ${docTypeModelPath}`);

    // ── 4. SAVE TRAINING RESULTS ──
    const results = {
        trainingDate: new Date().toISOString(),
        classifiers: {
            subject: subjectResult.metadata,
            gradeLevel: gradeResult.metadata,
            docType: docTypeResult.metadata
        },
        subjectEvaluation: {
            accuracy: subjectResult.evaluation.accuracy,
            confusionMatrix: subjectResult.evaluation.confusionMatrix,
            perClass: subjectResult.evaluation.perClass,
            crossValidation: subjectResult.crossValidation
        },
        gradeLevelEvaluation: {
            accuracy: gradeResult.evaluation.accuracy,
            confusionMatrix: gradeResult.evaluation.confusionMatrix,
            perClass: gradeResult.evaluation.perClass,
            crossValidation: gradeResult.crossValidation
        },
        docTypeEvaluation: {
            accuracy: docTypeResult.evaluation.accuracy,
            confusionMatrix: docTypeResult.evaluation.confusionMatrix,
            perClass: docTypeResult.evaluation.perClass,
            crossValidation: docTypeResult.crossValidation
        }
    };

    const resultsPath = path.join(resultsDir, 'training_results.json');
    fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2));
    console.log(`\n✅ Training results saved: ${resultsPath}`);

    // ── 5. SAVE HUMAN-READABLE REPORT ──
    let report = `
╔══════════════════════════════════════════════════════════════════╗
║           ML TRAINING REPORT — NAIVE BAYES CLASSIFIERS          ║
║           SmartEvision DepEd Document Management System         ║
╚══════════════════════════════════════════════════════════════════╝

Training Date: ${new Date().toISOString()}

┌────────────────────────────────────────────────────────────────┐
│ 1. SUBJECT CLASSIFIER                                          │
└────────────────────────────────────────────────────────────────┘
   Classes: ${SUBJECTS.join(', ')}
   Training Samples: ${subjectResult.metadata.totalSamples}
   Vocabulary Size: ${subjectResult.metadata.vocabularySize}
   Overall Accuracy: ${subjectResult.evaluation.accuracy}%
   Cross-Validation (5-Fold): ${subjectResult.crossValidation.meanAccuracy}%

   Confusion Matrix (Rows=True, Columns=Predicted):
${formatConfusionMatrixText(subjectResult.evaluation.confusionMatrix, [...new Set(subjectData.map(d => d.label))].sort())}

   Per-Class Metrics:
${formatMetricsText(subjectResult.evaluation.perClass)}

┌────────────────────────────────────────────────────────────────┐
│ 2. GRADE LEVEL CLASSIFIER                                      │
└────────────────────────────────────────────────────────────────┘
   Classes: ${GRADE_LEVELS.join(', ')}
   Training Samples: ${gradeResult.metadata.totalSamples}
   Vocabulary Size: ${gradeResult.metadata.vocabularySize}
   Overall Accuracy: ${gradeResult.evaluation.accuracy}%
   Cross-Validation (5-Fold): ${gradeResult.crossValidation.meanAccuracy}%

   Confusion Matrix (Rows=True, Columns=Predicted):
${formatConfusionMatrixText(gradeResult.evaluation.confusionMatrix, GRADE_LEVELS)}

   Per-Class Metrics:
${formatMetricsText(gradeResult.evaluation.perClass)}

┌────────────────────────────────────────────────────────────────┐
│ 3. DOCUMENT TYPE CLASSIFIER                                    │
└────────────────────────────────────────────────────────────────┘
   Classes: ${DOC_TYPES.join(', ')}
   Training Samples: ${docTypeResult.metadata.totalSamples}
   Vocabulary Size: ${docTypeResult.metadata.vocabularySize}
   Overall Accuracy: ${docTypeResult.evaluation.accuracy}%
   Cross-Validation (5-Fold): ${docTypeResult.crossValidation.meanAccuracy}%

   Confusion Matrix (Rows=True, Columns=Predicted):
${formatConfusionMatrixText(docTypeResult.evaluation.confusionMatrix, DOC_TYPES)}

   Per-Class Metrics:
${formatMetricsText(docTypeResult.evaluation.perClass)}

┌────────────────────────────────────────────────────────────────┐
│ SUMMARY                                                        │
└────────────────────────────────────────────────────────────────┘
   Classifier           │ Samples │ Vocab │ Accuracy │ CV Mean
   ─────────────────────┼─────────┼───────┼──────────┼─────────
   Subject              │ ${String(subjectResult.metadata.totalSamples).padEnd(7)} │ ${String(subjectResult.metadata.vocabularySize).padEnd(5)} │ ${String(subjectResult.evaluation.accuracy).padEnd(8)} │ ${String(subjectResult.crossValidation.meanAccuracy).padEnd(7)}
   Grade Level          │ ${String(gradeResult.metadata.totalSamples).padEnd(7)} │ ${String(gradeResult.metadata.vocabularySize).padEnd(5)} │ ${String(gradeResult.evaluation.accuracy).padEnd(8)} │ ${String(gradeResult.crossValidation.meanAccuracy).padEnd(7)}
   Document Type        │ ${String(docTypeResult.metadata.totalSamples).padEnd(7)} │ ${String(docTypeResult.metadata.vocabularySize).padEnd(5)} │ ${String(docTypeResult.evaluation.accuracy).padEnd(8)} │ ${String(docTypeResult.crossValidation.meanAccuracy).padEnd(7)}

Algorithm: Multinomial Naive Bayes with Laplace Smoothing
Training Data: Programmatically generated DepEd document headers
  - DLL headers (English and Filipino)
  - ISP headers and content
  - ISR headers and content
  - Subject-specific keywords and section headers
  - Grade level indicators and content

Prediction Flow:
  1. User uploads a DLL/ISP/ISR document (PDF)
  2. OCR extracts text from the first page
  3. Subject Classifier predicts the learning area/subject
  4. Grade Level Classifier predicts the grade level
  5. Document Type Classifier predicts DLL/ISP/ISR
  6. Predicted values auto-fill the upload form and match against:
     - Teacher's teaching loads (subject + grade level)
     - Academic calendar (week number from date range)
`;

    const reportPath = path.join(resultsDir, 'training_report.txt');
    fs.writeFileSync(reportPath, report);
    console.log(`✅ Training report saved: ${reportPath}`);

    console.log(`\n${'█'.repeat(60)}`);
    console.log(`  TRAINING COMPLETE — All models and results saved.`);
    console.log(`${'█'.repeat(60)}\n`);
}

function formatConfusionMatrixText(cm, labels) {
    const cellWidth = 14;
    let header = ' '.repeat(cellWidth) + labels.map(l => l.padStart(cellWidth)).join('');
    let rows = [header];
    labels.forEach(trueLabel => {
        const row = trueLabel.padStart(cellWidth);
        const cells = labels.map(predLabel => {
            return String(cm[trueLabel][predLabel] || 0).padStart(cellWidth);
        }).join('');
        rows.push(`   ${row}${cells}`);
    });
    return rows.join('\n');
}

function formatMetricsText(perClass) {
    let lines = [];
    lines.push(`   ${'Class'.padStart(14)} ${'Precision'.padStart(10)} ${'Recall'.padStart(10)} ${'F1'.padStart(10)} ${'Support'.padStart(10)}`);
    lines.push(`   ${'-'.repeat(54)}`);
    Object.keys(perClass).sort().forEach(label => {
        const m = perClass[label];
        lines.push(`   ${label.padStart(14)} ${String(m.precision).padStart(10)} ${String(m.recall).padStart(10)} ${String(m.f1).padStart(10)} ${String(m.support).padStart(10)}`);
    });
    return lines.join('\n');
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
