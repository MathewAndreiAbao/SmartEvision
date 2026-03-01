import subjectModel from '../models/subject_classifier_model.json';

interface ModelData {
    classes: Record<string, {
        priorProbability: number;
        wordProbabilities: Record<string, number>;
        defaultWordProb: number;
    }>;
    vocabularySize: number;
}

export interface PredictionResult {
    subject: string | null;
    confidence: number;
}

export class NaiveBayesClassifier {
    private model: ModelData;

    constructor() {
        this.model = subjectModel as ModelData;
    }

    private tokenize(text: string): string[] {
        return text.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(w => w.length > 2);
    }

    public predict(text: string): PredictionResult {
        const tokens = this.tokenize(text);

        if (tokens.length === 0) {
            return { subject: null, confidence: 0 };
        }

        let bestClass: string | null = null;
        let maxLogProb = -Infinity;

        // For confidence calculation
        const scores: { label: string; prob: number }[] = [];

        // Calculate P(C|D) for each class C
        for (const [label, classData] of Object.entries(this.model.classes)) {
            let logProb = classData.priorProbability;

            for (const token of tokens) {
                // Add log probability of word given class
                if (classData.wordProbabilities[token] !== undefined) {
                    logProb += classData.wordProbabilities[token];
                } else {
                    // Laplace smoothing for unseen words
                    logProb += classData.defaultWordProb;
                }
            }

            scores.push({ label, prob: logProb });

            if (logProb > maxLogProb) {
                maxLogProb = logProb;
                bestClass = label;
            }
        }

        if (!bestClass) {
            return { subject: null, confidence: 0 };
        }

        // Calculate a pseudo-confidence score (0-100)
        // Convert log probabilities back to ratios for a rough confidence metric

        // Find sum of all exp(score - max)
        let sumExp = 0;
        for (const s of scores) {
            sumExp += Math.exp(s.prob - maxLogProb);
        }

        // Probability of best class
        const confidenceScore = (1 / sumExp) * 100;

        return {
            subject: bestClass,
            // Only return the subject if confidence > 40%, otherwise it's just guessing
            confidence: confidenceScore > 40 ? Math.round(confidenceScore) : 0
        };
    }
}

// Export singleton instance
export const subjectClassifier = new NaiveBayesClassifier();
