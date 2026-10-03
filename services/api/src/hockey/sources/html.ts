// Just enough HTML reading for the few public tables Hockey uses. The pages
// are simple server-rendered tables, so a parser library isn't worth it.

const ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  "#039": "'",
  dagger: "†",
  Dagger: "‡",
};

export const decodeEntities = (text: string) =>
  text
    .replace(/&#(\d+);/g, (_, n: string) => String.fromCharCode(Number(n)))
    .replace(/&([a-zA-Z]+|#039);/g, (m, name: string) => ENTITIES[name] ?? m);

/** The visible text of an HTML fragment, whitespace collapsed. */
export const textOf = (html: string) =>
  decodeEntities(html.replace(/<[^>]*>/g, " "))
    .replace(/\s+/g, " ")
    .trim();

/** Every `<table>…</table>` in the page, in order. */
export const tablesIn = (html: string) =>
  html.match(/<table[\s>][\s\S]*?<\/table>/gi) ?? [];

/** Each row of a table as its cells' text (th and td alike). */
export const rowsOf = (table: string): string[][] =>
  (table.match(/<tr[\s>][\s\S]*?<\/tr>/gi) ?? []).map((row) =>
    (row.match(/<t[hd][\s>][\s\S]*?<\/t[hd]>/gi) ?? []).map(textOf),
  );

/** The first table whose text includes `marker`. */
export const tableWith = (html: string, marker: string) =>
  tablesIn(html).find((t) => textOf(t).includes(marker));

/** "1,234" or "12" → number; anything else → NaN */
export const toNumber = (text: string) => Number(text.replace(/,/g, ""));

/** A row's cell text, or "" past the end. */
export const cell = (cells: string[], i: number) => cells[i] ?? "";
