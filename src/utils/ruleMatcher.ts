import { ConditionType, ExtractionRule } from '../types/extractor';

export interface ConditionEvaluation {
  passed: boolean;
  message: string;
}

export interface TargetCellDefinition {
  cellRef: string;
  fieldLabel: string;
  sheetName?: string;
}

/**
 * Converts Excel column letter to 1-based number (A -> 1, Z -> 26, AA -> 27)
 */
export function colToNum(col: string): number {
  let num = 0;
  const upper = col.toUpperCase();
  for (let i = 0; i < upper.length; i++) {
    num = num * 26 + (upper.charCodeAt(i) - 64);
  }
  return num;
}

/**
 * Converts 1-based number to Excel column letters (1 -> A, 26 -> Z, 27 -> AA)
 */
export function numToCol(num: number): string {
  let str = '';
  let n = num;
  while (n > 0) {
    const rem = (n - 1) % 26;
    str = String.fromCharCode(65 + rem) + str;
    n = Math.floor((n - 1) / 26);
  }
  return str;
}

/**
 * Normalizes coordinate and extracts optional sheet prefix if provided e.g. "Sheet1!B2" -> { sheet: "Sheet1", cell: "B2" }
 */
export function parseCellReference(rawRef: string): { sheet: string; cell: string } {
  const trimmed = rawRef.trim();
  if (trimmed.includes('!')) {
    const parts = trimmed.split('!');
    return {
      sheet: parts[0].trim().replace(/^['"]|['"]$/g, ''),
      cell: parts[1].trim().toUpperCase(),
    };
  }
  return {
    sheet: '',
    cell: trimmed.toUpperCase(),
  };
}

/**
 * Parses and expands a comma-separated list of cells, ranges, and optional labels.
 * Examples supported:
 * - "B2, D4, E12"
 * - "B2: Invoice No, D4: Client Name, E12: Total Amount"
 * - "A1:B3" -> expands to A1, B1, A2, B2, A3, B3
 * - "Sheet1!B2, Sheet1!D4"
 */
export function parseAndExpandTargetCells(
  targetInput: string,
  fallbackLabel: string = ''
): TargetCellDefinition[] {
  if (!targetInput || !targetInput.trim()) {
    return [];
  }

  // Split by comma or semicolon
  const tokens = targetInput
    .split(/[,;\n]+/)
    .map((t) => t.trim())
    .filter(Boolean);

  const results: TargetCellDefinition[] = [];
  const seenCells = new Set<string>();

  for (const token of tokens) {
    // Check if token specifies a range, e.g. "A1:B3" or "Sheet1!A1:B2"
    let sheetPrefix = '';
    let coordToken = token;

    if (token.includes('!')) {
      const sp = token.split('!');
      sheetPrefix = sp[0].trim().replace(/^['"]|['"]$/g, '');
      coordToken = sp[1].trim();
    }

    const rangeRegex = /^([A-Za-z]+)(\d+)\s*:\s*([A-Za-z]+)(\d+)$/;
    const rangeMatch = coordToken.match(rangeRegex);

    if (rangeMatch) {
      // It's a range like A1:B3
      const startCol = colToNum(rangeMatch[1]);
      const startRow = parseInt(rangeMatch[2], 10);
      const endCol = colToNum(rangeMatch[3]);
      const endRow = parseInt(rangeMatch[4], 10);

      const minCol = Math.min(startCol, endCol);
      const maxCol = Math.max(startCol, endCol);
      const minRow = Math.min(startRow, endRow);
      const maxRow = Math.max(startRow, endRow);

      for (let r = minRow; r <= maxRow; r++) {
        for (let c = minCol; c <= maxCol; c++) {
          const coord = `${numToCol(c)}${r}`;
          const fullKey = sheetPrefix ? `${sheetPrefix}!${coord}` : coord;
          if (!seenCells.has(fullKey)) {
            seenCells.add(fullKey);
            results.push({
              cellRef: coord,
              fieldLabel: `Cell ${coord}`,
              sheetName: sheetPrefix,
            });
          }
        }
      }
      continue;
    }

    // Check if token has an explicit label assignment e.g. "B2: Invoice Number" or "B2 = Invoice Number"
    let cellPart = coordToken;
    let labelPart = '';

    if (coordToken.includes(':') || coordToken.includes('=')) {
      const delim = coordToken.includes('=') ? '=' : ':';
      const parts = coordToken.split(delim);
      const candidateCell = parts[0].trim().toUpperCase();

      // Ensure the left part is a valid Excel cell coordinate e.g. B2, AA10
      if (/^[A-Z]+\d+$/.test(candidateCell)) {
        cellPart = candidateCell;
        labelPart = parts.slice(1).join(delim).trim();
      }
    }

    cellPart = cellPart.trim().toUpperCase();
    if (/^[A-Z]+\d+$/.test(cellPart)) {
      const fullKey = sheetPrefix ? `${sheetPrefix}!${cellPart}` : cellPart;
      if (!seenCells.has(fullKey)) {
        seenCells.add(fullKey);
        results.push({
          cellRef: cellPart,
          fieldLabel: labelPart || (fallbackLabel ? `${fallbackLabel} (${cellPart})` : `Cell ${cellPart}`),
          sheetName: sheetPrefix,
        });
      }
    }
  }

  return results;
}

/**
 * Evaluates whether a cell value satisfies the given rule condition
 */
export function evaluateCondition(value: any, rule: ExtractionRule): ConditionEvaluation {
  const { conditionType, conditionValue, caseSensitive } = rule;

  // Handle empty / no condition -> unconditional pass
  if (
    !conditionType ||
    conditionType === 'none' ||
    conditionValue === undefined ||
    (conditionValue === '' && conditionType === 'contains')
  ) {
    return {
      passed: true,
      message: 'No condition specified (unconditional pass)',
    };
  }

  const strValue = value === null || value === undefined ? '' : String(value);
  const targetStr = caseSensitive ? strValue : strValue.toLowerCase();
  const searchStr = caseSensitive ? conditionValue : conditionValue.toLowerCase();

  switch (conditionType) {
    case 'contains': {
      if (!conditionValue.trim()) return { passed: true, message: 'Empty condition' };
      const ok = targetStr.includes(searchStr);
      return {
        passed: ok,
        message: ok
          ? `Contains "${conditionValue}"`
          : `Expected to contain "${conditionValue}", but got "${strValue}"`,
      };
    }

    case 'not_contains': {
      const ok = !targetStr.includes(searchStr);
      return {
        passed: ok,
        message: ok
          ? `Does not contain "${conditionValue}"`
          : `Forbidden text "${conditionValue}" found in "${strValue}"`,
      };
    }

    case 'equals': {
      const ok = targetStr === searchStr;
      return {
        passed: ok,
        message: ok
          ? `Equals "${conditionValue}"`
          : `Expected exact match "${conditionValue}", got "${strValue}"`,
      };
    }

    case 'not_equals': {
      const ok = targetStr !== searchStr;
      return {
        passed: ok,
        message: ok
          ? `Not equal to "${conditionValue}"`
          : `Must not equal "${conditionValue}"`,
      };
    }

    case 'starts_with': {
      const ok = targetStr.startsWith(searchStr);
      return {
        passed: ok,
        message: ok
          ? `Starts with "${conditionValue}"`
          : `Expected to start with "${conditionValue}", got "${strValue}"`,
      };
    }

    case 'ends_with': {
      const ok = targetStr.endsWith(searchStr);
      return {
        passed: ok,
        message: ok
          ? `Ends with "${conditionValue}"`
          : `Expected to end with "${conditionValue}", got "${strValue}"`,
      };
    }

    case 'greater_than': {
      const numVal = parseFloat(strValue.replace(/[^0-9.-]/g, ''));
      const threshold = parseFloat(conditionValue);
      if (isNaN(numVal) || isNaN(threshold)) {
        return {
          passed: false,
          message: `Cannot compare non-numeric value "${strValue}" to "${conditionValue}"`,
        };
      }
      const ok = numVal > threshold;
      return {
        passed: ok,
        message: ok
          ? `Value (${numVal}) > ${threshold}`
          : `Value (${numVal}) is not greater than ${threshold}`,
      };
    }

    case 'less_than': {
      const numVal = parseFloat(strValue.replace(/[^0-9.-]/g, ''));
      const threshold = parseFloat(conditionValue);
      if (isNaN(numVal) || isNaN(threshold)) {
        return {
          passed: false,
          message: `Cannot compare non-numeric value "${strValue}" to "${conditionValue}"`,
        };
      }
      const ok = numVal < threshold;
      return {
        passed: ok,
        message: ok
          ? `Value (${numVal}) < ${threshold}`
          : `Value (${numVal}) is not less than ${threshold}`,
      };
    }

    case 'not_empty': {
      const ok = strValue.trim().length > 0;
      return {
        passed: ok ? true : false,
        message: ok ? 'Cell is not empty' : 'Cell is empty or missing',
      };
    }

    case 'is_empty': {
      const ok = strValue.trim().length === 0;
      return {
        passed: ok ? true : false,
        message: ok ? 'Cell is empty' : `Expected empty cell, but found "${strValue}"`,
      };
    }

    default:
      return { passed: true, message: 'Valid' };
  }
}

/**
 * Formats data types into readable badges
 */
export function detectDataType(val: any): 'string' | 'number' | 'boolean' | 'date' | 'empty' {
  if (val === null || val === undefined || val === '') return 'empty';
  if (typeof val === 'number') return 'number';
  if (typeof val === 'boolean') return 'boolean';
  if (val instanceof Date) return 'date';
  if (typeof val === 'string' && !isNaN(Number(val)) && val.trim() !== '') return 'number';
  return 'string';
}
