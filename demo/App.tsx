import { useCallback, useEffect, useRef, useState } from "react";
import {
  Bell,
  CalendarDays,
  Check,
  CircleCheck,
  Copy,
  Ellipsis,
  House,
  LayoutGrid,
  Moon,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  SlidersHorizontal,
  Sun,
  Trash2,
  User,
} from "lucide-react";
import {
  GLASS_DEFAULTS,
  GLASS_PRESETS,
  GlassButton,
  GlassCard,
  GlassChip,
  GlassDialog,
  GlassIconButton,
  GlassInput,
  GlassMenu,
  GlassProvider,
  GlassSegmented,
  GlassSlider,
  GlassSwitch,
  GlassToast,
  LiquidGlass,
  supportsRefraction,
  type GlassMode,
  type GlassPresetName,
  type GlassSettings,
} from "liquid-glass-components";
import { BoardBackground, ColorfulBackground, TextBackground } from "./backgrounds";
import { CornerComparison, DraggableLens, MergeDemos, ShowcaseScene } from "./scenes";

const STORAGE_KEY = "liquid-glass-components-demo";
const REPO_URL = "https://github.com/alimohammad0816/liquid-glass-components";

type Background = "colorful" | "board" | "text";
type Direction = "ltr" | "rtl";

const percent = (v: number) => `${v}%`;
const pixels = (v: number) => `${v}px`;

function GitHubMark() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.1.79-.25.79-.56v-2c-3.2.7-3.87-1.37-3.87-1.37-.52-1.33-1.28-1.69-1.28-1.69-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.19 1.76 1.19 1.03 1.76 2.69 1.25 3.35.96.1-.74.4-1.25.73-1.54-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.28 1.19-3.09-.12-.29-.52-1.46.11-3.04 0 0 .97-.31 3.17 1.18a11 11 0 0 1 5.77 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.58.23 2.75.11 3.04.74.81 1.19 1.83 1.19 3.09 0 4.42-2.7 5.4-5.27 5.68.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5Z" />
    </svg>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="section">
      <GlassChip label={title} className="section__label" />
      {children}
    </section>
  );
}

export function App() {
  const [settings, setSettings] = useState<GlassSettings>(GLASS_DEFAULTS);
  const [mode, setMode] = useState<GlassMode>("light");
  const [dir, setDir] = useState<Direction>("ltr");
  const [bg, setBg] = useState<Background>("colorful");
  const [range, setRange] = useState("week");
  const [tab, setTab] = useState("home");
  const [notify, setNotify] = useState(true);
  const [autosave, setAutosave] = useState(false);
  const [progress, setProgress] = useState(62);
  const [query, setQuery] = useState("");
  const [dialog, setDialog] = useState(false);
  const [toast, setToast] = useState("");
  const loaded = useRef(false);
  const refracts = typeof navigator !== "undefined" && supportsRefraction();

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null");
      if (saved?.settings) setSettings({ ...GLASS_DEFAULTS, ...saved.settings });
      if (saved?.mode) setMode(saved.mode);
      if (saved?.bg) setBg(saved.bg);
      if (saved?.dir) setDir(saved.dir);
    } catch {
      // Private mode or blocked storage: continue with the defaults
    }
    // Query parameters win over stored values, so a configuration can be shared as a link
    const params = new URLSearchParams(window.location.search);
    const urlMode = params.get("mode");
    const urlDir = params.get("dir");
    const urlBg = params.get("bg");
    if (urlMode === "light" || urlMode === "dark") setMode(urlMode);
    if (urlDir === "ltr" || urlDir === "rtl") setDir(urlDir);
    if (urlBg === "colorful" || urlBg === "board" || urlBg === "text") setBg(urlBg);
    loaded.current = true;
  }, []);
  useEffect(() => {
    if (!loaded.current) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ settings, mode, bg, dir }));
    } catch {
      // Storage is a convenience only
    }
  }, [settings, mode, bg, dir]);

  const set =
    <K extends keyof GlassSettings>(key: K) =>
    (value: GlassSettings[K]) =>
      setSettings((s) => ({ ...s, [key]: value }));
  const clearToast = useCallback(() => setToast(""), []);
  const dark = mode === "dark";
  const applyPreset = (name: GlassPresetName) => setSettings((s) => ({ ...s, ...GLASS_PRESETS[name] }));

  return (
    <GlassProvider settings={settings} mode={mode} dir={dir} className="demo">
      <div className="demo__page">
        {bg === "colorful" && <ColorfulBackground dark={dark} />}
        {bg === "board" && <BoardBackground dark={dark} />}
        {bg === "text" && <TextBackground dark={dark} />}

        <header className="topbar">
          <LiquidGlass radius="pill" material="regular" className="brand">
            <span className="brand__mark" />
            <span className="brand__name">Liquid Glass</span>
          </LiquidGlass>
          <GlassInput
            icon={<Search />}
            placeholder="Search tasks, projects, people"
            aria-label="Search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="topbar__search"
          />
          <span className="topbar__spacer" />
          <GlassSegmented
            aria-label="Color scheme"
            size="sm"
            value={mode}
            onChange={setMode}
            options={[
              { value: "light", label: "Light", icon: <Sun /> },
              { value: "dark", label: "Dark", icon: <Moon /> },
            ]}
          />
          <GlassSegmented
            aria-label="Text direction"
            size="sm"
            value={dir}
            onChange={setDir}
            options={[
              { value: "ltr", label: "LTR" },
              { value: "rtl", label: "RTL" },
            ]}
          />
          <GlassIconButton label="Notifications" onClick={() => setToast("3 unread notifications")}>
            <Bell />
          </GlassIconButton>
          <GlassIconButton label="New task" onClick={() => setDialog(true)}>
            <Plus />
          </GlassIconButton>
          <GlassIconButton label="View on GitHub" onClick={() => window.open(REPO_URL, "_blank", "noopener")}>
            <GitHubMark />
          </GlassIconButton>
        </header>

        <main className="layout">
          <GlassCard
            className="settings"
            title="Glass settings"
            subtitle="Changes apply to every surface on the page"
            action={
              <GlassButton size="sm" startIcon={<RotateCcw />} onClick={() => setSettings(GLASS_DEFAULTS)}>
                Reset
              </GlassButton>
            }
          >
            <div className="stack">
              {!refracts && (
                <p className="notice">
                  This browser does not support SVG filters in <code>backdrop-filter</code>, so edge
                  refraction is disabled. Open the page in Chrome, Edge or another Chromium browser for the
                  full effect.
                </p>
              )}
              <div>
                <div className="field-label">Presets</div>
                <div className="presets">
                  {(Object.keys(GLASS_PRESETS) as GlassPresetName[]).map((name) => (
                    <GlassButton key={name} size="sm" onClick={() => applyPreset(name)}>
                      {name[0].toUpperCase() + name.slice(1)}
                    </GlassButton>
                  ))}
                </div>
              </div>
              <GlassSlider
                label="Transparency"
                value={settings.transparency}
                onChange={set("transparency")}
                format={percent}
              />
              <GlassSlider
                label="Blur"
                value={settings.blur}
                onChange={set("blur")}
                max={40}
                step={0.5}
                format={pixels}
              />
              <GlassSlider
                label="Edge refraction"
                value={settings.refraction}
                onChange={set("refraction")}
                format={percent}
              />
              <GlassSlider
                label="Dispersion"
                value={settings.chroma}
                onChange={set("chroma")}
                format={percent}
              />
              <GlassSlider
                label="Rim highlight"
                value={settings.specular}
                onChange={set("specular")}
                format={percent}
              />
              <GlassSlider
                label="Lens iridescence"
                value={settings.iridescence}
                onChange={set("iridescence")}
                format={percent}
              />
              <GlassSlider
                label="Merge stickiness"
                value={settings.mergeSmoothing}
                onChange={set("mergeSmoothing")}
                max={40}
                format={pixels}
              />
              <GlassSlider
                label="Backdrop saturation"
                value={settings.saturation}
                onChange={set("saturation")}
                min={100}
                max={250}
                format={percent}
              />
              <div>
                <div className="field-label">Corners</div>
                <GlassSegmented
                  aria-label="Corner shape"
                  size="sm"
                  value={settings.corners}
                  onChange={set("corners")}
                  options={[
                    { value: "continuous", label: "Continuous" },
                    { value: "circular", label: "Circular" },
                  ]}
                />
              </div>
              <GlassSwitch
                label="Light follows the pointer"
                checked={settings.dynamicLight}
                onChange={set("dynamicLight")}
              />
              <GlassSwitch
                label="Denser text surfaces"
                checked={settings.regularMaterial}
                onChange={set("regularMaterial")}
              />
              <div>
                <div className="field-label">Background</div>
                <GlassSegmented
                  aria-label="Background"
                  size="sm"
                  value={bg}
                  onChange={setBg}
                  options={[
                    { value: "colorful", label: "Colorful" },
                    { value: "board", label: "Board" },
                    { value: "text", label: "Text" },
                  ]}
                />
              </div>
            </div>
          </GlassCard>

          <div className="samples">
            <Section title="Reference scene">
              <ShowcaseScene dark={dark} />
            </Section>
            <Section title="Corners: circular and continuous">
              <CornerComparison dark={dark} />
            </Section>
            <Section title="Merging glass">
              <MergeDemos dark={dark} />
            </Section>

            <Section title="Buttons">
              <div className="row row--wrap">
                <GlassButton variant="tinted" startIcon={<Plus />} onClick={() => setDialog(true)}>
                  New task
                </GlassButton>
                <GlassButton>Save draft</GlassButton>
                <GlassButton size="sm">Small</GlassButton>
                <GlassButton size="lg" variant="tinted">
                  Large and tinted
                </GlassButton>
                <GlassIconButton label="Filters">
                  <SlidersHorizontal />
                </GlassIconButton>
                <GlassMenu
                  label="More"
                  icon={<Ellipsis />}
                  onSelect={(item) => setToast(`${item.label} selected`)}
                  items={[
                    { label: "Edit", icon: <Pencil /> },
                    { label: "Duplicate", icon: <Copy /> },
                    { label: "Delete", icon: <Trash2 />, danger: true },
                  ]}
                />
              </div>
            </Section>

            <Section title="Selection and switches">
              <div className="row row--wrap row--loose">
                <GlassSegmented
                  aria-label="Range"
                  value={range}
                  onChange={setRange}
                  options={[
                    { value: "day", label: "Day" },
                    { value: "week", label: "Week" },
                    { value: "month", label: "Month" },
                    { value: "quarter", label: "Quarter" },
                  ]}
                />
                {/* Directly on the background: the knobs become glass lenses (inside a card they stay white) */}
                <GlassSwitch label="Notifications" checked={notify} onChange={setNotify} />
                <GlassSwitch label="Autosave" checked={autosave} onChange={setAutosave} />
              </div>
            </Section>

            <Section title="Chips">
              <div className="row row--wrap">
                <GlassChip label="In progress" color="#8b5cf6" />
                <GlassChip label="Blocked" color="#ef4444" />
                <GlassChip label="Done" color="#10b981" />
                <GlassChip label="High priority" color="#f59e0b" />
                <GlassChip label="No color" />
              </div>
            </Section>

            <Section title="Cards">
              <div className="cards">
                <GlassCard
                  title="Design the sign-in screen"
                  subtitle="GL-0142, Design team"
                  action={<GlassChip label="In progress" color="#8b5cf6" />}
                >
                  <p className="card-text">
                    One-time password and social sign-in. The mobile layout has to fit a 360 px viewport
                    without horizontal scrolling.
                  </p>
                  <GlassSlider label="Progress" value={progress} onChange={setProgress} format={percent} />
                  <div className="row row--top">
                    <GlassButton size="sm">Comments (4)</GlassButton>
                    <GlassButton size="sm" startIcon={<CalendarDays />}>
                      Log time
                    </GlassButton>
                  </div>
                </GlassCard>
                <GlassCard title="Week summary" subtitle="Mar 12 to Mar 18">
                  {(
                    [
                      ["Completed", 18, "#10b981"],
                      ["In progress", 7, "#8b5cf6"],
                      ["Blocked", 2, "#ef4444"],
                    ] as const
                  ).map(([label, count, color]) => (
                    <div key={label} className="stat">
                      <span className="stat__dot" style={{ backgroundColor: color }} />
                      <span className="stat__label">{label}</span>
                      <span className="stat__count">{count}</span>
                    </div>
                  ))}
                </GlassCard>
              </div>
            </Section>
          </div>
        </main>

        <nav className="tabbar" aria-label="Primary">
          <GlassSegmented
            stacked
            aria-label="Navigation"
            value={tab}
            onChange={setTab}
            options={[
              { value: "home", label: "Home", icon: <House /> },
              { value: "board", label: "Board", icon: <LayoutGrid /> },
              { value: "done", label: "Done", icon: <CircleCheck /> },
              { value: "me", label: "Me", icon: <User /> },
            ]}
          />
        </nav>

        <DraggableLens />

        <GlassDialog
          open={dialog}
          onClose={() => setDialog(false)}
          title="Create a new task"
          actions={
            <>
              <GlassButton onClick={() => setDialog(false)}>Cancel</GlassButton>
              <GlassButton
                variant="tinted"
                onClick={() => {
                  setDialog(false);
                  setToast("Task created");
                }}
              >
                Create
              </GlassButton>
            </>
          }
        >
          This dialog is glass too. The page behind it dims slightly to keep the text legible, and the buttons
          inside it are glass like everything else.
        </GlassDialog>
        <GlassToast message={toast} icon={<Check />} onDone={clearToast} />
      </div>
    </GlassProvider>
  );
}
