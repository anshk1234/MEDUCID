export type FlagStatus = 'NORMAL' | 'HIGH' | 'LOW' | 'INCONCLUSIVE';

export type CalculatedStatus = 'NORMAL' | 'ABOVE_RANGE' | 'BELOW_RANGE' | 'OUTSIDE_RANGE' | 'UNKNOWN';

export type RangeType =
  | 'CLOSED_NUMERIC'
  | 'LESS_THAN'
  | 'LESS_THAN_OR_EQUAL'
  | 'GREATER_THAN'
  | 'GREATER_THAN_OR_EQUAL'
  | 'QUALITATIVE'
  | 'NO_RANGE_PRINTED'
  | 'UNPARSEABLE'
  | 'UNKNOWN';

export interface MedicalFinding {
  id: string;
  testName: string;           // Original clinical test name (e.g. "Serum Creatinine")
  simplifiedName: string;     // Accessible plain explanation of the metric (e.g. "Kidney filtration rate marker")
  category: string;           // Clinical panel grouping (e.g. "Renal / Kidney Panel")
  originalValue: string;      // Strictly preserved raw value (e.g. "1.4")
  unit: string;               // Strictly preserved unit (e.g. "mg/dL")
  referenceRange: string;     // Strictly preserved range (e.g. "0.6 - 1.2 mg/dL")
  numericValue?: number | null;
  rangeLow?: number | null;
  rangeHigh?: number | null;
  flag: FlagStatus;           // Evaluated strictly against stated bounds
  plainExplanation: string;   // Plain English explanation of what this test monitors
  clinicalContext: string;    // Objective, non-diagnostic note on what higher/lower numbers usually prompt clinicians to check
  sourceSpan: string;         // Verbatim substring from raw report for provenance
  userModified?: boolean;     // Indicates if human clinician/user corrected extraction
  originalExtractedValue?: string; // Stored value prior to user modification for reversion/tooltip
  originalExtractedUnit?: string;
  originalExtractedRange?: string;
  lowConfidence?: boolean;    // Indicates low-confidence extraction requiring manual check
  confidenceNote?: string;

  // Explicit reference-range and lab-flag tracking
  originalFlag?: string;      // Verbatim laboratory printed flag (e.g. "HIGH", "LOW", "NORMAL", "ALERT")
  calculatedStatus?: CalculatedStatus;
  rangeType?: RangeType;
  flagDisagreement?: boolean; // True when lab printed flag disagrees with independent range calculation
  flagDisagreementNote?: string;
  rangeExplanation?: string;
}

export interface UnresolvedExtractionItem {
  line: string;
  reason: string;
}

export interface ExtractionCompleteness {
  sourceMeasurementsIdentified: number;
  successfullyParsed: number;
  unresolvedCount: number;
  unresolvedItems: UnresolvedExtractionItem[];
  coveragePercentage: number | null;
  completenessStatus: 'COMPLETE' | 'PARTIAL' | 'INDETERMINATE';
  completenessNote: string;
}

export interface VerificationMetrics {
  totalExtracted: number;
  valuesVerified: number;
  unitsVerified: number;
  rangesVerified: number;
  flagsVerified: number;
  overallStatus: 'VERIFIED' | 'PARTIALLY_VERIFIED' | 'UNAVAILABLE';
  statusDetails: string;
}

export interface FactualCheckItem {
  id: string;
  title: string;
  status: 'pass' | 'fail' | 'warning';
  details: string;
  count?: number;
  total?: number;
}

export interface FactualConsistencyResult {
  passed: boolean;
  score: number; // 0 to 100%
  checks: FactualCheckItem[];
  verifiedAt: string;
  metrics?: VerificationMetrics;
}

export interface SimplifiedReport {
  id: string;
  title: string;
  panelCategory: string;
  patientDeidentifiedId: string;
  collectionDate: string;
  labName: string;
  rawText: string;
  findings: MedicalFinding[];
  summary: {
    overview: string;
    totalTests: number;
    outOfRangeCount: number;
    withinRangeCount: number;
    noNumericRangeCount: number;
    totalWithNumericRange: number;
    unknownRangeCount?: number;
    keyTakeaway: string;
  };
  clinicianQuestions: string[];
  factualConsistency: FactualConsistencyResult;
  extractionCompleteness?: ExtractionCompleteness;
}
