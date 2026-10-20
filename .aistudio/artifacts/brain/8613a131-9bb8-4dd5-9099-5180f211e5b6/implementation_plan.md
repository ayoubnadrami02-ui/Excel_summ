# Excel Master Spreadsheet Extractor & Python openpyxl Generator

A dual-mode productivity platform that extracts specific cell values from batches of Excel files based on conditional rules, compiles them into a unified master spreadsheet with metadata columns, and exports a standalone Python `openpyxl` desktop script.

## User Review & Critical Decisions

> [!IMPORTANT]
> The following architectural decisions were confirmed in Phase 1 and guide this plan:
> - **Execution Mode**: Interactive web app with instant browser/server extraction plus a downloadable, turnkey Python + `openpyxl` desktop script.
> - **Master Output Layout**: "One row per matched cell with metadata columns" (`Source File`, `Folder/Path`, `Sheet`, `Cell Ref`, `Field Name`, `Extracted Value`, `Data Type`, `Status`).
> - **Condition Failure Policy**: Strict file-level validation — if any mandatory cell condition is violated in an Excel file, that entire file is excluded from the master export and flagged in a dedicated Diagnostics & Skipped Files log.

---

## 1. Overview & Core Concept

### What It Does
1. **Interactive Rule Builder**: Define target cell coordinates (e.g. `A1`, `B4`, `Sheet1!C10`), assign field headers, and set conditional rules (e.g., `contains "test"`, `equals`, `starts with`, `numeric > / <`, `not empty`, or empty/unconditional).
2. **Batch Excel Upload & Extraction**: Drop multiple `.xlsx`/`.xlsm`/`.xls` files or test with bundled sample workbooks. The app parses workbooks, evaluates rules against every file, and skips files failing conditional criteria.
3. **Consolidated Master Spreadsheet View**: Inspect extracted cell rows in a high-density tabular grid with search, column sorting, and instant download as `.xlsx` (formatted with freeze panes and styled headers) and `.csv`.
4. **Turnkey Python + openpyxl Script Generator**: Generates clean, well-commented Python code using `openpyxl` and `tkinter` (folder selector GUI dialog) embedding the exact configured cell rules and condition logic, ready to run directly on the user's local machine.

---

## 2. User Experience & Visual Design

### Key User Flows
```
┌─────────────────────────┐     ┌─────────────────────────┐     ┌─────────────────────────┐
│ 1. Define Cell Rules    │ ──> │ 2. Upload / Test Files  │ ──> │ 3. Inspect Master Data  │
│ Cell refs + Conditions  │     │ Batch files or samples  │     │ Row-per-cell with meta  │
└─────────────────────────┘     └─────────────────────────┘     └─────────────────────────┘
                                                                             │
                                                                             ▼
                                                                ┌─────────────────────────┐
                                                                │ 4. Export & Python Code │
                                                                │ Download .xlsx / script │
                                                                └─────────────────────────┘
```

- **Step 1: Rule Configuration Panel**: Add, duplicate, or remove cell rules. Each rule card contains:
  - Target Sheet name (default: Active / First sheet or specific name like `Sheet1`)
  - Cell Coordinate (e.g., `B2`, `D15`)
  - Field / Column Label (e.g., `Invoice Number`, `Customer Name`, `Approval Status`)
  - Condition Type selector (`No condition (Always extract)`, `Contains text`, `Equals`, `Starts with`, `Ends with`, `Greater than`, `Less than`, `Is not empty`)
  - Condition Match Value input (e.g., `"test"`, `"Approved"`, `1000`)
  - Case-sensitivity toggle
- **Step 2: File Ingestion & Processing**: Drag-and-drop zone supporting multiple Excel files, with progress indicator, file size, sheet count, and processing status. Includes a "Load Demo Workbooks" button for zero-friction testing.
- **Step 3: Master Data Grid**: High-density table with tabular numerals (`tabular-nums`), source filename, sheet coordinate, extracted value, and condition verification badges.
- **Step 4: Python Script Hub**: Tab with syntax-highlighted Python script using `openpyxl` + `tkinter` GUI file-picker, copy-to-clipboard, and one-click `.py` file download.

### Visual Identity & Theme
- **Theme**: Professional SaaS data tool, Slate & Emerald spreadsheet aesthetic (`#0F172A` deep navy dark headers, `#10B981` / `#059669` spreadsheet green accents, crisp white and slate-50 backgrounds).
- **Typography**: `Plus Jakarta Sans` for clean structural UI headers; `JetBrains Mono` / monospace tabular numerals for cell coordinates (`B2`, `Sheet1!C4`) and numeric data.
- **Components**: Strict 3-zone header, no pill clutter, hairline dividers, single-elevation cards, high-density data tables.

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Client-Side Excel Parsing via `xlsx` (SheetJS)**
  - *Chosen Approach*: Fast client-side parsing of uploaded `.xlsx` files using `xlsx` in browser, enabling zero-latency, private, and offline-capable extraction without file size upload limits or server bottlenecks.
  - *Why*: Instant feedback, works locally without uploading sensitive company spreadsheets to an external server.
- **Decision 2: Python Script Architecture (tkinter GUI + openpyxl)**
  - *Chosen Approach*: Generate a standalone script that uses Python's standard library `tkinter.filedialog` (no extra GUI dependencies needed) + `openpyxl`.
  - *Why*: User only needs `pip install openpyxl` to run the generated script natively on Windows, macOS, or Linux.
- **Decision 3: File Filtering & Exclusion Handling**
  - *Chosen Approach*: Files failing any condition are excluded from the Master output and cataloged in an expandable "Excluded Files & Validation Log" panel, detailing the exact cell and mismatch reason.
  - *Why*: Ensures transparency without contaminating the master output dataset.

---

## 4. Technical Architecture & Component Hierarchy

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                                 App Shell                                    │
│ ┌──────────────────────────────────────────────────────────────────────────┐ │
│ │ Top Bar: Brand, Preset Templates, Export Master .xlsx, Download Python   │ │
│ └──────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│ ┌───────────────────────────┐  ┌───────────────────────────────────────────┐ │
│ │ Left: Extraction Rules    │  │ Right: Processing & Results Workspace     │ │
│ │ - Sheet & Cell Ref Inputs │  │ - Tab 1: Master Consolidated Data Table   │ │
│ │ - Condition Type & Value  │  │ - Tab 2: Excluded Files Diagnostic Log    │ │
│ │ - Add / Remove / Preset   │  │ - Tab 3: Generated Python openpyxl Script │ │
│ │ - File Dropzone & Samples │  │ - Tab 4: File Inspector & Sheet Viewer    │ │
│ └───────────────────────────┘  └───────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────────┘
```

### State Store & Data Contracts
- `ExtractionRule`: `{ id, sheetName, cellRef, fieldLabel, conditionType, conditionValue, caseSensitive }`
- `ExtractedRecord`: `{ id, fileName, fileSize, sheetName, cellRef, fieldLabel, value, dataType, passedCondition }`
- `FileProcessingSummary`: `{ totalFiles, processedFiles, passedFiles, excludedFiles, totalExtractedCells }`

### Dependencies
- `xlsx` (SheetJS) for client-side workbook reading and master spreadsheet writing.
- `lucide-react` for clean functional affordance icons.
- `motion` for fluid state transitions.
