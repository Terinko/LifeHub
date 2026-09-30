import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import type { GroceryItem } from "@lifehub/shared";
import { ListTab } from "./ListTab";

const g = (
  sk: string,
  name: string,
  extra: Partial<GroceryItem> = {},
): GroceryItem => ({
  pk: "GROCERY",
  sk,
  name,
  quantity: 1,
  unit: "",
  ...extra,
});

describe("ListTab", () => {
  it("groups by aisle and gathers checked-off items in the cart", () => {
    const onPutAway = vi.fn();
    const cart = [
      g("3", "Coffee", { inCart: true }),
      g("4", "Eggs", { inCart: true }),
    ];
    render(
      <ListTab
        groceries={[
          g("1", "Bananas"),
          g("2", "Milk", { unit: "gal" }),
          ...cart,
        ]}
        onToggle={vi.fn()}
        onOpen={vi.fn()}
        onPutAway={onPutAway}
        busy={false}
      />,
    );
    expect(
      within(screen.getByRole("region", { name: "Produce" })).getByText(
        "Bananas",
      ),
    ).toBeInTheDocument();
    expect(
      within(screen.getByRole("region", { name: "Dairy & eggs" })).getByText(
        "1 gal",
      ),
    ).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", { name: "Put all 2 away in the pantry" }),
    );
    expect(onPutAway).toHaveBeenCalledWith(cart);
  });

  it("checks off with the box and opens with the name", () => {
    const onToggle = vi.fn();
    const onOpen = vi.fn();
    const item = g("1", "Bananas");
    render(
      <ListTab
        groceries={[item]}
        onToggle={onToggle}
        onOpen={onOpen}
        onPutAway={vi.fn()}
        busy={false}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Check off Bananas" }));
    fireEvent.click(screen.getByRole("button", { name: "Bananas" }));
    expect(onToggle).toHaveBeenCalledWith(item);
    expect(onOpen).toHaveBeenCalledWith(item);
  });
});
