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

// COBIT Reference mapping for semantic analysis
const COBIT_SEMANTIC_GROUPS = {
  governance: ['EDM01', 'EDM02', 'EDM03', 'EDM04', 'EDM05'],
  planning: ['APO01', 'APO02', 'APO03', 'APO04', 'APO05', 'APO06', 'APO07'],
  security: ['APO13', 'DSS05'],
  operations: ['DSS01', 'DSS02', 'DSS03', 'DSS04', 'DSS06'],
  monitoring: ['MEA01', 'MEA02', 'MEA03', 'MEA04'],
  implementation: ['BAI01', 'BAI02', 'BAI03', 'BAI04', 'BAI05', 'BAI06', 'BAI07', 'BAI08', 'BAI09', 'BAI10', 'BAI11'],
};

// Semantic keywords for NLP-based relationship detection
const SEMANTIC_RELATIONSHIPS = {
  policy_implementation: {
    keywords: ['kebijakan', 'prosedur', 'SOP', 'standar', 'pedoman'],
    relatedTo: ['implementasi', 'pelaksanaan', 'monitoring', 'review', 'evaluasi', 'audit']
  },
  governance_evidence: {
    keywords: ['struktur', 'tata kelola', 'governance', 'komite', 'dewan'],
    relatedTo: ['keputusan', 'rapat', 'notulen', 'laporan', 'dokumentasi']
  },
  risk_control: {
    keywords: ['risiko', 'risk', 'ancaman', 'kerentanan'],
    relatedTo: ['mitigasi', 'kontrol', 'pengendalian', 'monitoring', 'assessment']
  },
  security_compliance: {
    keywords: ['keamanan', 'security', 'akses', 'otentikasi', 'otorisasi'],
    relatedTo: ['kebijakan', 'prosedur', 'audit', 'monitoring', 'log']
  }
};

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

    // Filter to focus on Aspect B (Kebijakan dan Prosedur)
    const aspectBQuestions = questions.filter(q => q.category === 'B' || q.id.startsWith('B.'));
    const answeredQuestions = aspectBQuestions.filter(q => q.answer !== null);
    
    if (answeredQuestions.length === 0) {
      return new Response(JSON.stringify({
        findings: [],
        overall_risk_level: "low",
        consistency_score: 100,
        analysis_summary: "Tidak ada pertanyaan Aspek B yang dijawab untuk dianalisis.",
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

    // Build comprehensive relationship map
    const mainQuestions = answeredQuestions.filter(q => !q.parentId);
    const subQuestions = answeredQuestions.filter(q => q.parentId);
    
    // Enhanced relationship mapping with semantic analysis
    const relationshipMap: Record<string, { 
      main: QuestionData, 
      subs: QuestionData[],
      semanticLinks: string[]
    }> = {};
    
    mainQuestions.forEach(mq => {
      const subs = subQuestions.filter(sq => sq.parentId === mq.id);
      const semanticLinks: string[] = [];
      
      // Find semantic relationships based on question text
      Object.entries(SEMANTIC_RELATIONSHIPS).forEach(([relType, { keywords, relatedTo }]) => {
        const hasKeyword = keywords.some(kw => mq.text.toLowerCase().includes(kw.toLowerCase()));
        if (hasKeyword) {
          // Find other questions that should be related
          mainQuestions.forEach(otherQ => {
            if (otherQ.id !== mq.id) {
              const hasRelated = relatedTo.some(rel => 
                otherQ.text.toLowerCase().includes(rel.toLowerCase())
              );
              if (hasRelated) {
                semanticLinks.push(`${mq.id} <-> ${otherQ.id} (${relType})`);
              }
            }
          });
        }
      });
      
      relationshipMap[mq.id] = { main: mq, subs, semanticLinks };
    });

    // Advanced NLP-based pre-analysis
    const preAnalysis: { type: string; description: string; relatedQuestions: string[]; severity: string }[] = [];
    
    // Pattern 1: Main = Ya, ALL subs = Tidak
    Object.entries(relationshipMap).forEach(([mainId, { main, subs }]) => {
      if (subs.length > 0) {
        const allSubsNo = subs.every(s => s.answer === 'Tidak');
        const allSubsYes = subs.every(s => s.answer === 'Ya');
        const someSubsYes = subs.some(s => s.answer === 'Ya');
        
        if (main.answer === 'Ya' && allSubsNo) {
          preAnalysis.push({
            type: 'logic_inconsistency',
            description: `INKONSISTENSI MAYOR: Pertanyaan ${mainId} ("${main.text.substring(0, 100)}...") dijawab "Ya", namun SEMUA sub-pertanyaan (${subs.map(s => s.id).join(', ')}) dijawab "Tidak". Ini menunjukkan klaim yang tidak didukung bukti implementasi.`,
            relatedQuestions: [mainId, ...subs.map(s => s.id)],
            severity: 'major'
          });
        }
        
        if (main.answer === 'Tidak' && someSubsYes) {
          const yesSubIds = subs.filter(s => s.answer === 'Ya').map(s => s.id);
          preAnalysis.push({
            type: 'logic_inconsistency',
            description: `INKONSISTENSI: Pertanyaan ${mainId} ("${main.text.substring(0, 100)}...") dijawab "Tidak", tetapi sub-pertanyaan ${yesSubIds.join(', ')} dijawab "Ya". Ini menunjukkan ketidaksesuaian antara deklarasi utama dan detail implementasi.`,
            relatedQuestions: [mainId, ...yesSubIds],
            severity: 'major'
          });
        }
      }
    });

    // Pattern 2: Cross-question semantic inconsistency
    const policyQuestions = answeredQuestions.filter(q => 
      q.text.toLowerCase().includes('kebijakan') || 
      q.text.toLowerCase().includes('prosedur') ||
      q.text.toLowerCase().includes('standar')
    );
    
    const implementationQuestions = answeredQuestions.filter(q =>
      q.text.toLowerCase().includes('implementasi') ||
      q.text.toLowerCase().includes('pelaksanaan') ||
      q.text.toLowerCase().includes('dilakukan')
    );
    
    const reviewQuestions = answeredQuestions.filter(q =>
      q.text.toLowerCase().includes('review') ||
      q.text.toLowerCase().includes('evaluasi') ||
      q.text.toLowerCase().includes('audit') ||
      q.text.toLowerCase().includes('monitoring')
    );

    // Check: Policy claimed but no review/monitoring
    policyQuestions.forEach(pq => {
      if (pq.answer === 'Ya') {
        const hasRelatedReview = reviewQuestions.some(rq => 
          rq.answer === 'Ya' && 
          (rq.text.toLowerCase().includes(pq.text.substring(0, 30).toLowerCase()) ||
           rq.parentId === pq.id ||
           pq.parentId === rq.id)
        );
        
        if (!hasRelatedReview && reviewQuestions.length > 0) {
          const noReviewIds = reviewQuestions.filter(r => r.answer === 'Tidak').map(r => r.id);
          if (noReviewIds.length > 0) {
            preAnalysis.push({
              type: 'insufficient_evidence',
              description: `KETERKAITAN TERDETEKSI: Pertanyaan ${pq.id} mengklaim adanya kebijakan/prosedur ("${pq.text.substring(0, 80)}..."), namun pertanyaan terkait review/monitoring (${noReviewIds.slice(0, 3).join(', ')}) dijawab "Tidak". Kebijakan tanpa mekanisme review menunjukkan potensi lack of governance.`,
              relatedQuestions: [pq.id, ...noReviewIds.slice(0, 3)],
              severity: 'minor'
            });
          }
        }
      }
    });

    // Pattern 3: Perfect pattern detection (all Yes or all No)
    const yesCount = answeredQuestions.filter(q => q.answer === 'Ya').length;
    const noCount = answeredQuestions.filter(q => q.answer === 'Tidak').length;
    const totalAnswered = answeredQuestions.length;
    
    if (yesCount === totalAnswered && totalAnswered >= 5) {
      preAnalysis.push({
        type: 'manipulation_pattern',
        description: `POLA MENCURIGAKAN: Semua ${totalAnswered} pertanyaan Aspek B dijawab "Ya" (100%). Pola jawaban sempurna ini sangat tidak realistis dan mengindikasikan potensi manipulasi atau pengisian tanpa assessment yang proper.`,
        relatedQuestions: answeredQuestions.map(q => q.id).slice(0, 5),
        severity: 'major'
      });
    }
    
    if (noCount === totalAnswered && totalAnswered >= 5) {
      preAnalysis.push({
        type: 'cobit_violation',
        description: `KEPATUHAN KRITIS: Semua ${totalAnswered} pertanyaan Aspek B dijawab "Tidak" (0% compliance). Ini menunjukkan tidak adanya kebijakan dan prosedur TI yang fundamental, melanggar prinsip dasar COBIT 2019 domain APO.`,
        relatedQuestions: answeredQuestions.map(q => q.id).slice(0, 5),
        severity: 'major'
      });
    }

    const questionsSummary = answeredQuestions.map(q => ({
      id: q.id,
      text: q.text,
      answer: q.answer,
      category: q.category,
      cobitRef: q.cobitRef || 'N/A',
      parentId: q.parentId || null,
      isSubQuestion: q.isSubQuestion || false,
    }));

    const systemPrompt = `Anda adalah AI auditor profesional yang SANGAT KRITIS dalam menganalisis IT Assessment berdasarkan COBIT 2019.

FOKUS ANALISIS: ASPEK B - Kecukupan Kebijakan dan Prosedur Penggunaan Teknologi Informasi

DOMAIN COBIT 2019 RELEVAN UNTUK ASPEK B:
- APO01: Managed I&T Management Framework - Kebijakan pengelolaan TI
- APO02: Managed Strategy - Strategi TI
- APO03: Managed Enterprise Architecture - Arsitektur enterprise
- APO13: Managed Security - Kebijakan keamanan informasi
- BAI01: Managed Programs - Pengelolaan program TI
- DSS05: Managed Security Services - Layanan keamanan

METODOLOGI ANALISIS NLP:

1. ANALISIS SEMANTIK KETERKAITAN:
   - Identifikasi hubungan logis antar pertanyaan berdasarkan KONTEKS dan KATA KUNCI
   - Pertanyaan tentang "kebijakan" HARUS memiliki keterkaitan dengan "implementasi" dan "review"
   - Pertanyaan tentang "prosedur" HARUS memiliki keterkaitan dengan "pelaksanaan" dan "monitoring"
   - Jelaskan MENGAPA pertanyaan tersebut saling terkait

2. DETEKSI INKONSISTENSI BERBASIS KETERKAITAN:
   - Jika ada kebijakan (Ya) tapi tidak ada review (Tidak) = INKONSISTEN
   - Jika ada prosedur (Ya) tapi tidak ada pelaksanaan (Tidak) = INKONSISTEN
   - Jika utama Ya tapi semua sub Tidak = INKONSISTEN MAYOR
   - Jelaskan KETERKAITAN LOGIS antara pertanyaan yang inkonsisten

3. FORMAT PENJELASAN KETERKAITAN:
   Setiap finding HARUS menjelaskan:
   - Pertanyaan A terkait dengan Pertanyaan B karena [alasan semantik]
   - Jawaban A adalah [X] sedangkan jawaban B adalah [Y]
   - Ini inkonsisten karena [penjelasan logis]
   - Dampak: [implikasi pada governance/compliance]

OUTPUT FORMAT (HANYA JSON MURNI):
{
  "findings": [
    {
      "finding_type": "logic_inconsistency|manipulation_pattern|insufficient_evidence|cobit_violation",
      "severity": "major|minor",
      "question_ids": ["ID1", "ID2"],
      "cobit_reference": "APO01.01",
      "relationship_explanation": "Penjelasan detail MENGAPA pertanyaan-pertanyaan ini saling terkait dan BAGAIMANA keterkaitan ini menunjukkan inkonsistensi",
      "description": "Deskripsi temuan dengan konteks keterkaitan",
      "recommendation": "Rekomendasi perbaikan konkret"
    }
  ],
  "overall_risk_level": "low|medium|high|critical",
  "consistency_score": 0-100,
  "analysis_summary": "Penjelasan 3-4 paragraf tentang: (1) Ringkasan hasil assessment Aspek B, (2) Pola keterkaitan antar pertanyaan yang ditemukan, (3) Inkonsistensi utama dan dampaknya, (4) Rekomendasi perbaikan prioritas",
  "cobit_compliance_summary": {
    "edm": { "score": 0-100, "issues": [], "summary": "Status EDM berdasarkan jawaban" },
    "apo": { "score": 0-100, "issues": [], "summary": "Status APO - PALING RELEVAN untuk Aspek B" },
    "bai": { "score": 0-100, "issues": [], "summary": "Status BAI" },
    "dss": { "score": 0-100, "issues": [], "summary": "Status DSS" },
    "mea": { "score": 0-100, "issues": [], "summary": "Status MEA" }
  },
  "semantic_relationships_found": [
    {
      "question_pair": ["ID1", "ID2"],
      "relationship_type": "policy-implementation|policy-review|process-monitoring",
      "consistency": "consistent|inconsistent",
      "explanation": "Penjelasan hubungan semantik"
    }
  ]
}`;

    const userPrompt = `Analisis KRITIS dengan pendekatan NLP untuk Aspek B (Kebijakan dan Prosedur TI).

PRE-ANALYSIS INKONSISTENSI TERDETEKSI (WAJIB DIMASUKKAN):
${preAnalysis.length > 0 ? preAnalysis.map(p => `
[${p.severity.toUpperCase()}] ${p.type}
Pertanyaan Terkait: ${p.relatedQuestions.join(', ')}
Detail: ${p.description}
`).join('\n') : 'Belum ada inkonsistensi yang terdeteksi oleh pre-analysis.'}

HUBUNGAN SEMANTIK ANTAR PERTANYAAN:
${Object.entries(relationshipMap)
  .filter(([_, { semanticLinks }]) => semanticLinks.length > 0)
  .map(([id, { semanticLinks }]) => `${id}: ${semanticLinks.join('; ')}`)
  .join('\n') || 'Tidak ada hubungan semantik yang terdeteksi.'}

STRUKTUR PERTANYAAN UTAMA - SUB-PERTANYAAN:
${JSON.stringify(Object.entries(relationshipMap).map(([id, { main, subs }]) => ({
  mainId: id,
  mainText: main.text.substring(0, 150),
  mainAnswer: main.answer,
  subQuestions: subs.map(s => ({ 
    id: s.id, 
    text: s.text.substring(0, 100),
    answer: s.answer 
  }))
})), null, 2)}

DATA LENGKAP ASPEK B (${answeredQuestions.length} pertanyaan terjawab):
${JSON.stringify(questionsSummary, null, 2)}

INSTRUKSI ANALISIS:
1. SEMUA inkonsistensi dari pre-analysis WAJIB dimasukkan ke findings dengan penjelasan keterkaitan
2. Cari inkonsistensi TAMBAHAN berdasarkan hubungan semantik antar pertanyaan
3. Untuk SETIAP finding, jelaskan KETERKAITAN LOGIS dengan jelas
4. Berikan analysis_summary yang KOMPREHENSIF menjelaskan pola dan keterkaitan
5. Jika ada inkonsistensi mayor, consistency_score HARUS < 70
6. OUTPUT HANYA JSON MURNI, TANPA MARKDOWN`;

    console.log(`Processing AI NLP validation for ${answeredQuestions.length} Aspect B questions`);
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
      
      // If AI fails, use pre-analyzed inconsistencies with detailed descriptions
      const fallbackFindings = preAnalysis.map((item) => ({
        finding_type: item.type,
        severity: item.severity,
        question_ids: item.relatedQuestions,
        cobit_reference: 'APO01',
        relationship_explanation: `Keterkaitan terdeteksi melalui analisis logika jawaban: ${item.description}`,
        description: item.description,
        recommendation: 'Periksa dan koreksi inkonsistensi antara pertanyaan terkait untuk memastikan konsistensi jawaban assessment.'
      }));

      const majorCount = fallbackFindings.filter(f => f.severity === 'major').length;
      
      parsedResult = {
        findings: fallbackFindings,
        overall_risk_level: majorCount >= 2 ? "high" : majorCount >= 1 ? "medium" : "low",
        consistency_score: Math.max(0, 100 - (majorCount * 15) - (fallbackFindings.length - majorCount) * 5),
        analysis_summary: `Analisis Aspek B (Kebijakan dan Prosedur TI) mengidentifikasi ${fallbackFindings.length} inkonsistensi melalui pre-analysis berbasis logika.

${majorCount > 0 ? `Ditemukan ${majorCount} inkonsistensi MAYOR yang menunjukkan ketidaksesuaian signifikan antara klaim kebijakan dan bukti implementasi. Pola ini mengindikasikan potensi pengisian assessment yang tidak akurat atau kurangnya pemahaman terhadap kondisi aktual organisasi.` : ''}

Rekomendasi: Lakukan review ulang terhadap jawaban yang teridentifikasi inkonsisten. Pastikan setiap klaim adanya kebijakan didukung oleh bukti review, monitoring, dan implementasi yang sesuai.`,
        cobit_compliance_summary: {
          edm: { score: 70, issues: [], summary: "Perlu verifikasi governance" },
          apo: { score: Math.max(0, 100 - (majorCount * 20)), issues: preAnalysis.map(p => p.description.substring(0, 100)), summary: "Domain paling relevan untuk Aspek B - ditemukan inkonsistensi" },
          bai: { score: 75, issues: [], summary: "Perlu verifikasi implementasi" },
          dss: { score: 75, issues: [], summary: "Perlu verifikasi operasional" },
          mea: { score: 70, issues: [], summary: "Perlu verifikasi monitoring" }
        },
        parse_warning: true
      };
    }

    // Ensure findings array exists and has relationship explanations
    if (!parsedResult.findings) {
      parsedResult.findings = [];
    }
    
    // Add pre-analysis findings if not already included
    preAnalysis.forEach(preItem => {
      const exists = parsedResult.findings.some((f: any) => 
        f.question_ids?.some((id: string) => preItem.relatedQuestions.includes(id))
      );
      
      if (!exists) {
        parsedResult.findings.push({
          finding_type: preItem.type,
          severity: preItem.severity,
          question_ids: preItem.relatedQuestions,
          cobit_reference: 'APO01',
          relationship_explanation: `Hubungan logis terdeteksi: ${preItem.description}`,
          description: preItem.description,
          recommendation: 'Review dan perbaiki inkonsistensi untuk memastikan jawaban mencerminkan kondisi aktual.'
        });
      }
    });

    // Ensure analysis_summary exists and is comprehensive
    if (!parsedResult.analysis_summary || parsedResult.analysis_summary.length < 100) {
      const findingsCount = parsedResult.findings.length;
      const majorFindings = parsedResult.findings.filter((f: any) => f.severity === 'major').length;
      
      parsedResult.analysis_summary = `Hasil Analisis AI Cross-Validation untuk Aspek B (Kebijakan dan Prosedur TI):

Dari ${answeredQuestions.length} pertanyaan Aspek B yang terjawab, ditemukan ${findingsCount} inkonsistensi melalui analisis NLP dan deteksi pola. ${majorFindings > 0 ? `Terdapat ${majorFindings} temuan MAYOR yang memerlukan perhatian segera.` : 'Tidak ditemukan temuan mayor yang kritis.'}

${findingsCount > 0 ? `Pola inkonsistensi yang ditemukan menunjukkan ketidaksesuaian antara klaim adanya kebijakan dengan bukti implementasi atau mekanisme review yang memadai. Hal ini perlu ditindaklanjuti dengan verifikasi dokumentasi dan bukti pelaksanaan.` : 'Secara keseluruhan jawaban menunjukkan konsistensi yang baik antara klaim kebijakan dan bukti pendukung.'}

Rekomendasi: ${majorFindings >= 2 ? 'Lakukan audit menyeluruh terhadap dokumentasi kebijakan dan prosedur TI. Pastikan setiap kebijakan memiliki mekanisme review dan bukti implementasi yang terdokumentasi.' : 'Pertahankan konsistensi jawaban dan pastikan dokumentasi pendukung tersedia untuk setiap klaim kebijakan.'}`;
    }

    console.log(`AI NLP validation completed. Findings: ${parsedResult.findings?.length || 0}`);

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
