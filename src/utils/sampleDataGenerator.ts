import * as XLSX from 'xlsx';
import { ExtractionRule } from '../types/extractor';

export const DEFAULT_SAMPLE_RULES: ExtractionRule[] = [
  {
    id: 'rule-multi-1',
    conditionCellRef: 'B2',
    sheetName: '',
    fieldLabel: 'Invoice Extraction Group',
    conditionType: 'contains',
    conditionValue: 'test',
    caseSensitive: false,
    targetCells: 'B2: Document Code, D4: Client Name, B6: Issue Date, C8: Approval Status, E12: Total Amount',
  },
];

export function createSampleExcelFiles(): File[] {
  const sampleWorkbooks = [
    {
      name: 'Invoice_101_Acme_Test.xlsx',
      cells: {
        B2: 'INV-TEST-2024-001',
        D4: 'Acme Corp International',
        B6: '2024-10-15',
        C8: 'Approved',
        E12: 14500.0,
        A1: 'INVOICE VOUCHER',
      },
    },
    {
      name: 'Invoice_102_Global_Test.xlsx',
      cells: {
        B2: 'INV-TEST-2024-002',
        D4: 'Global Logistics Ltd',
        B6: '2024-10-18',
        C8: 'Approved',
        E12: 8250.5,
        A1: 'INVOICE VOUCHER',
      },
    },
    {
      name: 'Invoice_103_Helios_Prod.xlsx',
      // Note: B2 contains 'PROD', not 'test' -> condition will fail and file will be excluded!
      cells: {
        B2: 'INV-PROD-2024-099',
        D4: 'Helios Energy Systems',
        B6: '2024-10-20',
        C8: 'Pending Review',
        E12: 23100.0,
        A1: 'INVOICE VOUCHER',
      },
    },
    {
      name: 'Invoice_104_Zenith_Test.xlsx',
      cells: {
        B2: 'TEST-BATCH-9904',
        D4: 'Zenith Biotech Labs',
        B6: '2024-10-22',
        C8: 'Approved',
        E12: 4150.0,
        A1: 'INVOICE VOUCHER',
      },
    },
  ];

  return sampleWorkbooks.map((item) => {
    const ws: XLSX.WorkSheet = {};
    const range = { s: { c: 0, r: 0 }, e: { c: 6, r: 15 } };

    Object.entries(item.cells).forEach(([coord, val]) => {
      const type = typeof val === 'number' ? 'n' : 's';
      ws[coord] = { v: val, t: type };
    });

    ws['!ref'] = XLSX.utils.encode_range(range);

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'InvoiceData');

    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    return new File([wbout], item.name, {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
  });
}
