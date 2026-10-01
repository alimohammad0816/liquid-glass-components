"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
} from "react";
import { animate, useMotionValue, useSpring, useTransform, useVelocity } from "motion/react";
import { useGlassSettings } from "../GlassProvider";
import { LiquidGlass } from "../LiquidGlass";
import { SPRINGS } from "../core/motion";
import { cx } from "./utils";

export interface GlassSegmentedOption<T extends string = string> {
  value: T;
  label: ReactNode;
  icon?: ReactNode;
}

export interface GlassSegmentedProps<T extends string = string> {
  options: GlassSegmentedOption<T>[];
  value: T;
  onChange?: (value: T) => void;
  /** Icon above the label, like a tab bar. */
  stacked?: boolean;
  size?: "sm" | "md";
  material?: "clear" | "regular";
  "aria-label"?: string;
  className?: string;
}

/**
 * A segmented control or tab bar. The selection lens moves like jelly: its position and
 * width are springs, and it stretches along its velocity and rises slightly, then
 * settles. Positions are read from the DOM, so RTL and unequal widths work.
 *
 * As in the iOS 26 tab bar, the lens can be dragged with a finger: press the selected
 * option and drag. The lens rises (larger and clearer), follows the finger, and takes the
 * width of the option below it. Releasing settles it on the nearest option and selects it.
 *
 * Keyboard: arrow keys move the selection, Home and End jump to the first and last option.
 */
export function GlassSegmented<T extends string = string>({
  options,
  value,
  onChange,
  stacked = false,
  size = "md",
  material = "regular",
  "aria-label": ariaLabel,
  className,
}: GlassSegmentedProps<T>) {
  const { dir } = useGlassSettings();
  const itemRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const wrapRef = useRef<HTMLElement | null>(null);
  const placed = useRef(false);
  const [shown, setShown] = useState(false);

  const spring = {
    stiffness: SPRINGS.jelly.stiffness,
    damping: SPRINGS.jelly.damping,
    mass: SPRINGS.jelly.mass,
  };
  const x = useSpring(0, spring);
  const w = useSpring(0, spring);
  const [box, setBox] = useState({ y: 0, h: 0 });
  // Stretch from velocity: faster means longer, zero at rest
  const vx = useVelocity(x);
  const stretch = useTransform(vx, (v) => Math.min(0.32, Math.abs(v) / 2600));
  // The lens rises while it is dragged
  const lift = useMotionValue(1);
  const scaleX = useTransform([stretch, lift], ([s, l]: number[]) => (1 + s) * l);
  const scaleY = useTransform([stretch, lift], ([s, l]: number[]) => (1 + s * 0.3) * l);
  const irisAngle = useTransform(x, (v) => `${v * 1.5}deg`);
  const [dragging, setDragging] = useState(false);
  const drag = useRef<{ start: number; from: number; moved: boolean; to?: number } | null>(null);
  const suppressClick = useRef(false);

  const measure = useCallback(() => {
    const el = itemRefs.current[value];
    if (!el) return;
    if (!placed.current) {
      // The first placement happens without motion
      x.jump(el.offsetLeft);
      w.jump(el.offsetWidth);
      placed.current = true;
      setShown(true);
    } else {
      x.set(el.offsetLeft);
      w.set(el.offsetWidth);
    }
    setBox((b) =>
      b.y === el.offsetTop && b.h === el.offsetHeight ? b : { y: el.offsetTop, h: el.offsetHeight },
    );
  }, [value, x, w]);

  useLayoutEffect(measure, [measure, options]);

  useEffect(() => {
    const a = animate(lift, dragging ? 1.14 : 1, SPRINGS.press);
    return () => a.stop();
  }, [dragging, lift]);

  const items = () =>
    options
      .map((o) => ({ value: o.value, el: itemRefs.current[o.value] }))
      .filter((i): i is { value: T; el: HTMLButtonElement } => !!i.el);

  // The option whose center is closest to the physical x coordinate `cx`
  const nearest = (center: number) =>
    items().reduce<{ value: T; el: HTMLButtonElement; d: number } | null>((best, i) => {
      const d = Math.abs(i.el.offsetLeft + i.el.offsetWidth / 2 - center);
      return !best || d < best.d ? { ...i, d } : best;
    }, null);

  const onPointerDown = (e: PointerEvent<HTMLButtonElement>, optionValue: T) => {
    if (optionValue !== value || e.button !== 0) return;
    drag.current = { start: e.clientX, from: x.get(), moved: false };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: PointerEvent<HTMLButtonElement>) => {
    const d = drag.current;
    if (!d) return;
    const dx = e.clientX - d.start;
    if (!d.moved) {
      if (Math.abs(dx) < 5) return;
      d.moved = true;
      setDragging(true);
    }
    const all = items();
    const lo = Math.min(...all.map((i) => i.el.offsetLeft));
    const hi = Math.max(...all.map((i) => i.el.offsetLeft + i.el.offsetWidth)) - w.get();
    const nx = Math.min(hi, Math.max(lo, d.from + dx));
    x.set(nx);
    d.to = nx;
    const under = nearest(nx + w.get() / 2);
    if (under) w.set(under.el.offsetWidth);
  };
  const onPointerUp = () => {
    const d = drag.current;
    drag.current = null;
    if (!d?.moved) return;
    setDragging(false);
    // The click that arrives right after release must not select a second time
    suppressClick.current = true;
    setTimeout(() => {
      suppressClick.current = false;
    }, 0);
    // The finger position, not the lens, which lags slightly behind because of the spring
    const to = nearest((d.to ?? x.get()) + w.get() / 2);
    if (to && to.value !== value) onChange?.(to.value);
    else measure();
  };

  const onKeyDown = (e: KeyboardEvent<HTMLElement>) => {
    const index = options.findIndex((o) => o.value === value);
    const forward = dir === "rtl" ? "ArrowLeft" : "ArrowRight";
    const backward = dir === "rtl" ? "ArrowRight" : "ArrowLeft";
    let next = -1;
    if (e.key === forward || e.key === "ArrowDown") next = Math.min(options.length - 1, index + 1);
    else if (e.key === backward || e.key === "ArrowUp") next = Math.max(0, index - 1);
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = options.length - 1;
    if (next < 0) return;
    e.preventDefault();
    const target = options[next];
    if (target.value !== value) onChange?.(target.value);
    itemRefs.current[target.value]?.focus();
  };

  useEffect(() => {
    const ro = new ResizeObserver(measure);
    if (wrapRef.current) ro.observe(wrapRef.current);
    return () => ro.disconnect();
  }, [measure]);

  return (
    <LiquidGlass
      ref={wrapRef}
      radius="pill"
      role="radiogroup"
      aria-label={ariaLabel}
      material={material}
      className={cx("lg-segmented", className)}
      data-size={size}
      data-stacked={stacked ? "" : undefined}
      onKeyDown={onKeyDown}
    >
      {shown && (
        // offsetLeft is physical, so `left` and `x` live in style and not in logical properties
        <LiquidGlass
          radius="pill"
          elevation={0}
          strength={dragging ? 1.2 : 0.8}
          iridescent={dragging ? 1 : 0}
          // The fill comes from the text color, not the surface: on a light capsule a lighter white was invisible
          tint={dragging ? "rgba(var(--lg-text-rgb), 0.04)" : "rgba(var(--lg-text-rgb), 0.10)"}
          className="lg-segmented__lens"
          style={
            { top: box.y, x, width: w, height: box.h, scaleX, scaleY, "--lg-iris-angle": irisAngle } as never
          }
        />
      )}
      {options.map((o) => {
        const selected = o.value === value;
        return (
          <button
            key={o.value}
            ref={(el) => {
              itemRefs.current[o.value] = el;
            }}
            type="button"
            role="radio"
            aria-checked={selected}
            tabIndex={selected ? 0 : -1}
            className="lg-reset lg-focusable lg-segmented__item"
            onClick={() => !suppressClick.current && !selected && onChange?.(o.value)}
            onPointerDown={(e) => onPointerDown(e, o.value)}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
          >
            {o.icon}
            {o.label}
          </button>
        );
      })}
    </LiquidGlass>
  );
}
