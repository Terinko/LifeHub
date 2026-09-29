import { formatSigned } from "../../lib/money";

/** Recharts takes colors as props, so the Vegas tokens are repeated here. */
export const chart = {
  up: "#37e2e6",
  down: "#ffc34d",
  coral: "#ff6b5b",
  grid: "#2c2358",
  tick: { fontSize: 11, fill: "#b3a8d9", fontFamily: "Manrope, sans-serif" },
  tooltip: {
    contentStyle: {
      background: "#191238",
      border: "1px solid #40347a",
      borderRadius: 12,
      color: "#fbf4ff",
      fontFamily: "Manrope, sans-serif",
      fontSize: 13,
    },
    labelStyle: { color: "#b3a8d9" },
    itemStyle: { color: "#fbf4ff" },
    cursor: { fill: "rgba(255, 255, 255, 0.06)" },
  },
};

export const barColor = (n: number) => (n >= 0 ? chart.up : chart.down);

export const moneyTip = (v: unknown) => formatSigned(Number(v));
