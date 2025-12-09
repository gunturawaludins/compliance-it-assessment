import { useState, useCallback } from 'react';
import { Upload, FileSpreadsheet, X, Building, TrendingUp, BarChart3, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { parseMultipleExcelFiles, DanaPensiunComplianceData } from '@/lib/multiExcelParser';

interface MultiComplianceUploaderProps {
  onDataLoaded: (data: DanaPensiunComplianceData[]) => void;
}

export function MultiComplianceUploader({ onDataLoaded }: MultiComplianceUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [parsedData, setParsedData] = useState<DanaPensiunComplianceData[]>([]);
  const { toast } = useToast();

  const handleFiles = async (files: FileList | File[]) => {
    const fileArray = Array.from(files).filter(f => f.name.match(/\.(xlsx|xls)$/i));
    
    if (fileArray.length === 0) {
      toast({
        title: 'Format Tidak Didukung',
        description: 'Silakan upload file Excel (.xlsx, .xls) hasil export sistem',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      const newParsedData = await parseMultipleExcelFiles(fileArray);
      
      // Merge with existing data, avoid duplicates by Dana Pensiun name
      const existingNames = parsedData.map(d => d.danaPensiun);
      const uniqueNewData = newParsedData.filter(d => !existingNames.includes(d.danaPensiun));
      
      if (uniqueNewData.length < newParsedData.length) {
        toast({
          title: 'Data Duplikat Dilewati',
          description: `${newParsedData.length - uniqueNewData.length} file dengan Dana Pensiun yang sama dilewati`,
          variant: 'default',
        });
      }
      
      const allData = [...parsedData, ...uniqueNewData];
      setParsedData(allData);
      setUploadedFiles([...uploadedFiles, ...fileArray.filter((_, i) => !existingNames.includes(newParsedData[i]?.danaPensiun))]);
      
      toast({
        title: 'File Berhasil Diproses',
        description: `${uniqueNewData.length} data Dana Pensiun berhasil dimuat`,
      });
      
      // Auto-send to parent if we have data
      if (allData.length > 0) {
        onDataLoaded(allData);
      }
      
    } catch (error) {
      toast({
        title: 'Gagal Memproses File',
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
    handleFiles(e.dataTransfer.files);
  }, [parsedData, uploadedFiles]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFiles(e.target.files);
    }
  };

  const removeData = (danaPensiun: string) => {
    const newData = parsedData.filter(d => d.danaPensiun !== danaPensiun);
    setParsedData(newData);
    onDataLoaded(newData);
  };

  const clearAll = () => {
    setParsedData([]);
    setUploadedFiles([]);
    onDataLoaded([]);
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
          accept=".xlsx,.xls"
          multiple
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
              {isLoading ? 'Memproses...' : 'Drag & Drop Multiple Excel Files'}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Upload file Excel hasil export sistem untuk perbandingan compliance Dana Pensiun
            </p>
            <p className="text-xs text-primary mt-2">
              Mendukung upload banyak file sekaligus
            </p>
          </div>
        </div>
      </div>

      {/* Loaded Data Preview */}
      {parsedData.length > 0 && (
        <div className="glass-card rounded-xl p-4 space-y-4 animate-slide-up">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/20">
                <BarChart3 className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="font-medium text-foreground">{parsedData.length} Dana Pensiun Dimuat</p>
                <p className="text-xs text-muted-foreground">Siap untuk analisis perbandingan compliance</p>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={clearAll} className="text-destructive hover:text-destructive">
              <X className="w-4 h-4 mr-1" />
              Hapus Semua
            </Button>
          </div>

          {/* Data Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {parsedData.map((dp) => (
              <div key={dp.danaPensiun} className="relative bg-secondary/50 rounded-lg p-4 group">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity w-6 h-6"
                  onClick={() => removeData(dp.danaPensiun)}
                >
                  <X className="w-3 h-3" />
                </Button>
                
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                    <Building className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground text-sm truncate">{dp.danaPensiun}</p>
                    <p className="text-xs text-muted-foreground truncate">{dp.pic} - {dp.jabatan}</p>
                  </div>
                </div>
                
                <div className="mt-3 flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <TrendingUp className="w-3 h-3 text-success" />
                    <span className="text-xs text-muted-foreground">Compliance</span>
                  </div>
                  <span className={`text-lg font-bold ${
                    dp.overallComplianceScore >= 80 ? 'text-success' :
                    dp.overallComplianceScore >= 60 ? 'text-warning' :
                    'text-destructive'
                  }`}>
                    {dp.overallComplianceScore}%
                  </span>
                </div>
                
                {/* Mini Aspect Bars */}
                <div className="mt-2 flex gap-1">
                  {dp.aspectStats.map(stat => (
                    <div key={stat.aspect} className="flex-1">
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full ${
                            stat.complianceRate >= 80 ? 'bg-success' :
                            stat.complianceRate >= 60 ? 'bg-warning' :
                            'bg-destructive'
                          }`}
                          style={{ width: `${stat.complianceRate}%` }}
                        />
                      </div>
                      <p className="text-[10px] text-center text-muted-foreground mt-0.5">{stat.aspect}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Format Guide */}
      <div className="glass-card rounded-xl p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-warning shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-foreground">Format File yang Didukung</p>
            <p className="text-sm text-muted-foreground mt-1">
              Upload file Excel yang dihasilkan dari fitur <span className="text-primary font-medium">Export Excel</span> pada halaman Questionnaire.
              File harus memiliki sheet "Ringkasan" dengan data compliance dan informasi responden.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
