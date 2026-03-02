/**
 * QR-Digest Stamping — qrcode + pdf-lib
 * Generates a verification QR code and embeds it onto the first page of a PDF.
 * Creates a "Smart Document" that is verifiable even when printed.
 */

import { PDFDocument } from 'pdf-lib';
import { config } from './config';


export async function generateQrPng(fileHash: string, appUrl: string = ''): Promise<Uint8Array> {
    const QRCode = (await import('qrcode')).default;
    const baseUrl = appUrl || config.APP_URL;
    const verifyUrl = `${baseUrl}/verify/${fileHash}`;

    const qrDataUrl = await QRCode.toDataURL(verifyUrl, {
        width: 100,
        margin: 1,
        color: {
            dark: '#0038A8',
            light: '#FFFFFF'
        }
    });

    const qrBase64 = qrDataUrl.split(',')[1];
    return Uint8Array.from(atob(qrBase64), (c) => c.charCodeAt(0));
}

/**
 * @deprecated Use generateQrPng + Worker for better performance
 */
export async function stampQrCode(
    pdfBytes: Uint8Array,
    fileHash: string,
    appUrl: string = ''
): Promise<Uint8Array> {
    const qrBytes = await generateQrPng(fileHash, appUrl);

    const pdfDoc = await PDFDocument.load(pdfBytes);
    const qrImage = await pdfDoc.embedPng(qrBytes);

    const firstPage = pdfDoc.getPages()[0];
    const { width, height } = firstPage.getSize();

    const qrSize = 72;
    const margin = 30;

    firstPage.drawImage(qrImage, {
        x: width - qrSize - margin,
        y: margin,
        width: qrSize,
        height: qrSize
    });

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
