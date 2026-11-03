import { describe, it, expect } from 'vitest';
import { generateSimplifiedReportPdf } from '../src/lib/pdfReportGenerator';
import { SimplifiedReport, MedicalFinding } from '../src/types/report';

const mockFindings: MedicalFinding[] = [
  {
    id: 'f1',
    testName: 'Hemoglobin',
    simplifiedName: 'Oxygen-carrying protein in red blood cells',
    category: 'Complete Blood Count (CBC)',
    originalValue: '10.8',
    unit: 'g/dL',
    referenceRange: '12.0–15.5',
    numericValue: 10.8,
    rangeLow: 12.0,
    rangeHigh: 15.5,
    flag: 'LOW',
    plainExplanation: 'The oxygen-transporting protein present within red blood cells.',
    clinicalContext: 'Below reference range.',
    sourceSpan: 'Hemoglobin 10.8 g/dL 12.0–15.5',
  },
  {
    id: 'f2',
    testName: 'WBC count',
    simplifiedName: 'White blood cell concentration',
    category: 'Complete Blood Count (CBC)',
    originalValue: '12.4',
    unit: '10³/μL',
    referenceRange: '4.0–11.0',
    numericValue: 12.4,
    rangeLow: 4.0,
    rangeHigh: 11.0,
    flag: 'HIGH',
    plainExplanation: 'A laboratory measurement of WBC count in the submitted specimen.',
    clinicalContext: 'Above reference range.',
    sourceSpan: 'WBC count 12.4 10³/μL 4.0–11.0',
  },
  {
    id: 'f3',
    testName: 'Platelet count',
    simplifiedName: 'Blood clotting cells',
    category: 'Complete Blood Count (CBC)',
    originalValue: '275',
    unit: '10³/μL',
    referenceRange: '150–450',
    numericValue: 275,
    rangeLow: 150,
    rangeHigh: 450,
    flag: 'NORMAL',
    plainExplanation: 'Cells that help your blood clot normally.',
    clinicalContext: 'Within reference range.',
    sourceSpan: 'Platelet count 275 10³/μL 150–450',
  },
  {
    id: 'f4',
    testName: 'Fasting glucose',
    simplifiedName: 'Blood sugar level',
    category: 'Basic Metabolic Panel',
    originalValue: '108',
    unit: 'mg/dL',
    referenceRange: '70–99',
    numericValue: 108,
    rangeLow: 70,
    rangeHigh: 99,
    flag: 'HIGH',
    plainExplanation: 'Energy supply sugar in your bloodstream.',
    clinicalContext: 'Above reference range.',
    sourceSpan: 'Fasting glucose 108 mg/dL 70–99',
  },
];

const mockReport: SimplifiedReport = {
  id: 'rep-test-01',
  title: 'sample_report.pdf',
  panelCategory: 'Complete Blood Count & Metabolic Panel',
  patientDeidentifiedId: 'SMP-31957',
  collectionDate: '03 Nov 2026',
  labName: 'Northstar Diagnostics',
  rawText: 'Hemoglobin 10.8 g/dL 12.0–15.5\nWBC count 12.4 10³/μL 4.0–11.0\nPlatelet count 275 10³/μL 150–450\nFasting glucose 108 mg/dL 70–99',
  findings: mockFindings,
  summary: {
    overview: 'This report contains 4 extracted measurements. 3 values with printed numeric ranges are outside them, and 1 is within range. Clinical interpretation belongs to a qualified professional.',
    totalTests: 4,
    outOfRangeCount: 3,
    withinRangeCount: 1,
    noNumericRangeCount: 0,
    totalWithNumericRange: 4,
    keyTakeaway: '3 values outside reference ranges require clinician review.',
  },
  clinicianQuestions: [
    'My Hemoglobin is 10.8 g/dL (reference range 12.0–15.5). What might be causing this lower level?',
    'My WBC count is 12.4 10³/μL (reference range 4.0–11.0). Does this indicate an active inflammatory response?',
    'My Fasting glucose is 108 mg/dL (reference range 70–99). Do you recommend further HbA1c testing?',
  ],
  factualConsistency: {
    passed: true,
    score: 100,
    verifiedAt: new Date().toISOString(),
    checks: [
      { id: 'c1', title: 'Verbatim Match', status: 'pass', details: 'All 4 values verified verbatim.' },
    ],
  },
  extractionCompleteness: {
    sourceMeasurementsIdentified: 4,
    successfullyParsed: 4,
    unresolvedCount: 0,
    unresolvedItems: [],
    coveragePercentage: 100,
    completenessStatus: 'COMPLETE',
    completenessNote: '100% extracted.',
  },
};

describe('Simplified Report PDF Generator', () => {
  it('generates a valid multi-page PDF document with Overview, Results, and Questions', () => {
    const doc = generateSimplifiedReportPdf(mockReport, {
      fileName: 'northstar_sample.pdf',
    });

    expect(doc).toBeDefined();
    // At least 3 pages (Page 1: Overview, Page 2: All Results, Page 3: Questions)
    const pageCount = doc.getNumberOfPages();
    expect(pageCount).toBeGreaterThanOrEqual(3);

    // Verify it exports to binary/buffer without throwing
    const arrayBuffer = doc.output('arraybuffer');
    expect(arrayBuffer.byteLength).toBeGreaterThan(1000);
  });

  it('handles reports with zero out-of-range findings gracefully', () => {
    const normalReport: SimplifiedReport = {
      ...mockReport,
      findings: mockReport.findings.map((f) => ({ ...f, flag: 'NORMAL' })),
      summary: {
        ...mockReport.summary,
        outOfRangeCount: 0,
        withinRangeCount: 4,
      },
      clinicianQuestions: [],
    };

    const doc = generateSimplifiedReportPdf(normalReport);
    expect(doc.getNumberOfPages()).toBeGreaterThanOrEqual(3);
  });
});
