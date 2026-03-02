/**
 * Web Worker for heavy PDF operations and hashing
 * Offloads pdf-lib and Web Crypto API from the main UI thread.
 */

import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

// Use any to avoid TS environment conflicts with DedicatedWorkerGlobalScope
const ctx = self as any;

// Hash using Web Crypto API in worker
async function hashPdf(buffer: ArrayBuffer | Uint8Array): Promise<string> {
    const input = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
    const hashBuffer = await self.crypto.subtle.digest('SHA-256', input.buffer as ArrayBuffer);
    const hashArray = new Uint8Array(hashBuffer);

    let hashHex = '';
    for (let i = 0; i < hashArray.length; i++) {
        hashHex += hashArray[i].toString(16).padStart(2, '0');
    }
    return hashHex;
}

// Compress using pdf-lib
async function compressPdf(pdfBytes: Uint8Array): Promise<Uint8Array> {
    const MAX_SIZE_BYTES = 1024 * 1024; // 1MB ideal target

    if (pdfBytes.byteLength <= MAX_SIZE_BYTES) {
        return pdfBytes;
    }

    const pdfDoc = await PDFDocument.load(pdfBytes);

    const compressedBytes = await pdfDoc.save({
        useObjectStreams: true,
        compress: true,
        objectsPerTick: 50
    } as any);

    return compressedBytes;
}

// Embed QR PNG into PDF
async function stampQrCode(pdfBytes: Uint8Array, qrBytes: Uint8Array, fileHash: string): Promise<Uint8Array> {
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const qrImage = await pdfDoc.embedPng(qrBytes);

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

    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

    firstPage.drawText('Verify: ' + fileHash.slice(0, 12) + '...', {
        x: width - qrSize - margin,
        y: margin - 10,
        size: 6,
        font,
        color: rgb(0.4, 0.4, 0.4)
    });

    return await pdfDoc.save();
}

self.onmessage = async (e: MessageEvent) => {
    const { type, payload, id } = e.data;

    try {
        if (type === 'COMPRESS_AND_HASH') {
            const { pdfBytes } = payload;

            // 1. Compress
            const compressedBytes = await compressPdf(pdfBytes);

            // 2. Hash
            const fileHash = await hashPdf(compressedBytes);

            ctx.postMessage({
                id,
                success: true,
                payload: {
                    compressedBytes,
                    fileHash
                }
            }, [compressedBytes.buffer]); // TRANSFER BACK
        } else if (type === 'STAMP_QR') {
            const { compressedBytes, qrBytes, fileHash } = payload;

            // 3. Stamp
            const stampedBytes = await stampQrCode(compressedBytes, qrBytes, fileHash);

            ctx.postMessage({
                id,
                success: true,
                payload: {
                    stampedBytes
                }
            }, [stampedBytes.buffer]); // TRANSFER BACK
        }
    } catch (error) {
        console.error('[pdf.worker] Error:', error);
        ctx.postMessage({
            id,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown worker error'
        });
    }
};
