/**
 * Edge refraction for glass surfaces: displacement maps for `feDisplacementMap`.
 *
 * Real glass is flat in the middle and only bends light near the rim, where the surface
 * curves. The map reproduces this: neutral (128) in the interior, and inside a "bezel"
 * band along the edge, a displacement vector perpendicular to the edge that grows from
 * the inside towards the rim.
 *
 * Channels: R is the x component and G the y component, both centered on 128 and
 * pointing outwards; B is the refraction intensity.
 *
 * The profile is `t^2` with a displacement that exceeds the bezel width, so the edge
 * samples from deeper inside the surface than it covers. The image folds over at the rim
 * and appears inverted and compressed there, which is what a thick convex lens does.
 *
 * Corners: `shape` is the exponent k of `corner-shape: superellipse(k)` (see corners.ts).
 * A superellipse corner |x|^n + |y|^n = r^n has n = 2^k; the distance to it is
 * approximated with the L^n norm divided by the gradient length, which keeps the bezel
 * width correct along the diagonal.
 */

let supported: boolean | null = null;

/**
 * SVG filters inside `backdrop-filter` only work in Chromium. Safari and Firefox either
 * reject the whole declaration or draw nothing, so there only the blur remains.
 */
export function supportsRefraction(): boolean {
  if (supported !== null) return supported;
  if (typeof navigator === "undefined") return false;
  const brands = (navigator as Navigator & { userAgentData?: { brands: { brand: string }[] } }).userAgentData
    ?.brands;
  supported = (brands ?? []).some((b) => /Chromium/i.test(b.brand));
  return supported;
}

/** Normalized displacement at depth `t` in the bezel (0 inside, 1 at the rim). */
export const profile = (t: number): number => t * t;

// Maps are cached by size: dozens of equally sized buttons share one map.
const cache = new Map<string, string>();
const CACHE_LIMIT = 96;
const MAX_MAP_SIZE = 320;

/**
 * Builds a displacement map for a rounded rectangle and returns it as a data URL.
 *
 * The map is generated at low resolution (at most 320 px on the long side). The profile
 * is smooth enough that this is visually indistinguishable from a full resolution map,
 * and encoding large PNGs for every surface is expensive.
 */
export function displacementMap(
  width: number,
  height: number,
  radius: number,
  bezel: number,
  shape = 1,
): string {
  const w = Math.max(2, Math.round(width));
  const h = Math.max(2, Math.round(height));
  const key = `${w}x${h}r${Math.round(radius)}b${Math.round(bezel)}s${shape.toFixed(2)}`;
  const hit = cache.get(key);
  if (hit) return hit;

  const k = Math.min(1, MAX_MAP_SIZE / Math.max(w, h));
  const cw = Math.max(2, Math.round(w * k));
  const ch = Math.max(2, Math.round(h * k));
  const r = Math.min(radius, width / 2, height / 2) * k;
  const b = Math.max(1, bezel * k);
  const hw = cw / 2;
  const hh = ch / 2;
  const n = 2 ** shape;
  const round = Math.abs(n - 2) < 1e-3;

  const canvas = document.createElement("canvas");
  canvas.width = cw;
  canvas.height = ch;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";
  const img = ctx.createImageData(cw, ch);
  const data = img.data;

  for (let y = 0; y < ch; y++) {
    for (let x = 0; x < cw; x++) {
      const px = x + 0.5 - hw;
      const py = y + 0.5 - hh;
      // Signed distance to the rounded rectangle (negative inside)
      const qx = Math.abs(px) - (hw - r);
      const qy = Math.abs(py) - (hh - r);
      const ox = Math.max(qx, 0);
      const oy = Math.max(qy, 0);
      const corner = qx > 0 && qy > 0;
      let depth: number;
      let cnx = 0;
      let cny = 0;
      if (corner && !round) {
        const gx = ox ** (n - 1);
        const gy = oy ** (n - 1);
        const gl = Math.hypot(gx, gy);
        const L = (ox ** n + oy ** n) ** (1 / n);
        depth = ((r - L) * L ** (n - 1)) / gl;
        cnx = gx / gl;
        cny = gy / gl;
      } else if (corner) {
        const outer = Math.hypot(ox, oy);
        depth = r - outer;
        cnx = ox / outer;
        cny = oy / outer;
      } else {
        depth = r - Math.max(ox, oy) - Math.min(Math.max(qx, qy), 0);
      }

      let dx = 0;
      let dy = 0;
      let m = 0;
      if (depth < b) {
        let nx: number;
        let ny: number;
        if (corner) {
          nx = cnx;
          ny = cny;
        } else if (qx > qy) {
          nx = 1;
          ny = 0;
        } else {
          nx = 0;
          ny = 1;
        }
        nx *= Math.sign(px) || 1;
        ny *= Math.sign(py) || 1;
        const t = 1 - Math.max(0, depth) / b;
        m = profile(t);
        dx = nx * m;
        dy = ny * m;
      }
      const i = (y * cw + x) * 4;
      data[i] = 128 + dx * 127;
      data[i + 1] = 128 + dy * 127;
      data[i + 2] = m * 255;
      data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  const url = canvas.toDataURL();

  if (cache.size >= CACHE_LIMIT) {
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
  cache.set(key, url);
  return url;
}

/** Signed distance function: negative inside the shape, positive outside. */
export type SignedDistance = (x: number, y: number) => number;

let sdfCanvas: HTMLCanvasElement | null = null;

/**
 * Builds a displacement map from an arbitrary signed distance function. Used for merged
 * shapes, whose outline changes every frame. There is no cache; one canvas is reused so
 * that no new memory is allocated per frame. `res` is the size of the longest side:
 * small while the shape moves, large once it settles.
 *
 * The normal comes from the numeric gradient of the distance field, so the neck where
 * two shapes join refracts correctly. The gradient is only evaluated inside the bezel.
 */
export function sdfDisplacementMap(
  width: number,
  height: number,
  sdf: SignedDistance,
  bezel: number,
  res: number,
): string {
  const k = Math.min(1, res / Math.max(width, height));
  const cw = Math.max(2, Math.round(width * k));
  const ch = Math.max(2, Math.round(height * k));
  sdfCanvas ??= document.createElement("canvas");
  sdfCanvas.width = cw;
  sdfCanvas.height = ch;
  const ctx = sdfCanvas.getContext("2d");
  if (!ctx) return "";
  const img = ctx.createImageData(cw, ch);
  const data = img.data;
  const e = 0.5;
  for (let y = 0; y < ch; y++) {
    for (let x = 0; x < cw; x++) {
      const px = (x + 0.5) / k;
      const py = (y + 0.5) / k;
      const d = sdf(px, py);
      let dx = 0;
      let dy = 0;
      let m = 0;
      if (d < 0 && -d < bezel) {
        const gx = sdf(px + e, py) - sdf(px - e, py);
        const gy = sdf(px, py + e) - sdf(px, py - e);
        const gl = Math.hypot(gx, gy) || 1;
        m = profile(1 + d / bezel);
        dx = (gx / gl) * m;
        dy = (gy / gl) * m;
      }
      const i = (y * cw + x) * 4;
      data[i] = 128 + dx * 127;
      data[i + 1] = 128 + dy * 127;
      data[i + 2] = m * 255;
      data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return sdfCanvas.toDataURL();
}
