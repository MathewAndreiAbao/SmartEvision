import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Training data containing real-world representations of DLL headers and subject indicators
const trainingData = [
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

// Tokenize strings into words
function tokenize(text) {
    return text.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(w => w.length > 2);
}

// Train a Naive Bayes model
function trainModel() {
    console.log("Training Naive Bayes Text Classifier...");

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
            // P(word|class) = (count of word in class + 1) / (total words in class + V)
            const prob = Math.log((count + 1) / (totalWordsInClass + V));
            // Only store words that actually appeared in the class + smoothing to save space
            model.classes[label].wordProbabilities[word] = prob;
        });

        // Save the default probability for words not seen in training
        model.classes[label].defaultWordProb = Math.log(1 / (totalWordsInClass + V));
    }

    // Prepare JSON structure
    const outputDir = path.join(__dirname, '../src/lib/models');
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    const outputPath = path.join(outputDir, 'subject_classifier_model.json');
    fs.writeFileSync(outputPath, JSON.stringify(model, null, 2));

    console.log(`✅ Model trained successfully on ${trainingData.length} samples!`);
    console.log(`✅ Extracted vocabulary size: ${V}`);
    console.log(`✅ Model saved to: ${outputPath}`);
}

trainModel();
