/**
 * Medical Report Gatekeeper Engine
 *
 * Focuses on positive structural validation of clinical laboratory reports:
 * A genuine medical report must contain structured rows of:
 *   [Medical Test / Analyte Name] + [Numeric Value] + [Clinical Unit] + [Reference Range]
 *
 * Any document that lacks this medical structure (assignments, bills, receipts,
 * essays, resumes, random photos) is automatically rejected in milliseconds.
 */

export const GATEKEEPER_REJECTION_MESSAGE =
  'This document is not a medical report, please upload a medical report';

export const MINIMUM_STRUCTURED_LAB_ROWS = 3;

// Clinical laboratory analytes across standard panels:
// Complete Blood Count (CBC), Comprehensive Metabolic Panel (CMP),
// Basic Metabolic Panel (BMP), Lipid Profile, Liver Panel (LFT),
// Kidney Panel (KFT), Thyroid Panel (TFT), and Routine Urinalysis.
export const CLINICAL_ANALYTES = new Set([
  // CBC / Hematology
  'hemoglobin', 'haemoglobin', 'hgb', 'hb',
  'hematocrit', 'haematocrit', 'hct', 'pcv',
  'rbc', 'red blood cell', 'red blood cells', 'red blood count',
  'wbc', 'white blood cell', 'white blood cells', 'white blood count', 'total leukocyte count', 'tlc',
  'platelet', 'platelets', 'platelet count', 'plt',
  'mcv', 'mean corpuscular volume',
  'mch', 'mean corpuscular hemoglobin',
  'mchc', 'mean corpuscular hemoglobin concentration',
  'rdw', 'rdw-cv', 'rdw-sd', 'red cell distribution width',
  'mpv', 'mean platelet volume',
  'neutrophil', 'neutrophils', 'absolute neutrophil count', 'anc',
  'lymphocyte', 'lymphocytes', 'absolute lymphocyte count', 'alc',
  'monocyte', 'monocytes',
  'eosinophil', 'eosinophils',
  'basophil', 'basophils',
  'esr', 'erythrocyte sedimentation rate',

  // Biochemistry, Glucose & Metabolic
  'glucose', 'fasting blood sugar', 'fbs', 'postprandial glucose', 'ppbs', 'random blood sugar', 'rbs',
  'hba1c', 'glycated hemoglobin', 'glycosylated hemoglobin',
  'creatinine', 'serum creatinine',
  'bun', 'blood urea nitrogen', 'urea', 'serum urea',
  'uric acid',
  'estimated gfr', 'egfr',
  'sodium', 'na',
  'potassium', 'k',
  'chloride', 'cl',
  'bicarbonate', 'co2', 'carbon dioxide',
  'calcium', 'serum calcium',
  'phosphorus', 'phosphate',
  'magnesium',
  'total protein', 'protein, total',
  'albumin', 'serum albumin',
  'globulin', 'a/g ratio', 'albumin/globulin ratio',

  // Liver Panel
  'bilirubin', 'total bilirubin', 'direct bilirubin', 'indirect bilirubin',
  'alt', 'sgpt', 'alanine aminotransferase',
  'ast', 'sgot', 'aspartate aminotransferase',
  'alp', 'alkaline phosphatase',
  'ggt', 'gamma-glutamyl transferase',
  'ldh', 'lactate dehydrogenase',

  // Lipid Profile
  'cholesterol', 'total cholesterol',
  'triglycerides', 'triglyceride',
  'hdl', 'hdl cholesterol', 'high-density lipoprotein',
  'ldl', 'ldl cholesterol', 'low-density lipoprotein',
  'vldl', 'vldl cholesterol',
  'non-hdl cholesterol',

  // Thyroid & Vitamins
  'tsh', 'thyroid stimulating hormone',
  'free t3', 'ft3', 'free t4', 'ft4', 'total t3', 'total t4',
  'vitamin d', '25-hydroxy vitamin d',
  'vitamin b12', 'b12',
  'ferritin', 'serum ferritin',
  'iron', 'serum iron', 'tibc', 'total iron binding capacity',
  'crp', 'c-reactive protein', 'hs-crp',
]);

// Standard clinical units used in medical reports
export const CLINICAL_UNITS_REGEX =
  /\b(mg\/d[lL]|g\/d[lL]|mmol\/[lL]|µmol\/[lL]|umol\/[lL]|mEq\/[lL]|meq\/[lL]|K\/µ[lL]|K\/u[lL]|M\/µ[lL]|M\/u[lL]|cells?\/[uµ][lL]|\/[uµ][lL]|f[lL]|pg|IU\/[lL]|mIU\/[lL]|uIU\/m[lL]|µIU\/m[lL]|ng\/m[lL]|µg\/d[lL]|ug\/d[lL]|ng\/d[lL]|pg\/m[lL]|m[lL]\/min|%)\b/i;

// Reference range intervals: e.g. "12.0 - 16.0", "70 - 99", "< 150", ">= 60", "0.6-1.2"
export const REFERENCE_RANGE_REGEX =
  /(?:(?:ref(?:erence)?(?:\s*range|\s*interval)?[:\s]*)?(?:[<>]|<=|>=)?\s*\d+(?:\.\d+)?\s*(?:-|–|—|to)\s*\d+(?:\.\d+)?|[<>]=?\s*\d+(?:\.\d+)?)/i;

// Medical report header / clinical context markers
export const MEDICAL_CONTEXT_PATTERNS: RegExp[] = [
  /\b(reference\s*(?:range|interval|values?))\b/i,
  /\b(specimen|fasting|collection\s*date|reported\s*date|accession|sample\s*id)\b/i,
  /\b(laboratory|pathology|diagnostic|clinical\s*lab)\b/i,
  /\b(complete\s*blood\s*count|lipid\s*profile|metabolic\s*panel|urinalysis|liver\s*function|renal\s*function|thyroid)\b/i,
  /\b(observed\s*value|test\s*name|analyte|investigation|units?|flag)\b/i,
  /\b(pathologist|lab\s*director|technologist|verified\s*by)\b/i,
];

export interface MedicalReportGateResult {
  isMedicalReport: boolean;
  structuredLabRowCount: number;
  medicalContextScore: number;
  reason: string;
}

export interface DocumentStructureScoreResult extends MedicalReportGateResult {
  decision: 'ACCEPT' | 'REJECT';
  rejectionMessage?: string;
}

/**
 * Validates real magic bytes from binary header to detect actual file type
 */
export function validateMagicBytes(bytes: Uint8Array): { valid: boolean; detectedMime: string } {
  if (bytes.length < 4) {
    return { valid: false, detectedMime: 'unknown' };
  }

  // PDF: %PDF
  if (bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46) {
    return { valid: true, detectedMime: 'application/pdf' };
  }

  // PNG
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
    return { valid: true, detectedMime: 'image/png' };
  }

  // JPEG
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return { valid: true, detectedMime: 'image/jpeg' };
  }

  // WebP
  if (
    bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
    bytes.length >= 12 &&
    bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50
  ) {
    return { valid: true, detectedMime: 'image/webp' };
  }

  // DOCX (PK zip)
  if (bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04) {
    return { valid: true, detectedMime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' };
  }

  // Plain Text: ASCII / UTF-8
  const isAsciiText = bytes.slice(0, Math.min(bytes.length, 64)).every(
    (b) => (b >= 32 && b <= 126) || b === 9 || b === 10 || b === 13
  );
  if (isAsciiText) {
    return { valid: true, detectedMime: 'text/plain' };
  }

  return { valid: false, detectedMime: 'unknown' };
}

/**
 * Validates whether the document text satisfies the structure of a medical laboratory report.
 * Runs in 1-5 milliseconds.
 *
 * A medical report is defined by having structured rows containing:
 * - A clinical analyte name
 * - A numeric observation / test value
 * - A clinical unit OR a printed reference range
 *
 * If a document has fewer than MINIMUM_STRUCTURED_LAB_ROWS (3), it is rejected as not a medical report.
 */
export function validateMedicalReportStructure(rawText: string): MedicalReportGateResult {
  if (!rawText || rawText.trim().length === 0) {
    return {
      isMedicalReport: false,
      structuredLabRowCount: 0,
      medicalContextScore: 0,
      reason: 'Empty document content.',
    };
  }

  const textToScan = rawText.slice(0, 20000); // Scan first 20k characters (~4-5 pages)
  const lines = textToScan.split(/\r?\n/);

  // 1. Calculate Medical Context Score (headers, specimen, pathology, lab words)
  let medicalContextScore = 0;
  for (const pattern of MEDICAL_CONTEXT_PATTERNS) {
    if (pattern.test(textToScan)) {
      medicalContextScore++;
    }
  }

  // 2. Count Structured Lab Rows
  // Pattern: [Clinical Analyte Name] + [Numeric Value] + [Clinical Unit OR Reference Range]
  let structuredLabRowCount = 0;

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.length < 5 || trimmed.length > 250) continue;

    // A. Check for clinical analyte
    const lowerLine = trimmed.toLowerCase();
    let hasAnalyte = false;
    for (const analyte of CLINICAL_ANALYTES) {
      const regex = new RegExp(`\\b${analyte}\\b`, 'i');
      if (regex.test(lowerLine)) {
        hasAnalyte = true;
        break;
      }
    }

    // B. Check for numeric value (e.g. "13.8", "118", "0.9", "6.4")
    const hasNumericValue = /(?:^|\s|[|:])([<>]?\s*\d+(?:\.\d+)?)\s*(?:[a-zA-Z/%]|$)/.test(trimmed);

    // C. Check for clinical unit
    const hasUnit = CLINICAL_UNITS_REGEX.test(trimmed);

    // D. Check for reference range
    const hasRange = REFERENCE_RANGE_REGEX.test(trimmed);

    // Row Qualification:
    // A structured row must have:
    // 1. Known analyte + numeric value + (clinical unit OR reference range)
    // 2. OR clinical unit + reference range + numeric value (even if analyte name is abbreviated)
    if (hasNumericValue && ((hasAnalyte && (hasUnit || hasRange)) || (hasUnit && hasRange))) {
      structuredLabRowCount++;
    }
  }

  // Decision rule:
  // Must have at least 3 structured lab rows, OR at least 2 rows with strong clinical context headers
  const isMedicalReport =
    structuredLabRowCount >= MINIMUM_STRUCTURED_LAB_ROWS ||
    (structuredLabRowCount >= 2 && medicalContextScore >= 2);

  return {
    isMedicalReport,
    structuredLabRowCount,
    medicalContextScore,
    reason: isMedicalReport
      ? `Validated medical lab report: ${structuredLabRowCount} structured test rows and ${medicalContextScore} clinical context markers.`
      : `Document lacks clinical laboratory structure (found ${structuredLabRowCount} test rows, minimum required: ${MINIMUM_STRUCTURED_LAB_ROWS}).`,
  };
}

/**
 * Score document structure and return an ACCEPT / REJECT decision with user-facing message
 */
export function scoreDocumentStructure(rawText: string): DocumentStructureScoreResult {
  const result = validateMedicalReportStructure(rawText);
  return {
    ...result,
    decision: result.isMedicalReport ? 'ACCEPT' : 'REJECT',
    rejectionMessage: result.isMedicalReport ? undefined : GATEKEEPER_REJECTION_MESSAGE,
  };
}
