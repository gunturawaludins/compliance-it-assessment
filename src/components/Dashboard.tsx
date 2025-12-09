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
                    (aiResult.consistency_score || 0) >= 80 ? 'text-success' : 
                    (aiResult.consistency_score || 0) >= 60 ? 'text-warning' : 'text-destructive'
                  }`}>
                    {aiResult.consistency_score || 0}%
                  </div>
                  <div className="text-xs text-muted-foreground">Konsistensi</div>
                </div>
                <div className="p-4 rounded-xl bg-background/50 text-center border">
                  <div className="text-3xl font-bold text-destructive">{aiResult.findings?.length || 0}</div>
                  <div className="text-xs text-muted-foreground">AI Findings</div>
                </div>
                <div className="p-4 rounded-xl bg-background/50 text-center border">
                  <div className="text-3xl font-bold text-warning">
                    {aiResult.findings?.filter((f: AIFinding) => f.severity === 'major').length || 0}
                  </div>
                  <div className="text-xs text-muted-foreground">Major Issues</div>
                </div>
              </div>

              {/* Analysis Summary - Written Explanation */}
              {aiResult.analysis_summary && (
                <div className="p-4 rounded-xl bg-primary/5 border border-primary/20">
                  <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-primary" />
                    Ringkasan Analisis AI
                  </h4>
                  <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                    {aiResult.analysis_summary}
                  </p>
                </div>
              )}
              
              {/* COBIT Compliance Summary */}
              {aiResult.cobit_compliance_summary && (
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-primary" />
                    COBIT 2019 Domain Compliance
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                    {(['edm', 'apo', 'bai', 'dss', 'mea'] as const).map(domain => {
                      const domainData = aiResult.cobit_compliance_summary?.[domain];
                      const score = domainData?.score || 0;
                      const summary = domainData?.summary || '';
                      const domainKey = domain.toUpperCase() as COBITDomain;
                      const domainInfo = COBIT_DOMAINS[domainKey];
                      
                      return (
                        <div key={domain} className="p-3 rounded-xl bg-background/50 border space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-muted-foreground">{domainKey}</span>
                            <span className={`text-lg font-bold ${
                              score >= 80 ? 'text-success' : score >= 60 ? 'text-warning' : 'text-destructive'
                            }`}>
                              {score}%
                            </span>
                          </div>
                          <div className="h-2 bg-secondary rounded-full overflow-hidden">
                            <div 
                              className={`h-full transition-all duration-500 rounded-full ${
                                score >= 80 ? 'bg-success' : score >= 60 ? 'bg-warning' : 'bg-destructive'
                              }`}
                              style={{ width: `${score}%` }}
                            />
                          </div>
                          <p className="text-xs text-muted-foreground">{domainInfo?.name}</p>
                          {summary && (
                            <p className="text-xs text-foreground/80 mt-1">{summary}</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* AI Findings Detail */}
              {aiResult.findings && aiResult.findings.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-warning" />
                    Detail Temuan AI ({aiResult.findings.length})
                  </h4>
                  <div className="space-y-3">
                    {aiResult.findings.map((finding: AIFinding, idx: number) => (
                      <div 
                        key={idx}
                        className={`p-4 rounded-xl border-l-4 bg-background/50 ${
                          finding.severity === 'major' ? 'border-l-destructive' : 'border-l-warning'
                        }`}
                      >
                        <div className="flex flex-wrap items-center gap-2 mb-2">
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
                              {finding.cobit_reference}
                            </span>
                          )}
                        </div>
                        
                        <p className="text-sm text-foreground mb-2">{finding.description}</p>
                        
                        {finding.question_ids && finding.question_ids.length > 0 && (
                          <div className="flex flex-wrap gap-1 mb-2">
                            <span className="text-xs text-muted-foreground">Soal terkait:</span>
                            {finding.question_ids.map((qId: string) => (
                              <span key={qId} className="px-2 py-0.5 rounded bg-secondary text-xs font-mono">
                                {qId}
                              </span>
                            ))}
                          </div>
                        )}
                        
                        {finding.recommendation && (
                          <div className="p-2 rounded bg-success/10 border border-success/20 mt-2">
                            <p className="text-xs text-success">
                              <strong>Rekomendasi:</strong> {finding.recommendation}
                            </p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CollapsibleContent>
          </Collapsible>
        </div>
      )}

      {/* Score Card */}
      <div className="glass-card rounded-2xl p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-primary/10 to-transparent rounded-full -translate-y-1/2 translate-x-1/2" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="flex items-center gap-6">
            <div className={`
              w-28 h-28 rounded-2xl flex flex-col items-center justify-center
              ${result.honestyScore >= 80 ? 'bg-success/20' : result.honestyScore >= 60 ? 'bg-warning/20' : 'bg-destructive/20'}
            `}>
              <span className={`text-4xl font-bold ${getScoreColor(result.honestyScore)}`}>
                {result.honestyScore}%
              </span>
              <span className="text-xs text-muted-foreground mt-1">Skor</span>
            </div>
            <div>
              <h3 className="text-2xl font-bold text-foreground">
                Skor Kejujuran
              </h3>
              <p className={`text-lg font-medium ${getScoreColor(result.honestyScore)}`}>
                {getScoreLabel(result.honestyScore)}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Berdasarkan {rules.length} aturan deteksi fraud
              </p>
            </div>
          </div>
          
          <div className="flex gap-4">
            <StatBadge
              icon={<ShieldAlert className="w-5 h-5" />}
              value={result.majorFindings}
              label="Mayor"
              color="destructive"
            />
            <StatBadge
              icon={<AlertCircle className="w-5 h-5" />}
              value={result.minorFindings}
              label="Minor"
              color="warning"
            />
            <StatBadge
              icon={<ShieldCheck className="w-5 h-5" />}
              value={result.consistentAnswers}
              label="Konsisten"
              color="success"
            />
          </div>
        </div>
      </div>

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

      {/* Findings List */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-warning" />
          Temuan Rule-Based ({result.findings.length})
        </h3>

        {result.findings.length === 0 ? (
          <div className="glass-card rounded-xl p-8 text-center">
            <CheckCircle2 className="w-12 h-12 text-success mx-auto mb-3" />
            <p className="text-lg font-medium text-foreground">Tidak Ada Temuan</p>
            <p className="text-sm text-muted-foreground">
              Semua jawaban konsisten dengan bukti yang tersedia
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {result.findings.map((finding, idx) => {
              const standardMatch = finding.description.match(/\[(.*?)\]/);
              const standardRef = standardMatch ? standardMatch[1] : null;
              
              return (
                <div
                  key={finding.id}
                  className={`
                    glass-card rounded-xl p-4 border-l-4 animate-slide-up
                    ${finding.severity === 'major' ? 'border-l-destructive' : 'border-l-warning'}
                  `}
                  style={{ animationDelay: `${idx * 50}ms` }}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <span className={`
                          px-2 py-0.5 rounded text-xs font-medium
                          ${finding.severity === 'major' 
                            ? 'bg-destructive/20 text-destructive' 
                            : 'bg-warning/20 text-warning'
                          }
                        `}>
                          {finding.severity === 'major' ? 'MAYOR' : 'MINOR'}
                        </span>
                        <span className="px-2 py-0.5 rounded text-xs font-medium bg-secondary text-foreground">
                          {finding.fraudType}
                        </span>
                        {standardRef && (
                          <span className="px-2 py-0.5 rounded text-xs font-medium bg-primary/10 text-primary flex items-center gap-1">
                            <Brain className="w-3 h-3" />
                            {standardRef}
                          </span>
                        )}
                      </div>
                      <h4 className="font-medium text-foreground mb-1">{finding.ruleName}</h4>
                      <p className="text-sm text-muted-foreground mb-3">
                        {finding.description.replace(/\s*\[.*?\]\s*$/, '')}
                      </p>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        <div className="flex gap-2 p-2 rounded bg-background/50">
                          <span className="text-muted-foreground shrink-0">Soal Kondisi:</span>
                          <span className="font-mono text-primary font-medium">{finding.questionId}</span>
                        </div>
                        <div className="flex gap-2 p-2 rounded bg-background/50">
                          <span className="text-muted-foreground shrink-0">Bukti Tidak Konsisten:</span>
                          <span className="font-mono text-destructive font-medium">{finding.evidenceId}</span>
                        </div>
                      </div>
                    </div>
                    
                    {finding.severity === 'major' ? (
                      <ShieldAlert className="w-6 h-6 text-destructive shrink-0" />
                    ) : (
                      <AlertCircle className="w-6 h-6 text-warning shrink-0" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
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
