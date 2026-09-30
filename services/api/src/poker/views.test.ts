import { describe, expect, it } from "vitest";
import type { Game, PokerItem } from "./types";
import {
  busyPlayerNames,
  myStats,
  renameInSettlements,
  splitItems,
  statGames,
} from "./views";

const G = "POKER#GROUP";
const seat = (name: string) => ({ name, buyIns: 1, finalChips: null });

const items: PokerItem[] = [
  {
    pk: G,
    sk: "GAME#1",
    status: "COMPLETED",
    countsForStats: true,
    players: { "PLAYER#a": seat("A") },
  },
  { pk: G, sk: "PLAYER#a", name: "A", userId: "u1" },
  {
    pk: G,
    sk: "GAME#2",
    status: "COMPLETED",
    countsForStats: false,
    players: { "PLAYER#b": seat("B") },
  },
  {
    pk: G,
    sk: "GAME#3",
    status: "ACTIVE",
    countsForStats: true,
    players: { "PLAYER#a": seat("A") },
  },
  { pk: G, sk: "PLAYER#b", name: "B" },
  { pk: G, sk: "OTHER#x" },
];

describe("splitItems", () => {
  it("splits the roster from the games and drops anything else", () => {
    const { players, games } = splitItems(items);
    expect(players.map((p) => p.sk)).toEqual(["PLAYER#a", "PLAYER#b"]);
    expect(games.map((g) => g.sk)).toEqual(["GAME#1", "GAME#2", "GAME#3"]);
  });
});

describe("statGames", () => {
  it("keeps completed games that count for stats", () => {
    const { games } = splitItems(items);
    expect(statGames(games).map((g) => g.sk)).toEqual(["GAME#1"]);
  });

  it("needs countsForStats to be exactly true", () => {
    const g = {
      pk: G,
      sk: "GAME#9",
      status: "COMPLETED",
      countsForStats: "yes",
    };
    expect(statGames([g])).toEqual([]);
  });
});

describe("myStats", () => {
  it("returns my claimed players and their completed games", () => {
    const { players, games } = splitItems(items);
    expect(myStats(players, games, "u1")).toEqual({
      playerIds: ["PLAYER#a"],
      games: [items[0]],
    });
  });

  it("is empty for someone who hasn't claimed a player", () => {
    const { players, games } = splitItems(items);
    expect(myStats(players, games, "u2")).toEqual({ playerIds: [], games: [] });
  });
});

describe("renameInSettlements", () => {
  it("renames the player on either side of a payment", () => {
    const settlements = [
      { from: "Old", fromId: "p", to: "C", toId: "c", amount: 5 },
      { from: "D", fromId: "d", to: "Old", toId: "p", amount: 3 },
    ];
    expect(renameInSettlements(settlements, "p", "New")).toEqual([
      { from: "New", fromId: "p", to: "C", toId: "c", amount: 5 },
      { from: "D", fromId: "d", to: "New", toId: "p", amount: 3 },
    ]);
  });
});

describe("busyPlayerNames", () => {
  const active: Game[] = [
    {
      pk: G,
      sk: "GAME#3",
      status: "ACTIVE",
      players: { a: seat("A"), b: seat("B") },
    },
    { pk: G, sk: "GAME#4", status: "COMPLETED", players: { c: seat("C") } },
  ];

  it("names players already seated at an active game", () => {
    expect(
      busyPlayerNames(["a", "c", "b"], { a: { name: "Ann" }, b: {} }, active),
    ).toEqual(["Ann", "A player"]);
  });

  it("is empty when nobody is busy", () => {
    expect(busyPlayerNames(["c"], {}, active)).toEqual([]);
  });
});
