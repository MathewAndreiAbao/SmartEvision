"""
SmartE Vision Intent Classifier Training Pipeline
Trains a character n-gram Logistic Regression intent classifier.
Robust to typos, Tagalog/Filipino, and varied phrasings.
Generates: model JSON, confusion matrix, ROC curves, classification report, top words chart.
"""

import json, os, re, warnings
import numpy as np
import pandas as pd
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.feature_extraction.text import CountVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split, StratifiedKFold
from sklearn.metrics import (
    confusion_matrix, classification_report, roc_curve, auc,
    precision_recall_fscore_support
)

warnings.filterwarnings('ignore')

OUTPUT_DIR = os.path.join(os.path.dirname(__file__), '..', 'src', 'lib', 'models')
RESULTS_DIR = os.path.join(os.path.dirname(__file__), 'results')
os.makedirs(OUTPUT_DIR, exist_ok=True)
os.makedirs(RESULTS_DIR, exist_ok=True)

# ─── Training Data ──────────────────────────────────────────────────────────
# ~700+ labeled questions across 8 intents
# Includes English, Tagalog/Filipino, and common typographical errors

TRAINING_DATA = [
    # ═══════════════════════════════════════════════════════════════════════════
    # ask_compliance  (~90 samples)
    # ═══════════════════════════════════════════════════════════════════════════
    {"text": "What is my compliance rate?", "intent": "ask_compliance"},
    {"text": "Am I compliant this week?", "intent": "ask_compliance"},
    {"text": "How many submissions are late?", "intent": "ask_compliance"},
    {"text": "What percentage of my DLLs are compliant?", "intent": "ask_compliance"},
    {"text": "Show my compliance status", "intent": "ask_compliance"},
    {"text": "Am I on track this term?", "intent": "ask_compliance"},
    {"text": "How compliant am I?", "intent": "ask_compliance"},
    {"text": "What is my compliance percentage?", "intent": "ask_compliance"},
    {"text": "Are all my submissions on time?", "intent": "ask_compliance"},
    {"text": "Check my submission status", "intent": "ask_compliance"},
    {"text": "How many DLLs did I submit on time?", "intent": "ask_compliance"},
    {"text": "Am I missing any submissions?", "intent": "ask_compliance"},
    {"text": "What is my compliance for Grade 5 Math?", "intent": "ask_compliance"},
    {"text": "Show me my late submissions", "intent": "ask_compliance"},
    {"text": "How many weeks am I compliant?", "intent": "ask_compliance"},
    {"text": "What is my overall compliance score?", "intent": "ask_compliance"},
    {"text": "My compliance status please", "intent": "ask_compliance"},
    {"text": "Have I submitted all required DLLs?", "intent": "ask_compliance"},
    {"text": "Which subjects am I compliant in?", "intent": "ask_compliance"},
    {"text": "Show my non-compliant weeks", "intent": "ask_compliance"},
    {"text": "How am I doing with my submissions?", "intent": "ask_compliance"},
    {"text": "What percent of my DLLs are in?", "intent": "ask_compliance"},
    {"text": "Give me my compliance summary", "intent": "ask_compliance"},
    {"text": "Show me where I am at with submissions", "intent": "ask_compliance"},
    {"text": "How many do I still need to submit?", "intent": "ask_compliance"},
    {"text": "Am I falling behind on DLLs?", "intent": "ask_compliance"},
    {"text": "What is my submission status?", "intent": "ask_compliance"},
    {"text": "My compliance rate for this quarter", "intent": "ask_compliance"},
    {"text": "How many am I missing this week?", "intent": "ask_compliance"},
    {"text": "Are there any pending submissions?", "intent": "ask_compliance"},
    {"text": "Show me my record so far", "intent": "ask_compliance"},
    {"text": "Do I have any late submissions?", "intent": "ask_compliance"},
    {"text": "What subjects am I behind on?", "intent": "ask_compliance"},
    {"text": "Any missing DLLs this week?", "intent": "ask_compliance"},
    {"text": "How is my compliance looking?", "intent": "ask_compliance"},
    {"text": "Do I need to submit anything?", "intent": "ask_compliance"},
    {"text": "Are all my DLLs submitted on time?", "intent": "ask_compliance"},
    {"text": "Am I good for this week?", "intent": "ask_compliance"},
    {"text": "Check if I am compliant", "intent": "ask_compliance"},
    {"text": "How am I performing with DLL submissions?", "intent": "ask_compliance"},
    {"text": "Give me my stats", "intent": "ask_compliance"},
    {"text": "Show my record", "intent": "ask_compliance"},
    {"text": "What is my score?", "intent": "ask_compliance"},
    {"text": "Am I doing okay with submissions?", "intent": "ask_compliance"},
    {"text": "How many DLLs have I submitted?", "intent": "ask_compliance"},
    # Typo variants
    {"text": "What is my complience rate?", "intent": "ask_compliance"},
    {"text": "Am I complient this week?", "intent": "ask_compliance"},
    {"text": "how meny submissions are late", "intent": "ask_compliance"},
    {"text": "Show my compliance statis", "intent": "ask_compliance"},
    {"text": "Am I on trak this term?", "intent": "ask_compliance"},
    {"text": "How complient am I?", "intent": "ask_compliance"},
    {"text": "Check my submisson status", "intent": "ask_compliance"},
    {"text": "how meny DLLs did I submit on time", "intent": "ask_compliance"},
    {"text": "Am I missing any sumissions?", "intent": "ask_compliance"},
    {"text": "What is my overall complience score?", "intent": "ask_compliance"},
    {"text": "Have I submitted all reqired DLLs?", "intent": "ask_compliance"},
    {"text": "Show my non-complient weeks", "intent": "ask_compliance"},
    {"text": "my compliance statis please", "intent": "ask_compliance"},
    {"text": "What is my complience percentage?", "intent": "ask_compliance"},
    {"text": "Are all my sumissions on time?", "intent": "ask_compliance"},
    {"text": "Which subjects am I complient in?", "intent": "ask_compliance"},
    {"text": "Whats my compliance four this weak?", "intent": "ask_compliance"},
    {"text": "How am I doing with my sumissions?", "intent": "ask_compliance"},
    {"text": "Give me my complience summary", "intent": "ask_compliance"},
    {"text": "Am I falling behind on DLLs?", "intent": "ask_compliance"},
    # Tagalog variants
    {"text": "Ano ang compliance rate ko?", "intent": "ask_compliance"},
    {"text": "Compliant ba ako ngayong linggo?", "intent": "ask_compliance"},
    {"text": "Ilan ang late submissions ko?", "intent": "ask_compliance"},
    {"text": "Ipakita ang compliance status ko", "intent": "ask_compliance"},
    {"text": "Nasa tamang landas ba ako?", "intent": "ask_compliance"},
    {"text": "Gaano ako ka-compliant?", "intent": "ask_compliance"},
    {"text": "Suriin ang submission status ko", "intent": "ask_compliance"},
    {"text": "Ilang DLL ang na-submit ko on time?", "intent": "ask_compliance"},
    {"text": "Mayroon ba akong missing submissions?", "intent": "ask_compliance"},
    {"text": "Ano ang overall compliance score ko?", "intent": "ask_compliance"},
    {"text": "Compliance status ko please", "intent": "ask_compliance"},
    {"text": "Na-submit ko na ba lahat ng DLL?", "intent": "ask_compliance"},
    {"text": "Aling subjects ang compliant ako?", "intent": "ask_compliance"},
    {"text": "Ipakita ang mga non-compliant weeks ko", "intent": "ask_compliance"},
    {"text": "Ano ang compliance percentage ko?", "intent": "ask_compliance"},
    {"text": "On time ba lahat ng submissions ko?", "intent": "ask_compliance"},
    {"text": "Kumusta ang compliance ko?", "intent": "ask_compliance"},
    {"text": "Ilan pa ba ang kailangan kong i-submit?", "intent": "ask_compliance"},
    {"text": "May late ba akong submission?", "intent": "ask_compliance"},
    {"text": "Saan ako kulang sa submissions?", "intent": "ask_compliance"},
    {"text": "Nasubmit ko na ba lahat?", "intent": "ask_compliance"},
    {"text": "Kumusta ang performance ko sa DLL compliance?", "intent": "ask_compliance"},
    {"text": "Compliance ko para sa linggong ito", "intent": "ask_compliance"},
    {"text": "May pending pa ba akong submissions?", "intent": "ask_compliance"},
    {"text": "Ipakita ang record ko ng submissions", "intent": "ask_compliance"},
    {"text": "Ilang percent ang compliance ko?", "intent": "ask_compliance"},
    {"text": "Compliant ba ako ngayon?", "intent": "ask_compliance"},

    # ═══════════════════════════════════════════════════════════════════════════
    # check_deadline  (~80 samples)
    # ═══════════════════════════════════════════════════════════════════════════
    {"text": "When is the deadline for Week 5?", "intent": "check_deadline"},
    {"text": "What is the submission deadline for this week?", "intent": "check_deadline"},
    {"text": "When is the next deadline?", "intent": "check_deadline"},
    {"text": "Deadline for this week", "intent": "check_deadline"},
    {"text": "Is the deadline this Friday?", "intent": "check_deadline"},
    {"text": "How many days until the deadline?", "intent": "check_deadline"},
    {"text": "When is the deadline for Week 8?", "intent": "check_deadline"},
    {"text": "What time is the deadline?", "intent": "check_deadline"},
    {"text": "Deadline for this term", "intent": "check_deadline"},
    {"text": "What is the deadline this week?", "intent": "check_deadline"},
    {"text": "When is submission deadline?", "intent": "check_deadline"},
    {"text": "Upcoming deadline dates", "intent": "check_deadline"},
    {"text": "Is there a deadline today?", "intent": "check_deadline"},
    {"text": "Deadline for Week 10", "intent": "check_deadline"},
    {"text": "How much time left before deadline?", "intent": "check_deadline"},
    {"text": "Give me the deadline for this week", "intent": "check_deadline"},
    {"text": "When is the deadline due?", "intent": "check_deadline"},
    {"text": "Deadline schedule", "intent": "check_deadline"},
    {"text": "What deadline is coming up?", "intent": "check_deadline"},
    {"text": "Show me all deadlines", "intent": "check_deadline"},
    {"text": "Next submission deadline", "intent": "check_deadline"},
    {"text": "Is anything due this week?", "intent": "check_deadline"},
    {"text": "What is the cut-off date for submissions?", "intent": "check_deadline"},
    {"text": "When should I submit by?", "intent": "check_deadline"},
    {"text": "How long until the next deadline?", "intent": "check_deadline"},
    {"text": "What is due this week?", "intent": "check_deadline"},
    {"text": "By when do I need to submit?", "intent": "check_deadline"},
    {"text": "What is the due date?", "intent": "check_deadline"},
    {"text": "Are there any deadlines this week?", "intent": "check_deadline"},
    {"text": "How many days left before submissions are due?", "intent": "check_deadline"},
    {"text": "Is anything expiring soon?", "intent": "check_deadline"},
    {"text": "What is the last day to submit DLLs?", "intent": "check_deadline"},
    {"text": "Tell me about this weeks deadline", "intent": "check_deadline"},
    {"text": "Submission cut-off", "intent": "check_deadline"},
    {"text": "When is the last day to submit?", "intent": "check_deadline"},
    {"text": "What is the submission date?", "intent": "check_deadline"},
    {"text": "Any deadlines coming up?", "intent": "check_deadline"},
    {"text": "What needs to be submitted this week?", "intent": "check_deadline"},
    {"text": "When is the cut-off?", "intent": "check_deadline"},
    {"text": "Do I have a deadline this week?", "intent": "check_deadline"},
    # Typo variants
    {"text": "When is the dedline for Week 5?", "intent": "check_deadline"},
    {"text": "What is the submission dedline for this week?", "intent": "check_deadline"},
    {"text": "When is the next dedline?", "intent": "check_deadline"},
    {"text": "Is the dedline this Friday?", "intent": "check_deadline"},
    {"text": "how meny days until the dedline", "intent": "check_deadline"},
    {"text": "When is the dedline for Week 8?", "intent": "check_deadline"},
    {"text": "Upcomng dedline dates", "intent": "check_deadline"},
    {"text": "Is there a dedline today?", "intent": "check_deadline"},
    {"text": "how mutch time left before dedline", "intent": "check_deadline"},
    {"text": "What dedline is coming up?", "intent": "check_deadline"},
    {"text": "Next submission dedline", "intent": "check_deadline"},
    {"text": "Is anything due this weak?", "intent": "check_deadline"},
    {"text": "Whats the cut-off date four submissions?", "intent": "check_deadline"},
    {"text": "how long until the next dedline", "intent": "check_deadline"},
    {"text": "When is the last day to sumbit?", "intent": "check_deadline"},
    # Tagalog variants
    {"text": "Kailan ang deadline para sa Week 5?", "intent": "check_deadline"},
    {"text": "Kailan ang submission deadline ngayong linggo?", "intent": "check_deadline"},
    {"text": "Kailan ang susunod na deadline?", "intent": "check_deadline"},
    {"text": "Deadline para sa linggong ito", "intent": "check_deadline"},
    {"text": "Ba't sa Friday ba ang deadline?", "intent": "check_deadline"},
    {"text": "Ilang araw bago ang deadline?", "intent": "check_deadline"},
    {"text": "Kailan ang deadline para sa Week 8?", "intent": "check_deadline"},
    {"text": "Kailan ang submission deadline?", "intent": "check_deadline"},
    {"text": "Mga deadline dates na darating", "intent": "check_deadline"},
    {"text": "May deadline ba ngayon?", "intent": "check_deadline"},
    {"text": "Deadline para sa Week 10", "intent": "check_deadline"},
    {"text": "Gaano karaming oras pa bago ang deadline?", "intent": "check_deadline"},
    {"text": "Ano ang deadline ngayong linggo?", "intent": "check_deadline"},
    {"text": "Kailan ang huling araw ng submission?", "intent": "check_deadline"},
    {"text": "May deadline ba ngayong linggo?", "intent": "check_deadline"},
    {"text": "Hanggang kailan ako puwedeng mag-submit?", "intent": "check_deadline"},
    {"text": "Anong araw ang deadline?", "intent": "check_deadline"},
    {"text": "Puwede pa ba akong mag-submit?", "intent": "check_deadline"},
    {"text": "Deadline ba ngayon?", "intent": "check_deadline"},

    # ═══════════════════════════════════════════════════════════════════════════
    # find_dll  (~80 samples)
    # ═══════════════════════════════════════════════════════════════════════════
    {"text": "Find DLLs about fractions", "intent": "find_dll"},
    {"text": "Search for DLLs on reading comprehension", "intent": "find_dll"},
    {"text": "Show DLLs for Grade 3 Science", "intent": "find_dll"},
    {"text": "Find lesson plans about addition", "intent": "find_dll"},
    {"text": "Search DLLs for mathematics", "intent": "find_dll"},
    {"text": "Show DLLs for Week 4", "intent": "find_dll"},
    {"text": "Find DLLs uploaded by Teacher Santos", "intent": "find_dll"},
    {"text": "Search my DLLs", "intent": "find_dll"},
    {"text": "Show DLLs about plants", "intent": "find_dll"},
    {"text": "Find all DLLs for Grade 2", "intent": "find_dll"},
    {"text": "Look for DLLs about grammar", "intent": "find_dll"},
    {"text": "Find DLLs with group activities", "intent": "find_dll"},
    {"text": "Show DLLs for this week", "intent": "find_dll"},
    {"text": "Find DLLs about Filipino culture", "intent": "find_dll"},
    {"text": "Search documents for assessment tools", "intent": "find_dll"},
    {"text": "Look up DLLs on fractions", "intent": "find_dll"},
    {"text": "Show DLLs about animals", "intent": "find_dll"},
    {"text": "Find DLLs for Grade 1 Math", "intent": "find_dll"},
    {"text": "Search for DLLs on verbs", "intent": "find_dll"},
    {"text": "Show DLLs related to weather", "intent": "find_dll"},
    {"text": "Find DLLs with experiments", "intent": "find_dll"},
    {"text": "Look up DLLs about the water cycle", "intent": "find_dll"},
    {"text": "Search my uploaded DLLs", "intent": "find_dll"},
    {"text": "Find me any DLLs on shapes", "intent": "find_dll"},
    {"text": "I need DLLs for Grade 4 English", "intent": "find_dll"},
    {"text": "What DLLs are available for Science?", "intent": "find_dll"},
    {"text": "DLLs about the solar system", "intent": "find_dll"},
    {"text": "Show DLLs on addition for Grade 1", "intent": "find_dll"},
    {"text": "Find DLLs for this term", "intent": "find_dll"},
    {"text": "Do we have DLLs on photosynthesis?", "intent": "find_dll"},
    {"text": "Give me DLLs about fractions and decimals", "intent": "find_dll"},
    {"text": "Find the DLL on counting numbers", "intent": "find_dll"},
    {"text": "Search DLLs by subject", "intent": "find_dll"},
    {"text": "Show DLLs for Grade 6 Math", "intent": "find_dll"},
    {"text": "Where are the DLLs for Grade 3?", "intent": "find_dll"},
    {"text": "Find Filipino DLLs", "intent": "find_dll"},
    {"text": "What DLLs do I have?", "intent": "find_dll"},
    {"text": "Search DLL database for geometry", "intent": "find_dll"},
    {"text": "Show me DLLs uploaded last week", "intent": "find_dll"},
    {"text": "DLLs about Philippine history", "intent": "find_dll"},
    {"text": "Show DLLs for remedial reading", "intent": "find_dll"},
    # Typo variants
    {"text": "Find DLLs about fraktions", "intent": "find_dll"},
    {"text": "Search for DLLs on reading comprehension", "intent": "find_dll"},
    {"text": "Find lessn plans about addition", "intent": "find_dll"},
    {"text": "Show DLLs four Week 4", "intent": "find_dll"},
    {"text": "Find all DLLs four Grade 2", "intent": "find_dll"},
    {"text": "Look for DLLs about gramer", "intent": "find_dll"},
    {"text": "Find DLLs about Filipno culture", "intent": "find_dll"},
    {"text": "Search for DLLs on verbs", "intent": "find_dll"},
    {"text": "Look up DLLs about the water cicle", "intent": "find_dll"},
    {"text": "Search DLLs by subjekt", "intent": "find_dll"},
    {"text": "Find DLLs with rubriks", "intent": "find_dll"},
    {"text": "Wher are the DLLs for Grade 3?", "intent": "find_dll"},
    {"text": "Search my uploadd DLLs", "intent": "find_dll"},
    {"text": "Find me any DLLs on shapz", "intent": "find_dll"},
    # Tagalog variants
    {"text": "Maghanap ng DLL tungkol sa fractions", "intent": "find_dll"},
    {"text": "Maghanap ng DLL sa reading comprehension", "intent": "find_dll"},
    {"text": "Ipakita ang DLL para sa Grade 3 Science", "intent": "find_dll"},
    {"text": "Maghanap ng lesson plan tungkol sa addition", "intent": "find_dll"},
    {"text": "Maghanap ng DLL sa mathematics", "intent": "find_dll"},
    {"text": "Ipakita ang DLL para sa Week 4", "intent": "find_dll"},
    {"text": "Maghanap ng DLL tungkol sa halaman", "intent": "find_dll"},
    {"text": "Hanapin ang lahat ng DLL para sa Grade 2", "intent": "find_dll"},
    {"text": "Maghanap ng DLL tungkol sa grammar", "intent": "find_dll"},
    {"text": "Ipakita ang DLL para sa linggong ito", "intent": "find_dll"},
    {"text": "Maghanap ng DLL tungkol sa kultura ng Pilipinas", "intent": "find_dll"},
    {"text": "Maghanap ng DLL tungkol sa mga hayop", "intent": "find_dll"},
    {"text": "DLL para sa Grade 1 Math", "intent": "find_dll"},
    {"text": "Ipakita ang DLL tungkol sa panahon", "intent": "find_dll"},
    {"text": "Kailangan ko ng DLL para sa Grade 4 English", "intent": "find_dll"},
    {"text": "Anong DLL ang available para sa Science?", "intent": "find_dll"},
    {"text": "DLL tungkol sa solar system", "intent": "find_dll"},
    {"text": "Maghanap ng DLL sa pagbilang", "intent": "find_dll"},
    {"text": "Saan ang DLL para sa Grade 3?", "intent": "find_dll"},
    {"text": "Anong DLL ang mayroon ako?", "intent": "find_dll"},
    {"text": "Maghanap ng DLL sa Filipino", "intent": "find_dll"},
    {"text": "DLL tungkol sa kasaysayan ng Pilipinas", "intent": "find_dll"},
    {"text": "Patingin ng DLL para sa remedial reading", "intent": "find_dll"},
    {"text": "DLL tungkol sa fraction at decimal", "intent": "find_dll"},

    # ═══════════════════════════════════════════════════════════════════════════
    # school_compare  (~75 samples)
    # ═══════════════════════════════════════════════════════════════════════════
    {"text": "How does my school compare to others?", "intent": "school_compare"},
    {"text": "What is the compliance rate of Bulusan ES?", "intent": "school_compare"},
    {"text": "Compare schools in the district", "intent": "school_compare"},
    {"text": "Which school has the highest compliance?", "intent": "school_compare"},
    {"text": "School performance ranking", "intent": "school_compare"},
    {"text": "Show school compliance comparison", "intent": "school_compare"},
    {"text": "How is our school doing?", "intent": "school_compare"},
    {"text": "Compare my school to others", "intent": "school_compare"},
    {"text": "What are the top performing schools?", "intent": "school_compare"},
    {"text": "District ranking of schools", "intent": "school_compare"},
    {"text": "School compliance this term", "intent": "school_compare"},
    {"text": "Which schools need improvement?", "intent": "school_compare"},
    {"text": "How do other schools compare?", "intent": "school_compare"},
    {"text": "Compare compliance between schools", "intent": "school_compare"},
    {"text": "School ranking this quarter", "intent": "school_compare"},
    {"text": "Top schools in the district", "intent": "school_compare"},
    {"text": "Which school performs best?", "intent": "school_compare"},
    {"text": "School performance metrics", "intent": "school_compare"},
    {"text": "How is Bulusan ES doing?", "intent": "school_compare"},
    {"text": "Compare district schools", "intent": "school_compare"},
    {"text": "Ranking of schools by compliance", "intent": "school_compare"},
    {"text": "Which school is the most compliant?", "intent": "school_compare"},
    {"text": "Bottom performing schools", "intent": "school_compare"},
    {"text": "School standings this term", "intent": "school_compare"},
    {"text": "How does each school rank?", "intent": "school_compare"},
    {"text": "Show me school stats", "intent": "school_compare"},
    {"text": "Compare all schools", "intent": "school_compare"},
    {"text": "Give me the school rankings", "intent": "school_compare"},
    {"text": "Which school is at the top this week?", "intent": "school_compare"},
    {"text": "What is the best performing school?", "intent": "school_compare"},
    {"text": "How are schools in the district performing?", "intent": "school_compare"},
    {"text": "School compliance ranking for this quarter", "intent": "school_compare"},
    {"text": "Lower performing schools in our district", "intent": "school_compare"},
    {"text": "Compliance comparison of schools", "intent": "school_compare"},
    {"text": "Which school has the lowest compliance?", "intent": "school_compare"},
    {"text": "School comparison for this month", "intent": "school_compare"},
    {"text": "How does our school rank?", "intent": "school_compare"},
    {"text": "Schools in our district ranked", "intent": "school_compare"},
    {"text": "Compare the compliance of each school", "intent": "school_compare"},
    {"text": "What is the school ranking?", "intent": "school_compare"},
    # Typo variants
    {"text": "How does my skool compare to others?", "intent": "school_compare"},
    {"text": "Which skool has the highest compliance?", "intent": "school_compare"},
    {"text": "School performence ranking", "intent": "school_compare"},
    {"text": "How is our skool doing?", "intent": "school_compare"},
    {"text": "Compare my skool to others", "intent": "school_compare"},
    {"text": "What are the top perfoming schools?", "intent": "school_compare"},
    {"text": "District ranking of schols", "intent": "school_compare"},
    {"text": "Which skools need improvement?", "intent": "school_compare"},
    {"text": "How do othe schools compare?", "intent": "school_compare"},
    {"text": "Top skools in the district", "intent": "school_compare"},
    {"text": "Skool performence metrics", "intent": "school_compare"},
    {"text": "Compare district skools", "intent": "school_compare"},
    {"text": "Which skool is the most complient?", "intent": "school_compare"},
    {"text": "Bottom perfoming schools", "intent": "school_compare"},
    {"text": "How does eech school rank?", "intent": "school_compare"},
    {"text": "Which skool is at the top this weak?", "intent": "school_compare"},
    # Tagalog variants
    {"text": "Kumusta ang paaralan namin kumpara sa iba?", "intent": "school_compare"},
    {"text": "Ano ang compliance rate ng Bulusan ES?", "intent": "school_compare"},
    {"text": "Ihambing ang mga paaralan sa distrito", "intent": "school_compare"},
    {"text": "Aling paaralan ang may pinakamataas na compliance?", "intent": "school_compare"},
    {"text": "Ranggo ng mga paaralan ayon sa performance", "intent": "school_compare"},
    {"text": "Ipakita ang paghahambing ng compliance ng paaralan", "intent": "school_compare"},
    {"text": "Kumusta ang ating paaralan?", "intent": "school_compare"},
    {"text": "Ikumpara ang paaralan namin sa iba", "intent": "school_compare"},
    {"text": "Ano ang mga nangungunang paaralan?", "intent": "school_compare"},
    {"text": "Ranggo ng distrito ng mga paaralan", "intent": "school_compare"},
    {"text": "Aling mga paaralan ang nangangailangan ng improvement?", "intent": "school_compare"},
    {"text": "Paano ang ibang paaralan kumpara sa atin?", "intent": "school_compare"},
    {"text": "Ihambing ang compliance sa pagitan ng mga paaralan", "intent": "school_compare"},
    {"text": "Ranggo ng paaralan ngayong quarter", "intent": "school_compare"},
    {"text": "Nangungunang mga paaralan sa distrito", "intent": "school_compare"},
    {"text": "Aling paaralan ang pinakamahusay?", "intent": "school_compare"},
    {"text": "Kumusta ang Bulusan ES?", "intent": "school_compare"},
    {"text": "Pagraranggo ng mga paaralan ayon sa compliance", "intent": "school_compare"},
    {"text": "Aling paaralan ang pinaka-compliant?", "intent": "school_compare"},

    # ═══════════════════════════════════════════════════════════════════════════
    # teacher_stats  (~80 samples)
    # ═══════════════════════════════════════════════════════════════════════════
    {"text": "Show statistics for Teacher Santos", "intent": "teacher_stats"},
    {"text": "What is the compliance of Teacher Cruz?", "intent": "teacher_stats"},
    {"text": "Which teachers are struggling?", "intent": "teacher_stats"},
    {"text": "List teachers with low compliance", "intent": "teacher_stats"},
    {"text": "Teacher performance this week", "intent": "teacher_stats"},
    {"text": "Show teacher submission counts", "intent": "teacher_stats"},
    {"text": "Who has the most late submissions?", "intent": "teacher_stats"},
    {"text": "Teacher ranking in my school", "intent": "teacher_stats"},
    {"text": "Check teacher compliance rates", "intent": "teacher_stats"},
    {"text": "Show all teachers and their compliance", "intent": "teacher_stats"},
    {"text": "How is Teacher Reyes performing?", "intent": "teacher_stats"},
    {"text": "List teachers missing this week", "intent": "teacher_stats"},
    {"text": "Teacher with best compliance", "intent": "teacher_stats"},
    {"text": "Which teachers need help?", "intent": "teacher_stats"},
    {"text": "Who has the highest compliance?", "intent": "teacher_stats"},
    {"text": "Teacher compliance scores", "intent": "teacher_stats"},
    {"text": "Show teacher stats for my school", "intent": "teacher_stats"},
    {"text": "List all teachers and their submissions", "intent": "teacher_stats"},
    {"text": "Teacher ranking in the district", "intent": "teacher_stats"},
    {"text": "Who is the top teacher this week?", "intent": "teacher_stats"},
    {"text": "Teacher performance metrics", "intent": "teacher_stats"},
    {"text": "How are the teachers doing?", "intent": "teacher_stats"},
    {"text": "Which teachers have missing submissions?", "intent": "teacher_stats"},
    {"text": "Give me teacher compliance data", "intent": "teacher_stats"},
    {"text": "Who has the best compliance in our school?", "intent": "teacher_stats"},
    {"text": "Compare teachers in my school", "intent": "teacher_stats"},
    {"text": "Teacher submission status", "intent": "teacher_stats"},
    {"text": "Who is behind on submissions?", "intent": "teacher_stats"},
    {"text": "List teachers with 100 percent compliance", "intent": "teacher_stats"},
    {"text": "Which teachers are on track?", "intent": "teacher_stats"},
    {"text": "Teacher progress report", "intent": "teacher_stats"},
    {"text": "Stats for all teachers in the district", "intent": "teacher_stats"},
    {"text": "Show me teacher rankings", "intent": "teacher_stats"},
    {"text": "Who needs to catch up?", "intent": "teacher_stats"},
    {"text": "Teacher performance this quarter", "intent": "teacher_stats"},
    {"text": "I need teacher compliance info", "intent": "teacher_stats"},
    {"text": "Which teachers are doing well?", "intent": "teacher_stats"},
    {"text": "Teachers in my school ranked", "intent": "teacher_stats"},
    {"text": "Who has submitted everything on time?", "intent": "teacher_stats"},
    {"text": "Teacher statistics for this term", "intent": "teacher_stats"},
    # Typo variants
    {"text": "Show statitics for Teacher Santos", "intent": "teacher_stats"},
    {"text": "What is the complience of Teacher Cruz?", "intent": "teacher_stats"},
    {"text": "Which teachrs are struggling?", "intent": "teacher_stats"},
    {"text": "List teachrs with low compliance", "intent": "teacher_stats"},
    {"text": "Teacher performence this week", "intent": "teacher_stats"},
    {"text": "Who has the most late sumissions?", "intent": "teacher_stats"},
    {"text": "Teacher ranking in my skool", "intent": "teacher_stats"},
    {"text": "Check teacher complience rates", "intent": "teacher_stats"},
    {"text": "How is Teacher Reyes perfoming?", "intent": "teacher_stats"},
    {"text": "List teachrs missing this weak", "intent": "teacher_stats"},
    {"text": "Teacher with best complience", "intent": "teacher_stats"},
    {"text": "Which teachrs need help?", "intent": "teacher_stats"},
    {"text": "Who has the highest complience?", "intent": "teacher_stats"},
    {"text": "Teacher complience scores", "intent": "teacher_stats"},
    {"text": "Who is the top teachr this week?", "intent": "teacher_stats"},
    {"text": "How are the teachrs doing?", "intent": "teacher_stats"},
    {"text": "Which teachrs have missing sumissions?", "intent": "teacher_stats"},
    {"text": "Who has the best complience in our skool?", "intent": "teacher_stats"},
    {"text": "Compare teachrs in my skool", "intent": "teacher_stats"},
    {"text": "Who is behind on sumissions?", "intent": "teacher_stats"},
    {"text": "Stats for all teachrs in the district", "intent": "teacher_stats"},
    # Tagalog variants
    {"text": "Ipakita ang statistics para kay Teacher Santos", "intent": "teacher_stats"},
    {"text": "Ano ang compliance ni Teacher Cruz?", "intent": "teacher_stats"},
    {"text": "Sinong mga teacher ang nahihirapan?", "intent": "teacher_stats"},
    {"text": "Ilista ang mga teacher na may mababang compliance", "intent": "teacher_stats"},
    {"text": "Performance ng teacher ngayong linggo", "intent": "teacher_stats"},
    {"text": "Ipakita ang counts ng submission ng teacher", "intent": "teacher_stats"},
    {"text": "Sino ang may pinakamaraming late submissions?", "intent": "teacher_stats"},
    {"text": "Ranggo ng teacher sa paaralan namin", "intent": "teacher_stats"},
    {"text": "Suriin ang compliance rates ng teacher", "intent": "teacher_stats"},
    {"text": "Ipakita ang lahat ng teacher at kanilang compliance", "intent": "teacher_stats"},
    {"text": "Kumusta ang performance ni Teacher Reyes?", "intent": "teacher_stats"},
    {"text": "Ilista ang teacher na may missing ngayong linggo", "intent": "teacher_stats"},
    {"text": "Teacher na may pinakamataas na compliance", "intent": "teacher_stats"},
    {"text": "Sinong teacher ang nangangailangan ng tulong?", "intent": "teacher_stats"},
    {"text": "Sino ang may pinakamataas na compliance?", "intent": "teacher_stats"},
    {"text": "Ipakita ang stats ng teacher para sa paaralan namin", "intent": "teacher_stats"},
    {"text": "Ranggo ng teacher sa distrito", "intent": "teacher_stats"},
    {"text": "Sino ang nangungunang teacher ngayong linggo?", "intent": "teacher_stats"},
    {"text": "Kumusta ang mga teacher?", "intent": "teacher_stats"},
    {"text": "Sinong teacher ang may missing submissions?", "intent": "teacher_stats"},

    # ═══════════════════════════════════════════════════════════════════════════
    # calendar_info  (~70 samples)
    # ═══════════════════════════════════════════════════════════════════════════
    {"text": "What is the school calendar?", "intent": "calendar_info"},
    {"text": "Show me the academic calendar", "intent": "calendar_info"},
    {"text": "When does Term 2 start?", "intent": "calendar_info"},
    {"text": "What week is it now?", "intent": "calendar_info"},
    {"text": "Current academic week", "intent": "calendar_info"},
    {"text": "When is the end of Term 1?", "intent": "calendar_info"},
    {"text": "Show the trimester schedule", "intent": "calendar_info"},
    {"text": "How many weeks in this term?", "intent": "calendar_info"},
    {"text": "Academic calendar for this year", "intent": "calendar_info"},
    {"text": "When are the exam weeks?", "intent": "calendar_info"},
    {"text": "What is the school year?", "intent": "calendar_info"},
    {"text": "When does the school year end?", "intent": "calendar_info"},
    {"text": "What is the current term?", "intent": "calendar_info"},
    {"text": "Show me the calendar for this year", "intent": "calendar_info"},
    {"text": "Calendar overview", "intent": "calendar_info"},
    {"text": "When is the next term break?", "intent": "calendar_info"},
    {"text": "How long is this term?", "intent": "calendar_info"},
    {"text": "What is the schedule for this quarter?", "intent": "calendar_info"},
    {"text": "Tell me about the school calendar", "intent": "calendar_info"},
    {"text": "What term are we in?", "intent": "calendar_info"},
    {"text": "Current school year", "intent": "calendar_info"},
    {"text": "How many quarters are there?", "intent": "calendar_info"},
    {"text": "When does the next quarter start?", "intent": "calendar_info"},
    {"text": "Calendar for this school year", "intent": "calendar_info"},
    {"text": "What is the current week number?", "intent": "calendar_info"},
    {"text": "Week schedule for this term", "intent": "calendar_info"},
    {"text": "Is this week an exam week?", "intent": "calendar_info"},
    {"text": "Academic calendar schedule", "intent": "calendar_info"},
    {"text": "Overview of the academic year", "intent": "calendar_info"},
    {"text": "Term dates for this year", "intent": "calendar_info"},
    {"text": "How many weeks left in this term?", "intent": "calendar_info"},
    {"text": "When is the next quarter?", "intent": "calendar_info"},
    {"text": "What does the school calendar look like?", "intent": "calendar_info"},
    {"text": "Which week are we on?", "intent": "calendar_info"},
    {"text": "School year information", "intent": "calendar_info"},
    {"text": "Give me the calendar details", "intent": "calendar_info"},
    {"text": "What quarter is it?", "intent": "calendar_info"},
    {"text": "Are we on a break week?", "intent": "calendar_info"},
    {"text": "Academic term schedule", "intent": "calendar_info"},
    {"text": "How long is the school year?", "intent": "calendar_info"},
    # Typo variants
    {"text": "What is the skool calendar?", "intent": "calendar_info"},
    {"text": "What week is it know?", "intent": "calendar_info"},
    {"text": "Current academic wek", "intent": "calendar_info"},
    {"text": "When is the end of Term 1?", "intent": "calendar_info"},
    {"text": "how meny weeks in this term", "intent": "calendar_info"},
    {"text": "Academic calender for this year", "intent": "calendar_info"},
    {"text": "When are the eksam weeks?", "intent": "calendar_info"},
    {"text": "Whats the current tern?", "intent": "calendar_info"},
    {"text": "Calendar overveiw", "intent": "calendar_info"},
    {"text": "When is the next term brek?", "intent": "calendar_info"},
    {"text": "How long is this tern?", "intent": "calendar_info"},
    {"text": "What tern are we in?", "intent": "calendar_info"},
    {"text": "Current skool year", "intent": "calendar_info"},
    {"text": "how meny quarters are there", "intent": "calendar_info"},
    {"text": "Calender for this school year", "intent": "calendar_info"},
    {"text": "Whats the current week numbr?", "intent": "calendar_info"},
    {"text": "Which weak are we on?", "intent": "calendar_info"},
    {"text": "how meny weeks left in this tern", "intent": "calendar_info"},
    # Tagalog variants
    {"text": "Ano ang school calendar?", "intent": "calendar_info"},
    {"text": "Ipakita ang academic calendar", "intent": "calendar_info"},
    {"text": "Kailan magsisimula ang Term 2?", "intent": "calendar_info"},
    {"text": "Anong linggo na ngayon?", "intent": "calendar_info"},
    {"text": "Kasalukuyang academic week", "intent": "calendar_info"},
    {"text": "Kailan ang katapusan ng Term 1?", "intent": "calendar_info"},
    {"text": "Ipakita ang schedule ng trimester", "intent": "calendar_info"},
    {"text": "Ilang linggo sa term na ito?", "intent": "calendar_info"},
    {"text": "Academic calendar para sa taong ito", "intent": "calendar_info"},
    {"text": "Kailan ang exam weeks?", "intent": "calendar_info"},
    {"text": "Anong school year na ngayon?", "intent": "calendar_info"},
    {"text": "Kailan matatapos ang school year?", "intent": "calendar_info"},
    {"text": "Anong term tayo ngayon?", "intent": "calendar_info"},
    {"text": "Kailan ang susunod na term break?", "intent": "calendar_info"},
    {"text": "Gaano kahaba ang term na ito?", "intent": "calendar_info"},
    {"text": "Ilang quarters mayroon?", "intent": "calendar_info"},
    {"text": "Kailan magsisimula ang susunod na quarter?", "intent": "calendar_info"},
    {"text": "Anong week number ngayon?", "intent": "calendar_info"},
    {"text": "Exam week ba ngayon?", "intent": "calendar_info"},
    {"text": "Ilang linggo pa bago matapos ang term?", "intent": "calendar_info"},

    # ═══════════════════════════════════════════════════════════════════════════
    # how_to_upload  (~70 samples)
    # ═══════════════════════════════════════════════════════════════════════════
    {"text": "How do I upload a DLL?", "intent": "how_to_upload"},
    {"text": "How to submit my DLL?", "intent": "how_to_upload"},
    {"text": "Steps to upload a document", "intent": "how_to_upload"},
    {"text": "How do I upload files?", "intent": "how_to_upload"},
    {"text": "Upload instructions", "intent": "how_to_upload"},
    {"text": "How do I scan a document?", "intent": "how_to_upload"},
    {"text": "How to upload offline?", "intent": "how_to_upload"},
    {"text": "Can I upload multiple files?", "intent": "how_to_upload"},
    {"text": "How does the upload work?", "intent": "how_to_upload"},
    {"text": "How to fix upload errors?", "intent": "how_to_upload"},
    {"text": "How to upload from phone?", "intent": "how_to_upload"},
    {"text": "Where do I upload my DLL?", "intent": "how_to_upload"},
    {"text": "Steps to upload a DLL file", "intent": "how_to_upload"},
    {"text": "How to attach a DLL?", "intent": "how_to_upload"},
    {"text": "What format should the DLL be in?", "intent": "how_to_upload"},
    {"text": "How do I submit my DLL for review?", "intent": "how_to_upload"},
    {"text": "Can I upload from a mobile device?", "intent": "how_to_upload"},
    {"text": "Does the system support PDF uploads?", "intent": "how_to_upload"},
    {"text": "How do I upload a scanned DLL?", "intent": "how_to_upload"},
    {"text": "Upload guide for DLLs", "intent": "how_to_upload"},
    {"text": "How to upload in the app?", "intent": "how_to_upload"},
    {"text": "How to submit my document?", "intent": "how_to_upload"},
    {"text": "What file types are accepted?", "intent": "how_to_upload"},
    {"text": "How many files can I upload at once?", "intent": "how_to_upload"},
    {"text": "Where do I find the upload button?", "intent": "how_to_upload"},
    {"text": "Do I need internet to upload?", "intent": "how_to_upload"},
    {"text": "How to upload DLL from laptop?", "intent": "how_to_upload"},
    {"text": "How to upload offline then sync?", "intent": "how_to_upload"},
    {"text": "How do I re-upload a DLL?", "intent": "how_to_upload"},
    {"text": "Can I edit a DLL after upload?", "intent": "how_to_upload"},
    {"text": "Uploading step by step", "intent": "how_to_upload"},
    {"text": "Help me upload my DLL", "intent": "how_to_upload"},
    {"text": "Where to submit DLLs?", "intent": "how_to_upload"},
    {"text": "How to put my DLL in the system?", "intent": "how_to_upload"},
    {"text": "What is the upload process?", "intent": "how_to_upload"},
    {"text": "I can't upload what should I do?", "intent": "how_to_upload"},
    {"text": "My upload failed what now?", "intent": "how_to_upload"},
    {"text": "How to upload properly?", "intent": "how_to_upload"},
    {"text": "Can I upload in bulk?", "intent": "how_to_upload"},
    {"text": "How do I change a submitted DLL?", "intent": "how_to_upload"},
    {"text": "How to upload my lesson plan?", "intent": "how_to_upload"},
    {"text": "Upload directions", "intent": "how_to_upload"},
    # Typo variants
    {"text": "How do I upload a DLL?", "intent": "how_to_upload"},
    {"text": "How to subit my DLL?", "intent": "how_to_upload"},
    {"text": "Steps to upload a documnt", "intent": "how_to_upload"},
    {"text": "Upload instrutions", "intent": "how_to_upload"},
    {"text": "How to upload offlne?", "intent": "how_to_upload"},
    {"text": "Can I upload multiple filse?", "intent": "how_to_upload"},
    {"text": "How does the upload wurk?", "intent": "how_to_upload"},
    {"text": "How to fix upload erors?", "intent": "how_to_upload"},
    {"text": "How to upload from fone?", "intent": "how_to_upload"},
    {"text": "Wher do I upload my DLL?", "intent": "how_to_upload"},
    {"text": "What format shoud the DLL be in?", "intent": "how_to_upload"},
    {"text": "Upload gide for DLLs", "intent": "how_to_upload"},
    {"text": "What file types are aceptd?", "intent": "how_to_upload"},
    {"text": "how meny files can I upload at once", "intent": "how_to_upload"},
    {"text": "How to upload offline then sinc?", "intent": "how_to_upload"},
    {"text": "How do I re-upload a DLL?", "intent": "how_to_upload"},
    # Tagalog variants
    {"text": "Paano mag-upload ng DLL?", "intent": "how_to_upload"},
    {"text": "Paano i-submit ang DLL ko?", "intent": "how_to_upload"},
    {"text": "Mga hakbang para mag-upload ng dokumento", "intent": "how_to_upload"},
    {"text": "Paano mag-upload ng files?", "intent": "how_to_upload"},
    {"text": "Mga instruction sa pag-upload", "intent": "how_to_upload"},
    {"text": "Paano mag-upload offline?", "intent": "how_to_upload"},
    {"text": "Puwede ba akong mag-upload ng maramihan?", "intent": "how_to_upload"},
    {"text": "Paano gumagana ang upload?", "intent": "how_to_upload"},
    {"text": "Paano ayusin ang upload errors?", "intent": "how_to_upload"},
    {"text": "Paano mag-upload gamit ang phone?", "intent": "how_to_upload"},
    {"text": "Saan ako mag-upload ng DLL ko?", "intent": "how_to_upload"},
    {"text": "Ano ang format ng DLL?", "intent": "how_to_upload"},
    {"text": "Puwede ba mag-upload gamit ang mobile?", "intent": "how_to_upload"},
    {"text": "Sinusuportahan ba ng system ang PDF?", "intent": "how_to_upload"},
    {"text": "Paano mag-upload ng scanned DLL?", "intent": "how_to_upload"},
    {"text": "Gabay sa pag-upload ng DLL", "intent": "how_to_upload"},
    {"text": "Saan ang upload button?", "intent": "how_to_upload"},
    {"text": "Kailangan ba ng internet para mag-upload?", "intent": "how_to_upload"},
    {"text": "Paano mag-upload gamit ang laptop?", "intent": "how_to_upload"},
    {"text": "Paano mag-upload offline at mag-sync later?", "intent": "how_to_upload"},
    {"text": "Bakit hindi ako makapag-upload?", "intent": "how_to_upload"},

    # ═══════════════════════════════════════════════════════════════════════════
    # general_help  (~70 samples)
    # ═══════════════════════════════════════════════════════════════════════════
    {"text": "What can you help me with?", "intent": "general_help"},
    {"text": "Help me understand this system", "intent": "general_help"},
    {"text": "What does CEDIMS do?", "intent": "general_help"},
    {"text": "What can I ask you?", "intent": "general_help"},
    {"text": "How does compliance work?", "intent": "general_help"},
    {"text": "Explain the monitoring system", "intent": "general_help"},
    {"text": "Give me a tour", "intent": "general_help"},
    {"text": "What is a DLL?", "intent": "general_help"},
    {"text": "How is compliance calculated?", "intent": "general_help"},
    {"text": "I need help", "intent": "general_help"},
    {"text": "What features are available?", "intent": "general_help"},
    {"text": "Tell me about this app", "intent": "general_help"},
    {"text": "How can you assist me?", "intent": "general_help"},
    {"text": "System guide", "intent": "general_help"},
    {"text": "Show available commands", "intent": "general_help"},
    {"text": "What do you do?", "intent": "general_help"},
    {"text": "How does this system work?", "intent": "general_help"},
    {"text": "Explain the dashboard", "intent": "general_help"},
    {"text": "What is this platform for?", "intent": "general_help"},
    {"text": "CEDIMS overview", "intent": "general_help"},
    {"text": "How does the monitoring work?", "intent": "general_help"},
    {"text": "What can the system do?", "intent": "general_help"},
    {"text": "I don't understand this system", "intent": "general_help"},
    {"text": "Give me an introduction", "intent": "general_help"},
    {"text": "Tell me about yourself", "intent": "general_help"},
    {"text": "What is SmartE Vision?", "intent": "general_help"},
    {"text": "Explain everything", "intent": "general_help"},
    {"text": "How can I use this system?", "intent": "general_help"},
    {"text": "What are the main features?", "intent": "general_help"},
    {"text": "How do I navigate this app?", "intent": "general_help"},
    {"text": "What is the purpose of CEDIMS?", "intent": "general_help"},
    {"text": "How do I get started?", "intent": "general_help"},
    {"text": "Introduction to the system", "intent": "general_help"},
    {"text": "Show me around", "intent": "general_help"},
    {"text": "What is the compliance system?", "intent": "general_help"},
    {"text": "Tell me how this works", "intent": "general_help"},
    {"text": "I am new here help me", "intent": "general_help"},
    {"text": "Guide me through the system", "intent": "general_help"},
    {"text": "What should I know about this app?", "intent": "general_help"},
    {"text": "How to use SmartE Vision?", "intent": "general_help"},
    # Typo variants
    {"text": "What can you help me with?", "intent": "general_help"},
    {"text": "Help me understan this system", "intent": "general_help"},
    {"text": "What does CEDIMS do?", "intent": "general_help"},
    {"text": "How does complience work?", "intent": "general_help"},
    {"text": "Expain the monitoring system", "intent": "general_help"},
    {"text": "What is a DLL?", "intent": "general_help"},
    {"text": "How is complience calculated?", "intent": "general_help"},
    {"text": "I need hel", "intent": "general_help"},
    {"text": "Systm guide", "intent": "general_help"},
    {"text": "How does this systm work?", "intent": "general_help"},
    {"text": "How dos the monitoring work?", "intent": "general_help"},
    {"text": "Tell me about youreslf", "intent": "general_help"},
    {"text": "What is SmartE Visin?", "intent": "general_help"},
    {"text": "Expain everything", "intent": "general_help"},
    {"text": "What are the main feachures?", "intent": "general_help"},
    {"text": "What is the purpse of CEDIMS?", "intent": "general_help"},
    {"text": "Introdution to the system", "intent": "general_help"},
    {"text": "Im new her help me", "intent": "general_help"},
    {"text": "What shoud I know about this app?", "intent": "general_help"},
    # Tagalog variants
    {"text": "Ano ang maitutulong mo sa akin?", "intent": "general_help"},
    {"text": "Tulungan mo akong maintindihan ang system na ito", "intent": "general_help"},
    {"text": "Ano ang ginagawa ng CEDIMS?", "intent": "general_help"},
    {"text": "Ano ang puwede kong itanong?", "intent": "general_help"},
    {"text": "Paano gumagana ang compliance?", "intent": "general_help"},
    {"text": "Ipaliwanag ang monitoring system", "intent": "general_help"},
    {"text": "Bigyan mo ako ng tour", "intent": "general_help"},
    {"text": "Ano ang DLL?", "intent": "general_help"},
    {"text": "Paano kinakalkula ang compliance?", "intent": "general_help"},
    {"text": "Kailangan ko ng tulong", "intent": "general_help"},
    {"text": "Anong features ang available?", "intent": "general_help"},
    {"text": "Sabihin mo sa akin ang tungkol sa app", "intent": "general_help"},
    {"text": "Paano mo ako matutulungan?", "intent": "general_help"},
    {"text": "Gabay sa system", "intent": "general_help"},
    {"text": "Ano ang ginagawa mo?", "intent": "general_help"},
    {"text": "Paano gumagana ang system na ito?", "intent": "general_help"},
    {"text": "Ipaliwanag ang dashboard", "intent": "general_help"},
    {"text": "Pangkalahatang-ideya ng CEDIMS", "intent": "general_help"},
    {"text": "Hindi ko maintindihan ang system na ito", "intent": "general_help"},
    {"text": "Sabihin mo ang tungkol sa iyong sarili", "intent": "general_help"},
    {"text": "Bago ako dito tulungan mo ako", "intent": "general_help"},
    {"text": "Gabayan mo ako sa system", "intent": "general_help"},
]

# ─── Build DataFrame ────────────────────────────────────────────────────────

df = pd.DataFrame(TRAINING_DATA)
print("Intent distribution:")
print(df['intent'].value_counts())
print(f"\nTotal samples: {len(df)}")

# ─── Train/Test Split ──────────────────────────────────────────────────────

X = df['text']
y = df['intent']
intents = sorted(y.unique())

X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.25, random_state=42, stratify=y
)

# ─── Vectorize with character n-grams for typo resilience ──────────────────

vectorizer = CountVectorizer(
    analyzer='char',
    ngram_range=(2, 5),
    min_df=2,
    max_features=5000,
    lowercase=True
)
X_train_vec = vectorizer.fit_transform(X_train)
X_test_vec = vectorizer.transform(X_test)
vocab = vectorizer.get_feature_names_out()

print(f"\nVocabulary size: {len(vocab)}")

# ─── Train Logistic Regression ──────────────────────────────────────────────

clf = LogisticRegression(
    C=1.0,
    solver='saga',
    max_iter=3000,
    random_state=42
)
clf.fit(X_train_vec, y_train)

train_acc = clf.score(X_train_vec, y_train)
test_acc = clf.score(X_test_vec, y_test)
print(f"\nTraining accuracy: {train_acc:.2%}")
print(f"Test accuracy: {test_acc:.2%}")

# ─── Classification Report ──────────────────────────────────────────────────

y_pred = clf.predict(X_test_vec)
report = classification_report(y_test, y_pred, output_dict=True)
print(f"\nClassification Report:")
print(classification_report(y_test, y_pred))

# ─── Confusion Matrix ───────────────────────────────────────────────────────

cm = confusion_matrix(y_test, y_pred)
plt.figure(figsize=(10, 8))
sns.heatmap(cm, annot=True, fmt='d', cmap='Blues',
            xticklabels=intents, yticklabels=intents)
plt.title('Intent Classifier Confusion Matrix')
plt.xlabel('Predicted')
plt.ylabel('Actual')
plt.tight_layout()
plt.savefig(os.path.join(RESULTS_DIR, 'intent_confusion_matrix.png'), dpi=150)
plt.close()

# ─── 5-Fold Cross-Validation ───────────────────────────────────────────────

skf = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
cv_scores = []
for train_idx, val_idx in skf.split(X, y):
    X_cv_train, X_cv_val = X.iloc[train_idx], X.iloc[val_idx]
    y_cv_train, y_cv_val = y.iloc[train_idx], y.iloc[val_idx]
    cv_vec = CountVectorizer(analyzer='char', ngram_range=(2, 5), min_df=1)
    X_cv_train_vec = cv_vec.fit_transform(X_cv_train)
    X_cv_val_vec = cv_vec.transform(X_cv_val)
    cv_clf = LogisticRegression(C=1.0, solver='saga', max_iter=3000)
    cv_clf.fit(X_cv_train_vec, y_cv_train)
    cv_scores.append(cv_clf.score(X_cv_val_vec, y_cv_val))

cv_mean = np.mean(cv_scores)
cv_std = np.std(cv_scores)
print(f"\n5-Fold CV Accuracy: {cv_mean:.2%} ± {cv_std:.2%}")
print(f"Fold scores: {[f'{s:.2%}' for s in cv_scores]}")

# ─── ROC Curves ─────────────────────────────────────────────────────────────

y_prob = clf.predict_proba(X_test_vec)
plt.figure(figsize=(10, 8))
for i, intent_name in enumerate(intents):
    fpr, tpr, _ = roc_curve((y_test == intent_name).astype(int), y_prob[:, i])
    auc_score = auc(fpr, tpr)
    plt.plot(fpr, tpr, label=f'{intent_name} (AUC = {auc_score:.2f})')
plt.plot([0, 1], [0, 1], 'k--', alpha=0.3)
plt.xlabel('False Positive Rate')
plt.ylabel('True Positive Rate')
plt.title('ROC Curves per Intent')
plt.legend(loc='lower right')
plt.tight_layout()
plt.savefig(os.path.join(RESULTS_DIR, 'intent_roc_curves.png'), dpi=150)
plt.close()

# ─── Top Predictive N-grams per Intent ──────────────────────────────────────

top_ngrams = {}
for i, intent in enumerate(intents):
    coefs = clf.coef_[i]
    top_indices = np.argsort(coefs)[-10:][::-1]
    ngrams = [(vocab[idx], float(coefs[idx])) for idx in top_indices]
    top_ngrams[intent] = ngrams

# Plot
fig, axes = plt.subplots(2, 4, figsize=(18, 10))
axes = axes.flatten()
for i, intent in enumerate(intents):
    if i >= len(axes):
        break
    words = [w[0] for w in top_ngrams[intent]]
    scores = [w[1] for w in top_ngrams[intent]]
    axes[i].barh(range(len(words)), scores, color='steelblue')
    axes[i].set_yticks(range(len(words)))
    axes[i].set_yticklabels(words)
    axes[i].invert_yaxis()
    axes[i].set_title(f'{intent}')
    axes[i].set_xlabel('Coefficient')
plt.suptitle('Top 10 Predictive Character N-grams per Intent', fontsize=14)
plt.tight_layout()
plt.savefig(os.path.join(RESULTS_DIR, 'intent_top_words.png'), dpi=150)
plt.close()

# ─── Export Model JSON ──────────────────────────────────────────────────────

coef_dict = {}
for i, intent in enumerate(intents):
    coef_dict[intent] = {vocab[idx]: float(clf.coef_[i][idx]) for idx in range(len(vocab))}

model = {
    "version": "2.0.0",
    "intents": intents,
    "vocabulary": {word: idx for idx, word in enumerate(vocab)},
    "coefficients": coef_dict,
    "intercepts": {intent: float(clf.intercept_[i]) for i, intent in enumerate(intents)},
    "classes_": intents,
    "training_metrics": {
        "n_samples": len(df),
        "n_intents": len(intents),
        "vocabulary_size": len(vocab),
        "train_accuracy": round(train_acc * 100, 2),
        "test_accuracy": round(test_acc * 100, 2),
        "cv_mean": round(cv_mean * 100, 2),
        "cv_std": round(cv_std * 100, 2),
        "cv_folds": [round(s * 100, 2) for s in cv_scores],
        "per_intent": {}
    }
}

for intent in intents:
    r = report[intent]
    model["training_metrics"]["per_intent"][intent] = {
        "precision": round(r["precision"] * 100, 2),
        "recall": round(r["recall"] * 100, 2),
        "f1_score": round(r["f1-score"] * 100, 2),
        "support": int(r["support"])
    }

output_path = os.path.join(OUTPUT_DIR, 'intent_classifier_model.json')
with open(output_path, 'w') as f:
    json.dump(model, f, indent=2)
print(f"\nExported: {output_path}")

# ─── Save Results Summary ────────────────────────────────────────────────────

results = {
    "training_date": pd.Timestamp.now().isoformat(),
    "n_samples": len(df),
    "intents": intents,
    "vocabulary_size": len(vocab),
    "train_accuracy": round(train_acc * 100, 2),
    "test_accuracy": round(test_acc * 100, 2),
    "cv_mean": round(cv_mean * 100, 2),
    "cv_std": round(cv_std * 100, 2),
    "cv_folds": [round(s * 100, 2) for s in cv_scores]
}
with open(os.path.join(RESULTS_DIR, 'intent_training_results.json'), 'w') as f:
    json.dump(results, f, indent=2)

print(f"\n{'=' * 50}")
print(f"  TRAINING COMPLETE")
print(f"{'=' * 50}")
print(f"  Intents: {len(intents)}")
print(f"  Training samples: {len(df)}")
print(f"  Vocab size: {len(vocab)}")
print(f"  Test accuracy: {test_acc:.2%}")
print(f"  CV accuracy: {cv_mean:.2%} ± {cv_std:.2%}")
print(f"{'=' * 50}")
