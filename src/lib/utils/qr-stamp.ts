/**
 * QR-Digest Stamping — qrcode + pdf-lib
 * Generates a verification QR code and embeds it onto the first page of a PDF.
 * Creates a "Smart Document" that is verifiable even when printed.
 */

import { PDFDocument } from 'pdf-lib';
import { config } from './config';

export async function stampQrCode(
    pdfBytes: Uint8Array,
    fileHash: string,
    appUrl: string = ''
): Promise<Uint8Array> {
    const QRCode = (await import('qrcode')).default;

    // Generate verification URL
    // Fallback to appUrl arg if provided, otherwise config.APP_URL
    const baseUrl = appUrl || config.APP_URL;
    const verifyUrl = `${baseUrl}/verify/${fileHash}`;

    // Generate QR code as PNG data URL
    const qrDataUrl = await QRCode.toDataURL(verifyUrl, {
        width: 100,
        margin: 1,
        color: {
            dark: '#0038A8',
            light: '#FFFFFF'
        }
    });

    // Convert data URL to bytes
    const qrBase64 = qrDataUrl.split(',')[1];
    const qrBytes = Uint8Array.from(atob(qrBase64), (c) => c.charCodeAt(0));

    // Load the PDF and embed QR
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const qrImage = await pdfDoc.embedPng(qrBytes);

    // Stamp onto the first page — bottom-right corner
    const firstPage = pdfDoc.getPages()[0];
    const { width, height } = firstPage.getSize();

    const qrSize = 72; // ~1 inch
    const margin = 30;

    firstPage.drawImage(qrImage, {
        x: width - qrSize - margin,
        y: margin,
        width: qrSize,
        height: qrSize
    });

    // Add small text label below QR
    const { StandardFonts, rgb } = await import('pdf-lib');
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

    firstPage.drawText('Verify: ' + fileHash.slice(0, 12) + '...', {
        x: width - qrSize - margin,
        y: margin - 10,
        size: 6,
        font,
        color: rgb(0.4, 0.4, 0.4)
    });

    return pdfDoc.save();
}
