import { useMemo, useEffect } from 'react';
import { AlertTriangle, AlertCircle, CheckCircle2, FileSearch, ShieldAlert, ShieldCheck, Building, User, Phone, Briefcase, Calendar, Brain, Loader2 } from 'lucide-react';
import { Question, FraudRule, ASPECT_SHORT_LABELS, AspectCategory, AssessorInfo, COBIT_DOMAINS, COBITDomain } from '@/types/assessment';
import { analyzeFraud, getScoreColor, getScoreLabel } from '@/lib/fraudAnalyzer';
import { Button } from '@/components/ui/button';
import { useAIValidation } from '@/hooks/useAIValidation';
import FraudRulesPanel from './FraudRulesPanel';

interface DashboardProps {
  questions: Question[];
  rules: FraudRule[];
  onAnalyze: () => void;
  assessorInfo?: AssessorInfo;
}

export function Dashboard({ questions, rules, onAnalyze, assessorInfo }: DashboardProps) {
  const result = useMemo(() => analyzeFraud(questions, rules), [questions, rules]);
  const { validateWithAI, isValidating, aiResult, resetAIResult } = useAIValidation();

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

      {/* AI Result Card */}
      {aiResult && (
        <div className="glass-card rounded-xl p-6 border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Brain className="w-5 h-5 text-primary" />
            Hasil AI Cross-Validation
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className="p-3 rounded-lg bg-background/50 text-center">
              <div className={`text-2xl font-bold ${
                aiResult.overall_risk_level === 'critical' ? 'text-destructive' :
                aiResult.overall_risk_level === 'high' ? 'text-destructive' :
                aiResult.overall_risk_level === 'medium' ? 'text-warning' : 'text-success'
              }`}>
                {aiResult.overall_risk_level?.toUpperCase() || 'N/A'}
              </div>
              <div className="text-xs text-muted-foreground">Risk Level</div>
            </div>
            <div className="p-3 rounded-lg bg-background/50 text-center">
              <div className="text-2xl font-bold text-primary">{aiResult.consistency_score || 0}%</div>
              <div className="text-xs text-muted-foreground">Konsistensi</div>
            </div>
            <div className="p-3 rounded-lg bg-background/50 text-center">
              <div className="text-2xl font-bold text-destructive">{aiResult.findings?.length || 0}</div>
              <div className="text-xs text-muted-foreground">AI Findings</div>
            </div>
            <div className="p-3 rounded-lg bg-background/50 text-center">
              <div className="text-2xl font-bold text-warning">
                {aiResult.findings?.filter(f => f.severity === 'major').length || 0}
              </div>
              <div className="text-xs text-muted-foreground">Major Issues</div>
            </div>
          </div>
          
          {/* COBIT Compliance Summary */}
          {aiResult.cobit_compliance_summary && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium">COBIT 2019 Domain Compliance:</h4>
              <div className="grid grid-cols-5 gap-2">
                {(['edm', 'apo', 'bai', 'dss', 'mea'] as const).map(domain => {
                  const score = aiResult.cobit_compliance_summary?.[domain]?.score || 0;
                  const domainKey = domain.toUpperCase() as COBITDomain;
                  return (
                    <div key={domain} className="text-center p-2 rounded bg-background/50">
                      <div className={`text-lg font-bold ${score >= 80 ? 'text-success' : score >= 60 ? 'text-warning' : 'text-destructive'}`}>
                        {score}%
                      </div>
                      <div className="text-xs text-muted-foreground">{domainKey}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
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

      {/* Category Breakdown */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {(['A', 'B', 'C', 'D'] as AspectCategory[]).map(cat => {
          const stats = categoryStats[cat];
          const percentage = stats.total > 0 ? Math.round((stats.yesCount / stats.answered) * 100) || 0 : 0;
          
          return (
            <div key={cat} className="glass-card rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <span className={`
                  w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold
                  ${cat === 'A' ? 'bg-primary/20 text-primary' : ''}
                  ${cat === 'B' ? 'bg-accent/20 text-accent' : ''}
                  ${cat === 'C' ? 'bg-warning/20 text-warning' : ''}
                  ${cat === 'D' ? 'bg-success/20 text-success' : ''}
                `}>
                  {cat}
                </span>
                <span className="text-sm font-medium text-foreground">{ASPECT_SHORT_LABELS[cat]}</span>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Progress</span>
                  <span className="text-foreground font-medium">{stats.answered}/{stats.total}</span>
                </div>
                <div className="h-2 bg-secondary rounded-full overflow-hidden">
                  <div 
                    className={`h-full transition-all duration-500 rounded-full
                      ${cat === 'A' ? 'bg-primary' : ''}
                      ${cat === 'B' ? 'bg-accent' : ''}
                      ${cat === 'C' ? 'bg-warning' : ''}
                      ${cat === 'D' ? 'bg-success' : ''}
                    `}
                    style={{ width: `${stats.total > 0 ? (stats.answered / stats.total) * 100 : 0}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  {percentage}% jawaban "Ya"
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Rules Panel */}
      <div className="space-y-4">
        <FraudRulesPanel rules={rules} findings={result.findings} />
      </div>

      {/* Findings List */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-warning" />
          Temuan Kecurangan ({result.findings.length})
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
              // Extract standard reference from description
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
    <div className={`px-4 py-3 rounded-xl ${colorClasses[color]}`}>
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-2xl font-bold">{value}</span>
      </div>
      <p className="text-xs opacity-80 mt-1">{label}</p>
    </div>
  );
}
