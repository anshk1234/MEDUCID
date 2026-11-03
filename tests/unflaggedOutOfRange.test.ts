import { describe, it, expect } from 'vitest';
import { extractMeasurementsFromText } from '../src/lib/documentExtractor';
import { formatStrictSummary } from '../src/lib/simplificationEngine';
import { interpretReferenceRange } from '../src/lib/rangeInterpreter';

const NORTHSTAR_REPORT_TEXT = `
NORTHSTAR DIAGNOSTICS
Clinical Laboratory Report | FICTIONAL SOFTWARE-TESTING SAMPLE
Patient name   Taylor Reed (Fictional)   Patient ID   SMP-31957
Age / Sex   34 years / Female   Collected   03 Nov 2026, 08:05
Referring clinician   Dr. Sample Physician   Reported   03 Nov 2026, 13:10
Specimen   Whole blood / Serum   Report status   Final (sample)

Complete Blood Count (CBC)
Test   Result   Unit   Reference range
Hemoglobin   10.8   g/dL   12.0–15.5
RBC count   3.7   million/μL   3.8–5.2
Hematocrit   34.0   %   36–46
MCV   78.0   fL   80–100
MCH   28.5   pg   27–33
MCHC   33.0   g/dL   32–36
WBC count   12.4   10³/μL   4.0–11.0
Neutrophils   74   %   40–70
Lymphocytes   18   %   20–40
Monocytes   6   %   2–8
Eosinophils   2   %   1–6
Basophils   1   %   0–2
Platelet count   275   10³/μL   150–450

Basic Metabolic Panel
Test   Result   Unit   Reference range
Fasting glucose   108   mg/dL   70–99
Blood urea nitrogen   15   mg/dL   7–20
Creatinine   0.9   mg/dL   0.6–1.1
Sodium   140   mmol/L   135–145
Potassium   4.2   mmol/L   3.5–5.1
Chloride   102   mmol/L   98–107
Calcium   9.4   mg/dL   8.6–10.2

Laboratory Comment
Results are reported as measured. This sample report does not include high/low flags, abnormal markers, or interpretive comments for individual results. Compare each result with the reference interval shown.
`;

describe('Unflagged Report with En-Dash Out-Of-Range Values', () => {
  it('correctly interprets en-dash reference ranges individually', () => {
    expect(interpretReferenceRange('10.8', '12.0–15.5').flag).toBe('LOW');
    expect(interpretReferenceRange('3.7', '3.8–5.2').flag).toBe('LOW');
    expect(interpretReferenceRange('34.0', '36–46').flag).toBe('LOW');
    expect(interpretReferenceRange('78.0', '80–100').flag).toBe('LOW');
    expect(interpretReferenceRange('18', '20–40').flag).toBe('LOW');

    expect(interpretReferenceRange('12.4', '4.0–11.0').flag).toBe('HIGH');
    expect(interpretReferenceRange('74', '40–70').flag).toBe('HIGH');
    expect(interpretReferenceRange('108', '70–99').flag).toBe('HIGH');

    expect(interpretReferenceRange('28.5', '27–33').flag).toBe('NORMAL');
    expect(interpretReferenceRange('33.0', '32–36').flag).toBe('NORMAL');
    expect(interpretReferenceRange('275', '150–450').flag).toBe('NORMAL');
    expect(interpretReferenceRange('15', '7–20').flag).toBe('NORMAL');
    expect(interpretReferenceRange('0.9', '0.6–1.1').flag).toBe('NORMAL');
    expect(interpretReferenceRange('140', '135–145').flag).toBe('NORMAL');
    expect(interpretReferenceRange('4.2', '3.5–5.1').flag).toBe('NORMAL');
    expect(interpretReferenceRange('102', '98–107').flag).toBe('NORMAL');
    expect(interpretReferenceRange('9.4', '8.6–10.2').flag).toBe('NORMAL');
  });

  it('extracts all measurements and identifies exactly 8 out-of-range biomarkers (5 LOW, 3 HIGH)', () => {
    const extraction = extractMeasurementsFromText(NORTHSTAR_REPORT_TEXT);
    console.log('EXTRACTED TEST NAMES:', extraction.findings.map(f => f.testName));

    const lowFindings = extraction.findings.filter((f) => f.flag === 'LOW');
    const highFindings = extraction.findings.filter((f) => f.flag === 'HIGH');
    const normalFindings = extraction.findings.filter((f) => f.flag === 'NORMAL');

    expect(lowFindings.length).toBe(5);
    expect(highFindings.length).toBe(3);
    expect(normalFindings.length).toBe(12);

    // Verify 5 LOW tests
    const lowNames = lowFindings.map((f) => f.testName);
    expect(lowNames).toContain('Hemoglobin');
    expect(lowNames).toContain('RBC count');
    expect(lowNames).toContain('Hematocrit');
    expect(lowNames).toContain('MCV');
    expect(lowNames).toContain('Lymphocytes');

    // Verify 3 HIGH tests
    const highNames = highFindings.map((f) => f.testName);
    expect(highNames).toContain('WBC count');
    expect(highNames).toContain('Neutrophils');
    expect(highNames).toContain('Fasting glucose');

    const summary = formatStrictSummary(extraction.findings);
    expect(summary.totalWithNumericRange).toBe(20);
    expect(summary.outOfRangeCount).toBe(8);
    expect(summary.withinRangeCount).toBe(12);
  });
});
