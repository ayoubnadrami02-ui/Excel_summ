import * as XLSX from 'xlsx';
import { ExtractedCellRow, ExtractionRule, FileProcessResult } from '../types/extractor';
import {
  detectDataType,
  evaluateCondition,
  parseCellReference,
  parseAndExpandTargetCells,
} from './ruleMatcher';

/**
 * Extracts data from multiple cells in a single Excel workbook if conditions are met
 */
export async function processWorkbookFile(
  file: File,
  rules: ExtractionRule[]
): Promise<FileProcessResult> {
  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: 'array', cellDates: true, cellNF: true });

  const sheetNames = workbook.SheetNames;
  if (!sheetNames || sheetNames.length === 0) {
    return {
      fileId: `${file.name}-${file.size}-${file.lastModified}`,
      fileName: file.name,
      fileSizeBytes: file.size,
      folderPath: (file as any).webkitRelativePath || file.name,
      sheetCount: 0,
      sheetNames: [],
      status: 'error',
      reason: 'Workbook contains no sheets',
      extractedCells: [],
    };
  }

  const extractedCells: ExtractedCellRow[] = [];
  let fileExcluded = false;
  let failedRule: ExtractionRule | undefined;
  let failedCellValue: string | undefined;
  let failureReason = '';

  for (const rule of rules) {
    // 1. Identify the condition check cell coordinate
    const condCoordRaw = rule.conditionCellRef || rule.cellRef || 'A1';
    const { sheet: condParsedSheet, cell: condParsedCell } = parseCellReference(condCoordRaw);
    const targetSheetName = rule.sheetName?.trim() || condParsedSheet || sheetNames[0];

    const worksheet = workbook.Sheets[targetSheetName];
    let condCellValue: any = '';
    let condFormattedVal = '';

    if (worksheet) {
      const cellObj = worksheet[condParsedCell];
      if (cellObj) {
        condCellValue = cellObj.v !== undefined ? cellObj.v : '';
        condFormattedVal = cellObj.w !== undefined ? String(cellObj.w) : String(condCellValue);
      }
    }

    // Evaluate the condition on this cell
    const evaluation = evaluateCondition(condCellValue, rule);

    // If condition fails, this entire file is excluded
    if (!evaluation.passed) {
      fileExcluded = true;
      failedRule = rule;
      failedCellValue = condFormattedVal;
      failureReason = `Condition failed on cell [${condParsedCell}]: ${evaluation.message}`;
      break;
    }

    // 2. Condition is TRUE! Now extract multiple target cells
    const targetCellsInput = rule.targetCells?.trim() || condCoordRaw;
    const targetDefs = parseAndExpandTargetCells(targetCellsInput, rule.fieldLabel);

    // Fallback if no target cells parsed
    const activeDefs =
      targetDefs.length > 0
        ? targetDefs
        : [
            {
              cellRef: condParsedCell,
              fieldLabel: rule.fieldLabel || condParsedCell,
              sheetName: targetSheetName,
            },
          ];

    for (const targetDef of activeDefs) {
      const cellSheetName = targetDef.sheetName || targetSheetName;
      const cellSheet = workbook.Sheets[cellSheetName] || worksheet;

      let cellVal: any = '';
      let formattedVal = '';

      if (cellSheet) {
        const cellObj = cellSheet[targetDef.cellRef];
        if (cellObj) {
          cellVal = cellObj.v !== undefined ? cellObj.v : '';
          formattedVal = cellObj.w !== undefined ? String(cellObj.w) : String(cellVal);
        }
      }

      const dataType = detectDataType(cellVal);

      const cellRow: ExtractedCellRow = {
        id: `${file.name}-${cellSheetName}-${targetDef.cellRef}-${rule.id}-${targetDef.fieldLabel}`,
        fileName: file.name,
        folderPath: (file as any).webkitRelativePath || file.name,
        sheetName: cellSheetName,
        cellRef: targetDef.cellRef,
        fieldLabel: targetDef.fieldLabel || targetDef.cellRef,
        rawValue: cellVal,
        formattedValue: formattedVal,
        dataType,
        conditionPassed: true,
        conditionDetails: `Condition on [${condParsedCell}] passed: ${evaluation.message}`,
        conditionCellRef: condParsedCell,
      };

      extractedCells.push(cellRow);
    }
  }

  return {
    fileId: `${file.name}-${file.size}-${file.lastModified}`,
    fileName: file.name,
    fileSizeBytes: file.size,
    folderPath: (file as any).webkitRelativePath || file.name,
    sheetCount: sheetNames.length,
    sheetNames,
    status: fileExcluded ? 'excluded' : 'passed',
    reason: fileExcluded ? failureReason : undefined,
    failedRule,
    failedCellValue,
    extractedCells: fileExcluded ? [] : extractedCells,
    workbookRaw: workbook,
  };
}

/**
 * Generates an Excel (.xlsx) file and triggers browser download
 */
export function downloadMasterExcelFile(
  passedResults: FileProcessResult[],
  rules: ExtractionRule[],
  layoutMode: 'cell_rows' | 'matrix' = 'cell_rows',
  customFileName: string = 'master_consolidated_export.xlsx'
) {
  const wb = XLSX.utils.book_new();

  if (layoutMode === 'cell_rows') {
    // Layout 1: One row per matched cell with metadata columns
    const rows = passedResults.flatMap((res) =>
      res.extractedCells.map((c) => ({
        'Source File': res.fileName,
        'Folder / Path': res.folderPath,
        'Sheet Name': c.sheetName,
        'Cell Coordinate': c.cellRef,
        'Field Name': c.fieldLabel,
        'Extracted Value': c.formattedValue,
        'Data Type': c.dataType,
        'Condition Cell': c.conditionCellRef || '',
        'Condition Check': c.conditionDetails,
      }))
    );

    const ws = XLSX.utils.json_to_sheet(rows);

    ws['!cols'] = [
      { wch: 28 }, // Source File
      { wch: 30 }, // Folder / Path
      { wch: 14 }, // Sheet Name
      { wch: 14 }, // Cell Ref
      { wch: 24 }, // Field Name
      { wch: 26 }, // Value
      { wch: 12 }, // Type
      { wch: 16 }, // Condition Cell
      { wch: 36 }, // Condition Check
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'Consolidated Cells');
  } else {
    // Layout 2: Matrix View (One row per file, fields as columns)
    const rows = passedResults.map((res) => {
      const rowObj: Record<string, any> = {
        'Source File': res.fileName,
        'Folder / Path': res.folderPath,
      };

      res.extractedCells.forEach((c) => {
        const colKey = c.fieldLabel || c.cellRef;
        rowObj[colKey] = c.formattedValue;
      });

      return rowObj;
    });

    const ws = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, 'Consolidated Matrix');
  }

  // Summary Sheet
  const totalCells = passedResults.reduce((sum, r) => sum + r.extractedCells.length, 0);
  const summaryData = [
    { Parameter: 'Tool Name', Value: 'Excel Master Consolidator & openpyxl Suite' },
    { Parameter: 'Export Date', Value: new Date().toLocaleString() },
    { Parameter: 'Total Valid Workbooks', Value: passedResults.length },
    { Parameter: 'Total Extracted Cells', Value: totalCells },
    { Parameter: 'Active Rule Groups', Value: rules.length },
  ];
  const summarySheet = XLSX.utils.json_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(wb, summarySheet, 'Extraction Summary');

  XLSX.writeFile(wb, customFileName);
}

/**
 * Generates and downloads CSV format
 */
export function downloadMasterCSVFile(
  passedResults: FileProcessResult[],
  layoutMode: 'cell_rows' | 'matrix' = 'cell_rows',
  customFileName: string = 'master_consolidated_export.csv'
) {
  let content = '';
  const escapeCsv = (str: string) => `"${String(str || '').replace(/"/g, '""')}"`;

  if (layoutMode === 'cell_rows') {
    const headers = [
      'Source File',
      'Folder / Path',
      'Sheet Name',
      'Cell Coordinate',
      'Field Name',
      'Extracted Value',
      'Data Type',
      'Condition Cell',
    ];

    const lines = [headers.join(',')];
    passedResults.forEach((res) => {
      res.extractedCells.forEach((c) => {
        lines.push(
          [
            escapeCsv(res.fileName),
            escapeCsv(res.folderPath),
            escapeCsv(c.sheetName),
            escapeCsv(c.cellRef),
            escapeCsv(c.fieldLabel),
            escapeCsv(c.formattedValue),
            escapeCsv(c.dataType),
            escapeCsv(c.conditionCellRef || ''),
          ].join(',')
        );
      });
    });
    content = lines.join('\n');
  } else {
    // Collect all unique field keys in order
    const fieldSet = new Set<string>();
    passedResults.forEach((res) => {
      res.extractedCells.forEach((c) => {
        fieldSet.add(c.fieldLabel || c.cellRef);
      });
    });
    const fieldHeaders = Array.from(fieldSet);
    const headers = ['Source File', 'Folder / Path', ...fieldHeaders];

    const lines = [headers.join(',')];
    passedResults.forEach((res) => {
      const cellMap = new Map<string, string>();
      res.extractedCells.forEach((c) => {
        cellMap.set(c.fieldLabel || c.cellRef, c.formattedValue);
      });

      const vals = fieldHeaders.map((hdr) => escapeCsv(cellMap.get(hdr) || ''));
      lines.push([escapeCsv(res.fileName), escapeCsv(res.folderPath), ...vals].join(','));
    });
    content = lines.join('\n');
  }

  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = customFileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
