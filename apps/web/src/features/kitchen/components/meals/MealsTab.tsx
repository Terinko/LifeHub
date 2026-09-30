import type { MealItem, PantryItem, QuickMeal } from "@lifehub/shared";
import { Notice } from "../chrome/Notice";
import { MealCard } from "./MealCard";
import styles from "./MealsTab.module.css";

type Props = {
  meals: QuickMeal[];
  pantry: PantryItem[];
  onLog: (meal: QuickMeal, items: MealItem[], reset: () => void) => void;
  onEdit: (meal: QuickMeal) => void;
  onNew: () => void;
};

export function MealsTab({ meals, pantry, onLog, onEdit, onNew }: Props) {
  if (!meals.length) {
    return (
      <Notice
        title="No meals yet"
        body="Save the things you make often, like breakfast. Tapping Ate it takes the amounts out of your pantry."
        action={{ label: "New meal", onClick: onNew }}
      />
    );
  }
  const sorted = [...meals].sort((a, b) => a.name.localeCompare(b.name));
  return (
    <div className={styles.tab}>
      {sorted.map((m) => (
        <MealCard
          key={`${m.sk}:${JSON.stringify(m.items)}`}
          meal={m}
          pantry={pantry}
          onLog={onLog}
          onEdit={onEdit}
        />
      ))}
    </div>
  );
}
