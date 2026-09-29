import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { bankroll } from "../../lib/stats";
import { ChartCard } from "./ChartCard";
import { barColor, chart, moneyTip } from "./chartTheme";

type Props = { points: ReturnType<typeof bankroll> };

const gameLabel = (v: unknown) => `Game ${String(v)}`;
const margin = { top: 6, right: 8, left: -12, bottom: 0 };

/** My running total over time, and each game's result. */
export function MyCharts({ points }: Props) {
  if (points.length < 2) return null;
  return (
    <>
      <ChartCard title="Bankroll">
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={points} margin={margin}>
            <CartesianGrid stroke={chart.grid} vertical={false} />
            <XAxis dataKey="game" tick={chart.tick} stroke={chart.grid} />
            <YAxis tick={chart.tick} stroke={chart.grid} />
            <Tooltip
              {...chart.tooltip}
              formatter={moneyTip}
              labelFormatter={gameLabel}
            />
            <Line
              type="monotone"
              dataKey="cumulative"
              name="Running total"
              stroke={chart.coral}
              strokeWidth={2.5}
              dot={{ r: 3, fill: chart.coral }}
            />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Every game">
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={points} margin={margin}>
            <CartesianGrid stroke={chart.grid} vertical={false} />
            <XAxis dataKey="game" tick={chart.tick} stroke={chart.grid} />
            <YAxis tick={chart.tick} stroke={chart.grid} />
            <Tooltip
              {...chart.tooltip}
              formatter={moneyTip}
              labelFormatter={gameLabel}
            />
            <Bar dataKey="net" name="Result" radius={[4, 4, 4, 4]}>
              {points.map((p) => (
                <Cell key={p.game} fill={barColor(p.net)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
    </>
  );
}
