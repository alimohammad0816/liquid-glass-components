/**
 * Continuous corners (squircles).
 *
 * A circular corner jumps from zero to 1/r curvature where it meets a straight edge.
 * Continuous corners ramp the curvature up and down smoothly, so the rim highlight and
 * the edge refraction glide around the corner without a visible seam. The overall shape
 * is almost identical (the maximum deviation from a circle is about 1.2% of the radius);
 * the difference is continuity, not size.
 *
 * Implemented with `corner-shape: superellipse(k)` (Chromium 139+). The exponent and the
 * radius extension below were fitted numerically against the 60% smoothing curve used by
 * iOS: the CSS radius is 1.19 times the equivalent circular radius, with k = 1.31, and
 * the maximum error is 0.0046 radii. A `radius` prop therefore keeps the meaning it has
 * for circular corners.
 */
export const CONTINUOUS_EXTENT = 1.19;
export const CONTINUOUS_K = 1.31;

let supported: boolean | null = null;

/** Whether the browser understands `corner-shape: superellipse()`. */
export function supportsCornerShape(): boolean {
  if (supported !== null) return supported;
  if (typeof CSS === "undefined" || !CSS.supports) return false;
  supported = CSS.supports("corner-shape", "superellipse(2)");
  return supported;
}

export type CornerRadius = number | "pill";

export interface CornerGeometry {
  /** CSS border radius in pixels. */
  r: number;
  /** Superellipse exponent; 1 is a circular corner. */
  k: number;
}

/**
 * Resolves the CSS radius and exponent for a surface.
 *
 * `half` is half of the shorter side when the size is known. A pill stays circular, like
 * UIKit, which returns to a circular corner near half the height. In between, the
 * exponent eases to 1 once the 1.19x extension no longer fits, so a closed menu button
 * (radius 21 on a height of 42) is a true capsule and becomes a squircle as it opens.
 */
export function cornerGeometry(radius: CornerRadius, half = Infinity, continuous = true): CornerGeometry {
  if (radius === "pill") return { r: Number.isFinite(half) ? half : 999, k: 1 };
  const base = Math.min(radius, half);
  if (!continuous) return { r: base, k: 1 };
  const ext = radius * CONTINUOUS_EXTENT;
  if (ext <= half) return { r: ext, k: CONTINUOUS_K };
  if (radius >= half) return { r: half, k: 1 };
  const t = (half - radius) / (ext - radius);
  return { r: half, k: 1 + (CONTINUOUS_K - 1) * t };
}
