import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronRight, CheckCircle2, AlertCircle, ListFilter, XCircle } from 'lucide-react';
import { FraudRule, FraudFinding } from '@/types/assessment';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

export default function FraudRulesPanel({
  rules,
  findings,
}: {
  rules: FraudRule[];
  findings: FraudFinding[];
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [expandedRules, setExpandedRules] = useState<Record<string, boolean>>({});
  const [filter, setFilter] = useState<'all' | 'detected' | 'clean'>('all');

  const toggleRule = (id: string) => {
    setExpandedRules(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const isDetected = (ruleId: string) => findings.some(f => f.ruleId === ruleId);
  const findingFor = (ruleId: string) => findings.find(f => f.ruleId === ruleId);

  const detectedCount = rules.filter(r => isDetected(r.id)).length;
  const cleanCount = rules.length - detectedCount;

  const filteredRules = rules.filter(rule => {
    if (filter === 'detected') return isDetected(rule.id);
    if (filter === 'clean') return !isDetected(rule.id);
    return true;
  });

  // Group rules by category
  const groupedRules = filteredRules.reduce((acc, rule) => {
    const category = rule.fraudType;
    if (!acc[category]) acc[category] = [];
    acc[category].push(rule);
    return acc;
  }, {} as Record<string, FraudRule[]>);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="space-y-2">
      <div className="glass-card rounded-xl p-4">
        <CollapsibleTrigger asChild>
          <div className="flex items-center justify-between cursor-pointer hover:opacity-80 transition-opacity">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <ListFilter className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground">Aturan Deteksi Fraud</h3>
                <p className="text-sm text-muted-foreground">
                  {rules.length} aturan • {detectedCount} terdeteksi • {cleanCount} bersih
                </p>
              </div>
            </div>
            <Button variant="ghost" size="sm">
              {isOpen ? (
                <ChevronDown className="w-5 h-5" />
              ) : (
                <ChevronRight className="w-5 h-5" />
              )}
            </Button>
          </div>
        </CollapsibleTrigger>

        <CollapsibleContent className="mt-4 space-y-4">
          {/* Filter buttons */}
          <div className="flex gap-2 flex-wrap">
            <Button
              variant={filter === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('all')}
            >
              Semua ({rules.length})
            </Button>
            <Button
              variant={filter === 'detected' ? 'destructive' : 'outline'}
              size="sm"
              onClick={() => setFilter('detected')}
              className={filter !== 'detected' ? 'text-destructive border-destructive/50' : ''}
            >
              <XCircle className="w-4 h-4 mr-1" />
              Terdeteksi ({detectedCount})
            </Button>
            <Button
              variant={filter === 'clean' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('clean')}
              className={filter === 'clean' ? 'bg-success hover:bg-success/90' : 'text-success border-success/50'}
            >
              <CheckCircle2 className="w-4 h-4 mr-1" />
              Bersih ({cleanCount})
            </Button>
          </div>

          {/* Grouped rules */}
          <div className="space-y-4">
            {Object.entries(groupedRules).map(([category, categoryRules]) => (
              <div key={category} className="space-y-2">
                <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                  {category} ({categoryRules.length})
                </h4>
                <div className="grid gap-2">
                  {categoryRules.map(rule => {
                    const detected = isDetected(rule.id);
                    const finding = findingFor(rule.id);

                    return (
                      <div 
                        key={rule.id} 
                        className={`rounded-lg border p-3 transition-colors ${
                          detected 
                            ? 'border-destructive/50 bg-destructive/5' 
                            : 'border-border bg-background/50'
                        }`}
                      >
                        <div 
                          className="flex items-center justify-between gap-2 cursor-pointer"
                          onClick={() => toggleRule(rule.id)}
                        >
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <Button variant="ghost" size="sm" className="p-1 h-auto">
                              {expandedRules[rule.id] ? (
                                <ChevronDown className="w-4 h-4" />
                              ) : (
                                <ChevronRight className="w-4 h-4" />
                              )}
                            </Button>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-medium text-foreground text-sm truncate">
                                  {rule.name}
                                </span>
                                <span className={`px-2 py-0.5 rounded text-xs font-medium shrink-0 ${
                                  detected 
                                    ? 'bg-destructive/20 text-destructive' 
                                    : 'bg-success/20 text-success'
                                }`}>
                                  {detected ? 'TERDETEKSI' : 'OK'}
                                </span>
                                <span className={`px-2 py-0.5 rounded text-xs font-medium shrink-0 ${
                                  rule.severity === 'major' 
                                    ? 'bg-destructive/10 text-destructive' 
                                    : 'bg-warning/10 text-warning'
                                }`}>
                                  {rule.severity.toUpperCase()}
                                </span>
                              </div>
                              <p className="text-xs text-muted-foreground mt-1 truncate">
                                {rule.id}
                              </p>
                            </div>
                          </div>

                          {detected ? (
                            <AlertCircle className="w-5 h-5 text-destructive shrink-0" />
                          ) : (
                            <CheckCircle2 className="w-5 h-5 text-success shrink-0" />
                          )}
                        </div>

                        {expandedRules[rule.id] && (
                          <div className="mt-3 pl-9 space-y-3">
                            <p className="text-sm text-muted-foreground">{rule.description}</p>
                            
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                              <div className="p-2 rounded bg-background border">
                                <div className="text-muted-foreground mb-1">Soal Kondisi</div>
                                <div className="font-mono text-foreground">
                                  {rule.conditionQuestionId} = <span className="text-primary">{rule.conditionAnswer}</span>
                                </div>
                              </div>
                              <div className="p-2 rounded bg-background border">
                                <div className="text-muted-foreground mb-1">Soal Bukti</div>
                                <div className="font-mono text-foreground">
                                  {rule.evidenceQuestionId} harus <span className="text-primary">{rule.evidenceCondition}</span>
                                </div>
                              </div>
                            </div>

                            {detected && finding && (
                              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                                <div className="font-medium text-destructive text-sm mb-1">
                                  ⚠️ Temuan Aktif
                                </div>
                                <p className="text-xs text-muted-foreground">{finding.description}</p>
                                <div className="mt-2 flex gap-4 text-xs">
                                  <span>
                                    Soal: <span className="font-mono text-foreground">{finding.questionId}</span>
                                  </span>
                                  <span>
                                    Bukti: <span className="font-mono text-foreground">{finding.evidenceId}</span>
                                  </span>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {filteredRules.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <ListFilter className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>Tidak ada aturan yang sesuai dengan filter</p>
            </div>
          )}
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
