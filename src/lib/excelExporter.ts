import * as XLSX from 'xlsx';
import { DatabaseQuestion, AspectCategory, ASPECT_LABELS } from '@/types/assessment';

interface QuestionResponse {
  mainAnswer: 'Ya' | 'Tidak' | null;
  breakdownAnswers: ('Ya' | 'Tidak' | null)[];
  subQuestionAnswers: Record<string, 'Ya' | 'Tidak' | null>;
  subBreakdownAnswers: Record<string, ('Ya' | 'Tidak' | null)[]>;
  evidenceFiles: string[];
  notes: string;
}

interface ExportRow {
  'Aspek': string;
  'ID Soal': string;
  'Tipe': string;
  'Referensi COBIT': string;
  'Pertanyaan': string;
  'Jawaban': string;
  'Catatan': string;
}

export function exportAssessmentToExcel(
  questions: DatabaseQuestion[],
  responses: Record<string, QuestionResponse>,
  filename: string = 'IT_Assessment_Export'
) {
  const workbook = XLSX.utils.book_new();
  
  // Group questions by aspect
  const aspectGroups = questions.reduce((acc, q) => {
    if (!acc[q.aspect]) acc[q.aspect] = [];
    acc[q.aspect].push(q);
    return acc;
  }, {} as Record<AspectCategory, DatabaseQuestion[]>);

  // Create summary sheet
  const summaryData: any[] = [
    ['IT COMPLIANCE ASSESSMENT - COBIT FRAMEWORK'],
    ['Tanggal Export:', new Date().toLocaleDateString('id-ID', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })],
    [],
    ['RINGKASAN PER ASPEK'],
    ['Aspek', 'Nama Aspek', 'Total Soal', 'Terjawab', 'Ya', 'Tidak', 'Compliance %']
  ];

  const aspects: AspectCategory[] = ['A', 'B', 'C', 'D'];
  aspects.forEach(aspect => {
    const aspectQs = aspectGroups[aspect] || [];
    let totalAnswered = 0;
    let totalYa = 0;
    let totalTidak = 0;

    aspectQs.forEach(q => {
      const response = responses[q.id];
      if (response?.mainAnswer) {
        totalAnswered++;
        if (response.mainAnswer === 'Ya') totalYa++;
        if (response.mainAnswer === 'Tidak') totalTidak++;
      }
    });

    const compliance = totalAnswered > 0 ? Math.round((totalYa / totalAnswered) * 100) : 0;
    
    summaryData.push([
      `Aspek ${aspect}`,
      ASPECT_LABELS[aspect],
      aspectQs.length,
      totalAnswered,
      totalYa,
      totalTidak,
      `${compliance}%`
    ]);
  });

  const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
  
  // Set column widths for summary
  summarySheet['!cols'] = [
    { wch: 12 },
    { wch: 50 },
    { wch: 12 },
    { wch: 12 },
    { wch: 8 },
    { wch: 8 },
    { wch: 14 }
  ];

  // Merge cells for title
  summarySheet['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 6 } }
  ];

  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Ringkasan');

  // Create sheet for each aspect
  aspects.forEach(aspect => {
    const aspectQs = aspectGroups[aspect] || [];
    const rows: ExportRow[] = [];

    aspectQs.forEach(q => {
      const response = responses[q.id] || {
        mainAnswer: null,
        breakdownAnswers: [],
        subQuestionAnswers: {},
        subBreakdownAnswers: {},
        evidenceFiles: [],
        notes: ''
      };

      // Main question
      rows.push({
        'Aspek': `Aspek ${aspect}`,
        'ID Soal': q.id,
        'Tipe': 'Pertanyaan Utama',
        'Referensi COBIT': q.cobit_ref || '',
        'Pertanyaan': q.ojk_question,
        'Jawaban': response.mainAnswer || '-',
        'Catatan': response.notes || ''
      });

      // Breakdown questions (Pertanyaan Pendalaman)
      if (q.breakdown && q.breakdown.length > 0) {
        q.breakdown.forEach((bq, bIndex) => {
          const breakdownAnswer = response.breakdownAnswers?.[bIndex];
          rows.push({
            'Aspek': '',
            'ID Soal': `${q.id}.BD.${bIndex + 1}`,
            'Tipe': 'Pendalaman COBIT',
            'Referensi COBIT': q.cobit_ref || '',
            'Pertanyaan': bq,
            'Jawaban': breakdownAnswer || '-',
            'Catatan': ''
          });
        });
      }

      // Sub questions
      if (q.sub_questions && q.sub_questions.length > 0) {
        q.sub_questions.forEach(subQ => {
          const subAnswer = response.subQuestionAnswers?.[subQ.id];
          
          rows.push({
            'Aspek': '',
            'ID Soal': subQ.id,
            'Tipe': 'Sub-Pertanyaan',
            'Referensi COBIT': subQ.cobit_ref || '',
            'Pertanyaan': subQ.text,
            'Jawaban': subAnswer || '-',
            'Catatan': ''
          });

          // Sub-question breakdowns
          if (subQ.breakdown && subQ.breakdown.length > 0) {
            const subBreakdowns = response.subBreakdownAnswers?.[subQ.id] || [];
            subQ.breakdown.forEach((sbq, sbIndex) => {
              rows.push({
                'Aspek': '',
                'ID Soal': `${subQ.id}.BD.${sbIndex + 1}`,
                'Tipe': 'Pendalaman Sub-Soal',
                'Referensi COBIT': subQ.cobit_ref || '',
                'Pertanyaan': sbq,
                'Jawaban': subBreakdowns[sbIndex] || '-',
                'Catatan': ''
              });
            });
          }
        });
      }

      // Add empty row between main questions for readability
      rows.push({
        'Aspek': '',
        'ID Soal': '',
        'Tipe': '',
        'Referensi COBIT': '',
        'Pertanyaan': '',
        'Jawaban': '',
        'Catatan': ''
      });
    });

    // Create worksheet
    const ws = XLSX.utils.json_to_sheet(rows);
    
    // Set column widths
    ws['!cols'] = [
      { wch: 10 },  // Aspek
      { wch: 15 },  // ID Soal
      { wch: 20 },  // Tipe
      { wch: 15 },  // Referensi COBIT
      { wch: 80 },  // Pertanyaan
      { wch: 10 },  // Jawaban
      { wch: 30 }   // Catatan
    ];

    XLSX.utils.book_append_sheet(workbook, ws, `Aspek ${aspect}`);
  });

  // Create consolidated "All Data" sheet
  const allRows: any[] = [
    ['IT COMPLIANCE ASSESSMENT - DATA LENGKAP'],
    [],
    ['Aspek', 'ID Soal', 'Tipe Pertanyaan', 'Referensi COBIT', 'Pertanyaan', 'Jawaban', 'Catatan']
  ];

  aspects.forEach(aspect => {
    const aspectQs = aspectGroups[aspect] || [];

    // Add aspect header
    allRows.push([]);
    allRows.push([`=== ASPEK ${aspect}: ${ASPECT_LABELS[aspect]} ===`]);
    allRows.push([]);

    aspectQs.forEach(q => {
      const response = responses[q.id] || {
        mainAnswer: null,
        breakdownAnswers: [],
        subQuestionAnswers: {},
        subBreakdownAnswers: {},
        evidenceFiles: [],
        notes: ''
      };

      // Main question
      allRows.push([
        `Aspek ${aspect}`,
        q.id,
        '📋 Pertanyaan Utama',
        q.cobit_ref || '',
        q.ojk_question,
        response.mainAnswer || '-',
        response.notes || ''
      ]);

      // Breakdown questions
      if (q.breakdown && q.breakdown.length > 0) {
        q.breakdown.forEach((bq, bIndex) => {
          const breakdownAnswer = response.breakdownAnswers?.[bIndex];
          allRows.push([
            '',
            `  └ ${q.id}.BD.${bIndex + 1}`,
            '📖 Pendalaman COBIT',
            q.cobit_ref || '',
            bq,
            breakdownAnswer || '-',
            ''
          ]);
        });
      }

      // Sub questions
      if (q.sub_questions && q.sub_questions.length > 0) {
        q.sub_questions.forEach(subQ => {
          const subAnswer = response.subQuestionAnswers?.[subQ.id];
          
          allRows.push([
            '',
            `  ├ ${subQ.id}`,
            '📝 Sub-Pertanyaan',
            subQ.cobit_ref || '',
            subQ.text,
            subAnswer || '-',
            ''
          ]);

          // Sub-question breakdowns
          if (subQ.breakdown && subQ.breakdown.length > 0) {
            const subBreakdowns = response.subBreakdownAnswers?.[subQ.id] || [];
            subQ.breakdown.forEach((sbq, sbIndex) => {
              allRows.push([
                '',
                `    └ ${subQ.id}.BD.${sbIndex + 1}`,
                '📖 Pendalaman Sub-Soal',
                subQ.cobit_ref || '',
                sbq,
                subBreakdowns[sbIndex] || '-',
                ''
              ]);
            });
          }
        });
      }
    });
  });

  const allDataSheet = XLSX.utils.aoa_to_sheet(allRows);
  
  // Set column widths for all data
  allDataSheet['!cols'] = [
    { wch: 10 },
    { wch: 20 },
    { wch: 22 },
    { wch: 15 },
    { wch: 80 },
    { wch: 10 },
    { wch: 30 }
  ];

  // Merge title cell
  allDataSheet['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 6 } }
  ];

  XLSX.utils.book_append_sheet(workbook, allDataSheet, 'Data Lengkap');

  // Generate filename with date
  const dateStr = new Date().toISOString().slice(0, 10);
  const fullFilename = `${filename}_${dateStr}.xlsx`;

  // Write and download
  XLSX.writeFile(workbook, fullFilename);

  return fullFilename;
}
