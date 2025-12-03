import { useState, useCallback } from 'react';
import { Upload, FileSpreadsheet, Check, AlertCircle, Download, X, User, Building, Phone, Briefcase } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Question, AssessorInfo } from '@/types/assessment';
import { parseExcelFile, exportToExcel, ParsedExcelData } from '@/lib/excelParser';
import { useToast } from '@/hooks/use-toast';

interface ExcelUploaderProps {
  onImport: (questions: Question[], assessorInfo?: AssessorInfo) => void;
  questions: Question[];
  assessorInfo?: AssessorInfo;
}

export function ExcelUploader({ onImport, questions, assessorInfo }: ExcelUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<ParsedExcelData | null>(null);
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
      const parsedData = await parseExcelFile(file);
      setUploadedFile(file.name);
      setPreviewData(parsedData);
      toast({
        title: 'File Berhasil Dibaca',
        description: `${parsedData.questions.length} pertanyaan ditemukan`,
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
      onImport(previewData.questions, previewData.assessorInfo);
      toast({
        title: 'Import Berhasil',
        description: `${previewData.questions.length} pertanyaan telah diimport`,
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
                <p className="text-xs text-muted-foreground">{previewData.questions.length} pertanyaan ditemukan</p>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={cancelImport}>
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Assessor Info Preview */}
          {previewData.assessorInfo.namaDanaPensiun && (
            <div className="bg-primary/10 rounded-lg p-4 space-y-3">
              <p className="text-sm font-semibold text-primary">Informasi Pengisi Assessment</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="flex items-center gap-2">
                  <Building className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Dana Pensiun</p>
                    <p className="text-sm font-medium text-foreground">{previewData.assessorInfo.namaDanaPensiun}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Nama PIC</p>
                    <p className="text-sm font-medium text-foreground">{previewData.assessorInfo.namaPIC}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Jabatan</p>
                    <p className="text-sm font-medium text-foreground">{previewData.assessorInfo.jabatanPIC}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">No. HP</p>
                    <p className="text-sm font-medium text-foreground">{previewData.assessorInfo.nomorHP}</p>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 pt-1">
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${previewData.assessorInfo.memilikiUnitSyariah ? 'bg-success/20 text-success' : 'bg-muted text-muted-foreground'}`}>
                  {previewData.assessorInfo.memilikiUnitSyariah ? 'Memiliki Unit Syariah' : 'Tidak Memiliki Unit Syariah'}
                </span>
              </div>
            </div>
          )}

          {/* Preview Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {(['A', 'B', 'C', 'D'] as const).map(cat => {
              const count = previewData.questions.filter(q => q.category === cat).length;
              const answered = previewData.questions.filter(q => q.category === cat && q.answer).length;
              return (
                <div key={cat} className="bg-secondary/50 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-foreground">{count}</p>
                  <p className="text-xs text-muted-foreground">Aspek {cat}</p>
                  <p className="text-xs text-primary">{answered} dijawab</p>
                </div>
              );
            })}
          </div>

          {/* Sample Preview */}
          <div className="bg-secondary/30 rounded-lg p-3 max-h-48 overflow-y-auto scrollbar-thin">
            <p className="text-xs text-muted-foreground mb-2">Preview Data:</p>
            {previewData.questions.slice(0, 8).map((q, idx) => (
              <div key={idx} className="text-xs py-1.5 border-b border-border/30 last:border-0 flex items-start gap-2">
                <span className="font-mono text-primary shrink-0 w-16">{q.id}</span>
                <span className="text-foreground flex-1">{q.text.substring(0, 80)}{q.text.length > 80 ? '...' : ''}</span>
                <span className={`shrink-0 px-1.5 py-0.5 rounded text-[10px] font-medium ${
                  q.answer === 'Ya' ? 'bg-success/20 text-success' : 
                  q.answer === 'Tidak' ? 'bg-destructive/20 text-destructive' : 
                  'bg-muted text-muted-foreground'
                }`}>
                  {q.answer || '-'}
                </span>
              </div>
            ))}
            {previewData.questions.length > 8 && (
              <p className="text-xs text-muted-foreground mt-2">
                ...dan {previewData.questions.length - 8} pertanyaan lainnya
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
              Import {previewData.questions.length} Pertanyaan
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
            onClick={() => exportToExcel(questions, assessorInfo)}
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
              Baris 1-5: Informasi pengisi (Nama Dana Pensiun, Nama PIC, No HP, Jabatan, Unit Syariah).
              <br />
              Baris 6 ke bawah: Data pertanyaan dengan format - Kolom A: <code className="font-mono text-primary">ID</code>, 
              Kolom B: <code className="font-mono text-primary">Pertanyaan</code>, 
              Kolom D: <code className="font-mono text-primary">Jawaban (Y/T)</code>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
