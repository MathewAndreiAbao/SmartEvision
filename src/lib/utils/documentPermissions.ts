export function getAllowedUploadDocTypes(role: string): string[] {
  switch (role) {
    case 'Master Teacher':
      return ['DLL', 'ISP', 'ISR'];
    case 'Teacher':
      return ['DLL'];
    case 'School Head':
      return ['ISP', 'ISR'];
    case 'District Supervisor':
      return ['ISR'];
    default:
      return [];
  }
}

export function canUploadDocument(role: string, docType: string): boolean {
  return getAllowedUploadDocTypes(role).includes(docType);
}

export function requiresTeachingLoadSelection(role: string, docType: string): boolean {
  return (role === 'Teacher' || role === 'Master Teacher') && docType === 'DLL';
}

export function canViewArchivedDocument(role: string, docType: string): boolean {
  if (role === 'Master Teacher') {
    return true;
  }

  if (role === 'Teacher') {
    return docType === 'DLL';
  }

  if (role === 'School Head' || role === 'District Supervisor') {
    return true;
  }

  return false;
}

export function canAddReviewRemarks(role: string): boolean {
  return (
    role === 'Master Teacher' ||
    role === 'School Head' ||
    role === 'District Supervisor'
  );
}

export function getUploadGuidance(role: string): string {
  switch (role) {
    case 'Master Teacher':
      return 'Master Teachers may upload DLL, ISP, and ISR documents.';
    case 'Teacher':
      return 'Teachers may upload DLL documents only.';
    case 'School Head':
      return 'School Heads may upload ISP and ISR documents only.';
    case 'District Supervisor':
      return 'District Supervisors may upload ISR documents only.';
    default:
      return 'Please sign in to continue.';
  }
}

/**
 * Check if a user can view an uploaded ISP/ISR document.
 * ISP/ISR uploads are only visible to:
 * - District Supervisors (can see all)
 * - The person who uploaded it
 */
export function canViewUploadedISPISR(
  role: string,
  docType: string,
  uploaderId: string,
  currentUserId: string
): boolean {
  // Not ISP/ISR, use regular rules
  if (docType !== 'ISP' && docType !== 'ISR') {
    return canViewArchivedDocument(role, docType);
  }

  // ISP/ISR: only District Supervisor or uploader can view
  if (role === 'District Supervisor') {
    return true;
  }

  if (uploaderId === currentUserId) {
    return true;
  }

  return false;
}
