import { NextRequest, NextResponse } from 'next/server';
import { callGeminiWithRotation, GeminiContentPart } from '@/lib/geminiRotation';
import { SimplifiedReport, MedicalFinding } from '@/types/report';
import { auditFactualConsistency } from '@/lib/consistencyChecker';
import { formatStrictSummary, generateStrictNeutralQuestions } from '@/lib/simplificationEngine';
import { extractMeasurementsFromText } from '@/lib/documentExtractor';
import { interpretReferenceRange } from '@/lib/rangeInterpreter';

const SYSTEM_INSTRUCTION = `You are MEDUCID, an expert clinical AI system that extracts laboratory reports into structured findings.

STRICT PRODUCT RULES (NON-NEGOTIABLE):
1. COMPLETENESS IS MANDATORY: You MUST extract EVERY SINGLE laboratory measurement from ALL sections of the document (including Complete Blood Count, Biochemistry, Urinalysis, etc.). Never truncate, never stop after a few rows, and never omit normal or qualitative findings.
2. Test names, numerical values, measurement units, and reference ranges MUST appear EXACTLY as printed in the source. Never rename, round, convert, or reformat them.
3. "flag" MUST strictly compare the value against the printed reference range on that line:
   - "HIGH": value is above the printed reference range.
   - "LOW": value is below the printed reference range.
   - "NORMAL": value is inside the printed reference range.
   - "INCONCLUSIVE": range cannot be evaluated.
4. "plainExplanation" explains what the test measures in general terms (1-2 clear sentences). It says NOTHING about the patient's condition, diagnosis, diet, causes, or treatment.
5. "sourceSpan": The exact, verbatim raw line or text excerpt from the document where this measurement was printed.
6. "rawReportText": Transcribe the full text of the document clearly so the user can inspect every line with line numbers.

OUTPUT JSON SCHEMA:
{
  "title": "Report or Panel Title (e.g. Comprehensive Laboratory Report)",
  "patientDeidentifiedId": "De-identified ID or 'SYN-PT-USER'",
  "collectionDate": "Date as printed or current date",
  "rawReportText": "Complete transcribed monospace text of the report",
  "findings": [
    {
      "testName": "Exact printed test name",
      "simplifiedName": "Plain-language term for the metric",
      "category": "Panel Category (e.g. Complete Blood Count (CBC), Biochemistry, Urinalysis)",
      "originalValue": "Exact value as printed (e.g. 118, 1.4, 58, Negative, Pale Yellow)",
      "unit": "Exact unit as printed (e.g. mg/dL, mmol/L, mL/min, %, /uL)",
      "referenceRange": "Exact reference range as printed (e.g. 70 - 99, 0.6 - 1.2, > 60, < 150, Negative)",
      "numericValue": 118,
      "rangeLow": 70,
      "rangeHigh": 99,
      "flag": "HIGH" | "LOW" | "NORMAL" | "INCONCLUSIVE",
      "plainExplanation": "Measures...",
      "sourceSpan": "Exact text line from document"
    }
  ]
}`;

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const sessionId = req.headers.get('x-session-id') || 'sess_default';
    const body = await req.json();
    const { fileBase64, mimeType, rawText, fileName } = body;

    // 1. If rawText is provided, run deterministic extraction baseline immediately
    let deterministicResult = rawText ? extractMeasurementsFromText(rawText) : null;

    const parts: GeminiContentPart[] = [];

    if (fileBase64 && mimeType) {
      parts.push({
        inlineData: {
          mimeType,
          data: fileBase64,
        },
      });
      parts.push({
        text: `Extract ALL laboratory tests across all pages and sections from this uploaded ${fileName || 'document'}. Do NOT omit any measurements. Output only valid JSON.`,
      });
    } else if (rawText) {
      parts.push({
        text: `Extract ALL laboratory tests from this report text without omitting any section (CBC, Biochemistry, Urinalysis, etc.):\n\n${rawText}\n\nOutput only valid JSON.`,
      });
    } else {
      return NextResponse.json(
        { error: 'No document data or text provided for extraction.' },
        { status: 400 }
      );
    }

    // Call Gemini with automatic key rotation and model fallback
    let aiFindings: MedicalFinding[] = [];
    let parsedJson: any = {};
    let modelUsed = 'deterministic-fallback';
    let keyIndexUsed = 0;

    try {
      const geminiRes = await callGeminiWithRotation(parts, SYSTEM_INSTRUCTION);
      modelUsed = geminiRes.modelUsed;
      keyIndexUsed = geminiRes.keyIndexUsed;

      try {
        parsedJson = JSON.parse(geminiRes.text);
      } catch {
        const cleaned = geminiRes.text.replace(/```json\n?|\n?```/g, '').trim();
        parsedJson = JSON.parse(cleaned);
      }

      const rawFindings: any[] = parsedJson.findings || [];
      aiFindings = rawFindings.map((f: any, idx: number) => {
        const interpretation = interpretReferenceRange(
          String(f.originalValue || ''),
          String(f.referenceRange || ''),
          f.flag
        );

        return {
          id: `gemini-f-${idx + 1}`,
          testName: String(f.testName || '').trim(),
          simplifiedName: String(f.simplifiedName || f.testName || '').trim(),
          category: String(f.category || 'General Laboratory').trim(),
          originalValue: String(f.originalValue || '').trim(),
          unit: String(f.unit || '').trim(),
          referenceRange: String(f.referenceRange || '').trim(),
          numericValue: interpretation.numericValue,
          rangeLow: interpretation.rangeLow,
          rangeHigh: interpretation.rangeHigh,
          flag: interpretation.flag,
          plainExplanation: String(f.plainExplanation || '').trim(),
          clinicalContext: interpretation.rangeExplanation,
          sourceSpan: String(f.sourceSpan || `${f.testName} ${f.originalValue} ${f.unit}`).trim(),
          originalFlag: interpretation.originalFlag,
          calculatedStatus: interpretation.calculatedStatus,
          rangeType: interpretation.rangeType,
          flagDisagreement: interpretation.flagDisagreement,
          flagDisagreementNote: interpretation.flagDisagreementNote,
          rangeExplanation: interpretation.rangeExplanation,
        };
      });
    } catch (aiErr) {
      console.warn('[API /api/extract] Gemini AI failed, using deterministic extractor:', aiErr);
    }

    const effectiveRawText = parsedJson.rawReportText || rawText || '';

    // Re-run deterministic extraction on effective raw text if available
    if (!deterministicResult && effectiveRawText) {
      deterministicResult = extractMeasurementsFromText(effectiveRawText);
    }

    // Completeness Assurance:
    // If deterministic parsing extracted more measurements than AI returned, use deterministic findings
    // so no measurements are dropped, but enrich with AI explanations where available.
    let finalFindings: MedicalFinding[] = [];
    if (deterministicResult && deterministicResult.findings.length >= aiFindings.length) {
      finalFindings = deterministicResult.findings.map((df) => {
        const aiMatch = aiFindings.find(
          (af) => af.testName.toLowerCase() === df.testName.toLowerCase()
        );
        if (aiMatch && aiMatch.plainExplanation) {
          return {
            ...df,
            simplifiedName: aiMatch.simplifiedName || df.simplifiedName,
            plainExplanation: aiMatch.plainExplanation,
          };
        }
        return df;
      });
    } else if (aiFindings.length > 0) {
      finalFindings = aiFindings;
    } else if (deterministicResult) {
      finalFindings = deterministicResult.findings;
    }

    const summaryData = formatStrictSummary(finalFindings);
    const clinicianQuestions = generateStrictNeutralQuestions(finalFindings);

    const report: SimplifiedReport = {
      id: `rep-${sessionId}-${Date.now()}`,
      title: parsedJson.title || fileName || 'Clinical Laboratory Report',
      panelCategory:
        deterministicResult?.detectedSections.length
          ? deterministicResult.detectedSections.join(', ')
          : 'Laboratory Specimen',
      patientDeidentifiedId: parsedJson.patientDeidentifiedId || 'SYN-PT-AI',
      collectionDate: parsedJson.collectionDate || new Date().toLocaleDateString(),
      labName: 'Clinical Diagnostic Report',
      rawText: effectiveRawText,
      findings: finalFindings,
      summary: summaryData,
      clinicianQuestions,
      extractionCompleteness: deterministicResult?.completeness,
      factualConsistency: {
        passed: true,
        score: 100,
        verifiedAt: new Date().toISOString(),
        checks: [],
      },
    };

    // Run deterministic factual consistency check
    report.factualConsistency = auditFactualConsistency(report);

    return NextResponse.json({
      success: true,
      sessionId,
      report,
      modelUsed,
      keyIndexUsed: keyIndexUsed + 1,
    });
  } catch (error: any) {
    console.error('[API /api/extract] Extraction failure:', error);
    return NextResponse.json(
      {
        error: error.message || 'Failed to extract laboratory findings.',
      },
      { status: 500 }
    );
  }
}
