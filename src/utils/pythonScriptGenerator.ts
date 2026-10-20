import { ExtractionRule } from '../types/extractor';

/**
 * Generates turnkey, production-grade Python script using openpyxl & tkinter GUI
 * with multi-cell extraction support upon condition match.
 */
export function generatePythonOpenpyxlScript(rules: ExtractionRule[]): string {
  const jsonRules = JSON.stringify(
    rules.map((r) => ({
      condition_cell: (r.conditionCellRef || r.cellRef || 'A1').trim().toUpperCase(),
      sheet_name: r.sheetName.trim(),
      field_label: r.fieldLabel.trim() || 'Extraction Rule',
      condition_type: r.conditionType,
      condition_val: r.conditionValue,
      case_sensitive: r.caseSensitive,
      target_cells: (r.targetCells || r.conditionCellRef || r.cellRef || 'A1').trim(),
    })),
    null,
    4
  );

  return `"""
================================================================================
EXCEL MASTER CONSOLIDATOR & MULTI-CELL EXTRACTOR
Built with Python, openpyxl, and Tkinter GUI
================================================================================
Prerequisites:
    pip install openpyxl

Usage:
    Run with GUI:
        python excel_extractor.py
    
    Or run directly from terminal:
        python excel_extractor.py --cli /path/to/excel/folder
================================================================================
"""

import os
import sys
import re
import argparse
import datetime
from pathlib import Path
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter, column_index_from_string

# Try importing Tkinter for graphical interface
try:
    import tkinter as tk
    from tkinter import ttk, filedialog, messagebox
    HAS_TKINTER = True
except ImportError:
    HAS_TKINTER = False

# Configured Extraction Parameters & Multi-Cell Target Rules
DEFAULT_RULES = ${jsonRules}


def parse_and_expand_target_cells(target_input, default_label=""):
    """
    Parses a string of comma-separated cells, ranges (e.g. 'A1:B3'),
    or labeled cells (e.g. 'B2: Document Code, D4: Client') into a list
    of dicts: [{'coord': 'B2', 'label': 'Document Code'}, ...]
    """
    if not target_input or not str(target_input).strip():
        return []

    tokens = [t.strip() for t in re.split(r'[,;\\n]+', str(target_input)) if t.strip()]
    results = []
    seen = set()

    for token in tokens:
        # Check range pattern, e.g. A1:B3
        range_match = re.match(r'^([A-Za-z]+)(\\d+)\\s*:\\s*([A-Za-z]+)(\\d+)$', token)
        if range_match:
            c1_str, r1_str, c2_str, r2_str = range_match.groups()
            c1 = column_index_from_string(c1_str.upper())
            r1 = int(r1_str)
            c2 = column_index_from_string(c2_str.upper())
            r2 = int(r2_str)

            min_c, max_c = min(c1, c2), max(c1, c2)
            min_r, max_r = min(r1, r2), max(r1, r2)

            for r in range(min_r, max_r + 1):
                for c in range(min_c, max_c + 1):
                    coord = f"{get_column_letter(c)}{r}"
                    if coord not in seen:
                        seen.add(coord)
                        results.append({"coord": coord, "label": f"Cell {coord}"})
            continue

        # Check labeled cell, e.g. 'B2: Invoice No' or 'B2 = Invoice No'
        cell_coord = token
        label = ""
        if ":" in token or "=" in token:
            delim = "=" if "=" in token else ":"
            parts = token.split(delim, 1)
            cand_coord = parts[0].strip().upper()
            if re.match(r'^[A-Z]+\\d+$', cand_coord):
                cell_coord = cand_coord
                label = parts[1].strip()

        cell_coord = cell_coord.strip().upper()
        if re.match(r'^[A-Z]+\\d+$', cell_coord):
            if cell_coord not in seen:
                seen.add(cell_coord)
                results.append({
                    "coord": cell_coord,
                    "label": label or (f"{default_label} ({cell_coord})" if default_label else f"Cell {cell_coord}")
                })

    return results


def evaluate_cell_condition(cell_val, rule):
    """
    Evaluates whether cell_val satisfies the rule condition.
    Returns: (passed: bool, message: str)
    """
    c_type = rule.get("condition_type", "none")
    c_val = rule.get("condition_val", "")
    case_sensitive = rule.get("case_sensitive", False)

    # Empty condition check -> unconditional pass
    if not c_type or c_type == "none" or (c_type == "contains" and not str(c_val).strip()):
        return True, "No condition (unconditional pass)"

    str_val = "" if cell_val is None else str(cell_val)
    target = str_val if case_sensitive else str_val.lower()
    search = str(c_val) if case_sensitive else str(c_val).lower()

    if c_type == "contains":
        ok = search in target
        msg = f'Contains "{c_val}"' if ok else f'Missing "{c_val}" (got "{str_val}")'
        return ok, msg

    elif c_type == "not_contains":
        ok = search not in target
        msg = f'Does not contain "{c_val}"' if ok else f'Found forbidden "{c_val}"'
        return ok, msg

    elif c_type == "equals":
        ok = target == search
        msg = f'Equals "{c_val}"' if ok else f'Expected "{c_val}" (got "{str_val}")'
        return ok, msg

    elif c_type == "not_equals":
        ok = target != search
        msg = f'Not equal to "{c_val}"' if ok else f'Equal to forbidden "{c_val}"'
        return ok, msg

    elif c_type == "starts_with":
        ok = target.startswith(search)
        msg = f'Starts with "{c_val}"' if ok else f'Does not start with "{c_val}"'
        return ok, msg

    elif c_type == "ends_with":
        ok = target.endswith(search)
        msg = f'Ends with "{c_val}"' if ok else f'Does not end with "{c_val}"'
        return ok, msg

    elif c_type == "greater_than":
        try:
            num = float(''.join(ch for ch in str_val if ch.isdigit() or ch in '.-'))
            thresh = float(c_val)
            ok = num > thresh
            return ok, f'Value {num} > {thresh}' if ok else f'Value {num} <= {thresh}'
        except Exception:
            return False, f'Cannot compare non-numeric "{str_val}" to "{c_val}"'

    elif c_type == "less_than":
        try:
            num = float(''.join(ch for ch in str_val if ch.isdigit() or ch in '.-'))
            thresh = float(c_val)
            ok = num < thresh
            return ok, f'Value {num} < {thresh}' if ok else f'Value {num} >= {thresh}'
        except Exception:
            return False, f'Cannot compare non-numeric "{str_val}" to "{c_val}"'

    elif c_type == "not_empty":
        ok = len(str_val.strip()) > 0
        return ok, "Cell is populated" if ok else "Cell is blank"

    elif c_type == "is_empty":
        ok = len(str_val.strip()) == 0
        return ok, "Cell is blank" if ok else f'Expected blank, got "{str_val}"'

    return True, "Valid"


def extract_data_from_folder(folder_path, rules=None, progress_callback=None):
    """
    Scans folder_path for all Excel workbooks (.xlsx, .xlsm), evaluates conditions,
    and extracts multiple cells when the condition is true.
    Returns: (passed_records, excluded_files, total_files)
    """
    if rules is None:
        rules = DEFAULT_RULES

    folder = Path(folder_path)
    if not folder.is_dir():
        raise ValueError(f"Directory not found: {folder_path}")

    # Discover Excel files (ignoring lock files)
    excel_files = [
        f for f in folder.glob("**/*")
        if f.suffix.lower() in [".xlsx", ".xlsm", ".xltx", ".xltm"]
        and not f.name.startswith("~$")
        and not f.name.startswith("master_consolidated_")
    ]

    total_files = len(excel_files)
    passed_records = []
    excluded_files = []

    for index, file_path in enumerate(excel_files):
        if progress_callback:
            progress_callback(index + 1, total_files, file_path.name)

        try:
            wb = openpyxl.load_workbook(filename=file_path, data_only=True, read_only=True)
            sheet_names = wb.sheetnames
            if not sheet_names:
                excluded_files.append({
                    "file": file_path.name,
                    "path": str(file_path),
                    "reason": "Workbook has no sheets"
                })
                wb.close()
                continue

            file_passed = True
            file_cell_records = []

            for rule in rules:
                # 1. Evaluate condition cell
                cond_cell = rule["condition_cell"]
                if "!" in cond_cell:
                    sheet_part, cell_coord = cond_cell.split("!", 1)
                    target_sheet = sheet_part.strip("'\\"")
                else:
                    target_sheet = rule.get("sheet_name") or sheet_names[0]
                    cell_coord = cond_cell

                if target_sheet not in wb.sheetnames:
                    target_sheet = sheet_names[0]

                ws = wb[target_sheet]
                cell_obj = ws[cell_coord]
                val = cell_obj.value if cell_obj else None

                passed, msg = evaluate_cell_condition(val, rule)

                if not passed:
                    file_passed = False
                    excluded_files.append({
                        "file": file_path.name,
                        "path": str(file_path),
                        "reason": f"Condition on [{cell_coord}] failed: {msg}"
                    })
                    break

                # 2. Condition is TRUE! Extract multiple target cells
                target_defs = parse_and_expand_target_cells(
                    rule.get("target_cells", cell_coord),
                    rule.get("field_label", "")
                )
                if not target_defs:
                    target_defs = [{"coord": cell_coord, "label": rule.get("field_label", cell_coord)}]

                for t in target_defs:
                    t_coord = t["coord"]
                    t_cell_obj = ws[t_coord]
                    t_val = t_cell_obj.value if t_cell_obj else None

                    dtype = "empty"
                    if t_val is not None:
                        if isinstance(t_val, (int, float)):
                            dtype = "number"
                        elif isinstance(t_val, bool):
                            dtype = "boolean"
                        elif isinstance(t_val, (datetime.date, datetime.datetime)):
                            dtype = "date"
                            t_val = t_val.strftime("%Y-%m-%d %H:%M:%S")
                        else:
                            dtype = "string"

                    record = {
                        "source_file": file_path.name,
                        "folder_path": str(file_path.parent),
                        "sheet_name": target_sheet,
                        "condition_cell": cell_coord,
                        "cell_ref": t_coord,
                        "field_name": t["label"],
                        "value": str(t_val) if t_val is not None else "",
                        "data_type": dtype,
                        "condition_passed": True,
                        "condition_check": f"Trigger [{cell_coord}] passed: {msg}",
                    }
                    file_cell_records.append(record)

            wb.close()

            if file_passed:
                passed_records.extend(file_cell_records)

        except Exception as err:
            excluded_files.append({
                "file": file_path.name,
                "path": str(file_path),
                "reason": f"Read error: {str(err)}"
            })

    return passed_records, excluded_files, total_files


def export_master_workbook(records, output_path):
    """
    Writes the extracted multi-cell records into a formatted master Excel spreadsheet.
    """
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Consolidated Master"

    headers = [
        "Source File",
        "Folder / Directory",
        "Sheet Name",
        "Condition Cell",
        "Cell Coordinate",
        "Field Name",
        "Extracted Value",
        "Data Type",
        "Verification Status",
        "Condition Details"
    ]

    ws.append(headers)

    header_fill = PatternFill(start_color="0F172A", end_color="0F172A", fill_type="solid")
    header_font = Font(name="Calibri", size=11, bold=True, color="FFFFFF")
    data_font = Font(name="Calibri", size=10)
    center_align = Alignment(horizontal="center", vertical="center")
    left_align = Alignment(horizontal="left", vertical="center")
    thin_border = Border(
        left=Side(style='thin', color='E2E8F0'),
        right=Side(style='thin', color='E2E8F0'),
        top=Side(style='thin', color='E2E8F0'),
        bottom=Side(style='thin', color='E2E8F0')
    )

    for col_idx in range(1, len(headers) + 1):
        cell = ws.cell(row=1, column=col_idx)
        cell.fill = header_fill
        cell.font = header_font
        cell.alignment = center_align

    ws.row_dimensions[1].height = 28

    for row_idx, r in enumerate(records, start=2):
        row_values = [
            r["source_file"],
            r["folder_path"],
            r["sheet_name"],
            r.get("condition_cell", ""),
            r["cell_ref"],
            r["field_name"],
            r["value"],
            r["data_type"],
            "Passed",
            r["condition_check"]
        ]
        ws.append(row_values)
        ws.row_dimensions[row_idx].height = 20

        for col_idx in range(1, len(headers) + 1):
            c = ws.cell(row=row_idx, column=col_idx)
            c.font = data_font
            c.border = thin_border
            if col_idx in [3, 4, 5, 8, 9]:
                c.alignment = center_align
            else:
                c.alignment = left_align

    for col in ws.columns:
        max_len = 0
        col_letter = get_column_letter(col[0].column)
        for cell in col:
            val_str = str(cell.value or "")
            if len(val_str) > max_len:
                max_len = len(val_str)
        ws.column_dimensions[col_letter].width = max(max_len + 4, 12)

    ws.freeze_panes = "A2"
    wb.save(output_path)
    return output_path


# ==============================================================================
# TKINTER GRAPHICAL USER INTERFACE
# ==============================================================================
class ExtractorGUI:
    def __init__(self, root):
        self.root = root
        self.root.title("Excel Master Multi-Cell Extractor (openpyxl)")
        self.root.geometry("860x660")
        self.root.minsize(740, 520)
        self.root.configure(bg="#F8FAFC")

        self.rules = list(DEFAULT_RULES)
        self.folder_var = tk.StringVar(value="")
        self.status_var = tk.StringVar(value="Ready. Select an Excel folder to begin.")

        self._build_ui()

    def _build_ui(self):
        style = ttk.Style()
        style.theme_use("clam")

        # Top Banner
        header_frame = tk.Frame(self.root, bg="#0F172A", padx=20, pady=16)
        header_frame.pack(fill="x")

        title_lbl = tk.Label(
            header_frame,
            text="Excel Master Multi-Cell Consolidator",
            font=("Segoe UI", 16, "bold"),
            fg="#FFFFFF",
            bg="#0F172A"
        )
        title_lbl.pack(anchor="w")

        sub_lbl = tk.Label(
            header_frame,
            text="Extract multiple cells and ranges when condition criteria match",
            font=("Segoe UI", 9),
            fg="#94A3B8",
            bg="#0F172A"
        )
        sub_lbl.pack(anchor="w")

        # Main Body
        main_frame = tk.Frame(self.root, bg="#F8FAFC", padx=20, pady=14)
        main_frame.pack(fill="both", expand=True)

        # Folder Picker
        folder_box = tk.LabelFrame(main_frame, text=" 1. Source Folder ", font=("Segoe UI", 10, "bold"), bg="#FFFFFF", padx=14, pady=12)
        folder_box.pack(fill="x", pady=(0, 12))

        f_inner = tk.Frame(folder_box, bg="#FFFFFF")
        f_inner.pack(fill="x")

        folder_entry = tk.Entry(f_inner, textvariable=self.folder_var, font=("Segoe UI", 10), bg="#F1F5F9", relief="flat", highlightthickness=1, highlightbackground="#CBD5E1")
        folder_entry.pack(side="left", fill="x", expand=True, ipady=5, padx=(0, 8))

        browse_btn = tk.Button(f_inner, text="Browse Folder...", font=("Segoe UI", 9, "bold"), bg="#10B981", fg="#FFFFFF", relief="flat", padx=12, pady=4, cursor="hand2", command=self._browse_folder)
        browse_btn.pack(side="right")

        # Rules Preview
        rules_box = tk.LabelFrame(main_frame, text=f" 2. Active Rules & Multi-Cell Targets ({len(self.rules)}) ", font=("Segoe UI", 10, "bold"), bg="#FFFFFF", padx=14, pady=10)
        rules_box.pack(fill="x", pady=(0, 12))

        rules_list_frame = tk.Frame(rules_box, bg="#FFFFFF")
        rules_list_frame.pack(fill="x")

        for idx, r in enumerate(self.rules):
            c_desc = f"Contains '{r['condition_val']}'" if r['condition_type'] == 'contains' else r['condition_type']
            rule_text = f"• Condition on [{r['condition_cell']}]: {c_desc}  ==>  Extract Cells: {r['target_cells']}"
            lbl = tk.Label(rules_list_frame, text=rule_text, font=("Consolas", 9), fg="#334155", bg="#FFFFFF", anchor="w")
            lbl.pack(fill="x", pady=1)

        # Action Buttons
        action_frame = tk.Frame(main_frame, bg="#F8FAFC")
        action_frame.pack(fill="x", pady=(0, 10))

        self.run_btn = tk.Button(
            action_frame,
            text="Extract & Generate Master Spreadsheet",
            font=("Segoe UI", 11, "bold"),
            bg="#0F172A",
            fg="#FFFFFF",
            relief="flat",
            padx=16,
            pady=8,
            cursor="hand2",
            command=self._start_extraction
        )
        self.run_btn.pack(side="left")

        self.progress_bar = ttk.Progressbar(action_frame, mode="determinate")
        self.progress_bar.pack(side="right", fill="x", expand=True, padx=(16, 0), pady=6)

        # Log
        log_box = tk.LabelFrame(main_frame, text=" Execution Diagnostics & Log ", font=("Segoe UI", 10, "bold"), bg="#FFFFFF", padx=10, pady=8)
        log_box.pack(fill="both", expand=True)

        self.log_text = tk.Text(log_box, font=("Consolas", 9), bg="#0F172A", fg="#E2E8F0", relief="flat", padx=8, pady=8)
        self.log_text.pack(fill="both", expand=True)

        # Status
        status_lbl = tk.Label(self.root, textvariable=self.status_var, font=("Segoe UI", 9), fg="#64748B", bg="#F1F5F9", anchor="w", padx=20, pady=6)
        status_lbl.pack(fill="x", side="bottom")

    def _browse_folder(self):
        f = filedialog.askdirectory(title="Select Folder Containing Excel Files")
        if f:
            self.folder_var.set(f)
            self.status_var.set(f"Selected: {f}")

    def _log(self, text):
        self.log_text.insert("end", text + "\\n")
        self.log_text.see("end")
        self.root.update_idletasks()

    def _start_extraction(self):
        folder = self.folder_var.get().strip()
        if not folder or not os.path.isdir(folder):
            messagebox.showwarning("Warning", "Please select a valid folder of Excel files first.")
            return

        self.log_text.delete("1.0", "end")
        self._log(f"[*] Starting extraction in: {folder}")
        self._log(f"[*] Loaded {len(self.rules)} rule configurations with multi-cell mapping...")
        self.run_btn.config(state="disabled")

        def on_progress(current, total, filename):
            pct = int((current / total) * 100) if total else 0
            self.progress_bar["value"] = pct
            self.status_var.set(f"Processing ({current}/{total}): {filename}")
            self.root.update_idletasks()

        try:
            records, excluded, total = extract_data_from_folder(folder, self.rules, on_progress)

            self._log(f"\\n[+] Total Excel files found: {total}")
            self._log(f"[+] Files matching condition: {total - len(excluded)}")
            self._log(f"[-] Excluded / Failed files: {len(excluded)}")
            self._log(f"[+] Total individual cells extracted: {len(records)}")

            if excluded:
                self._log("\\n--- Excluded Files Details ---")
                for ex in excluded:
                    self._log(f"  [X] {ex['file']} => {ex['reason']}")

            if not records:
                messagebox.showwarning("Notice", "No files passed the condition criteria. Master sheet not created.")
                self.run_btn.config(state="normal")
                return

            output_file = os.path.join(folder, "master_consolidated_export.xlsx")
            export_master_workbook(records, output_file)

            self._log(f"\\n[SUCCESS] Master spreadsheet generated successfully!")
            self._log(f"Saved to: {output_file}")
            self.status_var.set(f"Done! {len(records)} cells exported to master_consolidated_export.xlsx")

            ans = messagebox.askyesno(
                "Extraction Complete",
                f"Successfully extracted {len(records)} cells across matching workbooks!\\n\\nSaved to:\\n{output_file}\\n\\nWould you like to open the file now?"
            )
            if ans:
                if sys.platform == "win32":
                    os.startfile(output_file)
                elif sys.platform == "darwin":
                    os.system(f'open "{output_file}"')
                else:
                    os.system(f'xdg-open "{output_file}"')

        except Exception as e:
            self._log(f"\\n[ERROR] An error occurred: {str(e)}")
            messagebox.showerror("Error", f"Failed to complete extraction: {str(e)}")
        finally:
            self.run_btn.config(state="normal")


def main():
    parser = argparse.ArgumentParser(description="Extract Excel data into master sheet")
    parser.add_argument("--cli", type=str, help="Folder path to run without GUI")
    parser.add_argument("--out", type=str, default="master_consolidated_export.xlsx", help="Output file path")
    args = parser.parse_args()

    if args.cli:
        print(f"[*] Running CLI extraction on: {args.cli}")
        records, excluded, total = extract_data_from_folder(args.cli)
        print(f"[*] Total files: {total}, Passed: {total - len(excluded)}, Excluded: {len(excluded)}")
        print(f"[*] Extracted cell count: {len(records)}")
        if records:
            out_path = export_master_workbook(records, args.out)
            print(f"[+] Master spreadsheet saved to: {out_path}")
        else:
            print("[-] No records extracted.")
    else:
        if not HAS_TKINTER:
            print("Tkinter is not available. Please pass --cli /path/to/folder instead.")
            sys.exit(1)
        root = tk.Tk()
        app = ExtractorGUI(root)
        root.mainloop()


if __name__ == "__main__":
    main()
`;
}
