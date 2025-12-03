import { useState, useEffect } from 'react';
import { Header } from '@/components/Header';
import { QuestionEditor } from '@/components/QuestionEditor';
import { ExcelUploader } from '@/components/ExcelUploader';
import { Dashboard } from '@/components/Dashboard';
import { Question, FraudRule } from '@/types/assessment';
import { defaultQuestions } from '@/data/defaultQuestions';
import { defaultFraudRules } from '@/data/fraudRules';
import { useToast } from '@/hooks/use-toast';

const STORAGE_KEY = 'it_audit_questions';
const RULES_KEY = 'it_audit_rules';

export default function Index() {
  const [activeTab, setActiveTab] = useState<'editor' | 'upload' | 'dashboard'>('editor');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [rules, setRules] = useState<FraudRule[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const { toast } = useToast();

  // Load from localStorage
  useEffect(() => {
    const savedQuestions = localStorage.getItem(STORAGE_KEY);
    const savedRules = localStorage.getItem(RULES_KEY);
    
    if (savedQuestions) {
      try {
        setQuestions(JSON.parse(savedQuestions));
      } catch {
        setQuestions(defaultQuestions);
      }
    } else {
      setQuestions(defaultQuestions);
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
    
    setIsLoaded(true);
  }, []);

  // Save to localStorage
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

  const handleImportQuestions = (importedQuestions: Question[]) => {
    setQuestions(importedQuestions);
    setActiveTab('dashboard');
  };

  const handleAnalyze = () => {
    toast({
      title: 'Analisis Selesai',
      description: 'Hasil deteksi fraud telah diperbarui',
    });
  };

  const handleResetData = () => {
    setQuestions(defaultQuestions);
    setRules(defaultFraudRules);
    toast({
      title: 'Data Direset',
      description: 'Semua data telah dikembalikan ke default',
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
    <div className="min-h-screen bg-background grid-pattern">
      <Header activeTab={activeTab} onTabChange={setActiveTab} />
      
      <main className="container mx-auto px-4 py-6 max-w-6xl">
        {activeTab === 'editor' && (
          <div className="animate-fade-in">
            <QuestionEditor questions={questions} onUpdate={setQuestions} />
          </div>
        )}
        
        {activeTab === 'upload' && (
          <div className="animate-fade-in">
            <ExcelUploader questions={questions} onImport={handleImportQuestions} />
          </div>
        )}
        
        {activeTab === 'dashboard' && (
          <div className="animate-fade-in">
            <Dashboard questions={questions} rules={rules} onAnalyze={handleAnalyze} />
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-border/50 py-4 mt-8">
        <div className="container mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-sm text-muted-foreground">
            IT Audit Fraud Assessment Detector &copy; {new Date().getFullYear()}
          </p>
          <button
            onClick={handleResetData}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Reset ke Data Default
          </button>
        </div>
      </footer>
    </div>
  );
}
