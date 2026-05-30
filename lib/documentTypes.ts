export interface DocumentTypeConfig {
  key: string;
  label: string;
  placeholderNumber?: string;
  requiresExpiry?: boolean;
}

export const DOCUMENT_TYPES: DocumentTypeConfig[] = [
  { key: 'passport', label: 'Passport', placeholderNumber: 'E.g. Z1234567', requiresExpiry: true },
  { key: 'visa', label: 'Visa', placeholderNumber: 'E.g. V123456789', requiresExpiry: true },
  { key: 'driving_licence', label: 'Driving Licence', placeholderNumber: 'E.g. DL-1234567890123', requiresExpiry: true },
  { key: 'aadhaar', label: 'Aadhaar Card', placeholderNumber: 'E.g. 1234 5678 9012', requiresExpiry: false },
  { key: 'pan', label: 'PAN Card', placeholderNumber: 'E.g. ABCDE1234F', requiresExpiry: false },
  { key: 'vehicle_insurance', label: 'Vehicle Insurance', placeholderNumber: 'E.g. POL-123456', requiresExpiry: true },
  { key: 'puc_certificate', label: 'PUC Certificate', placeholderNumber: 'E.g. PUC-123456', requiresExpiry: true },
  { key: 'health_insurance', label: 'Health Insurance', placeholderNumber: 'E.g. HLT-123456', requiresExpiry: true },
  { key: 'school_id', label: 'School ID', placeholderNumber: 'E.g. ID-123456', requiresExpiry: false },
  { key: 'rent_agreement', label: 'Rent Agreement', placeholderNumber: 'E.g. RNT-123456', requiresExpiry: true },
  { key: 'national_id', label: 'National ID / Voter ID', placeholderNumber: 'E.g. VOT-123456', requiresExpiry: false },
  { key: 'other', label: 'Other / Custom Document', placeholderNumber: 'Reference Number', requiresExpiry: false }
];

export function getDocumentTypeLabel(key: string): string {
  const type = DOCUMENT_TYPES.find(t => t.key === key);
  return type ? type.label : key;
}
