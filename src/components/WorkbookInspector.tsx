import { useState } from 'react';
import * as XLSX from 'xlsx';
import { FileProcessResult } from '../types/extractor';
import { FileSpreadsheet, Eye } from 'lucide-react';

interface WorkbookInspectorProps {
  results: FileProcessResult[];
}

export function WorkbookInspector({ results }: WorkbookInspectorProps) {
  const [selectedFileIndex, setSelectedFileIndex] = useState(0);
  const [selectedSheet, setSelectedSheet] = useState<string>('');

  if (results.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-12 text-center bg-slate-50/50">
        <FileSpreadsheet className="w-10 h-10 text-slate-300 mb-3" />
        <h3 className="text-sm font-semibold text-slate-700">No Workbook Loaded</h3>
        <p className="text-xs text-slate-500 max-w-sm">
          Load or upload Excel workbooks to view their raw sheet structures and inspect cell coordinates.
        </p>
      </div>
    );
  }

  const currentResult = results[selectedFileIndex] || results[0];
  const workbook = currentResult?.workbookRaw;
  const sheetNames = workbook?.SheetNames || [];
  const activeSheetName = selectedSheet && sheetNames.includes(selectedSheet) ? selectedSheet : sheetNames[0];
  const activeSheet = workbook ? workbook.Sheets[activeSheetName] : null;

  // Convert active sheet to a simple 2D matrix or json table for visual inspection
  let gridData: any[][] = [];
  if (activeSheet) {
    gridData = XLSX.utils.sheet_to_json(activeSheet, { header: 1, defval: '' }) as any[][];
  }

  // Column headers A, B, C, D...
  const maxCols = Math.min(
    12,
    gridData.reduce((max, row) => Math.max(max, row.length), 0) || 6
  );
  const colLetters = Array.from({ length: maxCols }, (_, i) => String.fromCharCode(65 + i));

  return (
    <div className="flex-1 flex flex-col h-full bg-white overflow-hidden">
      {/* Top File & Sheet Selector Toolbar */}
      <div className="px-5 py-3 border-b border-slate-200 bg-slate-50/80 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
            <Eye className="w-3.5 h-3.5 text-emerald-600" />
            <span>Workbook:</span>
          </div>

          <select
            value={selectedFileIndex}
            onChange={(e) => {
              setSelectedFileIndex(Number(e.target.value));
              setSelectedSheet('');
            }}
            className="px-2.5 py-1 text-xs bg-white border border-slate-200 rounded font-medium text-slate-800 focus:outline-hidden"
          >
            {results.map((res, idx) => (
              <option key={res.fileId} value={idx}>
                {res.fileName} ({res.status === 'passed' ? 'Valid' : 'Excluded'})
              </option>
            ))}
          </select>

          {sheetNames.length > 1 && (
            <div className="flex items-center gap-1.5 ml-2">
              <span className="text-xs text-slate-500 font-medium">Sheet:</span>
              <div className="flex gap-1">
                {sheetNames.map((sheet: string) => (
                  <button
                    key={sheet}
                    onClick={() => setSelectedSheet(sheet)}
                    className={`px-2 py-0.5 text-xs rounded border transition-colors ${
                      activeSheetName === sheet
                        ? 'bg-slate-800 text-white border-slate-800 font-medium'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {sheet}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="text-xs text-slate-500">
          Click any cell below to identify its exact coordinate (e.g. <strong>B2</strong>)
        </div>
      </div>

      {/* Spreadsheet Cell Grid */}
      <div className="flex-1 overflow-auto p-4 bg-slate-50/40">
        <div className="inline-block min-w-full align-middle border border-slate-300 rounded-lg overflow-hidden bg-white shadow-xs">
          <table className="min-w-full divide-y divide-slate-200 text-xs border-collapse font-mono">
            {/* Column Headers A, B, C... */}
            <thead className="bg-slate-100 text-slate-600">
              <tr>
                <th className="w-12 py-2 px-3 text-center border-r border-slate-200 bg-slate-200/70 text-[11px] font-bold">
                  #
                </th>
                {colLetters.map((col) => (
                  <th key={col} className="py-2 px-3 text-center border-r border-slate-200 font-bold min-w-[100px]">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {gridData.slice(0, 25).map((row, rowIdx) => {
                const rowNum = rowIdx + 1;
                return (
                  <tr key={rowNum} className="hover:bg-slate-50/80">
                    {/* Row Number 1, 2, 3... */}
                    <td className="py-1.5 px-3 text-center bg-slate-100 font-bold text-slate-500 border-r border-slate-200 select-none text-[11px]">
                      {rowNum}
                    </td>

                    {colLetters.map((col, colIdx) => {
                      const coord = `${col}${rowNum}`;
                      const cellValue = row[colIdx];
                      const hasVal = cellValue !== undefined && cellValue !== null && cellValue !== '';

                      return (
                        <td
                          key={coord}
                          className={`py-1.5 px-3 border-r border-slate-200 max-w-[180px] truncate ${
                            hasVal ? 'text-slate-900 font-medium' : 'text-slate-300 italic'
                          }`}
                          title={`${coord}: ${hasVal ? String(cellValue) : '(empty)'}`}
                        >
                          {hasVal ? String(cellValue) : ''}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
