import { describe, it, expect } from 'vitest';
import { SYNTHETIC_BENCHMARKS } from '../src/data/syntheticReports';
import { auditFactualConsistency, evaluateFindingFlag } from '../src/lib/consistencyChecker';
import { parseRawReportText } from '../src/lib/simplificationEngine';
import { validateUploadFile, MAX_FILE_SIZE_BYTES } from '../src/lib/fileProcessor';

describe('MEDUCID Factual-Consistency Test Suite', () => {
  describe('Benchmark Dataset Verification', () => {
    it.each(SYNTHETIC_BENCHMARKS)(
      'should achieve 100% factual consistency score on $title',
      (report) => {
        const audit = auditFactualConsistency(report);
        expect(audit.passed).toBe(true);
        expect(audit.score).toBe(100);

        for (const check of audit.checks) {
          expect(check.status).toBe('pass');
        }
      }
    );

    it('should verify rendered name, value, unit, and range equal source strings character for character in CMP', () => {
      const cmp = SYNTHETIC_BENCHMARKS.find((r) => r.id === 'cmp-01')!;
      for (const finding of cmp.findings) {
        expect(cmp.rawText).toContain(finding.testName);
        expect(cmp.rawText).toContain(finding.originalValue);
        expect(cmp.rawText).toContain(finding.unit);
      }
    });

    it('should verify exact preservation of all units in raw text for CBC', () => {
      const cbc = SYNTHETIC_BENCHMARKS.find((r) => r.id === 'cbc-02')!;
      for (const finding of cbc.findings) {
        if (finding.unit && finding.unit !== 'ratio') {
          expect(cbc.rawText).toContain(finding.unit);
        }
      }
    });

    it('should verify every extracted string is found verbatim in the source across all benchmarks', () => {
      for (const report of SYNTHETIC_BENCHMARKS) {
        for (const finding of report.findings) {
          expect(report.rawText).toContain(finding.originalValue);
          if (finding.unit && finding.unit !== 'ratio') {
            expect(report.rawText).toContain(finding.unit);
          }
        }
      }
    });
  });

  describe('Count Consistency: Three-Bucket Sum Assertion', () => {
    it.each(SYNTHETIC_BENCHMARKS)(
      'should assert buckets sum to totalTests on $title',
      (report) => {
        const { totalTests, outOfRangeCount, withinRangeCount, noNumericRangeCount } = report.summary;
        
        // Assert every row is in exactly one bucket and sum equals totalTests
        expect(outOfRangeCount + withinRangeCount + noNumericRangeCount).toBe(totalTests);

        // Verify each individual finding falls into exactly one bucket
        let countOutside = 0;
        let countWithin = 0;
        let countNoNumeric = 0;

        for (const f of report.findings) {
          const isNumeric = f.rangeLow !== null || f.rangeHigh !== null;
          if (f.flag === 'HIGH' || f.flag === 'LOW') {
            countOutside++;
          } else if (f.flag === 'NORMAL' && isNumeric) {
            countWithin++;
          } else {
            countNoNumeric++;
          }
        }

        expect(countOutside).toBe(outOfRangeCount);
        expect(countWithin).toBe(withinRangeCount);
        expect(countNoNumeric).toBe(noNumericRangeCount);
        expect(countOutside + countWithin + countNoNumeric).toBe(report.findings.length);
      }
    );

    it('should assert buckets sum to totalTests on dynamic parsed report with mixed numeric and non-numeric ranges', () => {
      const sampleText = `
TEST                         RESULT     UNIT       REFERENCE RANGE   FLAG
-------------------------------------------------------------------------
Glucose, Fasting             118        mg/dL      70 - 99           HIGH
Serum Creatinine             0.9        mg/dL      0.6 - 1.2         NORMAL
Urine Blood                  Negative   null       Negative          NORMAL
      `;
      const parsed = parseRawReportText(sampleText, 'Uploaded Report');
      const { totalTests, outOfRangeCount, withinRangeCount, noNumericRangeCount } = parsed.summary;
      
      expect(totalTests).toBe(3);
      expect(outOfRangeCount).toBe(1); // Glucose (HIGH)
      expect(withinRangeCount).toBe(1); // Creatinine (NORMAL with numeric range)
      expect(noNumericRangeCount).toBe(1); // Urine Blood (Negative has no numeric range)
      expect(outOfRangeCount + withinRangeCount + noNumericRangeCount).toBe(totalTests);
    });
  });

  describe('Strict Banned-Phrase Guardrails', () => {
    it('should assert zero occurrences of banned words (allergic, infection, parasitic, caused by, indicates, suggests, deficiency, disease, etc.) in all explanations, summaries, and questions', () => {
      const bannedWords = [
        /\ballergic\b/i,
        /\ballergy\b/i,
        /\binfection\b/i,
        /\bparasitic\b/i,
        /\bcaused by\b/i,
        /\bindicates\b/i,
        /\bsuggests\b/i,
        /\bdeficiency\b/i,
        /\bdisease\b/i,
        /\billness\b/i,
        /\bcondition\b/i,
        /\bsymptom\b/i,
        /\bdiagnos/i,
        /\bdisorder\b/i,
        /\bsyndrome\b/i,
        /\btreatment\b/i,
      ];

      for (const report of SYNTHETIC_BENCHMARKS) {
        const corpus = [
          report.summary.overview,
          report.summary.keyTakeaway,
          ...report.findings.map((f) => `${f.plainExplanation} ${f.clinicalContext}`),
          ...report.clinicianQuestions,
        ].join(' ');

        for (const pattern of bannedWords) {
          const match = corpus.match(pattern);
          expect(match, `Banned phrase "${pattern}" found in corpus: ${match?.[0]}`).toBeNull();
        }
      }
    });

    it('should detect and fail if an artificial diagnostic claim is introduced', () => {
      const baseReport = JSON.parse(JSON.stringify(SYNTHETIC_BENCHMARKS[0]));
      baseReport.summary.keyTakeaway = 'This confirms you have kidney disease.';

      const audit = auditFactualConsistency(baseReport);
      const guardCheck = audit.checks.find((c) => c.id === 'diagnostic-safeguard');

      expect(guardCheck?.status).toBe('fail');
      expect(audit.score).toBeLessThan(100);
    });
  });

  describe('Value Preservation Tamper Detection', () => {
    it('should catch hallucinated or modified numerical values', () => {
      const baseReport = JSON.parse(JSON.stringify(SYNTHETIC_BENCHMARKS[0]));
      baseReport.findings[0].originalValue = '999.99'; // absent from raw text

      const audit = auditFactualConsistency(baseReport);
      const valCheck = audit.checks.find((c) => c.id === 'val-preservation');

      expect(valCheck?.status).toBe('fail');
      expect(audit.score).toBeLessThan(100);
    });

    it('should pass if user explicitly corrected the extraction error', () => {
      const baseReport = JSON.parse(JSON.stringify(SYNTHETIC_BENCHMARKS[0]));
      baseReport.findings[0].originalValue = '999.99';
      baseReport.findings[0].userModified = true;

      const audit = auditFactualConsistency(baseReport);
      const valCheck = audit.checks.find((c) => c.id === 'val-preservation');

      expect(valCheck?.status).toBe('pass');
    });
  });

  describe('Upload Validation Suite', () => {
    it('should reject empty files with 0 bytes', () => {
      const emptyFile = new File([], 'empty_lab.txt', { type: 'text/plain' });
      const res = validateUploadFile(emptyFile);
      expect(res.valid).toBe(false);
      expect(res.error).toContain('empty');
    });

    it('should reject files exceeding the 10 MB limit', () => {
      // Simulate file exceeding 10MB
      const largeFile = {
        name: 'huge_scan.pdf',
        size: MAX_FILE_SIZE_BYTES + 1024,
      } as File;
      const res = validateUploadFile(largeFile);
      expect(res.valid).toBe(false);
      expect(res.error).toContain('10 MB');
    });

    it('should reject unsupported file formats', () => {
      const exeFile = new File(['binary'], 'virus.exe', { type: 'application/x-msdownload' });
      const res = validateUploadFile(exeFile);
      expect(res.valid).toBe(false);
      expect(res.error).toContain('Unsupported');
    });

    it('should accept valid PDF, TXT, DOCX, and image formats', () => {
      const txt = new File(['Glucose 100 mg/dL'], 'report.txt', { type: 'text/plain' });
      const pdf = new File(['%PDF-1.4'], 'report.pdf', { type: 'application/pdf' });
      const png = new File(['pngdata'], 'scan.png', { type: 'image/png' });
      const docx = new File(['docxdata'], 'doc.docx', { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });

      expect(validateUploadFile(txt).valid).toBe(true);
      expect(validateUploadFile(pdf).valid).toBe(true);
      expect(validateUploadFile(png).valid).toBe(true);
      expect(validateUploadFile(docx).valid).toBe(true);
    });
  });

  describe('End-to-End TXT and Pasted-Text Flow', () => {
    it('should parse custom raw laboratory text and calculate correct flags', () => {
      const customLabText = `
TEST                         RESULT     UNIT       REFERENCE RANGE   FLAG
-------------------------------------------------------------------------
Glucose, Fasting             130        mg/dL      70 - 99           HIGH
Serum Creatinine             0.9        mg/dL      0.6 - 1.2         NORMAL
Potassium                    3.1        mmol/L     3.5 - 5.1         LOW
      `;

      const parsed = parseRawReportText(customLabText, 'Pasted Report');
      expect(parsed.findings.length).toBe(3);

      const glucose = parsed.findings.find((f) => f.testName.includes('Glucose'));
      expect(glucose?.originalValue).toBe('130');
      expect(glucose?.unit).toBe('mg/dL');
      expect(glucose?.flag).toBe('HIGH');

      const creatinine = parsed.findings.find((f) => f.testName.includes('Creatinine'));
      expect(creatinine?.originalValue).toBe('0.9');
      expect(creatinine?.flag).toBe('NORMAL');

      const potassium = parsed.findings.find((f) => f.testName.includes('Potassium'));
      expect(potassium?.originalValue).toBe('3.1');
      expect(potassium?.flag).toBe('LOW');

      // Check consistency audit passes
      const audit = auditFactualConsistency(parsed);
      expect(audit.passed).toBe(true);
      expect(audit.score).toBe(100);
    });

    it('should strictly flag numeric ranges without diagnosing causes', () => {
      expect(evaluateFindingFlag(120, 70, 99)).toBe('HIGH');
      expect(evaluateFindingFlag(60, 70, 99)).toBe('LOW');
      expect(evaluateFindingFlag(85, 70, 99)).toBe('NORMAL');
      expect(evaluateFindingFlag(null, 70, 99)).toBe('INCONCLUSIVE');
    });
  });
});
