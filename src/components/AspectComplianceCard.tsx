import { useMemo, useState } from 'react';
import { 
  CheckCircle2, 
  AlertTriangle, 
  TrendingUp,
  FileText,
  Shield,
  ChevronDown,
  ChevronRight,
  Info,
  Link2,
  X
} from 'lucide-react';
import { Question, FraudFinding, AspectCategory, ASPECT_LABELS, ASPECT_SHORT_LABELS, ASPECT_ICONS, ASPECT_COBIT_MAPPING, COBIT_DOMAINS, COBITDomain } from '@/types/assessment';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";

interface AspectComplianceCardProps {
  aspect: AspectCategory;
  questions: Question[];
  findings: FraudFinding[];
}

interface COBITDomainStat {
  domain: COBITDomain;
  total: number;
  compliant: number;
  percentage: number;
}

export function AspectComplianceCard({ aspect, questions, findings }: AspectComplianceCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showAllFindings, setShowAllFindings] = useState(false);
  const [selectedFinding, setSelectedFinding] = useState<FraudFinding | null>(null);

  // Filter questions for this aspect
  const aspectQuestions = useMemo(() => {
    return questions.filter(q => q.category === aspect && !q.id.startsWith('DP'));
  }, [questions, aspect]);

  // Calculate compliance stats
  const stats = useMemo(() => {
    const total = aspectQuestions.length;
    const answered = aspectQuestions.filter(q => q.answer).length;
    const compliant = aspectQuestions.filter(q => q.answer === 'Ya').length;
    const nonCompliant = aspectQuestions.filter(q => q.answer === 'Tidak').length;
    const complianceRate = answered > 0 ? Math.round((compliant / answered) * 100) : 0;

    return { total, answered, compliant, nonCompliant, complianceRate };
  }, [aspectQuestions]);

  // Filter findings for this aspect
  const aspectFindings = useMemo(() => {
    return findings.filter(f => {
      const questionId = f.questionId || '';
      return questionId.startsWith(aspect);
    });
  }, [findings, aspect]);

  // Get related question for a finding
  const getRelatedQuestion = (questionId: string): Question | undefined => {
    return questions.find(q => q.id === questionId || questionId.startsWith(q.id));
  };

  // Generate explanation for a finding
  const generateFindingExplanation = (finding: FraudFinding): string => {
    const relatedQ = getRelatedQuestion(finding.questionId);
    
    let explanation = `Temuan ini terdeteksi berdasarkan analisis jawaban pada soal ${finding.questionId}. `;
    
    // Use fraudType instead of ruleType
    const fraudType = finding.fraudType?.toLowerCase() || '';
    
    if (fraudType.includes('evidence') || fraudType.includes('bukti')) {
      explanation += `Jawaban positif ("Ya") diberikan tetapi tidak disertai bukti dokumen pendukung yang memadai. Hal ini menimbulkan keraguan terhadap kebenaran klaim compliance.`;
    } else if (fraudType.includes('inkonsistensi') || fraudType.includes('inconsisten')) {
      explanation += `Terdeteksi inkonsistensi antara kebijakan yang diklaim dengan implementasi operasional. Jawaban pada pertanyaan terkait menunjukkan ketidaksesuaian.`;
    } else if (fraudType.includes('gap') || fraudType.includes('kontrol')) {
      explanation += `Terdapat kesenjangan kontrol dimana kontrol yang seharusnya ada tidak teridentifikasi atau tidak berjalan dengan baik.`;
    } else if (fraudType.includes('violation') || fraudType.includes('pelanggaran')) {
      explanation += `Jawaban menunjukkan pelanggaran terhadap standar compliance COBIT yang berlaku untuk domain terkait.`;
    } else {
      explanation += finding.description || `Pola jawaban menunjukkan potensi ketidaksesuaian dengan standar assessment yang berlaku.`;
    }
    
    return explanation;
  };

  // Generate relationship explanation
  const generateRelationshipExplanation = (finding: FraudFinding): string => {
    const relatedQ = getRelatedQuestion(finding.questionId);
    
    if (!relatedQ) return '';
    
    let relationship = `Soal ${finding.questionId} berkaitan dengan domain COBIT ${relatedQ.cobitRef || 'N/A'}. `;
    
    if (finding.severity === 'major') {
      relationship += `Sebagai temuan MAYOR, ini menunjukkan risiko signifikan terhadap integritas assessment. `;
      relationship += `Perlu dilakukan verifikasi lebih lanjut dan perbaikan segera untuk memastikan kepatuhan.`;
    } else {
      relationship += `Sebagai temuan MINOR, ini perlu diperhatikan untuk perbaikan berkelanjutan. `;
      relationship += `Meskipun tidak kritis, temuan ini tetap mempengaruhi skor compliance keseluruhan.`;
    }
    
    return relationship;
  };

  // Calculate COBIT domain breakdown for this aspect
  const cobitDomainStats = useMemo(() => {
    const relevantDomains = ASPECT_COBIT_MAPPING[aspect];
    const domainStats: COBITDomainStat[] = [];

    relevantDomains.forEach(domain => {
      // Find questions related to this COBIT domain based on cobitRef
      const domainQuestions = aspectQuestions.filter(q => {
        const ref = q.cobitRef?.toUpperCase() || '';
        return ref.startsWith(domain);
      });

      const total = domainQuestions.length;
      const compliant = domainQuestions.filter(q => q.answer === 'Ya').length;
      const answered = domainQuestions.filter(q => q.answer).length;
      const percentage = answered > 0 ? Math.round((compliant / answered) * 100) : 0;

      if (total > 0) {
        domainStats.push({
          domain,
          total,
          compliant,
          percentage
        });
      }
    });

    return domainStats;
  }, [aspectQuestions, aspect]);

  // Get color classes based on aspect
  const getAspectColor = (aspect: AspectCategory) => {
    switch (aspect) {
      case 'A': return { bg: 'bg-primary/10', text: 'text-primary', border: 'border-primary/30', progress: 'bg-primary' };
      case 'B': return { bg: 'bg-accent/10', text: 'text-accent', border: 'border-accent/30', progress: 'bg-accent' };
      case 'C': return { bg: 'bg-warning/10', text: 'text-warning', border: 'border-warning/30', progress: 'bg-warning' };
      case 'D': return { bg: 'bg-success/10', text: 'text-success', border: 'border-success/30', progress: 'bg-success' };
    }
  };

  const colors = getAspectColor(aspect);

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-success';
    if (score >= 60) return 'text-warning';
    return 'text-destructive';
  };

  const getScoreBg = (score: number) => {
    if (score >= 80) return 'bg-success';
    if (score >= 60) return 'bg-warning';
    return 'bg-destructive';
  };

  return (
    <div className={`glass-card rounded-2xl overflow-hidden border ${colors.border}`}>
      {/* Header */}
      <div className={`p-4 ${colors.bg}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${colors.bg} border ${colors.border}`}>
              <span className="text-2xl">{ASPECT_ICONS[aspect]}</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className={`text-xl font-bold ${colors.text}`}>Aspek {aspect}</span>
                <span className="text-sm text-muted-foreground">• {ASPECT_SHORT_LABELS[aspect]}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5 max-w-md truncate">
                {ASPECT_LABELS[aspect]}
              </p>
            </div>
          </div>
          <div className={`px-4 py-2 rounded-xl ${stats.complianceRate >= 80 ? 'bg-success/20' : stats.complianceRate >= 60 ? 'bg-warning/20' : 'bg-destructive/20'}`}>
            <span className={`text-2xl font-bold ${getScoreColor(stats.complianceRate)}`}>
              {stats.complianceRate}%
            </span>
            <p className="text-xs text-muted-foreground text-center">Compliance</p>
          </div>
        </div>
      </div>

      {/* Main Stats */}
      <div className="p-4 space-y-4">
        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between items-center text-sm">
            <span className="text-muted-foreground flex items-center gap-1">
              <CheckCircle2 className="w-4 h-4 text-success" />
              Compliance Progress
            </span>
            <span className="font-semibold text-foreground">
              {stats.compliant} dari {stats.answered} terjawab compliant
            </span>
          </div>
          <div className="h-3 bg-secondary rounded-full overflow-hidden">
            <div 
              className={`h-full transition-all duration-700 rounded-full ${getScoreBg(stats.complianceRate)}`}
              style={{ width: `${stats.complianceRate}%` }}
            />
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-4 gap-2">
          <div className="p-3 rounded-xl bg-background/50 border text-center">
            <div className="text-2xl font-bold text-foreground">{stats.total}</div>
            <div className="text-xs text-muted-foreground">Total Soal</div>
          </div>
          <div className="p-3 rounded-xl bg-background/50 border text-center">
            <div className="text-2xl font-bold text-primary">{stats.answered}</div>
            <div className="text-xs text-muted-foreground">Terjawab</div>
          </div>
          <div className="p-3 rounded-xl bg-success/10 border border-success/20 text-center">
            <div className="text-2xl font-bold text-success">{stats.compliant}</div>
            <div className="text-xs text-muted-foreground">Ya (Comply)</div>
          </div>
          <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-center">
            <div className="text-2xl font-bold text-destructive">{stats.nonCompliant}</div>
            <div className="text-xs text-muted-foreground">Tidak</div>
          </div>
        </div>

        {/* COBIT Domain Segmentation */}
        {cobitDomainStats.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Shield className="w-4 h-4 text-primary" />
              COBIT Domain Index
            </h4>
            <div className="grid grid-cols-2 gap-2">
              {cobitDomainStats.map(stat => {
                const domainInfo = COBIT_DOMAINS[stat.domain];
                return (
                  <div key={stat.domain} className="p-3 rounded-xl bg-background/50 border space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${domainInfo.color}`} />
                        <span className="text-sm font-bold text-foreground">{stat.domain}</span>
                      </div>
                      <span className={`text-lg font-bold ${getScoreColor(stat.percentage)}`}>
                        {stat.percentage}%
                      </span>
                    </div>
                    <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${getScoreBg(stat.percentage)}`}
                        style={{ width: `${stat.percentage}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{domainInfo.name}</p>
                    <p className="text-xs text-muted-foreground">{stat.compliant}/{stat.total} comply</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Findings Highlight */}
        {aspectFindings.length > 0 && (
          <Collapsible open={isOpen} onOpenChange={setIsOpen}>
            <CollapsibleTrigger asChild>
              <button className="w-full p-3 rounded-xl bg-destructive/10 border border-destructive/20 flex items-center justify-between hover:bg-destructive/15 transition-colors">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-destructive" />
                  <span className="text-sm font-semibold text-destructive">
                    {aspectFindings.length} Temuan Terdeteksi
                  </span>
                </div>
                {isOpen ? (
                  <ChevronDown className="w-4 h-4 text-destructive" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-destructive" />
                )}
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2 space-y-2">
              {aspectFindings.slice(0, 3).map((finding) => {
                const relatedQ = getRelatedQuestion(finding.questionId);
                return (
                  <div 
                    key={finding.id} 
                    className={`p-3 rounded-lg border-l-4 bg-background/50 cursor-pointer hover:bg-muted/50 transition-colors ${
                      finding.severity === 'major' ? 'border-l-destructive' : 'border-l-warning'
                    }`}
                    onClick={() => setSelectedFinding(finding)}
                  >
                    <div className="flex items-start gap-2">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium shrink-0 ${
                        finding.severity === 'major' ? 'bg-destructive/20 text-destructive' : 'bg-warning/20 text-warning'
                      }`}>
                        {finding.severity === 'major' ? 'MAYOR' : 'MINOR'}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-foreground">{finding.ruleName}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">Soal: {finding.questionId}</p>
                        {relatedQ && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                            "{relatedQ.text}"
                          </p>
                        )}
                      </div>
                      <Info className="w-4 h-4 text-muted-foreground shrink-0" />
                    </div>
                  </div>
                );
              })}
              {aspectFindings.length > 3 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full text-primary hover:text-primary"
                  onClick={() => setShowAllFindings(true)}
                >
                  Lihat {aspectFindings.length - 3} temuan lainnya →
                </Button>
              )}
            </CollapsibleContent>
          </Collapsible>
        )}

        {aspectFindings.length === 0 && stats.answered > 0 && (
          <div className="p-3 rounded-xl bg-success/10 border border-success/20 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-success" />
            <span className="text-sm text-success font-medium">Tidak ada temuan untuk aspek ini</span>
          </div>
        )}
      </div>

      {/* Dialog for All Findings */}
      <Dialog open={showAllFindings} onOpenChange={setShowAllFindings}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              Semua Temuan Aspek {aspect}
            </DialogTitle>
            <DialogDescription>
              {aspectFindings.length} temuan terdeteksi pada aspek {ASPECT_SHORT_LABELS[aspect]}
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh] pr-4">
            <div className="space-y-3">
              {aspectFindings.map((finding) => {
                const relatedQ = getRelatedQuestion(finding.questionId);
                return (
                  <div 
                    key={finding.id} 
                    className={`p-4 rounded-lg border-l-4 bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors ${
                      finding.severity === 'major' ? 'border-l-destructive' : 'border-l-warning'
                    }`}
                    onClick={() => {
                      setShowAllFindings(false);
                      setSelectedFinding(finding);
                    }}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        finding.severity === 'major' ? 'bg-destructive/20 text-destructive' : 'bg-warning/20 text-warning'
                      }`}>
                        {finding.severity === 'major' ? 'MAYOR' : 'MINOR'}
                      </span>
                      <span className="text-xs text-muted-foreground">Soal: {finding.questionId}</span>
                    </div>
                    <p className="text-sm font-medium text-foreground mb-1">{finding.ruleName}</p>
                    {relatedQ && (
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        "{relatedQ.text}"
                      </p>
                    )}
                    <p className="text-xs text-primary mt-2 flex items-center gap-1">
                      <Info className="w-3 h-3" /> Klik untuk detail lengkap
                    </p>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Dialog for Finding Detail */}
      <Dialog open={!!selectedFinding} onOpenChange={(open) => !open && setSelectedFinding(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh]">
          {selectedFinding && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <AlertTriangle className={`w-5 h-5 ${
                    selectedFinding.severity === 'major' ? 'text-destructive' : 'text-warning'
                  }`} />
                  Detail Temuan
                </DialogTitle>
                <DialogDescription>
                  Informasi lengkap mengenai temuan yang terdeteksi
                </DialogDescription>
              </DialogHeader>
              <ScrollArea className="max-h-[65vh] pr-4">
                <div className="space-y-4">
                  {/* Severity & ID */}
                  <div className="flex items-center gap-2">
                    <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                      selectedFinding.severity === 'major' 
                        ? 'bg-destructive/20 text-destructive' 
                        : 'bg-warning/20 text-warning'
                    }`}>
                      {selectedFinding.severity === 'major' ? 'TEMUAN MAYOR' : 'TEMUAN MINOR'}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      ID: {selectedFinding.id}
                    </span>
                  </div>

                  {/* Rule Name */}
                  <div className="p-4 rounded-lg bg-muted/50 border">
                    <h4 className="text-sm font-semibold text-muted-foreground mb-1">Jenis Temuan</h4>
                    <p className="text-base font-medium text-foreground">{selectedFinding.ruleName}</p>
                  </div>

                  {/* Related Question */}
                  <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                    <h4 className="text-sm font-semibold text-primary mb-2 flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      Soal Terkait
                    </h4>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm">
                        <span className="font-medium text-foreground">ID Soal:</span>
                        <span className="px-2 py-0.5 bg-background rounded text-foreground">{selectedFinding.questionId}</span>
                      </div>
                      {(() => {
                        const relatedQ = getRelatedQuestion(selectedFinding.questionId);
                        return relatedQ ? (
                          <>
                            <div className="text-sm">
                              <span className="font-medium text-foreground">Pertanyaan:</span>
                              <p className="mt-1 text-muted-foreground bg-background p-2 rounded">
                                "{relatedQ.text}"
                              </p>
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                              <span className="font-medium text-foreground">Jawaban:</span>
                              <span className={`px-2 py-0.5 rounded ${
                                relatedQ.answer === 'Ya' ? 'bg-success/20 text-success' : 'bg-destructive/20 text-destructive'
                              }`}>
                                {relatedQ.answer || 'Tidak dijawab'}
                              </span>
                            </div>
                            {relatedQ.cobitRef && (
                              <div className="flex items-center gap-2 text-sm">
                                <span className="font-medium text-foreground">Referensi COBIT:</span>
                                <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded">{relatedQ.cobitRef}</span>
                              </div>
                            )}
                          </>
                        ) : null;
                      })()}
                    </div>
                  </div>

                  {/* Explanation */}
                  <div className="p-4 rounded-lg bg-amber-50 border border-amber-200">
                    <h4 className="text-sm font-semibold text-amber-800 mb-2 flex items-center gap-2">
                      <Info className="w-4 h-4" />
                      Alasan Deteksi
                    </h4>
                    <p className="text-sm text-amber-900 leading-relaxed">
                      {generateFindingExplanation(selectedFinding)}
                    </p>
                  </div>

                  {/* Relationship */}
                  <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
                    <h4 className="text-sm font-semibold text-blue-800 mb-2 flex items-center gap-2">
                      <Link2 className="w-4 h-4" />
                      Keterkaitan & Implikasi
                    </h4>
                    <p className="text-sm text-blue-900 leading-relaxed">
                      {generateRelationshipExplanation(selectedFinding)}
                    </p>
                  </div>

                  {/* Recommendation */}
                  <div className="p-4 rounded-lg bg-success/10 border border-success/30">
                    <h4 className="text-sm font-semibold text-success mb-2 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4" />
                      Rekomendasi
                    </h4>
                    <p className="text-sm text-foreground leading-relaxed">
                      {selectedFinding.severity === 'major' 
                        ? 'Lakukan review ulang terhadap jawaban dan pastikan bukti dokumen pendukung tersedia. Pertimbangkan untuk melakukan audit internal terhadap area ini.'
                        : 'Perhatikan temuan ini untuk perbaikan di periode assessment berikutnya. Dokumentasikan action plan untuk mitigasi risiko.'}
                    </p>
                  </div>
                </div>
              </ScrollArea>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
