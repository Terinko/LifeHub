/* eslint-disable no-unused-vars */
/* eslint-disable preserve-caught-error */
/* eslint-disable no-undef */
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const {
  DynamoDBDocumentClient,
  QueryCommand,
  PutCommand,
  DeleteCommand,
} = require("@aws-sdk/lib-dynamodb");
const crypto = require("crypto");

const client = new DynamoDBClient({});
const dynamo = DynamoDBDocumentClient.from(client);
const TABLE_NAME = process.env.TABLE_NAME;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// ==========================================
// DETERMINISTIC DOMAIN ENGINE
// ==========================================

const PANTRY_STAPLES = [
  "salt",
  "pepper",
  "black pepper",
  "oil",
  "olive oil",
  "vegetable oil",
  "canola oil",
  "butter",
  "water",
  "sugar",
];

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

function checkPantry(requiredIngredients, inventory, multiplier) {
  const missingIngredients = [];
  const updatedInventoryMap = new Map();
  let canMake = true;

  const workingInventory = JSON.parse(JSON.stringify(inventory));
  const scaledRequired = [];

  for (const req of requiredIngredients) {
    if (!req.name || PANTRY_STAPLES.includes(normalizeName(req.name))) continue;
    const match = findInventoryMatch(req.name, workingInventory);

    // 1. Is it unquantified? (e.g., "cheese")
    const isUnquantified =
      req.quantity === undefined ||
      req.quantity === null ||
      req.quantity === "" ||
      isNaN(Number(req.quantity)) ||
      Number(req.quantity) === 0;

    if (isUnquantified) {
      if (!match) {
        canMake = false;
        missingIngredients.push({ name: req.name, quantity: "Any", unit: "" });
      }
      scaledRequired.push({ ...req, quantity: "Any" });
      continue; // Skip the math!
    }

    // 2. Perform quantified checks
    const requiredQty = round2(Number(req.quantity) * multiplier);
    scaledRequired.push({ ...req, quantity: requiredQty });

    if (!match) {
      canMake = false;
      missingIngredients.push({ ...req, quantity: requiredQty });
      continue;
    }

    const invQty = Number(match.currentQuantity) || 0;
    let have = convertUnit(invQty, match.unit, req.unit);

    // FORGIVING UNIT FALLBACK (fixes "panini bread")
    if (have === null) have = invQty;

    if (have < requiredQty) {
      canMake = false;
      missingIngredients.push({
        name: req.name,
        quantity: round2(requiredQty - have),
        unit: req.unit,
      });
      match.currentQuantity = 0;
      updatedInventoryMap.set(match.sk, 0);
    } else {
      const remaining = have - requiredQty;
      let remainingInOriginalUnit = convertUnit(
        remaining,
        req.unit,
        match.unit,
      );
      if (remainingInOriginalUnit === null) remainingInOriginalUnit = remaining; // fallback

      const newQty = round2(remainingInOriginalUnit);
      match.currentQuantity = newQty;
      updatedInventoryMap.set(match.sk, newQty);
    }
  }

  const updatedInventory = Array.from(
    updatedInventoryMap,
    ([sk, currentQuantity]) => ({
      sk,
      currentQuantity,
    }),
  );

  return {
    canMake,
    requiredIngredients: scaledRequired,
    updatedInventory,
    missingIngredients,
  };
}

async function parseIngredientsWithGemini(ingredientsText) {
  const promptText = `
    Extract each ingredient from this recipe's ingredients list.
    - If an ingredient lacks a quantity (e.g. "cheese"), omit the quantity and unit.
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

    if (method === "GET" && path === "/kitchen") {
      const types = ["GROCERY", "INVENTORY", "RECIPE"];
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

      if (body.action === "PARSE_RECIPE") {
        const parsed = await parseIngredientsWithGemini(body.ingredientsText);
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ ingredients: parsed }),
        };
      }

      if (body.action === "COOK_RECIPE") {
        const { recipe, inventory, multiplier } = body;
        const mult = Number(multiplier) > 0 ? Number(multiplier) : 1;

        const result = checkPantry(recipe.ingredients, inventory, mult);
        if (!result.canMake)
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: "Insufficient ingredients", result }),
          };

        for (const item of result.updatedInventory) {
          if (item.currentQuantity <= 0) {
            await dynamo.send(
              new DeleteCommand({
                TableName: TABLE_NAME,
                Key: { pk: `USER#${userId}#INVENTORY`, sk: item.sk },
              }),
            );
          } else {
            const original = inventory.find((i) => i.sk === item.sk);
            await dynamo.send(
              new PutCommand({
                TableName: TABLE_NAME,
                Item: {
                  ...original,
                  pk: `USER#${userId}#INVENTORY`,
                  currentQuantity: item.currentQuantity,
                },
              }),
            );
          }
        }
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ success: true, result }),
        };
      }

      if (body.action === "PURCHASE_GROCERY") {
        const { item } = body;
        await dynamo.send(
          new DeleteCommand({
            TableName: TABLE_NAME,
            Key: { pk: `USER#${userId}#GROCERY`, sk: item.sk },
          }),
        );
        await dynamo.send(
          new PutCommand({
            TableName: TABLE_NAME,
            Item: {
              pk: `USER#${userId}#INVENTORY`,
              sk: item.sk,
              name: item.name,
              currentQuantity: item.quantity,
              unit: item.unit,
            },
          }),
        );
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ success: true }),
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
          }),
        );

        const targetName = normalizeName(body.name);
        const existingItem = (existingData.Items || []).find(
          (i) => normalizeName(i.name) === targetName,
        );

        if (existingItem) {
          const isPantry = itemType === "INVENTORY";
          const addQty = isPantry
            ? Number(body.currentQuantity)
            : Number(body.quantity);
          const existingQty = isPantry
            ? Number(existingItem.currentQuantity)
            : Number(existingItem.quantity);
          const convertedQty = convertUnit(
            addQty,
            body.unit,
            existingItem.unit,
          );

          if (convertedQty !== null) {
            item = { ...existingItem, pk: `USER#${userId}#${itemType}` };
            if (isPantry)
              item.currentQuantity = round2(existingQty + convertedQty);
            else item.quantity = round2(existingQty + convertedQty);
          }
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
