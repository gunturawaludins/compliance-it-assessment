import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Progress } from '@/components/ui/progress';
import { 
  CheckCircle2, 
  XCircle, 
  ChevronRight, 
  FileText, 
  Upload, 
  Info, 
  AlertTriangle,
  BookOpen,
  Target,
  Eye,
  Send,
  Shuffle
} from 'lucide-react';
import { DatabaseQuestion, AspectCategory, Question, ASPECT_LABELS, ASPECT_ICONS } from '@/types/assessment';
import questionDatabase from '@/data/questionDatabase.json';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

const RESPONSES_STORAGE_KEY = 'questionnaire_responses';

interface QuestionnaireProps {
  onSubmit: (questions: Question[]) => void;
  initialQuestions?: Question[];
}

interface QuestionResponse {
  mainAnswer: 'Ya' | 'Tidak' | null;
  breakdownAnswers: ('Ya' | 'Tidak' | null)[];
  subQuestionAnswers: Record<string, 'Ya' | 'Tidak' | null>;
  subBreakdownAnswers: Record<string, ('Ya' | 'Tidak' | null)[]>;
  evidenceFiles: string[];
  notes: string;
}

export function Questionnaire({ onSubmit, initialQuestions }: QuestionnaireProps) {
  const [currentAspect, setCurrentAspect] = useState<AspectCategory>('A');
  const [responses, setResponses] = useState<Record<string, QuestionResponse>>({});
  const [expandedQuestion, setExpandedQuestion] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const { toast } = useToast();

  const questions = questionDatabase as DatabaseQuestion[];
  
  // Group questions by aspect
  const aspectQuestions = questions.reduce((acc, q) => {
    if (!acc[q.aspect]) acc[q.aspect] = [];
    acc[q.aspect].push(q);
    return acc;
  }, {} as Record<AspectCategory, DatabaseQuestion[]>);

  // Load responses from localStorage on mount
  useEffect(() => {
    try {
      const savedResponses = localStorage.getItem(RESPONSES_STORAGE_KEY);
      if (savedResponses) {
        const parsed = JSON.parse(savedResponses);
        setResponses(parsed);
      } else if (initialQuestions && initialQuestions.length > 0) {
        const newResponses: Record<string, QuestionResponse> = {};
        initialQuestions.forEach(q => {
          if (!newResponses[q.id]) {
            newResponses[q.id] = {
              mainAnswer: q.answer || null,
              breakdownAnswers: [],
              subQuestionAnswers: {},
              subBreakdownAnswers: {},
              evidenceFiles: q.evidenceFile ? [q.evidenceFile] : [],
              notes: q.evidence || ''
            };
          }
        });
        setResponses(newResponses);
      }
    } catch (e) {
      console.error('Failed to load saved responses:', e);
    }
    setIsLoaded(true);
  }, []);

  // Save responses to localStorage whenever they change
  useEffect(() => {
    if (isLoaded && Object.keys(responses).length > 0) {
      try {
        localStorage.setItem(RESPONSES_STORAGE_KEY, JSON.stringify(responses));
      } catch (e) {
        console.error('Failed to save responses:', e);
      }
    }
  }, [responses, isLoaded]);

  const getResponse = (questionId: string): QuestionResponse => {
    return responses[questionId] || {
      mainAnswer: null,
      breakdownAnswers: [],
      subQuestionAnswers: {},
      subBreakdownAnswers: {},
      evidenceFiles: [],
      notes: ''
    };
  };

  const updateResponse = (questionId: string, updates: Partial<QuestionResponse>) => {
    setResponses(prev => ({
      ...prev,
      [questionId]: { ...getResponse(questionId), ...updates }
    }));
  };

  const setMainAnswer = useCallback((questionId: string, answer: 'Ya' | 'Tidak') => {
    setResponses(prev => {
      const current = prev[questionId] || {
        mainAnswer: null,
        breakdownAnswers: [],
        subQuestionAnswers: {},
        subBreakdownAnswers: {},
        evidenceFiles: [],
        notes: ''
      };
      const newState = {
        ...prev,
        [questionId]: { ...current, mainAnswer: answer }
      };
      localStorage.setItem(RESPONSES_STORAGE_KEY, JSON.stringify(newState));
      return newState;
    });
  }, []);

  const setBreakdownAnswer = useCallback((questionId: string, index: number, answer: 'Ya' | 'Tidak') => {
    setResponses(prev => {
      const current = prev[questionId] || {
        mainAnswer: null,
        breakdownAnswers: [],
        subQuestionAnswers: {},
        subBreakdownAnswers: {},
        evidenceFiles: [],
        notes: ''
      };
      // Ensure array is properly sized
      const newBreakdown: ('Ya' | 'Tidak' | null)[] = [];
      for (let i = 0; i <= Math.max(index, current.breakdownAnswers.length - 1); i++) {
        newBreakdown[i] = current.breakdownAnswers[i] || null;
      }
      newBreakdown[index] = answer;
      
      const newState = {
        ...prev,
        [questionId]: { ...current, breakdownAnswers: newBreakdown }
      };
      // Save immediately to localStorage
      localStorage.setItem(RESPONSES_STORAGE_KEY, JSON.stringify(newState));
      return newState;
    });
  }, []);

  const setSubQuestionAnswer = useCallback((questionId: string, subQuestionId: string, answer: 'Ya' | 'Tidak') => {
    setResponses(prev => {
      const current = prev[questionId] || {
        mainAnswer: null,
        breakdownAnswers: [],
        subQuestionAnswers: {},
        subBreakdownAnswers: {},
        evidenceFiles: [],
        notes: ''
      };
      const newState = {
        ...prev,
        [questionId]: { 
          ...current, 
          subQuestionAnswers: { ...current.subQuestionAnswers, [subQuestionId]: answer }
        }
      };
      localStorage.setItem(RESPONSES_STORAGE_KEY, JSON.stringify(newState));
      return newState;
    });
  }, []);

  const setSubBreakdownAnswer = useCallback((questionId: string, subQuestionId: string, index: number, answer: 'Ya' | 'Tidak') => {
    setResponses(prev => {
      const current = prev[questionId] || {
        mainAnswer: null,
        breakdownAnswers: [],
        subQuestionAnswers: {},
        subBreakdownAnswers: {},
        evidenceFiles: [],
        notes: ''
      };
      const currentBreakdowns = current.subBreakdownAnswers[subQuestionId] || [];
      // Ensure array is properly sized
      const newBreakdowns: ('Ya' | 'Tidak' | null)[] = [];
      for (let i = 0; i <= Math.max(index, currentBreakdowns.length - 1); i++) {
        newBreakdowns[i] = currentBreakdowns[i] || null;
      }
      newBreakdowns[index] = answer;
      
      const newState = {
        ...prev,
        [questionId]: { 
          ...current, 
          subBreakdownAnswers: { ...current.subBreakdownAnswers, [subQuestionId]: newBreakdowns }
        }
      };
      localStorage.setItem(RESPONSES_STORAGE_KEY, JSON.stringify(newState));
      return newState;
    });
  }, []);

  const handleFileUpload = (questionId: string, event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      const fileNames = Array.from(files).map(f => f.name);
      const response = getResponse(questionId);
      updateResponse(questionId, { 
        evidenceFiles: [...response.evidenceFiles, ...fileNames] 
      });
      toast({
        title: 'Dokumen Ditambahkan',
        description: `${files.length} file berhasil ditambahkan sebagai bukti`
      });
    }
  };

  const calculateAspectProgress = (aspect: AspectCategory): number => {
    const aspectQs = aspectQuestions[aspect] || [];
    if (aspectQs.length === 0) return 0;
    const answered = aspectQs.filter(q => getResponse(q.id).mainAnswer !== null).length;
    return Math.round((answered / aspectQs.length) * 100);
  };

  const calculateTotalProgress = (): number => {
    const total = questions.length;
    const answered = questions.filter(q => getResponse(q.id).mainAnswer !== null).length;
    return Math.round((answered / total) * 100);
  };

  // Auto random answer for testing
  const handleAutoRandomAnswer = useCallback(() => {
    const newResponses: Record<string, QuestionResponse> = {};
    
    questions.forEach(dbQ => {
      const randomMain = Math.random() > 0.5 ? 'Ya' : 'Tidak';
      const breakdownAnswers = dbQ.breakdown.map(() => 
        Math.random() > 0.5 ? 'Ya' as const : 'Tidak' as const
      );
      
      const subQuestionAnswers: Record<string, 'Ya' | 'Tidak' | null> = {};
      const subBreakdownAnswers: Record<string, ('Ya' | 'Tidak' | null)[]> = {};
      
      if (dbQ.sub_questions) {
        dbQ.sub_questions.forEach(subQ => {
          subQuestionAnswers[subQ.id] = Math.random() > 0.5 ? 'Ya' : 'Tidak';
          subBreakdownAnswers[subQ.id] = subQ.breakdown.map(() => 
            Math.random() > 0.5 ? 'Ya' as const : 'Tidak' as const
          );
        });
      }
      
      newResponses[dbQ.id] = {
        mainAnswer: randomMain,
        breakdownAnswers,
        subQuestionAnswers,
        subBreakdownAnswers,
        evidenceFiles: [],
        notes: ''
      };
    });
    
    setResponses(newResponses);
    toast({
      title: 'Auto Random Answer',
      description: 'Semua pertanyaan telah dijawab secara random untuk uji coba'
    });
  }, [questions, toast]);

  // Clear all responses
  const handleClearResponses = useCallback(() => {
    setResponses({});
    localStorage.removeItem(RESPONSES_STORAGE_KEY);
    toast({
      title: 'Data Dihapus',
      description: 'Semua jawaban telah direset'
    });
  }, [toast]);

  const handleSubmit = () => {
    const answeredQuestions = questions.filter(q => getResponse(q.id).mainAnswer !== null);
    
    if (answeredQuestions.length === 0) {
      toast({
        title: 'Peringatan',
        description: 'Silakan jawab minimal satu pertanyaan sebelum submit',
        variant: 'destructive'
      });
      return;
    }

    // Convert to Question format
    const result: Question[] = [];
    
    questions.forEach(dbQ => {
      const response = getResponse(dbQ.id);
      if (response.mainAnswer) {
        // Main question
        result.push({
          id: dbQ.id,
          category: dbQ.aspect,
          text: dbQ.ojk_question,
          isSubQuestion: false,
          answer: response.mainAnswer,
          evidence: response.notes,
          evidenceFile: response.evidenceFiles.join(', '),
          cobitRef: dbQ.cobit_ref
        });

        // Breakdown questions
        dbQ.breakdown.forEach((bq, idx) => {
          if (response.breakdownAnswers[idx]) {
            result.push({
              id: `${dbQ.id}.BD.${idx + 1}`,
              category: dbQ.aspect,
              parentId: dbQ.id,
              text: bq,
              isSubQuestion: true,
              subLevel: 1,
              answer: response.breakdownAnswers[idx],
              cobitRef: dbQ.cobit_ref
            });
          }
        });

        // Sub questions
        if (dbQ.sub_questions) {
          dbQ.sub_questions.forEach(subQ => {
            const subAnswer = response.subQuestionAnswers[subQ.id];
            if (subAnswer) {
              result.push({
                id: subQ.id,
                category: dbQ.aspect,
                parentId: dbQ.id,
                text: subQ.text,
                isSubQuestion: true,
                subLevel: 1,
                answer: subAnswer,
                cobitRef: subQ.cobit_ref
              });

              // Sub breakdowns
              const subBreakdowns = response.subBreakdownAnswers[subQ.id] || [];
              subQ.breakdown.forEach((sbq, sbIdx) => {
                if (subBreakdowns[sbIdx]) {
                  result.push({
                    id: `${subQ.id}.BD.${sbIdx + 1}`,
                    category: dbQ.aspect,
                    parentId: subQ.id,
                    text: sbq,
                    isSubQuestion: true,
                    subLevel: 2,
                    answer: subBreakdowns[sbIdx],
                    cobitRef: subQ.cobit_ref
                  });
                }
              });
            }
          });
        }
      }
    });

    // Clear localStorage after successful submit
    localStorage.removeItem(RESPONSES_STORAGE_KEY);
    
    onSubmit(result);
    toast({
      title: 'Assessment Berhasil Disubmit',
      description: `${result.length} pertanyaan telah dijawab dan siap dianalisis`
    });
  };

  const aspects: AspectCategory[] = ['A', 'B', 'C', 'D'];

  return (
    <div className="space-y-6">
      {/* Progress Overview */}
      <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Target className="h-5 w-5 text-primary" />
            Progress Assessment
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Total Progress</span>
              <span className="font-semibold">{calculateTotalProgress()}%</span>
            </div>
            <Progress value={calculateTotalProgress()} className="h-3" />
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
            {aspects.map(aspect => (
              <div
                key={aspect}
                onClick={() => setCurrentAspect(aspect)}
                className={cn(
                  "p-3 rounded-lg cursor-pointer transition-all border",
                  currentAspect === aspect
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background hover:bg-muted border-border"
                )}
              >
                <div className="text-xl mb-1">{ASPECT_ICONS[aspect]}</div>
                <div className="text-xs font-medium truncate">Aspek {aspect}</div>
                <div className="text-xs opacity-80">{calculateAspectProgress(aspect)}%</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Current Aspect Header */}
      <Card>
        <CardHeader className="bg-muted/50">
          <div className="flex items-center justify-between">
            <div>
              <Badge variant="outline" className="mb-2">
                ASPEK {currentAspect}
              </Badge>
              <CardTitle className="text-xl">
                {ASPECT_LABELS[currentAspect]}
              </CardTitle>
              <CardDescription>
                {aspectQuestions[currentAspect]?.length || 0} pertanyaan dalam aspek ini
              </CardDescription>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-primary">
                {calculateAspectProgress(currentAspect)}%
              </div>
              <div className="text-sm text-muted-foreground">Selesai</div>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Questions List */}
      <div className="space-y-4">
        {(aspectQuestions[currentAspect] || []).map((question, qIndex) => {
          const response = getResponse(question.id);
          const isExpanded = expandedQuestion === question.id;

          return (
            <Card 
              key={question.id} 
              className={cn(
                "transition-all",
                response.mainAnswer && "border-l-4",
                response.mainAnswer === 'Ya' && "border-l-green-500",
                response.mainAnswer === 'Tidak' && "border-l-red-500"
              )}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-semibold text-primary">
                    {qIndex + 1}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="secondary" className="text-xs">
                        {question.id}
                      </Badge>
                      <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                        {question.cobit_ref}
                      </Badge>
                    </div>
                    <CardTitle className="text-base font-medium leading-relaxed">
                      {question.ojk_question}
                    </CardTitle>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Main Answer Buttons */}
                <div className="flex gap-3">
                  <Button
                    variant={response.mainAnswer === 'Ya' ? 'default' : 'outline'}
                    className={cn(
                      "flex-1 gap-2",
                      response.mainAnswer === 'Ya' && "bg-green-600 hover:bg-green-700"
                    )}
                    onClick={() => setMainAnswer(question.id, 'Ya')}
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Ya
                  </Button>
                  <Button
                    variant={response.mainAnswer === 'Tidak' ? 'default' : 'outline'}
                    className={cn(
                      "flex-1 gap-2",
                      response.mainAnswer === 'Tidak' && "bg-red-600 hover:bg-red-700"
                    )}
                    onClick={() => setMainAnswer(question.id, 'Tidak')}
                  >
                    <XCircle className="h-4 w-4" />
                    Tidak
                  </Button>
                </div>

                {/* Breakdown & Details - Always Visible */}
                <div className="space-y-4 pt-3 mt-3 border-t">
                    {/* Breakdown Questions */}
                    {question.breakdown.length > 0 && (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 text-sm font-medium">
                          <BookOpen className="h-4 w-4 text-primary" />
                          Pertanyaan Pendalaman (COBIT)
                        </div>
                        {question.breakdown.map((bq, bIndex) => (
                          <div key={bIndex} className="pl-4 border-l-2 border-muted">
                            <p className="text-sm text-muted-foreground mb-2">
                              {bIndex + 1}. {bq}
                            </p>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant={response.breakdownAnswers[bIndex] === 'Ya' ? 'default' : 'outline'}
                                className={cn(
                                  "h-7 text-xs",
                                  response.breakdownAnswers[bIndex] === 'Ya' && "bg-green-600"
                                )}
                                onClick={() => setBreakdownAnswer(question.id, bIndex, 'Ya')}
                              >
                                Ya
                              </Button>
                              <Button
                                size="sm"
                                variant={response.breakdownAnswers[bIndex] === 'Tidak' ? 'default' : 'outline'}
                                className={cn(
                                  "h-7 text-xs",
                                  response.breakdownAnswers[bIndex] === 'Tidak' && "bg-red-600"
                                )}
                                onClick={() => setBreakdownAnswer(question.id, bIndex, 'Tidak')}
                              >
                                Tidak
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Sub Questions */}
                    {question.sub_questions && question.sub_questions.length > 0 && (
                      <div className="space-y-3 mt-4">
                        <div className="flex items-center gap-2 text-sm font-medium">
                          <Eye className="h-4 w-4 text-primary" />
                          Sub-Pertanyaan
                        </div>
                        {question.sub_questions.map((subQ) => (
                          <div key={subQ.id} className="pl-4 border-l-2 border-primary/30 bg-primary/5 p-3 rounded-r-lg space-y-3">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/30">
                                {subQ.id}
                              </Badge>
                              <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                                {subQ.cobit_ref}
                              </Badge>
                            </div>
                            <p className="text-sm font-medium text-foreground">{subQ.text}</p>
                            
                            {/* Sub Question Answer Buttons */}
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant={response.subQuestionAnswers[subQ.id] === 'Ya' ? 'default' : 'outline'}
                                className={cn(
                                  "h-8 gap-1",
                                  response.subQuestionAnswers[subQ.id] === 'Ya' && "bg-green-600 hover:bg-green-700"
                                )}
                                onClick={() => setSubQuestionAnswer(question.id, subQ.id, 'Ya')}
                              >
                                <CheckCircle2 className="h-3 w-3" />
                                Ya
                              </Button>
                              <Button
                                size="sm"
                                variant={response.subQuestionAnswers[subQ.id] === 'Tidak' ? 'default' : 'outline'}
                                className={cn(
                                  "h-8 gap-1",
                                  response.subQuestionAnswers[subQ.id] === 'Tidak' && "bg-red-600 hover:bg-red-700"
                                )}
                                onClick={() => setSubQuestionAnswer(question.id, subQ.id, 'Tidak')}
                              >
                                <XCircle className="h-3 w-3" />
                                Tidak
                              </Button>
                            </div>
                            
                            {/* Sub Question Breakdown */}
                            {subQ.breakdown.length > 0 && (
                              <div className="space-y-2 mt-2 pt-2 border-t border-primary/10">
                                <p className="text-xs font-medium text-muted-foreground">Breakdown:</p>
                                {subQ.breakdown.map((bq, bIdx) => {
                                  const subBreakdowns = response.subBreakdownAnswers[subQ.id] || [];
                                  return (
                                    <div key={bIdx} className="pl-3 border-l border-muted space-y-2">
                                      <p className="text-xs text-muted-foreground">
                                        {bIdx + 1}. {bq}
                                      </p>
                                      <div className="flex gap-2">
                                        <Button
                                          size="sm"
                                          variant={subBreakdowns[bIdx] === 'Ya' ? 'default' : 'outline'}
                                          className={cn(
                                            "h-6 text-xs px-2",
                                            subBreakdowns[bIdx] === 'Ya' && "bg-green-600 hover:bg-green-700"
                                          )}
                                          onClick={() => setSubBreakdownAnswer(question.id, subQ.id, bIdx, 'Ya')}
                                        >
                                          Ya
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant={subBreakdowns[bIdx] === 'Tidak' ? 'default' : 'outline'}
                                          className={cn(
                                            "h-6 text-xs px-2",
                                            subBreakdowns[bIdx] === 'Tidak' && "bg-red-600 hover:bg-red-700"
                                          )}
                                          onClick={() => setSubBreakdownAnswer(question.id, subQ.id, bIdx, 'Tidak')}
                                        >
                                          Tidak
                                        </Button>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Evidence Upload */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <FileText className="h-4 w-4 text-primary" />
                        Bukti Dokumen
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="flex-1">
                          <input
                            type="file"
                            multiple
                            className="hidden"
                            onChange={(e) => handleFileUpload(question.id, e)}
                          />
                          <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-3 text-center cursor-pointer hover:border-primary/50 transition-colors">
                            <Upload className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
                            <p className="text-xs text-muted-foreground">
                              Klik untuk upload dokumen bukti
                            </p>
                          </div>
                        </label>
                      </div>
                      {response.evidenceFiles.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {response.evidenceFiles.map((file, fIndex) => (
                            <Badge key={fIndex} variant="secondary" className="text-xs">
                              📎 {file}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Notes */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <AlertTriangle className="h-4 w-4 text-primary" />
                        Catatan/Keterangan
                      </div>
                      <Textarea
                        placeholder="Tambahkan catatan atau keterangan tambahan..."
                        value={response.notes}
                        onChange={(e) => updateResponse(question.id, { notes: e.target.value })}
                        className="min-h-[80px] text-sm"
                      />
                    </div>
                  </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Navigation and Submit */}
      <Card className="sticky bottom-4 bg-background/95 backdrop-blur shadow-lg">
        <CardContent className="flex flex-col sm:flex-row items-center justify-between gap-3 py-4">
          <div className="flex gap-2">
            {aspects.map(aspect => (
              <Button
                key={aspect}
                size="sm"
                variant={currentAspect === aspect ? 'default' : 'outline'}
                onClick={() => setCurrentAspect(aspect)}
              >
                {aspect}
              </Button>
            ))}
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleClearResponses}
              className="text-destructive hover:text-destructive"
            >
              <XCircle className="h-4 w-4 mr-1" />
              Reset
            </Button>
            <Button 
              variant="secondary" 
              size="sm"
              onClick={handleAutoRandomAnswer}
            >
              <Shuffle className="h-4 w-4 mr-1" />
              Random (Uji)
            </Button>
            <Button onClick={handleSubmit} className="gap-2">
              <Send className="h-4 w-4" />
              Submit
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
