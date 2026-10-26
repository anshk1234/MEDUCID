import { describe, it, expect } from 'vitest';
import { extractMeasurementsFromText, parseMeasurementLine } from '../src/lib/documentExtractor';
import { interpretReferenceRange, parseNumericValue } from '../src/lib/rangeInterpreter';
import { auditFactualConsistency } from '../src/lib/consistencyChecker';
import { parseRawReportText, formatStrictSummary } from '../src/lib/simplificationEngine';
import { extractPdfText } from '../src/lib/fileProcessor';

// Multi-section synthetic clinical laboratory report fixture containing:
// 1. Complete Blood Count (CBC)
// 2. Biochemistry
// 3. Urinalysis
const MULTI_SECTION_LAB_REPORT = `
CITY CLINICAL DIAGNOSTICS - COMPREHENSIVE LABORATORY REPORT
Patient ID: SYN-PT-9021 | Specimen: Whole Blood, Serum, Urine
Collection Date: 2026-10-23 09:30 AM | Status: Final Report

================================================================================
1. COMPLETE BLOOD COUNT (CBC)
TEST                         RESULT     UNIT       REFERENCE RANGE   FLAG
--------------------------------------------------------------------------------
Hemoglobin                   13.5       g/dL       12.0 - 16.0       NORMAL
RBC Count                    4.4        x10^6/uL   4.0 - 5.2         NORMAL
PCV / Hematocrit             41.0       %          36.0 - 46.0       NORMAL
MCV                          88.0       fL         80.0 - 100.0      NORMAL
MCH                          29.5       pg         27.0 - 33.0       NORMAL
MCHC                         33.2       g/dL       31.5 - 35.0       NORMAL
RDW                          12.8       %          11.5 - 14.5       NORMAL
Total WBC Count              7,200      /uL        4,500 - 11,000    NORMAL
Neutrophils                  60         %          40 - 70           NORMAL
Lymphocytes                  30         %          20 - 45           NORMAL
Eosinophils                  3          %          1 - 6             NORMAL
Monocytes                    6          %          2 - 10            NORMAL
Basophils                    1          %          0 - 2             NORMAL
Platelet Count               250,000    /uL        150,000 - 450,000 NORMAL

================================================================================
2. BIOCHEMISTRY
TEST                         RESULT     UNIT       REFERENCE RANGE   FLAG
--------------------------------------------------------------------------------
Fasting Glucose              105        mg/dL      70 - 99           HIGH
HbA1c                        5.8        %          4.0 - 5.6         HIGH
Total Cholesterol            215        mg/dL      < 200             HIGH
Triglycerides                140        mg/dL      < 150             NORMAL
HDL Cholesterol              48         mg/dL      > 40              NORMAL
LDL Cholesterol              139        mg/dL      < 100             HIGH
Sodium                       140        mmol/L     135 - 145         NORMAL
Potassium                    4.3        mmol/L     3.5 - 5.1         NORMAL
Chloride                     102        mmol/L     98 - 107          NORMAL
Serum Creatinine             0.9        mg/dL      0.6 - 1.2         NORMAL
Blood Urea Nitrogen (BUN)    15         mg/dL      7 - 20            NORMAL
Uric Acid                    5.2        mg/dL      3.5 - 7.2         NORMAL
Total Bilirubin              0.8        mg/dL      0.2 - 1.2         NORMAL
AST                          22         U/L        10 - 40           NORMAL
ALT                          26         U/L        7 - 56            NORMAL
Alkaline Phosphatase         65         U/L        44 - 147          NORMAL

================================================================================
3. URINALYSIS
TEST                         RESULT     UNIT       REFERENCE RANGE   FLAG
--------------------------------------------------------------------------------
Color                        Pale Yellow           Pale Yellow       NORMAL
Clarity                      Clear                 Clear             NORMAL
Specific Gravity             1.015                 1.005 - 1.030     NORMAL
pH                           6.0                   5.0 - 8.0         NORMAL
Protein                      Negative              Negative          NORMAL
Glucose                      Negative              Negative          NORMAL
Ketones                      Negative              Negative          NORMAL
Bilirubin                    Negative              Negative          NORMAL
Blood                        Negative              Negative          NORMAL
Nitrite                      Negative              Negative          NORMAL
Leukocyte Esterase           Negative              Negative          NORMAL
Urobilinogen                 0.2        mg/dL      0.2 - 1.0         NORMAL
Pus Cells (WBC)              0-2        /HPF       0 - 5             NORMAL
RBC                          0-2        /HPF       0 - 2             NORMAL
Epithelial Cells             Few        /HPF                         NORMAL
Bacteria                     None       /HPF                         NORMAL
================================================================================
END OF REPORT
`;

describe('MEDUCID Document Extraction & Verification Regression Test Suite', () => {
  // Test 1: Parsing all CBC measurements
  it('1. should parse all Complete Blood Count (CBC) measurements without truncation', () => {
    const res = extractMeasurementsFromText(MULTI_SECTION_LAB_REPORT);
    const cbcFindings = res.findings.filter((f) => f.category.includes('CBC'));

    expect(cbcFindings.length).toBe(14);
    const names = cbcFindings.map((f) => f.testName);
    expect(names).toContain('Hemoglobin');
    expect(names).toContain('RBC Count');
    expect(names).toContain('MCV');
    expect(names).toContain('MCH');
    expect(names).toContain('Total WBC Count');
    expect(names).toContain('Platelet Count');
  });

  // Test 2: Parsing all Biochemistry measurements
  it('2. should parse all Biochemistry measurements including lipid, renal, and glucose profiles', () => {
    const res = extractMeasurementsFromText(MULTI_SECTION_LAB_REPORT);
    const bioFindings = res.findings.filter((f) => f.category.includes('Biochemistry'));

    expect(bioFindings.length).toBe(16);
    const names = bioFindings.map((f) => f.testName);
    expect(names).toContain('Fasting Glucose');
    expect(names).toContain('HbA1c');
    expect(names).toContain('Total Cholesterol');
    expect(names).toContain('Sodium');
    expect(names).toContain('Potassium');
    expect(names).toContain('Serum Creatinine');
  });

  // Test 3: Parsing qualitative urinalysis results
  it('3. should parse qualitative urinalysis results (Pale Yellow, Clear, Negative, None)', () => {
    const res = extractMeasurementsFromText(MULTI_SECTION_LAB_REPORT);
    const urineFindings = res.findings.filter((f) => f.category.includes('Urinalysis'));

    expect(urineFindings.length).toBe(16);

    const color = urineFindings.find((f) => f.testName === 'Color');
    expect(color?.originalValue).toBe('Pale Yellow');
    expect(color?.flag).toBe('NORMAL');

    const clarity = urineFindings.find((f) => f.testName === 'Clarity');
    expect(clarity?.originalValue).toBe('Clear');
    expect(clarity?.flag).toBe('NORMAL');

    const protein = urineFindings.find((f) => f.testName === 'Protein');
    expect(protein?.originalValue).toBe('Negative');
    expect(protein?.flag).toBe('NORMAL');

    const bacteria = urineFindings.find((f) => f.testName === 'Bacteria');
    expect(bacteria?.originalValue).toBe('None');
    expect(bacteria?.unit).toBe('/HPF');
  });

  // Test 4: Parsing the same report from PDF and TXT yields consistent measurements
  it('4. should parse the same report from PDF and TXT consistently', async () => {
    // TXT extraction
    const txtParsed = parseRawReportText(MULTI_SECTION_LAB_REPORT, 'Report.txt');

    // Simulate PDF binary containing the report text
    const encoder = new TextEncoder();
    const mockPdfBuffer = encoder.encode(
      `%PDF-1.4\n1 0 obj\n<< /Length 200 >>\nstream\nBT\n/F1 12 Tf\n(${MULTI_SECTION_LAB_REPORT.replace(/\n/g, ') Tj\n(')}) Tj\nET\nendstream\nendobj`
    ).buffer;

    const extractedPdfText = await extractPdfText(mockPdfBuffer);
    expect(extractedPdfText.length).toBeGreaterThan(0);

    const pdfParsed = parseRawReportText(extractedPdfText, 'Report.pdf');

    // Verify key measurements exist in both
    const txtNames = txtParsed.findings.map((f) => f.testName);
    const pdfNames = pdfParsed.findings.map((f) => f.testName);

    expect(txtNames).toContain('Hemoglobin');
    expect(pdfNames).toContain('Hemoglobin');
    expect(txtNames).toContain('Fasting Glucose');
    expect(pdfNames).toContain('Fasting Glucose');
  });

  // Test 5: Preserving decimal values, units, and reference ranges verbatim
  it('5. should preserve decimal values, units, and reference ranges verbatim', () => {
    const res = extractMeasurementsFromText(MULTI_SECTION_LAB_REPORT);
    const hgb = res.findings.find((f) => f.testName === 'Hemoglobin')!;

    expect(hgb.originalValue).toBe('13.5');
    expect(hgb.unit).toBe('g/dL');
    expect(hgb.referenceRange).toBe('12.0 - 16.0');
    expect(hgb.numericValue).toBe(13.5);
    expect(hgb.rangeLow).toBe(12.0);
    expect(hgb.rangeHigh).toBe(16.0);
  });

  // Test 6: Handling < and > reference ranges
  it('6. should correctly evaluate < and > reference ranges', () => {
    // < 200 with result 215 -> ABOVE_RANGE (HIGH)
    const chol = interpretReferenceRange('215', '< 200');
    expect(chol.calculatedStatus).toBe('ABOVE_RANGE');
    expect(chol.flag).toBe('HIGH');

    // < 150 with result 140 -> NORMAL
    const trig = interpretReferenceRange('140', '< 150');
    expect(trig.calculatedStatus).toBe('NORMAL');
    expect(trig.flag).toBe('NORMAL');

    // > 40 with result 48 -> NORMAL
    const hdl = interpretReferenceRange('48', '> 40');
    expect(hdl.calculatedStatus).toBe('NORMAL');
    expect(hdl.flag).toBe('NORMAL');

    // > 40 with result 35 -> BELOW_RANGE (LOW)
    const lowHdl = interpretReferenceRange('35', '> 40');
    expect(lowHdl.calculatedStatus).toBe('BELOW_RANGE');
    expect(lowHdl.flag).toBe('LOW');
  });

  // Test 7: Handling equality at range boundaries
  it('7. should handle equality at range boundaries strictly according to mathematical operators', () => {
    // Closed interval [12.0 - 15.5]: 12.0 and 15.5 are inclusive (NORMAL)
    expect(interpretReferenceRange('12.0', '12.0 - 15.5').flag).toBe('NORMAL');
    expect(interpretReferenceRange('15.5', '12.0 - 15.5').flag).toBe('NORMAL');
    expect(interpretReferenceRange('11.9', '12.0 - 15.5').flag).toBe('LOW');
    expect(interpretReferenceRange('15.6', '12.0 - 15.5').flag).toBe('HIGH');

    // Strict less-than "< 150": 150 is NOT strictly less than 150, so 150 is ABOVE_RANGE
    const atBoundLess = interpretReferenceRange('150', '< 150');
    expect(atBoundLess.calculatedStatus).toBe('ABOVE_RANGE');
    expect(atBoundLess.flag).toBe('HIGH');

    // Inclusive less-than "<= 150": 150 IS <= 150, so NORMAL
    const atBoundLessEq = interpretReferenceRange('150', '<= 150');
    expect(atBoundLessEq.calculatedStatus).toBe('NORMAL');
    expect(atBoundLessEq.flag).toBe('NORMAL');

    // Strict greater-than "> 40": 40 is NOT strictly greater than 40, so 40 is BELOW_RANGE
    const atBoundGreat = interpretReferenceRange('40', '> 40');
    expect(atBoundGreat.calculatedStatus).toBe('BELOW_RANGE');
    expect(atBoundGreat.flag).toBe('LOW');

    // Inclusive greater-than ">= 40": 40 IS >= 40, so NORMAL
    const atBoundGreatEq = interpretReferenceRange('40', '>= 40');
    expect(atBoundGreatEq.calculatedStatus).toBe('NORMAL');
    expect(atBoundGreatEq.flag).toBe('NORMAL');
  });

  // Test 8: Handling missing units and reference ranges without inventing information
  it('8. should handle missing units and reference ranges without inventing data', () => {
    const lineNoRange = 'Blood Group  O Positive';
    const parsed = parseMeasurementLine(lineNoRange);
    expect(parsed.success).toBe(true);
    expect(parsed.data?.testName).toBe('Blood Group');
    expect(parsed.data?.value).toBe('O Positive');
    expect(parsed.data?.range).toBe('');

    const interp = interpretReferenceRange('O Positive', '');
    expect(interp.calculatedStatus).toBe('UNKNOWN');
    expect(interp.flag).toBe('INCONCLUSIVE');
    expect(interp.rangeExplanation).toContain('No reference range printed');
  });

  // Test 9: Preserving zero and negative numeric values where valid
  it('9. should preserve zero and negative values accurately', () => {
    expect(parseNumericValue('0')).toBe(0);
    expect(parseNumericValue('0.0')).toBe(0);
    expect(parseNumericValue('-0.5')).toBe(-0.5);
    expect(parseNumericValue('-2.1')).toBe(-2.1);

    const zeroInterp = interpretReferenceRange('0', '0 - 2');
    expect(zeroInterp.numericValue).toBe(0);
    expect(zeroInterp.calculatedStatus).toBe('NORMAL');

    const negInterp = interpretReferenceRange('-0.5', '-1.0 - 1.0');
    expect(negInterp.numericValue).toBe(-0.5);
    expect(negInterp.calculatedStatus).toBe('NORMAL');
  });

  // Test 10: Handling duplicate measurement names without deleting distinct results in different sections
  it('10. should preserve distinct measurements with the same name across different sections', () => {
    const reportWithDupNames = `
BIOCHEMISTRY
Glucose  118  mg/dL  70 - 99  HIGH

URINALYSIS
Glucose  Negative  Negative  NORMAL
    `;
    const res = extractMeasurementsFromText(reportWithDupNames);
    const glucoses = res.findings.filter((f) => f.testName.toLowerCase().includes('glucose'));

    expect(glucoses.length).toBe(2);
    expect(glucoses[0].category).toBe('Biochemistry');
    expect(glucoses[0].originalValue).toBe('118');
    expect(glucoses[1].category).toBe('Urinalysis');
    expect(glucoses[1].originalValue).toBe('Negative');
  });

  // Test 11: Handling multiple pages and sections
  it('11. should handle multiple pages and sections with detected section names', () => {
    const multiPage = `
Page 1 of 2
1. COMPLETE BLOOD COUNT (CBC)
Hemoglobin  14.0  g/dL  12.0 - 16.0  NORMAL

Page 2 of 2
2. BIOCHEMISTRY
Sodium  140  mmol/L  135 - 145  NORMAL
    `;
    const res = extractMeasurementsFromText(multiPage);
    expect(res.findings.length).toBe(2);
    expect(res.detectedSections).toContain('Complete Blood Count (CBC)');
    expect(res.detectedSections).toContain('Biochemistry');
  });

  // Test 12: Reporting incomplete extraction honestly
  it('12. should report incomplete extraction honestly when lines cannot be parsed', () => {
    const incompleteReport = `
Hemoglobin  13.5  g/dL  12.0 - 16.0  NORMAL
CorruptedUnparseableMeasurementLineThatLacksValueAndTokens
    `;
    const res = extractMeasurementsFromText(incompleteReport);
    expect(res.findings.length).toBe(1);
    expect(res.completeness.unresolvedCount).toBe(1);
    expect(res.completeness.coveragePercentage).toBe(50);
    expect(res.completeness.completenessStatus).toBe('PARTIAL');
  });

  // Test 13: Preventing false-positive verification success
  it('13. should prevent false-positive verification success when values do not match source', () => {
    const report = parseRawReportText(MULTI_SECTION_LAB_REPORT, 'Test Report');

    // Simulate tampering or hallucinated value
    report.findings[0].originalValue = '9999.99';
    const audit = auditFactualConsistency(report);

    expect(audit.passed).toBe(false);
    expect(audit.metrics?.overallStatus).toBe('PARTIALLY_VERIFIED');
    const valCheck = audit.checks.find((c) => c.id === 'val-preservation');
    expect(valCheck?.status).toBe('fail');
  });

  // Test 14: Keeping summaries and counts consistent with the underlying dataset
  it('14. should derive all counts, summaries, and take-aways consistently from canonical findings', () => {
    const report = parseRawReportText(MULTI_SECTION_LAB_REPORT, 'Full Report');
    const total = report.findings.length;
    expect(total).toBe(46);

    const { totalTests, outOfRangeCount, withinRangeCount, noNumericRangeCount } = report.summary;
    expect(totalTests).toBe(total);
    expect(outOfRangeCount + withinRangeCount + noNumericRangeCount).toBe(total);

    // Verify out-of-range matches expected flagged tests
    const expectedOutOfRange = report.findings.filter(
      (f) => f.flag === 'HIGH' || f.flag === 'LOW'
    );
    expect(expectedOutOfRange.length).toBe(outOfRangeCount);
  });

  // Test 15: Handling malformed or unsupported measurements without crashing
  it('15. should handle malformed or unsupported lines gracefully without throwing', () => {
    const malformed = `
null
undefined
:::: :::
-----
===
12345
Random text with no tests
Glucose
Hemoglobin: [corrupted range ???]
    `;
    expect(() => extractMeasurementsFromText(malformed)).not.toThrow();
    const res = extractMeasurementsFromText(malformed);
    expect(res.findings).toBeDefined();
  });

  // Test 16: Regression test for PDF-versus-TXT 43-measurement consistency
  it('16. should extract identical canonical measurements and range classifications for PDF and TXT synthetic report', async () => {
    const SYNTHETIC_43_REPORT = `
CITY CLINICAL DIAGNOSTICS - COMPREHENSIVE LABORATORY REPORT
Patient ID: SYN-PT-9021 | Specimen: Whole Blood, Serum, Urine
Collection Date: 2026-10-23 09:30 AM | Status: Final Report
All reference intervals reflect normal values for adult fasting individuals.

================================================================================
1. COMPLETE BLOOD COUNT (CBC)
TEST                         RESULT     UNIT       REFERENCE RANGE   FLAG
--------------------------------------------------------------------------------
Hemoglobin                   13.5       g/dL       12.0 - 16.0       NORMAL
RBC Count                    4.4        x10^6/uL   4.0 - 5.2         NORMAL
PCV / Hematocrit             41.0       %          36.0 - 46.0       NORMAL
MCV                          88.0       fL         80.0 - 100.0      NORMAL
MCH                          29.5       pg         27.0 - 33.0       NORMAL
MCHC                         33.2       g/dL       31.5 - 35.0       NORMAL
RDW                          12.8       %          11.5 - 14.5       NORMAL
Total WBC Count              7,200      /uL        4,500 - 11,000    NORMAL
Neutrophils                  60         %          40 - 70           NORMAL
Lymphocytes                  30         %          20 - 45           NORMAL
Eosinophils                  8          %          1 - 6             HIGH
Monocytes                    6          %          2 - 10            NORMAL
Basophils                    1          %          0 - 2             NORMAL
Platelet Count               250,000    /uL        150,000 - 450,000 NORMAL

================================================================================
2. BIOCHEMISTRY
TEST                         RESULT     UNIT       REFERENCE RANGE   FLAG
--------------------------------------------------------------------------------
Fasting Glucose              92         mg/dL      70 - 99           NORMAL
HbA1c                        5.4        %          4.0 - 5.6         NORMAL
Total Cholesterol            185        mg/dL      < 200             NORMAL
Triglycerides                175        mg/dL      < 150             HIGH
HDL Cholesterol              48         mg/dL      > 40              NORMAL
LDL Cholesterol              95         mg/dL      < 100             NORMAL
Sodium                       140        mmol/L     135 - 145         NORMAL
Potassium                    4.3        mmol/L     3.5 - 5.1         NORMAL
Chloride                     102        mmol/L     98 - 107          NORMAL
Serum Creatinine             0.9        mg/dL      0.6 - 1.2         NORMAL
Blood Urea Nitrogen (BUN)    15         mg/dL      7 - 20            NORMAL
Uric Acid                    5.2        mg/dL      3.5 - 7.2         NORMAL
Total Bilirubin              0.8        mg/dL      0.2 - 1.2         NORMAL
AST                          22         U/L        10 - 40           NORMAL
ALT                          26         U/L        7 - 56            NORMAL
Alkaline Phosphatase         65         U/L        44 - 147          NORMAL
Vitamin D                    18         ng/mL      30 - 100          LOW

================================================================================
3. URINALYSIS
TEST                         RESULT     UNIT       REFERENCE RANGE   FLAG
--------------------------------------------------------------------------------
Color                        Pale Yellow           Pale Yellow       NORMAL
Clarity                      Clear                 Clear             NORMAL
Specific Gravity             1.015                 1.005 - 1.030     NORMAL
pH                           6.0                   5.0 - 8.0         NORMAL
Protein                      Negative              Negative          NORMAL
Glucose                      Negative              Negative          NORMAL
Ketones                      Negative              Negative          NORMAL
Bilirubin                    Negative              Negative          NORMAL
Blood                        Negative              Negative          NORMAL
Nitrite                      Negative              Negative          NORMAL
Leukocyte Esterase           Negative              Negative          NORMAL
Epithelial Cells             Few        /HPF                         NORMAL
================================================================================
END OF REPORT
`;

    // 1. TXT Ingestion
    const txtResult = extractMeasurementsFromText(SYNTHETIC_43_REPORT);

    // 2. Simulated PDF Ingestion (single-spaced line representation from PDF text layers)
    const singleSpacedPdf = SYNTHETIC_43_REPORT.split('\n')
      .map((l) => l.trim().replace(/\s+/g, ' '))
      .join('\n');
    const pdfResult = extractMeasurementsFromText(singleSpacedPdf);

    // Assert total count matches exactly 43 in both formats
    expect(txtResult.findings.length).toBe(43);
    expect(pdfResult.findings.length).toBe(43);

    // Assert metadata disclaimers are not marked as unresolved candidate lines
    expect(txtResult.completeness.unresolvedCount).toBe(0);
    expect(pdfResult.completeness.unresolvedCount).toBe(0);

    // Helper to count range categories
    const categorizeRanges = (findings: typeof txtResult.findings) => {
      let numericCount = 0;
      let withinCount = 0;
      let outsideCount = 0;
      let noNumericCount = 0;
      const outsideNames: string[] = [];

      for (const f of findings) {
        const isNumeric = f.rangeLow !== null || f.rangeHigh !== null;
        if (isNumeric) {
          numericCount++;
          if (f.flag === 'HIGH' || f.flag === 'LOW') {
            outsideCount++;
            outsideNames.push(f.testName);
          } else {
            withinCount++;
          }
        } else {
          noNumericCount++;
        }
      }

      return { numericCount, withinCount, outsideCount, noNumericCount, outsideNames };
    };

    const txtStats = categorizeRanges(txtResult.findings);
    const pdfStats = categorizeRanges(pdfResult.findings);

    // Both formats must report identical 33 numeric ranges, 30 within, 3 outside, 10 non-numeric
    expect(txtStats.numericCount).toBe(33);
    expect(pdfStats.numericCount).toBe(33);

    expect(txtStats.withinCount).toBe(30);
    expect(pdfStats.withinCount).toBe(30);

    expect(txtStats.outsideCount).toBe(3);
    expect(pdfStats.outsideCount).toBe(3);

    expect(txtStats.noNumericCount).toBe(10);
    expect(pdfStats.noNumericCount).toBe(10);

    // Both identify eosinophils, triglycerides, and vitamin D as outside printed ranges
    expect(txtStats.outsideNames).toEqual(expect.arrayContaining(['Eosinophils', 'Triglycerides', 'Vitamin D']));
    expect(pdfStats.outsideNames).toEqual(expect.arrayContaining(['Eosinophils', 'Triglycerides', 'Vitamin D']));

    // Match records by test identity and section rather than array index
    for (const tf of txtResult.findings) {
      const pf = pdfResult.findings.find(
        (p) =>
          p.testName.toLowerCase() === tf.testName.toLowerCase() &&
          p.category.toLowerCase() === tf.category.toLowerCase()
      );

      expect(pf).toBeDefined();
      expect(pf!.originalValue).toBe(tf.originalValue);
      expect(pf!.unit).toBe(tf.unit);
      expect(pf!.referenceRange).toBe(tf.referenceRange);
      expect(pf!.numericValue).toBe(tf.numericValue);
      expect(pf!.rangeLow).toBe(tf.rangeLow);
      expect(pf!.rangeHigh).toBe(tf.rangeHigh);
      expect(pf!.flag).toBe(tf.flag);
      expect(pf!.calculatedStatus).toBe(tf.calculatedStatus);
      expect(pf!.rangeType).toBe(tf.rangeType);
    }
  });

  // Test 17: Preserving qualitative reference ranges as QUALITATIVE data
  it('17. should preserve qualitative ranges (Negative, Clear, Pale Yellow) as qualitative data without classifying as missing', () => {
    const urinalysisText = `
Color    Pale Yellow    Pale Yellow    NORMAL
Clarity  Clear          Clear          NORMAL
Protein  Negative       Negative       NORMAL
Ketones  Negative       Negative       NORMAL
    `;
    const res = extractMeasurementsFromText(urinalysisText);
    expect(res.findings.length).toBe(4);

    for (const f of res.findings) {
      expect(f.rangeType).toBe('QUALITATIVE');
      expect(f.flag).toBe('NORMAL');
      expect(f.calculatedStatus).toBe('NORMAL');
      expect(f.referenceRange.length).toBeGreaterThan(0);
    }
  });

  // Test 18: Distinguishing NO_RANGE_PRINTED, QUALITATIVE, and UNPARSEABLE ranges
  it('18. should distinguish NO_RANGE_PRINTED, QUALITATIVE, and UNPARSEABLE reference ranges', () => {
    // 1. No range printed
    const noRange = interpretReferenceRange('Few', '');
    expect(noRange.rangeType).toBe('NO_RANGE_PRINTED');
    expect(noRange.calculatedStatus).toBe('UNKNOWN');

    // 2. Qualitative range
    const qualitative = interpretReferenceRange('Negative', 'Negative');
    expect(qualitative.rangeType).toBe('QUALITATIVE');
    expect(qualitative.calculatedStatus).toBe('NORMAL');

    // 3. Unparseable range
    const unparseable = interpretReferenceRange('14.0', 'corrupted!uninterpretable-range-token');
    expect(unparseable.rangeType).toBe('UNPARSEABLE');
    expect(unparseable.calculatedStatus).toBe('UNKNOWN');
  });

  // Test 19: Retaining warnings for genuine unresolved measurement candidates while ignoring disclaimers
  it('19. should retain warnings for genuine unresolved measurement candidates while ignoring disclaimers', () => {
    const mixedText = `
Patient ID: SYN-PT-9021 | Specimen: Whole Blood, Serum, Urine
Collection Date: 2026-10-23 09:30 AM | Status: Final Report
All reference intervals reflect normal values for adult fasting individuals.
Clinical interpretation belongs to a qualified professional.
Hemoglobin 13.5 g/dL 12.0 - 16.0 NORMAL
CorruptedMeasurementLineThatCannotBeParsedIntoTokens 999 ???
    `;
    const res = extractMeasurementsFromText(mixedText);
    expect(res.findings.length).toBe(1); // Only Hemoglobin is parsed
    expect(res.completeness.unresolvedCount).toBe(1); // Only the genuine corrupted line is reported
    expect(res.completeness.unresolvedItems[0].line).toContain('CorruptedMeasurementLineThatCannotBeParsedIntoTokens');
  });

  // Test 20: Handling hyphenated urinalysis findings in single space
  it('20. should parse hyphenated microscopic urinalysis values and ranges consistently in single-space format', () => {
    const singleSpaceLines = `
URINALYSIS
Pus Cells (WBC) 0-2 /HPF 0 - 5 NORMAL
RBC 0-2 /HPF 0 - 2 NORMAL
Specific Gravity 1.015 1.005 - 1.030 NORMAL
pH 6.0 5.0 - 8.0 NORMAL
    `;
    const res = extractMeasurementsFromText(singleSpaceLines);
    expect(res.findings.length).toBe(4);

    const pusCells = res.findings.find((f) => f.testName.includes('Pus Cells'));
    expect(pusCells).toBeDefined();
    expect(pusCells?.originalValue).toBe('0-2');
    expect(pusCells?.unit).toBe('/HPF');
    expect(pusCells?.referenceRange).toBe('0 - 5');
    expect(pusCells?.rangeLow).toBe(0);
    expect(pusCells?.rangeHigh).toBe(5);

    const rbc = res.findings.find((f) => f.testName === 'RBC');
    expect(rbc).toBeDefined();
    expect(rbc?.originalValue).toBe('0-2');
    expect(rbc?.unit).toBe('/HPF');
    expect(rbc?.referenceRange).toBe('0 - 2');
    expect(rbc?.rangeLow).toBe(0);
    expect(rbc?.rangeHigh).toBe(2);
  });
});
