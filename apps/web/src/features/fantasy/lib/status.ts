import type { MatchupStatus } from "@lifehub/shared";

export type Tone = "ahead" | "behind" | "even" | "neutral";

const pts = (n: number) => Math.abs(n).toFixed(1);

/** "A", "A and B", "A, B and C"; longer lists become a count. */
export function nameList(names: string[], whose: "your" | "their"): string {
  if (names.length > 3) return `${whose} ${names.length} remaining players`;
  if (names.length <= 1) return names[0] ?? "";
  return `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`;
}

function stillToPlay(myLeft: string[], oppLeft: string[]) {
  if (myLeft.length + oppLeft.length > 4) {
    return `${myLeft.length} of yours and ${oppLeft.length} of theirs still to play.`;
  }
  return `Still to play: ${nameList(myLeft, "your")} for you, ${nameList(oppLeft, "their")} for them.`;
}

/** The one-line summary under a matchup's score. */
export function describeStatus({
  phase,
  lead,
  myLeft,
  oppLeft,
}: MatchupStatus): { tone: Tone; text: string } {
  const tone: Tone = lead > 0 ? "ahead" : lead < 0 ? "behind" : "even";

  if (phase === "pregame") {
    return { tone: "neutral", text: "No games have started yet." };
  }
  if (phase === "final") {
    if (lead > 0) return { tone, text: `You won by ${pts(lead)}.` };
    if (lead < 0) return { tone, text: `You lost by ${pts(lead)}.` };
    return { tone, text: "It ended in a tie." };
  }

  const mine = nameList(myLeft, "your");
  const theirs = nameList(oppLeft, "their");

  if (myLeft.length === 0) {
    if (lead > 0)
      return {
        tone,
        text: `Your players are done. You win if ${theirs} ${oppLeft.length === 1 ? "scores" : "score"} under ${pts(lead)}${oppLeft.length === 1 ? "" : " combined"}.`,
      };
    if (lead < 0)
      return {
        tone,
        text: `You've lost. Your players are done and you're down ${pts(lead)}.`,
      };
    return {
      tone,
      text: `Tied and your players are done. Any points from ${theirs} beat you.`,
    };
  }

  if (oppLeft.length === 0) {
    if (lead > 0)
      return {
        tone,
        text: "You've won. Your opponent has no one left to play.",
      };
    if (lead < 0)
      return {
        tone,
        text: `You need ${mine} to score more than ${pts(lead)} combined.`,
      };
    return { tone, text: `Tied. Any points from ${mine} win it.` };
  }

  const score =
    lead > 0
      ? `You're up ${pts(lead)}.`
      : lead < 0
        ? `You're down ${pts(lead)}.`
        : "Tied.";
  return { tone, text: `${score} ${stillToPlay(myLeft, oppLeft)}` };
}
