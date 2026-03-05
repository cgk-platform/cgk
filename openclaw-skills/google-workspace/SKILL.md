# Google Workspace

Create polished, presentation-ready Google Slides, Docs, Sheets, and manage Drive files via Google Workspace APIs with per-profile OAuth credentials.

## CRITICAL RULES

1. **NEVER pass markdown to any command.** No `#`, `**`, `- `, `1.`, or ` ``` `. The script REJECTS markdown and exits with an error.
2. **ALWAYS use `docs build-rich` for documents.** Do NOT fall back to element-by-element. If build-rich fails, report the error.
3. **ALWAYS use `sheets build-rich` for new spreadsheets.** Element-by-element sheets commands are for live editing of existing sheets only.
4. **All files are auto-shared with org.** Use `--link-share` for public links, `--share EMAIL` for individual sharing.
5. **ALWAYS use `add-chart` for numerical data** — render charts, don't just list numbers.
6. Every document must have heading hierarchy, styled tables, and visual structure.

## How to Build Beautiful Documents

### Rich Document Builder (Docs) — ALWAYS USE THIS

Build the entire document in one command via JSON spec piped to stdin. Automatically builds a .docx with python-docx, uploads to Drive as a native Google Doc, and org-shares.

```bash
cat <<'EOF' | gog docs build-rich --title "Monthly Report" --folder FOLDER_ID --share user@example.com
{
  "theme": {"dark": "1A1A2E", "accent": "E94560", "accent2": "0F3460", "lightBg": "F5F5F5", "medGray": "666666"},
  "header": "Confidential",
  "footer": "Generated March 2026",
  "sections": [{
    "children": [
      {"type": "heading", "level": 1, "text": "Monthly Performance Report", "color": "1A1A2E"},
      {"type": "subtitle", "text": "March 2026 — Brand Name"},
      {"type": "accentBar", "color": "E94560"},
      {"type": "kpiRow", "items": [
        {"value": "$42K", "label": "Revenue", "bg": "0F3460"},
        {"value": "3.8x", "label": "ROAS", "bg": "2E7D32"},
        {"value": "186", "label": "Orders", "bg": "1565C0"}
      ]},
      {"type": "heading", "level": 2, "text": "Executive Summary"},
      {"type": "paragraph", "text": "Revenue grew 10.5% this month driven by strong organic performance."},
      {"type": "callout", "title": "Key Insight", "body": "Top performers drove 60% of revenue.", "bg": "E8F5E9"},
      {"type": "divider"},
      {"type": "heading", "level": 2, "text": "Ad Performance"},
      {"type": "table", "headers": ["Ad Name", "ROAS", "Spend", "Revenue"],
       "rows": [["Morning Routine", "4.2x", "$1.2K", "$5.0K"], ["Product Hero", "2.8x", "$800", "$2.2K"]],
       "style": {"headerBg": "0F3460", "zebra": true}},
      {"type": "heading", "level": 2, "text": "Key Findings"},
      {"type": "bullets", "items": ["Organic traffic up 15%", "Paid ROAS improved 12%", "Email conversion steady at 4.2%"]},
      {"type": "heading", "level": 2, "text": "Recommendations"},
      {"type": "numberedList", "items": ["Scale top performers", "Test new UGC formats", "Refresh static ads"]}
    ]
  }]
}
EOF
```

**Flags:** `--title`, `--folder DRIVE_ID`, `--link-share`, `--share EMAIL`, `--output /local/path.docx` (local-only, skip upload), `--spec-file /path/to/spec.json` (alternative to stdin).

**Batch:** `gog docs build-rich-batch --spec-file specs.json --folder ID --link-share --parallel 4`

#### Rich Document JSON Spec — All 18 Element Types

```json
{"type": "heading", "level": 1, "text": "Title", "color": "1A1A2E"}
{"type": "subtitle", "text": "Subtitle text"}
{"type": "paragraph", "text": "Body text"}
{"type": "paragraph", "runs": [{"text": "Bold ", "bold": true}, {"text": "and italic", "italic": true, "color": "E94560"}]}
{"type": "accentBar", "color": "E94560"}
{"type": "divider"}
{"type": "kpiRow", "items": [{"value": "$42K", "label": "Revenue", "bg": "0F3460"}]}
{"type": "callout", "title": "Note", "body": "Important info here", "bg": "E8F5E9"}
{"type": "table", "headers": ["A","B"], "rows": [["1","2"]], "style": {"headerBg": "0F3460", "zebra": true, "zebraColor": "F5F5F5"}}
{"type": "richTable", "headers": ["A","B"], "rows": [[{"text": "Bold cell", "bold": true, "bg": "FFF3E0"}, "Normal"]]}
{"type": "bullets", "items": ["Item 1", "Item 2"]}
{"type": "numberedList", "items": ["Step 1", "Step 2"]}
{"type": "personaCard", "name": "Sarah", "role": "Marketing Manager", "details": ["25-34", "Urban"], "bg": "F5F5F5"}
{"type": "conceptHeader", "title": "STRATEGY", "subtitle": "Q2 growth plan", "color": "1A1A2E"}
{"type": "tag", "text": "HIGH PRIORITY", "color": "E94560"}
{"type": "pageBreak"}
{"type": "spacer", "height": 12}
{"type": "image", "path": "/absolute/path/to/image.png", "width": 5.0}
```

**Theme:** Colors are 6-char hex without `#`. Keys: `dark`, `accent`, `accent2`, `lightBg`, `medGray`.

**Defaults:** Arial 11pt, US Letter, 0.8" margins. Header/footer via top-level `"header"` and `"footer"` strings.

**Multi-section:** Each object in `"sections"` array starts on a new page.

### Rich Presentation Builder (Slides) -- ALWAYS USE THIS

Build an entire presentation in one command via JSON spec. Automatically builds a .pptx with python-pptx, uploads to Drive as a native Google Slides deck, and org-shares.

```bash
cat <<'EOF' | gog slides build-rich --title "Q1 Review" --folder FOLDER_ID --link-share
{
  "theme": {"dark": "1A1A2E", "accent": "E94560", "accent2": "0F3460", "lightBg": "F5F5F5", "medGray": "666666"},
  "slides": [
    {"type": "title_slide", "title": "Q1 Performance Review", "subtitle": "March 2026"},
    {"type": "section", "title": "Executive Summary"},
    {"type": "kpi_row", "title": "Key Metrics", "metrics": [
      {"value": "$42K", "label": "Revenue", "bg": "0F3460"},
      {"value": "3.8x", "label": "ROAS", "bg": "2E7D32"},
      {"value": "186", "label": "Orders", "bg": "1565C0"},
      {"value": "+10.5%", "label": "Growth", "bg": "E94560"}
    ]},
    {"type": "bullets", "title": "Growth Drivers", "items": ["Organic traffic up 15%", "Paid ROAS improved 12%", "Email conversion steady at 4.2%"]},
    {"type": "table", "title": "Ad Performance", "headers": ["Ad Name", "ROAS", "Spend", "Revenue"],
     "rows": [["Morning Routine", "4.2x", "$1.2K", "$5.0K"], ["Product Hero", "2.8x", "$800", "$2.2K"]],
     "style": {"headerBg": "0F3460", "zebra": true}},
    {"type": "chart", "title": "Revenue Trend", "chartType": "bar",
     "categories": ["Jan", "Feb", "Mar"],
     "series": [{"name": "Revenue", "values": [32000, 38000, 42000]}]},
    {"type": "two_column", "title": "Strategy vs Results",
     "left": {"heading": "Strategy", "body": "Focus on UGC content and scaling top performers"},
     "right": {"heading": "Results", "body": "UGC drove 3.2x ROAS, top performers scaled 40%"}},
    {"type": "closing", "title": "Thank You", "subtitle": "Questions?"}
  ]
}
EOF
```

**Flags:** `--title`, `--folder DRIVE_ID`, `--link-share`, `--share EMAIL`, `--output /local/path.pptx` (local-only, skip upload), `--spec-file /path/to/spec.json`.

**Batch:** `gog slides build-rich-batch --spec-file specs.json --folder ID --link-share --parallel 4`

#### Rich Presentation JSON Spec -- All 11 Slide Types

```json
{"type": "title_slide", "title": "Title", "subtitle": "Subtitle", "notes": "Speaker notes"}
{"type": "section", "title": "Section Name"}
{"type": "content", "title": "Heading", "body": "Body text"}
{"type": "bullets", "title": "Heading", "items": ["Item 1", "Item 2"]}
{"type": "kpi_row", "title": "Metrics", "metrics": [{"value": "$42K", "label": "Revenue", "bg": "0F3460"}]}
{"type": "table", "title": "Data", "headers": ["A","B"], "rows": [["1","2"]], "style": {"headerBg": "0F3460", "zebra": true}}
{"type": "two_column", "title": "Compare", "left": {"heading": "Left", "body": "..."}, "right": {"heading": "Right", "body": "..."}}
{"type": "image", "title": "Visual", "path": "/path/to/image.png", "caption": "Caption text"}
{"type": "chart", "title": "Chart", "chartType": "bar|line|pie|area|scatter|doughnut", "categories": [...], "series": [{"name": "...", "values": [...]}]}
{"type": "blank", "background": "FFFFFF", "elements": [{"type": "text", "text": "...", "x": 1, "y": 1, "fontSize": 14, "bold": true}]}
{"type": "closing", "title": "Thank You", "subtitle": "Questions?"}
```

**Theme:** Colors are 6-char hex without `#`. Keys: `dark`, `accent`, `accent2`, `lightBg`, `medGray`.

**Speaker notes:** Add `"notes": "..."` to any slide spec.

**Dimensions:** Default 13.333 x 7.5 inches (16:9 widescreen). Override with `"slideWidth"` and `"slideHeight"`.

### Presentation Tools (Slides) -- Element-by-Element (Legacy)

For editing existing Google Slides or adding individual slides to an existing presentation:

```bash
# Always start with create + theme
gog slides create "Title Here" --clean
gog slides apply-theme PRES_ID

# LAYOUT PRESETS — pre-styled professional slide templates
gog slides add-layout PRES_ID title --data '{"title":"...","subtitle":"..."}'
gog slides add-layout PRES_ID kpi --data '{"title":"...","kpis":[{"value":"$42K","label":"Revenue"},{"value":"3.8x","label":"ROAS"}]}'
gog slides add-layout PRES_ID section --data '{"title":"Section Name"}'
gog slides add-layout PRES_ID two-column --data '{"title":"...","body":"Left column text","rightBody":"Right column text"}'
gog slides add-layout PRES_ID content --data '{"title":"Key Findings","content":"Body text with analysis and insights goes here."}'
gog slides add-layout PRES_ID closing --data '{"title":"...","subtitle":"..."}'

# CUSTOM SLIDES — blank canvas with your own elements
gog slides add-slide PRES_ID --layout BLANK
gog slides add-text PRES_ID SLIDE_IDX "Heading" --heading heading2 --style '{"y":20}'
gog slides add-text PRES_ID SLIDE_IDX "Analysis text below the data" --style '{"y":280,"fontSize":14}'
gog slides add-table PRES_ID SLIDE_IDX --data '[["Col1","Col2"],["val1","val2"]]' --style '{"headerColor":"#1a73e8","zebra":true}'
gog slides add-chart PRES_ID SLIDE_IDX --data '{"labels":[...],"datasets":[{"label":"...","values":[...]}]}' --type line|bar|pie

# OTHER ELEMENTS
gog slides add-image PRES_ID SLIDE_IDX --url URL --x 50 --y 50 --width 300 --height 200
gog slides add-shape PRES_ID SLIDE_IDX --type RECTANGLE --style '{"fillColor":"#1a73e8","x":0,"y":0,"width":720,"height":5}'
gog slides set-background PRES_ID SLIDE_IDX --color "#f5f5f5"
```

**Chart types:** `line`, `bar`, `pie`, `column`, `area`, `scatter`
**Layout presets:** `title`, `section`, `kpi`, `two-column`, `closing`, `content`

### Spreadsheet Pattern (Sheets) -- Rich Builder (PREFERRED)

**ALWAYS use `build-rich` for new spreadsheets.** It creates a fully formatted .xlsx with openpyxl, uploads to Drive as Google Sheets, and optionally link-shares -- all in one command.

**ALWAYS use formulas, not hardcoded calculations.** If a cell's value can be computed from other cells, write a formula.

```bash
# Build a complete spreadsheet from JSON spec (pipe or --spec-file)
echo '{"title":"Sales Dashboard","sheets":[{"name":"Summary","frozenRows":1,"autoFilter":"A1:D1","columnWidths":{"A":25,"B":15,"C":15,"D":15},"data":[["Metric","Value","Change","Impact"],["Revenue",42000,0.105,null],["ROAS",3.8,0.12,null]],"formulas":{"D2":"=B2*C2","D3":"=B3*C3"},"styles":[{"range":"A1:D1","bold":true,"backgroundColor":"1a73e8","textColor":"FFFFFF","alignment":"center"},{"range":"B2:B4","numberFormat":"$#,##0","textColor":"0000FF"},{"range":"C2:C4","numberFormat":"0.0%"}],"conditionalFormats":[{"range":"C2:C10","type":"greaterThan","value":0,"fill":"E8F5E9","fontColor":"2E7D32"}],"charts":[{"type":"bar","title":"Revenue","dataRange":"A1:B4","position":"F2","width":15,"height":10}]}]}' | gog sheets build-rich --title "Sales Dashboard" --link-share

# Batch build multiple spreadsheets
gog sheets build-rich-batch --spec-file specs.json --link-share --parallel 4

# Analyze a sheet
gog sheets analyze SHEET_ID
gog sheets analyze --file /tmp/report.xlsx

# Query/filter data
gog sheets query SHEET_ID --filter '{"Region":"West","Revenue":{">":50000}}' --sort Revenue --limit 10
gog sheets query SHEET_ID --groupby Region --agg '{"Revenue":"sum","Orders":"count"}'

# Download -> edit -> re-upload workflow
gog sheets download SHEET_ID --output /tmp/report.xlsx
echo '{"formulas":{"C11":"=SUM(C2:C10)"},"styles":[{"range":"B2:B10","numberFormat":"$#,##0"}]}' | gog sheets edit SHEET_ID --link-share
```

#### Financial Model Color Coding

| Color             | Meaning                  | Hex      |
| ----------------- | ------------------------ | -------- |
| Blue text         | Input values (hardcoded) | `0000FF` |
| Black text        | Formulas/calculations    | `000000` |
| Green text        | Cross-sheet references   | `008000` |
| Yellow background | Attention/review needed  | `FFFF00` |

### Spreadsheet Pattern (Sheets) -- Element-by-Element (Legacy)

For live interaction with existing Google Sheets (reading shared sheets, updating recurring reports):

```bash
# Create with frozen header
gog sheets create "Sales Dashboard" --frozen-rows 1

# Write data
gog sheets write SHEET_ID --range A1 \
  --data '[["Date","Revenue","Orders","ROAS"],["2026-02-14","$6200","26","3.2x"],["2026-02-15","$7100","31","3.5x"]]'

# Style header row
gog sheets format SHEET_ID --range A1:D1 \
  --style '{"bold":true,"backgroundColor":"#1a73e8","textColor":"#ffffff","horizontalAlignment":"CENTER"}'

# Auto-resize columns
gog sheets auto-resize SHEET_ID

# Add native chart
gog sheets add-chart SHEET_ID --range A1:B4 --type bar
```

## Command Reference

### Auth

| Command       | Description                              |
| ------------- | ---------------------------------------- |
| `auth status` | Check if credentials exist and are valid |

### Slides (Presentations) -- Rich Builder (PREFERRED)

| Command                                                                                                       | Description                                                                           |
| ------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| `slides build-rich [--title T] [--folder ID] [--link-share] [--share EMAIL] [--output PATH] [--spec-file F]` | Build rich presentation from JSON spec, upload as Google Slides (auto org-shared)     |
| `slides build-rich-batch [--folder ID] [--link-share] [--parallel N] [--spec-file F]`                         | Parallel batch build from JSON array of specs                                         |

### Slides (Presentations) -- Live API (Element-by-Element)

| Command                                                                           | Description                                                  |
| --------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| `slides create <title> [--clean]`                                                 | Create a new presentation (--clean removes placeholder text) |
| `slides get <pres_id>`                                                            | Get presentation structure (slide IDs, elements)             |
| `slides add-slide <pres_id> [--layout LAYOUT] [--index N]`                        | Add a slide                                                  |
| `slides add-text <pres_id> <slide_idx> <text> [--style JSON] [--heading H]`       | Add a styled text box                                        |
| `slides add-table <pres_id> <slide_idx> --data JSON [--style JSON]`               | Add a styled table                                           |
| `slides add-image <pres_id> <slide_idx> --url URL [--x --y --width --height EMU]` | Add image from URL                                           |
| `slides add-shape <pres_id> <slide_idx> --type TYPE [--style JSON]`               | Add a shape                                                  |
| `slides set-background <pres_id> <slide_idx> --color HEX\|--image URL`            | Set slide background                                         |
| `slides apply-theme <pres_id> [--set-backgrounds]`                                | Apply brand colors (auto-detects profile)                    |
| `slides add-chart <pres_id> <slide_idx> --data JSON --type TYPE`                  | Add a chart                                                  |
| `slides add-layout <pres_id> PRESET [--data JSON]`                                | Add a preset layout slide                                    |
| `slides export <pres_id> --format pdf\|pptx\|png\|svg [--output PATH]`            | Export presentation                                          |
| `slides batch-update <pres_id> --requests JSON`                                   | Raw batchUpdate for advanced use                             |

**Layout presets:** `title`, `section`, `kpi`, `two-column`, `closing`, `content`

**Slide layouts:** `BLANK`, `TITLE`, `TITLE_AND_BODY`, `SECTION_HEADER`, `TITLE_ONLY`, `ONE_COLUMN_TEXT`, `MAIN_POINT`, `BIG_NUMBER`, `CAPTION_ONLY`, `TITLE_AND_TWO_COLUMNS`

### Docs (Documents) -- Rich Builder (PREFERRED)

| Command                                                                                                    | Description                                                                |
| ---------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| `docs build-rich [--title T] [--folder ID] [--link-share] [--share EMAIL] [--output PATH] [--spec-file F]` | Build rich document from JSON spec, upload as Google Doc (auto org-shared) |
| `docs build-rich-batch [--folder ID] [--link-share] [--parallel N] [--spec-file F]`                        | Parallel batch build from JSON array of specs                              |
| `docs create <title>`                                                                                      | Create an empty document (auto org-shared)                                 |
| `docs get <doc_id>`                                                                                        | Get document structure and heading outline                                 |
| `docs export <doc_id> --format pdf\|docx\|md\|html\|epub [--output PATH]`                                  | Export document                                                            |

### Docs (Documents) -- Live API (Element-by-Element)

For editing existing Google Docs or simple additions:

| Command                                                             | Description                               |
| ------------------------------------------------------------------- | ----------------------------------------- |
| `docs add-text <doc_id> <text> [--style STYLE] [--text-style JSON]` | Add styled text (REJECTS markdown)        |
| `docs add-table <doc_id> --data JSON [--style JSON]`                | Add a styled table                        |
| `docs add-image <doc_id> --url URL [--width PT] [--height PT]`      | Insert inline image                       |
| `docs add-section <doc_id> --title TEXT`                            | Add section break + H1 heading (new page) |
| `docs add-list <doc_id> --items JSON [--type bullet\|numbered]`     | Add bulleted/numbered list                |
| `docs add-page-break <doc_id>`                                      | Insert page break                         |
| `docs add-divider <doc_id>`                                         | Add visual divider line                   |
| `docs add-header <doc_id> --text TEXT`                              | Add page header                           |
| `docs add-footer <doc_id> --text TEXT`                              | Add page footer                           |

**Text styles:** `title`, `subtitle`, `heading1`-`heading6`, `normal`

### Sheets (Spreadsheets) -- Rich Builder (PREFERRED)

| Command                                                                                                                      | Description                                                            |
| ---------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| `sheets build-rich [--title T] [--folder ID] [--link-share] [--output PATH] [--spec-file F]`                                 | Build rich spreadsheet from JSON spec (stdin or file), upload to Drive |
| `sheets build-rich-batch [--folder ID] [--link-share] [--parallel N] [--spec-file F]`                                        | Parallel batch build from JSON array of specs                          |
| `sheets analyze [SHEET_ID] [--file PATH] [--sheet NAME]`                                                                     | Analyze structure + data stats (pandas describe, dtypes, nulls)        |
| `sheets query [SHEET_ID] [--file PATH] [--filter JSON] [--groupby COL] [--agg JSON] [--sort COL] [--limit N] [--sheet NAME]` | Filter, aggregate, sort spreadsheet data                               |
| `sheets download <SHEET_ID> [--output PATH]`                                                                                 | Download Google Sheet as .xlsx                                         |
| `sheets edit <SHEET_ID> [--spec-file F] [--link-share]`                                                                      | Edit existing sheet (download -> modify -> re-upload)                  |

### Sheets (Spreadsheets) -- Live API (Element-by-Element)

| Command                                                          | Description                 |
| ---------------------------------------------------------------- | --------------------------- |
| `sheets create <title> [--frozen-rows N]`                        | Create spreadsheet          |
| `sheets get <sheet_id>`                                          | Get metadata and sheet list |
| `sheets read <sheet_id> [--range A1:Z100]`                       | Read data                   |
| `sheets write <sheet_id> --range A1 --data JSON`                 | Write data                  |
| `sheets format <sheet_id> --range RANGE --style JSON`            | Format cells                |
| `sheets add-chart <sheet_id> --range RANGE --type TYPE`          | Add native chart            |
| `sheets add-tab <sheet_id> --title NAME [--color HEX]`           | Add new tab                 |
| `sheets conditional-format <sheet_id> --range RANGE --rule JSON` | Add conditional formatting  |
| `sheets auto-resize <sheet_id> [--columns 0:10]`                 | Auto-fit column widths      |

**Chart types:** `bar`, `line`, `pie`, `column`, `area`, `scatter`

### Drive (File Management)

| Command                                                                | Description   |
| ---------------------------------------------------------------------- | ------------- |
| `drive list [--folder ID] [--type slides\|docs\|sheets]`               | List files    |
| `drive share <file_id> --email EMAIL --role reader\|writer\|commenter` | Share file    |
| `drive move <file_id> --to FOLDER_ID`                                  | Move file     |
| `drive upload <local_path> [--folder ID] [--mime-type TYPE]`           | Upload file   |
| `drive create-folder <name> [--parent ID]`                             | Create folder |

## Rich Spreadsheet JSON Spec Format

Full reference for `sheets build-rich` and `sheets edit` JSON specs:

```json
{
  "title": "Spreadsheet Title",
  "sheets": [
    {
      "name": "Tab Name",
      "tabColor": "1a73e8",
      "frozenRows": 1,
      "frozenCols": 0,
      "autoFilter": "A1:D1",
      "columnWidths": { "A": 25, "B": 15, "C": 15 },
      "data": [
        ["Header1", "Header2", "Header3"],
        ["val1", 42000, 0.105]
      ],
      "formulas": {
        "C3": "=B2*B3",
        "B5": "=SUM(B2:B4)"
      },
      "styles": [
        {
          "range": "A1:D1",
          "bold": true,
          "italic": false,
          "fontSize": 12,
          "fontFamily": "Arial",
          "textColor": "FFFFFF",
          "backgroundColor": "1a73e8",
          "alignment": "center",
          "wrapText": true,
          "numberFormat": "$#,##0"
        }
      ],
      "conditionalFormats": [
        {
          "range": "C2:C10",
          "type": "greaterThan",
          "value": 0,
          "fill": "E8F5E9",
          "fontColor": "2E7D32"
        },
        {
          "range": "C2:C10",
          "type": "lessThan",
          "value": 0,
          "fill": "FFEBEE",
          "fontColor": "C62828"
        },
        { "range": "B2:B10", "type": "between", "start": 100, "end": 500, "fill": "FFF3E0" },
        { "range": "A2:A10", "type": "containsText", "text": "Error", "fill": "FFCDD2" },
        { "range": "D2:D10", "type": "colorScale", "startColor": "FF0000", "endColor": "00FF00" },
        { "range": "E2:E10", "type": "dataBar", "color": "638EC6" }
      ],
      "charts": [
        {
          "type": "bar",
          "title": "Chart Title",
          "dataRange": "A1:B4",
          "position": "F2",
          "width": 15,
          "height": 10
        }
      ]
    }
  ]
}
```

**Supported chart types:** `bar`, `line`, `pie`, `area`, `scatter`

**Supported conditional format types:** `greaterThan`, `lessThan`, `equal`, `between`, `containsText`, `colorScale`, `dataBar`

**Number format examples:** `$#,##0`, `$#,##0.00`, `0.0%`, `#,##0`, `0.00`, `yyyy-mm-dd`

## Data Formats

### Table data (`--data`)

2D JSON array where first row is headers:

```json
[
  ["Header 1", "Header 2", "Header 3"],
  ["Row 1 Col 1", "Row 1 Col 2", "Row 1 Col 3"]
]
```

### Table style (`--style` for tables)

```json
{
  "headerColor": "#1a73e8",
  "headerTextColor": "#ffffff",
  "zebra": true,
  "zebraColor": "#f8f9fa",
  "borderColor": "#dadce0",
  "fontSize": 10
}
```

### Chart data (`--data` for charts)

```json
{
  "title": "Revenue Trend",
  "labels": ["Mon", "Tue", "Wed", "Thu", "Fri"],
  "xAxisTitle": "Day",
  "yAxisTitle": "Revenue ($)",
  "datasets": [{ "label": "This Week", "values": [6200, 7100, 8400, 9200, 11100] }]
}
```

## Error Handling

| Error                             | Cause                            | Fix                                                    |
| --------------------------------- | -------------------------------- | ------------------------------------------------------ |
| "Markdown detected"               | Passed markdown to add-text      | Use structured commands (--style, add-list, add-table) |
| "Not configured for this profile" | No OAuth credentials             | Run `setup_oauth.py`                                   |
| "Token expired"                   | Auto-refreshes on next use       | Retry the command                                      |
| "403 Forbidden"                   | API not enabled                  | Enable API in Cloud Console                            |
| "404 Not Found"                   | Invalid document/presentation ID | Verify the ID from the URL                             |

## Per-Profile Isolation

- Each profile has its own `credentials/google-workspace-oauth.json`
- OAuth client ID shared across profiles (project-level)
- Workspace root auto-detected via script path
- Other profiles' credentials invisible due to Docker overlay mounts
