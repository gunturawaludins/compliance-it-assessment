import { useState, useCallback } from 'react';
import { Upload, FileSpreadsheet, Check, AlertCircle, Download, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Question } from '@/types/assessment';
import { parseExcelFile, exportToExcel } from '@/lib/excelParser';
import { useToast } from '@/hooks/use-toast';

interface ExcelUploaderProps {
  onImport: (questions: Question[]) => void;
  questions: Question[];
}

export function ExcelUploader({ onImport, questions }: ExcelUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<Question[] | null>(null);
  const { toast } = useToast();

  const handleFile = async (file: File) => {
    if (!file.name.match(/\.(xlsx|xls|csv)$/i)) {
      toast({
        title: 'Format Tidak Didukung',
        description: 'Silakan upload file Excel (.xlsx, .xls) atau CSV',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      const parsedQuestions = await parseExcelFile(file);
      setUploadedFile(file.name);
      setPreviewData(parsedQuestions);
      toast({
        title: 'File Berhasil Dibaca',
        description: `${parsedQuestions.length} pertanyaan ditemukan`,
      });
    } catch (error) {
      toast({
        title: 'Gagal Membaca File',
        description: error instanceof Error ? error.message : 'Terjadi kesalahan',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const confirmImport = () => {
    if (previewData) {
      onImport(previewData);
      toast({
        title: 'Import Berhasil',
        description: `${previewData.length} pertanyaan telah diimport`,
      });
      setPreviewData(null);
      setUploadedFile(null);
    }
  };

  const cancelImport = () => {
    setPreviewData(null);
    setUploadedFile(null);
  };

  return (
    <div className="space-y-6">
      {/* Upload Area */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`
          relative border-2 border-dashed rounded-2xl p-8 transition-all duration-300 text-center
          ${isDragging
            ? 'border-primary bg-primary/5 scale-[1.02]'
            : 'border-border hover:border-primary/50 hover:bg-secondary/30'
          }
          ${isLoading ? 'opacity-50 pointer-events-none' : ''}
        `}
      >
        <input
          type="file"
          accept=".xlsx,.xls,.csv"
          onChange={handleInputChange}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          disabled={isLoading}
        />
        
        <div className="space-y-4">
          <div className={`
            mx-auto w-16 h-16 rounded-2xl flex items-center justify-center transition-colors
            ${isDragging ? 'bg-primary/20' : 'bg-secondary'}
          `}>
            {isLoading ? (
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            ) : (
              <Upload className={`w-8 h-8 ${isDragging ? 'text-primary' : 'text-muted-foreground'}`} />
            )}
          </div>
          
          <div>
            <p className="text-lg font-medium text-foreground">
              {isLoading ? 'Memproses...' : 'Drag & Drop File Excel'}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              atau klik untuk memilih file (.xlsx, .xls, .csv)
            </p>
          </div>
        </div>
      </div>

      {/* Preview Section */}
      {previewData && (
        <div className="glass-card rounded-xl p-4 space-y-4 animate-slide-up">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-success/20">
                <FileSpreadsheet className="w-5 h-5 text-success" />
              </div>
              <div>
                <p className="font-medium text-foreground">{uploadedFile}</p>
                <p className="text-xs text-muted-foreground">{previewData.length} pertanyaan ditemukan</p>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={cancelImport}>
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Preview Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {(['A', 'B', 'C', 'D'] as const).map(cat => {
              const count = previewData.filter(q => q.category === cat).length;
              return (
                <div key={cat} className="bg-secondary/50 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-foreground">{count}</p>
                  <p className="text-xs text-muted-foreground">Aspek {cat}</p>
                </div>
              );
            })}
          </div>

          {/* Sample Preview */}
          <div className="bg-secondary/30 rounded-lg p-3 max-h-40 overflow-y-auto scrollbar-thin">
            <p className="text-xs text-muted-foreground mb-2">Preview Data:</p>
            {previewData.slice(0, 5).map((q, idx) => (
              <div key={idx} className="text-xs py-1 border-b border-border/30 last:border-0">
                <span className="font-mono text-primary">{q.id}</span>
                <span className="mx-2 text-muted-foreground">-</span>
                <span className="text-foreground">{q.text.substring(0, 60)}...</span>
              </div>
            ))}
            {previewData.length > 5 && (
              <p className="text-xs text-muted-foreground mt-2">
                ...dan {previewData.length - 5} pertanyaan lainnya
              </p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={cancelImport}>
              Batal
            </Button>
            <Button variant="success" onClick={confirmImport}>
              <Check className="w-4 h-4" />
              Import {previewData.length} Pertanyaan
            </Button>
          </div>
        </div>
      )}

      {/* Export Button */}
      <div className="glass-card rounded-xl p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium text-foreground">Export Data</p>
            <p className="text-sm text-muted-foreground">Download data asesmen ke Excel</p>
          </div>
          <Button
            variant="outline"
            onClick={() => exportToExcel(questions)}
            disabled={questions.length === 0}
          >
            <Download className="w-4 h-4" />
            Export Excel
          </Button>
        </div>
      </div>

      {/* Format Guide */}
      <div className="glass-card rounded-xl p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-warning shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-foreground">Format File Excel</p>
            <p className="text-sm text-muted-foreground mt-1">
              Pastikan file Excel memiliki kolom: <code className="font-mono text-primary">ID</code>, 
              <code className="font-mono text-primary ml-1">Pertanyaan</code>, 
              <code className="font-mono text-primary ml-1">Jawaban</code> (Ya/Tidak), 
              <code className="font-mono text-primary ml-1">Bukti Dokumen</code>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
