"use client";

import {
  createContext,
  forwardRef,
  useCallback,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type HTMLAttributes,
  type ReactNode,
} from "react";
import { motion, type HTMLMotionProps } from "motion/react";
import { useGlassSettings } from "./GlassProvider";
import { DisplacementPrimitives } from "./DisplacementPrimitives";
import { NestedGlass } from "./nested";
import { contourPath, unionDistance, type RoundedBox } from "./core/geometry";
import { registerSurface } from "./core/light";
import { sdfDisplacementMap, supportsRefraction } from "./core/refraction";
import { REFRACTION, effectiveChroma } from "./core/settings";
import type { CornerRadius } from "./core/corners";
import type { GlassElement } from "./LiquidGlass";

/**
 * Glass merging, the equivalent of a glass effect container.
 *
 * The items inside a group (`GlassMergeItem`) do not draw glass themselves. The group
 * draws one shared glass layer below them whose shape is the soft union of all items
 * (a smooth minimum over a signed distance field). Two distant items look like two
 * separate pieces of glass. When they get close a neck grows between them and they fuse
 * like two drops; when they separate the neck stretches and snaps. `smoothing` (px) is
 * the distance at which the fusion starts.
 *
 * The layers are the same as in `LiquidGlass`, with the same styling, but the shape comes
 * from a path instead of a border radius:
 * - glass: `clip-path` along the zero iso-line of the distance field (marching squares)
 * - rim: a 1.5 px ring between the 0 and -1.5 iso-lines (an even-odd path)
 * - refraction: a map built from the same distance field (`sdfDisplacementMap`)
 * - shadow: an SVG below the glass whose mask cuts out the shape, because the glass is
 *   nearly transparent and the shadow would otherwise show through it
 *
 * Everything updates outside React and only when something moves. A `MutationObserver`
 * catches every style change (the springs of `motion`), a `requestAnimationFrame` loop
 * reads the shapes, and it stops once nothing has changed for 8 frames. While moving, the
 * refraction map is 160 px (about 1.4 ms); at rest it is rebuilt once at 320 px.
 * Measured on a device six times slower than a laptop: 5 ms per frame while moving.
 *
 * Limitations: the shape of an item comes from `getBoundingClientRect`, so it does not
 * see rotation or diagonal stretching, and the soft inset shadow of the rim in
 * `LiquidGlass` is not reproduced here.
 */

type Register = (el: HTMLElement, radius: CornerRadius, bleed: number) => () => void;
const MergeContext = createContext<Register | null>(null);

/** Same as the padding of `::before` in `LiquidGlass`. */
const RIM = 1.5;
/** Marching squares grid spacing in px. */
const STEP = 2;
const RES_MOVING = 160;
const RES_STILL = 320;
const IDLE_FRAMES = 8;

const SHADOWS = {
  1: [
    { dy: 8, blur: 14, a: 0.8 },
    { dy: 1, blur: 1.5, a: 0.6 },
  ],
  2: [
    { dy: 24, blur: 32, a: 1 },
    { dy: 2, blur: 4, a: 0.6 },
  ],
} as const;

interface ItemEntry {
  radius: CornerRadius;
  bleed: number;
}

export interface GlassMergeProps extends HTMLAttributes<HTMLDivElement> {
  /** Distance in pixels at which items start to fuse. Defaults to the `mergeSmoothing` setting. */
  smoothing?: number;
  elevation?: 0 | 1 | 2;
  material?: "clear" | "regular";
  /** Multiplier for the refraction strength set on the provider. */
  strength?: number;
  children?: ReactNode;
}

export function GlassMerge({
  smoothing,
  elevation = 1,
  material = "clear",
  strength = 1,
  className,
  style,
  children,
  ...rest
}: GlassMergeProps) {
  const settings = useGlassSettings();
  const nested = useContext(NestedGlass);
  const [canRefract, setCanRefract] = useState(false);
  const [band, setBand] = useState(0);
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const filterId = `lgm${uid}`;
  const maskId = `lgmm${uid}`;

  const rootRef = useRef<HTMLDivElement>(null);
  const layerRef = useRef<HTMLDivElement>(null);
  const glassRef = useRef<HTMLDivElement>(null);
  const rimRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const holeRef = useRef<SVGPathElement>(null);
  const shadowRefs = useRef<(SVGPathElement | null)[]>([]);
  const filterRef = useRef<SVGFilterElement>(null);
  const imageRef = useRef<SVGFEImageElement>(null);
  const items = useRef(new Map<HTMLElement, ItemEntry>());
  const st = useRef({ raf: 0, key: "", idle: 0, hiDone: false });

  useEffect(() => {
    setCanRefract(supportsRefraction());
  }, []);

  const refract = canRefract && !nested && settings.refraction > 0 && strength > 0;
  const k = smoothing ?? settings.mergeSmoothing;

  // The loop outside React reads the latest values from here
  const live = useRef({ refract, k });
  useLayoutEffect(() => {
    live.current = { refract, k };
  });

  const update = useCallback((hi: boolean): boolean => {
    const root = rootRef.current;
    const layer = layerRef.current;
    if (!root || !layer || !glassRef.current || !rimRef.current) return false;
    const s = st.current;
    const P = live.current;
    const cr = root.getBoundingClientRect();
    const raw: { x: number; y: number; w: number; h: number; radius: CornerRadius }[] = [];
    items.current.forEach(({ radius, bleed }, el) => {
      const r = el.getBoundingClientRect();
      if (r.width < 1 || r.height < 1) return;
      raw.push({
        x: r.left - cr.left - bleed,
        y: r.top - cr.top,
        w: r.width + 2 * bleed,
        h: r.height,
        radius,
      });
    });
    const key =
      raw.map((q) => `${q.x.toFixed(1)},${q.y.toFixed(1)},${q.w.toFixed(1)},${q.h.toFixed(1)}`).join("|") +
      `|${P.k}|${P.refract}`;
    const changed = key !== s.key;
    // The first build is at full quality; afterwards low while moving and full at rest
    if (!s.key) hi = true;
    if (!changed && !(hi && !s.hiDone)) return false;
    s.key = key;
    s.hiDone = hi;
    if (!raw.length) {
      layer.style.display = "none";
      return changed;
    }
    layer.style.display = "block";

    // The soft union extends up to k/4 beyond each shape; the padding keeps the grid border outside
    const pad = Math.ceil(P.k / 4) + 4;
    const minX = Math.min(...raw.map((q) => q.x)) - pad;
    const minY = Math.min(...raw.map((q) => q.y)) - pad;
    const W = Math.max(...raw.map((q) => q.x + q.w)) + pad - minX;
    const H = Math.max(...raw.map((q) => q.y + q.h)) + pad - minY;
    Object.assign(layer.style, { left: `${minX}px`, top: `${minY}px`, width: `${W}px`, height: `${H}px` });

    const shapes: RoundedBox[] = raw.map((q) => {
      const hw = q.w / 2;
      const hh = q.h / 2;
      const r = q.radius === "pill" ? Math.min(hw, hh) : Math.min(q.radius, hw, hh);
      return { cx: q.x - minX + hw, cy: q.y - minY + hh, hw, hh, r };
    });
    const sdf = unionDistance(shapes, P.k);

    const nx = Math.ceil(W / STEP) + 1;
    const ny = Math.ceil(H / STEP) + 1;
    const field = new Float32Array(nx * ny);
    for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) field[j * nx + i] = sdf(i * STEP, j * STEP);
    const outer = contourPath(field, nx, ny, 0, STEP);
    const inner = contourPath(field, nx, ny, -RIM, STEP);

    glassRef.current.style.clipPath = `path(evenodd, "${outer}")`;
    rimRef.current.style.clipPath = `path(evenodd, "${outer}${inner}")`;
    if (svgRef.current && holeRef.current) {
      svgRef.current.setAttribute("width", String(W));
      svgRef.current.setAttribute("height", String(H));
      holeRef.current.setAttribute("d", outer);
      shadowRefs.current.forEach((p) => p?.setAttribute("d", outer));
    }

    if (P.refract) {
      // Same bezel rule as LiquidGlass, taken from the smallest item
      const b = Math.min(...raw.map((q) => Math.max(6, Math.min(22, Math.min(q.w, q.h) * 0.32))));
      setBand((prev) => (Math.abs(prev - b) < 0.5 ? prev : b));
      if (filterRef.current && imageRef.current) {
        const url = sdfDisplacementMap(W, H, sdf, b, hi ? RES_STILL : RES_MOVING);
        filterRef.current.setAttribute("width", String(W));
        filterRef.current.setAttribute("height", String(H));
        imageRef.current.setAttribute("width", String(W));
        imageRef.current.setAttribute("height", String(H));
        imageRef.current.setAttribute("href", url);
      }
    }
    return changed;
  }, []);

  const kick = useCallback(() => {
    const s = st.current;
    s.idle = 0;
    if (s.raf) return;
    const frame = () => {
      s.raf = 0;
      if (update(false)) s.idle = 0;
      else s.idle++;
      if (s.idle < IDLE_FRAMES) s.raf = requestAnimationFrame(frame);
      else update(true);
    };
    s.raf = requestAnimationFrame(frame);
  }, [update]);

  const register = useCallback<Register>(
    (el, radius, bleed) => {
      items.current.set(el, { radius, bleed });
      st.current.key = "";
      kick();
      return () => {
        items.current.delete(el);
        st.current.key = "";
        kick();
      };
    },
    [kick],
  );

  useEffect(() => {
    const root = rootRef.current;
    const layer = layerRef.current;
    if (!root || !layer) return;
    const state = st.current;
    // Changes made by the layer itself (shape, light variables) must not wake the loop
    const mo = new MutationObserver((records) => {
      if (records.some((r) => !layer.contains(r.target))) kick();
    });
    mo.observe(root, {
      attributes: true,
      attributeFilter: ["style", "class"],
      subtree: true,
      childList: true,
    });
    const ro = new ResizeObserver(kick);
    ro.observe(root);
    window.addEventListener("resize", kick);
    const off = registerSurface(layer);
    return () => {
      mo.disconnect();
      ro.disconnect();
      window.removeEventListener("resize", kick);
      off();
      cancelAnimationFrame(state.raf);
      state.raf = 0;
    };
  }, [kick]);

  // Settings changed, or the filter was just mounted: rebuild
  const hasBand = band > 0;
  useEffect(() => {
    st.current.key = "";
    kick();
  }, [kick, refract, k, hasBand]);

  const useFilter = refract && hasBand;
  const scale = -(settings.refraction / 100) * band * 2 * REFRACTION.gain * strength;
  const chroma = effectiveChroma(scale, (settings.chroma / 100) * REFRACTION.chroma);
  const regular = material === "regular" && settings.regularMaterial;
  const shadows = elevation > 0 ? SHADOWS[Math.min(2, elevation) as 1 | 2] : [];

  return (
    <MergeContext.Provider value={register}>
      <div ref={rootRef} className={className ? `lg-merge ${className}` : "lg-merge"} style={style} {...rest}>
        <div ref={layerRef} aria-hidden="true" className="lg-merge__layer">
          {shadows.length > 0 && (
            <svg ref={svgRef} width="0" height="0" className="lg-merge__shadow">
              <mask id={maskId} maskUnits="userSpaceOnUse" x="-2000" y="-2000" width="6000" height="6000">
                <rect x="-2000" y="-2000" width="6000" height="6000" fill="white" />
                <path ref={holeRef} fill="black" fillRule="evenodd" />
              </mask>
              <g mask={`url(#${maskId})`}>
                {shadows.map((sh, i) => (
                  <path
                    key={i}
                    ref={(el) => {
                      shadowRefs.current[i] = el;
                    }}
                    fillRule="evenodd"
                    transform={`translate(0 ${sh.dy})`}
                    style={{
                      fill: `rgba(var(--lg-shadow), calc(var(--lg-shadow-a) * ${sh.a}))`,
                      filter: `blur(${sh.blur}px)`,
                    }}
                  />
                ))}
              </g>
            </svg>
          )}
          <div
            ref={glassRef}
            className="lg-merge__glass"
            data-regular={regular ? "" : undefined}
            style={
              useFilter
                ? { backdropFilter: `blur(var(--lg-surface-blur)) url(#${filterId}) saturate(var(--lg-sat))` }
                : undefined
            }
          />
          <div ref={rimRef} className="lg-merge__rim" />
          {useFilter && (
            <svg aria-hidden="true" width="0" height="0" className="lg-filter">
              <filter
                ref={filterRef}
                id={filterId}
                x="0"
                y="0"
                width="1"
                height="1"
                filterUnits="userSpaceOnUse"
                primitiveUnits="userSpaceOnUse"
                colorInterpolationFilters="sRGB"
              >
                <feImage
                  ref={imageRef}
                  x="0"
                  y="0"
                  width="1"
                  height="1"
                  preserveAspectRatio="none"
                  result="map"
                />
                <DisplacementPrimitives scale={scale} chroma={chroma} />
              </filter>
            </svg>
          )}
        </div>
        <NestedGlass.Provider value={true}>{children}</NestedGlass.Provider>
      </div>
    </MergeContext.Provider>
  );
}

export interface GlassMergeItemProps extends HTMLMotionProps<"div"> {
  as?: GlassElement;
  /** Corner radius of this item's contribution to the merged shape. */
  radius?: CornerRadius;
  /**
   * Extra width in pixels on both sides of the shape. Adjacent items in a toolbar then
   * form one continuous capsule instead of a row of circles.
   */
  bleed?: number;
  type?: "button" | "submit" | "reset";
}

/**
 * A member of a `GlassMerge` group. It does not draw glass itself, it only owns space and
 * content. Its shape (from `getBoundingClientRect`, so it is correct with `motion`
 * transforms too) goes to the shared layer.
 */
export const GlassMergeItem = forwardRef<HTMLElement, GlassMergeItemProps>(function GlassMergeItem(
  { as = "div", radius = "pill", bleed = 0, className, ...rest },
  ref,
) {
  const register = useContext(MergeContext);
  const local = useRef<HTMLElement | null>(null);
  const setRef = useCallback(
    (el: HTMLElement | null) => {
      local.current = el;
      if (typeof ref === "function") ref(el);
      else if (ref) ref.current = el;
    },
    [ref],
  );
  useEffect(
    () => (local.current && register ? register(local.current, radius, bleed) : undefined),
    [register, radius, bleed],
  );
  const MotionTag = motion[as] as typeof motion.div;
  return (
    <MotionTag
      ref={setRef as React.Ref<HTMLDivElement>}
      className={className ? `lg-merge__item ${className}` : "lg-merge__item"}
      {...rest}
    />
  );
});
