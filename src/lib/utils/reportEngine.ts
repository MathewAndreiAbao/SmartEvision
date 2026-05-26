import { supabase } from './supabase';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

export interface AuditLogParams {
    action: string;
    entity_type?: string;
    entity_id?: string;
    details?: any;
}

/**
 * Log a system action to the audit_logs table for compliance and security.
 * Part of WBS 18.3 & Innovation Phase 4.1 infrastructure.
 * Uses SHA-256 Hash-Chaining for tamper-evidence (Blockchain-inspired).
 */
export async function logAction({ action, entity_type, entity_id, details }: AuditLogParams) {
    try {
        const { data: authData } = await supabase.auth.getUser();
        const user = authData.user;
        if (!user) return;

        // 1. Fetch the last log for hash-chaining
        const { data: lastLog } = await supabase
            .from('audit_logs')
            .select('current_hash')
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

        const prevHash = lastLog?.current_hash || '0'.repeat(64);

        // 2. Prepare payload for hashing
        const timestamp = new Date().toISOString();
        const payload = JSON.stringify({
            user_id: user.id,
            action,
            entity_type: entity_type || null,
            entity_id: entity_id || null,
            details: details || null,
            prev_hash: prevHash,
            timestamp
        });

        // 3. Calculate SHA-256 Hash using Web Crypto API
        const msgUint8 = new TextEncoder().encode(payload);
        const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const currentHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

        // 4. Persistence
        await supabase.from('audit_logs').insert({
            user_id: user.id,
            action,
            entity_type,
            entity_id,
            details,
            prev_hash: prevHash,
            current_hash: currentHash
        });
    } catch (e) {
        console.error('Failed to log action:', e);
    }
}

/**
 * Generate and download a CSV file from an array of objects.
 * Native implementation, zero dependencies.
 */
export function exportToCSV(data: any[], filename: string) {
    if (!data || data.length === 0) return;

    // Extract headers from the first object
    const headers = Object.keys(data[0]);

    const csvRows = [
        headers.join(','), // header row
        ...data.map(row =>
            headers.map(header => {
                const val = row[header];
                const cleanVal = val === null || val === undefined ? '' : String(val).replace(/"/g, '""');
                return `"${cleanVal}"`;
            }).join(',')
        )
    ];

    const csvString = csvRows.join('\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    logAction({ action: 'export_csv', details: { filename } });
}

/**
 * Generate a PDF Compliance Summary using pdf-lib.
 * WBS 18.2 implementation.
 */
export async function generateCompliancePDF(stats: any, title: string = "Compliance Report") {
    try {
        const pdfDoc = await PDFDocument.create();
        const page = pdfDoc.addPage([600, 800]);
        const { width, height } = page.getSize();

        const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
        const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica);

        // Header
        page.drawRectangle({
            x: 0,
            y: height - 100,
            width: width,
            height: 100,
            color: rgb(0, 0.22, 0.66), // DepEd Blue
        });

        page.drawText('Smart E-VISION', { x: 50, y: height - 55, size: 24, font: boldFont, color: rgb(1, 1, 1) });
        page.drawText(title, { x: 50, y: height - 80, size: 14, font: regularFont, color: rgb(1, 1, 1) });

        // Metadata
        let y = height - 140;
        page.drawText(`Generated on: ${new Date().toLocaleString('en-PH')}`, { x: 50, y, size: 10, font: regularFont, color: rgb(0.3, 0.3, 0.3) });

        // Summary Stats
        y -= 50;
        page.drawText('Executive Summary', { x: 50, y, size: 16, font: boldFont, color: rgb(0, 0, 0) });

        y -= 40;
        const drawStatLine = (label: string, value: string | number) => {
            page.drawText(label, { x: 60, y, size: 12, font: boldFont });
            page.drawText(String(value), { x: 200, y, size: 12, font: regularFont });
            y -= 25;
        };

        drawStatLine('Total Submissions:', stats.totalUploads);
        drawStatLine('Compliance Rate:', `${stats.compliantRate}%`);
        drawStatLine('Late Submissions:', stats.lateCount);
        drawStatLine('Non-Compliant:', stats.nonCompliantCount);
        drawStatLine('Total Teachers:', stats.totalTeachers || 'N/A');

        // Footer
        page.drawText('Verified and Authenticated by Smart E-VISION Digital Archiving System', {
            x: 50,
            y: 50,
            size: 8,
            font: regularFont,
            color: rgb(0.5, 0.5, 0.5)
        });

        const pdfBytes = await pdfDoc.save();
        const blob = new Blob([pdfBytes as any], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);

        const link = document.createElement('a');
        link.href = url;
        link.download = `${title.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
        link.click();

        logAction({ action: 'export_pdf', details: { title } });
    } catch (e) {
        console.error('Failed to generate PDF:', e);
    }
}
