export type AspectCategory = 'A' | 'B' | 'C' | 'D';

export interface AssessorInfo {
  namaDanaPensiun: string;
  namaPIC: string;
  nomorHP: string;
  jabatanPIC: string;
  memilikiUnitSyariah: boolean;
}

export interface DeepDive {
  focus: string;
  evaluate: string;
  monitor: string;
}

export interface DatabaseQuestion {
  id: string;
  aspect: AspectCategory;
  aspect_name: string;
  ojk_question: string;
  cobit_ref: string;
  breakdown: string[];
  deep_dive: DeepDive;
}

export interface Question {
  id: string;
  category: AspectCategory;
  parentId?: string;
  text: string;
  isSubQuestion: boolean;
  subLevel?: number;
  answer?: 'Ya' | 'Tidak' | null;
  evidence?: string;
  evidenceFile?: string;
  cobitRef?: string;
}

export interface QuestionnaireResponse {
  questionId: string;
  mainAnswer: 'Ya' | 'Tidak' | null;
  breakdownAnswers: { [key: number]: 'Ya' | 'Tidak' | null };
  evidenceFiles: string[];
  notes?: string;
}

export interface FraudRule {
  id: string;
  name: string;
  description: string;
  conditionQuestionId: string;
  conditionAnswer: 'Ya' | 'Tidak';
  evidenceQuestionId: string;
  evidenceCondition: 'empty' | 'Tidak';
  severity: 'major' | 'minor';
  fraudType: 'Manipulasi Administratif' | 'Operasional Fiktif' | 'Inkonsistensi Kebijakan' | 'Bukti Tidak Memadai';
  cobitRef?: string;
  standardRef?: string;
}

export interface FraudFinding {
  id: string;
  ruleId: string;
  ruleName: string;
  questionId: string;
  questionText: string;
  evidenceId: string;
  evidenceText: string;
  severity: 'major' | 'minor';
  fraudType: string;
  description: string;
  cobitRef?: string;
  standardRef?: string;
}

export interface AspectScore {
  aspect: AspectCategory;
  aspectName: string;
  totalQuestions: number;
  answeredQuestions: number;
  yesAnswers: number;
  noAnswers: number;
  complianceScore: number;
  findings: FraudFinding[];
}

export interface AssessmentResult {
  totalQuestions: number;
  answeredQuestions: number;
  consistentAnswers: number;
  inconsistentAnswers: number;
  honestyScore: number;
  findings: FraudFinding[];
  majorFindings: number;
  minorFindings: number;
  aspectScores: AspectScore[];
}

export const ASPECT_LABELS: Record<AspectCategory, string> = {
  A: 'Pengawasan Aktif Direksi & Dewan Komisaris',
  B: 'Kecukupan Kebijakan & Prosedur TI',
  C: 'Manajemen Risiko TI',
  D: 'Pengendalian Internal & Audit',
};

export const ASPECT_SHORT_LABELS: Record<AspectCategory, string> = {
  A: 'Tata Kelola',
  B: 'Kebijakan',
  C: 'Risiko',
  D: 'Audit',
};

export const ASPECT_ICONS: Record<AspectCategory, string> = {
  A: '👥',
  B: '📋',
  C: '⚠️',
  D: '🔍',
};
