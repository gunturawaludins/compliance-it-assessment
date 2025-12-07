import { useState, useEffect } from 'react';
import { Header } from '@/components/Header';
import { Questionnaire } from '@/components/Questionnaire';
import { ExcelUploader } from '@/components/ExcelUploader';
import { Dashboard } from '@/components/Dashboard';
import { Question, FraudRule, AssessorInfo } from '@/types/assessment';
import { defaultFraudRules } from '@/data/fraudRules';
import { useToast } from '@/hooks/use-toast';

const STORAGE_KEY = 'it_audit_questions';
const RULES_KEY = 'it_audit_rules';
const ASSESSOR_KEY = 'it_audit_assessor';

export default function Index() {
  const [activeTab, setActiveTab] = useState<'editor' | 'upload' | 'dashboard'>('editor');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [rules, setRules] = useState<FraudRule[]>([]);
  const [assessorInfo, setAssessorInfo] = useState<AssessorInfo | undefined>();
  const [isLoaded, setIsLoaded] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const savedQuestions = localStorage.getItem(STORAGE_KEY);
    const savedRules = localStorage.getItem(RULES_KEY);
    const savedAssessor = localStorage.getItem(ASSESSOR_KEY);
    
    if (savedQuestions) {
      try {
        setQuestions(JSON.parse(savedQuestions));
      } catch {
        setQuestions([]);
      }
    }
    
    if (savedRules) {
      try {
        setRules(JSON.parse(savedRules));
      } catch {
        setRules(defaultFraudRules);
      }
    } else {
      setRules(defaultFraudRules);
    }

    if (savedAssessor) {
      try {
        setAssessorInfo(JSON.parse(savedAssessor));
      } catch {
        // ignore
      }
    }
    
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(questions));
    }
  }, [questions, isLoaded]);

  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem(RULES_KEY, JSON.stringify(rules));
    }
  }, [rules, isLoaded]);

  useEffect(() => {
    if (isLoaded && assessorInfo) {
      localStorage.setItem(ASSESSOR_KEY, JSON.stringify(assessorInfo));
    }
  }, [assessorInfo, isLoaded]);

  // CRITICAL: Reset all cache and previous data when submitting new assessment
  const handleQuestionnaireSubmit = (submittedQuestions: Question[]) => {
    // Clear all previous assessment data
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem('it_audit_ai_result');
    
    // Set fresh questions data
    setQuestions(submittedQuestions);
    setActiveTab('dashboard');
    
    toast({
      title: 'Assessment Submitted',
      description: 'Data baru telah disubmit. Dashboard telah direset.',
    });
  };

  const handleImportQuestions = (importedQuestions: Question[], importedAssessorInfo?: AssessorInfo) => {
    // Clear previous data when importing
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem('it_audit_ai_result');
    
    setQuestions(importedQuestions);
    if (importedAssessorInfo) {
      setAssessorInfo(importedAssessorInfo);
    }
    setActiveTab('dashboard');
  };

  const handleAnalyze = () => {
    toast({
      title: 'Analisis COBIT Selesai',
      description: 'Hasil deteksi fraud berdasarkan framework COBIT 2019 telah diperbarui',
    });
  };

  const handleResetData = () => {
    setQuestions([]);
    setRules(defaultFraudRules);
    setAssessorInfo(undefined);
    localStorage.removeItem(ASSESSOR_KEY);
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem('it_audit_ai_result');
    toast({
      title: 'Data Direset',
      description: 'Semua data assessment telah dikembalikan ke default',
    });
  };

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header activeTab={activeTab} onTabChange={setActiveTab} />
      
      <main className="container mx-auto px-4 py-6 max-w-6xl">
        {activeTab === 'editor' && (
          <div className="animate-fade-in">
            <Questionnaire onSubmit={handleQuestionnaireSubmit} initialQuestions={questions} />
          </div>
        )}
        
        {activeTab === 'upload' && (
          <div className="animate-fade-in">
            <ExcelUploader questions={questions} onImport={handleImportQuestions} assessorInfo={assessorInfo} />
          </div>
        )}
        
        {activeTab === 'dashboard' && (
          <div className="animate-fade-in">
            <Dashboard questions={questions} rules={rules} onAnalyze={handleAnalyze} assessorInfo={assessorInfo} />
          </div>
        )}
      </main>

      <footer className="border-t border-border/50 py-4 mt-8">
        <div className="container mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-sm text-muted-foreground">
            IT Audit Fraud Detector - COBIT 2019 Framework &copy; {new Date().getFullYear()}
          </p>
          <button
            onClick={handleResetData}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Reset Data Assessment
          </button>
        </div>
      </footer>
    </div>
  );
}
