"use client";

import {
  forwardRef,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type CSSProperties,
  type ReactNode,
} from "react";
import { motion, type HTMLMotionProps } from "motion/react";
import { useGlassSettings } from "./GlassProvider";
import { DisplacementPrimitives } from "./DisplacementPrimitives";
import { NestedGlass } from "./nested";
import { cornerGeometry, supportsCornerShape, type CornerRadius } from "./core/corners";
import { registerSurface } from "./core/light";
import { displacementMap, supportsRefraction } from "./core/refraction";
import { REFRACTION, effectiveChroma } from "./core/settings";

export type GlassElement =
  "div" | "span" | "button" | "section" | "article" | "aside" | "nav" | "header" | "footer" | "ul" | "li";

export interface LiquidGlassOwnProps {
  /** Element to render. Surfaces are always `motion` elements, so animation props work on any of them. */
  as?: GlassElement;
  /** Corner radius in pixels, or `"pill"` for a capsule. */
  radius?: CornerRadius;
  /** Width of the refracting band along the edge in pixels. Defaults to a fraction of the surface size. */
  bezel?: number;
  /** Multiplier for the refraction strength set on the provider. */
  strength?: number;
  /** Lens mode: stronger refraction for small surfaces that magnify what is behind them. */
  magnify?: boolean;
  /** Pointer cursor and press feedback. The highlight itself comes from the shared light source. */
  interactive?: boolean;
  /** Surface color, replacing the default tint. Any CSS color. */
  tint?: string;
  /** 0 has no drop shadow, 2 is for dialogs and menus. */
  elevation?: 0 | 1 | 2;
  /** Backdrop blur in pixels, replacing the provider setting. */
  blur?: number;
  /** When false the shared light does not fall on this surface, which is useful for lenses. */
  lit?: boolean;
  /**
   * `clear` is for controls. `regular` is for surfaces that carry text; it only becomes
   * denser when `regularMaterial` is enabled in the settings.
   */
  material?: "clear" | "regular";
  /**
   * 0 to 1: lens state (under a finger). Adds a rainbow rim and stronger dispersion,
   * scaled by the `iridescence` setting. Leave it undefined to exclude the surface.
   */
  iridescent?: number;
  /** Overrides the corner shape from the provider, mostly useful for comparisons. */
  corners?: "continuous" | "circular";
}

export type LiquidGlassProps = LiquidGlassOwnProps &
  Omit<HTMLMotionProps<"div">, "children"> &
  Pick<ButtonHTMLAttributes<HTMLButtonElement>, "type" | "disabled" | "name" | "value" | "form"> & {
    children?: ReactNode;
  };

// Maximum separation of the red and blue channels, in units of the edge displacement,
// for a lens at full intensity. About 2 to 3 px on a knob.
const IRIS_CHROMA = 0.18;

/**
 * Liquid glass surface, the foundation of every glass component.
 *
 * Four layers:
 * 1. Backdrop: blur and saturation, and in Chromium edge refraction through an SVG
 *    filter.
 * 2. Surface color: white or dark with the alpha derived from `transparency`, or a
 *    custom `tint`.
 * 3. Rim (`::before`): a light line. The part of the rim near the pointer lights up, and
 *    a weaker reflection appears at the mirrored point. An inset shadow adds thickness.
 * 4. Sheen (`::after`): below the content, under the same light.
 *
 * The radius is applied through `style`, not a class, so `motion` can correct it during
 * layout animations (a button morphing into a menu). The rim and sheen inherit the same
 * shape, and the refraction map is built from the same geometry.
 */
export const LiquidGlass = forwardRef<HTMLElement, LiquidGlassProps>(function LiquidGlass(
  {
    as = "div",
    radius = 24,
    bezel,
    strength = 1,
    magnify = false,
    interactive = false,
    tint,
    elevation = 1,
    blur,
    lit = true,
    material = "clear",
    iridescent,
    corners,
    className,
    style,
    children,
    ...rest
  },
  forwardedRef,
) {
  const settings = useGlassSettings();
  const nested = useContext(NestedGlass);
  const innerRef = useRef<HTMLElement | null>(null);
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  const [canRefract, setCanRefract] = useState(false);
  const [canShape, setCanShape] = useState(false);
  const filterId = `lg${useId().replace(/[^a-zA-Z0-9]/g, "")}`;

  const setRef = useCallback(
    (el: HTMLElement | null) => {
      innerRef.current = el;
      if (typeof forwardedRef === "function") forwardedRef(el);
      else if (forwardedRef) forwardedRef.current = el;
    },
    [forwardedRef],
  );

  // Feature detection runs after mount so server and client markup match
  useEffect(() => {
    setCanRefract(supportsRefraction());
    setCanShape(supportsCornerShape());
  }, []);

  // Registered even when dynamic light is off; the light source keeps the intensity at zero then
  useEffect(() => {
    const el = innerRef.current;
    return el && lit ? registerSurface(el) : undefined;
  }, [lit]);

  const refract = canRefract && !nested && settings.refraction > 0 && strength > 0;
  const continuous = canShape && (corners ?? settings.corners) === "continuous";
  // The size feeds the refraction map, and the continuous corner that returns to a circle near a pill
  const needSize = refract || (continuous && radius !== "pill");

  // offsetWidth, not getBoundingClientRect: the pressed scale must not rebuild the map
  useEffect(() => {
    const el = innerRef.current;
    if (!el || !needSize) return;
    const measure = () => {
      const w = el.offsetWidth;
      const h = el.offsetHeight;
      setSize((prev) => (prev && prev.w === w && prev.h === h ? prev : { w, h }));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [needSize]);

  const corner = cornerGeometry(radius, size ? Math.min(size.w, size.h) / 2 : Infinity, continuous);
  const px = size ? corner.r : 0;
  const band = size ? (bezel ?? Math.max(6, Math.min(22, Math.min(size.w, size.h) * 0.32))) : 0;
  const map = useMemo(
    () =>
      refract && size && size.w > 1 && size.h > 1
        ? displacementMap(size.w, size.h, px, band, corner.k)
        : null,
    [refract, size, px, band, corner.k],
  );

  // Always negative: the edge samples from inside the surface. Sampling from outside the
  // filter region returns transparent black, which made edges dark, especially on small
  // surfaces such as the segmented control lens.
  const scale =
    -(settings.refraction / 100) * band * 2 * (magnify ? REFRACTION.lensGain : REFRACTION.gain) * strength;
  const iris = (iridescent ?? 0) * (settings.iridescence / 100);
  // Real dispersion is subtle. With a large factor every glyph grew three hard-edged
  // teal, magenta and yellow copies of its edge.
  const chroma = effectiveChroma(scale, (settings.chroma / 100) * REFRACTION.chroma + iris * IRIS_CHROMA);
  const useFilter = refract && map !== null && size !== null;

  const regular = material === "regular" && settings.regularMaterial;
  const surfaceStyle: CSSProperties & Record<string, unknown> = {
    borderRadius: `${corner.r}px`,
    ...(corner.k !== 1 && { cornerShape: `superellipse(${corner.k.toFixed(3)})` }),
    ...(blur != null && { "--lg-surface-blur": `${blur}px` }),
    ...(tint && { backgroundColor: tint }),
    // Safari needs the prefix and does not understand url(); the CSS class supplies the url-less value
    ...(useFilter && {
      backdropFilter: `blur(var(--lg-surface-blur)) url(#${filterId}) saturate(var(--lg-sat))`,
    }),
    ...(style as Record<string, unknown>),
  };

  const MotionTag = motion[as] as typeof motion.div;

  return (
    <MotionTag
      ref={setRef as React.Ref<HTMLDivElement>}
      className={className ? `lg-surface ${className}` : "lg-surface"}
      data-elevation={elevation}
      data-regular={regular ? "" : undefined}
      data-lit={lit ? undefined : "false"}
      data-interactive={interactive ? "" : undefined}
      style={surfaceStyle}
      {...rest}
    >
      {useFilter && (
        <svg aria-hidden="true" width="0" height="0" className="lg-filter">
          <filter
            id={filterId}
            x="0"
            y="0"
            width={size.w}
            height={size.h}
            filterUnits="userSpaceOnUse"
            primitiveUnits="userSpaceOnUse"
            colorInterpolationFilters="sRGB"
          >
            <feImage
              href={map}
              x="0"
              y="0"
              width={size.w}
              height={size.h}
              preserveAspectRatio="none"
              result="map"
            />
            <DisplacementPrimitives scale={scale} chroma={chroma} />
          </filter>
        </svg>
      )}
      {iridescent !== undefined && (
        <span aria-hidden="true" className="lg-iris" style={{ opacity: iris * 0.85 }} />
      )}
      <NestedGlass.Provider value={true}>{children}</NestedGlass.Provider>
    </MotionTag>
  );
});
