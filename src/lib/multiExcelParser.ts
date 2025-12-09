import * as XLSX from 'xlsx';

export interface DanaPensiunComplianceData {
  fileName: string;
  danaPensiun: string;
  pic: string;
  jabatan: string;
  noHandphone: string;
  exportDate: string;
  overallComplianceScore: number;
  aspectStats: {
    aspect: 'A' | 'B' | 'C' | 'D';
    aspectLabel: string;
    mainTotal: number;
    mainAnswered: number;
    mainYa: number;
    mainTidak: number;
    breakdownTotal: number;
    breakdownAnswered: number;
    breakdownYa: number;
    breakdownTidak: number;
    subTotal: number;
    subAnswered: number;
    subYa: number;
    subTidak: number;
    subBreakdownTotal: number;
    subBreakdownAnswered: number;
    subBreakdownYa: number;
    subBreakdownTidak: number;
    complianceRate: number;
  }[];
  grandTotal: {
    mainTotal: number;
    mainAnswered: number;
    mainYa: number;
    mainTidak: number;
    breakdownTotal: number;
    breakdownAnswered: number;
    breakdownYa: number;
    breakdownTidak: number;
    subTotal: number;
    subAnswered: number;
    subYa: number;
    subTidak: number;
    subBreakdownTotal: number;
    subBreakdownAnswered: number;
    subBreakdownYa: number;
    subBreakdownTidak: number;
  };
}

export function parseGeneratedExcel(file: File): Promise<DanaPensiunComplianceData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        
        // Find "Ringkasan" sheet
        const ringkasanSheet = workbook.Sheets['Ringkasan'];
        if (!ringkasanSheet) {
          reject(new Error(`File "${file.name}" bukan hasil export sistem. Sheet "Ringkasan" tidak ditemukan.`));
          return;
        }
        
        // Convert to array of arrays
        const rawData = XLSX.utils.sheet_to_json<(string | number | undefined)[]>(ringkasanSheet, { 
          header: 1,
          defval: ''
        });
        
        // Parse responder info (rows 5-10 in Excel = index 4-9)
        // Row 6 (index 5) = Dana Pensiun
        // Row 7 (index 6) = PIC
        // Row 8 (index 7) = Jabatan
        // Row 9 (index 8) = No. Handphone
        // Row 10 (index 9) = Tanggal Export
        const danaPensiun = String(rawData[5]?.[1] || '').trim();
        const pic = String(rawData[6]?.[1] || '').trim();
        const jabatan = String(rawData[7]?.[1] || '').trim();
        const noHandphone = String(rawData[8]?.[1] || '').trim();
        const exportDate = String(rawData[9]?.[1] || '').trim();
        
        if (!danaPensiun) {
          reject(new Error(`File "${file.name}" tidak memiliki data Dana Pensiun yang valid.`));
          return;
        }
        
        // Find the stats data rows (starts after "RINGKASAN ASSESSMENT" header)
        // Usually around row 17 onwards (index 16+)
        let statsStartRow = -1;
        for (let i = 0; i < rawData.length; i++) {
          const row = rawData[i];
          if (String(row?.[0] || '').includes('Aspek')) {
            statsStartRow = i;
            break;
          }
        }
        
        if (statsStartRow === -1) {
          reject(new Error(`File "${file.name}" tidak memiliki format statistik yang valid.`));
          return;
        }
        
        const aspectStats: DanaPensiunComplianceData['aspectStats'] = [];
        const aspects = ['A', 'B', 'C', 'D'] as const;
        
        // Parse each aspect row (skip header row which also contains "Aspek")
        for (let i = 0; i < 4; i++) {
          const row = rawData[statsStartRow + 1 + i]; // +1 to skip the header row
          if (!row) continue;
          
          const aspectLabel = String(row[0] || '');
          const aspect = aspects[i];
          
          // Columns: Aspek | Main(Total,Ans,Ya,Tidak) | Breakdown(Total,Ans,Ya,Tidak) | Sub(Total,Ans,Ya,Tidak) | SubBD(Total,Ans,Ya,Tidak)
          const mainTotal = Number(row[1]) || 0;
          const mainAnswered = Number(row[2]) || 0;
          const mainYa = Number(row[3]) || 0;
          const mainTidak = Number(row[4]) || 0;
          
          const breakdownTotal = Number(row[5]) || 0;
          const breakdownAnswered = Number(row[6]) || 0;
          const breakdownYa = Number(row[7]) || 0;
          const breakdownTidak = Number(row[8]) || 0;
          
          const subTotal = Number(row[9]) || 0;
          const subAnswered = Number(row[10]) || 0;
          const subYa = Number(row[11]) || 0;
          const subTidak = Number(row[12]) || 0;
          
          const subBreakdownTotal = Number(row[13]) || 0;
          const subBreakdownAnswered = Number(row[14]) || 0;
          const subBreakdownYa = Number(row[15]) || 0;
          const subBreakdownTidak = Number(row[16]) || 0;
          
          // Calculate compliance rate for this aspect
          const totalAnswered = mainAnswered + breakdownAnswered + subAnswered + subBreakdownAnswered;
          const totalYa = mainYa + breakdownYa + subYa + subBreakdownYa;
          const complianceRate = totalAnswered > 0 ? Math.round((totalYa / totalAnswered) * 100) : 0;
          
          aspectStats.push({
            aspect,
            aspectLabel,
            mainTotal,
            mainAnswered,
            mainYa,
            mainTidak,
            breakdownTotal,
            breakdownAnswered,
            breakdownYa,
            breakdownTidak,
            subTotal,
            subAnswered,
            subYa,
            subTidak,
            subBreakdownTotal,
            subBreakdownAnswered,
            subBreakdownYa,
            subBreakdownTidak,
            complianceRate
          });
        }
        
        // Find grand total row (header + 4 aspects + empty row)
        const grandTotalRow = rawData[statsStartRow + 6];
        const grandTotal = {
          mainTotal: Number(grandTotalRow?.[1]) || 0,
          mainAnswered: Number(grandTotalRow?.[2]) || 0,
          mainYa: Number(grandTotalRow?.[3]) || 0,
          mainTidak: Number(grandTotalRow?.[4]) || 0,
          breakdownTotal: Number(grandTotalRow?.[5]) || 0,
          breakdownAnswered: Number(grandTotalRow?.[6]) || 0,
          breakdownYa: Number(grandTotalRow?.[7]) || 0,
          breakdownTidak: Number(grandTotalRow?.[8]) || 0,
          subTotal: Number(grandTotalRow?.[9]) || 0,
          subAnswered: Number(grandTotalRow?.[10]) || 0,
          subYa: Number(grandTotalRow?.[11]) || 0,
          subTidak: Number(grandTotalRow?.[12]) || 0,
          subBreakdownTotal: Number(grandTotalRow?.[13]) || 0,
          subBreakdownAnswered: Number(grandTotalRow?.[14]) || 0,
          subBreakdownYa: Number(grandTotalRow?.[15]) || 0,
          subBreakdownTidak: Number(grandTotalRow?.[16]) || 0
        };
        
        // Find compliance score (last rows)
        let overallComplianceScore = 0;
        for (let i = rawData.length - 1; i >= 0; i--) {
          const row = rawData[i];
          if (String(row?.[0] || '').includes('SKOR COMPLIANCE')) {
            const scoreStr = String(row?.[1] || '0').replace('%', '');
            overallComplianceScore = Number(scoreStr) || 0;
            break;
          }
        }
        
        resolve({
          fileName: file.name,
          danaPensiun,
          pic,
          jabatan,
          noHandphone,
          exportDate,
          overallComplianceScore,
          aspectStats,
          grandTotal
        });
        
      } catch (error) {
        console.error('Multi Excel parsing error:', error);
        reject(new Error(`Gagal membaca file "${file.name}". Pastikan format file benar.`));
      }
    };
    
    reader.onerror = () => {
      reject(new Error(`Gagal membaca file "${file.name}".`));
    };
    
    reader.readAsBinaryString(file);
  });
}

export async function parseMultipleExcelFiles(files: File[]): Promise<DanaPensiunComplianceData[]> {
  const results: DanaPensiunComplianceData[] = [];
  const errors: string[] = [];
  
  for (const file of files) {
    try {
      const data = await parseGeneratedExcel(file);
      results.push(data);
    } catch (error) {
      errors.push(error instanceof Error ? error.message : `Error parsing ${file.name}`);
    }
  }
  
  if (errors.length > 0 && results.length === 0) {
    throw new Error(errors.join('\n'));
  }
  
  return results;
}
