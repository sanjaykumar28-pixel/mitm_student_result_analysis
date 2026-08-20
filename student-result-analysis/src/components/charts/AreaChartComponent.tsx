import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from "recharts";

interface Props {
  data: Array<Record<string, string | number>>;
  xKey: string;
  areas: Array<{ key: string; color?: string; name?: string }>;
  height?: number;
}

export function AreaChartComponent({ data, xKey, areas, height = 280 }: Props) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 8, right: 12, left: -10, bottom: 0 }}>
        <defs>
          {areas.map((a, i) => {
            const color = a.color ?? `var(--color-chart-${(i % 5) + 1})`;
            return (
              <linearGradient key={a.key} id={`grad-${a.key}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.4} />
                <stop offset="95%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            );
          })}
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
        <XAxis dataKey={xKey} stroke="var(--color-muted-foreground)" fontSize={12} />
        <YAxis stroke="var(--color-muted-foreground)" fontSize={12} />
        <Tooltip
          contentStyle={{
            backgroundColor: "var(--color-popover)",
            border: "1px solid var(--color-border)",
            borderRadius: 8,
            fontSize: 12,
          }}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        {areas.map((a, i) => {
          const color = a.color ?? `var(--color-chart-${(i % 5) + 1})`;
          return (
            <Area
              key={a.key}
              type="monotone"
              dataKey={a.key}
              name={a.name ?? a.key}
              stroke={color}
              strokeWidth={2}
              fill={`url(#grad-${a.key})`}
            />
          );
        })}
      </AreaChart>
    </ResponsiveContainer>
  );
}
