import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import {
  GlassButton,
  GlassDialog,
  GlassIconButton,
  GlassMenu,
  GlassProvider,
  GlassSegmented,
  GlassSlider,
  GlassSwitch,
  GlassToast,
  useGlassSettings,
} from "../src";

const wrap = (ui: React.ReactElement, props: React.ComponentProps<typeof GlassProvider> = {}) =>
  render(<GlassProvider {...props}>{ui}</GlassProvider>);

describe("GlassProvider", () => {
  it("exposes the resolved mode and direction through context", () => {
    function Probe() {
      const { mode, dir, transparency } = useGlassSettings();
      return <span data-testid="probe">{`${mode}/${dir}/${transparency}`}</span>;
    }
    wrap(<Probe />, { mode: "dark", dir: "rtl", settings: { transparency: 50 } });
    expect(screen.getByTestId("probe")).toHaveTextContent("dark/rtl/50");
  });

  it("writes the settings as CSS custom properties", () => {
    const { container } = wrap(<span />, { settings: { transparency: 80, blur: 5, saturation: 140 } });
    const root = container.firstElementChild as HTMLElement;
    expect(root).toHaveClass("lg-root");
    expect(root.style.getPropertyValue("--lg-clear")).toBe("0.8");
    expect(root.style.getPropertyValue("--lg-blur")).toBe("5px");
    expect(root.style.getPropertyValue("--lg-sat")).toBe("140%");
  });

  it("applies the accent color", () => {
    const { container } = wrap(<span />, { accent: "#ff0066" });
    expect((container.firstElementChild as HTMLElement).style.getPropertyValue("--lg-accent")).toBe(
      "#ff0066",
    );
  });
});

describe("GlassButton", () => {
  it("renders a button and handles clicks", async () => {
    const onClick = vi.fn();
    wrap(<GlassButton onClick={onClick}>Save</GlassButton>);
    await userEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("does not click while disabled", async () => {
    const onClick = vi.fn();
    wrap(
      <GlassButton disabled onClick={onClick}>
        Save
      </GlassButton>,
    );
    await userEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(onClick).not.toHaveBeenCalled();
  });

  it("labels an icon button for assistive technology", () => {
    wrap(<GlassIconButton label="Filters">x</GlassIconButton>);
    expect(screen.getByRole("button", { name: "Filters" })).toBeInTheDocument();
  });
});

describe("GlassSwitch", () => {
  function Harness() {
    const [on, setOn] = useState(false);
    return <GlassSwitch label="Notifications" checked={on} onChange={setOn} />;
  }

  it("toggles with the keyboard", async () => {
    wrap(<Harness />);
    const toggle = screen.getByRole("switch", { name: "Notifications" });
    expect(toggle).toHaveAttribute("aria-checked", "false");
    toggle.focus();
    await userEvent.keyboard(" ");
    expect(toggle).toHaveAttribute("aria-checked", "true");
    await userEvent.keyboard("{Enter}");
    expect(toggle).toHaveAttribute("aria-checked", "false");
  });

  it("toggles when the label is clicked", async () => {
    wrap(<Harness />);
    await userEvent.click(screen.getByText("Notifications"));
    expect(screen.getByRole("switch")).toHaveAttribute("aria-checked", "true");
  });
});

describe("GlassSlider", () => {
  it("reports changes of the native range input", () => {
    const onChange = vi.fn();
    wrap(<GlassSlider label="Blur" value={10} onChange={onChange} format={(v) => `${v}px`} />);
    const input = screen.getByRole("slider", { name: "Blur" });
    expect(screen.getByText("10px")).toBeInTheDocument();
    act(() => {
      // React tracks the value of controlled inputs, so the native setter is required
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(input, "42");
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
    expect(onChange).toHaveBeenCalledWith(42);
  });
});

describe("GlassSegmented", () => {
  const options = [
    { value: "day", label: "Day" },
    { value: "week", label: "Week" },
    { value: "month", label: "Month" },
  ];

  function Harness({ dir }: { dir?: "ltr" | "rtl" }) {
    const [value, setValue] = useState("week");
    return (
      <GlassProvider dir={dir}>
        <GlassSegmented aria-label="Range" options={options} value={value} onChange={setValue} />
      </GlassProvider>
    );
  }

  it("exposes a radio group with the selection", () => {
    render(<Harness />);
    expect(screen.getByRole("radiogroup", { name: "Range" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Week" })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("radio", { name: "Day" })).toHaveAttribute("aria-checked", "false");
  });

  it("selects on click", async () => {
    render(<Harness />);
    await userEvent.click(screen.getByRole("radio", { name: "Month" }));
    expect(screen.getByRole("radio", { name: "Month" })).toHaveAttribute("aria-checked", "true");
  });

  it("moves the selection with the arrow keys", async () => {
    render(<Harness />);
    screen.getByRole("radio", { name: "Week" }).focus();
    await userEvent.keyboard("{ArrowRight}");
    expect(screen.getByRole("radio", { name: "Month" })).toHaveAttribute("aria-checked", "true");
    await userEvent.keyboard("{Home}");
    expect(screen.getByRole("radio", { name: "Day" })).toHaveAttribute("aria-checked", "true");
  });

  it("reverses the arrow keys in right to left layouts", async () => {
    render(<Harness dir="rtl" />);
    screen.getByRole("radio", { name: "Week" }).focus();
    await userEvent.keyboard("{ArrowLeft}");
    expect(screen.getByRole("radio", { name: "Month" })).toHaveAttribute("aria-checked", "true");
  });
});

describe("GlassMenu", () => {
  it("opens, selects an item and closes", async () => {
    const onSelect = vi.fn();
    wrap(
      <GlassMenu
        label="More"
        items={[{ label: "Edit" }, { label: "Delete", danger: true }]}
        onSelect={onSelect}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: "More" }));
    expect(screen.getByRole("menu")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("menuitem", { name: "Delete" }));
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ label: "Delete" }));
  });

  it("closes with Escape", async () => {
    wrap(<GlassMenu label="More" items={[{ label: "Edit" }]} />);
    await userEvent.click(screen.getByRole("button", { name: "More" }));
    await userEvent.keyboard("{Escape}");
    expect(await screen.findByRole("button", { name: "More" })).toBeInTheDocument();
  });
});

describe("GlassDialog", () => {
  it("is labelled by its title and closes with Escape", async () => {
    const onClose = vi.fn();
    wrap(
      <GlassDialog open onClose={onClose} title="Create task">
        Body
      </GlassDialog>,
    );
    expect(screen.getByRole("dialog", { name: "Create task" })).toHaveAttribute("aria-modal", "true");
    await userEvent.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("moves focus into the dialog and keeps it there", async () => {
    wrap(
      <GlassDialog open title="Create task" actions={<GlassButton>Cancel</GlassButton>}>
        Body
      </GlassDialog>,
    );
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveFocus();
    await userEvent.tab();
    expect(screen.getByRole("button", { name: "Cancel" })).toHaveFocus();
    await userEvent.tab();
    expect(screen.getByRole("button", { name: "Cancel" })).toHaveFocus();
  });

  it("renders nothing when closed", () => {
    wrap(<GlassDialog open={false} title="Create task" />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});

describe("GlassToast", () => {
  it("shows the message in a live region and reports completion", () => {
    vi.useFakeTimers();
    const onDone = vi.fn();
    wrap(<GlassToast message="Saved" onDone={onDone} duration={1000} />);
    expect(screen.getByRole("status")).toHaveTextContent("Saved");
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(onDone).toHaveBeenCalledOnce();
    vi.useRealTimers();
  });
});
