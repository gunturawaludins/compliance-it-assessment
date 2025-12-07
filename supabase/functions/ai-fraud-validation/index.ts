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

// Helper function to extract JSON from various formats
function extractJSON(content: string): string {
  // Remove markdown code blocks
  let cleaned = content.replace(/```json\s*/gi, '').replace(/```\s*/g, '');
  
  // Try to find JSON object pattern
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    return jsonMatch[0];
  }
  
  return cleaned.trim();
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
    
    if (answeredQuestions.length === 0) {
      return new Response(JSON.stringify({
        findings: [],
        overall_risk_level: "low",
        consistency_score: 100,
        analysis_summary: "Tidak ada pertanyaan yang dijawab untuk dianalisis.",
        cobit_compliance_summary: {
          edm: { score: 100, issues: [], summary: "Tidak ada data" },
          apo: { score: 100, issues: [], summary: "Tidak ada data" },
          bai: { score: 100, issues: [], summary: "Tidak ada data" },
          dss: { score: 100, issues: [], summary: "Tidak ada data" },
          mea: { score: 100, issues: [], summary: "Tidak ada data" }
        }
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Group questions by parent-child relationship for better analysis
    const mainQuestions = answeredQuestions.filter(q => !q.parentId);
    const subQuestions = answeredQuestions.filter(q => q.parentId);
    
    // Build relationship map
    const relationshipMap: Record<string, { main: QuestionData, subs: QuestionData[] }> = {};
    mainQuestions.forEach(mq => {
      const subs = subQuestions.filter(sq => sq.parentId === mq.id);
      if (subs.length > 0) {
        relationshipMap[mq.id] = { main: mq, subs };
      }
    });

    const questionsSummary = answeredQuestions.map(q => ({
      id: q.id,
      text: q.text.substring(0, 300),
      answer: q.answer,
      category: q.category,
      cobitRef: q.cobitRef || 'N/A',
      parentId: q.parentId || null,
      isSubQuestion: q.isSubQuestion || false,
    }));

    // Pre-analyze for obvious inconsistencies to guide AI
    const preAnalysis: string[] = [];
    Object.entries(relationshipMap).forEach(([mainId, { main, subs }]) => {
      // Pattern 1: Main = Ya, but ALL subs = Tidak
      const allSubsNo = subs.every(s => s.answer === 'Tidak');
      if (main.answer === 'Ya' && subs.length > 0 && allSubsNo) {
        preAnalysis.push(`INKONSISTENSI: ${mainId} dijawab "Ya" tapi SEMUA sub-pertanyaan dijawab "Tidak"`);
      }
      
      // Pattern 2: Main = Tidak, but some subs = Ya
      const someSubsYes = subs.some(s => s.answer === 'Ya');
      if (main.answer === 'Tidak' && someSubsYes) {
        const yesSubIds = subs.filter(s => s.answer === 'Ya').map(s => s.id).join(', ');
        preAnalysis.push(`INKONSISTENSI: ${mainId} dijawab "Tidak" tapi sub-pertanyaan ${yesSubIds} dijawab "Ya"`);
      }
    });

    const systemPrompt = `Anda adalah AI auditor profesional yang SANGAT KRITIS dalam menganalisis IT Assessment berdasarkan COBIT 2019.

DOMAIN COBIT 2019:
- EDM (Evaluate, Direct, Monitor): EDM01-EDM05 - Tata kelola TI
- APO (Align, Plan, Organize): APO01-APO14 - Perencanaan dan penyelarasan TI
- BAI (Build, Acquire, Implement): BAI01-BAI11 - Pengembangan dan implementasi
- DSS (Deliver, Service, Support): DSS01-DSS06 - Operasional dan dukungan layanan
- MEA (Monitor, Evaluate, Assess): MEA01-MEA04 - Pemantauan dan evaluasi

TUGAS ANDA - WAJIB DIJALANKAN DENGAN TELITI:

1. DETEKSI INKONSISTENSI LOGIKA (logic_inconsistency):
   - Jika pertanyaan utama dijawab "Ya" tapi SEMUA sub-pertanyaan "Tidak" = MAYOR
   - Jika pertanyaan utama dijawab "Tidak" tapi ada sub-pertanyaan "Ya" = MAYOR
   - Jawaban yang saling bertentangan dalam satu domain COBIT

2. DETEKSI POLA MANIPULASI (manipulation_pattern):
   - Pola jawaban terlalu sempurna (semua "Ya" tanpa variasi)
   - Pola jawaban acak yang tidak logis
   - Ketidaksesuaian antara klaim governance dan implementasi

3. BUKTI TIDAK MEMADAI (insufficient_evidence):
   - Klaim memiliki kebijakan tapi tidak ada bukti review/update
   - Klaim memiliki prosedur tapi tidak ada bukti pelaksanaan
   - Gap antara pernyataan dan bukti pendukung

4. PELANGGARAN COBIT (cobit_violation):
   - Proses tidak sesuai dengan domain COBIT yang relevan
   - Tidak ada continuous improvement (MEA)
   - Tidak ada monitoring (EDM, MEA)

SANGAT PENTING:
- HARUS menemukan inkonsistensi jika ada, jangan toleransi
- Setiap pertanyaan utama dengan sub-pertanyaan WAJIB dicek konsistensinya
- Berikan penjelasan detail dalam bahasa Indonesia
- Berikan rekomendasi konkret

FORMAT OUTPUT (HANYA JSON, TANPA MARKDOWN, TANPA TEKS LAIN):
{
  "findings": [
    {
      "finding_type": "logic_inconsistency|manipulation_pattern|insufficient_evidence|cobit_violation",
      "severity": "major|minor",
      "question_ids": ["ID1", "ID2"],
      "cobit_reference": "EDM01.01",
      "description": "Penjelasan detail inkonsistensi",
      "recommendation": "Rekomendasi perbaikan konkret"
    }
  ],
  "overall_risk_level": "low|medium|high|critical",
  "consistency_score": 0-100,
  "analysis_summary": "Penjelasan tertulis 2-3 paragraf tentang hasil analisis keseluruhan, temuan utama, dan rekomendasi",
  "cobit_compliance_summary": {
    "edm": { "score": 0-100, "issues": [], "summary": "Penjelasan singkat status EDM" },
    "apo": { "score": 0-100, "issues": [], "summary": "Penjelasan singkat status APO" },
    "bai": { "score": 0-100, "issues": [], "summary": "Penjelasan singkat status BAI" },
    "dss": { "score": 0-100, "issues": [], "summary": "Penjelasan singkat status DSS" },
    "mea": { "score": 0-100, "issues": [], "summary": "Penjelasan singkat status MEA" }
  }
}`;

    const userPrompt = `Analisis KRITIS jawaban IT Assessment berikut. Anda WAJIB menemukan semua inkonsistensi.

POLA INKONSISTENSI YANG SUDAH TERDETEKSI (WAJIB DIMASUKKAN KE FINDINGS):
${preAnalysis.length > 0 ? preAnalysis.join('\n') : 'Belum ada pre-analysis'}

HUBUNGAN PERTANYAAN UTAMA - SUB-PERTANYAAN:
${JSON.stringify(Object.entries(relationshipMap).map(([id, { main, subs }]) => ({
  mainId: id,
  mainAnswer: main.answer,
  subAnswers: subs.map(s => ({ id: s.id, answer: s.answer }))
})), null, 2)}

DATA LENGKAP (${answeredQuestions.length} pertanyaan terjawab):
${JSON.stringify(questionsSummary, null, 2)}

INSTRUKSI KRITIS:
1. SEMUA inkonsistensi di atas WAJIB masuk ke findings
2. Cari inkonsistensi tambahan berdasarkan logika COBIT
3. Berikan analysis_summary yang komprehensif
4. Jika ada inkonsistensi, consistency_score HARUS < 80
5. OUTPUT HANYA JSON MURNI, TANPA MARKDOWN, TANPA PENJELASAN SEBELUM/SESUDAH JSON`;

    console.log(`Processing AI validation for ${answeredQuestions.length} questions`);
    console.log(`Pre-analysis found ${preAnalysis.length} potential inconsistencies`);

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

    console.log("Raw AI response length:", content.length);

    // Parse AI response with robust JSON extraction
    let parsedResult;
    try {
      const jsonString = extractJSON(content);
      console.log("Extracted JSON length:", jsonString.length);
      parsedResult = JSON.parse(jsonString);
    } catch (parseError) {
      console.error("Failed to parse AI response:", parseError);
      console.log("Raw content preview:", content.substring(0, 500));
      
      // If AI found pre-analyzed inconsistencies, include them even if parsing fails
      const fallbackFindings = preAnalysis.map((desc, idx) => ({
        finding_type: 'logic_inconsistency',
        severity: 'major',
        question_ids: desc.match(/[A-Z]\.\d+(?:\.\d+)?(?:\.[a-z])?/g) || [],
        cobit_reference: 'N/A',
        description: desc,
        recommendation: 'Periksa dan koreksi inkonsistensi antara pertanyaan utama dan sub-pertanyaan'
      }));

      parsedResult = {
        findings: fallbackFindings,
        overall_risk_level: fallbackFindings.length > 0 ? "medium" : "low",
        consistency_score: Math.max(0, 100 - (fallbackFindings.length * 10)),
        analysis_summary: `Analisis AI mengalami kendala parsing, namun ditemukan ${fallbackFindings.length} inkonsistensi logika berdasarkan pre-analysis. Inkonsistensi ini terkait dengan ketidaksesuaian antara jawaban pertanyaan utama dan sub-pertanyaan. Diperlukan review manual untuk memastikan akurasi jawaban.`,
        cobit_compliance_summary: {
          edm: { score: 70, issues: [], summary: "Perlu review manual" },
          apo: { score: 70, issues: [], summary: "Perlu review manual" },
          bai: { score: 70, issues: [], summary: "Perlu review manual" },
          dss: { score: 70, issues: [], summary: "Perlu review manual" },
          mea: { score: 70, issues: [], summary: "Perlu review manual" }
        },
        parse_warning: true
      };
    }

    // Ensure findings array exists
    if (!parsedResult.findings) {
      parsedResult.findings = [];
    }

    // Ensure analysis_summary exists
    if (!parsedResult.analysis_summary) {
      const findingsCount = parsedResult.findings.length;
      if (findingsCount > 0) {
        parsedResult.analysis_summary = `Ditemukan ${findingsCount} inkonsistensi dalam jawaban assessment. Risk level: ${parsedResult.overall_risk_level}. Diperlukan tindakan perbaikan untuk memastikan kesesuaian antara klaim dan bukti yang tersedia.`;
      } else {
        parsedResult.analysis_summary = `Tidak ditemukan inkonsistensi signifikan dalam jawaban assessment. Jawaban menunjukkan konsistensi yang baik dengan skor ${parsedResult.consistency_score}%.`;
      }
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
      consistency_score: 0,
      analysis_summary: "Terjadi kesalahan dalam proses validasi AI. Silakan coba lagi."
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});