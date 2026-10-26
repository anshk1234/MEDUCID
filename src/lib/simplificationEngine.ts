import { SimplifiedReport, MedicalFinding } from '@/types/report';
import { auditFactualConsistency, evaluateFindingFlag } from './consistencyChecker';
import { extractMeasurementsFromText } from './documentExtractor';

interface DictionaryEntry {
  simplifiedName: string;
  category: string;
  plainExplanation: string;
  clinicalContextHigh: string;
  clinicalContextLow: string;
  clinicalContextNormal: string;
  suggestedQuestion: string;
}

export const MEDICAL_LEXICON: Record<string, DictionaryEntry> = {
  glucose: {
    simplifiedName: 'Fasting Blood Sugar',
    category: 'Blood Sugar & Metabolism',
    plainExplanation: 'A simple sugar circulating in the blood that acts as a cellular energy source.',
    clinicalContextHigh: 'Above the reference range printed on this report.',
    clinicalContextLow: 'Below the reference range printed on this report.',
    clinicalContextNormal: 'Within the reference range printed on this report.',
    suggestedQuestion: 'What is the standard protocol for reviewing this result?',
  },
  creatinine: {
    simplifiedName: 'Serum Creatinine',
    category: 'Kidney Function',
    plainExplanation: 'A chemical byproduct of muscle metabolism filtered out by the kidneys.',
    clinicalContextHigh: 'Above the reference range printed on this report.',
    clinicalContextLow: 'Below the reference range printed on this report.',
    clinicalContextNormal: 'Within the reference range printed on this report.',
    suggestedQuestion: 'Should any repeat blood collection be scheduled for this value?',
  },
  bun: {
    simplifiedName: 'Blood Urea Nitrogen',
    category: 'Kidney Function',
    plainExplanation: 'A nitrogen-containing byproduct of protein breakdown in the blood.',
    clinicalContextHigh: 'Above the reference range printed on this report.',
    clinicalContextLow: 'Below the reference range printed on this report.',
    clinicalContextNormal: 'Within the reference range printed on this report.',
    suggestedQuestion: 'What is the standard protocol for reviewing this result?',
  },
  egfr: {
    simplifiedName: 'Estimated Filtration Rate',
    category: 'Kidney Function',
    plainExplanation: 'A calculated estimate of the volume of blood filtered by the kidneys per minute.',
    clinicalContextHigh: 'Above the reference range printed on this report.',
    clinicalContextLow: 'Below the reference range printed on this report.',
    clinicalContextNormal: 'Within the reference range printed on this report.',
    suggestedQuestion: 'Should any repeat blood collection be scheduled for this value?',
  },
  sodium: {
    simplifiedName: 'Sodium Electrolyte',
    category: 'Electrolytes & Fluid Balance',
    plainExplanation: 'A mineral electrolyte present in the blood serum.',
    clinicalContextHigh: 'Above the reference range printed on this report.',
    clinicalContextLow: 'Below the reference range printed on this report.',
    clinicalContextNormal: 'Within the reference range printed on this report.',
    suggestedQuestion: 'What is the standard protocol for reviewing this result?',
  },
  potassium: {
    simplifiedName: 'Potassium Electrolyte',
    category: 'Electrolytes & Fluid Balance',
    plainExplanation: 'A mineral electrolyte present in the blood serum.',
    clinicalContextHigh: 'Above the reference range printed on this report.',
    clinicalContextLow: 'Below the reference range printed on this report.',
    clinicalContextNormal: 'Within the reference range printed on this report.',
    suggestedQuestion: 'What is the standard protocol for reviewing this result?',
  },
  calcium: {
    simplifiedName: 'Total Calcium',
    category: 'Bone & Mineral Health',
    plainExplanation: 'A mineral element present in the blood serum.',
    clinicalContextHigh: 'Above the reference range printed on this report.',
    clinicalContextLow: 'Below the reference range printed on this report.',
    clinicalContextNormal: 'Within the reference range printed on this report.',
    suggestedQuestion: 'What is the standard protocol for reviewing this result?',
  },
  hemoglobin: {
    simplifiedName: 'Hemoglobin Protein',
    category: 'Red Blood Cells & Oxygen',
    plainExplanation: 'The oxygen-transporting protein present within red blood cells.',
    clinicalContextHigh: 'Above the reference range printed on this report.',
    clinicalContextLow: 'Below the reference range printed on this report.',
    clinicalContextNormal: 'Within the reference range printed on this report.',
    suggestedQuestion: 'What is the standard protocol for reviewing this result?',
  },
  hematocrit: {
    simplifiedName: 'Hematocrit Percentage',
    category: 'Red Blood Cells & Oxygen',
    plainExplanation: 'The percentage of total blood volume composed of red blood cells.',
    clinicalContextHigh: 'Above the reference range printed on this report.',
    clinicalContextLow: 'Below the reference range printed on this report.',
    clinicalContextNormal: 'Within the reference range printed on this report.',
    suggestedQuestion: 'What is the standard protocol for reviewing this result?',
  },
  platelet: {
    simplifiedName: 'Platelet Count',
    category: 'Clotting & Hemostasis',
    plainExplanation: 'A cellular blood component involved in blood clot formation.',
    clinicalContextHigh: 'Above the reference range printed on this report.',
    clinicalContextLow: 'Below the reference range printed on this report.',
    clinicalContextNormal: 'Within the reference range printed on this report.',
    suggestedQuestion: 'What is the standard protocol for reviewing this result?',
  },
  eosinophil: {
    simplifiedName: 'Eosinophils',
    category: 'Immune Cells',
    plainExplanation: 'A type of white blood cell.',
    clinicalContextHigh: 'Above the reference range printed on this report.',
    clinicalContextLow: 'Below the reference range printed on this report.',
    clinicalContextNormal: 'Within the reference range printed on this report.',
    suggestedQuestion: 'What is the standard protocol for reviewing this result?',
  },
  basophil: {
    simplifiedName: 'Basophils',
    category: 'Immune Cells',
    plainExplanation: 'A type of white blood cell.',
    clinicalContextHigh: 'Above the reference range printed on this report.',
    clinicalContextLow: 'Below the reference range printed on this report.',
    clinicalContextNormal: 'Within the reference range printed on this report.',
    suggestedQuestion: 'What is the standard protocol for reviewing this result?',
  },
  neutrophil: {
    simplifiedName: 'Neutrophils',
    category: 'Immune Cells',
    plainExplanation: 'A type of white blood cell.',
    clinicalContextHigh: 'Above the reference range printed on this report.',
    clinicalContextLow: 'Below the reference range printed on this report.',
    clinicalContextNormal: 'Within the reference range printed on this report.',
    suggestedQuestion: 'What is the standard protocol for reviewing this result?',
  },
  lymphocyte: {
    simplifiedName: 'Lymphocytes',
    category: 'Immune Cells',
    plainExplanation: 'A type of white blood cell.',
    clinicalContextHigh: 'Above the reference range printed on this report.',
    clinicalContextLow: 'Below the reference range printed on this report.',
    clinicalContextNormal: 'Within the reference range printed on this report.',
    suggestedQuestion: 'What is the standard protocol for reviewing this result?',
  },
  monocyte: {
    simplifiedName: 'Monocytes',
    category: 'Immune Cells',
    plainExplanation: 'A type of white blood cell.',
    clinicalContextHigh: 'Above the reference range printed on this report.',
    clinicalContextLow: 'Below the reference range printed on this report.',
    clinicalContextNormal: 'Within the reference range printed on this report.',
    suggestedQuestion: 'What is the standard protocol for reviewing this result?',
  },
  cholesterol: {
    simplifiedName: 'Total Cholesterol',
    category: 'Cardiovascular & Lipids',
    plainExplanation: 'A lipid molecule present in the blood circulation.',
    clinicalContextHigh: 'Above the reference range printed on this report.',
    clinicalContextLow: 'Below the reference range printed on this report.',
    clinicalContextNormal: 'Within the reference range printed on this report.',
    suggestedQuestion: 'What is the standard protocol for reviewing this result?',
  },
  ldl: {
    simplifiedName: 'LDL Cholesterol',
    category: 'Cardiovascular & Lipids',
    plainExplanation: 'A lipoprotein particle that transports cholesterol in the blood.',
    clinicalContextHigh: 'Above the reference range printed on this report.',
    clinicalContextLow: 'Below the reference range printed on this report.',
    clinicalContextNormal: 'Within the reference range printed on this report.',
    suggestedQuestion: 'What is the standard protocol for reviewing this result?',
  },
  hdl: {
    simplifiedName: 'HDL Cholesterol',
    category: 'Cardiovascular & Lipids',
    plainExplanation: 'A lipoprotein particle that transports cholesterol in the blood.',
    clinicalContextHigh: 'Above the reference range printed on this report.',
    clinicalContextLow: 'Below the reference range printed on this report.',
    clinicalContextNormal: 'Within the reference range printed on this report.',
    suggestedQuestion: 'What is the standard protocol for reviewing this result?',
  },
  triglycerides: {
    simplifiedName: 'Triglycerides',
    category: 'Cardiovascular & Lipids',
    plainExplanation: 'A class of lipid molecules circulating in the blood.',
    clinicalContextHigh: 'Above the reference range printed on this report.',
    clinicalContextLow: 'Below the reference range printed on this report.',
    clinicalContextNormal: 'Within the reference range printed on this report.',
    suggestedQuestion: 'What is the standard protocol for reviewing this result?',
  },
  tsh: {
    simplifiedName: 'Thyroid Stimulating Hormone',
    category: 'Thyroid Function',
    plainExplanation: 'A hormone produced by the pituitary gland.',
    clinicalContextHigh: 'Above the reference range printed on this report.',
    clinicalContextLow: 'Below the reference range printed on this report.',
    clinicalContextNormal: 'Within the reference range printed on this report.',
    suggestedQuestion: 'What is the standard protocol for reviewing this result?',
  },
};

/**
 * Searches our lexicon for the best clinical match for an arbitrary test name
 */
export function lookupMedicalConcept(testName: string): DictionaryEntry {
  const clean = testName.toLowerCase();
  for (const [key, entry] of Object.entries(MEDICAL_LEXICON)) {
    if (clean.includes(key)) {
      return entry;
    }
  }

  return {
    simplifiedName: testName,
    category: 'General Laboratory Measurement',
    plainExplanation: `A laboratory measurement of ${testName} in the submitted specimen.`,
    clinicalContextHigh: 'Above the reference range printed on this report.',
    clinicalContextLow: 'Below the reference range printed on this report.',
    clinicalContextNormal: 'Within the reference range printed on this report.',
    suggestedQuestion: 'What is the standard protocol for reviewing this result?',
  };
}

/**
 * Parses free-form text lab report lines into structured MedicalFinding entries
 */
export function parseRawReportText(rawText: string, reportTitle = 'Custom Laboratory Report'): SimplifiedReport {
  const extraction = extractMeasurementsFromText(rawText);
  const findings = extraction.findings;

  const summaryData = formatStrictSummary(findings);
  const clinicianQuestions = generateStrictNeutralQuestions(findings);

  const report: SimplifiedReport = {
    id: `custom-${Date.now()}`,
    title: reportTitle,
    panelCategory:
      extraction.detectedSections.length > 0
        ? extraction.detectedSections.join(', ')
        : 'Clinical Laboratory Report',
    patientDeidentifiedId: 'SYN-PT-USER',
    collectionDate: new Date().toLocaleDateString(),
    labName: 'Clinical Diagnostic Report',
    rawText,
    findings,
    summary: summaryData,
    clinicianQuestions,
    extractionCompleteness: extraction.completeness,
    factualConsistency: {
      passed: true,
      score: 100,
      verifiedAt: new Date().toISOString(),
      checks: [],
    },
  };

  report.factualConsistency = auditFactualConsistency(report);
  return report;
}

/**
 * Formats a 3-4 sentence neutral summary listing out-of-range findings with zero interpretation
 */
export function formatStrictSummary(findings: MedicalFinding[]): {
  overview: string;
  totalTests: number;
  outOfRangeCount: number;
  withinRangeCount: number;
  noNumericRangeCount: number;
  totalWithNumericRange: number;
  keyTakeaway: string;
} {
  const totalTests = findings.length;
  
  // Exactly 3 mutually exclusive buckets summing to totalTests
  const outsideRange = findings.filter((f) => f.flag === 'HIGH' || f.flag === 'LOW');
  const withinRange = findings.filter(
    (f) => f.flag === 'NORMAL' && (f.rangeLow !== null || f.rangeHigh !== null)
  );
  const noNumericRange = findings.filter(
    (f) =>
      (f.flag !== 'HIGH' && f.flag !== 'LOW' && f.flag !== 'NORMAL') ||
      (f.flag === 'NORMAL' && f.rangeLow === null && f.rangeHigh === null)
  );

  const outsideRangeCount = outsideRange.length;
  const withinRangeCount = withinRange.length;
  const noNumericRangeCount = noNumericRange.length;
  const totalWithNumericRange = outsideRangeCount + withinRangeCount;

  let outList = '';
  if (outsideRangeCount > 0) {
    outList = outsideRange
      .map((f) => `${f.testName} (${f.originalValue} ${f.unit}; range ${f.referenceRange})`)
      .join(', ');
  }

  const sentence1 = `This report contains ${totalTests} extracted measurements.`;
  const sentence2 = outsideRangeCount > 0
    ? `${outsideRangeCount} of ${totalWithNumericRange} values with a printed numeric range are outside it: ${outList}.`
    : `All ${totalWithNumericRange} values with a printed numeric range are within it.`;
  const sentence3 = `${withinRangeCount} values are within their printed numeric ranges, and ${noNumericRangeCount} have no numeric range printed.`;
  const sentence4 = `Clinical interpretation belongs to a qualified professional.`;

  const overview = `${sentence1} ${sentence2} ${sentence3} ${sentence4}`;
  const keyTakeaway = `${outsideRangeCount} of ${totalWithNumericRange} values with a printed numeric range are outside it (${noNumericRangeCount} have no numeric range).`;

  return {
    overview,
    totalTests,
    outOfRangeCount: outsideRangeCount,
    withinRangeCount,
    noNumericRangeCount,
    totalWithNumericRange,
    keyTakeaway,
  };
}

/**
 * Generates neutral, factual questions for a clinician strictly referencing report values
 */
export function generateStrictNeutralQuestions(findings: MedicalFinding[]): string[] {
  const outOfRange = findings.filter((f) => f.flag === 'HIGH' || f.flag === 'LOW');
  const questions: string[] = [];

  for (const f of outOfRange) {
    const relation = f.flag === 'HIGH' ? 'above' : 'below';
    questions.push(
      `On this report, ${f.testName} was recorded as ${f.originalValue} ${f.unit}, which is ${relation} the reference range printed on this report (${f.referenceRange}). What is the standard protocol for reviewing this result?`
    );
  }

  questions.push('Should any repeat blood collection be scheduled for the values outside the printed reference range?');
  questions.push('Are there standard collection variables (such as fasting time or time of day) that apply to these results?');
  questions.push('How do these results compare with prior laboratory records on file?');

  return questions.slice(0, 6);
}
