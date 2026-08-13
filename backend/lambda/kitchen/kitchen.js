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

      // 1. THE SMART ACTION ROUTER (Gemini Engine)
      if (body.action === "CHECK_RECIPE") {
        const { recipe, inventory } = body;

        const promptText = `
          You are a strict, mathematical kitchen assistant. The user wants to know if they can cook "${recipe.name}".
          
          Here is the exact ingredients list for the recipe: 
          ${recipe.ingredientsText}
          
          Here is the user's current inventory:
          ${JSON.stringify(inventory)}
          
          Task: 
          1. Extract the required ingredients STRICTLY from the recipe ingredients list.
          2. Match those to the inventory items. Handle standard unit conversions (e.g., cups to oz, lbs to oz, etc.).
          3. Determine if the user has enough of EVERY ingredient to make the recipe. If they are missing even a fraction of an ingredient, canMake is false.
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
                thinkingConfig: {
                  thinkingLevel: "low",
                },
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
          return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
              error:
                geminiData.error?.message || "Gemini API rejected the request.",
            }),
          };
        }

        let aiResultText = geminiData.candidates[0].content.parts[0].text;

        aiResultText = aiResultText
          .replace(/```json/gi, "")
          .replace(/```/gi, "")
          .trim();

        let aiMath;
        try {
          aiMath = JSON.parse(aiResultText);

          // Return the calculation back to React instead of writing to DB
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ aiMath }),
          };
          // eslint-disable-next-line no-unused-vars
        } catch (err) {
          console.error("🚨 AI RESPONSE WAS NOT JSON:", aiResultText);
          return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
              error: "AI failed to return JSON. It said: " + aiResultText,
            }),
          };
        }
      }

      // 2. Standard Database Save (React uses this to execute the AI plan)
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
