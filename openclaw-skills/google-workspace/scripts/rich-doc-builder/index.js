#!/usr/bin/env node
"use strict";
/**
 * Rich Document Builder — generates .docx files using docx-js (npm: docx).
 *
 * Reads a JSON spec from --spec file and writes .docx to --output path.
 * Called by the Python google_workspace.py `docs build-rich` command.
 *
 * Follows Claude Desktop docx creation patterns:
 *   - US Letter page size (12240 x 15840 DXA)
 *   - Arial default font
 *   - Proper numbering config for bullets (never unicode bullets)
 *   - WidthType.DXA for all tables (never PERCENTAGE)
 *   - ShadingType.CLEAR (never SOLID)
 *   - Cell margins on every cell
 *   - PageBreak always inside a Paragraph
 */

const fs = require("fs");
const path = require("path");
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  ImageRun, Header, Footer, AlignmentType, LevelFormat,
  HeadingLevel, BorderStyle, WidthType, ShadingType,
  VerticalAlign, PageBreak,
} = require("docx");

// ── Page geometry (US Letter, 0.8" L/R margins, 0.7" T/B) ──────────
const PAGE_WIDTH  = 12240;  // DXA
const PAGE_HEIGHT = 15840;  // DXA
const MARGIN_LR   = 1152;   // 0.8 in = 1152 DXA
const MARGIN_TB   = 1008;   // 0.7 in = 1008 DXA
const CONTENT_WIDTH = PAGE_WIDTH - 2 * MARGIN_LR; // 9936 DXA

const CELL_MARGINS = { top: 80, bottom: 80, left: 120, right: 120 };

// ── Helpers ─────────────────────────────────────────────────────────
function clean(hex) {
  const val = (hex || "000000").replace("#", "");
  // Validate hex: must be exactly 6 hex chars. Invalid values fall back to black.
  if (!/^[0-9A-Fa-f]{6}$/.test(val)) {
    process.stderr.write(`WARNING: Invalid hex color '${hex}', using 000000.\n`);
    return "000000";
  }
  return val;
}

function noBorders() {
  return {
    top:    { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
    bottom: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
    left:   { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
    right:  { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
  };
}

function thinBorders(color) {
  color = color || "DADCE0";
  return {
    top:    { style: BorderStyle.SINGLE, size: 1, color },
    bottom: { style: BorderStyle.SINGLE, size: 1, color },
    left:   { style: BorderStyle.SINGLE, size: 1, color },
    right:  { style: BorderStyle.SINGLE, size: 1, color },
  };
}

/** Count bullet and numbered list elements in the spec (for numbering config). */
function scanLists(spec) {
  let bullets = 0, numbered = 0;
  for (const section of (spec.sections || [])) {
    for (const child of (section.children || [])) {
      if (child.type === "bullets") bullets++;
      if (child.type === "numberedList") numbered++;
    }
  }
  return { bullets, numbered };
}

// ── Element Renderers ───────────────────────────────────────────────
// Each returns a Paragraph, Table, or an Array of these.

function renderHeading(elem, theme) {
  const level = Math.max(1, Math.min(6, elem.level || 1));
  const levels = [
    HeadingLevel.HEADING_1, HeadingLevel.HEADING_2, HeadingLevel.HEADING_3,
    HeadingLevel.HEADING_4, HeadingLevel.HEADING_5, HeadingLevel.HEADING_6,
  ];
  const sizes = [48, 36, 28, 24, 22, 20]; // half-points (24pt … 10pt)
  return new Paragraph({
    heading: levels[level - 1],
    spacing: { before: 240, after: 80 },
    children: [new TextRun({
      text: elem.text || "",
      bold: true,
      size: sizes[level - 1],
      color: clean(elem.color || theme.dark),
      font: "Arial",
    })],
  });
}

function renderSubtitle(elem, theme) {
  return new Paragraph({
    spacing: { before: 0, after: 160 },
    children: [new TextRun({
      text: elem.text || "",
      size: 28, // 14pt
      color: clean(elem.color || theme.medGray),
      font: "Arial",
    })],
  });
}

function renderParagraph(elem, theme) {
  let runs = elem.runs || [];
  if (typeof runs === "string") runs = [{ text: runs }];
  if (!runs.length && elem.text) runs = [{ text: elem.text }];

  return new Paragraph({
    spacing: { before: 40, after: 80 },
    children: runs.map(r => {
      if (typeof r === "string") {
        return new TextRun({ text: r, font: "Arial", size: 22 });
      }
      return new TextRun({
        text: r.text || "",
        bold: r.bold || false,
        italics: r.italic || false,
        color: r.color ? clean(r.color) : undefined,
        size: r.size ? r.size * 2 : 22, // pt → half-points
        font: r.font || "Arial",
      });
    }),
  });
}

function renderAccentBar(elem, theme) {
  // Per Claude Desktop guide: NEVER use tables as dividers — use Paragraph border
  const color = clean(elem.color || theme.accent);
  return new Paragraph({
    spacing: { before: 120, after: 80 },
    border: {
      bottom: { style: BorderStyle.SINGLE, size: 18, color },
    },
    children: [],
  });
}

function renderDivider(elem, theme) {
  return new Paragraph({
    spacing: { before: 80, after: 80 },
    border: {
      bottom: { style: BorderStyle.SINGLE, size: 6, color: clean(theme.lightBg || "E0E0E0") },
    },
    children: [],
  });
}

function renderKpiRow(elem, theme) {
  const items = elem.items || [];
  if (!items.length) {
    process.stderr.write("WARNING: kpiRow with empty items, skipping.\n");
    return null;
  }
  const n = items.length;
  const cellWidth = Math.floor(CONTENT_WIDTH / n);
  const columnWidths = Array(n).fill(cellWidth);

  const valueRow = new TableRow({
    children: items.map(item => {
      const bg = clean(item.bg || theme.accent2);
      const textColor = clean(item.textColor || "FFFFFF");
      return new TableCell({
        width: { size: cellWidth, type: WidthType.DXA },
        shading: { type: ShadingType.CLEAR, fill: bg },
        margins: CELL_MARGINS,
        verticalAlign: VerticalAlign.CENTER,
        borders: noBorders(),
        children: [new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({
            text: item.value || "",
            bold: true,
            size: 44, // 22pt
            color: textColor,
            font: "Arial",
          })],
        })],
      });
    }),
  });

  const labelRow = new TableRow({
    children: items.map(item => {
      const bg = clean(item.bg || theme.accent2);
      const textColor = clean(item.textColor || "FFFFFF");
      return new TableCell({
        width: { size: cellWidth, type: WidthType.DXA },
        shading: { type: ShadingType.CLEAR, fill: bg },
        margins: CELL_MARGINS,
        verticalAlign: VerticalAlign.CENTER,
        borders: noBorders(),
        children: [new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({
            text: item.label || "",
            size: 20, // 10pt
            color: textColor,
            font: "Arial",
          })],
        })],
      });
    }),
  });

  return [
    new Table({
      width: { size: CONTENT_WIDTH, type: WidthType.DXA },
      columnWidths,
      rows: [valueRow, labelRow],
    }),
    new Paragraph({ spacing: { before: 0, after: 120 }, children: [] }),
  ];
}

function renderCallout(elem, theme) {
  const bg = clean(elem.bg || theme.lightBg);
  const borderColor = clean(elem.borderColor || bg);
  const title = elem.title || "";
  const body = elem.body || "";

  const cellChildren = [];
  if (title) {
    cellChildren.push(new Paragraph({
      spacing: { before: 80, after: 40 },
      children: [new TextRun({ text: title, bold: true, size: 22, font: "Arial" })],
    }));
  }
  if (body) {
    cellChildren.push(new Paragraph({
      spacing: { before: 0, after: 80 },
      children: [new TextRun({ text: body, size: 20, font: "Arial" })],
    }));
  }
  if (!cellChildren.length) {
    cellChildren.push(new Paragraph({ children: [] }));
  }

  return [
    new Table({
      width: { size: CONTENT_WIDTH, type: WidthType.DXA },
      columnWidths: [CONTENT_WIDTH],
      rows: [new TableRow({
        children: [new TableCell({
          width: { size: CONTENT_WIDTH, type: WidthType.DXA },
          shading: { type: ShadingType.CLEAR, fill: bg },
          margins: { top: 120, bottom: 120, left: 200, right: 200 },
          borders: {
            top:    { style: BorderStyle.SINGLE, size: 2, color: borderColor },
            bottom: { style: BorderStyle.SINGLE, size: 2, color: borderColor },
            left:   { style: BorderStyle.SINGLE, size: 6, color: borderColor },
            right:  { style: BorderStyle.SINGLE, size: 2, color: borderColor },
          },
          children: cellChildren,
        })],
      })],
    }),
    new Paragraph({ spacing: { before: 0, after: 120 }, children: [] }),
  ];
}

function renderTable(elem, theme) {
  const headers = elem.headers || [];
  const rows = elem.rows || [];
  const style = elem.style || {};
  const headerBg    = clean(style.headerBg || theme.dark);
  const headerText  = clean(style.headerTextColor || "FFFFFF");
  const zebra       = style.zebra || false;
  const zebraColor  = clean(style.zebraColor || "F8F9FA");
  const fontSize    = (style.fontSize || 10) * 2; // half-points

  const totalCols = headers.length || (rows[0] || []).length || 1;
  const colWidth = Math.floor(CONTENT_WIDTH / totalCols);
  const columnWidths = Array(totalCols).fill(colWidth);

  const tableRows = [];

  if (headers.length) {
    tableRows.push(new TableRow({
      children: headers.map((h, ci) => new TableCell({
        width: { size: columnWidths[ci], type: WidthType.DXA },
        shading: { type: ShadingType.CLEAR, fill: headerBg },
        margins: CELL_MARGINS,
        borders: thinBorders(headerBg),
        children: [new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({
            text: String(h), bold: true, size: fontSize, color: headerText, font: "Arial",
          })],
        })],
      })),
    }));
  }

  for (let ri = 0; ri < rows.length; ri++) {
    const row = rows[ri];
    tableRows.push(new TableRow({
      children: row.slice(0, totalCols).map((val, ci) => {
        const cellShading = (zebra && ri % 2 === 1)
          ? { type: ShadingType.CLEAR, fill: zebraColor }
          : undefined;
        return new TableCell({
          width: { size: columnWidths[ci], type: WidthType.DXA },
          shading: cellShading,
          margins: CELL_MARGINS,
          borders: thinBorders(),
          children: [new Paragraph({
            children: [new TextRun({ text: String(val), size: fontSize, font: "Arial" })],
          })],
        });
      }),
    }));
  }

  return [
    new Table({
      width: { size: CONTENT_WIDTH, type: WidthType.DXA },
      columnWidths,
      rows: tableRows,
    }),
    new Paragraph({ spacing: { before: 0, after: 120 }, children: [] }),
  ];
}

function renderRichTable(elem, theme) {
  const headers = elem.headers || [];
  const rows = elem.rows || [];
  const style = elem.style || {};
  const specWidths = elem.colWidths || [];
  const headerBg   = clean(style.headerBg || theme.dark);
  const headerText = clean(style.headerTextColor || "FFFFFF");
  const fontSize   = (style.fontSize || 10) * 2;

  const totalCols = headers.length || (rows[0] || []).length || 1;

  // Column widths: scale provided spec widths to fit CONTENT_WIDTH, or distribute evenly
  let columnWidths;
  if (specWidths.length === totalCols) {
    const totalSpec = specWidths.reduce((a, b) => a + b, 0);
    columnWidths = specWidths.map(w => Math.floor((w / totalSpec) * CONTENT_WIDTH));
  } else {
    columnWidths = Array(totalCols).fill(Math.floor(CONTENT_WIDTH / totalCols));
  }

  const tableRows = [];

  if (headers.length) {
    tableRows.push(new TableRow({
      children: headers.map((h, ci) => new TableCell({
        width: { size: columnWidths[ci], type: WidthType.DXA },
        shading: { type: ShadingType.CLEAR, fill: headerBg },
        margins: CELL_MARGINS,
        borders: thinBorders(headerBg),
        children: [new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({
            text: String(h), bold: true, size: fontSize, color: headerText, font: "Arial",
          })],
        })],
      })),
    }));
  }

  for (const row of rows) {
    tableRows.push(new TableRow({
      children: row.slice(0, totalCols).map((val, ci) => {
        let cellContent, cellShading, cellAlign;
        if (typeof val === "object" && val !== null) {
          cellContent = new TextRun({
            text: String(val.text || ""),
            bold: val.bold || false,
            italics: val.italic || false,
            color: val.color ? clean(val.color) : undefined,
            size: val.size ? val.size * 2 : fontSize,
            font: "Arial",
          });
          if (val.bg) cellShading = { type: ShadingType.CLEAR, fill: clean(val.bg) };
          if (val.align === "center") cellAlign = AlignmentType.CENTER;
        } else {
          cellContent = new TextRun({ text: String(val), size: fontSize, font: "Arial" });
        }
        return new TableCell({
          width: { size: columnWidths[ci], type: WidthType.DXA },
          shading: cellShading,
          margins: CELL_MARGINS,
          borders: thinBorders(),
          children: [new Paragraph({ alignment: cellAlign, children: [cellContent] })],
        });
      }),
    }));
  }

  return [
    new Table({
      width: { size: CONTENT_WIDTH, type: WidthType.DXA },
      columnWidths,
      rows: tableRows,
    }),
    new Paragraph({ spacing: { before: 0, after: 120 }, children: [] }),
  ];
}

function renderBullets(elem, _theme, ctx) {
  // Per Claude Desktop guide: NEVER use unicode bullets — use LevelFormat.BULLET
  const items = elem.items || [];
  const ref = `bullets_${ctx.bulletIndex++}`;
  return items.map(item => new Paragraph({
    numbering: { reference: ref, level: 0 },
    spacing: { before: 20, after: 20 },
    children: [new TextRun({ text: String(item), size: 22, font: "Arial" })],
  }));
}

function renderNumberedList(elem, _theme, ctx) {
  const items = elem.items || [];
  const ref = `numbered_${ctx.numberedIndex++}`;
  return items.map(item => new Paragraph({
    numbering: { reference: ref, level: 0 },
    spacing: { before: 20, after: 20 },
    children: [new TextRun({ text: String(item), size: 22, font: "Arial" })],
  }));
}

function renderPersonaCard(elem, theme) {
  const name       = elem.name || "";
  const subtitle   = elem.subtitle || "";
  const color      = clean(elem.color || theme.accent);
  const bg         = clean(elem.bg || theme.lightBg);
  const fields     = elem.fields || {};
  const allocation = elem.allocation || "";

  const cellChildren = [];

  // Name header
  const nameRuns = [new TextRun({ text: name, bold: true, size: 28, color, font: "Arial" })];
  if (allocation) {
    nameRuns.push(new TextRun({ text: `  [${allocation}]`, bold: true, size: 20, color, font: "Arial" }));
  }
  cellChildren.push(new Paragraph({ spacing: { before: 120, after: 40 }, children: nameRuns }));

  // Subtitle
  if (subtitle) {
    cellChildren.push(new Paragraph({
      spacing: { before: 0, after: 80 },
      children: [new TextRun({ text: subtitle, italics: true, size: 20, color: "444444", font: "Arial" })],
    }));
  }

  // Fields
  for (const [key, val] of Object.entries(fields)) {
    cellChildren.push(new Paragraph({
      spacing: { before: 0, after: 40 },
      children: [
        new TextRun({ text: `${key}: `, bold: true, size: 20, font: "Arial" }),
        new TextRun({ text: String(val), size: 20, font: "Arial" }),
      ],
    }));
  }

  return [
    new Table({
      width: { size: CONTENT_WIDTH, type: WidthType.DXA },
      columnWidths: [CONTENT_WIDTH],
      rows: [new TableRow({
        children: [new TableCell({
          width: { size: CONTENT_WIDTH, type: WidthType.DXA },
          shading: { type: ShadingType.CLEAR, fill: bg },
          margins: { top: 120, bottom: 120, left: 200, right: 200 },
          borders: {
            top:    { style: BorderStyle.SINGLE, size: 2, color },
            bottom: { style: BorderStyle.SINGLE, size: 2, color },
            left:   { style: BorderStyle.SINGLE, size: 8, color },
            right:  { style: BorderStyle.SINGLE, size: 2, color },
          },
          children: cellChildren,
        })],
      })],
    }),
    new Paragraph({ spacing: { before: 0, after: 160 }, children: [] }),
  ];
}

function renderConceptHeader(elem, theme) {
  const number   = elem.number;
  const title    = elem.title || "";
  const personas = elem.personas || [];
  const meta     = elem.meta || "";

  const result = [];

  // Title line
  const titleRuns = [];
  if (number !== undefined && number !== "") {
    titleRuns.push(new TextRun({
      text: `#${number}  `, bold: true, size: 32, color: clean(theme.dark), font: "Arial",
    }));
  }
  titleRuns.push(new TextRun({
    text: title, bold: true, size: 28, color: clean(theme.dark), font: "Arial",
  }));
  result.push(new Paragraph({ spacing: { before: 200, after: 40 }, children: titleRuns }));

  // Persona tags
  if (personas.length) {
    const tagRuns = [];
    for (let i = 0; i < personas.length; i++) {
      const pair = Array.isArray(personas[i]) ? personas[i] : [personas[i]];
      const pName  = pair[0] || "";
      const pColor = clean(pair[1] || theme.accent);
      if (i > 0) tagRuns.push(new TextRun({ text: "  ", size: 18, font: "Arial" }));
      tagRuns.push(new TextRun({ text: ` ${pName} `, bold: true, size: 18, color: pColor, font: "Arial" }));
    }
    result.push(new Paragraph({ spacing: { before: 0, after: 40 }, children: tagRuns }));
  }

  // Meta line
  if (meta) {
    result.push(new Paragraph({
      spacing: { before: 0, after: 80 },
      children: [new TextRun({ text: meta, italics: true, size: 20, color: clean(theme.medGray), font: "Arial" })],
    }));
  }

  return result;
}

function renderTag(elem, theme) {
  const text  = elem.text || "";
  const color = clean(elem.color || "FFFFFF");
  const bg    = clean(elem.bg || theme.accent);
  const tagWidth = 2500; // ~1.7 inches in DXA

  return [
    new Table({
      width: { size: tagWidth, type: WidthType.DXA },
      columnWidths: [tagWidth],
      rows: [new TableRow({
        children: [new TableCell({
          width: { size: tagWidth, type: WidthType.DXA },
          shading: { type: ShadingType.CLEAR, fill: bg },
          margins: { top: 40, bottom: 40, left: 80, right: 80 },
          borders: noBorders(),
          children: [new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text, bold: true, size: 18, color, font: "Arial" })],
          })],
        })],
      })],
    }),
    new Paragraph({ spacing: { before: 0, after: 80 }, children: [] }),
  ];
}

function renderPageBreak() {
  // Per Claude Desktop guide: PageBreak MUST always be inside a Paragraph
  return new Paragraph({ children: [new PageBreak()] });
}

function renderSpacer(elem) {
  const pts = elem.height || 12;
  return new Paragraph({ spacing: { before: pts * 20, after: 0 }, children: [] });
}

function renderImage(elem) {
  const imgPath = elem.path || "";
  if (!imgPath) {
    return new Paragraph({
      children: [new TextRun({ text: "[Image: no path provided]", italics: true, color: "CC0000", font: "Arial" })],
    });
  }

  const resolved = path.resolve(imgPath);

  // Security: restrict image paths to media/ and /tmp/ directories
  const tmpDir = require("os").tmpdir();
  const allowedPrefixes = ["/tmp/", tmpDir + "/"];
  // Also allow any path containing /media/ (profile-specific media dirs)
  const isAllowed = allowedPrefixes.some(p => resolved.startsWith(p)) || resolved.includes("/media/");
  if (!isAllowed) {
    process.stderr.write(`WARNING: Image path outside allowed directories (media/, /tmp/): ${imgPath}\n`);
    return new Paragraph({
      children: [new TextRun({ text: "[Image blocked: path outside media/tmp]", italics: true, color: "CC0000", font: "Arial" })],
    });
  }

  if (!fs.existsSync(resolved)) {
    return new Paragraph({
      children: [new TextRun({ text: `[Image not found: ${imgPath}]`, italics: true, color: "CC0000", font: "Arial" })],
    });
  }

  const ext = path.extname(resolved).toLowerCase().replace(".", "");
  const typeMap = { png: "png", jpg: "jpg", jpeg: "jpg", gif: "gif", bmp: "bmp", svg: "svg" };
  const imgType = typeMap[ext] || "png";

  const data = fs.readFileSync(resolved);
  // docx-js ImageRun transformation: width/height at 96 DPI (pixels)
  const widthPx  = Math.round((elem.width  || 5) * 96);
  const heightPx = Math.round((elem.height || 3) * 96);

  // CRITICAL per guide: type parameter is REQUIRED on ImageRun
  return new Paragraph({
    children: [new ImageRun({
      data,
      transformation: { width: widthPx, height: heightPx },
      type: imgType,
      altText: { title: "Image", description: "Document image", name: path.basename(resolved) },
    })],
  });
}

// ── Dispatcher ──────────────────────────────────────────────────────
const RENDERERS = {
  heading:       (e, t, c) => renderHeading(e, t),
  subtitle:      (e, t, c) => renderSubtitle(e, t),
  paragraph:     (e, t, c) => renderParagraph(e, t),
  accentBar:     (e, t, c) => renderAccentBar(e, t),
  divider:       (e, t, c) => renderDivider(e, t),
  kpiRow:        (e, t, c) => renderKpiRow(e, t),
  callout:       (e, t, c) => renderCallout(e, t),
  table:         (e, t, c) => renderTable(e, t),
  richTable:     (e, t, c) => renderRichTable(e, t),
  bullets:       (e, t, c) => renderBullets(e, t, c),
  numberedList:  (e, t, c) => renderNumberedList(e, t, c),
  personaCard:   (e, t, c) => renderPersonaCard(e, t),
  conceptHeader: (e, t, c) => renderConceptHeader(e, t),
  tag:           (e, t, c) => renderTag(e, t),
  pageBreak:     (e, t, c) => renderPageBreak(),
  spacer:        (e, t, c) => renderSpacer(e),
  image:         (e, t, c) => renderImage(e),
};

// ── Build Document ──────────────────────────────────────────────────
function buildDocument(spec) {
  const theme = Object.assign(
    { dark: "1A1A2E", accent: "E94560", accent2: "0F3460", lightBg: "F5F5F5", medGray: "666666" },
    spec.theme || {}
  );
  // Strip any # from theme colors
  for (const k of Object.keys(theme)) {
    if (typeof theme[k] === "string") theme[k] = theme[k].replace("#", "");
  }

  // Pre-scan for list counts to build numbering config
  const { bullets: bulletCount, numbered: numberedCount } = scanLists(spec);
  const numberingConfig = [];
  for (let i = 0; i < bulletCount; i++) {
    numberingConfig.push({
      reference: `bullets_${i}`,
      levels: [{
        level: 0,
        format: LevelFormat.BULLET,
        text: "\u2022",
        alignment: AlignmentType.LEFT,
        style: { paragraph: { indent: { left: 720, hanging: 360 } } },
      }],
    });
  }
  for (let i = 0; i < numberedCount; i++) {
    numberingConfig.push({
      reference: `numbered_${i}`,
      levels: [{
        level: 0,
        format: LevelFormat.DECIMAL,
        text: "%1.",
        alignment: AlignmentType.LEFT,
        style: { paragraph: { indent: { left: 720, hanging: 360 } } },
      }],
    });
  }

  // Render context (tracks list numbering references)
  const ctx = { bulletIndex: 0, numberedIndex: 0 };

  // Render all sections
  const allChildren = [];
  const sections = spec.sections || [];
  for (let si = 0; si < sections.length; si++) {
    // Page break between sections (except first)
    if (si > 0 && sections[si].pageBreak !== false) {
      allChildren.push(new Paragraph({ children: [new PageBreak()] }));
    }
    for (const child of (sections[si].children || [])) {
      const elemType = child.type || "";
      const renderer = RENDERERS[elemType];
      if (!renderer) {
        process.stderr.write(`WARNING: Unknown element type '${elemType}', skipping.\n`);
        continue;
      }
      const result = renderer(child, theme, ctx);
      if (result === null || result === undefined) continue;
      if (Array.isArray(result)) {
        allChildren.push(...result);
      } else {
        allChildren.push(result);
      }
    }
  }

  // Header / footer
  const headerChildren = [];
  const footerChildren = [];
  if (spec.header) {
    headerChildren.push(new Paragraph({
      alignment: AlignmentType.RIGHT,
      children: [new TextRun({ text: spec.header, size: 16, color: clean(theme.medGray), font: "Arial" })],
    }));
  }
  if (spec.footer) {
    footerChildren.push(new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: spec.footer, size: 16, color: clean(theme.medGray), font: "Arial" })],
    }));
  }

  // Style overrides — per Claude Desktop guide: Arial default, exact built-in heading IDs
  const doc = new Document({
    styles: {
      default: {
        document: {
          run: { font: "Arial", size: 22, color: "2A2A2A" }, // 11pt
        },
      },
      paragraphStyles: [
        {
          id: "Heading1", name: "heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
          run: { font: "Arial", size: 48, bold: true, color: "000000" },
          paragraph: { spacing: { before: 240, after: 80 } },
        },
        {
          id: "Heading2", name: "heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
          run: { font: "Arial", size: 36, bold: true, color: "000000" },
          paragraph: { spacing: { before: 200, after: 80 } },
        },
        {
          id: "Heading3", name: "heading 3", basedOn: "Normal", next: "Normal", quickFormat: true,
          run: { font: "Arial", size: 28, bold: true, color: "000000" },
          paragraph: { spacing: { before: 160, after: 60 } },
        },
        {
          id: "Heading4", name: "heading 4", basedOn: "Normal", next: "Normal", quickFormat: true,
          run: { font: "Arial", size: 24, bold: true, color: "000000" },
          paragraph: { spacing: { before: 120, after: 40 } },
        },
        {
          id: "Heading5", name: "heading 5", basedOn: "Normal", next: "Normal", quickFormat: true,
          run: { font: "Arial", size: 22, bold: true, color: "000000" },
          paragraph: { spacing: { before: 100, after: 40 } },
        },
        {
          id: "Heading6", name: "heading 6", basedOn: "Normal", next: "Normal", quickFormat: true,
          run: { font: "Arial", size: 20, bold: true, color: "000000" },
          paragraph: { spacing: { before: 80, after: 40 } },
        },
      ],
    },
    numbering: { config: numberingConfig },
    sections: [{
      properties: {
        page: {
          size: { width: PAGE_WIDTH, height: PAGE_HEIGHT },
          margin: { top: MARGIN_TB, bottom: MARGIN_TB, left: MARGIN_LR, right: MARGIN_LR },
        },
      },
      headers: headerChildren.length
        ? { default: new Header({ children: headerChildren }) }
        : undefined,
      footers: footerChildren.length
        ? { default: new Footer({ children: footerChildren }) }
        : undefined,
      children: allChildren,
    }],
  });

  return doc;
}

// ── CLI Entry Point ─────────────────────────────────────────────────
function parseArgs() {
  const args = { spec: null, output: null };
  const argv = process.argv.slice(2);
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--spec" && argv[i + 1])   { args.spec = argv[++i]; continue; }
    if (argv[i] === "--output" && argv[i + 1]) { args.output = argv[++i]; continue; }
  }
  if (!args.spec) {
    process.stderr.write("ERROR: --spec <path> is required\n");
    process.exit(1);
  }
  if (!args.output) {
    process.stderr.write("ERROR: --output <path> is required\n");
    process.exit(1);
  }
  return args;
}

async function main() {
  const args = parseArgs();

  let specText;
  try {
    specText = fs.readFileSync(args.spec, "utf-8");
  } catch (e) {
    process.stderr.write(`ERROR: Cannot read spec file: ${e.message}\n`);
    process.exit(1);
  }

  let spec;
  try {
    spec = JSON.parse(specText);
  } catch (e) {
    process.stderr.write(`ERROR: Invalid JSON: ${e.message}\n`);
    process.exit(1);
  }

  const doc = buildDocument(spec);
  const buffer = await Packer.toBuffer(doc);
  fs.writeFileSync(args.output, buffer);
  process.stdout.write("OK\n");
}

main().catch(err => {
  process.stderr.write(`ERROR: ${err.message}\n${err.stack}\n`);
  process.exit(1);
});
