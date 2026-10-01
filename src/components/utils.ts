import { useEffect } from "react";
import { animate, useMotionValue, useTransform, type MotionValue } from "motion/react";
import { SPRINGS, stretchScale, useStretch } from "../core/motion";

/** Joins class names, skipping falsy values. */
export const cx = (...parts: (string | false | null | undefined)[]): string =>
  parts.filter(Boolean).join(" ");

/**
 * The surface color of a tinted control: `color` at an opacity that follows the
 * transparency setting. It is deliberately nearly opaque and changes only slightly with
 * the setting. Colors stay complete behind the glass; at 94% transparency a green or a
 * purple would otherwise almost disappear.
 */
export const tintedColor = (color = "var(--lg-accent)"): string =>
  `color-mix(in srgb, ${color} calc(var(--lg-tinted-a) * 100%), transparent)`;

/**
 * Scale of the knob of a switch or a slider: under a finger it becomes a large lens
 * (1.62 by 1.55), multiplied by the horizontal stretch from the x velocity. A lens is
 * small, so it reaches the stretch cap at a lower speed.
 */
export function useKnobScale(x: MotionValue<number>, pressed: boolean) {
  const growX = useMotionValue(1);
  const growY = useMotionValue(1);
  useEffect(() => {
    const a = animate(growX, pressed ? 1.62 : 1, SPRINGS.press);
    const b = animate(growY, pressed ? 1.55 : 1, SPRINGS.press);
    return () => {
      a.stop();
      b.stop();
    };
  }, [pressed, growX, growY]);
  const still = useMotionValue(0);
  const { s } = useStretch(x, still, { max: 0.22, speed: 1200 });
  const scaleX = useTransform([growX, s], ([g, k]: number[]) => g * stretchScale(k)[0]);
  const scaleY = useTransform([growY, s], ([g, k]: number[]) => g * stretchScale(k)[1]);
  return { scaleX, scaleY };
}
