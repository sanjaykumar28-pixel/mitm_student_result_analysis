import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";

interface BarChartProps<T extends object> {
  data: T[];
  xKey: string;
  bars: Array<{ key: string; color?: string; name?: string }>;
  height?: number;
}

export function BarChartComponent<T extends object>({
  data,
  xKey,
  bars,
  height = 280,
}: BarChartProps<T>) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 12, left: -10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
        <XAxis dataKey={xKey} stroke="var(--color-muted-foreground)" fontSize={12} />
        <YAxis stroke="var(--color-muted-foreground)" fontSize={12} />
        <Tooltip
          formatter={(value: any, name: any) => {
            if (typeof value === "number") {
              const lowerName = String(name).toLowerCase();
              if (lowerName.includes("cgpa") || lowerName.includes("sgpa")) {
                return [value.toFixed(2), name];
              }
            }
            return [value, name];
          }}
          contentStyle={{
            backgroundColor: "var(--color-popover)",
            border: "1px solid var(--color-border)",
            borderRadius: 8,
            fontSize: 12,
          }}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        {bars.map((b, i) => (
          <Bar
            key={b.key}
            dataKey={b.key}
            name={b.name ?? b.key}
            fill={b.color ?? `var(--color-chart-${(i % 5) + 1})`}
            radius={[6, 6, 0, 0]}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}
