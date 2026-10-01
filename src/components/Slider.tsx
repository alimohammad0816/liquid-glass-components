"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useMotionValue, useTransform } from "motion/react";
import { LiquidGlass } from "../LiquidGlass";
import { SPRINGS } from "../core/motion";
import { cx, useKnobScale } from "./utils";

export interface GlassSliderProps {
  value: number;
  onChange?: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  label?: string;
  "aria-label"?: string;
  /** Formats the value shown next to the label. */
  format?: (value: number) => string | number;
  disabled?: boolean;
  className?: string;
}

// The size is constant and growth is a scale: changing the width rebuilt the refraction map every frame
const KNOB_WIDTH = 34;

/**
 * A slider whose knob behaves like the switch knob: opaque white at rest, a large glass
 * lens while dragging. A native range input sits underneath and handles keyboard input
 * and assistive technology; everything else is only a view.
 */
export function GlassSlider({
  value,
  onChange,
  min = 0,
  max = 100,
  step = 1,
  label,
  "aria-label": ariaLabel,
  format = (v) => v,
  disabled,
  className,
}: GlassSliderProps) {
  const [dragging, setDragging] = useState(false);
  const [focused, setFocused] = useState(false);
  const labelId = useId();
  const pct = ((value - min) / (max - min)) * 100;

  // The knob position in px is only used for its velocity (stretch); the position itself is CSS
  const trackRef = useRef<HTMLDivElement>(null);
  const pos = useMotionValue(0);
  useEffect(() => {
    pos.set((((trackRef.current?.offsetWidth ?? 0) - KNOB_WIDTH) * pct) / 100);
  }, [pct, pos]);
  const { scaleX, scaleY } = useKnobScale(pos, dragging);
  const irisAngle = useTransform(pos, (v) => `${v * 2}deg`);

  useEffect(() => {
    if (!dragging) return;
    const up = () => setDragging(false);
    window.addEventListener("pointerup", up);
    return () => window.removeEventListener("pointerup", up);
  }, [dragging]);

  return (
    <div className={cx("lg-slider", className)}>
      {label && (
        <div className="lg-slider__header">
          <span id={labelId} className="lg-slider__label">
            {label}
          </span>
          <span className="lg-slider__value">{format(value)}</span>
        </div>
      )}
      <div ref={trackRef} className="lg-slider__control">
        <div className="lg-slider__rail">
          <div className="lg-slider__fill" style={{ width: `${pct}%` }} />
        </div>
        <LiquidGlass
          radius="pill"
          strength={1.4}
          elevation={dragging ? 2 : 1}
          tint={dragging ? "rgba(255, 255, 255, 0.05)" : "rgba(255, 255, 255, 0.98)"}
          iridescent={dragging ? 1 : 0}
          className="lg-slider__knob"
          data-focus={focused ? "" : undefined}
          style={
            {
              scaleX,
              scaleY,
              "--lg-lift": 0,
              "--lg-iris-angle": irisAngle,
              insetInlineStart: `calc(${pct}% - ${(KNOB_WIDTH * pct) / 100}px)`,
            } as never
          }
          animate={{ "--lg-lift": dragging ? 1 : 0 } as never}
          transition={SPRINGS.press}
        />
        <input
          type="range"
          className="lg-slider__input"
          min={min}
          max={max}
          step={step}
          value={value}
          disabled={disabled}
          aria-label={ariaLabel}
          aria-labelledby={label && !ariaLabel ? labelId : undefined}
          onChange={(e) => onChange?.(Number(e.target.value))}
          onPointerDown={() => setDragging(true)}
          onFocus={(e) => setFocused(e.target.matches(":focus-visible"))}
          onBlur={() => setFocused(false)}
        />
      </div>
    </div>
  );
}
