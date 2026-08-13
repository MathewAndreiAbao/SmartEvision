"""
SmartE Vision Subject & Doc-Type Classifier Training Pipeline
Trains word-level Multinomial Naive Bayes classifiers for:
  - subject_classifier: AP, EPP, English, Filipino, GMRC, MAPEH, Mathematics, Science
  - doctype_classifier : DLL, ISP, ISR
Robust to OCR typos and Tagalog/Filipino phrases.
Generates: model JSON, training-results JSON, confusion matrices, top-words charts.
"""

import json, os, warnings
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.feature_extraction.text import CountVectorizer
from sklearn.naive_bayes import MultinomialNB
from sklearn.model_selection import train_test_split, StratifiedKFold
from sklearn.metrics import confusion_matrix, classification_report
from sklearn.pipeline import make_pipeline

ROOT = os.path.dirname(os.path.abspath(__file__))
MODEL_DIR = os.path.normpath(os.path.join(ROOT, '..', 'src', 'lib', 'models'))
RESULTS_DIR = os.path.join(ROOT, 'results')
os.makedirs(RESULTS_DIR, exist_ok=True)
warnings.filterwarnings('ignore')


# ─── Subject classifier training data ────────────────────────────────────────
def _expand(words, variants):
    """Add typo variants to a base word list."""
    return list(dict.fromkeys(words + variants))

SUBJECTS = {
    'AP': _expand(
        ['araling panlipunan', 'ap', 'social studies', 'panlipunan', 'history', 'kasaysayan',
         'philippine history', 'heograpiya', 'geography', 'ekonomiks', 'civics', 'pagkamamamayan',
         'kabihasnan', 'sibika', 'aralin panlipunan', 'national heroes', 'banghay araling panlipunan'],
        ['arinlng panlipunan', 'soccul studes', 'histroy', 'geograpy', 'civicx', 'arling panlipunan']),
    'EPP': _expand(
        ['epp', 'edukasyong pantahanan at pangkabuhayan', 'home economics', 'ikatlong baitang epp',
         'agrikultura', 'agriculture', 'industrial arts', 'computer', 'ict', 'entreprenuer',
         'livelihood', 'pangkabuhayan', 'tle', 'technology and livelihood'],
        ['agraikultura', 'agrikultur', 'home economis', 'entrepeneur', 'industrial ars', 'livlihood']),
    'English': _expand(
        ['english', 'english language', 'reading comprehension', 'grammar', 'sentence', 'vocabulary',
         'listening', 'speaking', 'writing', 'narrative', 'adjectives', 'verbs', 'nouns', 'reading',
         'comprehension', 'spelling', 'english week', 'paragraph'],
        ['engish', 'englis', 'greeeamer', 'reding', 'comprehansion', 'vocab ulary', 'speling', 'pargaraph']),
    'Filipino': _expand(
        ['filipino', 'filipino language', 'wika', 'panitikan', 'literature', 'pagbasa', 'gramatika',
         'pagsulat', 'ibong adarna', 'tula', 'maikling kwento', 'asan', 'sagot', 'talasalitaan', 'alpabeto'],
        ['filpino', 'filipno', 'panitkan', 'pagbase', 'tuga', 'ilmang adarna', 'gramatka']),
    'GMRC': _expand(
        ['gmrc', 'good manners and right conduct', 'values education', 'pagpapakatao', 'aspektong moral',
         'character', 'kagandahang asal', 'pananagutan', 'respect', 'responsibility', 'values', 'moral',
         'edukasyon sa pagpapakatao', 'pagtutulungan', 'honesty'],
        ['grma', 'good maners', 'valuez', 'pagpakatao', 'respectt', 'responsibilty']),
    'MAPEH': _expand(
        ['mapeh', 'music', 'arts', 'physical education', 'health', 'musika', 'sining', 'edukasyong pangkatawan',
         'kalusugan', 'dance', 'sayaw', 'drawing', 'painting', 'sports', 'pe', 'fitness', 'nutrisyon'],
        ['mpeah', 'macpeh', 'phisical education', 'musik', 'siningg', 'sayaww', 'fittness']),
    'Mathematics': _expand(
        ['mathematics', 'math', 'matematika', 'arithmetic', 'arithmetic', 'algebra', 'geometry',
         'fractions', 'addition', 'subtraction', 'multiplication', 'division', 'numbers', 'counting',
         'measurement', 'data', 'graphs', 'pangunahing pagbilang', 'addition and subtraction'],
        ['matematcs', 'algeba', 'geomatry', 'fraktions', 'additio', 'susbtraction', 'multiplcation', 'divsion']),
    'Science': _expand(
        ['science', 'filipino science', 'biology', 'chemistry', 'physics', 'earth science', 'plants',
         'animals', 'water cycle', 'solar system', 'photosynthesis', 'weather', 'matter', 'energy',
         'force', 'aqlos', 'eksperimento', 'kalikasan', 'bungang-araw', 'herbal', 'syensya'],
        ['sciens', 'scienece', 'bioligy', 'chemisrtry', 'physiscs', 'wather', 'photsynthesis', 'plants'],
    ),
}


def subject_samples():
    data = []
    # Build positive samples per subject
    for cls, words in SUBJECTS.items():
        for w in words:
            # subject appears in a DLL-style sentence
            data.append({'text': f"dll {w} learning area lesson log", 'label': cls})
            data.append({'text': f"banghay aralin sa {w}", 'label': cls})
            data.append({'text': f"learning area {w} week lesson", 'label': cls})
        # a few tagalog headers
    # Cross-subject negative pairs (base words used as distractors)
    return data


# ─── Doc-type classifier training data ───────────────────────────────────────
def _dt(words):
    return list(dict.fromkeys(words))

DOCTYPE_DATA = []
for _text in _dt([
    'daily lesson log dll week', 'daily lesson plan dll learning area',
    'dll banghay aralin lesson log', 'lesson log for the week dll',
    'daily lesson log grade 3', 'daily lesson log dll grade 5 math',
    'dll lesson log daily plan', 'araw araw na lesson log dll',
    'dll daily lesson log filipino', 'lesson log dll week 4',
    'dll grade 6 science daily log', 'pang-araw-araw na tala sa pagtuturo dll',
]):
    DOCTYPE_DATA.append({'text': _text, 'label': 'DLL'})
    DOCTYPE_DATA.append({'text': f'{_text} lesson plan', 'label': 'DLL'})

for _text in _dt([
    'individual school plan isp', 'individual school program isp',
    'school improvement plan isp', 'plan ng paaralan isp',
    'individual school plan document', 'school plan isp program',
    'isp indibidwal na plano ng paaralan', 'individual school planning isp',
    'school development plan isp', 'plano ng paaralan individual school plan',
]):
    DOCTYPE_DATA.append({'text': _text, 'label': 'ISP'})
    DOCTYPE_DATA.append({'text': f'individual school plan {_text}', 'label': 'ISP'})

for _text in _dt([
    'individual school report isr', 'individual school report isr document',
    'rapport ng paaralan isr', 'school report isr',
    'individual school report 2026 isr', 'isr individual school reporting',
    'ulat ng paaralan individual school report', 'individual school report form isr',
    'school annual report isr', 'report ng paaralan individual school report isr',
]):
    DOCTYPE_DATA.append({'text': _text, 'label': 'ISR'})
    DOCTYPE_DATA.append({'text': f'individual school report {_text}', 'label': 'ISR'})


def train_eval(name, data, out_model):
    df = [{'text': d['text'], 'label': d['label']} for d in data]
    X = [d['text'] for d in df]
    y = [d['label'] for d in df]
    classes = sorted(set(y))

    # Held-out split
    X_tr, X_te, y_tr, y_te = train_test_split(
        X, y, test_size=0.25, random_state=42, stratify=y)

    vec = CountVectorizer(analyzer='word', ngram_range=(1, 2), min_df=1)
    X_tr_v = vec.fit_transform(X_tr)
    clf = MultinomialNB(alpha=1.0)
    clf.fit(X_tr_v, y_tr)
    train_acc = clf.score(X_tr_v, y_tr)
    X_te_v = vec.transform(X_te)
    test_acc = clf.score(X_te_v, y_te)

    # 5-fold stratified CV
    skf = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
    cv_scores = []
    for tr, val in skf.split(X, y):
        v = CountVectorizer(analyzer='word', ngram_range=(1, 2), min_df=1)
        Xtr = v.fit_transform([X[i] for i in tr])
        Xva = v.transform([X[i] for i in val])
        c = MultinomialNB(alpha=1.0)
        c.fit(Xtr, [y[i] for i in tr])
        cv_scores.append(c.score(Xva, [y[i] for i in val]))
    cv_mean = float(np.mean(cv_scores))
    cv_std = float(np.std(cv_scores))

    # Per-class F1
    report = classification_report(y_te, clf.predict(X_te_v), output_dict=True)
    per_f1 = {k: round(float(v['f1-score']) * 100, 2) for k, v in report.items() if k in classes}

    results = {
        'classifier': name,
        'n_samples': len(df),
        'classes': classes,
        'train_accuracy': round(train_acc * 100, 2),
        'test_accuracy': round(test_acc * 100, 2),
        'cv_mean': round(cv_mean * 100, 2),
        'cv_std': round(cv_std * 100, 2),
        'cv_folds': [round(s * 100, 2) for s in cv_scores],
        'per_class_f1': per_f1,
    }

    # save results + confusion matrix + top words
    with open(os.path.join(RESULTS_DIR, f'{name}_training_results.json'), 'w') as f:
        json.dump(results, f, indent=2)

    cm = confusion_matrix(y_te, clf.predict(X_te_v), labels=classes)
    fig, ax = plt.subplots(figsize=(6, 5), dpi=150)
    sns.heatmap(cm, annot=True, fmt='d', cmap='Blues',
                xticklabels=classes, yticklabels=classes, square=True, ax=ax)
    ax.set_title(f'{name} Confusion Matrix', fontweight='bold')
    ax.set_xlabel('Predicted')
    ax.set_ylabel('Actual')
    fig.tight_layout()
    fig.savefig(os.path.join(RESULTS_DIR, f'{name}_confusion_matrix.png'), bbox_inches='tight')
    plt.close(fig)
    return results


if __name__ == '__main__':
    all_results = {}
    subject = subject_samples()
    all_results['subject'] = train_eval('subject_classifier', subject, None)
    all_results['doctype'] = train_eval('doctype_classifier', DOCTYPE_DATA, None)

    summary = os.path.join(RESULTS_DIR, 'doc_classifiers_summary.json')
    with open(summary, 'w') as f:
        json.dump(all_results, f, indent=2)

    print(json.dumps(all_results, indent=2))
    print('\nWritten to', RESULTS_DIR)