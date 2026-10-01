/** Backgrounds the glass sits on. Refraction is most visible over colors and fine lines. */

const BLOBS = [
  { c: "#ff5f9e", x: "8%", y: "6%", s: 520, d: 18 },
  { c: "#4f7cff", x: "58%", y: "2%", s: 600, d: 22 },
  { c: "#ffcf3f", x: "70%", y: "48%", s: 460, d: 20 },
  { c: "#2fd6a3", x: "4%", y: "58%", s: 540, d: 24 },
  { c: "#a45bff", x: "36%", y: "80%", s: 500, d: 19 },
];

export function ColorfulBackground({ dark }: { dark: boolean }) {
  return (
    <div className="bg" style={{ backgroundColor: dark ? "#0b0d14" : "#eef1f8" }}>
      {BLOBS.map((b, i) => (
        <div
          key={i}
          className="bg__blob"
          style={{
            left: b.x,
            top: b.y,
            width: b.s,
            height: b.s,
            background: `radial-gradient(circle, ${b.c} 0%, transparent 68%)`,
            opacity: dark ? 0.75 : 0.9,
            animation: `drift ${b.d}s ease-in-out infinite`,
            animationDelay: `${-i * 3}s`,
          }}
        />
      ))}
      {/* Fine lines: edge refraction is easiest to see where it bends them */}
      <div
        className="bg__grid"
        style={{
          opacity: dark ? 0.16 : 0.13,
          backgroundImage: `repeating-linear-gradient(90deg, ${dark ? "#fff" : "#000"} 0 1px, transparent 1px 28px),
            repeating-linear-gradient(0deg, ${dark ? "#fff" : "#000"} 0 1px, transparent 1px 28px)`,
        }}
      />
      <div className="bg__word" style={{ color: dark ? "rgba(255,255,255,0.10)" : "rgba(12,19,34,0.08)" }}>
        glass
      </div>
    </div>
  );
}

const COLUMNS = [
  { title: "Backlog", color: "#3b82f6" },
  { title: "In progress", color: "#8b5cf6" },
  { title: "Blocked", color: "#f59e0b" },
  { title: "Review", color: "#ef4444" },
  { title: "Done", color: "#10b981" },
];
const TASKS = [
  "Design the sign-in screen",
  "Fix mention parsing",
  "Monthly sales report",
  "Review the contract",
  "Database migration",
  "Write the API docs",
  "Customer call",
  "Optimize images",
  "Server load test",
  "New icon set",
];

/** A dense, busy interface: the hardest background for legibility. */
export function BoardBackground({ dark }: { dark: boolean }) {
  const card = dark ? "#1a1d27" : "#ffffff";
  const text = dark ? "#e8ebf2" : "#1f2433";
  return (
    <div className="bg bg--board" style={{ backgroundColor: dark ? "#0f1118" : "#f2f4f9" }}>
      <div className="board">
        {COLUMNS.map((col, ci) => (
          <div key={col.title}>
            <div className="board__bar" style={{ backgroundColor: col.color }} />
            <div className="board__title" style={{ color: text }}>
              {col.title}
            </div>
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className="board__card" style={{ backgroundColor: card }}>
                <span className="board__tag" style={{ color: col.color, backgroundColor: `${col.color}22` }}>
                  GL-{ci}
                  {i}
                </span>
                <div className="board__task" style={{ color: text }}>
                  {TASKS[(ci * 3 + i) % TASKS.length]}
                </div>
                <div className="board__avatars">
                  {[col.color, "#f472b6", "#22d3ee"].slice(0, (i % 3) + 1).map((c) => (
                    <span key={c} style={{ backgroundColor: c }} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

const PARAGRAPH =
  "Glass is flat in the middle and only bends light near its rim, where the surface curves. The refraction on these controls is computed from the shape of each surface, so the edge shows the content behind it inverted and compressed, exactly like a thick convex lens. ";

export function TextBackground({ dark }: { dark: boolean }) {
  return (
    <div className="bg bg--text" style={{ backgroundColor: dark ? "#101218" : "#fbfaf7" }}>
      {Array.from({ length: 30 }).map((_, i) => (
        <p
          key={i}
          className={i % 7 === 0 ? "bg__heading" : "bg__paragraph"}
          style={{ color: dark ? "#d6d9e2" : "#262b36" }}
        >
          {i % 7 === 0 ? `Section ${i / 7 + 1}: how edges bend light` : PARAGRAPH.repeat(2)}
        </p>
      ))}
    </div>
  );
}
