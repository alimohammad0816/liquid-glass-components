"use client";

import type { InputHTMLAttributes, ReactNode } from "react";
import type { HTMLMotionProps } from "motion/react";
import { LiquidGlass, type LiquidGlassProps } from "../LiquidGlass";
import { cx } from "./utils";

export interface GlassInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "size"> {
  /** Icon shown before the text. */
  icon?: ReactNode;
  /** Class name for the glass wrapper. The input itself receives `inputClassName`. */
  className?: string;
  inputClassName?: string;
}

/** A text input in a glass capsule. All native input attributes are passed to the input. */
export function GlassInput({ icon, className, inputClassName, style, ...inputProps }: GlassInputProps) {
  return (
    <LiquidGlass
      radius="pill"
      material="regular"
      className={cx("lg-input", className)}
      style={style as never}
    >
      {icon}
      <input className={cx("lg-input__field", inputClassName)} {...inputProps} />
    </LiquidGlass>
  );
}

export interface GlassChipProps extends Omit<HTMLMotionProps<"div">, "children"> {
  label: ReactNode;
  /** Color of the dot before the label. Any CSS color. */
  color?: string;
}

/** A small label with an optional colored dot. */
export function GlassChip({ label, color, className, style, ...rest }: GlassChipProps) {
  return (
    <LiquidGlass
      radius="pill"
      elevation={0}
      material="regular"
      className={cx("lg-chip", className)}
      style={{ ...(color && { "--lg-chip-color": color }), ...style } as never}
      {...(rest as LiquidGlassProps)}
    >
      {color && <span className="lg-chip__dot" />}
      {label}
    </LiquidGlass>
  );
}

export interface GlassCardProps extends Omit<HTMLMotionProps<"div">, "title"> {
  title?: ReactNode;
  subtitle?: ReactNode;
  /** Content at the end of the header, such as a button or a chip. */
  action?: ReactNode;
  children?: ReactNode;
}

/** A card: a large glass surface with an optional header. */
export function GlassCard({ title, subtitle, action, className, children, ...rest }: GlassCardProps) {
  return (
    <LiquidGlass
      as="section"
      radius={28}
      material="regular"
      className={cx("lg-card", className)}
      {...(rest as LiquidGlassProps)}
    >
      {(title || action) && (
        <div className="lg-card__header">
          <div>
            {title && <h3 className="lg-card__title">{title}</h3>}
            {subtitle && <p className="lg-card__subtitle">{subtitle}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </LiquidGlass>
  );
}
