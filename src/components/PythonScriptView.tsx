import { useState } from 'react';
import { Copy, Check, Download, Terminal, FileCode2, Play } from 'lucide-react';
import { ExtractionRule } from '../types/extractor';
import { generatePythonOpenpyxlScript } from '../utils/pythonScriptGenerator';

interface PythonScriptViewProps {
  rules: ExtractionRule[];
  onDownloadScript: () => void;
}

export function PythonScriptView({ rules, onDownloadScript }: PythonScriptViewProps) {
  const [copied, setCopied] = useState(false);
  const scriptCode = generatePythonOpenpyxlScript(rules);

  const handleCopy = () => {
    navigator.clipboard.writeText(scriptCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-950 text-slate-100 overflow-hidden">
      {/* Top Banner Toolbar */}
      <div className="px-5 py-3 border-b border-slate-800 bg-slate-900/90 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-2.5">
          <FileCode2 className="w-4 h-4 text-emerald-400" />
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-white">
              excel_extractor.py
            </span>
            <span className="text-[11px] text-slate-400">
              (Python 3.9+ · openpyxl · Tkinter GUI)
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-md transition-colors cursor-pointer"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy Script</span>
              </>
            )}
          </button>

          <button
            onClick={onDownloadScript}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-md transition-colors cursor-pointer shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download .py File</span>
          </button>
        </div>
      </div>

      {/* Quick Setup Instructions Bar */}
      <div className="px-5 py-2.5 bg-slate-900/60 border-b border-slate-800 flex items-center justify-between text-xs text-slate-300">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>
            Run locally in 2 steps:
            <code className="mx-2 px-1.5 py-0.5 rounded bg-slate-800 text-emerald-400 font-mono text-[11px]">
              pip install openpyxl
            </code>
            then
            <code className="mx-2 px-1.5 py-0.5 rounded bg-slate-800 text-emerald-400 font-mono text-[11px]">
              python excel_extractor.py
            </code>
          </span>
        </div>

        <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
          <Play className="w-3 h-3 text-emerald-400" />
          <span>Opens native Tkinter GUI with folder selector</span>
        </div>
      </div>

      {/* Code Editor Preview */}
      <div className="flex-1 overflow-auto p-4 font-mono text-xs leading-relaxed text-slate-300 bg-slate-950">
        <pre className="selection:bg-emerald-900 selection:text-white whitespace-pre">
          {scriptCode}
        </pre>
      </div>

      {/* Footer Info */}
      <div className="px-5 py-2 bg-slate-900 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between shrink-0">
        <span>
          Includes {rules.length} configured cell rules. Updating parameters in the left sidebar regenerates this script automatically.
        </span>
        <span className="text-slate-500">
          Compatible with Windows, macOS & Linux
        </span>
      </div>
    </div>
  );
}
