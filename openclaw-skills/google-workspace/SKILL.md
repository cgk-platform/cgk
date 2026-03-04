# Google Workspace

Create polished, presentation-ready Google Slides, Docs, Sheets, and manage Drive files via Google Workspace APIs with per-profile OAuth credentials.

## CRITICAL RULES

1. **NEVER pass markdown to any command.** No `#`, `**`, `- `, `1.`, or ` ``` `. The script REJECTS markdown and exits with an error. Use the structured commands below instead.
2. **NEVER use `docs write` — it does not exist.** There is no bulk write command. Build documents element by element using the structured commands.
3. **ALWAYS use `--style heading1`/`heading2`/`heading3` for headings** — never put `#` symbols in text.
4. **ALWAYS use `add-list` for bullet/numbered lists** — never put `- ` or `1. ` in text.
5. **ALWAYS use `add-table` for tabular data** — never try to format tables as text.
6. **ALWAYS use `--text-style '{"bold":true}'` for bold text** — never use `**text**`.
7. **ALWAYS use `add-chart` for numerical data** — render charts, don't just list numbers.
8. Every document must have heading hierarchy, styled tables, and visual structure.

## How to Build Beautiful Documents

### Document Pattern (Docs)

Build documents element by element. Each call adds one content block:

```bash
# 1. Create the doc
gog docs create "Monthly Performance Report"
# Returns: {"documentId": "abc123", "url": "https://..."}

# 2. Add title heading
gog docs add-text abc123 "Monthly Performance Report" --style title

# 3. Add subtitle
gog docs add-text abc123 "February 2026 — Brand Name" --style subtitle

# 4. Add section heading
gog docs add-text abc123 "Executive Summary" --style heading1

# 5. Add body paragraph (plain text, no markdown!)
gog docs add-text abc123 "Revenue grew 10.5% this month driven by strong organic performance and improved ad creative."

# 6. Add divider
gog docs add-divider abc123

# 7. Add KPI section
gog docs add-text abc123 "Key Performance Indicators" --style heading2
gog docs add-table abc123 \
  --data '[["Metric","Value","Change"],["Revenue","$42,000","+10.5%"],["ROAS","3.8x","+0.4x"],["Orders","186","+8.8%"]]' \
  --style '{"headerColor":"#34a853","headerTextColor":"#ffffff","zebra":true}'

# 8. Add findings as bullet list
gog docs add-text abc123 "Key Findings" --style heading2
gog docs add-list abc123 \
  --items '["Organic traffic up 15% from SEO improvements","Paid ROAS improved 12% after creative refresh","Email conversion steady at 4.2%"]' \
  --type bullet

# 9. Add bold emphasis in a paragraph
gog docs add-text abc123 "The Morning Routine UGC format is our strongest performer." \
  --text-style '{"bold":true}'

# 10. New page section
gog docs add-section abc123 --title "Detailed Analysis"
gog docs add-text abc123 "Ad performance broke down as follows:"

# 11. Add numbered recommendations
gog docs add-list abc123 \
  --items '["Scale Morning Routine UGC with 3-5 new variations","Test ingredient spotlight reels with trending audio","Refresh static ads with Q1 social proof"]' \
  --type numbered

# 12. Add header/footer
gog docs add-header abc123 --text "Confidential — Brand Name"
gog docs add-footer abc123 --text "Generated Feb 2026"
```

### Presentation Tools (Slides)

You have full creative freedom on what slides to create and what goes on each. These are the building blocks — mix and match as needed:

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

### Spreadsheet Pattern (Sheets)

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

### Slides (Presentations)

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

### Docs (Documents)

| Command                                                                   | Description                                |
| ------------------------------------------------------------------------- | ------------------------------------------ |
| `docs create <title>`                                                     | Create a document                          |
| `docs get <doc_id>`                                                       | Get document structure and heading outline |
| `docs add-text <doc_id> <text> [--style STYLE] [--text-style JSON]`       | Add styled text (REJECTS markdown)         |
| `docs add-table <doc_id> --data JSON [--style JSON]`                      | Add a styled table                         |
| `docs add-image <doc_id> --url URL [--width PT] [--height PT]`            | Insert inline image                        |
| `docs add-section <doc_id> --title TEXT`                                  | Add section break + H1 heading (new page)  |
| `docs add-list <doc_id> --items JSON [--type bullet\|numbered]`           | Add bulleted/numbered list                 |
| `docs add-page-break <doc_id>`                                            | Insert page break                          |
| `docs add-divider <doc_id>`                                               | Add visual divider line                    |
| `docs add-header <doc_id> --text TEXT`                                    | Add page header                            |
| `docs add-footer <doc_id> --text TEXT`                                    | Add page footer                            |
| `docs export <doc_id> --format pdf\|docx\|md\|html\|epub [--output PATH]` | Export document                            |

**Text styles:** `title`, `subtitle`, `heading1`-`heading6`, `normal`

**Text style JSON for bold/italic/color:** `--text-style '{"bold":true,"italic":false,"color":"#1a73e8","fontSize":14,"fontFamily":"Arial"}'`

### Sheets (Spreadsheets)

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
