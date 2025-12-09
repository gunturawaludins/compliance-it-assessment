import { useState, useEffect } from 'react';
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
  Send
} from 'lucide-react';
import { DatabaseQuestion, AspectCategory, Question, ASPECT_LABELS, ASPECT_ICONS } from '@/types/assessment';
import questionDatabase from '@/data/questionDatabase.json';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface QuestionnaireProps {
  onSubmit: (questions: Question[]) => void;
  initialQuestions?: Question[];
}

interface QuestionResponse {
  mainAnswer: 'Ya' | 'Tidak' | null;
  breakdownAnswers: ('Ya' | 'Tidak' | null)[];
  evidenceFiles: string[];
  notes: string;
}

export function Questionnaire({ onSubmit, initialQuestions }: QuestionnaireProps) {
  const [currentAspect, setCurrentAspect] = useState<AspectCategory>('A');
  const [responses, setResponses] = useState<Record<string, QuestionResponse>>({});
  const [expandedQuestion, setExpandedQuestion] = useState<string | null>(null);
  const { toast } = useToast();

  const questions = questionDatabase as DatabaseQuestion[];
  
  // Group questions by aspect
  const aspectQuestions = questions.reduce((acc, q) => {
    if (!acc[q.aspect]) acc[q.aspect] = [];
    acc[q.aspect].push(q);
    return acc;
  }, {} as Record<AspectCategory, DatabaseQuestion[]>);

  // Initialize responses from initial questions
  useEffect(() => {
    if (initialQuestions && initialQuestions.length > 0) {
      const newResponses: Record<string, QuestionResponse> = {};
      initialQuestions.forEach(q => {
        if (!newResponses[q.id]) {
          newResponses[q.id] = {
            mainAnswer: q.answer || null,
            breakdownAnswers: [],
            evidenceFiles: q.evidenceFile ? [q.evidenceFile] : [],
            notes: q.evidence || ''
          };
        }
      });
      setResponses(newResponses);
    }
  }, [initialQuestions]);

  const getResponse = (questionId: string): QuestionResponse => {
    return responses[questionId] || {
      mainAnswer: null,
      breakdownAnswers: [],
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

  const setMainAnswer = (questionId: string, answer: 'Ya' | 'Tidak') => {
    updateResponse(questionId, { mainAnswer: answer });
  };

  const setBreakdownAnswer = (questionId: string, index: number, answer: 'Ya' | 'Tidak') => {
    const response = getResponse(questionId);
    const newBreakdown = [...response.breakdownAnswers];
    newBreakdown[index] = answer;
    updateResponse(questionId, { breakdownAnswers: newBreakdown });
  };

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
      }
    });

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

                {/* Expand/Collapse for Details */}
                <Button
                  variant="ghost"
                  className="w-full justify-between text-muted-foreground"
                  onClick={() => setExpandedQuestion(isExpanded ? null : question.id)}
                >
                  <span className="flex items-center gap-2">
                    <Info className="h-4 w-4" />
                    Breakdown & Bukti Dokumen
                  </span>
                  <ChevronRight className={cn(
                    "h-4 w-4 transition-transform",
                    isExpanded && "rotate-90"
                  )} />
                </Button>

                {isExpanded && (
                  <div className="space-y-4 pt-2 border-t">
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
                          <Eye className="h-4 w-4 text-amber-600" />
                          Sub-Pertanyaan
                        </div>
                        {question.sub_questions.map((subQ, subIndex) => (
                          <div key={subQ.id} className="pl-4 border-l-2 border-amber-300 bg-amber-50/50 dark:bg-amber-900/10 p-3 rounded-r-lg space-y-2">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant="outline" className="text-xs bg-amber-100 text-amber-800 border-amber-300">
                                {subQ.id}
                              </Badge>
                              <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                                {subQ.cobit_ref}
                              </Badge>
                            </div>
                            <p className="text-sm font-medium text-foreground">{subQ.text}</p>
                            {subQ.breakdown.length > 0 && (
                              <div className="space-y-1 mt-2">
                                {subQ.breakdown.map((bq, bIdx) => (
                                  <p key={bIdx} className="text-xs text-muted-foreground pl-2 border-l border-muted">
                                    {bq}
                                  </p>
                                ))}
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
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Navigation and Submit */}
      <Card className="sticky bottom-4 bg-background/95 backdrop-blur shadow-lg">
        <CardContent className="flex items-center justify-between py-4">
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
          <Button onClick={handleSubmit} className="gap-2">
            <Send className="h-4 w-4" />
            Submit Assessment
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
