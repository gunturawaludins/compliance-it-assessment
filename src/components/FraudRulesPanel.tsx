import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronRight, CheckCircle2, AlertCircle } from 'lucide-react';
import { FraudRule, FraudFinding } from '@/types/assessment';

export default function FraudRulesPanel({
  rules,
  findings,
}: {
  rules: FraudRule[];
  findings: FraudFinding[];
}) {
  const [open, setOpen] = useState<Record<string, boolean>>({});

  const toggle = (id: string) => {
    setOpen(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const isDetected = (ruleId: string) => findings.some(f => f.ruleId === ruleId);
  const findingFor = (ruleId: string) => findings.find(f => f.ruleId === ruleId);

  return (
    <div className="space-y-3">
      <h3 className="text-lg font-semibold text-foreground">Aturan Deteksi Fraud</h3>
      <p className="text-sm text-muted-foreground">Klik tombol untuk buka/tutup keterangan aturan dan lihat apakah terdeteksi.</p>

      <div className="grid gap-2">
        {rules.map(rule => {
          const detected = isDetected(rule.id);
          const finding = findingFor(rule.id);

          return (
            <div key={rule.id} className="rounded-xl border bg-background p-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                  <Button variant="ghost" size="sm" onClick={() => toggle(rule.id)}>
                    {open[rule.id] ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  </Button>

                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-foreground">{rule.name}</span>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${detected ? 'bg-destructive/20 text-destructive' : 'bg-success/10 text-success'}`}>
                        {detected ? 'TERDETEKSI' : 'TIDAK TERDETEKSI'}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">{rule.id} • {rule.fraudType} • {rule.severity.toUpperCase()}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {detected ? <CheckCircle2 className="w-5 h-5 text-destructive" /> : <AlertCircle className="w-5 h-5 text-success" />}
                </div>
              </div>

              {open[rule.id] && (
                <div className="mt-2 text-sm text-muted-foreground">
                  <p className="mb-1">{rule.description}</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    <div className="p-2 rounded bg-background/50">
                      <div className="text-muted-foreground">Soal Kondisi</div>
                      <div className="font-mono text-foreground">{rule.conditionQuestionId} = {rule.conditionAnswer}</div>
                    </div>
                    <div className="p-2 rounded bg-background/50">
                      <div className="text-muted-foreground">Soal Bukti</div>
                      <div className="font-mono text-foreground">{rule.evidenceQuestionId} • harus {rule.evidenceCondition}</div>
                    </div>
                  </div>

                  {detected && finding && (
                    <div className="mt-2 p-2 rounded bg-destructive/10 border-l-4 border-destructive text-sm">
                      <div className="font-medium text-destructive">Temuan: {finding.ruleName}</div>
                      <div className="text-xs text-muted-foreground">{finding.description}</div>
                      <div className="mt-1 text-xs">Soal: <span className="font-mono">{finding.questionId}</span> • Bukti: <span className="font-mono">{finding.evidenceId}</span></div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
