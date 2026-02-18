/**
 * DOCX → PDF Transcoding — mammoth.js + pdf-lib
 * All processing happens client-side.
 * The original Word document never leaves the teacher's device.
 */

import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

export async function transcodeToPdf(file: File): Promise<Uint8Array> {
    const ext = file.name.split('.').pop()?.toLowerCase();

    // If already PDF, return as-is
    if (ext === 'pdf') {
        const buffer = await file.arrayBuffer();
        return new Uint8Array(buffer);
    }

    // DOCX → PDF pipeline
    if (ext === 'docx' || ext === 'doc') {
        return docxToPdf(file);
    }

    throw new Error(`Unsupported file type: .${ext}. Only .docx and .pdf files are accepted.`);
}

async function docxToPdf(file: File): Promise<Uint8Array> {
    const mammoth = await import('mammoth');
    const buffer = await file.arrayBuffer();

    // Extract HTML from DOCX
    const result = await mammoth.convertToHtml({ arrayBuffer: buffer });
    const html = result.value;

    // Parse HTML into text paragraphs
    const paragraphs = htmlToParagraphs(html);

    // Build PDF from paragraphs
    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const PAGE_WIDTH = 595.28; // A4
    const PAGE_HEIGHT = 841.89;
    const MARGIN = 50;
    const FONT_SIZE = 11;
    const LINE_HEIGHT = FONT_SIZE * 1.5;
    const CONTENT_WIDTH = PAGE_WIDTH - 2 * MARGIN;

    let page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    let y = PAGE_HEIGHT - MARGIN;

    for (const para of paragraphs) {
        const currentFont = para.bold ? boldFont : font;
        const fontSize = para.heading ? 14 : FONT_SIZE;
        const lineH = para.heading ? fontSize * 1.8 : LINE_HEIGHT;

        // Word-wrap text
        const lines = wrapText(para.text, currentFont, fontSize, CONTENT_WIDTH);

        for (const line of lines) {
            if (y < MARGIN + lineH) {
                page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
                y = PAGE_HEIGHT - MARGIN;
            }

            page.drawText(line, {
                x: MARGIN,
                y,
                size: fontSize,
                font: currentFont,
                color: rgb(0.1, 0.1, 0.1)
            });

            y -= lineH;
        }

        // Paragraph spacing
        y -= LINE_HEIGHT * 0.5;
    }

    return pdfDoc.save();
}

interface Paragraph {
    text: string;
    bold: boolean;
    heading: boolean;
}

function htmlToParagraphs(html: string): Paragraph[] {
    const paragraphs: Paragraph[] = [];

    // Simple HTML parser — extract text from tags
    const tagRegex = /<(h[1-6]|p|li|tr|td|th|div|br\s*\/?)([^>]*)>([\s\S]*?)<\/\1>|<br\s*\/?>/gi;
    let match;

    // Fallback: if no tags match, use the raw text split by line breaks
    const matches: Paragraph[] = [];

    while ((match = tagRegex.exec(html)) !== null) {
        const tag = match[1]?.toLowerCase() || '';
        const content = match[3] || '';
        const text = stripHtml(content).trim();

        if (text) {
            matches.push({
                text,
                bold: /^h[1-6]$/.test(tag) || /<strong|<b>/i.test(content),
                heading: /^h[1-6]$/.test(tag)
            });
        }
    }

    if (matches.length > 0) {
        return matches;
    }

    // Fallback: strip all HTML and split by newlines
    const plainText = stripHtml(html).trim();
    if (plainText) {
        for (const line of plainText.split('\n')) {
            const trimmed = line.trim();
            if (trimmed) {
                paragraphs.push({ text: trimmed, bold: false, heading: false });
            }
        }
    }

    return paragraphs;
}

function stripHtml(html: string): string {
    return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"');
}

function wrapText(text: string, font: { widthOfTextAtSize: (t: string, s: number) => number }, fontSize: number, maxWidth: number): string[] {
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';

    for (const word of words) {
        const testLine = currentLine ? `${currentLine} ${word}` : word;
        const width = font.widthOfTextAtSize(testLine, fontSize);

        if (width > maxWidth && currentLine) {
            lines.push(currentLine);
            currentLine = word;
        } else {
            currentLine = testLine;
        }
    }

    if (currentLine) {
        lines.push(currentLine);
    }

    return lines.length > 0 ? lines : [''];
}
