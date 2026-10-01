import { useEffect } from "react";
import {
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
  type MotionValue,
  type Transition,
} from "motion/react";

/**
 * Motion language of the glass. Every component uses the same springs.
 *
 * The "liquid" feel comes from real spring physics rather than timing curves: the motion
 * has velocity, a direction change mid-flight continues from the current velocity, and
 * the surface overshoots slightly and settles back. A CSS `cubic-bezier` has none of
 * this, which is why the transform of a glass surface is driven only by `motion` and
 * has no CSS transition. Two systems animating the same property fight every frame.
 */
export const SPRINGS = {
  /** Finger press: fast and slightly bouncy. */
  press: { type: "spring", stiffness: 560, damping: 28, mass: 0.7 },
  /** Settling a knob or a lens into place: little oscillation. */
  snap: { type: "spring", stiffness: 460, damping: 34, mass: 0.9 },
  /** A lens in motion: jelly-like with a visible overshoot. */
  jelly: { type: "spring", stiffness: 300, damping: 22, mass: 0.9 },
  /** Shape changes, such as a button turning into a menu or a dialog opening. */
  morph: { type: "spring", stiffness: 380, damping: 33, mass: 1 },
  /** Calm entrances and exits, such as toasts and dialog scrims. */
  gentle: { type: "spring", stiffness: 240, damping: 26, mass: 1 },
} as const satisfies Record<string, Transition>;

/**
 * Closing must be much faster than opening. With the entrance spring, closing a menu
 * takes around 660 ms.
 */
export const EXIT = { duration: 0.16, ease: [0.4, 0, 1, 1] } as const satisfies Transition;

/**
 * Press feedback: the surface grows slightly and brightens, as if lifted under a finger.
 * The smaller the surface, the more noticeable the growth should be, so an icon button
 * grows more than a wide button. LiquidGlass reads `--lg-lift` to brighten the rim and
 * the surface.
 */
export const pressMotion = (scale = 1.08) =>
  ({
    initial: false,
    style: { "--lg-lift": 0 },
    whileHover: { "--lg-lift": 0.35 },
    whileTap: { scale, "--lg-lift": 1 },
    transition: SPRINGS.press,
  }) as const;

const STRETCH_SPRING = { stiffness: 320, damping: 15, mass: 0.6 };
const WINDOW_MS = 100;

export interface StretchOptions {
  /** Maximum stretch factor. */
  max?: number;
  /** Speed (px/s) at which the maximum is reached. */
  speed?: number;
}

/**
 * Liquid stretch: a moving surface elongates along its velocity and narrows slightly
 * across it. When it stops, a spring wobbles it once or twice before it settles. The
 * spring crosses zero slightly, so the surface is briefly compressed along the direction
 * of travel, which reads as the liquid braking.
 *
 * Velocity is a single vector computed from the (x, y) history of the last 100 ms, not
 * two independent `useVelocity` values. Those reach zero on different frames, so the
 * angle used to flip by 90 degrees at the moment of stopping and the wobble pointed the
 * wrong way. The denominator runs up to "now", so the velocity decays smoothly to zero.
 *
 * Returns `s` (stretch amount, 0 at rest) and `angle` (direction of motion in radians).
 * With reduced motion the stretch is zero.
 */
export function useStretch(
  x: MotionValue<number>,
  y: MotionValue<number>,
  { max = 0.22, speed = 2400 }: StretchOptions = {},
) {
  const reduced = useReducedMotion();
  const target = useMotionValue(0);
  const angle = useMotionValue(0);
  // A damping ratio of about 0.55 gives a single small bounce. At 0.47 the rebound
  // reached 70% of the stretch and the lens looked egg-shaped.
  const s = useSpring(target, STRETCH_SPRING);

  useEffect(() => {
    target.set(0);
    if (reduced) return;
    const hist: { t: number; x: number; y: number }[] = [];
    let raf = 0;
    const evaluate = () => {
      raf = 0;
      const now = performance.now();
      while (hist.length && now - hist[0].t > WINDOW_MS) hist.shift();
      // A single sample means there is no velocity yet; keep it and pair it with the next
      if (hist.length < 2) {
        target.set(0);
        return;
      }
      const a = hist[0];
      const b = hist[hist.length - 1];
      const dt = Math.max(16, now - a.t) / 1000;
      const vx = (b.x - a.x) / dt;
      const vy = (b.y - a.y) / dt;
      const v = Math.hypot(vx, vy);
      if (v > 80) angle.set(Math.atan2(vy, vx));
      target.set(Math.min(max, v / speed));
      raf = requestAnimationFrame(evaluate);
    };
    // x and y are usually set back to back. A sample taken in between (new x, old y)
    // would produce a false perpendicular vector, so both are collected in one sample.
    let pending = false;
    const onChange = () => {
      if (pending) return;
      pending = true;
      queueMicrotask(() => {
        pending = false;
        hist.push({ t: performance.now(), x: x.get(), y: y.get() });
        if (!raf) raf = requestAnimationFrame(evaluate);
      });
    };
    const offX = x.on("change", onChange);
    const offY = y.on("change", onChange);
    return () => {
      offX();
      offY();
      cancelAnimationFrame(raf);
    };
  }, [x, y, target, angle, max, speed, reduced]);

  return { s, angle };
}

/** Scale factors for a stretch amount: longer along, narrower across (roughly area preserving, but gentler). */
export const stretchScale = (s: number): [number, number] => [1 + s, 1 / (1 + s * 0.6)];

/**
 * Complete transform for a surface that moves freely in two dimensions. The stretch
 * along the direction of motion is `rotate(a) scale rotate(-a)`, so the surface itself
 * does not rotate and its refraction map and light stay in place. `lift` is a uniform
 * growth under the finger.
 */
export function useStretchTransform(
  x: MotionValue<number>,
  y: MotionValue<number>,
  lift: MotionValue<number>,
  options?: StretchOptions,
) {
  const { s, angle } = useStretch(x, y, options);
  return useTransform([x, y, s, angle, lift], ([tx, ty, k, a, l]: number[]) => {
    const [along, across] = stretchScale(k);
    return `translate3d(${tx}px, ${ty}px, 0) rotate(${a}rad) scale(${along * l}, ${across * l}) rotate(${-a}rad)`;
  });
}
