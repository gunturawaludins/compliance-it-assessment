import { useState, useCallback } from 'react';
import { Question } from '@/types/assessment';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface AIFinding {
  finding_type: 'logic_inconsistency' | 'manipulation_pattern' | 'insufficient_evidence' | 'cobit_violation';
  severity: 'major' | 'minor';
  question_ids: string[];
  cobit_reference: string;
  description: string;
  recommendation: string;
}

export interface COBITComplianceScore {
  score: number;
  issues: string[];
}

export interface AIValidationResult {
  findings: AIFinding[];
  overall_risk_level: 'low' | 'medium' | 'high' | 'critical';
  consistency_score: number;
  cobit_compliance_summary: {
    edm: COBITComplianceScore;
    apo: COBITComplianceScore;
    bai: COBITComplianceScore;
    dss: COBITComplianceScore;
    mea: COBITComplianceScore;
  };
}

export function useAIValidation() {
  const [isValidating, setIsValidating] = useState(false);
  const [aiResult, setAiResult] = useState<AIValidationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const validateWithAI = useCallback(async (questions: Question[]) => {
    if (questions.length === 0) {
      toast({
        title: 'Tidak ada data',
        description: 'Silakan jawab pertanyaan terlebih dahulu',
        variant: 'destructive'
      });
      return null;
    }

    setIsValidating(true);
    setError(null);

    try {
      const { data, error: funcError } = await supabase.functions.invoke('ai-fraud-validation', {
        body: { questions }
      });

      if (funcError) {
        throw new Error(funcError.message);
      }

      if (data.error) {
        if (data.errorCode === 'RATE_LIMIT') {
          toast({
            title: 'Rate Limit',
            description: 'Terlalu banyak permintaan. Coba lagi dalam beberapa saat.',
            variant: 'destructive'
          });
        } else if (data.errorCode === 'PAYMENT_REQUIRED') {
          toast({
            title: 'Credit Habis',
            description: 'Silakan tambah credit AI untuk melanjutkan.',
            variant: 'destructive'
          });
        } else {
          throw new Error(data.error);
        }
        return null;
      }

      setAiResult(data);
      
      const findingsCount = data.findings?.length || 0;
      toast({
        title: 'AI Validation Selesai',
        description: `Ditemukan ${findingsCount} inkonsistensi. Risk level: ${data.overall_risk_level?.toUpperCase() || 'N/A'}`,
      });

      return data as AIValidationResult;

    } catch (err) {
      const message = err instanceof Error ? err.message : 'Terjadi kesalahan';
      setError(message);
      toast({
        title: 'Error AI Validation',
        description: message,
        variant: 'destructive'
      });
      return null;
    } finally {
      setIsValidating(false);
    }
  }, [toast]);

  const resetAIResult = useCallback(() => {
    setAiResult(null);
    setError(null);
  }, []);

  return {
    validateWithAI,
    isValidating,
    aiResult,
    error,
    resetAIResult
  };
}
