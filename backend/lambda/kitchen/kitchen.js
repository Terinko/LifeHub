/* eslint-disable preserve-caught-error */
/* eslint-disable no-unused-vars */
/* eslint-disable no-undef */
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const {
  DynamoDBDocumentClient,
  ScanCommand,
  PutCommand,
  DeleteCommand,
} = require("@aws-sdk/lib-dynamodb");
const crypto = require("crypto");

const client = new DynamoDBClient({});
const dynamo = DynamoDBDocumentClient.from(client);
const TABLE_NAME = process.env.TABLE_NAME;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// ==========================================
// UNIT CONVERSION + PANTRY MATH
// (pure functions, no network calls — this is what makes
// "Can I make this?" fast: it's just arithmetic now.)
// ==========================================

const UNIT_ALIASES = {
  cup: "cup",
  cups: "cup",
  tbsp: "tbsp",
  tablespoon: "tbsp",
  tablespoons: "tbsp",
  tsp: "tsp",
  teaspoon: "tsp",
  teaspoons: "tsp",
  "fl oz": "fl_oz",
  fl_oz: "fl_oz",
  "fluid ounce": "fl_oz",
  "fluid ounces": "fl_oz",
  oz: "oz",
  ounce: "oz",
  ounces: "oz",
  lb: "lb",
  lbs: "lb",
  pound: "lb",
  pounds: "lb",
  g: "g",
  gram: "g",
  grams: "g",
  kg: "kg",
  kilogram: "kg",
  kilograms: "kg",
  ml: "ml",
  milliliter: "ml",
  milliliters: "ml",
  l: "l",
  liter: "l",
  liters: "l",
  litre: "l",
  litres: "l",
  pinch: "pinch",
  pinches: "pinch",
};

// Everything in each group converts through a common base unit.
const VOLUME_TO_ML = {
  cup: 236.588,
  tbsp: 14.7868,
  tsp: 4.92892,
  fl_oz: 29.5735,
  ml: 1,
  l: 1000,
};
const WEIGHT_TO_G = { oz: 28.3495, lb: 453.592, g: 1, kg: 1000 };

function normalizeUnit(unit) {
  if (!unit) return "item";
  const key = unit.toString().trim().toLowerCase();
  return UNIT_ALIASES[key] || key;
}

function normalizeName(name) {
  return (name || "").toString().trim().toLowerCase().replace(/s$/, ""); // crude singularize, good enough for pantry matching
}

// Converts a quantity between units IF they're in the same measurement
// system (volume<->volume or weight<->weight). Returns null if the units
// aren't comparable without ingredient-specific density data (e.g. cups of
// flour vs grams of flour) — callers should treat null as "can't verify
// automatically" rather than silently guessing.
function convertUnit(quantity, fromUnit, toUnit) {
  const from = normalizeUnit(fromUnit);
  const to = normalizeUnit(toUnit);
  if (from === to) return quantity;
  if (VOLUME_TO_ML[from] && VOLUME_TO_ML[to]) {
    return (quantity * VOLUME_TO_ML[from]) / VOLUME_TO_ML[to];
  }
  if (WEIGHT_TO_G[from] && WEIGHT_TO_G[to]) {
    return (quantity * WEIGHT_TO_G[from]) / WEIGHT_TO_G[to];
  }
  return null;
}

// Finds the best-guess inventory item for a recipe ingredient name.
// Exact normalized match first, then a loose substring match
// ("butter" matches "unsalted butter").
function findInventoryMatch(name, inventory) {
  const target = normalizeName(name);
  return (
    inventory.find((i) => normalizeName(i.name) === target) ||
    inventory.find((i) => {
      const invName = normalizeName(i.name);
      return invName.includes(target) || target.includes(invName);
    })
  );
}

function round2(n) {
  return Math.round(n * 100) / 100;
}

// The core "can I make this?" logic. Pure, synchronous, no I/O — this is
// what used to be a Gemini prompt. `multiplier` scales the recipe
// (0.5 = half portions, 2 = double, etc).
function checkPantry(requiredIngredients, inventory, multiplier) {
  const scaledRequired = requiredIngredients.map((ing) => ({
    name: ing.name,
    unit: ing.unit,
    quantity: round2(ing.quantity * multiplier),
  }));

  const missingIngredients = [];
  const updatedInventory = [];
  let canMake = true;

  for (const req of scaledRequired) {
    const match = findInventoryMatch(req.name, inventory);

    if (!match) {
      canMake = false;
      missingIngredients.push(req);
      continue;
    }

    const have = convertUnit(match.currentQuantity, match.unit, req.unit);

    if (have === null) {
      // Units aren't automatically comparable (e.g. inventory has "2 cups"
      // but the recipe needs "grams"). Flag it rather than guess.
      canMake = false;
      missingIngredients.push({
        ...req,
        note: `check manually (have ${match.currentQuantity} ${match.unit})`,
      });
      continue;
    }

    if (have < req.quantity) {
      canMake = false;
      missingIngredients.push({
        name: req.name,
        quantity: round2(req.quantity - have),
        unit: req.unit,
      });
      updatedInventory.push({ sk: match.sk, currentQuantity: 0 });
    } else {
      const remaining = have - req.quantity;
      const remainingInOriginalUnit = convertUnit(
        remaining,
        req.unit,
        match.unit,
      );
      updatedInventory.push({
        sk: match.sk,
        currentQuantity: round2(remainingInOriginalUnit),
      });
    }
  }

  return {
    canMake,
    requiredIngredients: scaledRequired,
    updatedInventory,
    missingIngredients,
  };
}

// ==========================================
// GEMINI CALLS
// Two distinct jobs, kept separate on purpose:
//  - parseIngredientsWithGemini: freeform text -> structured data.
//    Runs ONCE, when a recipe is saved.
//  - legacyCheckWithGemini: fallback for recipes saved before this
//    structured-parsing change existed (no `ingredients` field yet).
// ==========================================

async function parseIngredientsWithGemini(ingredientsText) {
  const promptText = `
    Extract each ingredient from this recipe's ingredients list into structured data.
    Use one of these units where possible: cup, tbsp, tsp, fl_oz, oz, lb, g, kg, ml, l.
    For whole/countable items with no measurement (e.g. "2 eggs", "1 onion"), use unit "item".

    Ingredients list:
    ${ingredientsText}
  `;

  const geminiRes = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: promptText }] }],
        generationConfig: {
          // Pure extraction task — low thinking is faster and this doesn't
          // need deep reasoning.
          thinkingConfig: { thinkingLevel: "low" },
          maxOutputTokens: 1024,
          responseMimeType: "application/json",
          responseSchema: {
            type: "ARRAY",
            items: {
              type: "OBJECT",
              properties: {
                name: { type: "STRING" },
                quantity: { type: "NUMBER" },
                unit: { type: "STRING" },
              },
            },
          },
        },
      }),
    },
  );

  const geminiData = await geminiRes.json();

  if (geminiData.error || !geminiData.candidates) {
    console.error(
      "🚨 GEMINI PARSE ERROR:",
      JSON.stringify(geminiData.error || geminiData),
    );
    return [];
  }

  try {
    const text = geminiData.candidates[0].content.parts[0].text;
    return JSON.parse(text);
  } catch (err) {
    console.error("🚨 PARSE RESPONSE WAS NOT JSON");
    return [];
  }
}

// Old behavior, kept only as a fallback for recipes saved before structured
// ingredients existed (no `recipe.ingredients` on the item yet).
async function legacyCheckWithGemini(recipe, inventory, multiplier) {
  const promptText = `
    You are a strict, mathematical kitchen assistant. The user wants to know if they can cook "${recipe.name}" at ${multiplier}x the normal recipe quantities.

    Here is the exact ingredients list for the recipe:
    ${recipe.ingredientsText}

    Here is the user's current inventory:
    ${JSON.stringify(inventory)}

    Task:
    1. Extract the required ingredients STRICTLY from the recipe ingredients list, then multiply every quantity by ${multiplier}.
    2. Match those to the inventory items. Handle standard unit conversions (e.g., cups to oz, lbs to oz, etc.).
    3. Determine if the user has enough of EVERY ingredient. If they are missing even a fraction of an ingredient, canMake is false.
    4. Deduct the required quantities from the inventory to calculate updatedInventory. If an inventory item reaches 0 or less, mark it to be removed.
    5. Calculate exactly what is missing and list it in missingIngredients.

    Return ONLY valid, raw JSON (no markdown formatting, no code blocks, no backticks). It must match this exact schema:
    {
      "canMake": boolean,
      "requiredIngredients": [
        { "name": "ingredient_name", "quantity": number, "unit": "unit_string" }
      ],
      "updatedInventory": [
        { "sk": "inventory_item_sk", "currentQuantity": number_remaining }
      ],
      "missingIngredients": [
        { "name": "ingredient_name", "quantity": number, "unit": "unit_string" }
      ]
    }
  `;

  const geminiRes = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: promptText }] }],
        generationConfig: {
          thinkingConfig: { thinkingLevel: "low" },
          maxOutputTokens: 2048,
          responseMimeType: "application/json",
        },
      }),
    },
  );

  const geminiData = await geminiRes.json();

  if (geminiData.error || !geminiData.candidates) {
    console.error(
      "🚨 GEMINI API ERROR:",
      JSON.stringify(geminiData.error || geminiData),
    );
    throw new Error(
      geminiData.error?.message || "Gemini API rejected the request.",
    );
  }

  let aiResultText = geminiData.candidates[0].content.parts[0].text;
  aiResultText = aiResultText
    .replace(/```json/gi, "")
    .replace(/```/gi, "")
    .trim();

  try {
    return JSON.parse(aiResultText);
  } catch (err) {
    console.error("🚨 AI RESPONSE WAS NOT JSON:", aiResultText);
    throw new Error("AI failed to return JSON. It said: " + aiResultText);
  }
}

exports.handler = async (event) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Content-Type": "application/json",
  };

  try {
    const method = event.requestContext.http.method;
    const path = event.requestContext.http.path;

    // --- GET: Fetch all data ---
    if (method === "GET" && path === "/kitchen") {
      const data = await dynamo.send(
        new ScanCommand({ TableName: TABLE_NAME }),
      );
      return { statusCode: 200, headers, body: JSON.stringify(data.Items) };
    }

    // --- POST: Add/Update OR Smart Action ---
    if (method === "POST" && path === "/kitchen") {
      const body = JSON.parse(event.body);

      // 1. CHECK_RECIPE — now local math (fast, free), with a Gemini
      //    fallback for recipes saved before structured ingredients existed.
      if (body.action === "CHECK_RECIPE") {
        const { recipe, inventory } = body;
        const multiplier =
          Number(body.multiplier) > 0 ? Number(body.multiplier) : 1;

        try {
          if (recipe.ingredients && recipe.ingredients.length > 0) {
            const aiMath = checkPantry(
              recipe.ingredients,
              inventory,
              multiplier,
            );
            return {
              statusCode: 200,
              headers,
              body: JSON.stringify({ aiMath }),
            };
          }

          // Legacy path: this recipe was saved before we started parsing
          // ingredients up front. Fall back to the old per-check Gemini call
          // so old recipes still work without forcing a re-save.
          const aiMath = await legacyCheckWithGemini(
            recipe,
            inventory,
            multiplier,
          );
          return { statusCode: 200, headers, body: JSON.stringify({ aiMath }) };
        } catch (err) {
          return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: err.message }),
          };
        }
      }

      // 2. New recipe save: parse ingredientsText into structured data ONCE,
      //    up front, instead of on every "Can I make this?" click.
      if (body.pk === "RECIPE" && body.ingredientsText && !body.ingredients) {
        body.ingredients = await parseIngredientsWithGemini(
          body.ingredientsText,
        );
      }

      // 3. Standard Database Save
      const item = {
        pk: body.pk,
        sk: body.sk || crypto.randomUUID(),
        ...body,
      };

      await dynamo.send(
        new PutCommand({
          TableName: TABLE_NAME,
          Item: item,
        }),
      );

      return { statusCode: 200, headers, body: JSON.stringify(item) };
    }

    // --- DELETE: Remove an item ---
    if (method === "DELETE" && path.startsWith("/kitchen/")) {
      const sk = event.pathParameters.id;
      const pk = event.queryStringParameters?.pk;

      if (!pk || !sk) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: "Missing pk or sk" }),
        };
      }

      await dynamo.send(
        new DeleteCommand({ TableName: TABLE_NAME, Key: { pk, sk } }),
      );
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ message: "Deleted" }),
      };
    }

    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({ error: "Route not found" }),
    };
  } catch (error) {
    console.error("Backend Error:", error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
