import type { Game } from "../types";
import { formatMoney, formatShortMoney, formatShortSigned } from "./money";
import { recordBook, type GroupRecord, type RecordKey } from "./records";
import { gameDate } from "./share";

export type NightAward = {
  key: "bigWinner" | "topDonor" | "comebackKid" | "tilt";
  title: string;
  name: string;
  id: string;
  /** A short line under the name, like "+$62" or "4 buy-ins". */
  detail: string;
};

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

/** Tonight's superlatives, from a settled game's seats. */
export function nightAwards(game: Game): NightAward[] {
  const seats = Object.entries(game.players ?? {}).map(([id, s]) => ({
    id,
    name: s.name,
    buyIns: s.buyIns,
    net: s.net ?? 0,
  }));
  const awards: NightAward[] = [];
  const winner = [...seats].sort((a, b) => b.net - a.net)[0];
  if (winner && winner.net > 0)
    awards.push({
      key: "bigWinner",
      title: "Big Winner",
      ...winner,
      detail: formatShortSigned(winner.net),
    });
  const donor = [...seats].sort((a, b) => a.net - b.net)[0];
  if (donor && donor.net < 0)
    awards.push({
      key: "topDonor",
      title: "Top Donor",
      ...donor,
      detail: formatShortSigned(donor.net),
    });
  const comeback = seats
    .filter((s) => s.buyIns > 1 && s.net > 0)
    .sort((a, b) => b.buyIns - a.buyIns || b.net - a.net)[0];
  if (comeback)
    awards.push({
      key: "comebackKid",
      title: "Comeback Kid",
      ...comeback,
      detail: `won after ${plural(comeback.buyIns - 1, "rebuy")}`,
    });
  const tilt = [...seats].sort((a, b) => b.buyIns - a.buyIns)[0];
  if (tilt && tilt.buyIns > 2)
    awards.push({
      key: "tilt",
      title: "Tilt of the Night",
      ...tilt,
      detail: plural(tilt.buyIns, "buy-in"),
    });
  return awards;
}

export type NewRecord = {
  key: RecordKey;
  title: string;
  record: GroupRecord;
  /** The record it beat. */
  previous: GroupRecord;
};

const TITLES: Record<RecordKey, string> = {
  biggestGame: "Biggest game ever",
  biggestWin: "Biggest win ever",
  biggestLoss: "Biggest loss ever",
  mostBuyIns: "Most buy-ins ever",
  longestStreak: "Longest win streak ever",
  biggestTable: "Biggest table ever",
};

/**
 * Records this game just broke, against the games before it. A record
 * nobody held yet doesn't count, so the first game ever isn't all records.
 */
export function brokenRecords(previous: Game[], game: Game): NewRecord[] {
  const before = recordBook(previous.filter((g) => g.sk !== game.sk));
  const after = recordBook([...previous.filter((g) => g.sk !== game.sk), game]);
  return (Object.keys(TITLES) as RecordKey[]).flatMap((key) => {
    const record = after[key];
    const old = before[key];
    if (!record || !old || record.gameSk !== game.sk) return [];
    return [{ key, title: TITLES[key], record, previous: old }];
  });
}

/** "Jordan's +$62 beats Sam's +$55 from Mar 8." */
export function describeRecord({ key, record, previous }: NewRecord): string {
  const old = `from ${gameDate(previous.date)}`;
  switch (key) {
    case "biggestGame":
      return `${formatShortMoney(record.value)} on the table beats ${formatShortMoney(previous.value)} ${old}.`;
    case "biggestTable":
      return `${plural(record.value, "player")} beats ${previous.value} ${old}.`;
    case "biggestWin":
    case "biggestLoss":
      return `${record.name}'s ${formatShortSigned(record.value)} beats ${previous.name}'s ${formatShortSigned(previous.value)} ${old}.`;
    case "mostBuyIns":
      return `${record.name}'s ${plural(record.value, "buy-in")} beats ${previous.name}'s ${previous.value} ${old}.`;
    case "longestStreak":
      return `${record.name} has won ${record.value} straight, beating ${previous.name}'s ${previous.value} ${old}.`;
  }
}

/** The recap as plain text for the group chat. */
export function recapText(
  game: Game,
  awards: NightAward[],
  records: NewRecord[],
): string {
  const payments = (game.settlements ?? []).map(
    (s) => `${s.from} pays ${s.to} ${formatMoney(s.amount)}`,
  );
  return [
    `Poker, ${gameDate(game.completedAt ?? game.date)}`,
    ...records.map((r) => `🏆 ${r.title}: ${describeRecord(r)}`),
    ...awards.map((a) => `${a.title}: ${a.name} (${a.detail})`),
    "",
    ...(payments.length ? payments : ["Everyone broke even."]),
    ...(game.notes ? ["", game.notes] : []),
  ].join("\n");
}
