import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import fs from 'fs';

async function createPdf(filename, textLines) {
    const pdfDoc = await PDFDocument.create();
    const timesRomanFont = await pdfDoc.embedFont(StandardFonts.TimesRoman);
    const page = pdfDoc.addPage();
    const { width, height } = page.getSize();
    const fontSize = 12;

    let y = height - 50;
    for (const line of textLines) {
        page.drawText(line, {
            x: 50,
            y: y,
            size: fontSize,
            font: timesRomanFont,
            color: rgb(0, 0, 0),
        });
        y -= 20;
    }

    const pdfBytes = await pdfDoc.save();
    fs.writeFileSync(filename, pdfBytes);
    console.log(`Created ${filename}`);
}

async function main() {
    // PDF 1: English DLL, Explicit Week
    await createPdf('Sample_English_DLL_Week3_Math.pdf', [
        'DAILY LESSON LOG',
        'School: EAST CENTRAL SCHOOL                 Grade Level: 4',
        'Teacher: JOHN DOE                           Subject: Mathematics',
        'Date: August 12-16, 2025                    Quarter: 1st',
        'Week #: 3',
        '----------------------------------------------------------',
        'A. Content Standards',
        '- The learner demonstrates understanding of whole numbers up to 100,000.',
        'B. Performance Standards',
        '- The learner is able to recognize and represent whole numbers up to 100,000.',
        'C. Learning Competencies',
        '- Visualizes numbers up to 100,000 with emphasis on numbers 10,001–100,000.'
    ]);

    // PDF 2: Tagalog DLL, No Week, Science
    await createPdf('Sample_Tagalog_DLL_Science_Jan5_9.pdf', [
        'DETALYADONG PLANO NG LEKSYON (DLL)',
        'Paaralan: BALIBAGO ELEMENTARY SCHOOL        Baitang/ Antas: III',
        'Guro: JOLINA A. SARMIENTO                   Asignatura: Science',
        'Petsa/ Oras: JANUARY 5-9, 2026              Markahan: IKALAWA',
        '----------------------------------------------------------',
        'I. LAYUNIN',
        'A. Pamantayan sa Nilalaman',
        '- Naipamamalas ang pag-unawa sa mga bahagi ng katawan ng tao.',
        'B. Pamantayan sa Pagganap',
        '- Nakikilala ang mga bahagi ng katawan at ang gamit nito.',
        'C. Mga Kasanayan sa Pagkatuto',
        '- Natutukoy ang mga pangunahing bahagi ng katawan (mata, tainga, ilong, atbp).'
    ]);

    // PDF 3: ISP (Instructional Supervisory Plan), AP
    await createPdf('Sample_ISP_AP.pdf', [
        'INSTRUCTIONAL SUPERVISORY PLAN (ISP)',
        'School: SOUTH HIGH SCHOOL                   Grade Level: 10',
        'Teacher: MARIA CLARA                        Subject: Araling Panlipunan',
        'Date: September 8-12, 2025                  Quarter: 1st',
        '----------------------------------------------------------',
        'A. Focus of Supervision:',
        '- Application of differentiated instruction techniques.',
        'B. Pre-Observation Agreement:',
        '- The teacher will use a variety of materials for different learner styles.',
        'C. Post-Observation Feedback:',
        '- The teacher effectively grouped students based on readiness.'
    ]);
}

main().catch(console.error);
