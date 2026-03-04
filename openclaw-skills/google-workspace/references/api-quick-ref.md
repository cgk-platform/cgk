# Google Workspace API Quick Reference

## Coordinate System (Slides)

- **EMU** = English Metric Unit (fundamental unit for Slides positioning)
- 1 inch = 914,400 EMU | 1 cm = 360,000 EMU | 1 point = 12,700 EMU
- Standard slide: 9,144,000 x 5,143,500 EMU (10" x 5.625")
- Origin: top-left (0,0), X right, Y down

## Slides Layouts

`BLANK`, `TITLE`, `TITLE_AND_BODY`, `SECTION_HEADER`, `TITLE_ONLY`,
`ONE_COLUMN_TEXT`, `MAIN_POINT`, `BIG_NUMBER`, `CAPTION_ONLY`, `TITLE_AND_TWO_COLUMNS`

## Slides Shape Types (common)

`TEXT_BOX`, `RECTANGLE`, `ROUND_RECTANGLE`, `ELLIPSE`, `DIAMOND`, `TRIANGLE`,
`RIGHT_ARROW`, `LEFT_ARROW`, `UP_ARROW`, `DOWN_ARROW`, `STAR_4`-`STAR_32`,
`CLOUD`, `HEART`, `HEXAGON`, `OCTAGON`, `PENTAGON`

## Docs Named Styles

`TITLE`, `SUBTITLE`, `HEADING_1` through `HEADING_6`, `NORMAL_TEXT`

## Docs Bullet Presets

- Bullet: `BULLET_DISC_CIRCLE_SQUARE`, `BULLET_DIAMONDX_ARROW3D_SQUARE`, `BULLET_CHECKBOX`, etc.
- Numbered: `NUMBERED_DECIMAL_ALPHA_ROMAN`, `NUMBERED_DECIMAL_NESTED`, etc.

## Sheets Chart Types

`BAR`, `LINE`, `AREA`, `COLUMN`, `SCATTER`, `COMBO`, `STEPPED_AREA`,
`PIE` (pieChart), `BUBBLE` (bubbleChart), `HISTOGRAM`, `WATERFALL`, `TREEMAP`, `SCORECARD`

## Sheets Number Formats

`TEXT`, `NUMBER`, `PERCENT`, `CURRENCY`, `DATE`, `TIME`, `DATE_TIME`, `SCIENTIFIC`

## Sheets Border Styles

`SOLID`, `DASHED`, `DOTTED`, `DOUBLE`

## Drive Export MIME Types

| Source | Format | MIME Type                                                                   |
| ------ | ------ | --------------------------------------------------------------------------- |
| Slides | PDF    | `application/pdf`                                                           |
| Slides | PPTX   | `application/vnd.openxmlformats-officedocument.presentationml.presentation` |
| Docs   | PDF    | `application/pdf`                                                           |
| Docs   | DOCX   | `application/vnd.openxmlformats-officedocument.wordprocessingml.document`   |
| Docs   | HTML   | `text/html`                                                                 |
| Sheets | XLSX   | `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`         |
| Sheets | CSV    | `text/csv`                                                                  |

## API Limitations

- **Slides**: No native charts (must use Sheets-linked or image). No video embed via API.
- **Docs**: No TOC creation (read/delete only). No floating images. No horizontal rules (use borderBottom).
- **Sheets**: Charts are overlay-positioned (anchored to a cell, not freely placed).
- **Drive**: Export file size limit ~10MB. Upload supports resumable for files >5MB.
- **Images**: Must be public URL, <50MB, PNG/JPEG/GIF only.
