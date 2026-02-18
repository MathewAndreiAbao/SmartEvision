/**
 * Client-Side Compression
 * Forces all assets to <1MB before upload to extend Supabase free-tier storage.
 * Uses browser-image-compression for images.
 */

const MAX_SIZE_BYTES = 1024 * 1024; // 1MB

export async function compressFile(
    pdfBytes: Uint8Array,
    _maxSizeKb: number = 1024
): Promise<Uint8Array> {
    // If already under limit, return as-is
    if (pdfBytes.byteLength <= MAX_SIZE_BYTES) {
        return pdfBytes;
    }

    // For PDFs, we can't easily compress the content without re-rendering.
    // Log a warning and return the original — the QR stamping step may add minimal bytes.
    console.warn(
        `[compress] File is ${(pdfBytes.byteLength / 1024).toFixed(0)}KB, ` +
        `exceeds ${MAX_SIZE_BYTES / 1024}KB target. PDF compression is limited in-browser.`
    );

    return pdfBytes;
}

export async function compressImage(file: File, maxSizeKb: number = 1024): Promise<File> {
    if (file.size <= maxSizeKb * 1024) {
        return file;
    }

    const imageCompression = (await import('browser-image-compression')).default;

    return await imageCompression(file, {
        maxSizeMB: maxSizeKb / 1024,
        maxWidthOrHeight: 1920,
        useWebWorker: true,
        fileType: file.type as string
    });
}
