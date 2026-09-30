import type { Seat, Settlement } from "./types";

export const round2 = (n: number) => Math.round(n * 100) / 100;

export const isPositiveNumber = (n: unknown): n is number =>
  typeof n === "number" && Number.isFinite(n) && n > 0;

/**
 * Chips handed out (every buy-in) versus chips counted at the end. A blank
 * count is treated as 0 chips.
 */
export function chipTotals(
  players: Record<string, Seat>,
  chipsPerBuyIn: number,
) {
  let expected = 0;
  let counted = 0;
  for (const p of Object.values(players)) {
    expected += p.buyIns * chipsPerBuyIn;
    counted += p.finalChips ?? 0;
  }
  return { expected, counted };
}

type Balance = { id: string; name: string; amount: number };

/** Each player's net in dollars, and who owes and is owed how much. */
function nets(
  players: Record<string, Seat>,
  buyInAmount: number,
  chipsPerBuyIn: number,
) {
  const debtors: Balance[] = [];
  const creditors: Balance[] = [];
  const processedPlayers: Record<string, Seat & { net: number }> = {};

  for (const [id, p] of Object.entries(players)) {
    const chipValue = ((p.finalChips ?? 0) / chipsPerBuyIn) * buyInAmount;
    const totalSpent = p.buyIns * buyInAmount;
    const net = round2(chipValue - totalSpent);

    processedPlayers[id] = { ...p, net };

    if (net < 0) debtors.push({ id, name: p.name, amount: Math.abs(net) });
    else if (net > 0) creditors.push({ id, name: p.name, amount: net });
  }

  debtors.sort((a, b) => b.amount - a.amount);
  creditors.sort((a, b) => b.amount - a.amount);
  return { processedPlayers, debtors, creditors };
}

/** Pays the biggest winners from the biggest losers first. */
export function calculateSettlements(
  players: Record<string, Seat>,
  buyInAmount: number,
  chipsPerBuyIn: number,
) {
  const { processedPlayers, debtors, creditors } = nets(
    players,
    buyInAmount,
    chipsPerBuyIn,
  );

  const settlements: Settlement[] = [];
  let d = 0;
  let c = 0;
  let debtor = debtors[d];
  let creditor = creditors[c];

  while (debtor && creditor) {
    // Work in whole cents so repeated subtraction can't leave float dust
    // like 0.30000000000000004 in a payment.
    const payment = round2(Math.min(debtor.amount, creditor.amount));

    if (payment > 0) {
      settlements.push({
        from: debtor.name,
        fromId: debtor.id,
        to: creditor.name,
        toId: creditor.id,
        amount: payment,
      });
    }

    debtor.amount = round2(debtor.amount - payment);
    creditor.amount = round2(creditor.amount - payment);

    if (debtor.amount < 0.01) debtor = debtors[++d];
    if (creditor.amount < 0.01) creditor = creditors[++c];
  }

  return { players: processedPlayers, settlements };
}
