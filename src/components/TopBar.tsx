import { Download, FileSpreadsheet, Code2 } from 'lucide-react';

interface TopBarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onExportExcel: () => void;
  onDownloadScript: () => void;
  totalRecords: number;
}

export function TopBar({
  activeTab,
  setActiveTab,
  onExportExcel,
  onDownloadScript,
  totalRecords,
}: TopBarProps) {
  return (
    <header className="flex items-center justify-between gap-8 px-6 py-3.5 bg-slate-900 border-b border-slate-800 text-white shrink-0">
      {/* Zone 1: Brand Wordmark */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
          <FileSpreadsheet className="w-4 h-4" />
        </div>
        <div className="flex flex-col">
          <span className="text-base font-bold tracking-tight text-white whitespace-nowrap">
            Excel Master Consolidator
          </span>
          <span className="text-xs text-slate-400 whitespace-nowrap">
            openpyxl Extraction Engine
          </span>
        </div>
      </div>

      {/* Zone 2: Navigation Tabs */}
      <nav className="hidden md:flex items-center gap-1 bg-slate-800/80 p-1 rounded-lg border border-slate-700/60 text-xs font-medium">
        <button
          onClick={() => setActiveTab('master_table')}
          className={`px-3 py-1.5 rounded-md transition-colors whitespace-nowrap ${
            activeTab === 'master_table'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
          }`}
        >
          Master Table ({totalRecords})
        </button>
        <button
          onClick={() => setActiveTab('python_code')}
          className={`px-3 py-1.5 rounded-md transition-colors whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'python_code'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
          }`}
        >
          <Code2 className="w-3.5 h-3.5" />
          Python openpyxl Script
        </button>
        <button
          onClick={() => setActiveTab('excluded_files')}
          className={`px-3 py-1.5 rounded-md transition-colors whitespace-nowrap ${
            activeTab === 'excluded_files'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
          }`}
        >
          Validation Log
        </button>
        <button
          onClick={() => setActiveTab('inspector')}
          className={`px-3 py-1.5 rounded-md transition-colors whitespace-nowrap ${
            activeTab === 'inspector'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
          }`}
        >
          Workbook Viewer
        </button>
      </nav>

      {/* Zone 3: Primary Action Buttons */}
      <div className="flex items-center gap-2.5 shrink-0">
        <button
          onClick={onDownloadScript}
          className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors whitespace-nowrap"
          title="Download standalone Python script"
        >
          <Download className="w-3.5 h-3.5 text-slate-400" />
          <span>Get .py Script</span>
        </button>

        <button
          onClick={onExportExcel}
          disabled={totalRecords === 0}
          className={`flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium text-white rounded-lg transition-colors whitespace-nowrap shadow-sm ${
            totalRecords > 0
              ? 'bg-emerald-600 hover:bg-emerald-500 cursor-pointer'
              : 'bg-emerald-800/40 text-slate-400 cursor-not-allowed'
          }`}
        >
          <FileSpreadsheet className="w-3.5 h-3.5" />
          <span>Export Master .xlsx</span>
        </button>
      </div>
    </header>
  );
}
