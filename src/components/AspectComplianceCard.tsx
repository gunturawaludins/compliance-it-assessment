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
  nonCompliant: number;
  percentage: number;
  questions: Question[];
}

interface DomainBreakdownDialog {
  domain: COBITDomain;
  stats: COBITDomainStat;
}

export function AspectComplianceCard({ aspect, questions, findings }: AspectComplianceCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showAllFindings, setShowAllFindings] = useState(false);
  const [selectedFinding, setSelectedFinding] = useState<FraudFinding | null>(null);
  const [selectedDomain, setSelectedDomain] = useState<DomainBreakdownDialog | null>(null);

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

  // Calculate COBIT domain breakdown for this aspect - show ALL domains found in questions
  const cobitDomainStats = useMemo(() => {
    const domainMap = new Map<COBITDomain, Question[]>();
    
    // Collect ALL domains from questions (not just from mapping)
    aspectQuestions.forEach(q => {
      const ref = q.cobitRef?.toUpperCase() || '';
      const allDomains: COBITDomain[] = ['EDM', 'APO', 'BAI', 'DSS', 'MEA'];
      
      allDomains.forEach(domain => {
        if (ref.startsWith(domain)) {
          if (!domainMap.has(domain)) {
            domainMap.set(domain, []);
          }
          domainMap.get(domain)!.push(q);
        }
      });
    });

    const domainStats: COBITDomainStat[] = [];
    
    domainMap.forEach((domainQuestions, domain) => {
      const total = domainQuestions.length;
      const compliant = domainQuestions.filter(q => q.answer === 'Ya').length;
      const nonCompliant = domainQuestions.filter(q => q.answer === 'Tidak').length;
      const answered = domainQuestions.filter(q => q.answer).length;
      const percentage = answered > 0 ? Math.round((compliant / answered) * 100) : 0;

      domainStats.push({
        domain,
        total,
        compliant,
        nonCompliant,
        percentage,
        questions: domainQuestions
      });
    });

    // Sort by domain name
    return domainStats.sort((a, b) => a.domain.localeCompare(b.domain));
  }, [aspectQuestions]);

  // Find conflicting questions for a finding
  const getConflictingQuestions = (finding: FraudFinding): Question[] => {
    const relatedQ = getRelatedQuestion(finding.questionId);
    if (!relatedQ) return [];
    
    // Find questions with same COBIT domain but different answers
    const domain = relatedQ.cobitRef?.substring(0, 3)?.toUpperCase() || '';
    const conflicting = aspectQuestions.filter(q => {
      if (q.id === relatedQ.id) return false;
      const qDomain = q.cobitRef?.substring(0, 3)?.toUpperCase() || '';
      // Same domain but different answer
      return qDomain === domain && q.answer && q.answer !== relatedQ.answer;
    });
    
    return conflicting;
  };

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

        {/* COBIT Domain Segmentation - Clickable */}
        {cobitDomainStats.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Shield className="w-4 h-4 text-primary" />
              COBIT Domain Index ({cobitDomainStats.length} domain terdeteksi)
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {cobitDomainStats.map(stat => {
                const domainInfo = COBIT_DOMAINS[stat.domain];
                return (
                  <div 
                    key={stat.domain} 
                    className="p-3 rounded-xl bg-background/50 border space-y-2 cursor-pointer hover:bg-muted/50 hover:border-primary/50 transition-all"
                    onClick={() => setSelectedDomain({ domain: stat.domain, stats: stat })}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${domainInfo?.color || 'bg-gray-400'}`} />
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
                    <p className="text-xs text-muted-foreground truncate">{domainInfo?.name || stat.domain}</p>
                    <div className="flex justify-between text-xs">
                      <span className="text-success">{stat.compliant} comply</span>
                      <span className="text-destructive">{stat.nonCompliant} tidak</span>
                    </div>
                    <p className="text-xs text-primary flex items-center gap-1">
                      <Info className="w-3 h-3" /> Klik untuk detail
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Temuan Permasalahan Compliance */}
        {aspectFindings.length > 0 && (
          <Collapsible open={isOpen} onOpenChange={setIsOpen}>
            <CollapsibleTrigger asChild>
              <button className="w-full p-3 rounded-xl bg-destructive/10 border border-destructive/20 flex items-center justify-between hover:bg-destructive/15 transition-colors">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-destructive" />
                  <span className="text-sm font-semibold text-destructive">
                    {aspectFindings.length} Temuan Permasalahan Compliance
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
                // Extract COBIT reference from finding or question
                const cobitRef = finding.fraudType?.match(/\[([A-Z]{3}\d{2}[^\]]*)\]/)?.[1] || relatedQ?.cobitRef || '';
                const breakdownDetail = finding.fraudType?.includes('[') ? finding.fraudType : '';
                
                return (
                  <div 
                    key={finding.id} 
                    className={`p-3 rounded-lg border-l-4 bg-background/50 cursor-pointer hover:bg-muted/50 transition-colors ${
                      finding.severity === 'major' ? 'border-l-destructive' : 'border-l-warning'
                    }`}
                    onClick={() => setSelectedFinding(finding)}
                  >
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium shrink-0 ${
                          finding.severity === 'major' ? 'bg-destructive/20 text-destructive' : 'bg-warning/20 text-warning'
                        }`}>
                          {finding.severity === 'major' ? 'NON-COMPLIANCE MAYOR' : 'NON-COMPLIANCE MINOR'}
                        </span>
                        {cobitRef && (
                          <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-mono">
                            [{cobitRef}]
                          </span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground">{finding.ruleName}</p>
                        <div className="mt-2 p-2 bg-muted/50 rounded text-xs space-y-2">
                          {/* Detail Soal dengan Breakdown */}
                          <div className="flex items-start gap-1">
                            <FileText className="w-3 h-3 text-primary mt-0.5 shrink-0" />
                            <div>
                              <span className="font-medium text-primary">Soal {finding.questionId}</span>
                              {breakdownDetail && (
                                <span className="ml-1 text-muted-foreground">• Pendalaman COBIT</span>
                              )}
                            </div>
                          </div>
                          {relatedQ && (
                            <p className="text-muted-foreground line-clamp-2 pl-4">
                              "{relatedQ.text}"
                            </p>
                          )}
                          {/* Alasan Non-Compliance */}
                          <div className="pl-4 pt-1 border-t border-dashed">
                            <span className="text-destructive font-medium">Alasan Non-Compliance:</span>
                            <p className="text-foreground mt-0.5">
                              {finding.description || 'Jawaban tidak sesuai dengan standar COBIT yang ditetapkan'}
                            </p>
                          </div>
                          {relatedQ?.answer && (
                            <div className="pl-4 flex items-center gap-2">
                              <span className="text-muted-foreground">Jawaban:</span>
                              <span className={`px-1.5 py-0.5 rounded font-medium ${
                                relatedQ.answer === 'Ya' ? 'bg-success/20 text-success' : 'bg-destructive/20 text-destructive'
                              }`}>
                                {relatedQ.answer}
                              </span>
                              <span className="text-muted-foreground">→</span>
                              <span className="text-destructive text-xs">
                                {relatedQ.answer === 'Tidak' ? 'Tidak memenuhi standar' : 'Memerlukan verifikasi bukti'}
                              </span>
                            </div>
                          )}
                        </div>
                        <p className="text-xs text-primary mt-2 flex items-center gap-1">
                          <Info className="w-3 h-3" /> Klik untuk penjelasan detail standar compliance
                        </p>
                      </div>
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
                  Lihat {aspectFindings.length - 3} temuan permasalahan compliance lainnya →
                </Button>
              )}
            </CollapsibleContent>
          </Collapsible>
        )}

        {aspectFindings.length === 0 && stats.answered > 0 && (
          <div className="p-3 rounded-xl bg-success/10 border border-success/20 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-success" />
            <span className="text-sm text-success font-medium">Semua standar compliance terpenuhi untuk aspek ini</span>
          </div>
        )}
      </div>

      {/* Dialog for All Findings */}
      <Dialog open={showAllFindings} onOpenChange={setShowAllFindings}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              Semua Temuan Permasalahan Compliance Aspek {aspect}
            </DialogTitle>
            <DialogDescription>
              {aspectFindings.length} permasalahan compliance terdeteksi pada aspek {ASPECT_SHORT_LABELS[aspect]}
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh] pr-4">
            <div className="space-y-3">
              {aspectFindings.map((finding) => {
                const relatedQ = getRelatedQuestion(finding.questionId);
                const cobitRef = finding.fraudType?.match(/\[([A-Z]{3}\d{2}[^\]]*)\]/)?.[1] || relatedQ?.cobitRef || '';
                
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
                    <div className="flex items-start justify-between gap-2 mb-2 flex-wrap">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        finding.severity === 'major' ? 'bg-destructive/20 text-destructive' : 'bg-warning/20 text-warning'
                      }`}>
                        {finding.severity === 'major' ? 'NON-COMPLIANCE MAYOR' : 'NON-COMPLIANCE MINOR'}
                      </span>
                      {cobitRef && (
                        <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-mono">
                          [{cobitRef}]
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-medium text-foreground mb-2">{finding.ruleName}</p>
                    
                    {/* Detail Soal Terkait dengan Standar */}
                    <div className="p-3 bg-muted/50 rounded-lg space-y-2">
                      <div className="flex items-center gap-2 text-primary text-xs font-medium">
                        <FileText className="w-3 h-3" />
                        <span>Soal {finding.questionId}</span>
                        {cobitRef && <span className="text-muted-foreground">• Standar: {cobitRef}</span>}
                      </div>
                      {relatedQ && (
                        <p className="text-xs text-foreground">
                          "{relatedQ.text}"
                        </p>
                      )}
                      {/* Alasan Non-Compliance */}
                      <div className="pt-2 border-t border-dashed">
                        <span className="text-destructive text-xs font-medium">Alasan Non-Compliance:</span>
                        <p className="text-xs text-foreground mt-1">
                          {finding.description || 'Jawaban tidak sesuai dengan standar COBIT yang ditetapkan'}
                        </p>
                      </div>
                      {relatedQ && (
                        <div className="flex items-center gap-2 text-xs">
                          <span className="text-muted-foreground">Jawaban:</span>
                          <span className={`px-1.5 py-0.5 rounded ${
                            relatedQ.answer === 'Ya' ? 'bg-success/20 text-success' : 'bg-destructive/20 text-destructive'
                          }`}>
                            {relatedQ.answer || 'Belum dijawab'}
                          </span>
                        </div>
                      )}
                    </div>
                    
                    <p className="text-xs text-primary mt-2 flex items-center gap-1">
                      <Info className="w-3 h-3" /> Klik untuk penjelasan lengkap standar compliance
                    </p>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Dialog for Finding Detail - Permasalahan Compliance */}
      <Dialog open={!!selectedFinding} onOpenChange={(open) => !open && setSelectedFinding(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh]">
          {selectedFinding && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <AlertTriangle className={`w-5 h-5 ${
                    selectedFinding.severity === 'major' ? 'text-destructive' : 'text-warning'
                  }`} />
                  Detail Permasalahan Compliance
                </DialogTitle>
                <DialogDescription>
                  Penjelasan detail mengapa item ini tidak memenuhi standar compliance COBIT
                </DialogDescription>
              </DialogHeader>
              <ScrollArea className="max-h-[65vh] pr-4">
                <div className="space-y-4">
                  {/* Severity & COBIT Reference */}
                  {(() => {
                    const cobitRef = selectedFinding.fraudType?.match(/\[([A-Z]{3}\d{2}[^\]]*)\]/)?.[1] || 
                                    getRelatedQuestion(selectedFinding.questionId)?.cobitRef || '';
                    return (
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                          selectedFinding.severity === 'major' 
                            ? 'bg-destructive/20 text-destructive' 
                            : 'bg-warning/20 text-warning'
                        }`}>
                          {selectedFinding.severity === 'major' ? 'NON-COMPLIANCE MAYOR' : 'NON-COMPLIANCE MINOR'}
                        </span>
                        {cobitRef && (
                          <span className="px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-sm font-mono">
                            Standar: [{cobitRef}]
                          </span>
                        )}
                      </div>
                    );
                  })()}

                  {/* Jenis Permasalahan */}
                  <div className="p-4 rounded-lg bg-destructive/5 border border-destructive/20">
                    <h4 className="text-sm font-semibold text-destructive mb-1">Jenis Permasalahan Compliance</h4>
                    <p className="text-base font-medium text-foreground">{selectedFinding.ruleName}</p>
                  </div>

                  {/* Detail Soal & Standar COBIT */}
                  <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                    <h4 className="text-sm font-semibold text-primary mb-3 flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      Detail Soal & Standar yang Tidak Terpenuhi
                    </h4>
                    <div className="space-y-3">
                      {/* Question Detail */}
                      <div className="p-3 bg-background rounded-lg border">
                        {(() => {
                          const relatedQ = getRelatedQuestion(selectedFinding.questionId);
                          const cobitRef = selectedFinding.fraudType?.match(/\[([A-Z]{3}\d{2}[^\]]*)\]/)?.[1] || relatedQ?.cobitRef || '';
                          return (
                            <>
                              <div className="flex items-center gap-2 mb-2 flex-wrap">
                                <span className="px-2 py-0.5 bg-primary/10 text-primary rounded text-xs font-medium">
                                  Soal {selectedFinding.questionId}
                                </span>
                                {cobitRef && (
                                  <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-mono">
                                    [{cobitRef}]
                                  </span>
                                )}
                              </div>
                              {relatedQ ? (
                                <>
                                  <p className="text-sm text-foreground mb-3">
                                    "{relatedQ.text}"
                                  </p>
                                  <div className="flex items-center gap-3 text-xs flex-wrap">
                                    <div className="flex items-center gap-1">
                                      <span className="text-muted-foreground">Jawaban:</span>
                                      <span className={`px-2 py-0.5 rounded font-medium ${
                                        relatedQ.answer === 'Ya' ? 'bg-success/20 text-success' : 'bg-destructive/20 text-destructive'
                                      }`}>
                                        {relatedQ.answer || 'Belum dijawab'}
                                      </span>
                                    </div>
                                  </div>
                                </>
                              ) : (
                                <p className="text-sm text-muted-foreground">Soal tidak ditemukan</p>
                              )}
                            </>
                          );
                        })()}
                      </div>
                    </div>
                  </div>

                  {/* Alasan Non-Compliance Detail - Enhanced with conflicting questions */}
                  <div className="p-4 rounded-lg bg-amber-50 border border-amber-200">
                    <h4 className="text-sm font-semibold text-amber-800 mb-2 flex items-center gap-2">
                      <Info className="w-4 h-4" />
                      Mengapa Tidak Memenuhi Standar Compliance?
                    </h4>
                    <div className="text-sm text-amber-900 leading-relaxed space-y-3">
                      <p>{selectedFinding.description || generateFindingExplanation(selectedFinding)}</p>
                      
                      {/* Detail jawaban yang bersilangan */}
                      {(() => {
                        const relatedQ = getRelatedQuestion(selectedFinding.questionId);
                        const conflicting = getConflictingQuestions(selectedFinding);
                        
                        return (
                          <>
                            {/* Current question answer */}
                            {relatedQ && (
                              <div className="p-3 bg-amber-100 rounded-lg space-y-2">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium text-amber-800">Soal Utama:</span>
                                  <span className="px-2 py-0.5 bg-primary/20 text-primary rounded text-xs font-mono">{selectedFinding.questionId}</span>
                                </div>
                                <p className="text-xs text-amber-700 italic">"{relatedQ.text}"</p>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs">Jawaban:</span>
                                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                    relatedQ.answer === 'Ya' ? 'bg-success/20 text-success' : 'bg-destructive/20 text-destructive'
                                  }`}>
                                    {relatedQ.answer}
                                  </span>
                                </div>
                              </div>
                            )}

                            {/* Conflicting questions */}
                            {conflicting.length > 0 && (
                              <div className="space-y-2">
                                <p className="font-medium text-amber-800 flex items-center gap-1">
                                  <AlertTriangle className="w-4 h-4" />
                                  Jawaban Bersilangan Terdeteksi ({conflicting.length} soal):
                                </p>
                                <div className="space-y-2">
                                  {conflicting.slice(0, 3).map((cq, idx) => (
                                    <div key={cq.id} className="p-2 bg-red-50 border border-red-200 rounded-lg">
                                      <div className="flex items-center gap-2 mb-1">
                                        <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded text-xs font-mono">{cq.id}</span>
                                        <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">{cq.cobitRef}</span>
                                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                          cq.answer === 'Ya' ? 'bg-success/20 text-success' : 'bg-destructive/20 text-destructive'
                                        }`}>
                                          {cq.answer}
                                        </span>
                                      </div>
                                      <p className="text-xs text-red-700 italic line-clamp-2">"{cq.text}"</p>
                                    </div>
                                  ))}
                                  {conflicting.length > 3 && (
                                    <p className="text-xs text-amber-700">+ {conflicting.length - 3} soal lainnya bersilangan</p>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Explanation based on answer */}
                            {relatedQ?.answer === 'Tidak' && (
                              <div className="p-2 bg-amber-200/50 rounded">
                                <span className="font-medium">Kesimpulan:</span> Jawaban "Tidak" pada soal ini menunjukkan kontrol COBIT belum diimplementasikan.
                                {conflicting.length > 0 && (
                                  <span> Terdapat {conflicting.length} soal terkait dengan jawaban berbeda yang menunjukkan inkonsistensi.</span>
                                )}
                              </div>
                            )}
                            {relatedQ?.answer === 'Ya' && conflicting.length > 0 && (
                              <div className="p-2 bg-amber-200/50 rounded">
                                <span className="font-medium">Kesimpulan:</span> Meskipun dijawab "Ya", terdeteksi {conflicting.length} soal terkait dengan jawaban "Tidak" yang menunjukkan implementasi tidak konsisten.
                              </div>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  </div>

                  {/* Standar COBIT yang Dilanggar */}
                  <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
                    <h4 className="text-sm font-semibold text-blue-800 mb-2 flex items-center gap-2">
                      <Shield className="w-4 h-4" />
                      Standar COBIT yang Tidak Terpenuhi
                    </h4>
                    {(() => {
                      const relatedQ = getRelatedQuestion(selectedFinding.questionId);
                      const cobitRef = selectedFinding.fraudType?.match(/\[([A-Z]{3}\d{2}[^\]]*)\]/)?.[1] || relatedQ?.cobitRef || '';
                      const domain = cobitRef.substring(0, 3);
                      const domainInfo = COBIT_DOMAINS[domain as COBITDomain];
                      
                      return (
                        <div className="text-sm text-blue-900 leading-relaxed space-y-2">
                          {cobitRef && (
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-1 bg-blue-200 text-blue-800 rounded font-mono font-medium">
                                {cobitRef}
                              </span>
                              {domainInfo && (
                                <span className="text-blue-700">({domainInfo.name})</span>
                              )}
                            </div>
                          )}
                          <p>
                            {generateRelationshipExplanation(selectedFinding)}
                          </p>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Implikasi */}
                  <div className="p-4 rounded-lg bg-purple-50 border border-purple-200">
                    <h4 className="text-sm font-semibold text-purple-800 mb-2 flex items-center gap-2">
                      <TrendingUp className="w-4 h-4" />
                      Implikasi terhadap Compliance Organisasi
                    </h4>
                    <p className="text-sm text-purple-900 leading-relaxed">
                      {selectedFinding.severity === 'major' 
                        ? 'Permasalahan mayor ini menunjukkan gap signifikan dalam implementasi kontrol COBIT. Organisasi berpotensi tidak memenuhi standar governance TI yang dipersyaratkan, yang dapat berdampak pada keandalan sistem dan kepatuhan regulasi.'
                        : 'Permasalahan minor ini menunjukkan area yang memerlukan perbaikan untuk mencapai compliance penuh. Meskipun tidak kritis, perbaikan diperlukan untuk meningkatkan maturitas governance TI organisasi.'}
                    </p>
                  </div>

                </div>
              </ScrollArea>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog for COBIT Domain Breakdown */}
      <Dialog open={!!selectedDomain} onOpenChange={(open) => !open && setSelectedDomain(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh]">
          {selectedDomain && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-primary" />
                  Detail Domain {selectedDomain.domain}
                </DialogTitle>
                <DialogDescription>
                  {COBIT_DOMAINS[selectedDomain.domain]?.name} - {selectedDomain.stats.total} soal terdeteksi
                </DialogDescription>
              </DialogHeader>
              <ScrollArea className="max-h-[65vh] pr-4">
                <div className="space-y-4">
                  {/* Domain Summary */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="p-3 rounded-lg bg-muted text-center">
                      <div className="text-2xl font-bold text-foreground">{selectedDomain.stats.total}</div>
                      <div className="text-xs text-muted-foreground">Total Soal</div>
                    </div>
                    <div className="p-3 rounded-lg bg-success/10 text-center">
                      <div className="text-2xl font-bold text-success">{selectedDomain.stats.compliant}</div>
                      <div className="text-xs text-muted-foreground">Comply (Ya)</div>
                    </div>
                    <div className="p-3 rounded-lg bg-destructive/10 text-center">
                      <div className="text-2xl font-bold text-destructive">{selectedDomain.stats.nonCompliant}</div>
                      <div className="text-xs text-muted-foreground">Non-Comply</div>
                    </div>
                  </div>

                  {/* Compliance Rate */}
                  <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Compliance Rate</span>
                      <span className={`text-xl font-bold ${getScoreColor(selectedDomain.stats.percentage)}`}>
                        {selectedDomain.stats.percentage}%
                      </span>
                    </div>
                    <div className="h-3 bg-secondary rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${getScoreBg(selectedDomain.stats.percentage)}`}
                        style={{ width: `${selectedDomain.stats.percentage}%` }}
                      />
                    </div>
                  </div>

                  {/* Non-Compliant Questions (Problems) */}
                  {selectedDomain.stats.nonCompliant > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-semibold text-destructive flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4" />
                        Soal Tidak Comply ({selectedDomain.stats.nonCompliant})
                      </h4>
                      <div className="space-y-2">
                        {selectedDomain.stats.questions
                          .filter(q => q.answer === 'Tidak')
                          .map(q => (
                            <div key={q.id} className="p-3 rounded-lg bg-destructive/5 border border-destructive/20">
                              <div className="flex items-center gap-2 mb-2 flex-wrap">
                                <span className="px-2 py-0.5 bg-destructive/20 text-destructive rounded text-xs font-mono font-medium">
                                  {q.id}
                                </span>
                                <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">
                                  {q.cobitRef}
                                </span>
                                <span className="px-2 py-0.5 bg-destructive/20 text-destructive rounded text-xs">
                                  Tidak
                                </span>
                              </div>
                              <p className="text-sm text-foreground">{q.text}</p>
                              <p className="text-xs text-destructive mt-2">
                                ⚠️ Kontrol {q.cobitRef} tidak terpenuhi - perlu implementasi
                              </p>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}

                  {/* Compliant Questions */}
                  {selectedDomain.stats.compliant > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-semibold text-success flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4" />
                        Soal Comply ({selectedDomain.stats.compliant})
                      </h4>
                      <div className="space-y-2">
                        {selectedDomain.stats.questions
                          .filter(q => q.answer === 'Ya')
                          .slice(0, 5)
                          .map(q => (
                            <div key={q.id} className="p-3 rounded-lg bg-success/5 border border-success/20">
                              <div className="flex items-center gap-2 mb-2 flex-wrap">
                                <span className="px-2 py-0.5 bg-success/20 text-success rounded text-xs font-mono font-medium">
                                  {q.id}
                                </span>
                                <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">
                                  {q.cobitRef}
                                </span>
                                <span className="px-2 py-0.5 bg-success/20 text-success rounded text-xs">
                                  Ya
                                </span>
                              </div>
                              <p className="text-sm text-foreground line-clamp-2">{q.text}</p>
                            </div>
                          ))}
                        {selectedDomain.stats.compliant > 5 && (
                          <p className="text-xs text-muted-foreground text-center">
                            + {selectedDomain.stats.compliant - 5} soal comply lainnya
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Unanswered Questions */}
                  {(() => {
                    const unanswered = selectedDomain.stats.questions.filter(q => !q.answer);
                    if (unanswered.length === 0) return null;
                    return (
                      <div className="space-y-2">
                        <h4 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                          <Info className="w-4 h-4" />
                          Belum Dijawab ({unanswered.length})
                        </h4>
                        <div className="p-3 rounded-lg bg-muted/50">
                          <p className="text-xs text-muted-foreground">
                            {unanswered.map(q => q.id).join(', ')}
                          </p>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </ScrollArea>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
