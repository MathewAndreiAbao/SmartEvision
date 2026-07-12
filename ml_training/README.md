# SmartEvision ML Training Pipeline

This folder contains the machine learning training pipeline for the SmartEvision
DepEd Document Management System.

## What It Trains

| Classifier | Classes | Purpose |
|---|---|---|
| **Subject** | English, Filipino, Mathematics, Science, AP, GMRC, MAPEH, EPP, TLE | Auto-detect learning area from uploaded DLL |
| **Grade Level** | Kindergarten, Grade 1–6 | Auto-detect grade level from document header |
| **Document Type** | DLL, ISP, ISR | Classify document type |

## How It Works

```
Training Data → CountVectorizer (tokenizer) → MultinomialNB (Laplace smoothing)
                                                          ↓
                                              JSON model export
                                                          ↓
                                    src/lib/models/*_model.json
                                                          ↓
                                    src/lib/utils/nlpClassifier.ts (runtime)
                                                          ↓
                                    src/lib/utils/ocr.ts (OCR pipeline)
```

## Setup

```bash
pip install -r requirements.txt
```

## Run Training

### Option A: Python script

```bash
python train_all_classifiers.py
```

### Option B: Jupyter Notebook

```bash
jupyter notebook train_classifiers.ipynb
```

## Outputs

| File | Description |
|---|---|
| `results/training_results.json` | Full metrics (accuracy, confusion matrix, per-class precision/recall/F1, cross-validation) |
| `results/training_report.txt` | Human-readable training report for capstone documentation |
| `results/*_confusion_matrix.png` | Confusion matrix plots |
| `../src/lib/models/subject_classifier_model.json` | Exported model (loaded by nlpClassifier.ts) |
| `../src/lib/models/gradelevel_classifier_model.json` | Exported model (loaded by nlpClassifier.ts) |
| `../src/lib/models/doctype_classifier_model.json` | Exported model (loaded by nlpClassifier.ts) |

## Integration

After training, the JSON models are automatically written to `src/lib/models/`.
The existing TypeScript code in `nlpClassifier.ts` loads these files at runtime.
No code changes needed — just re-train and the new models take effect on next page load.

## Prediction Flow

```
User uploads PDF
       ↓
OCR extracts text (first page)
       ↓
Subject Classifier → predicts subject (English, Math, etc.)
Grade Level Classifier → predicts grade (Grade 1–6)
Doc Type Classifier → predicts type (DLL/ISP/ISR)
       ↓
Results auto-fill upload form
       ↓
Subject + grade matched against teacher's teaching loads
Week number resolved from calendar
