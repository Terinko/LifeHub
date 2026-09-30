import type { ParsedIngredient } from "@lifehub/shared";
import { fetchJson } from "../shared/fetchJson";
import { HttpError } from "../shared/http";

const MODEL = "gemini-3.7-flash";

type GeminiResponse = {
  candidates?: { content?: { parts?: { text?: string }[] } }[];
};

/**
 * Reads a pasted ingredient list ("2 eggs, 1/4 cup milk") into rows with
 * one Gemini call. Only ever runs when someone taps Read list.
 */
export async function parseIngredients(
  text: string,
): Promise<ParsedIngredient[]> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new HttpError(503, "Reading lists isn't set up right now.");

  const prompt = [
    "Extract each food item from this ingredients list.",
    '- If an item lacks a quantity (e.g. "cheese"), omit the quantity and unit.',
    "- Convert any fractions into decimals (e.g., 1/4 becomes 0.25).",
    "Return exact structured JSON.",
    "Ingredients list:",
    text,
  ].join("\n");

  let data: GeminiResponse;
  try {
    data = await fetchJson<GeminiResponse>(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${key}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
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
                required: ["name"],
              },
            },
          },
        }),
      },
      20_000,
    );
  } catch (error) {
    console.error("Gemini request failed:", error);
    throw new HttpError(502, "Couldn't read that list right now. Try again.");
  }
  return toIngredients(data);
}

/** Pulls the rows out of Gemini's reply, dropping anything malformed. */
export function toIngredients(data: GeminiResponse): ParsedIngredient[] {
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) return [];
  let rows: unknown;
  try {
    rows = JSON.parse(text);
  } catch {
    return [];
  }
  if (!Array.isArray(rows)) return [];
  return rows.flatMap((row): ParsedIngredient[] => {
    const r = row as Record<string, unknown>;
    if (typeof r.name !== "string" || !r.name.trim()) return [];
    const quantity = Number(r.quantity);
    return [
      {
        name: r.name.trim(),
        ...(Number.isFinite(quantity) && quantity > 0 ? { quantity } : {}),
        ...(typeof r.unit === "string" && r.unit.trim()
          ? { unit: r.unit.trim() }
          : {}),
      },
    ];
  });
}
