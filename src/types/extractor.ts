export type ConditionType =
  | 'none'          // Empty / no condition (always extracts if cell exists)
  | 'contains'      // Text contains (e.g. "test")
  | 'not_contains'  // Text does not contain
  | 'equals'        // Exact match
  | 'not_equals'    // Not equal
  | 'starts_with'   // Starts with
  | 'ends_with'     // Ends with
  | 'greater_than'  // Numeric >
  | 'less_than'     // Numeric <
  | 'not_empty'     // Must have a non-empty value
  | 'is_empty';     // Must be blank

export interface ExtractionRule {
  id: string;
  // Condition parameters
  conditionCellRef: string; // The cell evaluated by the condition, e.g. "B2"
  cellRef?: string;         // Kept for backward compatibility (maps to conditionCellRef)
  sheetName: string;        // Target sheet name, or empty for active/first sheet
  conditionType: ConditionType;
  conditionValue: string;   // e.g. "test", "Approved", "1000"
  caseSensitive: boolean;   // Case-sensitive comparison

  // Target multiple cells parameters
  targetCells: string;      // Comma-separated cells or range, e.g. "B2, D4, E12" or "A1:B3" or "B2: Code, D4: Client"
  fieldLabel: string;       // Rule title or default label prefix, e.g. "Invoice Batch"
}

export interface ExtractedCellRow {
  id: string;
  fileName: string;
  folderPath: string;
  sheetName: string;
  cellRef: string;
  fieldLabel: string;
  rawValue: any;
  formattedValue: string;
  dataType: 'string' | 'number' | 'boolean' | 'date' | 'empty';
  conditionPassed: boolean;
  conditionDetails: string;
  conditionCellRef?: string;
}

export interface FileProcessResult {
  fileId: string;
  fileName: string;
  fileSizeBytes: number;
  folderPath: string;
  sheetCount: number;
  sheetNames: string[];
  status: 'passed' | 'excluded' | 'error';
  reason?: string;
  failedRule?: ExtractionRule;
  failedCellValue?: string;
  extractedCells: ExtractedCellRow[];
  workbookRaw?: any; // For workbook inspector
}

export interface PresetTemplate {
  id: string;
  name: string;
  description: string;
  rules: ExtractionRule[];
}
