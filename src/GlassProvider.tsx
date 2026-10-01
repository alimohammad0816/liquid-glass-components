"use client";

import {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
  type HTMLAttributes,
  type ReactNode,
} from "react";
import { MotionConfig } from "motion/react";
import { enableLight } from "./core/light";
import {
  GLASS_DEFAULTS,
  GLASS_PRESETS,
  type GlassDirection,
  type GlassMode,
  type GlassPresetName,
  type GlassSettings,
} from "./core/settings";

export interface GlassContextValue extends GlassSettings {
  /** The resolved color scheme. `auto` is already mapped to `light` or `dark`. */
  mode: "light" | "dark";
  /** Text direction of the provider subtree. */
  dir: GlassDirection;
}

const GlassContext = createContext<GlassContextValue>({
  ...GLASS_DEFAULTS,
  mode: "light",
  dir: "ltr",
});

/** Reads the active settings, resolved color scheme and text direction. */
export const useGlassSettings = (): GlassContextValue => useContext(GlassContext);

const DARK_QUERY = "(prefers-color-scheme: dark)";

function subscribeScheme(callback: () => void) {
  const query = window.matchMedia?.(DARK_QUERY);
  query?.addEventListener("change", callback);
  return () => query?.removeEventListener("change", callback);
}

function useResolvedMode(mode: GlassMode): "light" | "dark" {
  const prefersDark = useSyncExternalStore(
    subscribeScheme,
    () => window.matchMedia?.(DARK_QUERY).matches ?? false,
    () => false,
  );
  if (mode === "auto") return prefersDark ? "dark" : "light";
  return mode;
}

export interface GlassProviderProps extends Omit<HTMLAttributes<HTMLDivElement>, "dir"> {
  /** Overrides on top of the preset. */
  settings?: Partial<GlassSettings>;
  /** Starting point for the settings. Defaults to `crystal`. */
  preset?: GlassPresetName;
  /** Color scheme. `auto` follows `prefers-color-scheme`. */
  mode?: GlassMode;
  /** Text direction. When omitted it is read from the computed style of the provider. */
  dir?: GlassDirection;
  /** Accent color used by tinted buttons and sliders. Any CSS color. */
  accent?: string;
  children?: ReactNode;
}

/**
 * Root of a glass tree. Provides the settings to every surface below it and defines the
 * CSS custom properties that drive the visual style. Wrap the part of the page that
 * contains glass, or the whole application.
 */
export function GlassProvider({
  settings,
  preset = "crystal",
  mode = "auto",
  dir,
  accent,
  className,
  style,
  children,
  ...rest
}: GlassProviderProps) {
  const resolvedMode = useResolvedMode(mode);
  const rootRef = useRef<HTMLDivElement>(null);
  const [measuredDir, setMeasuredDir] = useState<GlassDirection>("ltr");

  useLayoutEffect(() => {
    if (dir || !rootRef.current) return;
    setMeasuredDir(getComputedStyle(rootRef.current).direction === "rtl" ? "rtl" : "ltr");
  }, [dir]);

  const resolvedDir = dir ?? measuredDir;
  const value = useMemo<GlassContextValue>(
    () => ({
      ...GLASS_DEFAULTS,
      ...GLASS_PRESETS[preset],
      ...settings,
      mode: resolvedMode,
      dir: resolvedDir,
    }),
    [preset, settings, resolvedMode, resolvedDir],
  );

  useEffect(() => (value.dynamicLight ? enableLight() : undefined), [value.dynamicLight]);

  const vars = {
    "--lg-clear": value.transparency / 100,
    "--lg-blur": `${value.blur}px`,
    "--lg-sat": `${value.saturation}%`,
    "--lg-specular": value.specular / 100,
    ...(accent && { "--lg-accent": accent }),
  } as CSSProperties;

  return (
    <GlassContext.Provider value={value}>
      {/* With the system "reduce motion" setting, springs jump straight to their target */}
      <MotionConfig reducedMotion="user">
        <div
          ref={rootRef}
          dir={dir}
          className={className ? `lg-root ${className}` : "lg-root"}
          data-mode={resolvedMode}
          style={{ ...vars, ...style }}
          {...rest}
        >
          {children}
        </div>
      </MotionConfig>
    </GlassContext.Provider>
  );
}
