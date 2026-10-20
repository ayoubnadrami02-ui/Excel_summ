import { useState, useRef } from 'react';
import { UploadCloud, FolderUp, FileCheck2, Sparkles, RefreshCw } from 'lucide-react';
import { FileProcessResult } from '../types/extractor';

interface FileUploaderProps {
  onFilesSelected: (files: File[]) => void;
  onLoadSamples: () => void;
  onClearFiles: () => void;
  isProcessing: boolean;
  processResults: FileProcessResult[];
}

export function FileUploader({
  onFilesSelected,
  onLoadSamples,
  onClearFiles,
  isProcessing,
  processResults,
}: FileUploaderProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const validFiles = Array.from(e.dataTransfer.files).filter((file) =>
        /\.(xlsx|xlsm|xls|xltx|xltm)$/i.test(file.name)
      );
      if (validFiles.length > 0) {
        onFilesSelected(validFiles);
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const validFiles = Array.from(e.target.files).filter((file) =>
        /\.(xlsx|xlsm|xls|xltx|xltm)$/i.test(file.name)
      );
      onFilesSelected(validFiles);
      e.target.value = '';
    }
  };

  const passedCount = processResults.filter((r) => r.status === 'passed').length;
  const excludedCount = processResults.filter((r) => r.status === 'excluded').length;

  return (
    <div className="bg-white border-b border-slate-200 p-4">
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Dropzone Area */}
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={`flex-1 border-2 border-dashed rounded-lg p-3 text-center transition-all ${
            isDragOver
              ? 'border-emerald-500 bg-emerald-50/50'
              : 'border-slate-200 hover:border-slate-300 bg-slate-50/50'
          }`}
        >
          <div className="flex items-center justify-center gap-3">
            <UploadCloud className="w-5 h-5 text-slate-400 shrink-0" />
            <div className="text-left">
              <p className="text-xs font-semibold text-slate-700">
                Drop Excel files (.xlsx, .xlsm) here, or select
              </p>
              <p className="text-[11px] text-slate-500">
                All files in subfolders will be scanned and extracted
              </p>
            </div>

            <div className="flex items-center gap-2 ml-auto">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-2.5 py-1 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded transition-colors"
              >
                Choose Files
              </button>

              <button
                type="button"
                onClick={() => folderInputRef.current?.click()}
                className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded transition-colors"
                title="Select an entire folder of spreadsheets"
              >
                <FolderUp className="w-3.5 h-3.5 text-slate-500" />
                Folder
              </button>
            </div>
          </div>

          {/* Hidden inputs */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".xlsx,.xlsm,.xls,.xltx,.xltm"
            onChange={handleFileChange}
            className="hidden"
          />
          <input
            ref={folderInputRef}
            type="file"
            multiple
            // @ts-ignore
            webkitdirectory="true"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>

        {/* Quick Sample / Reset Actions */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={onLoadSamples}
            disabled={isProcessing}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            <span>Load Demo Workbooks</span>
          </button>

          {processResults.length > 0 && (
            <button
              onClick={onClearFiles}
              className="flex items-center gap-1 px-2.5 py-2 text-xs font-medium text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
              title="Clear batch"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Clear</span>
            </button>
          )}
        </div>
      </div>

      {/* Real-time Processing Stats strip */}
      {processResults.length > 0 && (
        <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <FileCheck2 className="w-3.5 h-3.5 text-slate-400" />
              <span>Total Uploaded: <strong>{processResults.length}</strong></span>
            </span>
            <span className="text-slate-300" aria-hidden="true">·</span>
            <span className="text-emerald-700 font-medium">
              Passed Conditions: <strong>{passedCount}</strong>
            </span>
            {excludedCount > 0 && (
              <>
                <span className="text-slate-300" aria-hidden="true">·</span>
                <span className="text-amber-700 font-medium">
                  Excluded by Condition: <strong>{excludedCount}</strong>
                </span>
              </>
            )}
          </div>

          <div className="text-[11px] text-slate-500">
            {isProcessing ? 'Processing workbooks...' : 'Extraction synced with current rules'}
          </div>
        </div>
      )}
    </div>
  );
}
