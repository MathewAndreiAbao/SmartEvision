import { googleConvertToPdf } from './googleConvert';

export interface TranscodeResult {
    pdfBytes: Uint8Array;
    text?: string;
}

function getAuthToken(): string | null {
    try {
        const raw = localStorage.getItem('sb-' + window.location.hostname + '-auth-token');
        if (raw) {
            const parsed = JSON.parse(raw);
            return parsed?.access_token || null;
        }
    } catch { }
    return null;
}

async function convertViaServerProxy(file: File): Promise<Uint8Array | null> {
    const token = getAuthToken();
    if (!token) return null;

    try {
        const formData = new FormData();
        formData.append('file', file);

        const res = await fetch('/api/convert', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: formData
        });

        if (!res.ok) return null;

        const buffer = await res.arrayBuffer();
        return new Uint8Array(buffer);
    } catch {
        return null;
    }
}

export async function transcodeToPdf(file: File): Promise<TranscodeResult> {
    const ext = file.name.split('.').pop()?.toLowerCase();

    if (ext === 'pdf') {
        const buffer = await file.arrayBuffer();
        return { pdfBytes: new Uint8Array(buffer) };
    }

    if (ext === 'docx' || ext === 'doc') {
        const serverResult = await convertViaServerProxy(file);
        if (serverResult) {
            return { pdfBytes: serverResult };
        }

        const pdfBytes = await googleConvertToPdf(file);
        return { pdfBytes };
    }

    throw new Error(`Unsupported file type: .${ext}. Only .pdf, .docx, and .doc files are accepted.`);
}
