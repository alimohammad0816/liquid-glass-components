"use client";

import type { ReactNode } from "react";
import type { HTMLMotionProps, MotionStyle } from "motion/react";
import { LiquidGlass, type LiquidGlassProps } from "../LiquidGlass";
import { pressMotion } from "../core/motion";
import { cx, tintedColor } from "./utils";

export interface GlassButtonProps extends Omit<HTMLMotionProps<"button">, "children"> {
  /** `glass` is a clear surface; `tinted` is the same glass in the accent color, for the primary action. */
  variant?: "glass" | "tinted";
  size?: "sm" | "md" | "lg";
  /** Color of a `tinted` button. Defaults to the accent. */
  color?: string;
  startIcon?: ReactNode;
  children?: ReactNode;
}

const PRESS_SCALE = { sm: 1.1, md: 1.07, lg: 1.05 } as const;

/** A glass button. Every button is glass, even inside a card or a dialog. */
export function GlassButton({
  variant = "glass",
  size = "md",
  color,
  startIcon,
  className,
  style,
  children,
  ...rest
}: GlassButtonProps) {
  const press = pressMotion(PRESS_SCALE[size]);
  return (
    <LiquidGlass
      as="button"
      type="button"
      radius="pill"
      interactive
      {...press}
      className={cx("lg-reset lg-focusable lg-button", className)}
      data-size={size}
      data-variant={variant}
      tint={variant === "tinted" ? tintedColor(color) : undefined}
      style={{ ...press.style, ...style } as MotionStyle}
      {...(rest as LiquidGlassProps)}
    >
      {startIcon && <span className="lg-button__icon">{startIcon}</span>}
      {children}
    </LiquidGlass>
  );
}

export interface GlassIconButtonProps extends Omit<HTMLMotionProps<"button">, "children"> {
  /** Accessible name. Required because the button has no visible text. */
  label: string;
  /** Diameter in pixels. */
  size?: number;
  children?: ReactNode;
}

/** A circular glass button for a single icon. */
export function GlassIconButton({
  label,
  size = 44,
  className,
  style,
  children,
  ...rest
}: GlassIconButtonProps) {
  // The smaller the surface, the more noticeable the growth should be
  const press = pressMotion(1.14);
  return (
    <LiquidGlass
      as="button"
      type="button"
      radius="pill"
      interactive
      aria-label={label}
      title={label}
      {...press}
      className={cx("lg-reset lg-focusable lg-icon-button", className)}
      style={{ ...press.style, "--lg-size": `${size}px`, ...style } as MotionStyle}
      {...(rest as LiquidGlassProps)}
    >
      {children}
    </LiquidGlass>
  );
}
