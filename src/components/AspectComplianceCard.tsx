import { useMemo } from 'react';
import { 
  CheckCircle2, 
  AlertTriangle, 
  TrendingUp,
  FileText,
  Shield,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import { Question, FraudFinding, AspectCategory, ASPECT_LABELS, ASPECT_SHORT_LABELS, ASPECT_ICONS, ASPECT_COBIT_MAPPING, COBIT_DOMAINS, COBITDomain } from '@/types/assessment';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useState } from 'react';
import { Progress } from "@/components/ui/progress";

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
              {aspectFindings.slice(0, 3).map((finding, idx) => (
                <div 
                  key={finding.id} 
                  className={`p-3 rounded-lg border-l-4 bg-background/50 ${
                    finding.severity === 'major' ? 'border-l-destructive' : 'border-l-warning'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium shrink-0 ${
                      finding.severity === 'major' ? 'bg-destructive/20 text-destructive' : 'bg-warning/20 text-warning'
                    }`}>
                      {finding.severity === 'major' ? 'MAYOR' : 'MINOR'}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{finding.ruleName}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Soal: {finding.questionId}</p>
                    </div>
                  </div>
                </div>
              ))}
              {aspectFindings.length > 3 && (
                <p className="text-xs text-muted-foreground text-center py-2">
                  +{aspectFindings.length - 3} temuan lainnya
                </p>
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
    </div>
  );
}
