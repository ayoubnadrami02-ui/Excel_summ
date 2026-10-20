import { Plus, Trash2, SlidersHorizontal, HelpCircle, Copy, Layers } from 'lucide-react';
import { ConditionType, ExtractionRule } from '../types/extractor';
import { parseAndExpandTargetCells } from '../utils/ruleMatcher';

interface RulesEditorProps {
  rules: ExtractionRule[];
  setRules: React.Dispatch<React.SetStateAction<ExtractionRule[]>>;
}

export function RulesEditor({ rules, setRules }: RulesEditorProps) {
  const addRule = () => {
    const newId = `rule-${Date.now()}`;
    const nextNum = rules.length + 1;

    const newRule: ExtractionRule = {
      id: newId,
      conditionCellRef: 'B2',
      sheetName: '',
      fieldLabel: `Parameter Group ${nextNum}`,
      conditionType: 'contains',
      conditionValue: 'test',
      caseSensitive: false,
      targetCells: 'B2, D4, E12',
    };
    setRules([...rules, newRule]);
  };

  const updateRule = (id: string, updates: Partial<ExtractionRule>) => {
    setRules((prev) =>
      prev.map((r) => (r.id === id ? { ...r, ...updates } : r))
    );
  };

  const duplicateRule = (rule: ExtractionRule) => {
    const dup: ExtractionRule = {
      ...rule,
      id: `rule-${Date.now()}`,
      fieldLabel: `${rule.fieldLabel} (Copy)`,
    };
    setRules((prev) => [...prev, dup]);
  };

  const removeRule = (id: string) => {
    if (rules.length <= 1) return;
    setRules((prev) => prev.filter((r) => r.id !== id));
  };

  const conditionOptions: { value: ConditionType; label: string }[] = [
    { value: 'none', label: 'Empty (No condition - always extract)' },
    { value: 'contains', label: 'Contains text (e.g. "test")' },
    { value: 'not_contains', label: 'Does NOT contain text' },
    { value: 'equals', label: 'Equals exact value' },
    { value: 'not_equals', label: 'Not equal to' },
    { value: 'starts_with', label: 'Starts with' },
    { value: 'ends_with', label: 'Ends with' },
    { value: 'greater_than', label: 'Greater than number (>)' },
    { value: 'less_than', label: 'Less than number (<)' },
    { value: 'not_empty', label: 'Is not empty' },
    { value: 'is_empty', label: 'Is empty' },
  ];

  return (
    <div className="flex flex-col h-full bg-white border-r border-slate-200">
      {/* Header */}
      <div className="p-4 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="w-4 h-4 text-emerald-600" />
          <h2 className="text-sm font-semibold text-slate-800">Extraction Parameters</h2>
        </div>
        <span className="text-xs text-slate-500 font-medium">
          {rules.length} {rules.length === 1 ? 'Rule Group' : 'Rule Groups'}
        </span>
      </div>

      {/* Explainer */}
      <div className="px-4 py-2.5 bg-slate-100/60 border-b border-slate-200 text-xs text-slate-600 flex items-start gap-2">
        <HelpCircle className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
        <span>
          If the <strong>Condition Cell</strong> satisfies your condition, all specified <strong>Target Cells</strong> will be imported into the master spreadsheet.
        </span>
      </div>

      {/* Rules List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {rules.map((rule, idx) => {
          const isNoCondition = rule.conditionType === 'none' || !rule.conditionType;
          const expandedTargets = parseAndExpandTargetCells(
            rule.targetCells || rule.conditionCellRef || rule.cellRef || '',
            rule.fieldLabel
          );

          return (
            <div
              key={rule.id}
              className="p-3.5 rounded-lg border border-slate-200 bg-white hover:border-slate-300 transition-colors shadow-xs"
            >
              <div className="flex items-center justify-between gap-2 mb-2.5 pb-2 border-b border-slate-100">
                <span className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                  <span className="w-4 h-4 rounded bg-slate-100 text-slate-600 text-[10px] font-bold flex items-center justify-center">
                    {idx + 1}
                  </span>
                  {rule.fieldLabel || `Parameter Group #${idx + 1}`}
                </span>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => duplicateRule(rule)}
                    className="p-1 text-slate-400 hover:text-slate-600 rounded transition-colors"
                    title="Duplicate Rule"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                  {rules.length > 1 && (
                    <button
                      onClick={() => removeRule(rule.id)}
                      className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors"
                      title="Delete Rule"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Group Name & Sheet */}
              <div className="grid grid-cols-2 gap-2 mb-3">
                <div>
                  <label className="block text-[11px] font-medium text-slate-500 mb-1">
                    Rule Group Name
                  </label>
                  <input
                    type="text"
                    value={rule.fieldLabel}
                    onChange={(e) => updateRule(rule.id, { fieldLabel: e.target.value })}
                    placeholder="e.g. Invoices"
                    className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded focus:bg-white focus:border-emerald-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-500 mb-1">
                    Sheet (blank = active sheet)
                  </label>
                  <input
                    type="text"
                    value={rule.sheetName}
                    onChange={(e) => updateRule(rule.id, { sheetName: e.target.value })}
                    placeholder="e.g. Sheet1"
                    className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded focus:bg-white focus:border-emerald-500 focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Section 1: Condition Trigger */}
              <div className="p-2.5 rounded-md bg-amber-50/50 border border-amber-200/60 mb-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-amber-900 uppercase tracking-wider">
                    1. Condition Trigger
                  </span>
                  <span className="text-[10px] text-amber-700">Evaluated first</span>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-1">
                    <label className="block text-[10px] font-medium text-slate-600 mb-0.5">
                      Cell to Check
                    </label>
                    <input
                      type="text"
                      value={rule.conditionCellRef || rule.cellRef || ''}
                      onChange={(e) =>
                        updateRule(rule.id, {
                          conditionCellRef: e.target.value.toUpperCase(),
                          cellRef: e.target.value.toUpperCase(),
                        })
                      }
                      placeholder="e.g. B2"
                      className="w-full px-2 py-1 text-xs font-mono font-semibold text-amber-900 bg-white border border-amber-200 rounded focus:outline-hidden"
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="block text-[10px] font-medium text-slate-600 mb-0.5">
                      Condition Rule
                    </label>
                    <select
                      value={rule.conditionType}
                      onChange={(e) =>
                        updateRule(rule.id, { conditionType: e.target.value as ConditionType })
                      }
                      className="w-full px-2 py-1 text-xs bg-white border border-amber-200 rounded focus:outline-hidden"
                    >
                      {conditionOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Match Value Input (if condition needs a value) */}
                {!isNoCondition &&
                  rule.conditionType !== 'not_empty' &&
                  rule.conditionType !== 'is_empty' && (
                    <div className="flex gap-2 pt-0.5">
                      <div className="flex-1">
                        <input
                          type="text"
                          value={rule.conditionValue}
                          onChange={(e) => updateRule(rule.id, { conditionValue: e.target.value })}
                          placeholder={rule.conditionType === 'contains' ? 'e.g. test' : 'Value'}
                          className="w-full px-2 py-1 text-xs bg-white border border-amber-200 rounded focus:outline-hidden"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => updateRule(rule.id, { caseSensitive: !rule.caseSensitive })}
                        className={`px-2 py-0.5 text-[10px] font-medium rounded border transition-colors whitespace-nowrap ${
                          rule.caseSensitive
                            ? 'bg-slate-800 text-white border-slate-800'
                            : 'bg-white text-slate-600 border-amber-200 hover:bg-amber-100'
                        }`}
                      >
                        Case: {rule.caseSensitive ? 'On' : 'Off'}
                      </button>
                    </div>
                  )}
              </div>

              {/* Section 2: Target Cells to Import when True */}
              <div className="p-2.5 rounded-md bg-emerald-50/50 border border-emerald-200/60 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-emerald-900 uppercase tracking-wider flex items-center gap-1">
                    <Layers className="w-3 h-3 text-emerald-600" />
                    2. Cells to Import (if True)
                  </span>
                  <span className="text-[10px] font-semibold text-emerald-800">
                    {expandedTargets.length} {expandedTargets.length === 1 ? 'cell' : 'cells'}
                  </span>
                </div>

                <div>
                  <textarea
                    rows={2}
                    value={rule.targetCells}
                    onChange={(e) => updateRule(rule.id, { targetCells: e.target.value })}
                    placeholder="e.g. B2, D4, E12 or B2: Code, D4: Client or A1:B3"
                    className="w-full px-2.5 py-1.5 text-xs font-mono bg-white border border-emerald-200 rounded focus:border-emerald-500 focus:outline-hidden resize-none leading-relaxed"
                  />
                  <div className="text-[10px] text-slate-500 mt-1 flex flex-wrap gap-1">
                    <span>Supports:</span>
                    <span className="text-slate-700 font-mono">B2, D4, E12</span>
                    <span>·</span>
                    <span className="text-slate-700 font-mono">A1:B3 (range)</span>
                    <span>·</span>
                    <span className="text-slate-700 font-mono">B2: Label, D4: Name</span>
                  </div>
                </div>

                {/* Quick insertion helpers */}
                <div className="flex items-center gap-1.5 pt-1">
                  <button
                    type="button"
                    onClick={() =>
                      updateRule(rule.id, {
                        targetCells: 'B2: Document Code, D4: Client Name, B6: Issue Date, C8: Status, E12: Total',
                      })
                    }
                    className="px-2 py-0.5 text-[10px] font-medium text-emerald-800 bg-white hover:bg-emerald-100 border border-emerald-200 rounded transition-colors"
                  >
                    + Preset (B2, D4, B6, C8, E12)
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      updateRule(rule.id, {
                        targetCells: `${rule.targetCells ? rule.targetCells + ', ' : ''}A1:C3`,
                      })
                    }
                    className="px-2 py-0.5 text-[10px] font-medium text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded transition-colors"
                  >
                    + Range A1:C3
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Button */}
      <div className="p-4 border-t border-slate-200 bg-slate-50/70">
        <button
          onClick={addRule}
          className="w-full flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Add Another Rule Group</span>
        </button>
      </div>
    </div>
  );
}
