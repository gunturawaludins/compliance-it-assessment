import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface QuestionData {
  id: string;
  text: string;
  answer: 'Ya' | 'Tidak' | null;
  category: string;
  cobitRef?: string;
  parentId?: string;
  isSubQuestion?: boolean;
}

interface ValidationRequest {
  questions: QuestionData[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { questions }: ValidationRequest = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Prepare questions summary for AI analysis
    const answeredQuestions = questions.filter(q => q.answer !== null);
    const questionsSummary = answeredQuestions.map(q => ({
      id: q.id,
      text: q.text.substring(0, 200),
      answer: q.answer,
      category: q.category,
      cobitRef: q.cobitRef || 'N/A',
      parentId: q.parentId || null,
    }));

    // COBIT 2019 Framework reference for AI context
    const cobitDomains = `
COBIT 2019 Framework Domains:
- EDM (Evaluate, Direct, Monitor): EDM01-EDM05 - Governance objectives
- APO (Align, Plan, Organize): APO01-APO14 - Management objectives for IT alignment
- BAI (Build, Acquire, Implement): BAI01-BAI11 - Solution delivery and change management
- DSS (Deliver, Service, Support): DSS01-DSS06 - Service delivery and support
- MEA (Monitor, Evaluate, Assess): MEA01-MEA04 - Performance monitoring and compliance
    `;

    const systemPrompt = `Anda adalah AI auditor profesional yang ahli dalam framework COBIT 2019 untuk IT Governance.

${cobitDomains}

Tugas Anda adalah menganalisis jawaban IT Assessment dan mendeteksi:
1. INKONSISTENSI LOGIKA: Jawaban yang bertentangan secara logis (misal: klaim memiliki kebijakan tapi tidak ada review)
2. POLA MANIPULASI: Pola jawaban yang mencurigakan (semua "Ya" untuk pertanyaan utama tapi "Tidak" untuk sub-pertanyaan)
3. BUKTI TIDAK MEMADAI: Klaim positif tanpa bukti pendukung yang logis
4. PELANGGARAN COBIT: Jawaban yang melanggar prinsip COBIT 2019

Untuk setiap temuan, berikan:
- finding_type: 'logic_inconsistency' | 'manipulation_pattern' | 'insufficient_evidence' | 'cobit_violation'
- severity: 'major' | 'minor'
- question_ids: array ID pertanyaan terkait
- cobit_reference: referensi COBIT yang dilanggar (contoh: "EDM01.01", "APO12.02")
- description: penjelasan detail inkonsistensi dalam bahasa Indonesia
- recommendation: rekomendasi perbaikan

Fokus pada cross-validation antar jawaban yang saling berkaitan berdasarkan COBIT 2019.`;

    const userPrompt = `Analisis jawaban IT Assessment berikut dan identifikasi semua inkonsistensi dan potensi fraud berdasarkan COBIT 2019:

${JSON.stringify(questionsSummary, null, 2)}

Berikan analisis dalam format JSON dengan struktur:
{
  "findings": [...],
  "overall_risk_level": "low" | "medium" | "high" | "critical",
  "consistency_score": 0-100,
  "cobit_compliance_summary": {
    "edm": { "score": 0-100, "issues": [] },
    "apo": { "score": 0-100, "issues": [] },
    "bai": { "score": 0-100, "issues": [] },
    "dss": { "score": 0-100, "issues": [] },
    "mea": { "score": 0-100, "issues": [] }
  }
}`;

    console.log(`Processing AI validation for ${answeredQuestions.length} questions`);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.3,
        max_tokens: 4000,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ 
          error: "Rate limit exceeded. Please try again in a moment.",
          errorCode: "RATE_LIMIT" 
        }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ 
          error: "AI credits exhausted. Please add credits to continue.",
          errorCode: "PAYMENT_REQUIRED" 
        }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("Empty response from AI");
    }

    // Parse AI response - extract JSON from markdown if needed
    let parsedResult;
    try {
      // Try to extract JSON from markdown code block
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
      const jsonString = jsonMatch ? jsonMatch[1].trim() : content.trim();
      parsedResult = JSON.parse(jsonString);
    } catch (parseError) {
      console.error("Failed to parse AI response:", parseError);
      console.log("Raw content:", content);
      // Return a default structure if parsing fails
      parsedResult = {
        findings: [],
        overall_risk_level: "low",
        consistency_score: 100,
        cobit_compliance_summary: {
          edm: { score: 100, issues: [] },
          apo: { score: 100, issues: [] },
          bai: { score: 100, issues: [] },
          dss: { score: 100, issues: [] },
          mea: { score: 100, issues: [] }
        },
        parse_error: true,
        raw_response: content.substring(0, 500)
      };
    }

    console.log(`AI validation completed. Findings: ${parsedResult.findings?.length || 0}`);

    return new Response(JSON.stringify(parsedResult), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Error in ai-fraud-validation:", error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : "Unknown error",
      findings: [],
      overall_risk_level: "unknown",
      consistency_score: 0
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
