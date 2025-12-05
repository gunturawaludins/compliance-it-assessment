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
        
        // Parse assessor info from Excel:
        // Row 1 (index 0) = Header
        // Row 2 (index 1) = Nama Dana Pensiun (column D = index 3)
        // Row 3 (index 2) = Nama PIC (column D = index 3)
        // Row 4 (index 3) = Nomor HP (column D = index 3)
        // Row 5 (index 4) = Jabatan PIC (column D = index 3)
        // Row 6 (index 5) = Memiliki Unit Syariah (column D = index 3)
        const assessorInfo: AssessorInfo = {
          namaDanaPensiun: String(rawData[1]?.[3] || '').trim(),
          namaPIC: String(rawData[2]?.[3] || '').trim(),
          nomorHP: String(rawData[3]?.[3] || '').trim(),
          jabatanPIC: String(rawData[4]?.[3] || '').trim(),
          memilikiUnitSyariah: String(rawData[5]?.[3] || '').toUpperCase() === 'Y',
        };
        
        const questions: Question[] = [];
        let currentCategory: AspectCategory = 'A';
        let currentMainId = '';
        let currentSubPrefix = '';
        
        // Start from row 7 (index 6) onwards - after assessor info and aspect header
        for (let i = 6; i < rawData.length; i++) {
          const row = rawData[i];
          if (!row || row.length === 0) continue;
          
          const colA = String(row[0] || '').trim();
          const colB = String(row[1] || '').trim();
          const colC = String(row[2] || '').trim();
          const colD = String(row[3] || '').trim();
          
          // Skip empty rows
          if (!colA && !colB) continue;
          
          // Check if this is an aspect category header (A, B, C, D)
          if (['A', 'B', 'C', 'D'].includes(colA) && colB.includes('ASPEK')) {
            currentCategory = colA as AspectCategory;
            currentMainId = '';
            continue;
          }
          
          // Check if this is a main question number
          const isMainQuestion = /^\d+$/.test(colA);
          
          // Check if this is a sub-question (empty colA, has content in colB starting with letter)
          const isSubQuestion = !colA && colB && /^[a-z][\.\)]/.test(colB);
          
          // Check if it's a numbered sub-item like "1)", "2)"
          const isNumberedSubItem = !colA && colB && /^\d+\)/.test(colB);
          
          let questionId = '';
          let questionText = colB;
          let isSubQ = false;
          let subLevel = 0;
          
          if (isMainQuestion) {
            currentMainId = colA;
            currentSubPrefix = '';
            questionId = `${currentCategory}.${colA}`;
            questionText = colB;
            isSubQ = false;
          } else if (isSubQuestion) {
            // Extract sub-question letter (a, b, c, etc.)
            const match = colB.match(/^([a-z])[\.\)]\s*/);
            if (match) {
              const subLetter = match[1];
              currentSubPrefix = subLetter;
              questionId = `${currentCategory}.${currentMainId}.${subLetter}`;
              questionText = colB.replace(/^[a-z][\.\)]\s*/, '');
              isSubQ = true;
              subLevel = 1;
            }
          } else if (isNumberedSubItem) {
            // Extract numbered sub-item like "1)", "2)"
            const match = colB.match(/^(\d+)\)\s*/);
            if (match) {
              const subNum = match[1];
              questionId = `${currentCategory}.${currentMainId}.${currentSubPrefix}.${subNum}`;
              questionText = colB.replace(/^\d+\)\s*/, '');
              isSubQ = true;
              subLevel = 2;
            }
          } else if (colA && !isMainQuestion) {
            // Could be a special row or continuation
            questionId = `${currentCategory}.${colA}`;
            questionText = colB;
            isSubQ = false;
          } else {
            continue;
          }
          
          if (!questionText) continue;
          
          // Parse answer (Y/T) from column D
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
            parentId: isSubQ ? `${currentCategory}.${currentMainId}` : undefined,
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
    'COBIT Ref': q.cobitRef || '',
  }));
  
  const worksheet = XLSX.utils.json_to_sheet(exportData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Assessment');
  
  const fileName = assessorInfo?.namaDanaPensiun 
    ? `IT_Assessment_${assessorInfo.namaDanaPensiun}_${new Date().toISOString().split('T')[0]}.xlsx`
    : `IT_Assessment_${new Date().toISOString().split('T')[0]}.xlsx`;
  
  XLSX.writeFile(workbook, fileName);
}
