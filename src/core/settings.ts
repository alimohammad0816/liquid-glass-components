/** Visual configuration shared by every glass surface inside a `GlassProvider`. */
export interface GlassSettings {
  /** 0 is a dense tint, 100 is nearly clear. */
  transparency: number;
  /** Backdrop blur in pixels. This is a standard deviation, so 3 px already spreads about 12 px. */
  blur: number;
  /** Edge refraction strength, 0 to 100. Zero disables the SVG filter entirely. */
  refraction: number;
  /** Chromatic dispersion of the refraction, 0 to 100. */
  chroma: number;
  /** Intensity of the rim highlight, 0 to 100. */
  specular: number;
  /** Backdrop saturation in percent. 100 leaves colors unchanged. */
  saturation: number;
  /** Intensity of the rainbow rim shown on lenses while pressed or dragged, 0 to 100. */
  iridescence: number;
  /** Distance in pixels at which surfaces inside a `GlassMerge` start to fuse. */
  mergeSmoothing: number;
  /** `continuous` uses superellipse corners where supported; `circular` uses a plain border radius. */
  corners: "continuous" | "circular";
  /** The rim highlight follows the pointer. When off, only a uniform rim remains. */
  dynamicLight: boolean;
  /**
   * Surfaces that carry text (`material="regular"`: cards, menus, dialogs, inputs) get a
   * denser tint and extra blur so text stays legible over busy content. Controls stay
   * clear. When off, every surface is as clear as a control.
   */
  regularMaterial: boolean;
}

export type GlassMode = "light" | "dark" | "auto";
export type GlassDirection = "ltr" | "rtl";

/**
 * Starting points. `crystal` is nearly colorless and nearly unblurred: the shape comes
 * from the folding edge. The blur is a standard deviation, so 0.8 px only prevents the
 * compressed image at the rim from turning into pixels, while 3 px would already turn
 * shapes behind the glass into clouds.
 */
export const GLASS_PRESETS = {
  crystal: { transparency: 94, blur: 0.8, refraction: 32, chroma: 35, specular: 60, saturation: 115 },
  clear: { transparency: 82, blur: 3, refraction: 65, chroma: 30, specular: 70, saturation: 180 },
  balanced: { transparency: 60, blur: 10, refraction: 50, chroma: 20, specular: 65, saturation: 170 },
  frosted: { transparency: 34, blur: 22, refraction: 35, chroma: 10, specular: 55, saturation: 150 },
} as const satisfies Record<string, Partial<GlassSettings>>;

export type GlassPresetName = keyof typeof GLASS_PRESETS;

export const GLASS_DEFAULTS: GlassSettings = {
  ...GLASS_PRESETS.crystal,
  iridescence: 60,
  mergeSmoothing: 18,
  corners: "continuous",
  dynamicLight: true,
  regularMaterial: true,
};

/**
 * Refraction tuning. `gain` is the maximum displacement relative to the bezel width. It
 * is intentionally larger than the bezel so the image folds over at the rim. `lensGain`
 * applies to surfaces with `magnify`, and `chroma` scales the dispersion setting.
 */
export const REFRACTION = { gain: 2.4, lensGain: 1.2, chroma: 0.07 } as const;

/** Below this many pixels of channel separation, dispersion is invisible and skipped. */
const MIN_FRINGE_PX = 0.5;

/**
 * Dispersion runs the displacement three times (once per channel), which makes it the
 * most expensive part of the filter. The largest red to blue separation is
 * `|scale| * chroma` pixels. Below half a pixel it cannot be seen, so a single pass is
 * used instead.
 */
export const effectiveChroma = (scale: number, chroma: number): number =>
  Math.abs(scale) * chroma < MIN_FRINGE_PX ? 0 : chroma;
