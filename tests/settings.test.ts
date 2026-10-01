import { describe, expect, it } from "vitest";
import { profile, supportsRefraction } from "../src/core/refraction";
import { GLASS_DEFAULTS, GLASS_PRESETS, effectiveChroma } from "../src/core/settings";

describe("profile", () => {
  it("is neutral in the interior and full at the rim", () => {
    expect(profile(0)).toBe(0);
    expect(profile(1)).toBe(1);
  });

  it("grows monotonically", () => {
    let previous = -1;
    for (let t = 0; t <= 1; t += 0.05) {
      expect(profile(t)).toBeGreaterThan(previous);
      previous = profile(t);
    }
  });
});

describe("effectiveChroma", () => {
  it("drops dispersion that is below half a pixel", () => {
    expect(effectiveChroma(-4, 0.07)).toBe(0);
  });

  it("keeps dispersion that can be seen", () => {
    expect(effectiveChroma(-20, 0.07)).toBe(0.07);
  });
});

describe("presets", () => {
  it("start from the crystal preset", () => {
    expect(GLASS_DEFAULTS).toMatchObject(GLASS_PRESETS.crystal);
  });

  it("stay within the ranges the sliders expose", () => {
    for (const preset of Object.values(GLASS_PRESETS)) {
      expect(preset.transparency).toBeGreaterThanOrEqual(0);
      expect(preset.transparency).toBeLessThanOrEqual(100);
      expect(preset.saturation).toBeGreaterThanOrEqual(100);
    }
  });
});

describe("supportsRefraction", () => {
  it("is false without a Chromium user agent brand", () => {
    expect(supportsRefraction()).toBe(false);
  });
});
