import type { SignedDistance } from "./refraction";

/** A rounded rectangle described by its center, half extents and corner radius. */
export interface RoundedBox {
  cx: number;
  cy: number;
  hw: number;
  hh: number;
  r: number;
}

/** Signed distance from a point to a rounded rectangle (negative inside). */
export function roundedBoxDistance(px: number, py: number, s: RoundedBox): number {
  const qx = Math.abs(px - s.cx) - (s.hw - s.r);
  const qy = Math.abs(py - s.cy) - (s.hh - s.r);
  return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - s.r;
}

/**
 * Polynomial smooth minimum. Joins two distance fields with a neck that starts forming
 * when the shapes are within `k` pixels of each other.
 */
export function smoothMin(a: number, b: number, k: number): number {
  if (k <= 0) return Math.min(a, b);
  const h = Math.max(k - Math.abs(a - b), 0) / k;
  return Math.min(a, b) - h * h * k * 0.25;
}

/** Soft union of several rounded boxes. */
export function unionDistance(shapes: RoundedBox[], k: number): SignedDistance {
  return (x, y) => {
    let d = roundedBoxDistance(x, y, shapes[0]);
    for (let i = 1; i < shapes.length; i++) {
      d = smoothMin(d, roundedBoxDistance(x, y, shapes[i]), k);
    }
    return d;
  };
}

/**
 * Extracts the iso-line at `level` from a scalar field sampled on a regular grid
 * (marching squares) and returns it as an SVG path.
 *
 * `field` holds nx by ny samples spaced `step` pixels apart. Every contour point lies on
 * a grid edge and connects to exactly two segments, so joining the segments yields closed
 * loops. Saddle cells (cases 5 and 10) are resolved with the value at the cell center.
 */
export function contourPath(
  field: Float32Array,
  nx: number,
  ny: number,
  level: number,
  step: number,
): string {
  const pts = new Map<number, [number, number]>();
  const adj = new Map<number, number[]>();

  // Horizontal edge (i,j)->(i+1,j) has v = 0, vertical edge (i,j)->(i,j+1) has v = 1
  const point = (i: number, j: number, v: 0 | 1): number => {
    const key = ((j * nx + i) << 1) | v;
    if (!pts.has(key)) {
      const a = field[j * nx + i];
      const b = v ? field[(j + 1) * nx + i] : field[j * nx + i + 1];
      const t = (level - a) / (b - a);
      pts.set(key, v ? [i * step, (j + t) * step] : [(i + t) * step, j * step]);
    }
    return key;
  };
  const link = (a: number, b: number) => {
    (adj.get(a) ?? adj.set(a, []).get(a)!).push(b);
    (adj.get(b) ?? adj.set(b, []).get(b)!).push(a);
  };

  for (let j = 0; j < ny - 1; j++) {
    for (let i = 0; i < nx - 1; i++) {
      const tl = field[j * nx + i];
      const tr = field[j * nx + i + 1];
      const bl = field[(j + 1) * nx + i];
      const br = field[(j + 1) * nx + i + 1];
      const c = (tl < level ? 8 : 0) | (tr < level ? 4 : 0) | (br < level ? 2 : 0) | (bl < level ? 1 : 0);
      if (c === 0 || c === 15) continue;
      const T = () => point(i, j, 0);
      const B = () => point(i, j + 1, 0);
      const L = () => point(i, j, 1);
      const R = () => point(i + 1, j, 1);
      switch (c) {
        case 1:
        case 14:
          link(L(), B());
          break;
        case 2:
        case 13:
          link(B(), R());
          break;
        case 3:
        case 12:
          link(L(), R());
          break;
        case 4:
        case 11:
          link(T(), R());
          break;
        case 6:
        case 9:
          link(T(), B());
          break;
        case 7:
        case 8:
          link(L(), T());
          break;
        case 5:
        case 10: {
          const center = (tl + tr + bl + br) / 4 < level;
          if ((c === 5) === center) {
            link(L(), T());
            link(R(), B());
          } else {
            link(T(), R());
            link(L(), B());
          }
          break;
        }
        default:
      }
    }
  }

  let d = "";
  const seen = new Set<number>();
  for (const start of adj.keys()) {
    if (seen.has(start)) continue;
    const loop: [number, number][] = [];
    let prev = -1;
    let cur: number | undefined = start;
    while (cur !== undefined && !seen.has(cur)) {
      seen.add(cur);
      loop.push(pts.get(cur)!);
      const n: number[] = adj.get(cur)!;
      const next: number = n[0] !== prev ? n[0] : n[1];
      prev = cur;
      cur = next;
    }
    if (loop.length > 2) {
      d += `M${loop.map((p) => `${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join("L")}Z`;
    }
  }
  return d;
}
