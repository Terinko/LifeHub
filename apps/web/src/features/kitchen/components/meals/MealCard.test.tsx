import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import type { PantryItem, QuickMeal } from "@lifehub/shared";
import { MealCard } from "./MealCard";

const meal: QuickMeal = {
  pk: "QUICKMEAL",
  sk: "m",
  name: "Breakfast",
  items: [{ pantrySk: "p", name: "Eggs", quantity: 2, unit: "" }],
};
const pantry: PantryItem[] = [
  { pk: "INVENTORY", sk: "p", name: "Eggs", currentQuantity: 2, unit: "" },
];

describe("MealCard", () => {
  it("logs today's amounts and warns when there isn't enough", () => {
    const onLog = vi.fn();
    render(
      <MealCard meal={meal} pantry={pantry} onLog={onLog} onEdit={vi.fn()} />,
    );
    expect(screen.getByText("2 in pantry")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "More Eggs" }));
    expect(screen.getByText("Only 2 in pantry")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Ate it" }));
    expect(onLog.mock.calls[0]?.[1]).toEqual([
      { pantrySk: "p", name: "Eggs", quantity: 3, unit: "" },
    ]);
  });
});
