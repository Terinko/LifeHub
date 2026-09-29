import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { Sheet } from "./Sheet";

describe("Sheet", () => {
  it("closes when pulled down by the grabber", () => {
    vi.useFakeTimers();
    const onClose = vi.fn();
    render(
      <Sheet title="Phone" onClose={onClose}>
        <p>Body</p>
      </Sheet>,
    );
    const title = screen.getByRole("heading", { name: "Phone" });
    fireEvent.mouseDown(title, { button: 0, clientX: 100, clientY: 100 });
    fireEvent.mouseMove(window, { clientX: 100, clientY: 160 });
    fireEvent.mouseMove(window, { clientX: 100, clientY: 260 });
    fireEvent.mouseUp(window);
    vi.advanceTimersByTime(200);
    expect(onClose).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });

  it("snaps back after a short pull", () => {
    vi.useFakeTimers();
    const onClose = vi.fn();
    render(
      <Sheet title="Phone" onClose={onClose}>
        <p>Body</p>
      </Sheet>,
    );
    const title = screen.getByRole("heading", { name: "Phone" });
    fireEvent.mouseDown(title, { button: 0, clientX: 100, clientY: 100 });
    vi.advanceTimersByTime(500);
    fireEvent.mouseMove(window, { clientX: 100, clientY: 130 });
    vi.advanceTimersByTime(500);
    fireEvent.mouseMove(window, { clientX: 100, clientY: 140 });
    fireEvent.mouseUp(window);
    vi.advanceTimersByTime(300);
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog").style.transform).toBe("");
    vi.useRealTimers();
  });

  it("closes with the X and Escape", () => {
    const onClose = vi.fn();
    render(
      <Sheet title="Phone" onClose={onClose}>
        <p>Body</p>
      </Sheet>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});
