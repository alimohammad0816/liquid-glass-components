/**
 * Shared light source for every glass surface, like a flashlight at the pointer.
 *
 * A round halo follows the pointer and lights up whichever part of a surface rim lies
 * inside it. A weaker reflection appears at the point mirrored through the surface
 * center, which reads as an internal bounce.
 *
 * Why a position and not an angle from the surface center: an angle model is
 * discontinuous on large surfaces. A small pointer movement near a corner flips the
 * angle and the highlight jumps along a long edge. A position is always continuous: over
 * the middle of a large card the halo does not reach the rim and nothing lights up, while
 * the rim of a small button lights up completely.
 *
 * For every registered surface the following CSS variables are written (local
 * coordinates in physical pixels): `--lg-px` and `--lg-py` for the light position,
 * `--lg-rx` and `--lg-ry` for the mirrored point and `--lg-near` for intensity (0 to 1,
 * fading with distance). Only CSS variables change, never React state, so moving the
 * light never triggers a render.
 *
 * On touch devices, when the pointer is outside the page, and with reduced motion, the
 * intensity is zero and only the uniform rim remains.
 */

/** The halo still has an effect up to this distance (px) from a surface. */
const LIGHT_RADIUS = 130;
/** Small inertia: the position is continuous, this only adds a liquid feel. */
const SMOOTH_MS = 70;

interface SurfaceState {
  x: number;
  y: number;
  near: number;
  w?: number;
  h?: number;
}

const surfaces = new Map<HTMLElement, SurfaceState>();
let light: { x: number; y: number } | null = null;
let frame = 0;
let lastTime = 0;
let users = 0;

const smoothstep = (t: number) => t * t * (3 - 2 * t);
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

function target(el: HTMLElement): {
  x: number | null;
  y: number | null;
  near: number;
  w?: number;
  h?: number;
} {
  if (!light) return { x: null, y: null, near: 0 };
  const r = el.getBoundingClientRect();
  const gx = Math.max(r.left - light.x, 0, light.x - r.right);
  const gy = Math.max(r.top - light.y, 0, light.y - r.bottom);
  const near = smoothstep(clamp01(1 - Math.hypot(gx, gy) / LIGHT_RADIUS));
  return { x: light.x - r.left, y: light.y - r.top, near, w: r.width, h: r.height };
}

function write(el: HTMLElement, s: SurfaceState) {
  const w = s.w ?? el.offsetWidth;
  const h = s.h ?? el.offsetHeight;
  el.style.setProperty("--lg-px", `${s.x.toFixed(1)}px`);
  el.style.setProperty("--lg-py", `${s.y.toFixed(1)}px`);
  el.style.setProperty("--lg-rx", `${(w - s.x).toFixed(1)}px`);
  el.style.setProperty("--lg-ry", `${(h - s.y).toFixed(1)}px`);
  el.style.setProperty("--lg-near", s.near.toFixed(3));
}

function paint(now: number) {
  frame = 0;
  // Frame rate independent: the same speed at 60 and 120 Hz
  const dt = lastTime ? Math.min(64, now - lastTime) : 16;
  lastTime = now;
  const k = 1 - Math.exp(-dt / SMOOTH_MS);
  let settling = false;

  surfaces.forEach((cur, el) => {
    const tgt = target(el);
    const tx = tgt.x ?? cur.x;
    const ty = tgt.y ?? cur.y;
    const dx = tx - cur.x;
    const dy = ty - cur.y;
    const dn = tgt.near - cur.near;
    if (Math.abs(dx) < 0.3 && Math.abs(dy) < 0.3 && Math.abs(dn) < 0.002) {
      cur.x = tx;
      cur.y = ty;
      cur.near = tgt.near;
    } else {
      cur.x += dx * k;
      cur.y += dy * k;
      cur.near += dn * k;
      settling = true;
    }
    cur.w = tgt.w;
    cur.h = tgt.h;
    write(el, cur);
  });

  if (settling) schedule();
  else lastTime = 0;
}

function schedule() {
  if (!frame) frame = requestAnimationFrame(paint);
}

const onMove = (e: PointerEvent) => {
  if (e.pointerType === "touch") return;
  light = { x: e.clientX, y: e.clientY };
  schedule();
};
const onLeave = () => {
  light = null;
  schedule();
};

/** Hands a surface to the light source. The returned function removes it. */
export function registerSurface(el: HTMLElement): () => void {
  const t = target(el);
  // Before the light arrives: a neutral position above the surface with zero intensity
  const state: SurfaceState = {
    x: t.x ?? el.offsetWidth / 2,
    y: t.y ?? 0,
    near: t.near,
    w: t.w,
    h: t.h,
  };
  surfaces.set(el, state);
  write(el, state);
  return () => {
    surfaces.delete(el);
  };
}

/**
 * Starts listening for the pointer. Reference counted, so several providers can be
 * mounted at once. Returns a function that stops listening.
 */
export function enableLight(): (() => void) | undefined {
  if (typeof window === "undefined") return undefined;
  if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return undefined;
  if (users++ === 0) {
    window.addEventListener("pointermove", onMove, { passive: true });
    document.documentElement.addEventListener("mouseleave", onLeave);
    // Scrolling any container moves surfaces relative to the light
    window.addEventListener("scroll", schedule, { passive: true, capture: true });
    window.addEventListener("resize", schedule);
  }
  return () => {
    if (--users > 0) return;
    window.removeEventListener("pointermove", onMove);
    document.documentElement.removeEventListener("mouseleave", onLeave);
    window.removeEventListener("scroll", schedule, { capture: true });
    window.removeEventListener("resize", schedule);
    light = null;
    schedule();
  };
}
