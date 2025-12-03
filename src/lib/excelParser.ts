import * as XLSX from 'xlsx';
import { Question, AspectCategory } from '@/types/assessment';

interface ExcelRow {
  ID?: string;
  Pertanyaan?: string;
  Jawaban?: string;
  'Bukti Dokumen'?: string;
  [key: string]: string | undefined;
}

export function parseExcelFile(file: File): Promise<Question[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json<ExcelRow>(worksheet, { defval: '' });
        
        const questions: Question[] = [];
        
        for (const row of jsonData) {
          // Try different column naming conventions
          const id = row.ID || row.id || row['No'] || row['Nomor'] || '';
          const questionText = row.Pertanyaan || row.pertanyaan || row['Question'] || row['Soal'] || '';
          const answer = row.Jawaban || row.jawaban || row['Answer'] || row['Ya/Tidak'] || '';
          const evidence = row['Bukti Dokumen'] || row.Bukti || row.bukti || row['Evidence'] || '';
          
          if (!id || !questionText) continue;
          
          // Determine category from ID
          let category: AspectCategory = 'A';
          const idStr = String(id).toUpperCase();
          
          if (idStr.startsWith('A') || idStr.startsWith('DPA')) {
            category = 'A';
          } else if (idStr.startsWith('B') || idStr.startsWith('DPB')) {
            category = 'B';
          } else if (idStr.startsWith('C') || idStr.startsWith('DPC')) {
            category = 'C';
          } else if (idStr.startsWith('D') || idStr.startsWith('DPD')) {
            category = 'D';
          }
          
          // Parse answer
          let parsedAnswer: 'Ya' | 'Tidak' | null = null;
          const answerStr = String(answer).toLowerCase().trim();
          if (answerStr === 'ya' || answerStr === 'y' || answerStr === 'yes' || answerStr === '1') {
            parsedAnswer = 'Ya';
          } else if (answerStr === 'tidak' || answerStr === 't' || answerStr === 'no' || answerStr === '0') {
            parsedAnswer = 'Tidak';
          }
          
          // Determine if sub-question
          const isSubQuestion = String(id).includes('.') && String(id).split('.').length > 2;
          
          questions.push({
            id: String(id),
            category,
            text: String(questionText),
            isSubQuestion,
            subLevel: isSubQuestion ? 1 : undefined,
            answer: parsedAnswer,
            evidence: evidence ? String(evidence) : undefined,
          });
        }
        
        resolve(questions);
      } catch (error) {
        reject(new Error('Gagal membaca file Excel. Pastikan format file benar.'));
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Gagal membaca file.'));
    };
    
    reader.readAsBinaryString(file);
  });
}

export function exportToExcel(questions: Question[]): void {
  const exportData = questions.map(q => ({
    ID: q.id,
    Kategori: q.category,
    Pertanyaan: q.text,
    Jawaban: q.answer || '',
    'Bukti Dokumen': q.evidence || '',
  }));
  
  const worksheet = XLSX.utils.json_to_sheet(exportData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Assessment');
  
  XLSX.writeFile(workbook, `IT_Assessment_${new Date().toISOString().split('T')[0]}.xlsx`);
}
