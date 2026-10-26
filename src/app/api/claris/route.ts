import { NextRequest, NextResponse } from 'next/server';
import { callGeminiWithRotation, getApiKeys } from '@/lib/geminiRotation';
import { lookupMedicalTerm } from '@/data/medicalTerms';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { message, reportContext } = body;

    if (!message || typeof message !== 'string' || message.trim() === '') {
      return NextResponse.json(
        { error: 'Message cannot be empty.' },
        { status: 400 }
      );
    }

    const trimmedMsg = message.trim();
    const keys = getApiKeys();

    // 1. If Gemini API keys are configured, try LLM with rotation
    if (keys.length > 0) {
      try {
        const systemPrompt = `You are Claris.ai, the friendly, reassuring medical terminology assistant for the MEDUCID clinical report platform.
Your mission is to explain medical terminology, lab biomarkers, test acronyms, and reference ranges in simple, crystal-clear, plain English for everyday patients.

Safety & Communication Guidelines:
1. Speak in accessible, plain language that anyone without medical training can easily understand.
2. Structure your response into:
   - What it is (simple 1-sentence definition)
   - What it does in your body (biological role)
   - Why doctors typically test it
   - 1 neutral question to ask their physician
3. STRICT NON-DIAGNOSTIC GUARDRAIL: You explain terminology and biology only. NEVER guess illnesses, prescribe treatments, or declare that the patient has a specific condition.
4. Keep the answer concise (under 160 words). Use clean, warm formatting.`;

        let promptText = `User asked: "${trimmedMsg}"`;
        if (reportContext) {
          promptText += `\n\nContext from active laboratory report: ${reportContext.substring(0, 500)}`;
        }

        const result = await callGeminiWithRotation(
          [{ text: promptText }],
          systemPrompt,
          'text/plain'
        );

        if (result && result.text) {
          return NextResponse.json({
            reply: result.text,
            source: 'ai',
            model: result.modelUsed,
          });
        }
      } catch (err: any) {
        console.warn('[Claris API] Gemini rotation error, falling back to local dictionary:', err.message);
      }
    }

    // 2. Local Fallback Generator (Works 100% offline with zero keys)
    const matched = lookupMedicalTerm(trimmedMsg);

    if (matched) {
      const capitalized = matched.term.charAt(0).toUpperCase() + matched.term.slice(1);
      const reply = `**${capitalized}**\n\n` +
        `• **What it is:** ${matched.definition}\n\n` +
        `• **Why it's tested:** Doctors check this marker to monitor baseline organ function, metabolic balance, or general wellness.\n\n` +
        `• **Good question for your doctor:** *"How do my ${matched.term} numbers look relative to my overall health and history?"*`;

      return NextResponse.json({
        reply,
        source: 'dictionary',
      });
    }

    // Generic educational fallback when term is not in local dictionary
    const genericReply = `**Understanding Your Terminology**\n\n` +
      `You asked about: *"I'm looking into ${trimmedMsg}"*\n\n` +
      `In laboratory medicine, specific markers measure how efficiently your cells, organs, and metabolism are functioning. Reference intervals represent typical biological bounds established by testing healthy populations.\n\n` +
      `• **Next Step:** You can ask about standard lab markers like **Hemoglobin**, **Glucose**, **Creatinine**, **eGFR**, **Platelets**, **Lipids**, or **TSH** for in-depth plain-language definitions!\n\n` +
      `• **Tip:** Always check your report's printed reference range alongside your doctor's assessment.`;

    return NextResponse.json({
      reply: genericReply,
      source: 'fallback',
    });

  } catch (error: any) {
    console.error('[Claris API] Internal error:', error);
    return NextResponse.json(
      { error: 'Failed to process question. Please try again.' },
      { status: 500 }
    );
  }
}
