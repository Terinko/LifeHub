import { normalizeName, type PantryLocation } from "@lifehub/shared";

// Guesses for where things live, so a new list or pantry needs no sorting.
// People can always move an item; these are only the starting point.

export const AISLES = [
  "Produce",
  "Meat & fish",
  "Dairy & eggs",
  "Bakery",
  "Frozen",
  "Shelf",
  "Drinks",
  "Household",
  "Other",
] as const;
export type Aisle = (typeof AISLES)[number];

const AISLE_WORDS: [Aisle, string[]][] = [
  ["Frozen", ["frozen", "ice cream", "popsicle", "waffle"]],
  [
    "Produce",
    [
      "apple",
      "banana",
      "berry",
      "strawberry",
      "blueberry",
      "grape",
      "lemon",
      "lime",
      "orange",
      "avocado",
      "tomato",
      "potato",
      "onion",
      "garlic",
      "pepper",
      "carrot",
      "celery",
      "lettuce",
      "spinach",
      "kale",
      "broccoli",
      "cucumber",
      "zucchini",
      "mushroom",
      "herb",
      "cilantro",
      "parsley",
      "basil",
      "ginger",
      "salad",
      "corn",
      "squash",
      "cabbage",
      "peach",
      "pear",
      "melon",
      "mango",
      "pineapple",
    ],
  ],
  [
    "Meat & fish",
    [
      "chicken",
      "beef",
      "steak",
      "pork",
      "bacon",
      "sausage",
      "ham",
      "turkey",
      "salmon",
      "tuna",
      "shrimp",
      "fish",
      "lamb",
      "ground",
    ],
  ],
  [
    "Dairy & eggs",
    [
      "milk",
      "egg",
      "cheese",
      "yogurt",
      "butter",
      "cream",
      "sour cream",
      "cottage",
      "half and half",
    ],
  ],
  [
    "Bakery",
    [
      "bread",
      "bagel",
      "bun",
      "roll",
      "tortilla",
      "muffin",
      "croissant",
      "pita",
    ],
  ],
  [
    "Drinks",
    [
      "coffee",
      "tea",
      "juice",
      "soda",
      "water",
      "beer",
      "wine",
      "seltzer",
      "kombucha",
    ],
  ],
  [
    "Household",
    [
      "paper towel",
      "toilet paper",
      "soap",
      "detergent",
      "trash bag",
      "foil",
      "wrap",
      "sponge",
      "napkin",
      "shampoo",
      "toothpaste",
    ],
  ],
  [
    "Shelf",
    [
      "rice",
      "pasta",
      "noodle",
      "flour",
      "sugar",
      "oil",
      "vinegar",
      "salt",
      "spice",
      "sauce",
      "bean",
      "soup",
      "cereal",
      "oat",
      "peanut butter",
      "jam",
      "honey",
      "cracker",
      "chip",
      "nut",
      "broth",
      "can",
      "syrup",
      "ketchup",
      "mustard",
      "mayo",
      "protein",
    ],
  ],
];

const LOCATION_WORDS: [PantryLocation, string[]][] = [
  ["freezer", ["frozen", "ice cream", "popsicle"]],
  [
    "fridge",
    [
      "milk",
      "egg",
      "cheese",
      "yogurt",
      "butter",
      "cream",
      "chicken",
      "beef",
      "steak",
      "pork",
      "bacon",
      "sausage",
      "ham",
      "turkey",
      "salmon",
      "fish",
      "shrimp",
      "tofu",
      "lettuce",
      "spinach",
      "kale",
      "berry",
      "strawberry",
      "blueberry",
      "juice",
      "hummus",
      "salsa",
      "ground",
      "deli",
      "celery",
      "carrot",
      "broccoli",
      "cucumber",
      "herb",
      "cilantro",
      "parsley",
    ],
  ],
];

/** Whole-word match, so "oil" doesn't hit "boil". */
const has = (name: string, word: string) =>
  new RegExp(`(^|\\s)${word}(s|es)?(\\s|$)`).test(name);

/** The group whose longest matching word is longest, so "peanut butter" beats "butter". */
function guess<T>(name: string, table: [T, string[]][], fallback: T): T {
  const n = normalizeName(name);
  let best: { group: T; length: number } | null = null;
  for (const [group, words] of table) {
    for (const w of words) {
      if (has(n, w) && w.length > (best?.length ?? 0))
        best = { group, length: w.length };
    }
  }
  return best?.group ?? fallback;
}

export const guessAisle = (name: string): Aisle =>
  guess(name, AISLE_WORDS, "Other");

export const guessLocation = (name: string): PantryLocation =>
  guess(name, LOCATION_WORDS, "shelf");

export const LOCATION_LABELS: Record<PantryLocation, string> = {
  fridge: "Fridge",
  freezer: "Freezer",
  shelf: "Shelf",
};
