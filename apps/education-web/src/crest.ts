// School crest geometry, shared between the on-screen React component (SchoolCrest.tsx)
// and the pdf-lib renderer (Task 3). This module is deliberately plain data with
// no React, DOM or canvas dependency: every renderer walks `crestShapes` itself.
//
// The 96x96 box uses a top-left origin with y growing downward, the same
// convention SVG and pdf-lib both understand.

export type CrestShape =
  | { kind: "circle"; cx: number; cy: number; r: number; fill?: string; stroke?: string; strokeWidth?: number }
  | { kind: "rect"; x: number; y: number; width: number; height: number; rx?: number; fill?: string; stroke?: string; strokeWidth?: number }
  | { kind: "text"; value: string; x: number; y: number; size: number; fill: string; bold?: boolean; center?: boolean };

export const crestSize = 96;

// Palette: ring/ink, field, ribbon and ribbon text.
const ink = "#0b7053";
const field = "#e2f1ea";
const ribbonText = "#ffffff";

// Paint order matters: ring, field, monogram, ribbon, motto.
// The monogram carries an empty `value`; renderers replace it with the caller's
// label (the school monogram) at draw time so the geometry stays reusable.
export const crestShapes: CrestShape[] = [
  { kind: "circle", cx: 48, cy: 46, r: 44, stroke: ink, strokeWidth: 4 },
  { kind: "circle", cx: 48, cy: 46, r: 40, fill: field },
  { kind: "text", value: "", x: 48, y: 54, size: 24, fill: ink, bold: true, center: true },
  { kind: "rect", x: 14, y: 66, width: 68, height: 18, rx: 9, fill: ink },
  { kind: "text", value: "EST. 2026", x: 48, y: 78, size: 8, fill: ribbonText, center: true },
];
