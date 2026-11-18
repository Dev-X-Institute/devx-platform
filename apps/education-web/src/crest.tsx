import { crestShapes, crestSize, type CrestShape } from "./crest";

// Renders the shared crest geometry (crest.ts) as inline SVG. The monogram shape
// is the text shape whose geometry ships an empty value; it is filled with the
// `label` prop (the school monogram) so the same geometry serves any school.
export function Crest({ label, size = crestSize, className }: { label: string; size?: number; className?: string }) {
  return (
    <svg viewBox={`0 0 ${crestSize} ${crestSize}`} width={size} height={size} role="img" aria-label="School crest" className={className}>
      {crestShapes.map((shape: CrestShape, index: number) => {
        if (shape.kind === "circle") {
          return <circle key={index} cx={shape.cx} cy={shape.cy} r={shape.r} fill={shape.fill ?? "none"} stroke={shape.stroke} strokeWidth={shape.strokeWidth} />;
        }
        if (shape.kind === "rect") {
          return <rect key={index} x={shape.x} y={shape.y} width={shape.width} height={shape.height} rx={shape.rx} fill={shape.fill} stroke={shape.stroke} strokeWidth={shape.strokeWidth} />;
        }
        return <text key={index} x={shape.x} y={shape.y} fontSize={shape.size} fill={shape.fill} fontWeight={shape.bold ? 700 : undefined} textAnchor={shape.center ? "middle" : undefined}>{shape.value === "" ? label : shape.value}</text>;
      })}
    </svg>
  );
}
