import { describe, it, expect } from 'vitest';
import {
  scoreDocumentStructure,
  validateMedicalReportStructure,
  validateMagicBytes,
  GATEKEEPER_REJECTION_MESSAGE,
  MINIMUM_STRUCTURED_LAB_ROWS,
} from '../src/lib/documentGatekeeper';

describe('Document Gatekeeper Engine', () => {
  it('ACCEPTs authentic Complete Blood Count (CBC) report text', () => {
    const cbcReport = `
      METROPOLITAN CLINICAL LABORATORIES
      Patient: Jane Doe    Age: 38    Specimen ID: LAB-9921
      Collection Date: 2026-03-12    Reference Range: Standard

      TEST NAME              RESULT    UNIT       REFERENCE RANGE   FLAG
      Hemoglobin             13.8      g/dL       12.0 - 16.0       NORMAL
      WBC (White Blood Count) 6.4      K/uL       4.5 - 11.0        NORMAL
      Platelets              240       K/uL       150 - 450         NORMAL
      RBC                    4.7       M/uL       4.1 - 5.3         NORMAL
      Hematocrit             41.2      %          37.0 - 48.0       NORMAL
    `;

    const result = scoreDocumentStructure(cbcReport);
    expect(result.decision).toBe('ACCEPT');
    expect(result.isMedicalReport).toBe(true);
    expect(result.structuredLabRowCount).toBeGreaterThanOrEqual(MINIMUM_STRUCTURED_LAB_ROWS);
    expect(result.rejectionMessage).toBeUndefined();
  });

  it('ACCEPTs authentic Comprehensive Metabolic Panel (CMP) report', () => {
    const cmpReport = `
      APEX DIAGNOSTIC PATHOLOGY
      Specimen: Fasting Serum
      Test                     Result   Units    Reference Interval
      Glucose, Fasting         94       mg/dL    70 - 99
      Creatinine, Serum        0.92     mg/dL    0.60 - 1.30
      BUN                      14       mg/dL    7 - 20
      Sodium                   141      mmol/L   136 - 145
      Potassium                4.2      mmol/L   3.5 - 5.1
      Calcium                  9.4      mg/dL    8.5 - 10.5
    `;

    const result = scoreDocumentStructure(cmpReport);
    expect(result.decision).toBe('ACCEPT');
    expect(result.isMedicalReport).toBe(true);
    expect(result.structuredLabRowCount).toBeGreaterThanOrEqual(4);
  });

  it('ACCEPTs Lipid Profile report', () => {
    const lipidReport = `
      CARDIOVASCULAR HEALTH LABS
      Collection Date: 2026-04-01 | Specimen: Blood
      Cholesterol, Total       192      mg/dL    < 200
      Triglycerides            135      mg/dL    < 150
      HDL Cholesterol          54       mg/dL    > 40
      LDL Cholesterol          111      mg/dL    < 100
    `;

    const result = scoreDocumentStructure(lipidReport);
    expect(result.decision).toBe('ACCEPT');
    expect(result.isMedicalReport).toBe(true);
    expect(result.structuredLabRowCount).toBeGreaterThanOrEqual(3);
  });

  it('REJECTs an academic college assignment in milliseconds', () => {
    const assignmentText = `
      UNIVERSITY OF TECHNOLOGY
      DEPARTMENT OF COMPUTER SCIENCE
      Course: CS301 - Data Structures & Algorithms
      Assignment 2: Graph Traversal and Search Trees
      Student ID: CS-2024-8819    Roll No: 42
      Submission Date: 2026-04-15
      Instructor: Dr. Alan Turing

      Question 1: Explain the time complexity of Breadth First Search (BFS).
      Ans: The time complexity is O(V + E) where V is vertices and E is edges.
      
      Question 2: Implement a Red-Black Tree insertion algorithm.
      Total Marks: 50
    `;

    const result = scoreDocumentStructure(assignmentText);
    expect(result.decision).toBe('REJECT');
    expect(result.isMedicalReport).toBe(false);
    expect(result.rejectionMessage).toBe(GATEKEEPER_REJECTION_MESSAGE);
    expect(result.structuredLabRowCount).toBe(0);
  });

  it('REJECTs a shopping bill / retail grocery tax invoice', () => {
    const invoiceText = `
      SUPERMART RETAIL STORES PVT LTD
      Tax Invoice / Cash Receipt
      Store #1042 - Downtown Branch
      Date: 2026-05-10 14:32    POS Terminal #4
      Cashier: John

      Item Name             Qty   Unit Price   Total
      Almond Milk 1L        2     3.50         7.00
      Organic Apples 500g   1     4.20         4.20
      Whole Wheat Bread     1     2.80         2.80
      
      Subtotal: $14.00
      CGST 5%: $0.70
      SGST 5%: $0.70
      Grand Total: $15.40
      Payment Method: Credit Card
      Thank you for shopping with us! Visit again!
    `;

    const result = scoreDocumentStructure(invoiceText);
    expect(result.decision).toBe('REJECT');
    expect(result.isMedicalReport).toBe(false);
    expect(result.rejectionMessage).toBe(GATEKEEPER_REJECTION_MESSAGE);
  });

  it('REJECTs a biology essay that mentions hemoglobin but has no structured lab rows', () => {
    const essayText = `
      Department of Biological Sciences
      Semester 4 - Human Physiology Essay
      Submitted by: Sarah Jenkins
      
      Topic: The Evolutionary Adaptation of Hemoglobin in High Altitude Mammals
      
      Hemoglobin is an iron-containing oxygen transport metalloprotein in the red blood cells.
      In this paper, we explore how hemoglobin binding affinity varies across different species
      living in hypoxic environments. Mammals exhibit distinct genetic variations in their
      erythrocyte synthesis pathways. In conclusion, natural selection has optimized hemoglobin
      structure for oxygen delivery under varying partial pressures.
      
      References:
      1. Smith et al., Journal of Physiology, 2021.
    `;

    const result = scoreDocumentStructure(essayText);
    expect(result.decision).toBe('REJECT');
    expect(result.isMedicalReport).toBe(false);
    expect(result.rejectionMessage).toBe(GATEKEEPER_REJECTION_MESSAGE);
  });

  it('REJECTs a software engineering resume / CV', () => {
    const resumeText = `
      ALEXANDER WANG
      Senior Full-Stack Engineer | Seattle, WA | alex@example.com
      
      EXPERIENCE:
      Lead Cloud Architect - NextGen Cloud Inc (2022 - Present)
      - Spearheaded distributed microservices in Go and Rust handling 50k req/sec.
      - Reduced cloud spend by 35% through Redis caching and PostgreSQL query tuning.
      
      Software Engineer - Global Tech (2019 - 2022)
      - Built REST and GraphQL APIs using React, Next.js, and Node.js.
      - Managed CI/CD pipelines in GitHub Actions.
      
      SKILLS: TypeScript, Python, Docker, Kubernetes, Next.js, PostgreSQL.
    `;

    const result = scoreDocumentStructure(resumeText);
    expect(result.decision).toBe('REJECT');
    expect(result.isMedicalReport).toBe(false);
    expect(result.rejectionMessage).toBe(GATEKEEPER_REJECTION_MESSAGE);
  });

  it('REJECTs an empty or whitespace-only document', () => {
    const emptyResult = scoreDocumentStructure('   \n  \t  ');
    expect(emptyResult.decision).toBe('REJECT');
    expect(emptyResult.isMedicalReport).toBe(false);
    expect(emptyResult.rejectionMessage).toBe(GATEKEEPER_REJECTION_MESSAGE);
  });

  it('executes structural validation in under 5 milliseconds', () => {
    const reportText = `
      CLINICAL LABORATORY REPORT
      Patient: John Doe | Date: 2026-02-15
      WBC       5.5   K/uL    4.0 - 10.0
      RBC       4.8   M/uL    4.2 - 5.8
      Hgb       15.2  g/dL    13.0 - 17.0
      Hct       44.0  %       38.0 - 50.0
      Platelet  210   K/uL    150 - 450
    `;

    const start = performance.now();
    for (let i = 0; i < 20; i++) {
      validateMedicalReportStructure(reportText);
    }
    const avgDuration = (performance.now() - start) / 20;

    // Structural rule check should take well under 5ms
    expect(avgDuration).toBeLessThan(5);
  });

  describe('Magic Bytes Validation', () => {
    it('identifies genuine PDF headers (%PDF)', () => {
      const pdfBytes = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x37]);
      expect(validateMagicBytes(pdfBytes)).toEqual({ valid: true, detectedMime: 'application/pdf' });
    });

    it('identifies genuine PNG headers', () => {
      const pngBytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
      expect(validateMagicBytes(pngBytes)).toEqual({ valid: true, detectedMime: 'image/png' });
    });

    it('identifies genuine JPEG headers (FF D8 FF)', () => {
      const jpegBytes = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46]);
      expect(validateMagicBytes(jpegBytes)).toEqual({ valid: true, detectedMime: 'image/jpeg' });
    });

    it('identifies genuine WebP headers (RIFF...WEBP)', () => {
      const webpBytes = new Uint8Array([
        0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50,
      ]);
      expect(validateMagicBytes(webpBytes)).toEqual({ valid: true, detectedMime: 'image/webp' });
    });

    it('identifies DOCX ZIP headers (PK..)', () => {
      const docxBytes = new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0x14, 0x00, 0x06, 0x00]);
      expect(validateMagicBytes(docxBytes)).toEqual({
        valid: true,
        detectedMime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      });
    });

    it('identifies plain ASCII/UTF-8 text', () => {
      const textEncoder = new TextEncoder();
      const textBytes = textEncoder.encode('PATIENT LABORATORY REPORT\nHemoglobin 14.2 g/dL');
      expect(validateMagicBytes(textBytes)).toEqual({ valid: true, detectedMime: 'text/plain' });
    });

    it('rejects unrecognized binary files or corrupted data', () => {
      const corruptedBytes = new Uint8Array([0x00, 0x01, 0x02, 0x03, 0x04]);
      expect(validateMagicBytes(corruptedBytes)).toEqual({ valid: false, detectedMime: 'unknown' });
    });
  });
});
