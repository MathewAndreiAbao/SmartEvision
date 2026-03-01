/**
 * SHA-256 Hashing — Web Crypto API
 * Runs entirely in the browser, zero server cost.
 */

export async function computeHash(file: File): Promise<string> {
    const buffer = await file.arrayBuffer();
    return hashFromBuffer(buffer);
}

export async function hashFromBuffer(buffer: ArrayBuffer): Promise<string> {
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}
