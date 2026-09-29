import type { Lang } from "@/i18n";
import { ui } from "@/i18n/ui";
import {
  basePolygon,
  cores,
  DRAWING_ROT_Y,
  EDGE_NE,
  EDGE_SE,
  EDGE_W,
  perimeterColumns,
  polygonArea,
  stageForFloor,
  stages,
  struts,
  type Pt,
} from "./geometry";

/**
 * Schematic floor plan drawn from the measured geometry: footprint, cores, perimeter
 * columns, and the facade that steps out at this stage. North is up.
 */
export function FloorPlanSvg({ floor, size = 220, lang }: { floor: number; size?: number; lang: Lang }) {
  const t = ui[lang].viewer;
  const stage = stageForFloor(floor);
  const poly = stage.polygon;
  const area = polygonArea(poly);
  const cols = perimeterColumns(poly);

  // Bounds across all stages so every floor draws at the same scale.
  const all = stages.flatMap((s) => s.polygon);
  const minX = Math.min(...all.map((p) => p[0])) - 3;
  const maxX = Math.max(...all.map((p) => p[0])) + 3;
  const minY = Math.min(...all.map((p) => p[1])) - 3;
  const maxY = Math.max(...all.map((p) => p[1])) + 3;
  const w = maxX - minX;
  const h = maxY - minY;
  const scale = size / Math.max(w, h);
  const W = w * scale;
  const H = h * scale;
  const sx = (x: number) => (x - minX) * scale;
  const sy = (y: number) => (maxY - y) * scale; // north up

  const pts = (p: Pt[]) => p.map(([x, y]) => `${sx(x).toFixed(1)},${sy(y).toFixed(1)}`).join(" ");

  const stageIndex = stages.indexOf(stage);
  const pushedEdge = stageIndex === 2 ? EDGE_NE : stageIndex === 3 ? EDGE_SE : stageIndex === 4 ? EDGE_W : -1;
  const edge = (i: number): [Pt, Pt] => [poly[i], poly[(i + 1) % poly.length]];

  const strutPts = struts()
    .filter((s) => Math.abs(s.to[1] - (stageIndex > 0 ? stages[stageIndex].from : -1)) < 0.01)
    .map((s) => [s.to[0], s.to[2]] as Pt);

  const rotDeg = (-DRAWING_ROT_Y * 180) / Math.PI;
  const dims = {
    w: Math.max(...poly.map((p) => p[0])) - Math.min(...poly.map((p) => p[0])),
    h: Math.max(...poly.map((p) => p[1])) - Math.min(...poly.map((p) => p[1])),
  };

  return (
    <svg viewBox={`0 0 ${W} ${H + 18}`} width={W} height={H + 18} className="block" role="img" aria-label={t.planAria(floor)}>
      <polygon points={pts(basePolygon)} fill="none" stroke="var(--muted)" strokeOpacity={0.35} strokeDasharray="3 3" strokeWidth={1} />
      <polygon points={pts(poly)} fill="var(--accent)" fillOpacity={0.12} stroke="var(--paper)" strokeWidth={1.4} strokeLinejoin="round" />
      {pushedEdge >= 0 && (
        <line
          x1={sx(edge(pushedEdge)[0][0])}
          y1={sy(edge(pushedEdge)[0][1])}
          x2={sx(edge(pushedEdge)[1][0])}
          y2={sy(edge(pushedEdge)[1][1])}
          stroke="var(--accent)"
          strokeWidth={3}
          strokeLinecap="round"
        />
      )}
      {cores.map((c) => (
        <rect
          key={c.name}
          x={sx(c.center[0]) - (c.size[0] * scale) / 2}
          y={sy(c.center[1]) - (c.size[1] * scale) / 2}
          width={c.size[0] * scale}
          height={c.size[1] * scale}
          transform={`rotate(${rotDeg} ${sx(c.center[0])} ${sy(c.center[1])})`}
          fill="var(--muted)"
          fillOpacity={0.55}
          stroke="var(--paper)"
          strokeWidth={0.8}
        />
      ))}
      {cols.map(([x, y], i) => (
        <rect key={i} x={sx(x) - 1.6} y={sy(y) - 1.6} width={3.2} height={3.2} fill="var(--paper)" />
      ))}
      {strutPts.map(([x, y], i) => (
        <circle key={i} cx={sx(x)} cy={sy(y)} r={2.6} fill="none" stroke="var(--accent)" strokeWidth={1.2} />
      ))}
      <g transform={`translate(${W - 12} 14)`} fill="var(--muted)">
        <polygon points="0,-9 4,4 0,1 -4,4" />
        <text y={16} textAnchor="middle" fontSize={8} fontFamily="var(--font-mono)">
          N
        </text>
      </g>
      <text x={0} y={H + 13} fontSize={9} fontFamily="var(--font-mono)" fill="var(--muted)">
        {t.planCaption(area.toFixed(0), dims.w.toFixed(0), dims.h.toFixed(0), cols.length)}
      </text>
    </svg>
  );
}
