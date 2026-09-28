/* eslint-disable no-unused-vars */
/* eslint-disable preserve-caught-error */
/* eslint-disable no-undef */
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const {
  DynamoDBDocumentClient,
  QueryCommand,
  PutCommand,
  DeleteCommand,
  UpdateCommand,
} = require("@aws-sdk/lib-dynamodb");
const crypto = require("crypto");

const client = new DynamoDBClient({});
const dynamo = DynamoDBDocumentClient.from(client);
const TABLE_NAME = process.env.TABLE_NAME;
const USERS_TABLE = process.env.USERS_TABLE;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// ==========================================
// DETERMINISTIC DOMAIN ENGINE
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
  item: "item",
  pieces: "item",
  clove: "item",
};

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
  return (name || "").toString().trim().toLowerCase().replace(/s$/, "");
}

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

function findInventoryMatch(name, inventory) {
  const target = normalizeName(name);
  return (
    inventory.find((i) => normalizeName(i.name) === target) ||
    inventory.find((i) => {
      const invName = normalizeName(i.name);
      return (
        invName &&
        target &&
        (invName.includes(target) || target.includes(invName))
      );
    })
  );
}

function round2(n) {
  return Math.round(n * 100) / 100;
}

// Merges an incoming quantity/unit into an already-matched existing item.
// When the units convert cleanly into one number (e.g. tbsp -> cup), the
// primary quantity/currentQuantity field is summed as before. When they
// don't (e.g. "cups" vs "bag"), the incoming amount is kept visible instead
// of being lost or spawning a duplicate row: it's added into a matching
// `extra` entry (by normalized unit) or appended as a new one.
function mergeQuantity(existingItem, itemType, incomingQty, incomingUnit) {
  const isPantry = itemType === "INVENTORY";
  const existingQty = isPantry
    ? Number(existingItem.currentQuantity)
    : Number(existingItem.quantity);
  const convertedQty = convertUnit(incomingQty, incomingUnit, existingItem.unit);
  const merged = { ...existingItem };

  if (convertedQty !== null) {
    if (isPantry) merged.currentQuantity = round2(existingQty + convertedQty);
    else merged.quantity = round2(existingQty + convertedQty);
    return merged;
  }

  const incomingUnitNorm = normalizeUnit(incomingUnit);
  const extra = Array.isArray(existingItem.extra)
    ? existingItem.extra.map((e) => ({ ...e }))
    : [];
  const extraMatch = extra.find((e) => normalizeUnit(e.unit) === incomingUnitNorm);
  if (extraMatch) {
    extraMatch.quantity = round2(Number(extraMatch.quantity) + incomingQty);
  } else {
    extra.push({ quantity: round2(incomingQty), unit: incomingUnit });
  }
  merged.extra = extra;
  return merged;
}

async function parseIngredientsWithGemini(ingredientsText) {
  const promptText = `
    Extract each food item from this ingredients list.
    - If an item lacks a quantity (e.g. "cheese"), omit the quantity and unit.
    - Convert any fractions into decimals (e.g., 1/4 becomes 0.25).
    Return exact structured JSON.
    Ingredients list:
    ${ingredientsText}
  `;

  const geminiRes = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.7-flash:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: promptText }] }],
        generationConfig: {
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
              required: ["name"], // Relaxed!
            },
          },
        },
      }),
    },
  );

  const geminiData = await geminiRes.json();
  if (geminiData.error || !geminiData.candidates) return [];

  try {
    const text = geminiData.candidates[0].content.parts[0].text;
    return JSON.parse(text);
  } catch (err) {
    return [];
  }
}

exports.handler = async (event) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Content-Type": "application/json",
  };
  const userId = event.requestContext?.authorizer?.jwt?.claims?.sub;

  if (!userId)
    return {
      statusCode: 401,
      headers,
      body: JSON.stringify({ error: "Unauthorized" }),
    };

  try {
    const method = event.requestContext.http.method;
    const path = event.requestContext.http.path;

    if (USERS_TABLE) {
      // Fire-and-forget: don't make every Kitchen request wait on this.
      dynamo
        .send(
          new UpdateCommand({
            TableName: USERS_TABLE,
            Key: { pk: `USER#${userId}` },
            UpdateExpression: "SET lastUsedKitchen = :now",
            ExpressionAttributeValues: { ":now": new Date().toISOString() },
          }),
        )
        .catch((err) => console.error("Failed to record kitchen usage:", err));
    }

    if (method === "GET" && path === "/kitchen") {
      const types = ["GROCERY", "INVENTORY", "QUICKMEAL"];
      let allItems = [];
      for (const t of types) {
        const data = await dynamo.send(
          new QueryCommand({
            TableName: TABLE_NAME,
            KeyConditionExpression: "pk = :pk",
            ExpressionAttributeValues: { ":pk": `USER#${userId}#${t}` },
            ConsistentRead: true,
          }),
        );
        allItems = allItems.concat(
          (data.Items || []).map((item) => ({ ...item, pk: t })),
        );
      }
      return { statusCode: 200, headers, body: JSON.stringify(allItems) };
    }

    if (method === "POST" && path === "/kitchen") {
      const body = JSON.parse(event.body);

      // Used by the Quick Meal builder's "paste a list" option — parses
      // free-text ingredients into structured {name, quantity, unit} rows.
      // One Gemini call per explicit tap, never automatic.
      if (body.action === "PARSE_INGREDIENTS") {
        const parsed = await parseIngredientsWithGemini(body.ingredientsText);
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ ingredients: parsed }),
        };
      }

      if (body.action === "PURCHASE_GROCERY") {
        const { item: groceryItem } = body;

        const existingPantry = await dynamo.send(
          new QueryCommand({
            TableName: TABLE_NAME,
            KeyConditionExpression: "pk = :pk",
            ExpressionAttributeValues: { ":pk": `USER#${userId}#INVENTORY` },
            ConsistentRead: true,
          }),
        );
        const existingItem = findInventoryMatch(
          groceryItem.name,
          existingPantry.Items || [],
        );

        const pantryItem = existingItem
          ? {
              ...mergeQuantity(
                existingItem,
                "INVENTORY",
                Number(groceryItem.quantity),
                groceryItem.unit,
              ),
              pk: `USER#${userId}#INVENTORY`,
            }
          : {
              pk: `USER#${userId}#INVENTORY`,
              sk: groceryItem.sk,
              name: groceryItem.name,
              currentQuantity: groceryItem.quantity,
              unit: groceryItem.unit,
            };

        await Promise.all([
          dynamo.send(
            new DeleteCommand({
              TableName: TABLE_NAME,
              Key: { pk: `USER#${userId}#GROCERY`, sk: groceryItem.sk },
            }),
          ),
          dynamo.send(new PutCommand({ TableName: TABLE_NAME, Item: pantryItem })),
        ]);

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            pantryItem: { ...pantryItem, pk: "INVENTORY" },
          }),
        };
      }

      if (body.action === "LOG_QUICK_MEAL") {
        const { items: usedItems } = body; // [{ pantrySk, name, quantity, unit }]

        const existingPantry = await dynamo.send(
          new QueryCommand({
            TableName: TABLE_NAME,
            KeyConditionExpression: "pk = :pk",
            ExpressionAttributeValues: { ":pk": `USER#${userId}#INVENTORY` },
            ConsistentRead: true,
          }),
        );
        const pantryItems = existingPantry.Items || [];

        const writes = [];
        const updatedPantryItems = [];

        for (const used of usedItems || []) {
          // The pantry row may have been renamed/recreated since this Quick
          // Meal was built — fall back to a fuzzy name match, and just skip
          // it entirely if it's genuinely gone rather than erroring out.
          let match = pantryItems.find((p) => p.sk === used.pantrySk);
          if (!match && used.name) {
            match = findInventoryMatch(used.name, pantryItems);
          }
          if (!match) continue;

          const usedQty = Number(used.quantity) || 0;
          // No quantity set (or set to 0) means "don't decrement this one
          // this time" — same idea as an unquantified recipe ingredient.
          if (usedQty <= 0) continue;
          const converted = convertUnit(usedQty, used.unit, match.unit);
          const decrementBy = converted !== null ? converted : usedQty;
          // Forgiving on purpose: logging a meal never blocks on insufficient
          // stock, it just floors at 0 instead of going negative.
          const newQty = Math.max(
            0,
            round2(Number(match.currentQuantity) - decrementBy),
          );

          const updatedItem = { ...match, currentQuantity: newQty };
          updatedPantryItems.push({ ...updatedItem, pk: "INVENTORY" });
          writes.push(
            dynamo.send(new PutCommand({ TableName: TABLE_NAME, Item: updatedItem })),
          );
        }

        await Promise.all(writes);

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ success: true, pantryItems: updatedPantryItems }),
        };
      }

      const itemType = (body.pk || "GROCERY").replace(/^USER#[^#]+#/, "");
      let item = {
        ...body,
        pk: `USER#${userId}#${itemType}`,
        sk: body.sk || crypto.randomUUID(),
      };

      if (!body.sk && (itemType === "GROCERY" || itemType === "INVENTORY")) {
        const existingData = await dynamo.send(
          new QueryCommand({
            TableName: TABLE_NAME,
            KeyConditionExpression: "pk = :pk",
            ExpressionAttributeValues: { ":pk": `USER#${userId}#${itemType}` },
            ConsistentRead: true,
          }),
        );

        // Exact match on the normalized name first, then fall back to the
        // fuzzy substring match already used for recipe pantry-checking
        // (catches cases the naive trailing-"s" strip misses, e.g.
        // "tomatoes" vs "tomato").
        const existingItem = findInventoryMatch(
          body.name,
          existingData.Items || [],
        );

        if (existingItem) {
          const isPantry = itemType === "INVENTORY";
          const addQty = isPantry
            ? Number(body.currentQuantity)
            : Number(body.quantity);
          item = {
            ...mergeQuantity(existingItem, itemType, addQty, body.unit),
            pk: `USER#${userId}#${itemType}`,
          };
        }
      }

      await dynamo.send(new PutCommand({ TableName: TABLE_NAME, Item: item }));
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ ...item, pk: itemType }),
      };
    }

    if (method === "DELETE" && path.startsWith("/kitchen/")) {
      const sk = event.pathParameters.id;
      const rawPk = event.queryStringParameters?.pk || "GROCERY";
      const itemType = rawPk.replace(/^USER#[^#]+#/, "");

      await dynamo.send(
        new DeleteCommand({
          TableName: TABLE_NAME,
          Key: { pk: `USER#${userId}#${itemType}`, sk: sk },
        }),
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
      body: JSON.stringify({ error: "Not found" }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
