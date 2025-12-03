export type AspectCategory = 'A' | 'B' | 'C' | 'D';

export interface AssessorInfo {
  namaDanaPensiun: string;
  namaPIC: string;
  nomorHP: string;
  jabatanPIC: string;
  memilikiUnitSyariah: boolean;
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
}

export const ASPECT_LABELS: Record<AspectCategory, string> = {
  A: 'Tata Kelola (Pengawasan Aktif Direksi & Komisaris)',
  B: 'Kebijakan & Prosedur Penggunaan TI',
  C: 'Risiko (Identifikasi, Pengukuran, Pengendalian)',
  D: 'Audit (Sistem Pengendalian Internal)',
};

export const ASPECT_SHORT_LABELS: Record<AspectCategory, string> = {
  A: 'Tata Kelola',
  B: 'Kebijakan',
  C: 'Risiko',
  D: 'Audit',
};
