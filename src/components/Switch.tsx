"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { animate, useMotionValue, useTransform } from "motion/react";
import { useGlassSettings } from "../GlassProvider";
import { LiquidGlass } from "../LiquidGlass";
import { SPRINGS } from "../core/motion";
import { cx, useKnobScale } from "./utils";

export interface GlassSwitchProps {
  checked: boolean;
  onChange?: (checked: boolean) => void;
  /** Visible label. Without it, provide `aria-label`. */
  label?: string;
  "aria-label"?: string;
  disabled?: boolean;
  className?: string;
}

// The knob is the same size as the slider knob (34 by 22) and sits inside the track
const WIDTH = 58;
const KNOB_WIDTH = 34;
const INSET = 2;
const TRAVEL = WIDTH - KNOB_WIDTH - 2 * INSET;

/**
 * A switch with three states, like the iOS 26 switch:
 * - off: a gray track and an opaque white pill knob
 * - on: a green track and the same knob at the other end
 * - pressed: the knob becomes a clear glass lens much larger than the track (it
 *   overflows the top and bottom), the track color shows through it and its rim refracts
 *
 * There is no glass at rest, only under a finger. Growth is a scale, not a width, so the
 * refraction map is not rebuilt every frame. The knob can be dragged; releasing past the
 * midpoint flips the switch. Refraction inside a glass surface is not possible
 * (`LiquidGlass` detects this), in which case the lens is only clear and large.
 */
export function GlassSwitch({
  checked,
  onChange,
  label,
  "aria-label": ariaLabel,
  disabled,
  className,
}: GlassSwitchProps) {
  const { dir } = useGlassSettings();
  const labelId = useId();
  const [pressed, setPressed] = useState(false);
  const drag = useRef<{ start: number; from: number; moved: boolean } | null>(null);
  const sign = dir === "rtl" ? -1 : 1;
  const target = (checked ? TRAVEL : 0) * sign;

  const x = useMotionValue(target);
  useEffect(() => {
    if (drag.current?.moved) return;
    const a = animate(x, target, SPRINGS.snap);
    return () => a.stop();
  }, [target, x]);

  // Growth under the finger times the stretch along the motion, both while dragging and while it jumps
  const { scaleX, scaleY } = useKnobScale(x, pressed);
  // The rim colors rotate as the knob slides
  const irisAngle = useTransform(x, (v) => `${v * 7}deg`);

  const onPointerDown = (e: PointerEvent<HTMLButtonElement>) => {
    if (disabled) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { start: e.clientX, from: x.get(), moved: false };
    setPressed(true);
  };
  const onPointerMove = (e: PointerEvent<HTMLButtonElement>) => {
    const d = drag.current;
    if (!d) return;
    const dx = e.clientX - d.start;
    if (!d.moved && Math.abs(dx) < 4) return;
    d.moved = true;
    const lo = Math.min(0, TRAVEL * sign);
    const hi = Math.max(0, TRAVEL * sign);
    x.set(Math.min(hi, Math.max(lo, d.from + dx)));
  };
  const onPointerUp = () => {
    const d = drag.current;
    drag.current = null;
    setPressed(false);
    if (!d) return;
    const next = d.moved ? x.get() * sign > TRAVEL / 2 : !checked;
    if (next !== checked) onChange?.(next);
    else animate(x, target, SPRINGS.snap);
  };
  // The mouse click is handled on pointer up; this is only for Space and Enter (detail 0)
  const onClick = (e: { detail: number }) => {
    if (!disabled && e.detail === 0) onChange?.(!checked);
  };
  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      onClick({ detail: 0 });
    }
  };

  return (
    <div className={cx("lg-switch", className)} style={disabled ? { opacity: 0.5 } : undefined}>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={ariaLabel}
        aria-labelledby={label && !ariaLabel ? labelId : undefined}
        disabled={disabled}
        className="lg-reset lg-focusable lg-switch__track"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onClick={onClick}
        onKeyDown={onKeyDown}
      >
        <LiquidGlass
          radius="pill"
          strength={1.4}
          elevation={pressed ? 2 : 1}
          tint={pressed ? "rgba(255, 255, 255, 0.05)" : "rgba(255, 255, 255, 0.98)"}
          iridescent={pressed ? 1 : 0}
          className="lg-switch__knob"
          data-pressed={pressed ? "" : undefined}
          style={{ x, scaleX, scaleY, "--lg-lift": 0, "--lg-iris-angle": irisAngle } as never}
          animate={{ "--lg-lift": pressed ? 1 : 0 } as never}
          transition={SPRINGS.press}
        />
      </button>
      {label && (
        <span id={labelId} className="lg-switch__label" onClick={() => !disabled && onChange?.(!checked)}>
          {label}
        </span>
      )}
    </div>
  );
}
