import * as XLSX from 'xlsx';
import { Question, AspectCategory, AssessorInfo } from '@/types/assessment';

export interface ParsedExcelData {
  assessorInfo: AssessorInfo;
  questions: Question[];
}

export function parseExcelFile(file: File): Promise<ParsedExcelData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        // Convert to array of arrays for easier parsing
        const rawData = XLSX.utils.sheet_to_json<(string | number | undefined)[]>(worksheet, { 
          header: 1,
          defval: ''
        });
        
        // Parse assessor info from rows 1-5 (index 0-4)
        const assessorInfo: AssessorInfo = {
          namaDanaPensiun: String(rawData[0]?.[3] || '').trim(),
          namaPIC: String(rawData[1]?.[3] || '').trim(),
          nomorHP: String(rawData[2]?.[3] || '').trim(),
          jabatanPIC: String(rawData[3]?.[3] || '').trim(),
          memilikiUnitSyariah: String(rawData[4]?.[3] || '').toUpperCase() === 'Y',
        };
        
        const questions: Question[] = [];
        let currentCategory: AspectCategory = 'A';
        let currentMainId = '';
        
        // Start from row 6 (index 5) onwards
        for (let i = 5; i < rawData.length; i++) {
          const row = rawData[i];
          if (!row || row.length === 0) continue;
          
          const colA = String(row[0] || '').trim();
          const colB = String(row[1] || '').trim();
          const colD = String(row[3] || '').trim();
          
          // Skip empty rows
          if (!colA && !colB) continue;
          
          // Check if this is a category header (A, B, C, D)
          if (['A', 'B', 'C', 'D'].includes(colA) && colB.includes('ASPEK')) {
            currentCategory = colA as AspectCategory;
            continue;
          }
          
          // Check if this is a main question (has number in column A)
          const isMainQuestion = /^\d+$/.test(colA);
          
          // Check if this is a sub-question (empty column A, has letter prefix in column B)
          const isSubQuestion = !colA && colB && /^[a-z][\.\)]/.test(colB);
          
          let questionId = '';
          let questionText = colB;
          let isSubQ = false;
          let subLevel = 0;
          
          if (isMainQuestion) {
            currentMainId = colA;
            questionId = `${currentCategory}.${colA}`;
            questionText = colB;
            isSubQ = false;
          } else if (isSubQuestion) {
            // Extract sub-question letter (a, b, c, etc.)
            const match = colB.match(/^([a-z])[\.\)]\s*/);
            if (match) {
              const subLetter = match[1];
              questionId = `${currentCategory}.${currentMainId}.${subLetter}`;
              questionText = colB.replace(/^[a-z][\.\)]\s*/, '');
              isSubQ = true;
              subLevel = 1;
            }
          } else if (colA && !isMainQuestion) {
            // Could be a continuation or special row
            questionId = `${currentCategory}.${colA}`;
            questionText = colB;
            isSubQ = false;
          } else {
            continue;
          }
          
          if (!questionText) continue;
          
          // Parse answer (Y/T)
          let parsedAnswer: 'Ya' | 'Tidak' | null = null;
          const answerStr = colD.toUpperCase().trim();
          if (answerStr === 'Y' || answerStr === 'YA' || answerStr === 'YES' || answerStr === '1') {
            parsedAnswer = 'Ya';
          } else if (answerStr === 'T' || answerStr === 'TIDAK' || answerStr === 'NO' || answerStr === '0') {
            parsedAnswer = 'Tidak';
          }
          
          questions.push({
            id: questionId,
            category: currentCategory,
            text: questionText,
            isSubQuestion: isSubQ,
            subLevel: isSubQ ? subLevel : undefined,
            answer: parsedAnswer,
            evidence: undefined,
          });
        }
        
        resolve({ assessorInfo, questions });
      } catch (error) {
        console.error('Excel parsing error:', error);
        reject(new Error('Gagal membaca file Excel. Pastikan format file benar.'));
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Gagal membaca file.'));
    };
    
    reader.readAsBinaryString(file);
  });
}

export function exportToExcel(questions: Question[], assessorInfo?: AssessorInfo): void {
  const exportData = questions.map(q => ({
    ID: q.id,
    Kategori: q.category,
    Pertanyaan: q.text,
    Jawaban: q.answer === 'Ya' ? 'Y' : q.answer === 'Tidak' ? 'T' : '',
    'Bukti Dokumen': q.evidence || '',
  }));
  
  const worksheet = XLSX.utils.json_to_sheet(exportData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Assessment');
  
  const fileName = assessorInfo?.namaDanaPensiun 
    ? `IT_Assessment_${assessorInfo.namaDanaPensiun}_${new Date().toISOString().split('T')[0]}.xlsx`
    : `IT_Assessment_${new Date().toISOString().split('T')[0]}.xlsx`;
  
  XLSX.writeFile(workbook, fileName);
}
