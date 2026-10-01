import { describe, expect, it } from "vitest";
import {
  contourPath,
  roundedBoxDistance,
  smoothMin,
  unionDistance,
  type RoundedBox,
} from "../src/core/geometry";

const box = (cx: number, cy: number, hw: number, hh: number, r: number): RoundedBox => ({
  cx,
  cy,
  hw,
  hh,
  r,
});

describe("roundedBoxDistance", () => {
  const b = box(50, 50, 30, 20, 10);

  it("is negative inside, zero on the edge and positive outside", () => {
    expect(roundedBoxDistance(50, 50, b)).toBeLessThan(0);
    expect(roundedBoxDistance(80, 50, b)).toBeCloseTo(0);
    expect(roundedBoxDistance(100, 50, b)).toBeCloseTo(20);
  });

  it("measures the distance to the arc at a corner", () => {
    // The corner circle is centered at (70, 60) with radius 10
    const d = roundedBoxDistance(70 + 10 * Math.SQRT1_2 + 5, 60 + 10 * Math.SQRT1_2 + 5, b);
    expect(d).toBeCloseTo(5 * Math.SQRT2, 5);
  });
});

describe("smoothMin", () => {
  it("is the plain minimum when smoothing is zero", () => {
    expect(smoothMin(3, 5, 0)).toBe(3);
  });

  it("is the plain minimum when the values are further apart than k", () => {
    expect(smoothMin(3, 30, 10)).toBe(3);
  });

  it("dips below the minimum when the values are close, forming the neck", () => {
    expect(smoothMin(3, 3, 10)).toBeLessThan(3);
    expect(smoothMin(3, 3, 10)).toBeCloseTo(3 - 10 / 4);
  });
});

/** Samples a distance field on a grid the way GlassMerge does. */
function sample(sdf: (x: number, y: number) => number, width: number, height: number, step: number) {
  const nx = Math.ceil(width / step) + 1;
  const ny = Math.ceil(height / step) + 1;
  const field = new Float32Array(nx * ny);
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) field[j * nx + i] = sdf(i * step, j * step);
  return { field, nx, ny };
}

const loops = (path: string) => (path.match(/M/g) ?? []).length;

describe("contourPath", () => {
  it("returns an empty path when nothing crosses the level", () => {
    const { field, nx, ny } = sample(() => 1, 20, 20, 2);
    expect(contourPath(field, nx, ny, 0, 2)).toBe("");
  });

  it("traces one closed loop around a single shape", () => {
    const sdf = unionDistance([box(50, 50, 20, 20, 20)], 0);
    const { field, nx, ny } = sample(sdf, 100, 100, 2);
    const path = contourPath(field, nx, ny, 0, 2);
    expect(loops(path)).toBe(1);
    expect(path.endsWith("Z")).toBe(true);
  });

  it("traces two loops for distant shapes and one loop once they fuse", () => {
    const apart = [box(30, 50, 15, 15, 15), box(110, 50, 15, 15, 15)];
    const near = [box(30, 50, 15, 15, 15), box(66, 50, 15, 15, 15)];

    const far = sample(unionDistance(apart, 18), 140, 100, 2);
    expect(loops(contourPath(far.field, far.nx, far.ny, 0, 2))).toBe(2);

    const close = sample(unionDistance(near, 18), 140, 100, 2);
    expect(loops(contourPath(close.field, close.nx, close.ny, 0, 2))).toBe(1);
  });

  it("keeps the contour on the zero level of the field", () => {
    const sdf = unionDistance([box(50, 50, 20, 20, 20)], 0);
    const { field, nx, ny } = sample(sdf, 100, 100, 2);
    const path = contourPath(field, nx, ny, 0, 2);
    const points = [...path.matchAll(/(-?\d+\.\d) (-?\d+\.\d)/g)].map((m) => [Number(m[1]), Number(m[2])]);
    expect(points.length).toBeGreaterThan(20);
    for (const [x, y] of points) expect(Math.abs(sdf(x, y))).toBeLessThan(0.3);
  });
});
