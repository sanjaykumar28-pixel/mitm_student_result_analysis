import { useMemo, useState } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  CartesianGrid,
  ReferenceLine,
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Brain,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { AdminResultRow } from "@/services/adminService";

// Types
interface SemesterAnalytic {
  semester: number;
  label: string;
  studentCount: number;
  passed: number;
  failed: number;
  passRate: number;
  avgSgpa: number;
  avgTotal: number;
}


type Metric = "avgSgpa" | "passRate" | "avgTotal" | "passed" | "failed";

const METRIC_LABELS: Record<Metric, string> = {
  avgSgpa: "Avg SGPA",
  passRate: "Pass Rate (%)",
  avgTotal: "Avg Total Marks",
  passed: "Passed Count",
  failed: "Failed Count",
};

interface Props {
  results: AdminResultRow[];
  loading: boolean;
}

function avg(arr: number[]): number {
  if (!arr.length) return 0;
  return arr.reduce((s, v) => s + v, 0) / arr.length;
}

function fmt2(n: number): string {
  return n.toFixed(2);
}

function fmtPct(n: number): string {
  return n.toFixed(1) + "%";
}

// Custom tooltip
interface TooltipEntry {
  value: number;
  payload: { passed: number; failed: number; studentCount: number };
}

interface TooltipProps {
  active?: boolean;
  payload?: TooltipEntry[];
  label?: string;
  metric: Metric;
}

function CustomTooltip({ active, payload, label, metric }: TooltipProps) {
  if (!active || !payload?.length) return null;
  const val = payload[0]?.value;
  const formatted =
    metric === "avgSgpa" ? fmt2(val) :
    metric === "passRate" ? fmtPct(val) :
    metric === "avgTotal" ? fmt2(val) :
    String(Math.round(val));
  const p = payload[0]?.payload;
  return (
    <div className="rounded-xl border border-border bg-card px-4 py-3 shadow-lg text-xs min-w-[160px]">
      <p className="font-bold text-foreground mb-1">{label}</p>
      <p className="text-muted-foreground">
        {METRIC_LABELS[metric]}: <span className="font-semibold text-primary">{formatted}</span>
      </p>
      {p && (
        <div className="mt-1.5 border-t border-border/50 pt-1.5 space-y-0.5">
          <p className="text-muted-foreground">Passed: <span className="font-medium text-emerald-600">{p.passed}</span></p>
          <p className="text-muted-foreground">Failed: <span className="font-medium text-red-500">{p.failed}</span></p>
          <p className="text-muted-foreground">Students: <span className="font-medium text-foreground">{p.studentCount}</span></p>
        </div>
      )}
    </div>
  );
}

export function AcademicPerformanceIntelligence({
  results, loading,
}: Props) {
  const [metric, setMetric] = useState<Metric>("passRate");

  const semesterAnalytics = useMemo<SemesterAnalytic[]>(() => {
    if (!results.length) return [];
    const bySem = new Map<number, AdminResultRow[]>();
    for (const r of results) {
      if (!bySem.has(r.semester)) bySem.set(r.semester, []);
      bySem.get(r.semester)!.push(r);
    }
    return Array.from(bySem.keys()).sort((a, b) => a - b).map((sem) => {
      const rows = bySem.get(sem)!;
      const passed = rows.filter((r) => r.status === "PASS").length;
      const failed = rows.filter((r) => r.status === "FAIL").length;
      const sgpas = rows.map((r) => r.sgpa).filter((v): v is number => v != null && v > 0);
      const totals = rows.map((r) => r.grand_total).filter((v) => v != null && v >= 0);
      return {
        semester: sem,
        label: "Sem " + sem,
        studentCount: rows.length,
        passed,
        failed,
        passRate: rows.length > 0 ? (passed / rows.length) * 100 : 0,
        avgSgpa: avg(sgpas),
        avgTotal: avg(totals),
      };
    });
  }, [results]);

  const momentum = useMemo(() => {
    if (semesterAnalytics.length < 2)
      return { label: "Insufficient Data", icon: "neutral", delta: 0 };
    const last = semesterAnalytics[semesterAnalytics.length - 1];
    const prev = semesterAnalytics[semesterAnalytics.length - 2];
    const delta = last.passRate - prev.passRate;
    if (delta > 2) return { label: "Improving Trend", icon: "up", delta };
    if (delta < -2) return { label: "Declining Trend", icon: "down", delta };
    return { label: "Stable Trend", icon: "neutral", delta };
  }, [semesterAnalytics]);

  const chartData = useMemo(
    () => semesterAnalytics.map((s) => {
      const metricVal = s[metric as keyof SemesterAnalytic] as number;
      return {
        label: s.label,
        semester: s.semester,
        [metric]: +metricVal.toFixed(2),
        passed: s.passed,
        failed: s.failed,
        studentCount: s.studentCount,
      };
    }),
    [semesterAnalytics, metric],
  );



  if (loading) {
    return (
      <Card className="border-border/60 shadow-sm">
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-6 w-64 rounded bg-muted" />
            <div className="h-4 w-40 rounded bg-muted" />
            <div className="h-[320px] rounded-xl bg-muted" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!results.length) {
    return (
      <Card className="border-border/60 shadow-sm">
        <CardContent className="flex items-center justify-center p-12 text-sm text-muted-foreground">
          No result data available. Upload results to view academic analytics.
        </CardContent>
      </Card>
    );
  }

  const metricColor =
    metric === "passRate" ? "#1a4fa8" :
    metric === "avgSgpa" ? "#7c3aed" :
    metric === "avgTotal" ? "#0891b2" :
    metric === "passed" ? "#16a34a" : "#dc2626";

  const momentumClass =
    momentum.icon === "up"
      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
      : momentum.icon === "down"
        ? "bg-red-50 text-red-600 border border-red-200"
        : "bg-slate-50 text-slate-600 border border-slate-200";

  return (
    <Card className="border-border/60 shadow-md overflow-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-6 pt-5 pb-4 border-b border-border/40">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-100">
            <Brain className="h-5 w-5 text-[#1a4fa8]" />
          </div>
          <div>
            <h2 className="text-base font-bold text-foreground tracking-tight">
              Academic Performance Intelligence
            </h2>
            <p className="text-[11px] text-muted-foreground leading-tight">
              All-Semester Academic Analysis &middot; {results.length.toLocaleString()} result record{results.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
        {/* Metric selector */}
        <div className="flex items-center gap-2 text-xs">
          <span className="text-muted-foreground font-medium whitespace-nowrap">Metric:</span>
          <div className="flex flex-wrap gap-1">
            {(Object.keys(METRIC_LABELS) as Metric[]).map((m) => (
              <button
                key={m}
                onClick={() => setMetric(m)}
                className={
                  "rounded-lg px-2.5 py-1 font-medium transition-colors border " +
                  (metric === m
                    ? "bg-[#1a4fa8] text-white border-[#1a4fa8]"
                    : "border-border text-muted-foreground hover:border-[#1a4fa8]/50 hover:text-foreground bg-background")
                }
              >
                {METRIC_LABELS[m]}
              </button>
            ))}
          </div>
        </div>
      </div>

      <CardContent className="p-0">
        <div className="p-5 space-y-5">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-xs font-semibold text-foreground uppercase tracking-wide">
                    Semester Performance Trend
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {METRIC_LABELS[metric]} across {semesterAnalytics.length} semester{semesterAnalytics.length !== 1 ? "s" : ""}
                  </p>
                </div>
                {/* Momentum badge */}
                <div className={"flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold " + momentumClass}>
                  {momentum.icon === "up" ? (
                    <TrendingUp className="h-3.5 w-3.5" />
                  ) : momentum.icon === "down" ? (
                    <TrendingDown className="h-3.5 w-3.5" />
                  ) : (
                    <Minus className="h-3.5 w-3.5" />
                  )}
                  {momentum.label}
                  {momentum.delta !== 0 && (
                    <span className="opacity-70">
                      {momentum.delta > 0 ? "+" : ""}{fmt2(momentum.delta)}%
                    </span>
                  )}
                </div>
              </div>

              {/* Line chart */}
              <div className="h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 8, right: 16, left: -8, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" strokeOpacity={0.7} />
                    <XAxis
                      dataKey="label"
                      stroke="#94a3b8"
                      fontSize={11}
                      tick={{ fill: "#64748b" }}
                    />
                    <YAxis
                      stroke="#94a3b8"
                      fontSize={11}
                      tick={{ fill: "#64748b" }}
                      domain={
                        metric === "passRate" ? [0, 100] :
                        metric === "avgSgpa" ? [0, 10] :
                        ["auto", "auto"]
                      }
                    />
                    <RechartsTooltip content={<CustomTooltip metric={metric} />} />
                    {metric === "passRate" && (
                      <ReferenceLine
                        y={75}
                        stroke="#f59e0b"
                        strokeDasharray="4 4"
                        strokeWidth={1.5}
                        label={{ value: "75% threshold", fontSize: 9, fill: "#f59e0b", position: "insideTopRight" }}
                      />
                    )}
                    <Line
                      type="monotone"
                      dataKey={metric}
                      name={METRIC_LABELS[metric]}
                      stroke={metricColor}
                      strokeWidth={2.5}
                      dot={{ r: 4, fill: metricColor, strokeWidth: 0 }}
                      activeDot={{ r: 6, fill: metricColor }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Semester comparison cards */}
            <div>
              <p className="text-xs font-semibold text-foreground uppercase tracking-wide mb-2.5">
                Semester Breakdown
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
                {semesterAnalytics.map((s) => (
                  <div
                    key={s.semester}
                    className="rounded-xl border border-border/60 bg-muted/20 px-3 py-2.5 hover:border-[#1a4fa8]/40 hover:bg-muted/40 transition-colors"
                  >
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                      Semester {s.semester}
                    </p>
                    <p className="text-lg font-bold text-foreground mt-0.5 leading-none">
                      {fmtPct(s.passRate)}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Pass Rate</p>
                    <div className="mt-1.5 flex items-center justify-between text-[10px]">
                      <span className="text-emerald-600 font-medium">&#10003; {s.passed}</span>
                      <span className="text-red-500 font-medium">&#10007; {s.failed}</span>
                    </div>
                    {s.avgSgpa > 0 && (
                      <p className="mt-1 text-[10px] text-muted-foreground">
                        SGPA <span className="text-violet-600 font-semibold">{fmt2(s.avgSgpa)}</span>
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
      </CardContent>
    </Card>
  );
}

// Sub-components
