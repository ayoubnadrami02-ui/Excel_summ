import { AlertTriangle, CheckCircle, FileX } from 'lucide-react';
import { FileProcessResult } from '../types/extractor';

interface ExcludedFilesLogProps {
  results: FileProcessResult[];
}

export function ExcludedFilesLog({ results }: ExcludedFilesLogProps) {
  const excludedFiles = results.filter((r) => r.status === 'excluded' || r.status === 'error');
  const passedCount = results.filter((r) => r.status === 'passed').length;

  if (results.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-12 text-center bg-slate-50/50">
        <FileX className="w-10 h-10 text-slate-300 mb-3" />
        <h3 className="text-sm font-semibold text-slate-700">No Validation Log Data</h3>
        <p className="text-xs text-slate-500 max-w-sm">
          Upload Excel workbooks to run conditional validation against your configured rules.
        </p>
      </div>
    );
  }

  if (excludedFiles.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-12 text-center bg-emerald-50/40">
        <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 mb-4">
          <CheckCircle className="w-6 h-6" />
        </div>
        <h3 className="text-sm font-semibold text-emerald-900 mb-1">
          All {passedCount} Workbooks Passed All Condition Criteria!
        </h3>
        <p className="text-xs text-emerald-700 max-w-md">
          Zero files were excluded. All target cells matched their specified conditions (such as containing "test" or required values).
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-white overflow-hidden">
      {/* Header bar */}
      <div className="px-5 py-3 border-b border-slate-200 bg-amber-50/60 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-600" />
          <h3 className="text-xs font-semibold text-amber-900">
            Validation Diagnostics: {excludedFiles.length} {excludedFiles.length === 1 ? 'Workbook' : 'Workbooks'} Excluded
          </h3>
        </div>
        <span className="text-xs text-slate-600">
          Per configuration policy, files with unsatisfied conditions are excluded from the master sheet.
        </span>
      </div>

      {/* Log list */}
      <div className="flex-1 overflow-auto divide-y divide-slate-100">
        {excludedFiles.map((item) => (
          <div key={item.fileId} className="p-4 hover:bg-slate-50/80 transition-colors">
            <div className="flex items-start justify-between gap-4 mb-2">
              <div>
                <h4 className="text-xs font-bold text-slate-900 font-mono">
                  {item.fileName}
                </h4>
                <p className="text-[11px] text-slate-500">
                  Folder: {item.folderPath} · Sheets: {item.sheetCount}
                </p>
              </div>

              <span className="px-2 py-0.5 text-[11px] font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded shrink-0">
                Excluded by Condition
              </span>
            </div>

            <div className="bg-slate-50 border border-slate-200/80 rounded-md p-2.5 text-xs">
              <div className="text-slate-700 font-medium mb-1">
                Failure Cause:
              </div>
              <div className="font-mono text-slate-800 text-[11px] bg-white p-2 rounded border border-slate-200">
                {item.reason}
              </div>
              {item.failedRule && (
                <div className="mt-2 flex items-center gap-4 text-[11px] text-slate-500">
                  <span>Target Cell: <strong className="text-slate-700">{item.failedRule.cellRef}</strong></span>
                  <span>Field: <strong className="text-slate-700">{item.failedRule.fieldLabel}</strong></span>
                  <span>Condition: <strong className="text-slate-700">{item.failedRule.conditionType} "{item.failedRule.conditionValue}"</strong></span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
