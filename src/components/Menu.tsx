"use client";

import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import { LiquidGlass } from "../LiquidGlass";
import { EXIT, SPRINGS, pressMotion } from "../core/motion";
import { cx } from "./utils";

export interface GlassMenuItem {
  label: string;
  icon?: ReactNode;
  /** Renders the item in the danger color. */
  danger?: boolean;
  [key: string]: unknown;
}

export interface GlassMenuProps<T extends GlassMenuItem = GlassMenuItem> {
  /** Text of the trigger button. */
  label: string;
  /** Icon of the trigger button. */
  icon?: ReactNode;
  items: T[];
  onSelect?: (item: T) => void;
  className?: string;
}

/**
 * The glass of the button itself opens into the menu, and returns to a button when it
 * closes, like iOS 26 menus. It is one glass surface with `layout`, whose content swaps
 * between the button and the list; `motion` smooths the size change with a spring. The
 * surface is absolutely positioned so opening does not push the layout, and an invisible
 * copy of the button keeps its place in the flow.
 *
 * Keyboard: Escape closes and returns focus to the trigger, arrow keys move between items.
 */
export function GlassMenu<T extends GlassMenuItem = GlassMenuItem>({
  label,
  icon,
  items,
  onSelect,
  className,
}: GlassMenuProps<T>) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const down = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const key = (e: globalThis.KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setOpen(false);
      triggerRef.current?.focus();
    };
    document.addEventListener("pointerdown", down);
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("pointerdown", down);
      document.removeEventListener("keydown", key);
    };
  }, [open]);

  const onListKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    const entries = Array.from(listRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? []);
    if (!entries.length) return;
    e.preventDefault();
    const index = entries.indexOf(document.activeElement as HTMLElement);
    const step = e.key === "ArrowDown" ? 1 : -1;
    entries[(index + step + entries.length) % entries.length].focus();
  };

  const face = (
    <span className="lg-menu__face">
      {icon}
      {label}
    </span>
  );
  const press = pressMotion(1.07);

  return (
    <div ref={rootRef} className={cx("lg-menu", className)} data-open={open ? "" : undefined}>
      <div aria-hidden className="lg-menu__sizer">
        {face}
      </div>
      <LiquidGlass
        layout
        // A large radius like the menus of iOS: edge refraction only shows in visibly curved
        // corners. The radius lives in `style` so `motion` can correct it while the size
        // changes. Closed, it is a true capsule (21 is half the height).
        radius={open ? 28 : 21}
        elevation={open ? 2 : 1}
        material={open ? "regular" : "clear"}
        interactive={!open}
        {...(!open && { whileHover: press.whileHover, whileTap: press.whileTap })}
        transition={SPRINGS.morph}
        style={{ "--lg-lift": 0 } as never}
        className="lg-menu__surface"
        data-open={open ? "" : undefined}
      >
        <AnimatePresence mode="popLayout" initial={false}>
          {open ? (
            <motion.div
              key="menu"
              layout="position"
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, transition: EXIT }}
              transition={{ ...SPRINGS.gentle, delay: 0.04 }}
            >
              <div
                ref={listRef}
                role="menu"
                aria-label={label}
                className="lg-menu__list"
                onKeyDown={onListKeyDown}
              >
                {items.map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    role="menuitem"
                    data-danger={item.danger ? "" : undefined}
                    className="lg-reset lg-focusable lg-continuous lg-menu__item"
                    onClick={() => {
                      onSelect?.(item);
                      setOpen(false);
                      triggerRef.current?.focus();
                    }}
                  >
                    {item.icon}
                    {item.label}
                  </button>
                ))}
              </div>
            </motion.div>
          ) : (
            <motion.button
              key="face"
              ref={triggerRef}
              type="button"
              layout="position"
              aria-haspopup="menu"
              aria-expanded={false}
              className="lg-reset lg-focusable lg-menu__trigger"
              onClick={() => setOpen(true)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, transition: EXIT }}
              transition={SPRINGS.gentle}
            >
              {face}
            </motion.button>
          )}
        </AnimatePresence>
      </LiquidGlass>
    </div>
  );
}
