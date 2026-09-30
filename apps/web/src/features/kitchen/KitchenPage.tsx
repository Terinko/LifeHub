import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus } from "lucide-react";
import type {
  GroceryItem,
  PantryItem,
  QuickMeal,
  SaveKitchenItem,
} from "@lifehub/shared";
import { Header } from "./components/chrome/Header";
import { Notice } from "./components/chrome/Notice";
import { RoundButton } from "./components/chrome/RoundButton";
import { TabBar, type Tab } from "./components/chrome/TabBar";
import { Toast } from "./components/chrome/Toast";
import { AddBar } from "./components/list/AddBar";
import { ListTab } from "./components/list/ListTab";
import { MealsTab } from "./components/meals/MealsTab";
import { PantryTab } from "./components/pantry/PantryTab";
import { ItemSheet } from "./components/sheets/ItemSheet";
import { MealSheet } from "./components/sheets/MealSheet";
import { useKitchen } from "./queries";
import { useEnamelBackground } from "./useEnamelBackground";
import { useKitchenChanges } from "./useKitchenChanges";
import styles from "./KitchenPage.module.css";

type Open =
  | { kind: "GROCERY" | "INVENTORY"; item: GroceryItem | PantryItem | null }
  | { kind: "QUICKMEAL"; item: QuickMeal | null }
  | null;

const TITLES: Record<Tab, string> = {
  list: "Kitchen",
  pantry: "Pantry",
  meals: "Meals",
};

export function KitchenPage() {
  const navigate = useNavigate();
  const kitchen = useKitchen();
  const changes = useKitchenChanges();
  useEnamelBackground();
  const [tab, setTab] = useState<Tab>("list");
  const [open, setOpen] = useState<Open>(null);
  const close = () => setOpen(null);

  const { groceries, pantry, meals } = useMemo(() => {
    const all = kitchen.data ?? [];
    return {
      groceries: all.filter((i): i is GroceryItem => i.pk === "GROCERY"),
      pantry: all.filter((i): i is PantryItem => i.pk === "INVENTORY"),
      meals: all.filter((i): i is QuickMeal => i.pk === "QUICKMEAL"),
    };
  }, [kitchen.data]);

  const toBuy = groceries.filter((g) => !g.inCart).length;
  const subtitle =
    tab === "list"
      ? `${toBuy} to buy`
      : tab === "pantry"
        ? `${pantry.length} item${pantry.length === 1 ? "" : "s"}`
        : "Log what you ate";

  const saveFromSheet = (item: SaveKitchenItem) => {
    const existing = open?.item;
    if (existing && item.sk)
      changes.update(item as typeof existing, existing, `${item.name} saved`);
    else changes.add(item, `${item.name} added`);
    close();
  };

  const newThing =
    tab === "pantry"
      ? () => setOpen({ kind: "INVENTORY", item: null })
      : tab === "meals"
        ? () => setOpen({ kind: "QUICKMEAL", item: null })
        : null;

  return (
    <div className={styles.page}>
      <Header
        title={TITLES[tab]}
        subtitle={kitchen.isSuccess ? subtitle : undefined}
        onBack={() => navigate("/")}
        action={
          newThing && (
            <RoundButton
              label={tab === "pantry" ? "Add to the pantry" : "New meal"}
              onClick={newThing}
            >
              <Plus size={22} strokeWidth={2.5} aria-hidden />
            </RoundButton>
          )
        }
      />

      <main
        className={`${styles.content} ${tab === "list" ? styles.withAddBar : ""}`}
      >
        {kitchen.isPending ? (
          <p className={styles.loading}>Opening the cupboards…</p>
        ) : kitchen.isError ? (
          <Notice
            tone="error"
            title="Couldn't load your kitchen"
            body={kitchen.error.message}
            action={{
              label: "Try again",
              onClick: () => void kitchen.refetch(),
            }}
          />
        ) : tab === "list" ? (
          <ListTab
            groceries={groceries}
            onToggle={changes.toggleCart}
            onOpen={(item) => setOpen({ kind: "GROCERY", item })}
            onPutAway={changes.putAway}
            busy={changes.busyPuttingAway}
          />
        ) : tab === "pantry" ? (
          <PantryTab
            pantry={pantry}
            groceries={groceries}
            onOpen={(item) => setOpen({ kind: "INVENTORY", item })}
            onAddToList={(p) =>
              changes.add(
                { pk: "GROCERY", name: p.name, quantity: 1, unit: p.unit },
                `${p.name} added to the list`,
              )
            }
            onNew={() => setOpen({ kind: "INVENTORY", item: null })}
          />
        ) : (
          <MealsTab
            meals={meals}
            pantry={pantry}
            onLog={(meal, items, reset) =>
              changes.logMeal(meal.name, items, reset)
            }
            onEdit={(meal) => setOpen({ kind: "QUICKMEAL", item: meal })}
            onNew={() => setOpen({ kind: "QUICKMEAL", item: null })}
          />
        )}
      </main>

      {tab === "list" && kitchen.isSuccess && (
        <AddBar
          onAdd={({ name, quantity, unit }) =>
            changes.add(
              { pk: "GROCERY", name, quantity, unit },
              `${name} added`,
            )
          }
        />
      )}
      <TabBar tab={tab} onChange={setTab} />
      <Toast
        toast={changes.toast}
        onDismiss={changes.dismiss}
        raised={tab === "list"}
      />

      {open && open.kind !== "QUICKMEAL" && (
        <ItemSheet
          key={open.item?.sk ?? "new"}
          kind={open.kind}
          item={open.item}
          onSave={saveFromSheet}
          onDelete={(item) => {
            changes.remove(item);
            close();
          }}
          onClose={close}
        />
      )}
      {open?.kind === "QUICKMEAL" && (
        <MealSheet
          key={open.item?.sk ?? "new"}
          meal={open.item}
          pantry={pantry}
          onSave={saveFromSheet}
          onDelete={(meal) => {
            changes.remove(meal);
            close();
          }}
          onClose={close}
        />
      )}
    </div>
  );
}
