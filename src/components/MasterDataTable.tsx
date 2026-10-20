import { useState, useMemo } from 'react';
import { Search, Download, Table2, Layers, CheckCircle2, XCircle } from 'lucide-react';
import { ExtractedCellRow, ExtractionRule, FileProcessResult } from '../types/extractor';

interface MasterDataTableProps {
  results: FileProcessResult[];
  rules: ExtractionRule[];
  onExportExcel: (mode: 'cell_rows' | 'matrix') => void;
  onExportCSV: (mode: 'cell_rows' | 'matrix') => void;
  onLoadSamples: () => void;
}

export function MasterDataTable({
  results,
  rules: _rules,
  onExportExcel,
  onExportCSV,
  onLoadSamples,
}: MasterDataTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [layoutMode, setLayoutMode] = useState<'cell_rows' | 'matrix'>('cell_rows');

  // Filter only files that passed all conditions
  const passedFiles = useMemo(
    () => results.filter((r) => r.status === 'passed'),
    [results]
  );

  // Flatten all extracted cells from passed files
  const allCellRows: ExtractedCellRow[] = useMemo(() => {
    return passedFiles.flatMap((f) => f.extractedCells);
  }, [passedFiles]);

  // Unique columns for matrix view
  const matrixColumns = useMemo(() => {
    const map = new Map<string, string>();
    allCellRows.forEach((r) => {
      const key = r.fieldLabel || r.cellRef;
      if (!map.has(key)) {
        map.set(key, r.cellRef);
      }
    });
    return Array.from(map.entries()).map(([label, coord]) => ({ label, coord }));
  }, [allCellRows]);

  // Search filtering
  const filteredCellRows = useMemo(() => {
    if (!searchTerm.trim()) return allCellRows;
    const term = searchTerm.toLowerCase();
    return allCellRows.filter(
      (row) =>
        row.fileName.toLowerCase().includes(term) ||
        row.fieldLabel.toLowerCase().includes(term) ||
        row.cellRef.toLowerCase().includes(term) ||
        row.formattedValue.toLowerCase().includes(term) ||
        row.sheetName.toLowerCase().includes(term) ||
        (row.conditionCellRef && row.conditionCellRef.toLowerCase().includes(term))
    );
  }, [allCellRows, searchTerm]);

  // Matrix rows (one row per file)
  const matrixRows = useMemo(() => {
    return passedFiles.map((f) => {
      const rowData: Record<string, string> = {
        fileName: f.fileName,
        folderPath: f.folderPath,
      };
      f.extractedCells.forEach((c) => {
        const key = c.fieldLabel || c.cellRef;
        rowData[key] = c.formattedValue;
      });
      return rowData;
    });
  }, [passedFiles]);

  if (results.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-12 text-center bg-slate-50/50">
        <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 mb-4">
          <Table2 className="w-6 h-6" />
        </div>
        <h3 className="text-sm font-semibold text-slate-800 mb-1">
          No Excel Files Ingested Yet
        </h3>
        <p className="text-xs text-slate-500 max-w-sm mb-5">
          Drop a folder of Excel workbooks or load the demo test batch to see cell extraction in action.
        </p>
        <button
          onClick={onLoadSamples}
          className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
        >
          Load Demo Test Workbooks
        </button>
      </div>
    );
  }

  if (passedFiles.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-12 text-center bg-slate-50/50">
        <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 mb-4">
          <XCircle className="w-6 h-6" />
        </div>
        <h3 className="text-sm font-semibold text-slate-800 mb-1">
          All {results.length} Uploaded Files Were Excluded by Condition Rules
        </h3>
        <p className="text-xs text-slate-500 max-w-md mb-4">
          None of the processed files satisfied all mandatory cell conditions. Check the <strong>Validation Log</strong> tab to inspect failure details or adjust your rule conditions on the left.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-white overflow-hidden">
      {/* Subheader Toolbar */}
      <div className="px-5 py-3 border-b border-slate-200 bg-slate-50/60 flex flex-wrap items-center justify-between gap-3 shrink-0">
        {/* Left: View Mode Toggle & Search */}
        <div className="flex items-center gap-3">
          {/* Segmented Layout Mode Selector */}
          <div className="flex items-center p-0.5 bg-slate-200/80 rounded-lg text-xs font-medium text-slate-600">
            <button
              onClick={() => setLayoutMode('cell_rows')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md transition-colors ${
                layoutMode === 'cell_rows'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'hover:text-slate-900'
              }`}
              title="One row per matched cell with metadata columns"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Row per Cell ({allCellRows.length})</span>
            </button>
            <button
              onClick={() => setLayoutMode('matrix')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md transition-colors ${
                layoutMode === 'matrix'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'hover:text-slate-900'
              }`}
              title="One row per file, cells mapped to columns"
            >
              <Table2 className="w-3.5 h-3.5" />
              <span>Consolidated Matrix ({passedFiles.length})</span>
            </button>
          </div>

          {/* Search box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search values, files, cells..."
              className="pl-8 pr-3 py-1 text-xs bg-white border border-slate-200 rounded-md focus:border-emerald-500 focus:outline-hidden w-48 sm:w-60"
            />
          </div>
        </div>

        {/* Right: Export buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => onExportCSV(layoutMode)}
            className="flex items-center gap-1.5 px-3 py-1 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-md transition-colors"
          >
            <Download className="w-3 h-3 text-slate-400" />
            <span>CSV</span>
          </button>
          <button
            onClick={() => onExportExcel(layoutMode)}
            className="flex items-center gap-1.5 px-3 py-1 text-xs font-medium text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-md transition-colors"
          >
            <Download className="w-3 h-3 text-emerald-600" />
            <span>Excel (.xlsx)</span>
          </button>
        </div>
      </div>

      {/* Main Table View */}
      <div className="flex-1 overflow-auto">
        {layoutMode === 'cell_rows' ? (
          /* Mode 1: One row per matched cell with metadata columns */
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-100/80 sticky top-0 z-10 border-b border-slate-200 text-slate-600 font-semibold">
              <tr>
                <th className="py-2.5 px-4 whitespace-nowrap">Source File</th>
                <th className="py-2.5 px-4 whitespace-nowrap">Sheet</th>
                <th className="py-2.5 px-4 whitespace-nowrap">Condition Cell</th>
                <th className="py-2.5 px-4 whitespace-nowrap">Imported Cell</th>
                <th className="py-2.5 px-4 whitespace-nowrap">Field Name</th>
                <th className="py-2.5 px-4 whitespace-nowrap">Extracted Value</th>
                <th className="py-2.5 px-4 whitespace-nowrap">Data Type</th>
                <th className="py-2.5 px-4 whitespace-nowrap">Verification Trigger</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredCellRows.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-2 px-4 font-medium text-slate-800 max-w-[200px] truncate" title={row.fileName}>
                    {row.fileName}
                  </td>
                  <td className="py-2 px-4 text-slate-500 font-mono text-[11px]">
                    {row.sheetName}
                  </td>
                  <td className="py-2 px-4 font-mono font-medium text-amber-700 bg-amber-50/40">
                    {row.conditionCellRef || '—'}
                  </td>
                  <td className="py-2 px-4 font-mono font-semibold text-emerald-700">
                    {row.cellRef}
                  </td>
                  <td className="py-2 px-4 text-slate-700 font-medium">
                    {row.fieldLabel}
                  </td>
                  <td className="py-2 px-4 font-mono font-medium text-slate-900 bg-slate-50/50 max-w-[240px] truncate" title={row.formattedValue}>
                    {row.formattedValue || <span className="text-slate-300 italic">(blank)</span>}
                  </td>
                  <td className="py-2 px-4 text-slate-500 uppercase text-[10px] tracking-wider">
                    {row.dataType}
                  </td>
                  <td className="py-2 px-4 text-slate-600">
                    <span className="flex items-center gap-1.5 text-emerald-700">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span className="truncate max-w-[220px]" title={row.conditionDetails}>
                        {row.conditionDetails}
                      </span>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          /* Mode 2: Matrix View (One row per file, multi-cells as columns) */
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-100/80 sticky top-0 z-10 border-b border-slate-200 text-slate-600 font-semibold">
              <tr>
                <th className="py-2.5 px-4 whitespace-nowrap">Source File</th>
                {matrixColumns.map((col) => (
                  <th key={col.label} className="py-2.5 px-4 whitespace-nowrap">
                    {col.label} <span className="text-slate-400 font-mono font-normal">[{col.coord}]</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {matrixRows.map((row, idx) => (
                <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-2.5 px-4 font-medium text-slate-800">
                    {row.fileName}
                  </td>
                  {matrixColumns.map((col) => {
                    const val = row[col.label];
                    return (
                      <td key={col.label} className="py-2.5 px-4 font-mono text-slate-900">
                        {val || <span className="text-slate-300 italic">(empty)</span>}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Table Footer Summary */}
      <div className="px-5 py-2.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 shrink-0">
        <div>
          Showing <strong>{filteredCellRows.length}</strong> imported cells across{' '}
          <strong>{passedFiles.length}</strong> validated workbooks
        </div>
        <div className="text-[11px] text-slate-400">
          Format: {layoutMode === 'cell_rows' ? 'Row per matched cell' : 'Consolidated Matrix'}
        </div>
      </div>
    </div>
  );
}
