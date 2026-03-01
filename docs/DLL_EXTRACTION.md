# DLL Content Extraction & OCR System

## Overview

The EVISION system now includes an advanced **Detailed Lesson Plan (DLL) Content Extraction** system powered by Tesseract.js OCR. This system can automatically extract and parse structured content from DLL documents in both **English** and **Filipino (Tagalog)**.

## Supported Languages

- **English**: Full support for English-language DLL documents
- **Filipino (Tagalog)**: Full support for Filipino/Tagalog DLL documents
- **Auto-detection**: System automatically detects document language

## Features

### 1. Multilingual OCR

The system uses Tesseract.js with language-specific workers:
- English DLL documents: Uses 'eng' language worker
- Filipino DLL documents: Uses 'fil' language worker
- Language detection: Automatic scanning of keywords to identify document language

### 2. Structured Content Extraction

The system extracts the following DLL sections:

#### Required Sections
- **Content Standards** (Pamantayan sa Nilalaman)
- **Performance Standards** (Pamantayan sa Pagganap)
- **Learning Competencies** (Kasanayan/Learning Objectives)
- **Content** (Nilalaman/Subject Matter)
- **Learning Activities** (Mga Gawain sa Paaralan)
- **Assessment** (Pagtataya/Evaluation)

#### Optional Sections
- **Resources** (Kagamitan/Learning Materials)
- **Remarks** (Catatan/Notes)

### 3. Metadata Extraction

The system automatically extracts:
- **School Name** (Paaralan)
- **Teacher Name** (Guro)
- **Subject** (Asignatura/Subject)
- **Grade Level** (Baitang/Grade)
- **Week Number** (Linggo/Week)
- **School Year** (S.Y.)
- **Document Language**
- **OCR Confidence Score**

### 4. Content Validation

The system validates DLL completeness:
- Checks for presence of all required sections
- Calculates completion percentage
- Identifies missing fields
- Generates completion summary

## Usage

### Extract DLL Content from File

```typescript
import { extractDLLContent, parseDLLContent } from '@/lib/utils/ocr';

// Extract both metadata and content
const dllContent = await extractDLLContent(file);

console.log('School:', dllContent.metadata.school);
console.log('Teacher:', dllContent.metadata.teacher);
console.log('Language:', dllContent.metadata.language);
console.log('Content Standards:', dllContent.contentStandards);
```

### Validate DLL Content

```typescript
import { validateDLLCompletion } from '@/lib/utils/dll-parser';

const validation = validateDLLCompletion(dllContent);

console.log('Complete:', validation.isComplete);
console.log('Completion:', validation.completionPercentage + '%');
console.log('Missing:', validation.missingFields);
```

### Generate DLL Summary

```typescript
import { generateDLLSummary } from '@/lib/utils/dll-parser';

const summary = generateDLLSummary(dllContent);
console.log(summary);
```

## Technical Details

### Language Detection Algorithm

The system uses keyword frequency analysis to detect language:

**Filipino Indicators:**
- PAARALAN, GURO, PETSA, ORAS, BAITANG, ASIGNATURA
- NILALAMAN, PAMANTAYAN, KASANAYAN, KURIKULUM
- EDUKASYON SA PAGPAPAKATAO, ARALING PANLIPUNAN

**English Indicators:**
- SCHOOL, TEACHER, DATE, TIME, GRADE, SUBJECT
- CONTENT, STANDARDS, COMPETENCIES, LEARNING OBJECTIVES
- PERFORMANCE, QUARTER, WEEK, ASSESSMENT

### Section Extraction Algorithm

The system uses regex patterns to identify section headers:

**English Headers:**
- A. Content Standards / B. Performance Standards / C. Learning Competencies
- D. Content / IV. Subject Matter
- V. Learning Activities / VI. Resources
- Assessment / Evaluation / Remarks / Notes

**Filipino Headers:**
- A. Pamantayan sa Nilalaman / B. Pamantayan sa Pagganap / C. Kasanayan
- D. Nilalaman / IV. Mga Nilalaman
- V. Mga Gawain sa Paaralan / Mga Hakbang sa Pagtuturo
- Pagtataya / Sukat / Catatan / Panghunahunan

### Bullet Point Extraction

The system recognizes multiple bullet point formats:
- `a. b. c.` (letter format)
- `1. 2. 3.` (numeric format)
- `- • *` (symbol format)
- `A) B) C)` (letter with parenthesis format)

## Data Structures

### DocMetadata Interface

```typescript
interface DocMetadata {
    docType: 'DLL' | 'ISP' | 'ISR' | 'Unknown';
    weekNumber: number | null;
    schoolYear: string | null;
    subject: string | null;
    gradeLevel: string | null;
    rawText: string;
    confidence: number; // 0-100
    language: 'English' | 'Filipino' | 'Unknown';
    school: string | null;
    teacher: string | null;
}
```

### DLLContent Interface

```typescript
interface DLLContent {
    metadata: DocMetadata;
    contentStandards: string[];
    performanceStandards: string[];
    learningCompetencies: string[];
    content: string[];
    learningActivities: string[];
    resources: string[];
    assessment: string[];
    remarks: string | null;
}
```

## Example Output

### Sample Filipino DLL

```
School: BALIBAGO ELEMENTARY SCHOOL
Teacher: JOLINA A. SARMIENTO
Subject: GMRC (Values Education)
Grade Level: III
Week: 1
School Year: 2026-2027
Language: Filipino

Content Standards: [
  "Natututuhan ng mag-aaral ang pag-unawa sa pamamahala sa mga bagay na hindi na nagagamit...",
  ...
]

Performance Standards: [
  "Naisasagawa ng mag-aaral ang mga gawain sa tahanan o paaralan...",
  ...
]

Learning Competencies: [
  "Natutukoy ang mga paraan ng panghihikayat sa kapuwa...",
  ...
]
```

## Accuracy & Limitations

### OCR Accuracy Factors
- **Document Quality**: Clear, well-scanned PDFs yield 95%+ accuracy
- **Handwritten Documents**: 60-80% accuracy (Tesseract has limitations with handwriting)
- **Font Types**: Standard fonts (Arial, Times New Roman) yield best results
- **Language Complexity**: Filipino documents with mixed English may have 85-90% accuracy

### Known Limitations
- Tesseract struggles with cursive or heavily stylized fonts
- Complex table layouts may not parse correctly
- Mixed English-Filipino documents may be misclassified
- Very small font sizes (<10pt) reduce OCR accuracy

### Recommendations for Best Results
1. Use well-scanned PDFs (minimum 300 DPI)
2. Ensure even lighting and no shadows on document
3. Use standard fonts where possible
4. Avoid heavy background colors or watermarks
5. Keep DLL structure consistent with official templates

## Integration with EVISION Upload Pipeline

When a DLL document is uploaded:

1. **Transcoding Phase**: Converts Word documents to PDF
2. **Compression Phase**: Reduces file size while preserving text quality
3. **OCR Phase**: Extracts metadata and language detection
4. **DLL Parsing Phase**: Structures content from extracted text
5. **Validation Phase**: Checks for completeness and compliance
6. **Upload Phase**: Saves to Supabase with extracted metadata

## Future Enhancements

- [ ] Machine learning model for document section classification
- [ ] Support for additional languages (Vietnamese, Indonesian)
- [ ] Handwriting recognition improvements
- [ ] Table data extraction and structure preservation
- [ ] Automatic compliance gap detection
- [ ] AI-powered section quality assessment
- [ ] Template-based extraction for specific school formats

## Troubleshooting

### Issue: Language detected incorrectly

**Solution**: Manually specify language in extractDLLContent parameters (future feature)

### Issue: Content not extracted correctly

**Possible Causes:**
- Document uses non-standard template
- Mixed language content
- Poor OCR quality

**Solution:**
- Try re-scanning document
- Ensure document matches official DLL template
- Check OCR confidence score

### Issue: Tesseract crashes on large files

**Solution:**
- Compress PDF before upload
- Split document into multiple files
- Use "fil" language worker for large Filipino documents (more efficient)

## Support

For issues or questions about DLL extraction:
1. Check OCR confidence score in metadata
2. Review extracted rawText for OCR errors
3. Verify document language detection
4. Contact system administrator with sample document
