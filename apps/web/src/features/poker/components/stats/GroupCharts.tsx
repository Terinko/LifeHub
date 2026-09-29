import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { LeaderRow, monthlyActivity } from "../../lib/stats";
import { ChartCard } from "./ChartCard";
import { barColor, chart, moneyTip } from "./chartTheme";

type Props = {
  board: LeaderRow[];
  months: ReturnType<typeof monthlyActivity>;
};

/** Everyone's lifetime result as bars, and how often the group plays. */
export function GroupCharts({ board, months }: Props) {
  return (
    <>
      <ChartCard title="Lifetime by player">
        <ResponsiveContainer
          width="100%"
          height={Math.max(160, board.length * 34)}
        >
          <BarChart
            data={board}
            layout="vertical"
            margin={{ top: 0, right: 8, left: 0, bottom: 0 }}
          >
            <CartesianGrid stroke={chart.grid} horizontal={false} />
            <XAxis type="number" tick={chart.tick} stroke={chart.grid} />
            <YAxis
              type="category"
              dataKey="name"
              tick={chart.tick}
              stroke={chart.grid}
              width={76}
            />
            <Tooltip {...chart.tooltip} formatter={moneyTip} />
            <Bar dataKey="net" name="Lifetime" radius={[4, 4, 4, 4]}>
              {board.map((p) => (
                <Cell key={p.id} fill={barColor(p.net)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      {months.length > 1 && (
        <ChartCard title="Games a month">
          <ResponsiveContainer width="100%" height={160}>
            <BarChart
              data={months}
              margin={{ top: 6, right: 8, left: -24, bottom: 0 }}
            >
              <CartesianGrid stroke={chart.grid} vertical={false} />
              <XAxis dataKey="month" tick={chart.tick} stroke={chart.grid} />
              <YAxis
                tick={chart.tick}
                stroke={chart.grid}
                allowDecimals={false}
              />
              <Tooltip {...chart.tooltip} />
              <Bar
                dataKey="count"
                name="Games"
                fill={chart.coral}
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      )}
    </>
  );
}
