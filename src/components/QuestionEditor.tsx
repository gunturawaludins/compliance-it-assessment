import { useState } from 'react';
import { Plus, Pencil, Trash2, Check, X, ChevronDown, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Question, AspectCategory, ASPECT_SHORT_LABELS, ASPECT_LABELS } from '@/types/assessment';
import { generateId } from '@/data/defaultQuestions';

interface QuestionEditorProps {
  questions: Question[];
  onUpdate: (questions: Question[]) => void;
}

export function QuestionEditor({ questions, onUpdate }: QuestionEditorProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [editCategory, setEditCategory] = useState<AspectCategory>('A');
  const [newQuestion, setNewQuestion] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Set<AspectCategory>>(new Set(['A', 'B', 'C', 'D']));

  const toggleCategory = (cat: AspectCategory) => {
    const next = new Set(expandedCategories);
    if (next.has(cat)) next.delete(cat);
    else next.add(cat);
    setExpandedCategories(next);
  };

  const groupedQuestions = questions.reduce((acc, q) => {
    if (!acc[q.category]) acc[q.category] = [];
    acc[q.category].push(q);
    return acc;
  }, {} as Record<AspectCategory, Question[]>);

  const handleAnswerChange = (id: string, answer: 'Ya' | 'Tidak' | null) => {
    onUpdate(questions.map(q => q.id === id ? { ...q, answer } : q));
  };

  const handleEdit = (q: Question) => {
    setEditingId(q.id);
    setEditText(q.text);
    setEditCategory(q.category);
  };

  const handleSaveEdit = () => {
    if (!editingId || !editText.trim()) return;
    onUpdate(questions.map(q => 
      q.id === editingId ? { ...q, text: editText.trim(), category: editCategory } : q
    ));
    setEditingId(null);
    setEditText('');
  };

  const handleDelete = (id: string) => {
    onUpdate(questions.filter(q => q.id !== id));
  };

  const handleAddNew = () => {
    if (!editText.trim()) return;
    const newQ: Question = {
      id: generateId(),
      category: editCategory,
      text: editText.trim(),
      isSubQuestion: false,
      answer: null,
    };
    onUpdate([...questions, newQ]);
    setNewQuestion(false);
    setEditText('');
  };

  return (
    <div className="space-y-4">
      {/* Add New Button */}
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold text-foreground">Daftar Pertanyaan</h2>
        <Button
          onClick={() => { setNewQuestion(true); setEditCategory('A'); }}
          variant="glow"
          size="sm"
          disabled={newQuestion}
        >
          <Plus className="w-4 h-4" />
          Tambah Soal
        </Button>
      </div>

      {/* New Question Form */}
      {newQuestion && (
        <div className="glass-card rounded-xl p-4 space-y-3 animate-slide-up border-primary/30">
          <div className="flex gap-3">
            <select
              value={editCategory}
              onChange={(e) => setEditCategory(e.target.value as AspectCategory)}
              className="bg-secondary border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {(['A', 'B', 'C', 'D'] as AspectCategory[]).map(cat => (
                <option key={cat} value={cat}>{cat}: {ASPECT_SHORT_LABELS[cat]}</option>
              ))}
            </select>
          </div>
          <textarea
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            placeholder="Tulis pertanyaan baru..."
            className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary min-h-[80px] resize-none"
          />
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" size="sm" onClick={() => { setNewQuestion(false); setEditText(''); }}>
              <X className="w-4 h-4" /> Batal
            </Button>
            <Button variant="success" size="sm" onClick={handleAddNew} disabled={!editText.trim()}>
              <Check className="w-4 h-4" /> Simpan
            </Button>
          </div>
        </div>
      )}

      {/* Questions by Category */}
      <div className="space-y-3">
        {(['A', 'B', 'C', 'D'] as AspectCategory[]).map(category => (
          <div key={category} className="glass-card rounded-xl overflow-hidden">
            {/* Category Header */}
            <button
              onClick={() => toggleCategory(category)}
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-secondary/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className={`
                  w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold
                  ${category === 'A' ? 'bg-primary/20 text-primary' : ''}
                  ${category === 'B' ? 'bg-accent/20 text-accent' : ''}
                  ${category === 'C' ? 'bg-warning/20 text-warning' : ''}
                  ${category === 'D' ? 'bg-success/20 text-success' : ''}
                `}>
                  {category}
                </span>
                <div className="text-left">
                  <p className="font-medium text-sm text-foreground">{ASPECT_SHORT_LABELS[category]}</p>
                  <p className="text-xs text-muted-foreground">{groupedQuestions[category]?.length || 0} pertanyaan</p>
                </div>
              </div>
              {expandedCategories.has(category) ? (
                <ChevronDown className="w-5 h-5 text-muted-foreground" />
              ) : (
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              )}
            </button>

            {/* Questions List */}
            {expandedCategories.has(category) && (
              <div className="border-t border-border/50">
                {(groupedQuestions[category] || []).map((q, idx) => (
                  <div
                    key={q.id}
                    className={`
                      px-4 py-3 flex gap-3 items-start hover:bg-secondary/30 transition-colors
                      ${idx !== 0 ? 'border-t border-border/30' : ''}
                      ${q.isSubQuestion ? 'pl-10' : ''}
                    `}
                  >
                    {editingId === q.id ? (
                      <div className="flex-1 space-y-2">
                        <div className="flex gap-2">
                          <select
                            value={editCategory}
                            onChange={(e) => setEditCategory(e.target.value as AspectCategory)}
                            className="bg-secondary border border-border rounded-lg px-2 py-1 text-xs"
                          >
                            {(['A', 'B', 'C', 'D'] as AspectCategory[]).map(cat => (
                              <option key={cat} value={cat}>{cat}</option>
                            ))}
                          </select>
                        </div>
                        <textarea
                          value={editText}
                          onChange={(e) => setEditText(e.target.value)}
                          className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm min-h-[60px] resize-none"
                        />
                        <div className="flex gap-2 justify-end">
                          <Button variant="ghost" size="sm" onClick={() => setEditingId(null)}>
                            <X className="w-3 h-3" />
                          </Button>
                          <Button variant="success" size="sm" onClick={handleSaveEdit}>
                            <Check className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-muted-foreground font-mono mb-1">{q.id}</p>
                          <p className="text-sm text-foreground leading-relaxed">{q.text}</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {/* Answer Buttons */}
                          <div className="flex gap-1">
                            <button
                              onClick={() => handleAnswerChange(q.id, q.answer === 'Ya' ? null : 'Ya')}
                              className={`
                                px-2 py-1 rounded text-xs font-medium transition-all
                                ${q.answer === 'Ya'
                                  ? 'bg-success text-success-foreground'
                                  : 'bg-secondary text-muted-foreground hover:bg-success/20 hover:text-success'
                                }
                              `}
                            >
                              Ya
                            </button>
                            <button
                              onClick={() => handleAnswerChange(q.id, q.answer === 'Tidak' ? null : 'Tidak')}
                              className={`
                                px-2 py-1 rounded text-xs font-medium transition-all
                                ${q.answer === 'Tidak'
                                  ? 'bg-destructive text-destructive-foreground'
                                  : 'bg-secondary text-muted-foreground hover:bg-destructive/20 hover:text-destructive'
                                }
                              `}
                            >
                              Tidak
                            </button>
                          </div>
                          {/* Edit/Delete */}
                          <button
                            onClick={() => handleEdit(q)}
                            className="p-1.5 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(q.id)}
                            className="p-1.5 rounded hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
                {(!groupedQuestions[category] || groupedQuestions[category].length === 0) && (
                  <p className="px-4 py-6 text-center text-sm text-muted-foreground">
                    Belum ada pertanyaan dalam kategori ini
                  </p>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
