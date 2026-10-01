import { describe, expect, it } from "vitest";
import { CONTINUOUS_EXTENT, CONTINUOUS_K, cornerGeometry } from "../src/core/corners";

describe("cornerGeometry", () => {
  it("keeps a pill circular and equal to half the shorter side", () => {
    expect(cornerGeometry("pill", 21)).toEqual({ r: 21, k: 1 });
  });

  it("uses a large fallback for a pill whose size is not known yet", () => {
    expect(cornerGeometry("pill")).toEqual({ r: 999, k: 1 });
  });

  it("extends the radius and uses the continuous exponent when it fits", () => {
    const g = cornerGeometry(20, 100);
    expect(g.r).toBeCloseTo(20 * CONTINUOUS_EXTENT);
    expect(g.k).toBe(CONTINUOUS_K);
  });

  it("falls back to circular corners when continuous corners are disabled", () => {
    expect(cornerGeometry(20, 100, false)).toEqual({ r: 20, k: 1 });
  });

  it("never exceeds half of the shorter side", () => {
    expect(cornerGeometry(40, 25).r).toBe(25);
    expect(cornerGeometry(30, 28).r).toBe(28);
  });

  it("eases the exponent to 1 as the extended radius stops fitting", () => {
    // 21 on a height of 42: a true capsule
    expect(cornerGeometry(21, 21)).toEqual({ r: 21, k: 1 });
    // Halfway between the radius and the extended radius
    const radius = 20;
    const half = radius + (radius * CONTINUOUS_EXTENT - radius) / 2;
    const g = cornerGeometry(radius, half);
    expect(g.r).toBe(half);
    expect(g.k).toBeGreaterThan(1);
    expect(g.k).toBeLessThan(CONTINUOUS_K);
  });
});
