import { Question, FraudRule, FraudFinding, AssessmentResult } from '@/types/assessment';

export function analyzeFraud(
  questions: Question[],
  rules: FraudRule[]
): AssessmentResult {
  const findings: FraudFinding[] = [];
  const questionMap = new Map(questions.map(q => [q.id, q]));
  
  // Count answered questions
  const answeredQuestions = questions.filter(q => q.answer !== null && q.answer !== undefined);
  const totalQuestions = questions.filter(q => !q.id.startsWith('DP')).length; // Exclude evidence questions from count
  
  // Check each rule
  for (const rule of rules) {
    const conditionQuestion = questionMap.get(rule.conditionQuestionId);
    const evidenceQuestion = questionMap.get(rule.evidenceQuestionId);
    
    if (!conditionQuestion || !evidenceQuestion) continue;
    
    // Check if condition is met (e.g., A.1 answered "Ya")
    if (conditionQuestion.answer === rule.conditionAnswer) {
      let isFraud = false;
      
      // Check evidence condition
      if (rule.evidenceCondition === 'empty') {
        // Evidence is empty, null, or "Tidak"
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
        });
      }
    }
  }
  
  // Calculate scores
  const majorFindings = findings.filter(f => f.severity === 'major').length;
  const minorFindings = findings.filter(f => f.severity === 'minor').length;
  
  // Calculate honesty score (100% - penalty)
  // Major findings: -10% each, Minor findings: -3% each
  const penalty = (majorFindings * 10) + (minorFindings * 3);
  const honestyScore = Math.max(0, 100 - penalty);
  
  // Calculate consistency
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
  };
}

export function getScoreColor(score: number): string {
  if (score >= 80) return 'text-success';
  if (score >= 60) return 'text-warning';
  return 'text-destructive';
}

export function getScoreLabel(score: number): string {
  if (score >= 90) return 'Sangat Baik';
  if (score >= 80) return 'Baik';
  if (score >= 70) return 'Cukup';
  if (score >= 60) return 'Kurang';
  return 'Buruk';
}
