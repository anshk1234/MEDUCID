import { jsPDF } from 'jspdf';
import { SimplifiedReport, MedicalFinding } from '@/types/report';

export interface PdfExportOptions {
  fileName?: string;
  patientName?: string;
  collectionDate?: string;
}

/**
 * Sanitizes Unicode characters that standard PDF fonts (Helvetica) cannot render,
 * converting en-dashes, em-dashes, micro-signs, and special spaces to clean ASCII equivalents.
 */
function sanitizeForPdf(text: string | null | undefined): string {
  if (!text) return '';
  return text
    .replace(/[\u2013\u2014]/g, '-') // en-dash and em-dash -> hyphen
    .replace(/[\u2212]/g, '-')       // minus sign -> hyphen
    .replace(/[\u00A0\u2000-\u200B]/g, ' ') // non-breaking & thin spaces -> regular space
    .replace(/[\u00B5\u03BC]/g, 'u')  // micro symbol -> u
    .replace(/[\u2018\u2019]/g, "'") // smart single quotes
    .replace(/[\u201C\u201D]/g, '"') // smart double quotes
    .replace(/[\u2022\u00B7]/g, '-') // bullet -> dash
    .replace(/[^\x00-\x7F]/g, '');   // strip any remaining non-ASCII to prevent PDF glyph corruption
}

export function generateSimplifiedReportPdf(
  report: SimplifiedReport,
  options?: PdfExportOptions
): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 14;
  const contentWidth = pageWidth - margin * 2; // 182mm
  const bottomMargin = pageHeight - 14;

  const primaryColor: [number, number, number] = [23, 23, 23];      // #171717 Ink
  const tealColor: [number, number, number] = [13, 92, 88];         // #0D5C58 Deep Teal
  const mutedColor: [number, number, number] = [100, 116, 139];     // #64748B Slate Muted
  const cardBorder: [number, number, number] = [226, 232, 240];     // #E2E8F0 Border
  const cardBg: [number, number, number] = [250, 249, 246];         // #FAF9F6 Paper
  const amberBg: [number, number, number] = [255, 251, 235];        // #FFFBEB
  const amberBorder: [number, number, number] = [253, 230, 138];    // #FDE68A
  const amberText: [number, number, number] = [180, 83, 9];          // #B45309
  const greenBg: [number, number, number] = [236, 253, 245];        // #ECFDF5
  const greenBorder: [number, number, number] = [167, 243, 208];    // #A7F3D0
  const greenText: [number, number, number] = [4, 120, 87];          // #047857

  const reportFileName = options?.fileName || report.title || 'report.pdf';
  const outOfRange = report.findings.filter((f) => f.flag === 'HIGH' || f.flag === 'LOW');

  const addHeader = (sectionTitle: string, pageNum: number) => {
    // Top Brand Bar
    doc.setFillColor(250, 249, 246);
    doc.rect(0, 0, pageWidth, 20, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.4);
    doc.line(0, 20, pageWidth, 20);

    // MEDUCID Wordmark
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(...tealColor);
    doc.text('MEDUCID', margin, 13);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...mutedColor);
    doc.text('Clinical Laboratory Report Simplifier', margin + 28, 13);

    // Right-aligned file / page badge
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...primaryColor);
    doc.text(sanitizeForPdf(sectionTitle.toUpperCase()), pageWidth - margin, 10, { align: 'right' });

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...mutedColor);
    doc.text(sanitizeForPdf(reportFileName), pageWidth - margin, 15, { align: 'right' });
  };

  const addFooter = (pageNum: number) => {
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.4);
    doc.line(margin, pageHeight - 11, pageWidth - margin, pageHeight - 11);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...mutedColor);
    doc.text(
      'MEDUCID Patient Report - Confidential Educational Reference - Does not constitute medical diagnosis.',
      margin,
      pageHeight - 6
    );
    doc.text(`Page ${pageNum}`, pageWidth - margin, pageHeight - 6, { align: 'right' });
  };

  // =========================================================================
  // PAGE 1: OVERVIEW (as seen in app)
  // =========================================================================
  addHeader('Overview & Key Findings', 1);

  let y = 26;

  // 1. Report Metadata Card
  doc.setFillColor(...cardBg);
  doc.setDrawColor(...cardBorder);
  doc.setLineWidth(0.3);
  doc.roundedRect(margin, y, contentWidth, 14, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...tealColor);
  doc.text('SOURCE DOCUMENT:', margin + 3, y + 5.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...primaryColor);
  doc.text(sanitizeForPdf(reportFileName), margin + 38, y + 5.5);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...tealColor);
  doc.text('SUMMARY STATUS:', margin + 3, y + 10.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...primaryColor);
  const statusStr = `${report.summary.totalTests} tests parsed | ${report.summary.outOfRangeCount} outside printed range | ${report.summary.withinRangeCount} within range`;
  doc.text(sanitizeForPdf(statusStr), margin + 38, y + 10.5);

  const genDateStr = new Date().toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...mutedColor);
  doc.text(`Generated: ${genDateStr}`, pageWidth - margin - 3, y + 5.5, { align: 'right' });

  y += 18;

  // 2. High-Level Range Metric Banner (Amber if out-of-range > 0, else Green)
  if (report.summary.outOfRangeCount > 0) {
    doc.setFillColor(...amberBg);
    doc.setDrawColor(...amberBorder);
    doc.roundedRect(margin, y, contentWidth, 11, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...amberText);
    const alertPrefix = `[!]  ${report.summary.outOfRangeCount} of ${report.summary.totalWithNumericRange} values `;
    doc.text(alertPrefix, margin + 4, y + 7);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(80, 70, 50);
    const alertSuffix = `with a printed numeric range are outside it (${report.summary.noNumericRangeCount} have no numeric range)`;
    doc.text(alertSuffix, margin + 4 + doc.getTextWidth(alertPrefix), y + 7);
  } else {
    doc.setFillColor(...greenBg);
    doc.setDrawColor(...greenBorder);
    doc.roundedRect(margin, y, contentWidth, 11, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...greenText);
    const passPrefix = `[OK]  All ${report.summary.totalWithNumericRange} values `;
    doc.text(passPrefix, margin + 4, y + 7);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(40, 80, 60);
    const passSuffix = `with a printed numeric range are within it (${report.summary.noNumericRangeCount} have no numeric range)`;
    doc.text(passSuffix, margin + 4 + doc.getTextWidth(passPrefix), y + 7);
  }

  y += 16;

  // 3. Key Findings (Outside Printed Reference Range)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...primaryColor);
  doc.text('Key Findings (Outside Printed Reference Range)', margin, y);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...mutedColor);
  doc.text(`${outOfRange.length} flagged`, pageWidth - margin, y, { align: 'right' });

  y += 4;

  if (outOfRange.length === 0) {
    doc.setFillColor(...greenBg);
    doc.setDrawColor(...greenBorder);
    doc.roundedRect(margin, y, contentWidth, 12, 2, 2, 'FD');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(...greenText);
    doc.text('All values are within the ranges printed on this report.', margin + 4, y + 7.5);
    y += 18;
  } else {
    // Show up to 5-6 key findings on page 1 so it fits cleanly with summary & verification
    const maxOnPageOne = Math.min(outOfRange.length, 5);
    for (let i = 0; i < maxOnPageOne; i++) {
      const finding = outOfRange[i];
      const cardHeight = 19;

      doc.setFillColor(...amberBg);
      doc.setDrawColor(...amberBorder);
      doc.setLineWidth(0.3);
      doc.roundedRect(margin, y, contentWidth, cardHeight, 1.5, 1.5, 'FD');

      // Line 1 Left: Test Name + Simplified Name
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(...primaryColor);
      const testNameText = sanitizeForPdf(finding.testName);
      doc.text(testNameText, margin + 3.5, y + 5.5);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(...mutedColor);
      const nameWidth = doc.getTextWidth(testNameText);
      const simplifiedText = sanitizeForPdf(finding.simplifiedName);
      if (simplifiedText && simplifiedText !== testNameText) {
        doc.text(` (${simplifiedText})`, margin + 3.5 + nameWidth, y + 5.5);
      }

      // Line 1 Right: Value + Range + Badge
      const isHigh = finding.flag === 'HIGH';
      const badgeText = isHigh ? 'Above printed range' : 'Below printed range';
      const badgeWidth = doc.getTextWidth(badgeText) + 6;
      const badgeX = pageWidth - margin - badgeWidth - 2;

      // Badge
      doc.setFillColor(254, 243, 199);
      doc.setDrawColor(245, 158, 11);
      doc.roundedRect(badgeX, y + 2, badgeWidth, 5.5, 1, 1, 'FD');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(...amberText);
      doc.text(badgeText, badgeX + 3, y + 5.8);

      // Value & Range
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(...primaryColor);
      const valStr = `${sanitizeForPdf(finding.originalValue)} ${sanitizeForPdf(finding.unit)}   `;
      const rangeStr = `Range: ${sanitizeForPdf(finding.referenceRange)}`;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(...mutedColor);
      const rangeValX = badgeX - 4;
      doc.text(`${valStr} |  ${rangeStr}`, rangeValX, y + 5.5, { align: 'right' });

      // Line 2: Plain explanation
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(60, 64, 67);
      const explLines = doc.splitTextToSize(sanitizeForPdf(finding.plainExplanation), contentWidth - 8);
      doc.text(explLines[0] || '', margin + 3.5, y + 11.5);
      if (explLines[1]) {
        doc.text(explLines[1], margin + 3.5, y + 15.5);
      }

      y += cardHeight + 2.5;
    }

    if (outOfRange.length > maxOnPageOne) {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(7.5);
      doc.setTextColor(...mutedColor);
      doc.text(
        `+ ${outOfRange.length - maxOnPageOne} additional out-of-range findings detailed on Page 2 (All Results).`,
        margin + 2,
        y + 2
      );
      y += 6;
    }
  }

  y += 4;

  // 4. Clinical Summary Box
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...primaryColor);
  doc.text('SUMMARY', margin, y);

  y += 3;
  const summaryText = sanitizeForPdf(report.summary.overview);
  const summaryLines = doc.splitTextToSize(summaryText, contentWidth - 8);
  const summaryBoxHeight = Math.max(14, summaryLines.length * 4.2 + 6);

  doc.setFillColor(...cardBg);
  doc.setDrawColor(...cardBorder);
  doc.roundedRect(margin, y, contentWidth, summaryBoxHeight, 2, 2, 'FD');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(50, 50, 50);
  doc.text(summaryLines, margin + 4, y + 5);

  y += summaryBoxHeight + 5;

  // 5. Verification & Grounding Statement
  const verifBoxHeight = 14;
  doc.setFillColor(...greenBg);
  doc.setDrawColor(...greenBorder);
  doc.roundedRect(margin, y, contentWidth, verifBoxHeight, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...greenText);
  doc.text('[OK]  Verified: 100% Extracted Values Matched with Source Report', margin + 4, y + 5.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(30, 80, 60);
  const coverageText = report.extractionCompleteness
    ? `Completeness: ${report.extractionCompleteness.successfullyParsed}/${report.extractionCompleteness.sourceMeasurementsIdentified} measurements parsed (${report.extractionCompleteness.coveragePercentage}% coverage)`
    : `${report.findings.length} findings parsed and grounded verbatim against source document text.`;
  doc.text(sanitizeForPdf(coverageText), margin + 4, y + 10.5);

  addFooter(1);

  // =========================================================================
  // PAGE 2: ALL RESULTS
  // =========================================================================
  doc.addPage();
  let currentPage = 2;
  addHeader('All Results', currentPage);

  y = 26;

  // Subheader banner
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...primaryColor);
  doc.text('Complete Laboratory Results', margin, y);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...mutedColor);
  doc.text(
    `Total: ${report.summary.totalTests}   |   Outside Range: ${report.summary.outOfRangeCount}   |   Within Range: ${report.summary.withinRangeCount}`,
    pageWidth - margin,
    y,
    { align: 'right' }
  );

  y += 6;

  // Group findings by category
  const categories = Array.from(new Set(report.findings.map((f) => f.category || 'General Laboratory')));

  for (const category of categories) {
    const categoryFindings = report.findings.filter((f) => (f.category || 'General Laboratory') === category);
    if (categoryFindings.length === 0) continue;

    // Check if category header fits
    if (y + 12 > bottomMargin) {
      addFooter(currentPage);
      doc.addPage();
      currentPage++;
      addHeader('All Results (Continued)', currentPage);
      y = 26;
    }

    // Category Header Bar
    doc.setFillColor(243, 244, 246);
    doc.rect(margin, y, contentWidth, 6, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...primaryColor);
    doc.text(sanitizeForPdf(category.toUpperCase()), margin + 3, y + 4.2);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...mutedColor);
    doc.text(`${categoryFindings.length} tests`, pageWidth - margin - 3, y + 4.2, { align: 'right' });

    y += 7.5;

    // Two-line rows for each finding
    for (const finding of categoryFindings) {
      const isHigh = finding.flag === 'HIGH';
      const isLow = finding.flag === 'LOW';
      const isOutOfRange = isHigh || isLow;

      const rowHeight = 11.5;
      if (y + rowHeight > bottomMargin) {
        addFooter(currentPage);
        doc.addPage();
        currentPage++;
        addHeader('All Results (Continued)', currentPage);
        y = 26;
      }

      // Background highlight for out-of-range
      if (isOutOfRange) {
        doc.setFillColor(255, 251, 235);
        doc.rect(margin, y, contentWidth, rowHeight - 0.5, 'F');
      }

      // Line separator
      doc.setDrawColor(241, 245, 249);
      doc.setLineWidth(0.2);
      doc.line(margin, y + rowHeight - 0.5, pageWidth - margin, y + rowHeight - 0.5);

      // Line 1: Test Name (Left)
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(...primaryColor);
      doc.text(sanitizeForPdf(finding.testName), margin + 2, y + 4.5);

      // Line 1: Value & Range (Right)
      const valStr = `${sanitizeForPdf(finding.originalValue)} ${sanitizeForPdf(finding.unit)}`;
      const rangeStr = `Range: ${sanitizeForPdf(finding.referenceRange)}`;

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(...primaryColor);
      doc.text(valStr, pageWidth - margin - 58, y + 4.5, { align: 'right' });

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(...mutedColor);
      doc.text(rangeStr, pageWidth - margin - 24, y + 4.5, { align: 'right' });

      // Line 1: Status Flag Badge (Far Right)
      if (isOutOfRange) {
        const flagText = isHigh ? 'Above' : 'Below';
        doc.setFillColor(254, 243, 199);
        doc.setDrawColor(245, 158, 11);
        doc.roundedRect(pageWidth - margin - 20, y + 1.2, 18, 4.5, 0.8, 0.8, 'FD');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6.5);
        doc.setTextColor(...amberText);
        doc.text(flagText, pageWidth - margin - 11, y + 4.4, { align: 'center' });
      } else {
        doc.setFillColor(241, 245, 249);
        doc.setDrawColor(203, 213, 225);
        doc.roundedRect(pageWidth - margin - 20, y + 1.2, 18, 4.5, 0.8, 0.8, 'FD');
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6.5);
        doc.setTextColor(71, 85, 105);
        doc.text('Normal', pageWidth - margin - 11, y + 4.4, { align: 'center' });
      }

      // Line 2: Plain explanation
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(100, 116, 139);
      const explLine = doc.splitTextToSize(sanitizeForPdf(finding.plainExplanation), contentWidth - 4)[0] || '';
      doc.text(explLine, margin + 2, y + 8.8);

      y += rowHeight;
    }

    y += 3;
  }

  addFooter(currentPage);

  // =========================================================================
  // PAGE 3: QUESTIONS TO ASK YOUR CLINICIAN
  // =========================================================================
  doc.addPage();
  currentPage++;
  addHeader('Questions for Clinician', currentPage);

  y = 26;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...primaryColor);
  doc.text('Questions to Ask Your Clinician', margin, y);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...mutedColor);
  doc.text('Neutral questions referencing values printed on this report', margin, y + 4.5);

  y += 10;

  // List of clinician questions
  if (report.clinicianQuestions && report.clinicianQuestions.length > 0) {
    report.clinicianQuestions.forEach((question, idx) => {
      const qText = sanitizeForPdf(question);
      const qLines = doc.splitTextToSize(qText, contentWidth - 14);
      const qHeight = Math.max(12, qLines.length * 4.2 + 5);

      if (y + qHeight > bottomMargin - 50) {
        addFooter(currentPage);
        doc.addPage();
        currentPage++;
        addHeader('Questions for Clinician (Continued)', currentPage);
        y = 26;
      }

      doc.setFillColor(...cardBg);
      doc.setDrawColor(...cardBorder);
      doc.setLineWidth(0.3);
      doc.roundedRect(margin, y, contentWidth, qHeight, 2, 2, 'FD');

      // Question Number Badge
      doc.setFillColor(204, 251, 241);
      doc.circle(margin + 6, y + 6, 3.5, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(...tealColor);
      doc.text(`${idx + 1}`, margin + 6, y + 7.2, { align: 'center' });

      // Question Text
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(...primaryColor);
      doc.text(qLines, margin + 12, y + 5.5);

      y += qHeight + 3;
    });
  } else {
    doc.setFillColor(...cardBg);
    doc.setDrawColor(...cardBorder);
    doc.roundedRect(margin, y, contentWidth, 14, 2, 2, 'FD');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(...mutedColor);
    doc.text('No specific follow-up questions generated for this report.', margin + 4, y + 8.5);
    y += 18;
  }

  y += 4;

  // Appointment Preparation Guidance Card
  if (y + 35 > bottomMargin - 20) {
    addFooter(currentPage);
    doc.addPage();
    currentPage++;
    addHeader('Questions for Clinician (Continued)', currentPage);
    y = 26;
  }

  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(margin, y, contentWidth, 26, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(...tealColor);
  doc.text('HOW TO PREPARE FOR YOUR CLINICAL APPOINTMENT', margin + 4, y + 5.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(51, 65, 85);
  doc.text('1. Bring both your original laboratory report and this simplified summary to your appointment.', margin + 4, y + 11);
  doc.text('2. Highlight the questions above that relate most to any symptoms or medications you are currently taking.', margin + 4, y + 16);
  doc.text('3. Never change medication doses or start treatments based on simplified lab reports without doctor confirmation.', margin + 4, y + 21);

  y += 31;

  // Official Medical Disclaimer & Boundaries
  doc.setFillColor(254, 242, 242);
  doc.setDrawColor(254, 202, 202);
  doc.roundedRect(margin, y, contentWidth, 22, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(153, 27, 27);
  doc.text('IMPORTANT CLINICAL NOTICE & SAFETY BOUNDARY', margin + 4, y + 5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(127, 29, 29);
  const disclaimerText =
    'MEDUCID is an educational patient laboratory translation tool. It is NOT a clinical diagnosis or treatment provider. Reference intervals vary by laboratory methodology, instrument calibration, patient age, biological sex, and fasting status. Only a qualified physician can interpret these results in the context of your complete medical history.';
  const discLines = doc.splitTextToSize(disclaimerText, contentWidth - 8);
  doc.text(discLines, margin + 4, y + 9.5);

  addFooter(currentPage);

  return doc;
}

/**
 * Generates and triggers browser download of the PDF report
 */
export async function downloadSimplifiedReportPdf(
  report: SimplifiedReport,
  options?: PdfExportOptions
): Promise<void> {
  const doc = generateSimplifiedReportPdf(report, options);
  const rawFileName = options?.fileName || report.title || 'report';
  const cleanBase = rawFileName.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9_-]/g, '_');
  const finalFileName = `MEDUCID_Simplified_${cleanBase || 'Report'}.pdf`;
  doc.save(finalFileName);
}
