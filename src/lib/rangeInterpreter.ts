import { CalculatedStatus, FlagStatus, RangeType } from '@/types/report';

export interface RangeInterpretation {
  numericValue: number | null;
  rangeLow: number | null;
  rangeHigh: number | null;
  rangeType: RangeType;
  calculatedStatus: CalculatedStatus;
  flag: FlagStatus;
  originalFlag?: string;
  flagDisagreement: boolean;
  flagDisagreementNote?: string;
  rangeExplanation: string;
}

/**
 * Parses numeric strings including integers, decimals, comma-separated thousands (e.g. 7,200),
 * negative numbers (-0.5), zero (0), and inequalities (<0.01).
 */
export function parseNumericValue(valStr: string): number | null {
  if (!valStr || typeof valStr !== 'string') return null;
  const clean = valStr.trim();

  // Handle qualitative strings that should not be parsed as numbers
  if (/^(negative|positive|non-reactive|reactive|normal|clear|pale yellow|yellow|hazy|turbid|cloudy|nil|none|few|trace|straw|amber)$/i.test(clean)) {
    return null;
  }

  // Strip leading inequality symbols if present in value
  const numPart = clean.replace(/^[<>=~]+\s*/, '').replace(/,/g, '').trim();

  // Check if valid float
  const parsed = parseFloat(numPart);
  if (isNaN(parsed)) return null;

  // Preserve zero, negative, and decimal values
  return parsed;
}

/**
 * Interprets reference-range expressions against values:
 * - Closed numeric intervals: e.g. "12.0 - 15.5", "70 - 99", "4,500 - 11,000" (inclusive)
 * - Strict less-than: e.g. "< 150" (must be strictly < 150; 150 is above range)
 * - Less-than-or-equal: e.g. "<= 5", "=< 5" (inclusive of boundary)
 * - Strict greater-than: e.g. "> 40" (must be strictly > 40; 40 is below range)
 * - Greater-than-or-equal: e.g. ">= 10", "=> 10" (inclusive of boundary)
 * - Qualitative ranges: e.g. "Negative", "Non-reactive", "Normal", "Clear"
 * - Missing / uninterpretable ranges: Unknown range status
 */
export function interpretReferenceRange(
  valStr: string,
  rawRangeStr: string | null | undefined,
  reportedLabFlag?: string
): RangeInterpretation {
  const valueTrimmed = (valStr || '').trim();
  const rangeTrimmed = (rawRangeStr || '').trim();
  const normLabFlag = reportedLabFlag ? reportedLabFlag.toUpperCase().trim() : undefined;

  const numVal = parseNumericValue(valueTrimmed);

  // 1. Missing Range
  if (!rangeTrimmed) {
    return {
      numericValue: numVal,
      rangeLow: null,
      rangeHigh: null,
      rangeType: 'NO_RANGE_PRINTED',
      calculatedStatus: 'UNKNOWN',
      flag: 'INCONCLUSIVE',
      originalFlag: normLabFlag,
      flagDisagreement: false,
      rangeExplanation: 'No reference range printed on report; range status cannot be determined.',
    };
  }

  // 2. Strict / Inclusive Less-Than: "<= 150", "=< 150", or "< 150"
  const lessThanMatch = rangeTrimmed.match(/^([<]=?|=<)\s*([\d,.]+)(?:\s+[a-zA-Z/%^0-9.-]+)?$/i);
  if (lessThanMatch) {
    const isInclusive = lessThanMatch[1].includes('=');
    const bound = parseFloat(lessThanMatch[2].replace(/,/g, ''));

    if (numVal !== null && !isNaN(bound)) {
      const isNormal = isInclusive ? numVal <= bound : numVal < bound;
      const status: CalculatedStatus = isNormal ? 'NORMAL' : 'ABOVE_RANGE';
      const flag: FlagStatus = isNormal ? 'NORMAL' : 'HIGH';

      // Detect disagreement if laboratory printed a flag
      let disagreement = false;
      let disagreementNote: string | undefined;

      if (normLabFlag) {
        const labSaidHigh = normLabFlag === 'HIGH' || normLabFlag === 'ALERT' || normLabFlag === 'ABNORMAL' || normLabFlag === 'H';
        const labSaidNormal = normLabFlag === 'NORMAL';
        if (isNormal && labSaidHigh) {
          disagreement = true;
          disagreementNote = `Laboratory printed flag "${normLabFlag}", but value ${valueTrimmed} satisfies the printed range (${rangeTrimmed}).`;
        } else if (!isNormal && labSaidNormal) {
          disagreement = true;
          disagreementNote = `Laboratory printed flag "${normLabFlag}", but value ${valueTrimmed} exceeds the printed threshold (${rangeTrimmed}).`;
        }
      }

      return {
        numericValue: numVal,
        rangeLow: null,
        rangeHigh: bound,
        rangeType: isInclusive ? 'LESS_THAN_OR_EQUAL' : 'LESS_THAN',
        calculatedStatus: status,
        flag,
        originalFlag: normLabFlag,
        flagDisagreement: disagreement,
        flagDisagreementNote: disagreementNote,
        rangeExplanation: isNormal
          ? `Value is within the upper threshold (${rangeTrimmed}).`
          : `Value exceeds the upper threshold (${rangeTrimmed}).`,
      };
    }
  }

  // 3. Strict / Inclusive Greater-Than: ">= 40", "=> 40", or "> 40"
  const greaterThanMatch = rangeTrimmed.match(/^([>]=?|=>)\s*([\d,.]+)(?:\s+[a-zA-Z/%^0-9.-]+)?$/i);
  if (greaterThanMatch) {
    const isInclusive = greaterThanMatch[1].includes('=');
    const bound = parseFloat(greaterThanMatch[2].replace(/,/g, ''));

    if (numVal !== null && !isNaN(bound)) {
      const isNormal = isInclusive ? numVal >= bound : numVal > bound;
      const status: CalculatedStatus = isNormal ? 'NORMAL' : 'BELOW_RANGE';
      const flag: FlagStatus = isNormal ? 'NORMAL' : 'LOW';

      let disagreement = false;
      let disagreementNote: string | undefined;

      if (normLabFlag) {
        const labSaidLow = normLabFlag === 'LOW' || normLabFlag === 'ALERT' || normLabFlag === 'ABNORMAL' || normLabFlag === 'L';
        const labSaidNormal = normLabFlag === 'NORMAL';
        if (isNormal && labSaidLow) {
          disagreement = true;
          disagreementNote = `Laboratory printed flag "${normLabFlag}", but value ${valueTrimmed} satisfies the printed range (${rangeTrimmed}).`;
        } else if (!isNormal && labSaidNormal) {
          disagreement = true;
          disagreementNote = `Laboratory printed flag "${normLabFlag}", but value ${valueTrimmed} is below the printed threshold (${rangeTrimmed}).`;
        }
      }

      return {
        numericValue: numVal,
        rangeLow: bound,
        rangeHigh: null,
        rangeType: isInclusive ? 'GREATER_THAN_OR_EQUAL' : 'GREATER_THAN',
        calculatedStatus: status,
        flag,
        originalFlag: normLabFlag,
        flagDisagreement: disagreement,
        flagDisagreementNote: disagreementNote,
        rangeExplanation: isNormal
          ? `Value satisfies the minimum threshold (${rangeTrimmed}).`
          : `Value is below the minimum threshold (${rangeTrimmed}).`,
      };
    }
  }

  // 4. Closed Numeric Interval: "low - high" or "low to high" (inclusive interval)
  const intervalMatch = rangeTrimmed.match(/^(-?[\d,.]+)\s*(?:-|to)\s*(-?[\d,.]+)(?:\s+[a-zA-Z/%^0-9.-]+)?$/i);
  if (intervalMatch) {
    const low = parseFloat(intervalMatch[1].replace(/,/g, ''));
    const high = parseFloat(intervalMatch[2].replace(/,/g, ''));

    if (!isNaN(low) && !isNaN(high) && numVal !== null) {
      let status: CalculatedStatus = 'NORMAL';
      let flag: FlagStatus = 'NORMAL';

      if (numVal < low) {
        status = 'BELOW_RANGE';
        flag = 'LOW';
      } else if (numVal > high) {
        status = 'ABOVE_RANGE';
        flag = 'HIGH';
      } else {
        status = 'NORMAL';
        flag = 'NORMAL';
      }

      let disagreement = false;
      let disagreementNote: string | undefined;

      if (normLabFlag) {
        const labSaidHigh = normLabFlag === 'HIGH' || normLabFlag === 'H';
        const labSaidLow = normLabFlag === 'LOW' || normLabFlag === 'L';
        const labSaidNormal = normLabFlag === 'NORMAL';

        if (status === 'NORMAL' && (labSaidHigh || labSaidLow)) {
          disagreement = true;
          disagreementNote = `Laboratory printed flag "${normLabFlag}", but value ${valueTrimmed} falls within the interval (${low} - ${high}).`;
        } else if (status === 'ABOVE_RANGE' && labSaidNormal) {
          disagreement = true;
          disagreementNote = `Laboratory printed flag "${normLabFlag}", but value ${valueTrimmed} is above the upper limit (${high}).`;
        } else if (status === 'BELOW_RANGE' && labSaidNormal) {
          disagreement = true;
          disagreementNote = `Laboratory printed flag "${normLabFlag}", but value ${valueTrimmed} is below the lower limit (${low}).`;
        }
      }

      return {
        numericValue: numVal,
        rangeLow: low,
        rangeHigh: high,
        rangeType: 'CLOSED_NUMERIC',
        calculatedStatus: status,
        flag,
        originalFlag: normLabFlag,
        flagDisagreement: disagreement,
        flagDisagreementNote: disagreementNote,
        rangeExplanation:
          status === 'ABOVE_RANGE'
            ? `Above the reference range printed on this report (${rangeTrimmed}).`
            : status === 'BELOW_RANGE'
            ? `Below the reference range printed on this report (${rangeTrimmed}).`
            : `Within the reference range printed on this report (${rangeTrimmed}).`,
      };
    }
  }

  // 5. Qualitative Reference Range Comparison
  const valLower = valueTrimmed.toLowerCase();
  const rangeLower = rangeTrimmed.toLowerCase();

  const qualitativeTerms = [
    'negative',
    'positive',
    'non-reactive',
    'reactive',
    'normal',
    'clear',
    'pale yellow',
    'yellow',
    'straw',
    'amber',
    'nil',
    'none',
    'few',
    'trace',
    'moderate',
    'many',
    'cloudy',
    'turbid',
    'hazy',
  ];

  const isQualitativeRange = qualitativeTerms.some((t) => rangeLower.includes(t));

  if (isQualitativeRange) {
    const negativeNorms = ['negative', 'non-reactive', 'nil', 'none', 'normal'];
    const isRangeNegativeNorm = negativeNorms.some((n) => rangeLower.includes(n));

    if (isRangeNegativeNorm) {
      const isValNegative = negativeNorms.some((n) => valLower.includes(n));
      const status: CalculatedStatus = isValNegative ? 'NORMAL' : 'OUTSIDE_RANGE';
      const flag: FlagStatus = isValNegative ? 'NORMAL' : 'HIGH';

      return {
        numericValue: numVal,
        rangeLow: null,
        rangeHigh: null,
        rangeType: 'QUALITATIVE',
        calculatedStatus: status,
        flag,
        originalFlag: normLabFlag,
        flagDisagreement: false,
        rangeExplanation: isValNegative
          ? `Result matches the expected qualitative reference (${rangeTrimmed}).`
          : `Result (${valueTrimmed}) differs from the expected qualitative reference (${rangeTrimmed}).`,
      };
    }

    const isMatch = valLower === rangeLower || rangeLower.includes(valLower) || valLower.includes(rangeLower);
    const status: CalculatedStatus = isMatch ? 'NORMAL' : 'OUTSIDE_RANGE';
    const flag: FlagStatus = isMatch ? 'NORMAL' : 'HIGH';

    return {
      numericValue: numVal,
      rangeLow: null,
      rangeHigh: null,
      rangeType: 'QUALITATIVE',
      calculatedStatus: status,
      flag,
      originalFlag: normLabFlag,
      flagDisagreement: false,
      rangeExplanation: isMatch
        ? `Result conforms to the qualitative reference description (${rangeTrimmed}).`
        : `Result (${valueTrimmed}) differs from the expected qualitative reference (${rangeTrimmed}).`,
    };
  }

  // 6. Unknown / Uninterpretable Range
  return {
    numericValue: numVal,
    rangeLow: null,
    rangeHigh: null,
    rangeType: 'UNPARSEABLE',
    calculatedStatus: 'UNKNOWN',
    flag: 'INCONCLUSIVE',
    originalFlag: normLabFlag,
    flagDisagreement: false,
    rangeExplanation: `Reference range format "${rangeTrimmed}" could not be interpreted reliably; status marked as unknown.`,
  };
}
