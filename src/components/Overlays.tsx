"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import { LiquidGlass } from "../LiquidGlass";
import { EXIT, SPRINGS } from "../core/motion";

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export interface GlassDialogProps {
  open: boolean;
  onClose?: () => void;
  title: string;
  children?: ReactNode;
  /** Buttons at the bottom of the dialog. */
  actions?: ReactNode;
}

/**
 * A modal dialog. It scales up with a spring from slightly smaller, and returns the same
 * way when closed. Focus moves into the dialog on open, is trapped while it is open, and
 * returns to the previously focused element on close. Escape and a click on the scrim
 * close it.
 *
 * The dialog is positioned with `position: fixed`, so render it outside any ancestor that
 * has a `transform`, `filter` or `contain` property.
 */
export function GlassDialog({ open, onClose, title, children, actions }: GlassDialogProps) {
  const titleId = useId();
  const dialogRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    dialogRef.current?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose?.();
        return;
      }
      if (e.key !== "Tab" || !dialogRef.current) return;
      const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (!focusable.length) {
        e.preventDefault();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;
      if (e.shiftKey && (active === first || active === dialogRef.current)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("keydown", key);
      previous?.focus?.();
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="scrim"
          className="lg-scrim"
          onClick={onClose}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: EXIT }}
          transition={SPRINGS.gentle}
        >
          <LiquidGlass
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            tabIndex={-1}
            radius={34}
            elevation={2}
            material="regular"
            className="lg-dialog"
            onClick={(e) => e.stopPropagation()}
            initial={{ opacity: 0, scale: 0.86, y: 14 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 6, transition: EXIT }}
            transition={SPRINGS.morph}
          >
            <h2 id={titleId} className="lg-dialog__title">
              {title}
            </h2>
            <div className="lg-dialog__body">{children}</div>
            {actions && <div className="lg-dialog__actions">{actions}</div>}
          </LiquidGlass>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export interface GlassToastProps {
  /** The message to show. An empty string hides the toast. */
  message: string;
  icon?: ReactNode;
  /** Called after `duration`. Clear the message here. */
  onDone?: () => void;
  /** Time in milliseconds before `onDone` is called. */
  duration?: number;
}

/**
 * A notification that drops from the top like a droplet (with a little overshoot) and
 * returns upwards when it leaves. The region is a polite live region, so screen readers
 * announce each message.
 */
export function GlassToast({ message, icon, onDone, duration = 2600 }: GlassToastProps) {
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(() => onDone?.(), duration);
    return () => clearTimeout(t);
  }, [message, onDone, duration]);

  return (
    <div className="lg-toast-region" role="status" aria-live="polite">
      <AnimatePresence>
        {message && (
          <LiquidGlass
            key={message}
            radius="pill"
            elevation={2}
            material="regular"
            className="lg-toast"
            style={{ pointerEvents: "auto" }}
            initial={{ opacity: 0, y: -36, scale: 0.7 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.9, transition: EXIT }}
            transition={SPRINGS.jelly}
          >
            {icon}
            {message}
          </LiquidGlass>
        )}
      </AnimatePresence>
    </div>
  );
}
