import { MedicalFinding, ExtractionCompleteness, UnresolvedExtractionItem } from '@/types/report';
import { interpretReferenceRange } from './rangeInterpreter';
import { MEDICAL_LEXICON, lookupMedicalConcept } from './simplificationEngine';

export interface ExtractionResult {
  findings: MedicalFinding[];
  completeness: ExtractionCompleteness;
  detectedSections: string[];
}

// Common section header patterns in clinical laboratory reports
const SECTION_PATTERNS: Array<{ regex: RegExp; name: string }> = [
  { regex: /complete blood count|cbc|hematology|hemogram/i, name: 'Complete Blood Count (CBC)' },
  { regex: /biochemistry|metabolic panel|cmp|bmp|renal|kidney|liver|hepatic|lipid|lipid profile|chemistry/i, name: 'Biochemistry' },
  { regex: /urinalysis|urine examination|urine routine|microscopic examination|urinary/i, name: 'Urinalysis' },
  { regex: /thyroid|endocrine|hormone/i, name: 'Thyroid Function' },
  { regex: /immunology|serology/i, name: 'Immunology & Serology' },
  { regex: /coagulation|clotting/i, name: 'Coagulation Profile' },
];

// Document metadata or table header rows that should be skipped as candidate finding lines
const IGNORE_LINE_PATTERNS: RegExp[] = [
  /^[-=_]{3,}$/,
  /^(patient|physician|doctor|hospital|clinic|specimen|collection|accession|account|dob|age|sex|gender|date|phone|address|page\s+\d+|report\s+date|status:|sample|collected|received|reported)/i,
  /^(test\s+name|analyte|investigation|parameter|description)\b/i,
  /^(end of report|notes?:|comments?:|method:|instrument:|verified by|electronic signature|lab director|pathologist|license|inquiries)/i,
  /^metro health|apex diagnostic|city clinical|metropolitan lab|diagnostic laboratory/i,
  /all reference intervals reflect normal values/i,
  /clinical interpretation belongs to/i,
  /correlate clinically/i,
  /synthetic|de-identified/i,
  /^page\s+\d+\s+of\s+\d+/i,
  /^\*+\s*(end of report|confidential|disclaimer)/i,
];

/**
 * Extracts all laboratory measurements from raw text preserving original values,
 * units, reference ranges, and flags across all sections.
 */
export function extractMeasurementsFromText(rawText: string): ExtractionResult {
  const lines = (rawText || '').split(/\r?\n/);
  const findings: MedicalFinding[] = [];
  const unresolvedItems: UnresolvedExtractionItem[] = [];
  const detectedSections: string[] = [];

  let currentSection = 'General Laboratory';
  let counter = 1;

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
    const rawLine = lines[lineIndex];
    const trimmed = rawLine.trim();

    if (!trimmed) continue;

    // 1. Check for Section Headers
    let isHeader = false;
    const cleanHeader = trimmed.replace(/^(\d+|[IVX]+)[\.\)\s-]+\s*/i, '').trim();
    for (const sec of SECTION_PATTERNS) {
      if (sec.regex.test(cleanHeader) && cleanHeader.length < 80 && !/\b\d+\.?\d*\s+[a-zA-Z/%]{1,6}\b/.test(cleanHeader)) {
        currentSection = sec.name;
        if (!detectedSections.includes(sec.name)) {
          detectedSections.push(sec.name);
        }
        isHeader = true;
        break;
      }
    }
    if (isHeader) continue;

    // 2. Check for Metadata / Ignored Table Headers
    const shouldIgnore = IGNORE_LINE_PATTERNS.some((pattern) => pattern.test(trimmed));
    if (shouldIgnore) continue;

    // 3. Attempt to Parse Line as a Laboratory Measurement
    const parseResult = parseMeasurementLine(trimmed);

    if (parseResult.success && parseResult.data) {
      const data = parseResult.data;

      // Interpret reference range and determine flags/bounds
      const interpretation = interpretReferenceRange(data.value, data.range, data.flag);

      // Safe non-diagnostic educational explanation
      const lexicon = lookupMedicalConcept(data.testName);
      const plainExplanation = lexicon.plainExplanation;

      // Build finding object
      const finding: MedicalFinding = {
        id: `m-${counter++}`,
        testName: data.testName,
        simplifiedName: lexicon.simplifiedName || data.testName,
        category: currentSection !== 'General Laboratory' ? currentSection : lexicon.category,
        originalValue: data.value,
        unit: data.unit,
        referenceRange: data.range,
        numericValue: interpretation.numericValue,
        rangeLow: interpretation.rangeLow,
        rangeHigh: interpretation.rangeHigh,
        flag: interpretation.flag,
        plainExplanation,
        clinicalContext: interpretation.rangeExplanation,
        sourceSpan: trimmed,
        originalFlag: interpretation.originalFlag,
        calculatedStatus: interpretation.calculatedStatus,
        rangeType: interpretation.rangeType,
        flagDisagreement: interpretation.flagDisagreement,
        flagDisagreementNote: interpretation.flagDisagreementNote,
        rangeExplanation: interpretation.rangeExplanation,
      };

      // Smart Deduplication:
      // Same test name and value in DIFFERENT sections are valid distinct tests (e.g. Glucose in Biochemistry vs Glucose in Urine).
      // Only skip if exact testName, category, originalValue, and referenceRange already exist.
      const isDuplicate = findings.some(
        (existing) =>
          existing.testName.toLowerCase() === finding.testName.toLowerCase() &&
          existing.category.toLowerCase() === finding.category.toLowerCase() &&
          existing.originalValue.toLowerCase() === finding.originalValue.toLowerCase() &&
          existing.referenceRange.toLowerCase() === finding.referenceRange.toLowerCase()
      );

      if (!isDuplicate) {
        findings.push(finding);
      }
    } else if (parseResult.candidateLine) {
      // Line looked like a measurement line but couldn't be parsed reliably
      unresolvedItems.push({
        line: trimmed,
        reason: parseResult.error || 'Could not parse into test name, value, and reference threshold.',
      });
    }
  }

  const successfullyParsed = findings.length;
  const unresolvedCount = unresolvedItems.length;
  const sourceMeasurementsIdentified = successfullyParsed + unresolvedCount;
  const coveragePercentage =
    sourceMeasurementsIdentified > 0
      ? Math.round((successfullyParsed / sourceMeasurementsIdentified) * 100)
      : 100;

  const completeness: ExtractionCompleteness = {
    sourceMeasurementsIdentified,
    successfullyParsed,
    unresolvedCount,
    unresolvedItems,
    coveragePercentage,
    completenessStatus:
      unresolvedCount === 0 && successfullyParsed > 0
        ? 'COMPLETE'
        : unresolvedCount > 0
        ? 'PARTIAL'
        : 'INDETERMINATE',
    completenessNote:
      unresolvedCount === 0
        ? `Successfully extracted all ${successfullyParsed} identified laboratory findings.`
        : `Extracted ${successfullyParsed} of ${sourceMeasurementsIdentified} candidate findings (${unresolvedCount} skipped/unresolved).`,
  };

  return {
    findings,
    completeness,
    detectedSections,
  };
}

interface LineParseCandidate {
  testName: string;
  value: string;
  unit: string;
  range: string;
  flag?: string;
}

interface LineParseResult {
  success: boolean;
  candidateLine: boolean;
  data?: LineParseCandidate;
  error?: string;
}

/**
 * Parses a single text line into its constituent lab measurement fields.
 * Supports:
 * - Tab-separated lines
 * - Pipe-separated lines (e.g. "Test | Result | Unit | Range | Flag")
 * - Colon notation (e.g. "Glucose: 118 mg/dL (70 - 99) HIGH")
 * - Benchmark multi-space tabular rows
 * - Single-spaced / compact lines with numeric, comma-separated, negative, zero, or qualitative results
 */
export function parseMeasurementLine(line: string): LineParseResult {
  const trimmed = line.trim();

  // 1. Pipe-separated format
  if (trimmed.includes('|')) {
    const parts = trimmed.split('|').map((p) => p.trim());
    if (parts.length >= 2 && parts[0] && parts[1]) {
      const testName = parts[0];
      const value = parts[1];
      const unit = parts[2] || '';
      const range = parts[3] || '';
      const flag = parts[4] || '';

      // Verify that value looks like a lab finding (number or qualitative term)
      if (isRecognizedValue(value)) {
        return {
          success: true,
          candidateLine: true,
          data: { testName, value, unit, range, flag },
        };
      }
    }
  }

  // 2. Tab-separated format
  if (trimmed.includes('\t')) {
    const parts = trimmed.split('\t').map((p) => p.trim()).filter(Boolean);
    if (parts.length >= 2) {
      const testName = parts[0];
      const value = parts[1];
      const unit = parts[2] || '';
      const range = parts[3] || '';
      const flag = parts[4] || '';

      if (isRecognizedValue(value)) {
        return {
          success: true,
          candidateLine: true,
          data: { testName, value, unit, range, flag },
        };
      }
    }
  }

  // 3. Colon-separated format: "Test Name: Value Unit (Ref: Range) Flag"
  if (trimmed.includes(':') && !/^(note|comment|method|specimen|physician|date|page):/i.test(trimmed)) {
    const colonIdx = trimmed.indexOf(':');
    const testName = trimmed.slice(0, colonIdx).trim();
    const rest = trimmed.slice(colonIdx + 1).trim();

    if (testName && rest) {
      let range = '';
      let flag = '';
      let restWithoutRange = rest;

      // Extract bracketed or parenthesized reference range e.g. "(70 - 99)", "[< 150 mg/dL]", "(Ref: Negative)"
      const parenMatch = rest.match(/[\(\[](?:ref(?:erence)?(?:\s*range)?:?\s*)?([^\)\]]+)[\)\]]/i);
      if (parenMatch && parenMatch.index !== undefined) {
        range = parenMatch[1].trim();
        restWithoutRange = (rest.slice(0, parenMatch.index) + ' ' + rest.slice(parenMatch.index + parenMatch[0].length)).trim();
      }

      // Extract flag at end
      const flagMatch = restWithoutRange.match(/\b(HIGH|LOW|NORMAL|ALERT|ABNORMAL|CRITICAL|H|L)\b/i);
      if (flagMatch && flagMatch.index !== undefined) {
        flag = flagMatch[1].toUpperCase();
        restWithoutRange = restWithoutRange.replace(flagMatch[0], '').trim();
      }

      // Match Value + Unit from rest
      const valMatch = extractValueAndUnit(restWithoutRange);
      if (valMatch) {
        return {
          success: true,
          candidateLine: true,
          data: {
            testName,
            value: valMatch.value,
            unit: valMatch.unit,
            range,
            flag,
          },
        };
      }
    }
  }

  // 4. Multi-Space Tabular Format (e.g. Standard benchmark layout)
  if (/\s{2,}/.test(trimmed)) {
    const cols = trimmed.split(/\s{2,}/).map((c) => c.trim()).filter(Boolean);
    if (cols.length >= 2) {
      const testName = cols[0];
      const value = cols[1];
      let unit = '';
      let range = '';
      let flag = '';

      if (cols.length === 5) {
        // Standard: Name | Value | Unit | Range | Flag
        unit = cols[2];
        range = cols[3];
        flag = cols[4].toUpperCase();
      } else if (cols.length === 4) {
        const lastColUpper = cols[3].toUpperCase();
        const isLastFlag = /^(HIGH|LOW|NORMAL|ALERT|ABNORMAL|CRITICAL|H|L)$/.test(lastColUpper);

        // Check if cols[2] looks like a reference range (contains '-', '<', '>', or matches value, or qualitative)
        const isCol2Range =
          /[-<>]/.test(cols[2]) ||
          cols[2].toLowerCase() === value.toLowerCase() ||
          /^(negative|positive|normal|clear|pale yellow)$/i.test(cols[2]);

        if (isLastFlag && isCol2Range) {
          // Format without unit: Name | Value | Range | Flag
          range = cols[2];
          flag = lastColUpper;
        } else if (isLastFlag) {
          // Format without range: Name | Value | Unit | Flag
          unit = cols[2];
          flag = lastColUpper;
        } else {
          // Format without flag: Name | Value | Unit | Range
          unit = cols[2];
          range = cols[3];
        }
      } else if (cols.length === 3) {
        const lastColUpper = cols[2].toUpperCase();
        const isLastFlag = /^(HIGH|LOW|NORMAL|ALERT|ABNORMAL|CRITICAL|H|L)$/.test(lastColUpper);
        if (isLastFlag) {
          flag = lastColUpper;
        } else if (/[-<>]/.test(cols[2]) || /^(negative|positive|normal|clear)$/i.test(cols[2])) {
          range = cols[2];
        } else {
          unit = cols[2];
        }
      }

      // Clean flag if inadvertently captured in range
      const flagSuffixMatch = range.match(/\s+(HIGH|LOW|NORMAL|ALERT|ABNORMAL|CRITICAL|H|L)$/i);
      if (flagSuffixMatch) {
        if (!flag) flag = flagSuffixMatch[1].toUpperCase();
        range = range.replace(/\s+(HIGH|LOW|NORMAL|ALERT|ABNORMAL|CRITICAL|H|L)$/i, '').trim();
      }

      if (testName && value && isRecognizedValue(value)) {
        return {
          success: true,
          candidateLine: true,
          data: { testName, value, unit, range, flag },
        };
      }
    }
  }

  // 5. Generalized Delimited Line (Handles Single-Spaced and Flexible Real-World Text)
  let lineToProcess = trimmed;
  let detectedFlag = '';

  // Extract trailing flag
  const endFlagMatch = lineToProcess.match(/\s+(HIGH|LOW|NORMAL|ALERT|ABNORMAL|CRITICAL|H|L)$/i);
  if (endFlagMatch && endFlagMatch.index !== undefined) {
    detectedFlag = endFlagMatch[1].toUpperCase();
    lineToProcess = lineToProcess.slice(0, endFlagMatch.index).trim();
  }

  // Look for reference range token at end of line:
  // - Numeric ranges (e.g. "12.0 - 16.0", "4,500 - 11,000", "< 150", ">= 10") with optional unit
  // - Qualitative ranges ("Negative", "Normal", "Clear", "Pale Yellow")
  const rangePattern = /(?:(\b\d+(?:,\d+)*(?:\.\d+)?\s*-\s*\d+(?:,\d+)*(?:\.\d+)?\b|[<>]=?\s*[\d,.]+)(?:\s+[a-zA-Z/%^0-9.-]+)?|\b(negative|positive|non-reactive|normal|clear|pale yellow))\s*$/i;
  const rangeMatch = lineToProcess.match(rangePattern);

  if (rangeMatch && rangeMatch.index !== undefined && rangeMatch.index > 3) {
    let detectedRange = rangeMatch[0].trim();
    const beforeRange = lineToProcess.slice(0, rangeMatch.index).trim();

    // Before range should be: Test Name + Value + [Unit]
    const valAndUnit = extractTrailingValueAndUnit(beforeRange);
    if (valAndUnit && valAndUnit.testName) {
      // If detectedRange ends with unit matching valAndUnit.unit, strip unit from range
      if (valAndUnit.unit && detectedRange.toLowerCase().endsWith(valAndUnit.unit.toLowerCase())) {
        detectedRange = detectedRange.slice(0, -valAndUnit.unit.length).trim();
      }

      return {
        success: true,
        candidateLine: true,
        data: {
          testName: valAndUnit.testName,
          value: valAndUnit.value,
          unit: valAndUnit.unit,
          range: detectedRange,
          flag: detectedFlag,
        },
      };
    }
  }

  // 6. Test Line Without Reference Range (e.g. Qualitative Urinalysis "Color Pale Yellow", "Blood Group O Positive")
  const noRangeMatch = extractTrailingValueAndUnit(lineToProcess);
  if (noRangeMatch && noRangeMatch.testName && isRecognizedValue(noRangeMatch.value)) {
    return {
      success: true,
      candidateLine: true,
      data: {
        testName: noRangeMatch.testName,
        value: noRangeMatch.value,
        unit: noRangeMatch.unit,
        range: '',
        flag: detectedFlag,
      },
    };
  }

  // Filter out disclaimers and document metadata so they are not treated as candidate lines
  const isDisclaimer =
    IGNORE_LINE_PATTERNS.some((pattern) => pattern.test(trimmed)) ||
    /^(all reference intervals|please correlate|clinical interpretation|for inquiries|report generated|disclaimer)/i.test(trimmed) ||
    /\b(reflect normal values|adult fasting individuals|qualified professional)\b/i.test(trimmed);

  if (isDisclaimer) {
    return {
      success: false,
      candidateLine: false,
    };
  }

  // Check if line looks like it was meant to be a test finding
  const looksLikeCandidate =
    /^(hemoglobin|rbc|wbc|platelet|glucose|creatinine|sodium|potassium|calcium|protein|bilirubin|corrupted|unresolved|urea|cholesterol|vitamin|tsh|alt|ast|alp)/i.test(trimmed) ||
    (/^(?:[a-zA-Z0-9\(\)\/-]+\s+){1,4}(?:[<>=~]?\s*-?\d+(?:\.\d+)?|negative|positive)\b/i.test(trimmed) &&
      !/(reflect|individuals|please|belongs|inquiries|license|director|confidential)/i.test(trimmed));

  return {
    success: false,
    candidateLine: looksLikeCandidate,
    error: looksLikeCandidate ? 'Unresolved line structure' : undefined,
  };
}

/**
 * Checks whether a token represents a valid clinical test value:
 * numbers (integer, decimal, comma-separated, negative, zero), inequalities, or recognized qualitative states.
 */
function isRecognizedValue(val: string): boolean {
  if (!val || typeof val !== 'string') return false;
  const clean = val.trim();

  // Numeric: 13.5, 7,200, 250,000, 0, -0.5, <0.01, >60
  if (/^[<>]?=?\s*-?\d+(?:,\d+)*(?:\.\d+)?$/.test(clean)) return true;

  // Range as value: 0-2, 1-3
  if (/^\d+\s*-\s*\d+$/.test(clean)) return true;

  // Blood group values: O Positive, A+, B Negative, etc.
  if (/^(o|a|b|ab)\s*(positive|negative|\+|-)$/i.test(clean)) return true;

  // Qualitative:
  const qualitativeTerms = [
    'negative',
    'positive',
    'non-reactive',
    'reactive',
    'normal',
    'clear',
    'hazy',
    'turbid',
    'cloudy',
    'pale yellow',
    'yellow',
    'straw',
    'amber',
    'nil',
    'trace',
    'none',
    'few',
    'moderate',
    'many',
  ];
  return qualitativeTerms.includes(clean.toLowerCase());
}

/**
 * Extracts Value and Unit from a text fragment (e.g. "118 mg/dL", "13.5 g/dL", "Negative", "Pale Yellow")
 */
function extractValueAndUnit(text: string): { value: string; unit: string } | null {
  const trimmed = text.trim();

  // Numeric value + optional unit: e.g. "118 mg/dL", "7,200 /uL", "1.4"
  const numMatch = trimmed.match(/^([><]?=?\s*-?\d+(?:,\d+)*(?:\.\d+)?)\s*(.*)$/);
  if (numMatch) {
    return {
      value: numMatch[1].trim(),
      unit: numMatch[2].trim(),
    };
  }

  // Qualitative two-word values: "Pale Yellow"
  if (/^pale\s+yellow$/i.test(trimmed)) {
    return { value: 'Pale Yellow', unit: '' };
  }

  // Single word qualitative: "Negative", "Clear", "Normal"
  const words = trimmed.split(/\s+/);
  if (words.length >= 1 && isRecognizedValue(words[0])) {
    return {
      value: words[0].trim(),
      unit: words.slice(1).join(' ').trim(),
    };
  }

  return null;
}

/**
 * Extracts Test Name, Value, and Unit from the end of a string
 * e.g. "Total WBC Count 7,200 /uL" -> { testName: "Total WBC Count", value: "7,200", unit: "/uL" }
 * e.g. "Color Pale Yellow" -> { testName: "Color", value: "Pale Yellow", unit: "" }
 * e.g. "Serum Creatinine 1.4 mg/dL" -> { testName: "Serum Creatinine", value: "1.4", unit: "mg/dL" }
 */
function extractTrailingValueAndUnit(
  str: string
): { testName: string; value: string; unit: string } | null {
  const trimmed = str.trim();

  // 1. Qualitative two-word values like "Color Pale Yellow"
  const paleYellowMatch = trimmed.match(/^(.*?)\s+(pale\s+yellow)$/i);
  if (paleYellowMatch) {
    return {
      testName: paleYellowMatch[1].trim(),
      value: 'Pale Yellow',
      unit: '',
    };
  }

  // 2. Numeric value with optional unit:
  // e.g. "Hemoglobin 13.5 g/dL", "Total WBC Count 7,200 /uL", "Sodium 140 mmol/L", "Pus Cells 0-2 /HPF"
  const valMatch = trimmed.match(
    /^(.*?)\s+(\d+\s*-\s*\d+|[><]?=?\s*-?\d+(?:,\d+)*(?:\.\d+)?|\bnegative\b|\bpositive\b|\bclear\b|\bcloudy\b|\bhazy\b|\bturbid\b|\bnil\b|\btrace\b|\bnone\b|\bfew\b)\s*([a-zA-Z/%^0-9.-]*)$/i
  );

  if (valMatch && valMatch[1] && valMatch[2]) {
    const testName = valMatch[1].trim();
    const value = valMatch[2].trim();
    const unit = (valMatch[3] || '').trim();

    // Verify testName is reasonable length and value is recognized
    if (testName.length >= 2 && isRecognizedValue(value)) {
      return { testName, value, unit };
    }
  }

  // 3. Fallback for slashed units with possible inner spacing like "/ HPF"
  const slashUnitMatch = trimmed.match(
    /^(.*?)\s+(\d+\s*-\s*\d+|[><]?=?\s*-?\d+(?:,\d+)*(?:\.\d+)?)\s*(\/\s*[a-zA-Z]+)$/i
  );
  if (slashUnitMatch && slashUnitMatch[1] && slashUnitMatch[2]) {
    const testName = slashUnitMatch[1].trim();
    const value = slashUnitMatch[2].trim();
    const unit = slashUnitMatch[3].replace(/\s+/g, '').trim();
    if (testName.length >= 2 && isRecognizedValue(value)) {
      return { testName, value, unit };
    }
  }

  return null;
}
