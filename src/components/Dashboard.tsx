import { useMemo, useEffect, useState } from 'react';
import { 
  AlertTriangle, 
  AlertCircle, 
  CheckCircle2, 
  FileSearch, 
  ShieldAlert, 
  ShieldCheck, 
  Building, 
  User, 
  Phone, 
  Briefcase, 
  Calendar, 
  Brain, 
  Loader2,
  BookOpen,
  TrendingUp,
  TrendingDown,
  Minus,
  ChevronDown,
  ChevronRight,
  LayoutGrid
} from 'lucide-react';
import { Question, FraudRule, ASPECT_SHORT_LABELS, AspectCategory, AssessorInfo, COBIT_DOMAINS, COBITDomain } from '@/types/assessment';
import { analyzeFraud, getScoreColor, getScoreLabel } from '@/lib/fraudAnalyzer';
import { Button } from '@/components/ui/button';
import { useAIValidation, AIFinding } from '@/hooks/useAIValidation';
import FraudRulesPanel from './FraudRulesPanel';
import { AspectComplianceCard } from './AspectComplianceCard';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface DashboardProps {
  questions: Question[];
  rules: FraudRule[];
  onAnalyze: () => void;
  assessorInfo?: AssessorInfo;
}

export function Dashboard({ questions, rules, onAnalyze, assessorInfo }: DashboardProps) {
  const result = useMemo(() => analyzeFraud(questions, rules), [questions, rules]);
  const { validateWithAI, isValidating, aiResult, resetAIResult } = useAIValidation();
  const [aiDetailsOpen, setAiDetailsOpen] = useState(true);

  // Reset AI result when questions change (new submission)
  useEffect(() => {
    resetAIResult();
  }, [questions, resetAIResult]);

  const categoryStats = useMemo(() => {
    const stats: Record<AspectCategory, { total: number; answered: number; yesCount: number }> = {
      A: { total: 0, answered: 0, yesCount: 0 },
      B: { total: 0, answered: 0, yesCount: 0 },
      C: { total: 0, answered: 0, yesCount: 0 },
      D: { total: 0, answered: 0, yesCount: 0 },
    };
    
    questions.forEach(q => {
      if (!q.id.startsWith('DP')) {
        stats[q.category].total++;
        if (q.answer) {
          stats[q.category].answered++;
          if (q.answer === 'Ya') stats[q.category].yesCount++;
        }
      }
    });
    
    return stats;
  }, [questions]);

  // Calculate COBIT Domain scores from rule-based findings
  const cobitDomainScores = useMemo(() => {
    const domains: Record<COBITDomain, { total: number; passed: number; findings: number }> = {
      EDM: { total: 0, passed: 0, findings: 0 },
      APO: { total: 0, passed: 0, findings: 0 },
      BAI: { total: 0, passed: 0, findings: 0 },
      DSS: { total: 0, passed: 0, findings: 0 },
      MEA: { total: 0, passed: 0, findings: 0 },
    };

    // Count rules and findings per domain
    rules.forEach(rule => {
      const domain = rule.cobitDomain as COBITDomain;
      if (domain && domains[domain]) {
        domains[domain].total++;
        const hasFinding = result.findings.some(f => f.ruleId === rule.id);
        if (hasFinding) {
          domains[domain].findings++;
        } else {
          domains[domain].passed++;
        }
      }
    });

    // Calculate scores
    const scores: Record<COBITDomain, number> = {
      EDM: 0,
      APO: 0,
      BAI: 0,
      DSS: 0,
      MEA: 0,
    };

    Object.keys(domains).forEach(key => {
      const domain = key as COBITDomain;
      if (domains[domain].total > 0) {
        scores[domain] = Math.round((domains[domain].passed / domains[domain].total) * 100);
      }
    });

    return { domains, scores };
  }, [rules, result.findings]);

  const getRiskLevelColor = (level: string) => {
    switch (level) {
      case 'critical': return 'text-destructive bg-destructive/20';
      case 'high': return 'text-destructive bg-destructive/10';
      case 'medium': return 'text-warning bg-warning/20';
      case 'low': return 'text-success bg-success/20';
      default: return 'text-muted-foreground bg-muted';
    }
  };

  const getRiskLevelIcon = (level: string) => {
    switch (level) {
      case 'critical':
      case 'high':
        return <TrendingDown className="w-4 h-4" />;
      case 'medium':
        return <Minus className="w-4 h-4" />;
      case 'low':
        return <TrendingUp className="w-4 h-4" />;
      default:
        return <Minus className="w-4 h-4" />;
    }
  };

  const getFindingTypeLabel = (type: string) => {
    switch (type) {
      case 'logic_inconsistency': return 'Inkonsistensi Logika';
      case 'manipulation_pattern': return 'Pola Manipulasi';
      case 'insufficient_evidence': return 'Bukti Tidak Memadai';
      case 'cobit_violation': return 'Pelanggaran COBIT';
      default: return type;
    }
  };

  const getFindingTypeColor = (type: string) => {
    switch (type) {
      case 'logic_inconsistency': return 'bg-destructive/20 text-destructive';
      case 'manipulation_pattern': return 'bg-warning/20 text-warning';
      case 'insufficient_evidence': return 'bg-accent/20 text-accent';
      case 'cobit_violation': return 'bg-primary/20 text-primary';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <div className="space-y-6">
      {/* Assessor Info Card */}
      {assessorInfo && assessorInfo.namaDanaPensiun && (
        <div className="glass-card rounded-2xl p-6 bg-gradient-to-br from-primary/5 to-accent/5">
          <div className="flex items-start justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground">Informasi Pengisi Assessment</h2>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Calendar className="w-4 h-4" />
              {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-background/50">
              <div className="p-2 rounded-lg bg-primary/10">
                <Building className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Dana Pensiun</p>
                <p className="font-semibold text-foreground">{assessorInfo.namaDanaPensiun}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-background/50">
              <div className="p-2 rounded-lg bg-accent/10">
                <User className="w-5 h-5 text-accent" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">PIC (Person In Charge)</p>
                <p className="font-semibold text-foreground">{assessorInfo.namaPIC}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-background/50">
              <div className="p-2 rounded-lg bg-success/10">
                <Briefcase className="w-5 h-5 text-success" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Jabatan</p>
                <p className="font-semibold text-foreground">{assessorInfo.jabatanPIC}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-background/50">
              <div className="p-2 rounded-lg bg-warning/10">
                <Phone className="w-5 h-5 text-warning" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">No. Handphone</p>
                <p className="font-semibold text-foreground">{assessorInfo.nomorHP}</p>
              </div>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2">
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
              assessorInfo.memilikiUnitSyariah 
                ? 'bg-success/20 text-success' 
                : 'bg-muted text-muted-foreground'
            }`}>
              {assessorInfo.memilikiUnitSyariah ? '✓ Memiliki Unit Syariah' : 'Tidak Memiliki Unit Syariah'}
            </span>
          </div>
        </div>
      )}

      {/* AI Analysis Button */}
      <div className="glass-card rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Brain className="w-5 h-5 text-primary" />
            AI Cross-Validation (COBIT 2019)
          </h2>
          <p className="text-sm text-muted-foreground">
            {result.answeredQuestions} dari {result.totalQuestions} pertanyaan terjawab
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onAnalyze}>
            <FileSearch className="w-4 h-4" />
            Rule-Based
          </Button>
          <Button 
            variant="glow" 
            onClick={() => validateWithAI(questions)}
            disabled={isValidating || questions.length === 0}
          >
            {isValidating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Brain className="w-4 h-4" />
            )}
            {isValidating ? 'Analyzing...' : 'AI Validation'}
          </Button>
        </div>
      </div>

      {/* AI Result Card - Enhanced */}
      {aiResult && (
        <div className="glass-card rounded-xl p-6 border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
          <Collapsible open={aiDetailsOpen} onOpenChange={setAiDetailsOpen}>
            <CollapsibleTrigger asChild>
              <div className="flex items-center justify-between cursor-pointer hover:opacity-80 transition-opacity">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Brain className="w-5 h-5 text-primary" />
                  Hasil AI Cross-Validation
                </h3>
                <Button variant="ghost" size="sm">
                  {aiDetailsOpen ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                </Button>
              </div>
            </CollapsibleTrigger>

            <CollapsibleContent className="mt-4 space-y-6">
              {/* Summary Stats */}
              {(() => {
                const totalFindings = aiResult.findings?.length || 0;
                const majorFindings = aiResult.findings?.filter((f: AIFinding) => f.severity === 'major').length || 0;
                const minorFindings = totalFindings - majorFindings;
                
                // Same calculation as Compliance Index: Mayor ×3, Minor ×1
                const majorWeight = 3;
                const minorWeight = 1;
                const totalAnswered = result.answeredQuestions || 1;
                const weightedDeduction = (majorFindings * majorWeight) + (minorFindings * minorWeight);
                const maxPossibleDeduction = totalAnswered * majorWeight;
                const calculatedScore = Math.max(0, Math.round(100 - (weightedDeduction / maxPossibleDeduction) * 100));
                
                // Use AI score if available, otherwise use calculated
                const consistencyScore = aiResult.consistency_score || calculatedScore;
                
                return (
                  <>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="p-4 rounded-xl bg-background/50 text-center border">
                        <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-bold mb-2 ${getRiskLevelColor(aiResult.overall_risk_level || 'unknown')}`}>
                          {getRiskLevelIcon(aiResult.overall_risk_level || 'unknown')}
                          {(aiResult.overall_risk_level || 'N/A').toUpperCase()}
                        </div>
                        <div className="text-xs text-muted-foreground">Risk Level</div>
                      </div>
                      <div className="p-4 rounded-xl bg-background/50 text-center border">
                        <div className={`text-3xl font-bold ${
                          consistencyScore >= 80 ? 'text-success' : 
                          consistencyScore >= 60 ? 'text-warning' : 'text-destructive'
                        }`}>
                          {consistencyScore}%
                        </div>
                        <div className="text-xs text-muted-foreground">Konsistensi AI</div>
                      </div>
                      <div className="p-4 rounded-xl bg-background/50 text-center border">
                        <div className="text-3xl font-bold text-destructive">{totalFindings}</div>
                        <div className="text-xs text-muted-foreground">AI Findings</div>
                      </div>
                      <div className="p-4 rounded-xl bg-background/50 text-center border">
                        <div className="text-3xl font-bold text-warning">{majorFindings}</div>
                        <div className="text-xs text-muted-foreground">Major Issues</div>
                      </div>
                    </div>
                    
                    {/* Consistency Score Explanation */}
                    <div className="p-4 rounded-xl bg-primary/5 border border-primary/20">
                      <h4 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
                        <Brain className="w-4 h-4 text-primary" />
                        Perhitungan Skor Konsistensi AI
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground mb-2">
                            <strong>Rumus:</strong> 100 - ((Mayor × 3 + Minor × 1) / (Total Soal × 3) × 100)
                          </p>
                          <div className="space-y-1 text-xs">
                            <p><span className="font-medium text-destructive">Mayor (×3):</span> Inkonsistensi berat, manipulasi jelas, bukti bertentangan</p>
                            <p><span className="font-medium text-warning">Minor (×1):</span> Inkonsistensi ringan, gap dokumentasi kecil</p>
                          </div>
                        </div>
                        <div className="p-3 rounded-lg bg-background/50">
                          <p className="text-xs font-medium text-muted-foreground mb-2">Detail Perhitungan:</p>
                          <div className="space-y-1 text-xs">
                            <p>• Mayor: <span className="font-bold text-destructive">{majorFindings}</span> × 3 = <span className="font-bold">{majorFindings * 3}</span></p>
                            <p>• Minor: <span className="font-bold text-warning">{minorFindings}</span> × 1 = <span className="font-bold">{minorFindings * 1}</span></p>
                            <p>• Total Penalti: <span className="font-bold">{weightedDeduction}</span></p>
                            <p>• Maksimal Penalti: {totalAnswered} × 3 = <span className="font-bold">{maxPossibleDeduction}</span></p>
                            <p className="pt-1 border-t mt-1">
                              • Skor: 100 - ({weightedDeduction} / {maxPossibleDeduction} × 100) = <span className={`font-bold ${consistencyScore >= 80 ? 'text-success' : consistencyScore >= 60 ? 'text-warning' : 'text-destructive'}`}>{consistencyScore}%</span>
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                );
              })()}

              {/* AI Findings Detail - Enhanced with Relationship Explanation */}
              {aiResult.findings && aiResult.findings.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-warning" />
                    Detail Temuan AI - Analisis Keterkaitan ({aiResult.findings.length})
                  </h4>
                  <div className="space-y-4">
                    {aiResult.findings.map((finding: AIFinding, idx: number) => (
                      <div 
                        key={idx}
                        className={`p-5 rounded-xl border-l-4 bg-background/50 ${
                          finding.severity === 'major' ? 'border-l-destructive' : 'border-l-warning'
                        }`}
                      >
                        <div className="flex flex-wrap items-center gap-2 mb-3">
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                            finding.severity === 'major' 
                              ? 'bg-destructive/20 text-destructive' 
                              : 'bg-warning/20 text-warning'
                          }`}>
                            {finding.severity === 'major' ? 'MAYOR' : 'MINOR'}
                          </span>
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${getFindingTypeColor(finding.finding_type)}`}>
                            {getFindingTypeLabel(finding.finding_type)}
                          </span>
                          {finding.cobit_reference && finding.cobit_reference !== 'N/A' && (
                            <span className="px-2 py-0.5 rounded text-xs font-medium bg-primary/10 text-primary">
                              COBIT: {finding.cobit_reference}
                            </span>
                          )}
                        </div>
                        
                        {/* Question IDs with visual connection */}
                        {finding.question_ids && finding.question_ids.length > 0 && (
                          <div className="flex flex-wrap items-center gap-2 mb-3 p-2 rounded-lg bg-secondary/30">
                            <span className="text-xs font-medium text-foreground">Pertanyaan Terkait:</span>
                            {finding.question_ids.map((qId: string, qIdx: number) => (
                              <span key={qId} className="flex items-center gap-1">
                                <span className="px-2 py-1 rounded bg-primary/20 text-xs font-mono font-medium text-primary">
                                  {qId}
                                </span>
                                {qIdx < finding.question_ids.length - 1 && (
                                  <span className="text-muted-foreground">↔</span>
                                )}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Relationship Explanation - NEW */}
                        {finding.relationship_explanation && (
                          <div className="p-3 rounded-lg bg-accent/10 border border-accent/20 mb-3">
                            <div className="flex items-start gap-2">
                              <LayoutGrid className="w-4 h-4 text-accent mt-0.5 flex-shrink-0" />
                              <div>
                                <p className="text-xs font-semibold text-accent mb-1">Analisis Keterkaitan:</p>
                                <p className="text-sm text-foreground leading-relaxed">
                                  {finding.relationship_explanation}
                                </p>
                              </div>
                            </div>
                          </div>
                        )}
                        
                        {/* Description */}
                        <p className="text-sm text-foreground mb-3 leading-relaxed">{finding.description}</p>
                        
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CollapsibleContent>
          </Collapsible>
        </div>
      )}

      {/* Skor Indeks Compliance Card - Weighted Calculation */}
      {(() => {
        // Weighted compliance calculation
        // Mayor = 3x weight (serious violations)
        // Minor = 1x weight (minor inconsistencies)
        const majorWeight = 3;
        const minorWeight = 1;
        const totalAnswered = result.answeredQuestions || 1;
        const weightedDeduction = (result.majorFindings * majorWeight) + (result.minorFindings * minorWeight);
        const maxPossibleDeduction = totalAnswered * majorWeight; // If all were major
        const complianceScore = Math.max(0, Math.round(100 - (weightedDeduction / maxPossibleDeduction) * 100));
        
        return (
          <div className="glass-card rounded-2xl p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-primary/10 to-transparent rounded-full -translate-y-1/2 translate-x-1/2" />
            
            <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
              <div className="flex items-center gap-6">
                <div className={`
                  w-28 h-28 rounded-2xl flex flex-col items-center justify-center
                  ${complianceScore >= 80 ? 'bg-success/20' : 
                    complianceScore >= 60 ? 'bg-warning/20' : 'bg-destructive/20'}
                `}>
                  <span className={`text-4xl font-bold ${
                    complianceScore >= 80 ? 'text-success' : 
                    complianceScore >= 60 ? 'text-warning' : 'text-destructive'
                  }`}>
                    {complianceScore}%
                  </span>
                  <span className="text-xs text-muted-foreground mt-1">Indeks</span>
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-foreground">Skor Indeks Compliance</h3>
                  <p className={`text-lg font-medium ${
                    complianceScore >= 80 ? 'text-success' : 
                    complianceScore >= 60 ? 'text-warning' : 'text-destructive'
                  }`}>
                    {complianceScore >= 80 ? 'Compliance Baik' :
                     complianceScore >= 60 ? 'Perlu Perbaikan' : 'Compliance Rendah'}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Pembobotan: Mayor (×3) + Minor (×1)
                  </p>
                </div>
              </div>
              
              <div className="flex gap-4">
                <div className="flex flex-col items-center gap-1 p-3 rounded-xl bg-destructive/20 text-destructive">
                  <ShieldAlert className="w-5 h-5" />
                  <span className="text-2xl font-bold">{result.majorFindings}</span>
                  <span className="text-xs">Mayor (×3)</span>
                </div>
                <div className="flex flex-col items-center gap-1 p-3 rounded-xl bg-warning/20 text-warning">
                  <AlertCircle className="w-5 h-5" />
                  <span className="text-2xl font-bold">{result.minorFindings}</span>
                  <span className="text-xs">Minor (×1)</span>
                </div>
                <div className="flex flex-col items-center gap-1 p-3 rounded-xl bg-success/20 text-success">
                  <ShieldCheck className="w-5 h-5" />
                  <span className="text-2xl font-bold">{result.consistentAnswers}</span>
                  <span className="text-xs">Konsisten</span>
                </div>
              </div>
            </div>
            
            {/* Explanation tooltip */}
            <div className="mt-4 p-3 rounded-lg bg-secondary/30 text-xs text-muted-foreground">
              <p><strong>Perhitungan:</strong> 100 - ((Mayor × 3 + Minor × 1) / (Total Soal × 3) × 100)</p>
              <p className="mt-1"><strong>Mayor:</strong> Pelanggaran serius (tidak ada kebijakan, manipulasi jelas) | <strong>Minor:</strong> Inkonsistensi ringan</p>
            </div>
          </div>
        );
      })()}

      {/* Aspect Compliance Cards - Enhanced */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <LayoutGrid className="w-5 h-5 text-primary" />
          Compliance per Aspek (Detail COBIT)
        </h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {(['A', 'B', 'C', 'D'] as AspectCategory[]).map(aspect => (
            <AspectComplianceCard
              key={aspect}
              aspect={aspect}
              questions={questions}
              findings={result.findings}
            />
          ))}
        </div>
      </div>

    </div>
  );
}

function StatBadge({
  icon,
  value,
  label,
  color,
}: {
  icon: React.ReactNode;
  value: number;
  label: string;
  color: 'destructive' | 'warning' | 'success';
}) {
  const colorClasses = {
    destructive: 'bg-destructive/20 text-destructive',
    warning: 'bg-warning/20 text-warning',
    success: 'bg-success/20 text-success',
  };

  return (
    <div className={`flex flex-col items-center gap-1 p-3 rounded-xl ${colorClasses[color]}`}>
      {icon}
      <span className="text-2xl font-bold">{value}</span>
      <span className="text-xs">{label}</span>
    </div>
  );
}
