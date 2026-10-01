import { useEffect, useRef, useState, type CSSProperties } from "react";
import { animate, motion, useMotionValue, useTransform } from "motion/react";
import { ClipboardCheck, Copy, Flag, Folder, Pencil, Plus, Share, Trash2 } from "lucide-react";
import {
  GlassButton,
  GlassMerge,
  GlassMergeItem,
  LiquidGlass,
  SPRINGS,
  useGlassSettings,
  useStretchTransform,
} from "liquid-glass-components";

const abs = (left: number | string, top: number, width: number | string, height: number): CSSProperties => ({
  position: "absolute",
  left,
  top,
  width,
  height,
});

const RAINBOW =
  "linear-gradient(90deg, #1fb6ff, #6c3bd6 30%, #e5359e 55%, #ff7a2f 75%, #ffd60a 88%, #6ee36e)";

/**
 * A scene for judging the refraction against reference photos of the real material: a
 * blue bar with a knob, a green pill with a capsule on its edge, a gradient bar with a
 * circle, a plus button and the corner of a large card. The glass sits directly on the
 * colors, not inside another glass surface, so the refraction applies in full.
 */
export function ShowcaseScene({ dark }: { dark: boolean }) {
  const line = dark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)";
  return (
    <div
      dir="ltr"
      className="scene"
      style={{
        backgroundColor: dark ? "#16181f" : "#e9eaee",
        backgroundImage: `repeating-linear-gradient(90deg, ${line} 0 1px, transparent 1px 44px), repeating-linear-gradient(0deg, ${line} 0 1px, transparent 1px 44px)`,
      }}
    >
      <div
        style={{ ...abs(0, 262, "40%", 26), borderRadius: 13, backgroundColor: dark ? "#2a2d36" : "#dcdde2" }}
      />
      <div style={{ ...abs(0, 262, "26%", 26), borderRadius: 13, backgroundColor: "#2f7cf6" }} />
      <LiquidGlass radius="pill" style={abs("calc(26% - 70px)", 238, 132, 74)} />

      <div style={{ ...abs("16%", 44, 210, 84), borderRadius: 42, backgroundColor: "#34c759" }} />
      <LiquidGlass radius="pill" style={abs("calc(16% + 70px)", 34, 220, 104)} />

      <div style={{ ...abs("52%", 150, "44%", 48), borderRadius: 24, background: RAINBOW }} />
      <LiquidGlass radius="pill" style={abs("calc(52% + 44% * 0.78)", 128, 92, 92)} />

      <LiquidGlass
        radius="pill"
        style={{
          ...abs("calc(50% - 44px)", 206, 88, 88),
          display: "grid",
          placeItems: "center",
          fontSize: 44,
          fontWeight: 300,
          lineHeight: 1,
        }}
      >
        +
      </LiquidGlass>

      <LiquidGlass radius={56} style={abs("70%", 240, 360, 260)} />
    </div>
  );
}

/**
 * Two equally sized surfaces with the same radius, differing only in the corner shape
 * (independent of the global setting). The difference is small in overall shape; it shows
 * in how the background lines curve around the corner and in the rim highlight. Move the
 * pointer over the corners.
 */
export function CornerComparison({ dark }: { dark: boolean }) {
  const line = dark ? "rgba(255,255,255,0.16)" : "rgba(0,0,0,0.16)";
  const item = (corners: "circular" | "continuous", label: string) => (
    <div className="corner-item">
      <LiquidGlass corners={corners} radius={52} style={{ width: 190, height: 190 }} />
      <span>{label}</span>
    </div>
  );
  return (
    <div
      dir="ltr"
      className="corners"
      style={{
        backgroundColor: dark ? "#16181f" : "#e9eaee",
        backgroundImage: `repeating-linear-gradient(90deg, ${line} 0 1px, transparent 1px 16px), repeating-linear-gradient(0deg, ${line} 0 1px, transparent 1px 16px)`,
      }}
    >
      <div className="corners__band" style={{ background: RAINBOW }} />
      {item("circular", "Circular")}
      {item("continuous", "Continuous")}
    </div>
  );
}

const mergeButton = "lg-reset lg-focusable merge-btn";

/**
 * Toolbar: three buttons in one capsule (`bleed` overlaps the shapes). Selecting makes a
 * delete button slide out from under the last one: first the neck stretches, then it snaps.
 */
function MergeToolbar() {
  const { dir } = useGlassSettings();
  const sign = dir === "rtl" ? -1 : 1;
  const [selecting, setSelecting] = useState(false);
  const S = 44;
  const tap = { whileTap: { scale: 1.12 }, transition: SPRINGS.press };
  const actions = [
    [Pencil, "Edit"],
    [Copy, "Copy"],
    [Share, "Share"],
  ] as const;
  return (
    <div className="row">
      <GlassButton size="sm" onClick={() => setSelecting((v) => !v)}>
        {selecting ? "Done" : "Select"}
      </GlassButton>
      {/* The trailing margin reserves the place of the delete button so it does not push the layout */}
      <GlassMerge style={{ display: "inline-flex", marginInlineEnd: S + 24 }}>
        {actions.map(([Icon, label]) => (
          <GlassMergeItem
            key={label}
            as="button"
            type="button"
            bleed={6}
            aria-label={label}
            title={label}
            {...tap}
            className={mergeButton}
            style={{ width: S, height: S }}
          >
            <Icon />
          </GlassMergeItem>
        ))}
        <GlassMergeItem
          as="button"
          type="button"
          aria-label="Delete"
          title="Delete"
          tabIndex={selecting ? 0 : -1}
          initial={false}
          animate={{ x: (selecting ? S + 24 : 0) * sign, opacity: selecting ? 1 : 0 }}
          transition={{ x: SPRINGS.jelly, opacity: { duration: 0.18 } }}
          className={mergeButton}
          style={{
            position: "absolute",
            top: 0,
            insetInlineEnd: 0,
            width: S,
            height: S,
            color: "var(--lg-danger)",
            pointerEvents: selecting ? "auto" : "none",
          }}
        >
          <Trash2 />
        </GlassMergeItem>
      </GlassMerge>
    </div>
  );
}

/** A plus button: three options emerge from it one after another and sink back when closed. */
function MergeFab() {
  const [open, setOpen] = useState(false);
  const F = 60;
  const O = 46;
  const options = [
    { icon: <ClipboardCheck />, label: "Task", to: [-92, 0] },
    { icon: <Flag />, label: "Goal", to: [-66, -66] },
    { icon: <Folder />, label: "Project", to: [0, -92] },
  ];
  return (
    // Physical coordinates (left and top in style) so right to left layouts do not mirror them
    <GlassMerge dir="ltr" style={{ width: 180, height: 170 }}>
      {options.map((o, i) => (
        <GlassMergeItem
          key={o.label}
          as="button"
          type="button"
          aria-label={o.label}
          title={o.label}
          tabIndex={open ? 0 : -1}
          initial={false}
          animate={{ x: open ? o.to[0] : 0, y: open ? o.to[1] : 0, scale: open ? 1 : 0.6 }}
          transition={{ ...SPRINGS.jelly, delay: open ? i * 0.045 : (options.length - 1 - i) * 0.03 }}
          // Closed, the shape stays under the plus (the neck grows from there) but the icon is hidden
          className={mergeButton}
          style={{
            position: "absolute",
            left: 180 - F / 2 - O / 2 - 8,
            top: 170 - F / 2 - O / 2 - 8,
            width: O,
            height: O,
            pointerEvents: open ? "auto" : "none",
          }}
        >
          <motion.span
            initial={false}
            animate={{ opacity: open ? 1 : 0 }}
            transition={{ duration: 0.15, delay: open ? 0.08 + i * 0.045 : 0 }}
            style={{ display: "grid" }}
          >
            {o.icon}
          </motion.span>
        </GlassMergeItem>
      ))}
      <GlassMergeItem
        as="button"
        type="button"
        aria-label={open ? "Close" : "Create"}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        whileTap={{ scale: 1.1 }}
        transition={SPRINGS.press}
        className={`${mergeButton} merge-btn--large`}
        style={{ position: "absolute", left: 180 - F - 8, top: 170 - F - 8, width: F, height: F }}
      >
        <motion.span
          animate={{ rotate: open ? 45 : 0 }}
          transition={SPRINGS.snap}
          style={{ display: "grid" }}
        >
          <Plus />
        </motion.span>
      </GlassMergeItem>
    </GlassMerge>
  );
}

/** Two drops that can be dragged together. */
function MergeDrops() {
  const a = { x: useMotionValue(40), y: useMotionValue(50) };
  const b = { x: useMotionValue(220), y: useMotionValue(60) };
  const pos = [a, b];
  const drag = useRef<{ i: number; sx: number; sy: number; x: number; y: number } | null>(null);
  return (
    <GlassMerge dir="ltr" className="drops">
      {pos.map((p, i) => (
        <GlassMergeItem
          key={i}
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            x: p.x,
            y: p.y,
            width: i ? 100 : 80,
            height: i ? 100 : 80,
            cursor: "grab",
          }}
          onPointerDown={(e) => {
            drag.current = { i, sx: e.clientX, sy: e.clientY, x: p.x.get(), y: p.y.get() };
            e.currentTarget.setPointerCapture(e.pointerId);
          }}
          onPointerMove={(e) => {
            const d = drag.current;
            if (!d || d.i !== i) return;
            p.x.set(d.x + e.clientX - d.sx);
            p.y.set(d.y + e.clientY - d.sy);
          }}
          onPointerUp={() => {
            drag.current = null;
          }}
          onPointerCancel={() => {
            drag.current = null;
          }}
        />
      ))}
      <span className="drops__hint">Drag the drops together</span>
    </GlassMerge>
  );
}

export function MergeDemos({ dark }: { dark: boolean }) {
  const line = dark ? "rgba(255,255,255,0.14)" : "rgba(0,0,0,0.13)";
  return (
    <div
      className="merge-stage"
      style={{
        backgroundColor: dark ? "#16181f" : "#e9eaee",
        backgroundImage: `linear-gradient(90deg, transparent 0 18%, rgba(47,124,246,0.9) 18% 30%, transparent 30% 58%, rgba(229,53,158,0.85) 58% 66%, transparent 66%),
          repeating-linear-gradient(90deg, ${line} 0 1px, transparent 1px 18px), repeating-linear-gradient(0deg, ${line} 0 1px, transparent 1px 18px)`,
      }}
    >
      <div className="merge-stage__left">
        <MergeToolbar />
        <MergeFab />
      </div>
      <MergeDrops />
    </div>
  );
}

/**
 * A lens that can be dragged anywhere. It stretches along its direction of motion and
 * settles like a drop when it stops; under the finger it rises and gets a rainbow rim.
 */
export function DraggableLens() {
  const x = useMotionValue(40);
  const y = useMotionValue(520);
  const lift = useMotionValue(1);
  // Start at the lower right on wide screens, away from the settings panel
  useEffect(() => {
    if (window.innerWidth < 900) return;
    x.set(window.innerWidth - 240);
    y.set(window.innerHeight - 280);
  }, [x, y]);
  const transform = useStretchTransform(x, y, lift);
  const irisAngle = useTransform([x, y], ([a, b]: number[]) => `${(a + b) * 0.8}deg`);
  const drag = useRef<{ sx: number; sy: number; x: number; y: number } | null>(null);
  const [held, setHeld] = useState(false);
  const release = () => {
    drag.current = null;
    animate(lift, 1, SPRINGS.snap);
    setHeld(false);
  };

  return (
    <div className="lens">
      <LiquidGlass
        radius="pill"
        elevation={2}
        lit={false}
        iridescent={held ? 1 : 0}
        className="lens__glass"
        style={{ transform, "--lg-iris-angle": irisAngle } as never}
        onPointerDown={(e) => {
          drag.current = { sx: e.clientX, sy: e.clientY, x: x.get(), y: y.get() };
          e.currentTarget.setPointerCapture(e.pointerId);
          // Rises slightly under the finger, like every other glass surface
          animate(lift, 1.08, SPRINGS.press);
          setHeld(true);
        }}
        onPointerMove={(e) => {
          const d = drag.current;
          if (!d) return;
          x.set(d.x + e.clientX - d.sx);
          y.set(d.y + e.clientY - d.sy);
        }}
        onPointerUp={release}
        onPointerCancel={release}
      />
      <motion.div style={{ x, y }}>
        <span className="lens__caption">Lens. Drag me.</span>
      </motion.div>
    </div>
  );
}
