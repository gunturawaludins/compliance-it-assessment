export type AspectCategory = 'A' | 'B' | 'C' | 'D';

// COBIT 2019 Domain Types
export type COBITDomain = 'EDM' | 'APO' | 'BAI' | 'DSS' | 'MEA';

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
  requires_document?: boolean;
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
  evidenceCondition: 'empty' | 'Tidak' | 'harus Ya';
  severity: 'major' | 'minor';
  fraudType: string;
  cobitRef?: string;
  cobitDomain?: COBITDomain;
  cobitProcess?: string;
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

// COBIT 2019 Domain Information
export const COBIT_DOMAINS: Record<COBITDomain, { name: string; description: string; color: string }> = {
  EDM: { 
    name: 'Evaluate, Direct and Monitor', 
    description: 'Governance objectives ensuring stakeholder needs are evaluated',
    color: 'bg-purple-500'
  },
  APO: { 
    name: 'Align, Plan and Organize', 
    description: 'Management objectives for IT alignment with business strategy',
    color: 'bg-blue-500'
  },
  BAI: { 
    name: 'Build, Acquire and Implement', 
    description: 'Solution delivery and change management',
    color: 'bg-green-500'
  },
  DSS: { 
    name: 'Deliver, Service and Support', 
    description: 'Service delivery and support operations',
    color: 'bg-orange-500'
  },
  MEA: { 
    name: 'Monitor, Evaluate and Assess', 
    description: 'Performance monitoring and compliance',
    color: 'bg-red-500'
  }
};

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
  A: '🏛️',
  B: '📋',
  C: '⚠️',
  D: '🔍',
};

// COBIT Process mapping for each aspect
export const ASPECT_COBIT_MAPPING: Record<AspectCategory, COBITDomain[]> = {
  A: ['EDM', 'APO'], // Governance maps to EDM and APO domains
  B: ['BAI', 'DSS'], // Policies & Procedures maps to BAI and DSS domains
  C: ['APO', 'DSS'], // Risk Management maps to APO12 and DSS domains
  D: ['MEA']         // Audit maps to MEA domain
};
