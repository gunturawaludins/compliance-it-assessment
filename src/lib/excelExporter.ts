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

interface UserInfo {
  danaPensiun: string;
  pic: string;
  jabatan: string;
  noHandphone: string;
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
  userInfo: UserInfo,
  filename: string = 'IT_Assessment'
) {
  const workbook = XLSX.utils.book_new();
  
  // Group questions by aspect
  const aspectGroups = questions.reduce((acc, q) => {
    if (!acc[q.aspect]) acc[q.aspect] = [];
    acc[q.aspect].push(q);
    return acc;
  }, {} as Record<AspectCategory, DatabaseQuestion[]>);

  const aspects: AspectCategory[] = ['A', 'B', 'C', 'D'];

  // Calculate detailed statistics
  const calculateStats = (aspect: AspectCategory) => {
    const aspectQs = aspectGroups[aspect] || [];
    let mainAnswered = 0, mainYa = 0, mainTidak = 0;
    let breakdownAnswered = 0, breakdownYa = 0, breakdownTidak = 0;
    let subAnswered = 0, subYa = 0, subTidak = 0;
    let subBreakdownAnswered = 0, subBreakdownYa = 0, subBreakdownTidak = 0;
    let totalBreakdown = 0, totalSub = 0, totalSubBreakdown = 0;

    aspectQs.forEach(q => {
      const response = responses[q.id];
      
      // Main question
      if (response?.mainAnswer) {
        mainAnswered++;
        if (response.mainAnswer === 'Ya') mainYa++;
        if (response.mainAnswer === 'Tidak') mainTidak++;
      }

      // Breakdowns
      totalBreakdown += q.breakdown?.length || 0;
      (q.breakdown || []).forEach((_, bIdx) => {
        const ans = response?.breakdownAnswers?.[bIdx];
        if (ans) {
          breakdownAnswered++;
          if (ans === 'Ya') breakdownYa++;
          if (ans === 'Tidak') breakdownTidak++;
        }
      });

      // Sub questions
      (q.sub_questions || []).forEach(subQ => {
        totalSub++;
        const subAns = response?.subQuestionAnswers?.[subQ.id];
        if (subAns) {
          subAnswered++;
          if (subAns === 'Ya') subYa++;
          if (subAns === 'Tidak') subTidak++;
        }

        // Sub breakdowns
        totalSubBreakdown += subQ.breakdown?.length || 0;
        (subQ.breakdown || []).forEach((_, sbIdx) => {
          const sbAns = response?.subBreakdownAnswers?.[subQ.id]?.[sbIdx];
          if (sbAns) {
            subBreakdownAnswered++;
            if (sbAns === 'Ya') subBreakdownYa++;
            if (sbAns === 'Tidak') subBreakdownTidak++;
          }
        });
      });
    });

    return {
      main: { total: aspectQs.length, answered: mainAnswered, ya: mainYa, tidak: mainTidak },
      breakdown: { total: totalBreakdown, answered: breakdownAnswered, ya: breakdownYa, tidak: breakdownTidak },
      sub: { total: totalSub, answered: subAnswered, ya: subYa, tidak: subTidak },
      subBreakdown: { total: totalSubBreakdown, answered: subBreakdownAnswered, ya: subBreakdownYa, tidak: subBreakdownTidak }
    };
  };

  // Create summary sheet with user info
  const summaryData: any[][] = [
    [''],
    ['IT COMPLIANCE ASSESSMENT'],
    ['COBIT 2019 FRAMEWORK'],
    [''],
    ['INFORMASI RESPONDEN'],
    ['Dana Pensiun', userInfo.danaPensiun || '-'],
    ['PIC (Person In Charge)', userInfo.pic || '-'],
    ['Jabatan', userInfo.jabatan || '-'],
    ['No. Handphone', userInfo.noHandphone || '-'],
    ['Tanggal Export', new Date().toLocaleDateString('id-ID', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })],
    [''],
    [''],
    ['RINGKASAN ASSESSMENT'],
    [''],
    ['', 'PERTANYAAN UTAMA', '', '', '', 'PENDALAMAN (COBIT)', '', '', '', 'SUB-PERTANYAAN', '', '', '', 'PENDALAMAN SUB-SOAL', '', '', ''],
    ['Aspek', 'Total', 'Terjawab', 'Ya', 'Tidak', 'Total', 'Terjawab', 'Ya', 'Tidak', 'Total', 'Terjawab', 'Ya', 'Tidak', 'Total', 'Terjawab', 'Ya', 'Tidak']
  ];

  let grandTotal = { main: 0, mainAns: 0, mainYa: 0, mainTdk: 0, bd: 0, bdAns: 0, bdYa: 0, bdTdk: 0, sub: 0, subAns: 0, subYa: 0, subTdk: 0, sbd: 0, sbdAns: 0, sbdYa: 0, sbdTdk: 0 };

  aspects.forEach(aspect => {
    const stats = calculateStats(aspect);
    summaryData.push([
      `Aspek ${aspect} - ${ASPECT_LABELS[aspect].substring(0, 40)}...`,
      stats.main.total, stats.main.answered, stats.main.ya, stats.main.tidak,
      stats.breakdown.total, stats.breakdown.answered, stats.breakdown.ya, stats.breakdown.tidak,
      stats.sub.total, stats.sub.answered, stats.sub.ya, stats.sub.tidak,
      stats.subBreakdown.total, stats.subBreakdown.answered, stats.subBreakdown.ya, stats.subBreakdown.tidak
    ]);

    grandTotal.main += stats.main.total;
    grandTotal.mainAns += stats.main.answered;
    grandTotal.mainYa += stats.main.ya;
    grandTotal.mainTdk += stats.main.tidak;
    grandTotal.bd += stats.breakdown.total;
    grandTotal.bdAns += stats.breakdown.answered;
    grandTotal.bdYa += stats.breakdown.ya;
    grandTotal.bdTdk += stats.breakdown.tidak;
    grandTotal.sub += stats.sub.total;
    grandTotal.subAns += stats.sub.answered;
    grandTotal.subYa += stats.sub.ya;
    grandTotal.subTdk += stats.sub.tidak;
    grandTotal.sbd += stats.subBreakdown.total;
    grandTotal.sbdAns += stats.subBreakdown.answered;
    grandTotal.sbdYa += stats.subBreakdown.ya;
    grandTotal.sbdTdk += stats.subBreakdown.tidak;
  });

  // Grand total row
  summaryData.push(['']);
  summaryData.push([
    'TOTAL KESELURUHAN',
    grandTotal.main, grandTotal.mainAns, grandTotal.mainYa, grandTotal.mainTdk,
    grandTotal.bd, grandTotal.bdAns, grandTotal.bdYa, grandTotal.bdTdk,
    grandTotal.sub, grandTotal.subAns, grandTotal.subYa, grandTotal.subTdk,
    grandTotal.sbd, grandTotal.sbdAns, grandTotal.sbdYa, grandTotal.sbdTdk
  ]);

  // Compliance percentage
  const totalAllAnswered = grandTotal.mainAns + grandTotal.bdAns + grandTotal.subAns + grandTotal.sbdAns;
  const totalAllYa = grandTotal.mainYa + grandTotal.bdYa + grandTotal.subYa + grandTotal.sbdYa;
  const overallCompliance = totalAllAnswered > 0 ? Math.round((totalAllYa / totalAllAnswered) * 100) : 0;

  summaryData.push(['']);
  summaryData.push(['SKOR COMPLIANCE KESELURUHAN', `${overallCompliance}%`]);

  const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
  
  // Set column widths for summary
  summarySheet['!cols'] = [
    { wch: 45 }, // Aspek
    { wch: 8 }, { wch: 10 }, { wch: 6 }, { wch: 8 }, // Main
    { wch: 8 }, { wch: 10 }, { wch: 6 }, { wch: 8 }, // Breakdown
    { wch: 8 }, { wch: 10 }, { wch: 6 }, { wch: 8 }, // Sub
    { wch: 8 }, { wch: 10 }, { wch: 6 }, { wch: 8 }, // SubBreakdown
  ];

  // Merge cells for headers
  summarySheet['!merges'] = [
    { s: { r: 1, c: 0 }, e: { r: 1, c: 16 } }, // Title
    { s: { r: 2, c: 0 }, e: { r: 2, c: 16 } }, // Subtitle
    { s: { r: 4, c: 0 }, e: { r: 4, c: 16 } }, // Info header
    { s: { r: 12, c: 0 }, e: { r: 12, c: 16 } }, // Summary header
    { s: { r: 14, c: 1 }, e: { r: 14, c: 4 } }, // Main header
    { s: { r: 14, c: 5 }, e: { r: 14, c: 8 } }, // Breakdown header
    { s: { r: 14, c: 9 }, e: { r: 14, c: 12 } }, // Sub header
    { s: { r: 14, c: 13 }, e: { r: 14, c: 16 } }, // SubBreakdown header
  ];

  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Ringkasan');

  // Create sheet for each aspect with better formatting
  aspects.forEach(aspect => {
    const aspectQs = aspectGroups[aspect] || [];
    const rows: any[][] = [
      [''],
      [`ASPEK ${aspect}: ${ASPECT_LABELS[aspect]}`],
      [''],
      ['ID Soal', 'Tipe Pertanyaan', 'Referensi COBIT', 'Pertanyaan', 'Jawaban', 'Catatan']
    ];

    aspectQs.forEach(q => {
      const response = responses[q.id] || {
        mainAnswer: null,
        breakdownAnswers: [],
        subQuestionAnswers: {},
        subBreakdownAnswers: {},
        evidenceFiles: [],
        notes: ''
      };

      // Main question (bold indicator with prefix)
      rows.push([
        q.id,
        '▶ PERTANYAAN UTAMA',
        q.cobit_ref || '',
        q.ojk_question,
        response.mainAnswer || '-',
        response.notes || ''
      ]);

      // Breakdown questions
      if (q.breakdown && q.breakdown.length > 0) {
        q.breakdown.forEach((bq, bIndex) => {
          const breakdownAnswer = response.breakdownAnswers?.[bIndex];
          rows.push([
            `   └ ${q.id}.BD.${bIndex + 1}`,
            '   📖 Pendalaman COBIT',
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
          
          rows.push([
            `   ├ ${subQ.id}`,
            '   📝 Sub-Pertanyaan',
            subQ.cobit_ref || '',
            subQ.text,
            subAnswer || '-',
            ''
          ]);

          // Sub-question breakdowns
          if (subQ.breakdown && subQ.breakdown.length > 0) {
            const subBreakdowns = response.subBreakdownAnswers?.[subQ.id] || [];
            subQ.breakdown.forEach((sbq, sbIndex) => {
              rows.push([
                `      └ ${subQ.id}.BD.${sbIndex + 1}`,
                '      📖 Pendalaman Sub',
                subQ.cobit_ref || '',
                sbq,
                subBreakdowns[sbIndex] || '-',
                ''
              ]);
            });
          }
        });
      }

      // Empty row between main questions
      rows.push(['', '', '', '', '', '']);
    });

    const ws = XLSX.utils.aoa_to_sheet(rows);
    
    ws['!cols'] = [
      { wch: 22 },  // ID Soal
      { wch: 22 },  // Tipe
      { wch: 15 },  // COBIT Ref
      { wch: 80 },  // Pertanyaan
      { wch: 10 },  // Jawaban
      { wch: 25 }   // Catatan
    ];

    // Merge title
    ws['!merges'] = [
      { s: { r: 1, c: 0 }, e: { r: 1, c: 5 } }
    ];

    XLSX.utils.book_append_sheet(workbook, ws, `Aspek ${aspect}`);
  });

  // Create consolidated "All Data" sheet
  const allRows: any[][] = [
    [''],
    ['IT COMPLIANCE ASSESSMENT - DATA LENGKAP'],
    [''],
    ['INFORMASI RESPONDEN'],
    ['Dana Pensiun:', userInfo.danaPensiun || '-'],
    ['PIC:', userInfo.pic || '-'],
    ['Jabatan:', userInfo.jabatan || '-'],
    ['No. HP:', userInfo.noHandphone || '-'],
    [''],
    ['ID Soal', 'Aspek', 'Tipe Pertanyaan', 'Referensi COBIT', 'Pertanyaan', 'Jawaban']
  ];

  aspects.forEach(aspect => {
    const aspectQs = aspectGroups[aspect] || [];

    // Add aspect header
    allRows.push(['']);
    allRows.push([`═══ ASPEK ${aspect}: ${ASPECT_LABELS[aspect]} ═══`]);
    allRows.push(['']);

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
        q.id,
        `Aspek ${aspect}`,
        '▶ PERTANYAAN UTAMA',
        q.cobit_ref || '',
        q.ojk_question,
        response.mainAnswer || '-'
      ]);

      // Breakdown questions
      if (q.breakdown && q.breakdown.length > 0) {
        q.breakdown.forEach((bq, bIndex) => {
          const breakdownAnswer = response.breakdownAnswers?.[bIndex];
          allRows.push([
            `${q.id}.BD.${bIndex + 1}`,
            '',
            '   └ Pendalaman COBIT',
            q.cobit_ref || '',
            bq,
            breakdownAnswer || '-'
          ]);
        });
      }

      // Sub questions
      if (q.sub_questions && q.sub_questions.length > 0) {
        q.sub_questions.forEach(subQ => {
          const subAnswer = response.subQuestionAnswers?.[subQ.id];
          
          allRows.push([
            subQ.id,
            '',
            '   ├ Sub-Pertanyaan',
            subQ.cobit_ref || '',
            subQ.text,
            subAnswer || '-'
          ]);

          // Sub-question breakdowns
          if (subQ.breakdown && subQ.breakdown.length > 0) {
            const subBreakdowns = response.subBreakdownAnswers?.[subQ.id] || [];
            subQ.breakdown.forEach((sbq, sbIndex) => {
              allRows.push([
                `${subQ.id}.BD.${sbIndex + 1}`,
                '',
                '      └ Pendalaman Sub',
                subQ.cobit_ref || '',
                sbq,
                subBreakdowns[sbIndex] || '-'
              ]);
            });
          }
        });
      }
    });
  });

  const allDataSheet = XLSX.utils.aoa_to_sheet(allRows);
  
  allDataSheet['!cols'] = [
    { wch: 20 },
    { wch: 12 },
    { wch: 22 },
    { wch: 15 },
    { wch: 80 },
    { wch: 10 }
  ];

  allDataSheet['!merges'] = [
    { s: { r: 1, c: 0 }, e: { r: 1, c: 5 } },
    { s: { r: 3, c: 0 }, e: { r: 3, c: 5 } }
  ];

  XLSX.utils.book_append_sheet(workbook, allDataSheet, 'Data Lengkap');

  // Generate filename with date
  const dateStr = new Date().toISOString().slice(0, 10);
  const sanitizedName = userInfo.danaPensiun?.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 30) || 'Assessment';
  const fullFilename = `${filename}_${sanitizedName}_${dateStr}.xlsx`;

  // Write and download
  XLSX.writeFile(workbook, fullFilename);

  return fullFilename;
}
