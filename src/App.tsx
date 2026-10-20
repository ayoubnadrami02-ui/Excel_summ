import { useState, useEffect, useCallback } from 'react';
import { TopBar } from './components/TopBar';
import { RulesEditor } from './components/RulesEditor';
import { FileUploader } from './components/FileUploader';
import { MasterDataTable } from './components/MasterDataTable';
import { ExcludedFilesLog } from './components/ExcludedFilesLog';
import { PythonScriptView } from './components/PythonScriptView';
import { WorkbookInspector } from './components/WorkbookInspector';
import { ExtractionRule, FileProcessResult } from './types/extractor';
import { DEFAULT_SAMPLE_RULES, createSampleExcelFiles } from './utils/sampleDataGenerator';
import { processWorkbookFile, downloadMasterExcelFile, downloadMasterCSVFile } from './utils/excelProcessor';
import { generatePythonOpenpyxlScript } from './utils/pythonScriptGenerator';

export default function App() {
  const [activeTab, setActiveTab] = useState<string>('master_table');
  const [rules, setRules] = useState<ExtractionRule[]>(DEFAULT_SAMPLE_RULES);
  const [files, setFiles] = useState<File[]>([]);
  const [processResults, setProcessResults] = useState<FileProcessResult[]>([]);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  // Initialize with sample files on first load
  useEffect(() => {
    const demoFiles = createSampleExcelFiles();
    setFiles(demoFiles);
  }, []);

  // Process workbooks whenever files or rules change
  const runExtraction = useCallback(async (currentFiles: File[], currentRules: ExtractionRule[]) => {
    if (currentFiles.length === 0) {
      setProcessResults([]);
      return;
    }

    setIsProcessing(true);
    try {
      const results: FileProcessResult[] = [];
      for (const file of currentFiles) {
        const res = await processWorkbookFile(file, currentRules);
        results.push(res);
      }
      setProcessResults(results);
    } catch (err) {
      console.error('Extraction processing error:', err);
    } finally {
      setIsProcessing(false);
    }
  }, []);

  useEffect(() => {
    runExtraction(files, rules);
  }, [files, rules, runExtraction]);

  const handleFilesSelected = (newFiles: File[]) => {
    // Merge or replace files
    setFiles((prev) => {
      const existingNames = new Set(prev.map((f) => f.name));
      const freshFiles = newFiles.filter((f) => !existingNames.has(f.name));
      return [...prev, ...freshFiles];
    });
  };

  const handleLoadSamples = () => {
    const demoFiles = createSampleExcelFiles();
    setFiles(demoFiles);
  };

  const handleClearFiles = () => {
    setFiles([]);
    setProcessResults([]);
  };

  const passedResults = processResults.filter((r) => r.status === 'passed');
  const totalExtractedCells = passedResults.reduce(
    (acc, curr) => acc + curr.extractedCells.length,
    0
  );

  const handleExportExcel = (mode: 'cell_rows' | 'matrix' = 'cell_rows') => {
    if (passedResults.length === 0) return;
    downloadMasterExcelFile(passedResults, rules, mode);
  };

  const handleExportCSV = (mode: 'cell_rows' | 'matrix' = 'cell_rows') => {
    if (passedResults.length === 0) return;
    downloadMasterCSVFile(passedResults, mode);
  };

  const handleDownloadScript = () => {
    const script = generatePythonOpenpyxlScript(rules);
    const blob = new Blob([script], { type: 'text/x-python;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'excel_extractor.py';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-slate-100 overflow-hidden select-text">
      {/* Top Bar Header */}
      <TopBar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onExportExcel={() => handleExportExcel('cell_rows')}
        onDownloadScript={handleDownloadScript}
        totalRecords={totalExtractedCells}
      />

      {/* Main Split Layout */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Left Sidebar: Rules Config (380px) */}
        <aside className="w-full lg:w-[380px] xl:w-[420px] shrink-0 border-r border-slate-200 bg-white flex flex-col h-1/3 lg:h-full overflow-hidden">
          <RulesEditor rules={rules} setRules={setRules} />
        </aside>

        {/* Right Area: Ingestion Zone + Active Workspace Tab */}
        <main className="flex-1 flex flex-col h-2/3 lg:h-full overflow-hidden bg-white">
          {/* File Ingestion Dropzone & Stats */}
          <FileUploader
            onFilesSelected={handleFilesSelected}
            onLoadSamples={handleLoadSamples}
            onClearFiles={handleClearFiles}
            isProcessing={isProcessing}
            processResults={processResults}
          />

          {/* Tab Views */}
          <div className="flex-1 overflow-hidden flex flex-col">
            {activeTab === 'master_table' && (
              <MasterDataTable
                results={processResults}
                rules={rules}
                onExportExcel={handleExportExcel}
                onExportCSV={handleExportCSV}
                onLoadSamples={handleLoadSamples}
              />
            )}

            {activeTab === 'python_code' && (
              <PythonScriptView
                rules={rules}
                onDownloadScript={handleDownloadScript}
              />
            )}

            {activeTab === 'excluded_files' && (
              <ExcludedFilesLog results={processResults} />
            )}

            {activeTab === 'inspector' && (
              <WorkbookInspector results={processResults} />
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
