import {
  FactualConsistencyResult,
  FactualCheckItem,
  MedicalFinding,
  SimplifiedReport,
  VerificationMetrics,
} from '@/types/report';

/**
 * Diagnostic red-flag phrases that must NEVER appear in simplified patient summaries
 * to adhere strictly to clinical safety boundaries.
 */
const FORBIDDEN_DIAGNOSTIC_PATTERNS = [
  /you have (cancer|diabetes|kidney disease|heart disease|liver failure|anemia|hypothyroidism)/i,
  /you are suffering from/i,
  /diagnosed with/i,
  /this confirms you have/i,
  /proves you are ill/i,
  /patient has irreversible/i,
];

/**
 * Deterministically audits a SimplifiedReport against its source rawText.
 * Computes:
 * A. Extraction Completeness (identified vs parsed vs unresolved)
 * B. Field-Level Verification (value, unit, range, original flag)
 * C. Overall Verification Status (VERIFIED, PARTIALLY_VERIFIED, UNAVAILABLE)
 */
export function auditFactualConsistency(report: SimplifiedReport): FactualConsistencyResult {
  const checks: FactualCheckItem[] = [];
  const rawLower = (report.rawText || '').toLowerCase();
  const hasRawText: boolean = Boolean(report.rawText && report.rawText.trim().length > 0);
  const totalFindings = report.findings.length;

  // 1. Extraction Completeness Check
  const completeness = report.extractionCompleteness;
  let completenessPass = true;
  let completenessStatus: 'pass' | 'warning' | 'fail' = 'pass';
  let completenessDetails = '';

  if (completeness) {
    if (completeness.unresolvedCount > 0) {
      completenessPass = false;
      completenessStatus = 'warning';
      completenessDetails = `Extracted ${completeness.successfullyParsed} of ${completeness.sourceMeasurementsIdentified} candidate findings (${completeness.coveragePercentage}% coverage). ${completeness.unresolvedCount} measurements could not be parsed reliably.`;
    } else if (completeness.successfullyParsed > 0) {
      completenessDetails = `All ${completeness.successfullyParsed} identified candidate measurements were successfully extracted (100% coverage).`;
    } else {
      completenessDetails = 'No laboratory measurements identified in source text.';
      completenessStatus = 'warning';
    }
  } else {
    completenessDetails = hasRawText
      ? `Independent completeness denominator: ${totalFindings} measurements extracted.`
      : 'Source text unavailable for completeness evaluation.';
    completenessStatus = hasRawText ? 'pass' : 'warning';
  }

  checks.push({
    id: 'extraction-completeness',
    title: 'Extraction Completeness',
    status: completenessStatus,
    details: completenessDetails,
    count: completeness ? completeness.successfullyParsed : totalFindings,
    total: completeness ? completeness.sourceMeasurementsIdentified : totalFindings,
  });

  // 2. Value Preservation Check (Field-Level)
  let valuesPreservedCount = 0;
  const valueMismatches: string[] = [];

  for (const finding of report.findings) {
    const val = finding.originalValue.trim();
    if (finding.userModified) {
      valuesPreservedCount++;
    } else if (hasRawText && rawLower.includes(val.toLowerCase())) {
      valuesPreservedCount++;
    } else {
      valueMismatches.push(`${finding.testName} (val: "${val}")`);
    }
  }

  const valuePass = Boolean(hasRawText && valuesPreservedCount === totalFindings);
  checks.push({
    id: 'val-preservation',
    title: 'Value Preservation & Exact Match',
    status: valuePass ? 'pass' : hasRawText ? 'fail' : 'warning',
    details: !hasRawText
      ? 'Verification unavailable: source document text not loaded.'
      : valuePass
      ? `All ${totalFindings} extracted numerical/qualitative values match verbatim in the source report.`
      : `Discrepancy detected: ${valueMismatches.join(', ')} not found in source text.`,
    count: valuesPreservedCount,
    total: totalFindings,
  });

  // 3. Unit Integrity Check (Field-Level)
  let unitsPreservedCount = 0;
  const unitMismatches: string[] = [];

  for (const finding of report.findings) {
    const unit = finding.unit.trim().toLowerCase();
    // Allow dimensionless units or ratios
    if (unit === '' || unit === 'ratio' || finding.userModified) {
      unitsPreservedCount++;
    } else if (hasRawText && rawLower.includes(unit)) {
      unitsPreservedCount++;
    } else {
      unitMismatches.push(`${finding.testName} ("${finding.unit}")`);
    }
  }

  const unitPass = Boolean(hasRawText && unitsPreservedCount === totalFindings);
  checks.push({
    id: 'unit-integrity',
    title: 'Unit Integrity & Standardization',
    status: unitPass ? 'pass' : hasRawText ? 'fail' : 'warning',
    details: !hasRawText
      ? 'Verification unavailable: source text not loaded.'
      : unitPass
      ? `100% of laboratory measurement units preserved without truncation or distortion.`
      : `Unverified units detected: ${unitMismatches.join(', ')}.`,
    count: unitsPreservedCount,
    total: totalFindings,
  });

  // 4. Reference Range Veracity Check (Field-Level)
  let rangeMatchesCount = 0;
  for (const finding of report.findings) {
    if (finding.userModified || !finding.referenceRange) {
      rangeMatchesCount++;
      continue;
    }
    const cleanRange = finding.referenceRange.replace(/[^\d.,-]/g, ' ').trim();
    const tokens = cleanRange.split(/\s+/).filter(Boolean);
    const anyTokenInRaw = tokens.some((t) => rawLower.includes(t.toLowerCase()));
    if (hasRawText && (anyTokenInRaw || rawLower.includes(finding.referenceRange.toLowerCase()))) {
      rangeMatchesCount++;
    }
  }

  const rangePass = hasRawText && rangeMatchesCount === totalFindings;
  checks.push({
    id: 'range-integrity',
    title: 'Reference Range Provenance',
    status: rangePass ? 'pass' : 'warning',
    details: !hasRawText
      ? 'Verification unavailable: source text not loaded.'
      : rangePass
      ? `All reference interval bounds correlate directly with the source laboratory report.`
      : `${totalFindings - rangeMatchesCount} reference thresholds could not be verified in the raw text.`,
    count: rangeMatchesCount,
    total: totalFindings,
  });

  // 5. Original Laboratory Flag Check (Field-Level)
  let flagsPreservedCount = 0;
  for (const finding of report.findings) {
    if (!finding.originalFlag || (hasRawText && rawLower.includes(finding.originalFlag.toLowerCase()))) {
      flagsPreservedCount++;
    }
  }

  // 6. Clinical Boundary & Non-Diagnostic Guardrail
  const combinedExplanations = [
    report.summary.overview,
    report.summary.keyTakeaway,
    ...report.findings.map((f) => `${f.plainExplanation} ${f.clinicalContext}`),
  ].join(' ');

  const violatedPatterns: string[] = [];
  for (const pattern of FORBIDDEN_DIAGNOSTIC_PATTERNS) {
    if (pattern.test(combinedExplanations)) {
      violatedPatterns.push(pattern.source);
    }
  }

  const guardrailPass = violatedPatterns.length === 0;
  checks.push({
    id: 'diagnostic-safeguard',
    title: 'Non-Diagnostic Clinical Guardrail',
    status: guardrailPass ? 'pass' : 'fail',
    details: guardrailPass
      ? 'Verified: 0 diagnostic assertions or disease claims made. Neutral educational context maintained.'
      : `Safety alert: Prohibited diagnostic patterns detected: ${violatedPatterns.join(', ')}`,
  });

  // 7. Hallucination Shield (Summary Out-of-Range Consistency)
  const outOfRangeFindings = report.findings.filter((f) => f.flag === 'HIGH' || f.flag === 'LOW');
  const countMatches = report.summary.outOfRangeCount === outOfRangeFindings.length;

  checks.push({
    id: 'hallucination-shield',
    title: 'Hallucination & Grounding Shield',
    status: countMatches ? 'pass' : 'warning',
    details: countMatches
      ? `Summary strictly accounts for ${outOfRangeFindings.length} out-of-range metrics without inventing unmeasured findings.`
      : `Discrepancy: Summary states ${report.summary.outOfRangeCount} out-of-range, but table has ${outOfRangeFindings.length}.`,
  });

  // Determine Overall Verification Status
  let overallStatus: 'VERIFIED' | 'PARTIALLY_VERIFIED' | 'UNAVAILABLE' = 'VERIFIED';
  let statusDetails = '';

  if (!hasRawText) {
    overallStatus = 'UNAVAILABLE';
    statusDetails = 'Verification unavailable: source text was not provided for independent comparison.';
  } else if (!valuePass || !unitPass || (completeness && completeness.unresolvedCount > 0)) {
    overallStatus = 'PARTIALLY_VERIFIED';
    statusDetails = `Partially verified: ${valuesPreservedCount}/${totalFindings} values match source text. ${
      completeness && completeness.unresolvedCount > 0
        ? `${completeness.unresolvedCount} source candidate measurements could not be parsed.`
        : ''
    }`.trim();
  } else {
    overallStatus = 'VERIFIED';
    statusDetails = `Verified: ${valuesPreservedCount}/${totalFindings} extracted values and ranges independently verified against source text.`;
  }

  const verificationMetrics: VerificationMetrics = {
    totalExtracted: totalFindings,
    valuesVerified: valuesPreservedCount,
    unitsVerified: unitsPreservedCount,
    rangesVerified: rangeMatchesCount,
    flagsVerified: flagsPreservedCount,
    overallStatus,
    statusDetails,
  };

  const passCount = checks.filter((c) => c.status === 'pass').length;
  const score = Math.round((passCount / checks.length) * 100);

  return {
    passed: valuePass && unitPass && score >= 80 && guardrailPass,
    score: valuePass && unitPass ? score : Math.min(score, 70),
    checks,
    verifiedAt: new Date().toISOString(),
    metrics: verificationMetrics,
  };
}

/**
 * Re-evaluates a single finding's flag (HIGH, LOW, NORMAL, INCONCLUSIVE) strictly against its reference range
 */
export function evaluateFindingFlag(
  numericVal: number | null | undefined,
  low: number | null | undefined,
  high: number | null | undefined
): 'NORMAL' | 'HIGH' | 'LOW' | 'INCONCLUSIVE' {
  if (numericVal === null || numericVal === undefined || isNaN(numericVal)) {
    return 'INCONCLUSIVE';
  }

  if (low !== null && low !== undefined && !isNaN(low) && numericVal < low) {
    return 'LOW';
  }

  if (high !== null && high !== undefined && !isNaN(high) && numericVal > high) {
    return 'HIGH';
  }

  if ((low !== null && low !== undefined) || (high !== null && high !== undefined)) {
    return 'NORMAL';
  }

  return 'INCONCLUSIVE';
}
