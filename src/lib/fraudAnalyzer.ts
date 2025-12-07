import { Question, FraudRule, FraudFinding, AssessmentResult, AspectScore, AspectCategory, ASPECT_LABELS } from '@/types/assessment';

export function analyzeFraud(
  questions: Question[],
  rules: FraudRule[]
): AssessmentResult {
  const findings: FraudFinding[] = [];
  const questionMap = new Map(questions.map(q => [q.id, q]));
  
  // Count answered questions
  const answeredQuestions = questions.filter(q => q.answer !== null && q.answer !== undefined);
  const totalQuestions = questions.filter(q => !q.id.startsWith('DP')).length;
  
  // Check each rule
  for (const rule of rules) {
    const conditionQuestion = questionMap.get(rule.conditionQuestionId);
    const evidenceQuestion = questionMap.get(rule.evidenceQuestionId);
    
    if (!conditionQuestion || !evidenceQuestion) continue;
    
    // Check if condition is met
    if (conditionQuestion.answer === rule.conditionAnswer) {
      let isFraud = false;
      
      if (rule.evidenceCondition === 'empty') {
        isFraud = !evidenceQuestion.answer || 
                  evidenceQuestion.answer === 'Tidak' ||
                  (evidenceQuestion.evidence === undefined || evidenceQuestion.evidence === '' || evidenceQuestion.evidence === null);
      } else if (rule.evidenceCondition === 'Tidak') {
        isFraud = evidenceQuestion.answer === 'Tidak';
      }
      
      if (isFraud) {
        findings.push({
          id: `FIND_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          ruleId: rule.id,
          ruleName: rule.name,
          questionId: conditionQuestion.id,
          questionText: conditionQuestion.text,
          evidenceId: evidenceQuestion.id,
          evidenceText: evidenceQuestion.text,
          severity: rule.severity,
          fraudType: rule.fraudType,
          description: rule.description,
          cobitRef: rule.cobitRef,
        });
      }
    }
  }

  // Additional Cross-Validation Logic
  const crossValidationFindings = performCrossValidation(questions, questionMap);
  findings.push(...crossValidationFindings);
  
  // Calculate aspect scores
  const aspects: AspectCategory[] = ['A', 'B', 'C', 'D'];
  const aspectScores: AspectScore[] = aspects.map(aspect => {
    const aspectQuestions = questions.filter(q => q.category === aspect && !q.isSubQuestion);
    const answered = aspectQuestions.filter(q => q.answer !== null && q.answer !== undefined);
    const yesAnswers = answered.filter(q => q.answer === 'Ya').length;
    const noAnswers = answered.filter(q => q.answer === 'Tidak').length;
    const aspectFindings = findings.filter(f => {
      const q = questionMap.get(f.questionId);
      return q?.category === aspect;
    });
    
    const complianceScore = answered.length > 0 
      ? Math.round((yesAnswers / answered.length) * 100) 
      : 0;
    
    return {
      aspect,
      aspectName: ASPECT_LABELS[aspect],
      totalQuestions: aspectQuestions.length,
      answeredQuestions: answered.length,
      yesAnswers,
      noAnswers,
      complianceScore,
      findings: aspectFindings,
    };
  });
  
  // Calculate scores
  const majorFindings = findings.filter(f => f.severity === 'major').length;
  const minorFindings = findings.filter(f => f.severity === 'minor').length;
  
  const penalty = (majorFindings * 10) + (minorFindings * 3);
  const honestyScore = Math.max(0, 100 - penalty);
  
  const inconsistentAnswers = findings.length;
  const consistentAnswers = answeredQuestions.length - inconsistentAnswers;
  
  return {
    totalQuestions,
    answeredQuestions: answeredQuestions.length,
    consistentAnswers: Math.max(0, consistentAnswers),
    inconsistentAnswers,
    honestyScore,
    findings,
    majorFindings,
    minorFindings,
    aspectScores,
  };
}

// Cross-validation logic for detecting inconsistencies
function performCrossValidation(questions: Question[], questionMap: Map<string, Question>): FraudFinding[] {
  const findings: FraudFinding[] = [];
  
  // Cross-validation rules based on logical dependencies
  const crossValidationRules = [
    // If claims to have IT Steering Committee but no documented meetings
    {
      condition: { id: 'A.5', answer: 'Ya' as const },
      evidence: { id: 'A.8', answer: 'Tidak' as const },
      finding: {
        ruleName: 'Komite TI Tanpa Dokumentasi Rapat',
        description: 'Klaim memiliki Komite Pengarah TI tetapi tidak ada bukti pertemuan berkala yang terdokumentasi',
        severity: 'major' as const,
        fraudType: 'Operasional Fiktif',
        cobitRef: 'EDM05 - Ensured Stakeholder Engagement',
      }
    },
    // If has IT policy but never reviewed
    {
      condition: { id: 'B.1', answer: 'Ya' as const },
      evidence: { id: 'B.2', answer: 'Tidak' as const },
      finding: {
        ruleName: 'Kebijakan TI Tidak Direview',
        description: 'Mengklaim memiliki kebijakan TI tetapi tidak pernah melakukan kaji ulang berkala',
        severity: 'major' as const,
        fraudType: 'Inkonsistensi Kebijakan',
        cobitRef: 'MEA01 - Managed Performance and Conformance',
      }
    },
    // If claims SDLC but no UAT
    {
      condition: { id: 'B.6.5', answer: 'Ya' as const },
      evidence: { id: 'B.14', answer: 'Tidak' as const },
      finding: {
        ruleName: 'Pengujian Tanpa Dokumentasi UAT',
        description: 'Klaim melakukan pengujian tetapi tidak ada Berita Acara UAT yang ditandatangani',
        severity: 'major' as const,
        fraudType: 'Bukti Tidak Memadai',
        cobitRef: 'BAI03.07 - Prepare for Solution Testing',
      }
    },
    // If claims backup but never tested
    {
      condition: { id: 'B.35', answer: 'Ya' as const },
      evidence: { id: 'B.35.c', answer: 'Tidak' as const },
      finding: {
        ruleName: 'Backup Tidak Pernah Diuji',
        description: 'Mengklaim melakukan backup tetapi tidak pernah melakukan uji coba restore',
        severity: 'major' as const,
        fraudType: 'Operasional Fiktif',
        cobitRef: 'DSS04.03 - Develop and Implement a Business Continuity Response',
      }
    },
    // If claims DRP but never tested
    {
      condition: { id: 'B.52', answer: 'Ya' as const },
      evidence: { id: 'B.59', answer: 'Tidak' as const },
      finding: {
        ruleName: 'DRP Tidak Pernah Diuji',
        description: 'Mengklaim memiliki DRP tetapi tidak pernah melakukan uji coba berkala',
        severity: 'major' as const,
        fraudType: 'Operasional Fiktif',
        cobitRef: 'DSS04.05 - Review, Maintain and Improve the Continuity Plan',
      }
    },
    // If claims risk management but no risk register
    {
      condition: { id: 'C.1', answer: 'Ya' as const },
      evidence: { id: 'C.4', answer: 'Tidak' as const },
      finding: {
        ruleName: 'Manajemen Risiko Tanpa Risk Register',
        description: 'Mengklaim memiliki manajemen risiko tetapi tidak ada proses identifikasi dan dokumentasi risiko',
        severity: 'major' as const,
        fraudType: 'Bukti Tidak Memadai',
        cobitRef: 'APO12.02 - Analyze Risk',
      }
    },
    // If claims internal control but no audit
    {
      condition: { id: 'D.1', answer: 'Ya' as const },
      evidence: { id: 'D.7', answer: 'Tidak' as const },
      finding: {
        ruleName: 'Pengendalian Internal Tanpa Audit',
        description: 'Mengklaim memiliki pengendalian internal tetapi tidak ada audit internal yang dilaksanakan',
        severity: 'major' as const,
        fraudType: 'Inkonsistensi Kebijakan',
        cobitRef: 'MEA04 - Managed Assurance',
      }
    },
    // If claims access control but no user access review
    {
      condition: { id: 'B.46', answer: 'Ya' as const },
      evidence: { id: 'B.46.c', answer: 'Tidak' as const },
      finding: {
        ruleName: 'Access Control Tanpa Review Berkala',
        description: 'Mengklaim menerapkan access control tetapi tidak melakukan user access review',
        severity: 'minor' as const,
        fraudType: 'Inkonsistensi Kebijakan',
        cobitRef: 'DSS05 - Managed Security Services',
      }
    },
    // If claims HR competency but no training budget realized
    {
      condition: { id: 'A.2.d', answer: 'Ya' as const },
      evidence: { id: 'A.2.d.c', answer: 'Tidak' as const },
      finding: {
        ruleName: 'Kompetensi SDM Tanpa Realisasi Pelatihan',
        description: 'Mengklaim memastikan kompetensi SDM TI tetapi anggaran pelatihan tidak terealisasi',
        severity: 'minor' as const,
        fraudType: 'Operasional Fiktif',
        cobitRef: 'APO07 - Managed Human Resources',
      }
    },
    // If claims vendor management but no SLA monitoring
    {
      condition: { id: 'B.23', answer: 'Ya' as const },
      evidence: { id: 'B.23.b', answer: 'Tidak' as const },
      finding: {
        ruleName: 'SLA Tanpa Klausul Penalti',
        description: 'Mengklaim memiliki SLA tetapi tidak ada klausul penalti untuk vendor',
        severity: 'minor' as const,
        fraudType: 'Bukti Tidak Memadai',
        cobitRef: 'APO10.03 - Manage Vendor Relationships',
      }
    },
  ];

  for (const rule of crossValidationRules) {
    const condQ = questionMap.get(rule.condition.id);
    const evidQ = questionMap.get(rule.evidence.id);
    
    if (condQ?.answer === rule.condition.answer && evidQ?.answer === rule.evidence.answer) {
      findings.push({
        id: `CROSS_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        ruleId: `CROSS_${rule.condition.id}_${rule.evidence.id}`,
        ruleName: rule.finding.ruleName,
        questionId: rule.condition.id,
        questionText: condQ.text,
        evidenceId: rule.evidence.id,
        evidenceText: evidQ?.text || '',
        severity: rule.finding.severity,
        fraudType: rule.finding.fraudType,
        description: rule.finding.description,
        cobitRef: rule.finding.cobitRef,
      });
    }
  }

  // Check for pattern-based fraud detection
  // Pattern 1: All main questions "Ya" but all sub-questions "Tidak"
  const mainQuestions = questions.filter(q => !q.isSubQuestion);
  const subQuestions = questions.filter(q => q.isSubQuestion);
  
  for (const mainQ of mainQuestions) {
    if (mainQ.answer === 'Ya') {
      const relatedSubs = subQuestions.filter(sq => sq.parentId === mainQ.id);
      const allSubsNo = relatedSubs.length > 0 && relatedSubs.every(sq => sq.answer === 'Tidak');
      
      if (allSubsNo && relatedSubs.length >= 2) {
        findings.push({
          id: `PATTERN_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          ruleId: `PATTERN_MAIN_YES_SUBS_NO_${mainQ.id}`,
          ruleName: 'Pola Inkonsistensi Jawaban',
          questionId: mainQ.id,
          questionText: mainQ.text,
          evidenceId: relatedSubs[0]?.id || '',
          evidenceText: `Semua ${relatedSubs.length} sub-pertanyaan dijawab "Tidak"`,
          severity: 'major',
          fraudType: 'Manipulasi Administratif',
          description: `Jawaban utama "Ya" tetapi semua ${relatedSubs.length} sub-pertanyaan dijawab "Tidak" - menunjukkan kemungkinan manipulasi jawaban`,
          cobitRef: 'MEA02 - Managed System of Internal Control',
        });
      }
    }
  }

  return findings;
}

export function getScoreColor(score: number): string {
  if (score >= 80) return 'text-green-600';
  if (score >= 60) return 'text-amber-600';
  return 'text-red-600';
}

export function getScoreLabel(score: number): string {
  if (score >= 90) return 'Sangat Baik';
  if (score >= 80) return 'Baik';
  if (score >= 70) return 'Cukup';
  if (score >= 60) return 'Kurang';
  return 'Buruk';
}

export function getScoreBgColor(score: number): string {
  if (score >= 80) return 'bg-green-100 dark:bg-green-900/30';
  if (score >= 60) return 'bg-amber-100 dark:bg-amber-900/30';
  return 'bg-red-100 dark:bg-red-900/30';
}
