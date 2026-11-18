// Vector report card renderer. The on-screen report (screens/School.tsx) and this
// PDF share one data model (report.ts) and one crest geometry (crest.ts); this file
// only turns them into pdf-lib drawing calls, so the download is a real vector
// document with a selectable, reproducible layout instead of a hand-written text blob.

import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { crestShapes, crestSize } from "./crest";
import type { ReportModel } from "./report";

const A4 = { width: 595.28, height: 841.89 };
const MARGIN = 48;
const CONTENT_WIDTH = A4.width - MARGIN * 2;

const brand = rgb(0.043, 0.439, 0.325);
const tint = rgb(0.93, 0.96, 0.95);
const ink = rgb(0.13, 0.16, 0.15);
const muted = rgb(0.42, 0.47, 0.45);
const border = rgb(0.82, 0.85, 0.83);
const white = rgb(1, 1, 1);

// WinAnsi punctuation that pdf-lib's standard fonts can encode but that sits
// outside the plain Latin-1 range. Anything else is replaced so drawText never
// throws on a school or student name typed with an unsupported glyph.
const WIN_ANSI_EXTRAS =
  "\u2018\u2019\u201C\u201D\u2013\u2014\u2022\u2026\u20AC\u2122\u0152\u0153\u0160\u0161\u0178\u017D\u017E\u0192\u02C6\u02DC\u2030\u2039\u203A\u2020\u2021";
const safeText = (text: string) => text.replace(/[^\u0020-\u007E\u00A0-\u00FF]/g, char => (WIN_ANSI_EXTRAS.includes(char) ? char : "?"));

const hexColor = (hex: string) => {
  const value = Number.parseInt(hex.replace("#", ""), 16);
  return rgb(((value >> 16) & 255) / 255, ((value >> 8) & 255) / 255, (value & 255) / 255);
};

// Crest geometry is authored top-left origin with y growing downward; PDF pages use
// a bottom-left origin with y growing upward.
const toY = (boxBottom: number, y: number, scale: number) => boxBottom + (crestSize - y) * scale;

function fitText(font: PDFFont, text: string, size: number, maxWidth: number): string {
  const safe = safeText(text);
  if (font.widthOfTextAtSize(safe, size) <= maxWidth) return safe;
  let end = safe.length;
  while (end > 1 && font.widthOfTextAtSize(`${safe.slice(0, end)}...`, size) > maxWidth) end -= 1;
  return `${safe.slice(0, end)}...`;
}

interface Fonts {
  regular: PDFFont;
  bold: PDFFont;
}

interface CrestPlacement {
  boxLeft: number;
  boxBottom: number;
  size: number;
  opacity?: number;
  label?: string;
}

function drawCrest(page: PDFPage, fonts: Fonts, placement: CrestPlacement) {
  const scale = placement.size / crestSize;
  const opacity = placement.opacity ?? 1;
  const label = safeText(placement.label ?? "");
  for (const shape of crestShapes) {
    if (shape.kind === "circle") {
      page.drawCircle({
        x: placement.boxLeft + shape.cx * scale,
        y: toY(placement.boxBottom, shape.cy, scale),
        size: shape.r * scale,
        color: shape.fill ? hexColor(shape.fill) : undefined,
        borderColor: shape.stroke ? hexColor(shape.stroke) : undefined,
        borderWidth: shape.strokeWidth ? shape.strokeWidth * scale : undefined,
        opacity,
        borderOpacity: opacity,
      });
    } else if (shape.kind === "rect") {
      page.drawRectangle({
        x: placement.boxLeft + shape.x * scale,
        y: toY(placement.boxBottom, shape.y + shape.height, scale),
        width: shape.width * scale,
        height: shape.height * scale,
        color: shape.fill ? hexColor(shape.fill) : undefined,
        borderColor: shape.stroke ? hexColor(shape.stroke) : undefined,
        borderWidth: shape.strokeWidth ? shape.strokeWidth * scale : undefined,
        opacity,
        borderOpacity: opacity,
      });
    } else {
      const text = shape.value === "" ? label : safeText(shape.value);
      if (!text) continue;
      const size = shape.size * scale;
      const font = shape.bold ? fonts.bold : fonts.regular;
      const width = font.widthOfTextAtSize(text, size);
      page.drawText(text, {
        x: placement.boxLeft + shape.x * scale - (shape.center ? width / 2 : 0),
        y: toY(placement.boxBottom, shape.y, scale),
        size,
        font,
        color: hexColor(shape.fill),
        opacity,
      });
    }
  }
}

interface Column {
  label: string;
  width: number;
  align: "left" | "right" | "center";
}

export async function renderReportPdf(model: ReportModel): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([A4.width, A4.height]);
  const fonts: Fonts = {
    regular: await doc.embedFont(StandardFonts.Helvetica),
    bold: await doc.embedFont(StandardFonts.HelveticaBold),
  };

  const top = A4.height - MARGIN;

  // Watermark: a faint 3 x 5 crest grid, drawn first so all content sits on top.
  for (let column = 0; column < 3; column += 1) {
    for (let row = 0; row < 5; row += 1) {
      drawCrest(page, fonts, { boxLeft: 55 + column * 180, boxBottom: 30 + row * 162, size: 150, opacity: 0.05, label: model.monogram });
    }
  }

  // Header: crest, school name and report title.
  const headerSize = 64;
  drawCrest(page, fonts, { boxLeft: MARGIN, boxBottom: top - headerSize, size: headerSize, label: model.monogram });
  const headerTextLeft = MARGIN + headerSize + 18;
  const headerTextWidth = CONTENT_WIDTH - headerSize - 18;
  page.drawText(fitText(fonts.bold, model.schoolName, 20, headerTextWidth), { x: headerTextLeft, y: top - 22, size: 20, font: fonts.bold, color: ink });
  page.drawText("Terminal Report", { x: headerTextLeft, y: top - 42, size: 12, font: fonts.regular, color: muted });
  page.drawText(fitText(fonts.regular, `${model.term} \u00B7 ${model.year}`, 11, headerTextWidth), { x: headerTextLeft, y: top - 58, size: 11, font: fonts.regular, color: muted });

  const ruleY = top - headerSize - 16;
  page.drawRectangle({ x: MARGIN, y: ruleY, width: CONTENT_WIDTH, height: 2, color: brand });

  // Meta: two rows of label/value pairs.
  const metaTop = ruleY - 26;
  const meta: [string, string][] = [
    ["Student", `${model.student} (sample)`],
    ["Class", model.className],
    ["Position", model.position],
    ["Attendance", model.attendance],
  ];
  meta.forEach(([label, value], index) => {
    const x = MARGIN + (index % 2) * 250;
    const y = metaTop - Math.floor(index / 2) * 20;
    const labelText = `${label}:`;
    page.drawText(labelText, { x, y, size: 10, font: fonts.regular, color: muted });
    const offset = fonts.regular.widthOfTextAtSize(labelText, 10) + 6;
    page.drawText(fitText(fonts.bold, value, 11, 240 - offset), { x: x + offset, y, size: 11, font: fonts.bold, color: ink });
  });

  // Table: brand-green header, zebra rows, numeric columns right-aligned.
  const columns: Column[] = [
    { label: "Subject", width: 150, align: "left" },
    { label: "Class score", width: 70, align: "right" },
    { label: "Exam", width: 60, align: "right" },
    { label: "Total", width: 60, align: "right" },
    { label: "Grade", width: 55, align: "center" },
    { label: "Remark", width: CONTENT_WIDTH - 395, align: "left" },
  ];
  const leftEdges: number[] = [];
  let cursor = MARGIN;
  for (const column of columns) {
    leftEdges.push(cursor);
    cursor += column.width;
  }
  const cellX = (index: number, textWidth: number) => {
    const column = columns[index]!;
    const edge = leftEdges[index]!;
    if (column.align === "left") return edge + 8;
    if (column.align === "right") return edge + column.width - 8 - textWidth;
    return edge + (column.width - textWidth) / 2;
  };

  const tableTop = metaTop - 48;
  const headerHeight = 24;
  const rowHeight = 25;
  page.drawRectangle({ x: MARGIN, y: tableTop - headerHeight, width: CONTENT_WIDTH, height: headerHeight, color: brand });
  columns.forEach((column, index) => {
    const width = fonts.bold.widthOfTextAtSize(column.label, 9);
    page.drawText(column.label, { x: cellX(index, width), y: tableTop - headerHeight + 8, size: 9, font: fonts.bold, color: white });
  });

  model.rows.forEach((row, rowIndex) => {
    const rowBottom = tableTop - headerHeight - (rowIndex + 1) * rowHeight;
    if (rowIndex % 2 === 1) page.drawRectangle({ x: MARGIN, y: rowBottom, width: CONTENT_WIDTH, height: rowHeight, color: tint });
    const cells = [row.subject, String(row.classScore), String(row.exam), String(row.total), row.grade, row.remark];
    columns.forEach((column, index) => {
      const text = fitText(fonts.regular, cells[index]!, 10, column.width - 16);
      const width = fonts.regular.widthOfTextAtSize(text, 10);
      page.drawText(text, { x: cellX(index, width), y: rowBottom + 8, size: 10, font: fonts.regular, color: ink });
    });
  });
  const tableBottom = tableTop - headerHeight - model.rows.length * rowHeight;

  // Remarks: two bordered boxes, wrapped to the box width.
  const remarkTop = tableBottom - 32;
  const remarkWidth = (CONTENT_WIDTH - 16) / 2;
  const remarkHeight = 84;
  const remarks: [string, string][] = [["Class teacher's remark", model.teacherRemark], ["Head's remark", model.headRemark]];
  remarks.forEach(([label, body], index) => {
    const x = MARGIN + index * (remarkWidth + 16);
    page.drawRectangle({ x, y: remarkTop - remarkHeight, width: remarkWidth, height: remarkHeight, borderColor: border, borderWidth: 1 });
    page.drawText(label, { x: x + 12, y: remarkTop - 20, size: 9, font: fonts.regular, color: muted });
    page.drawText(safeText(body), { x: x + 12, y: remarkTop - 40, size: 10, font: fonts.regular, color: ink, maxWidth: remarkWidth - 24, lineHeight: 14 });
  });

  page.drawText(fitText(fonts.regular, `Generated ${model.generatedOn} \u00B7 Sample data`, 9, CONTENT_WIDTH), { x: MARGIN, y: MARGIN, size: 9, font: fonts.regular, color: muted });

  // Object streams compress the font names and page objects away from the file
  // surface. Saving them uncompressed keeps the report inspectable (a school or
  // auditor can read the structure) and compatible with older PDF readers, at a
  // few kilobytes of cost on a single page.
  return await doc.save({ useObjectStreams: false });
}
