import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingDown, TrendingUp } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { LineChartComponent } from "@/components/charts/LineChartComponent";
import { BarChartComponent } from "@/components/charts/BarChartComponent";
import { PieChartComponent } from "@/components/charts/PieChartComponent";
import { AreaChartComponent } from "@/components/charts/AreaChartComponent";
import { studentService, type StudentAnalysisResponse } from "@/services/studentService";
import { getApiErrorMessage } from "@/services/api";

export const Route = createFileRoute("/student/analysis")({
  component: Analysis,
});

function EmptyChart({ message = "No analysis data available." }: { message?: string }) {
  return <p className="flex h-[280px] items-center justify-center text-sm text-muted-foreground">{message}</p>;
}

function Analysis() {
  const [data, setData] = useState<StudentAnalysisResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    studentService
      .getAnalysis()
      .then((payload) => {
        if (!cancelled) {
          setData(payload);
          setError(null);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setData(null);
          setError(getApiErrorMessage(err, "Could not load analysis."));
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const sgpaTrend = (data?.sgpa_trend ?? [])
    .filter((s) => s.sgpa != null)
    .map((s) => ({ semester: s.semester, sgpa: s.sgpa as number }));
  const cgpaTrend = (data?.cgpa_trend ?? [])
    .filter((s) => s.cgpa != null)
    .map((s) => ({ semester: s.semester, cgpa: s.cgpa as number }));
  const subjectStrength = data?.subject_strength ?? [];
  const gradeDistribution = (data?.grade_distribution ?? []).map((g) => ({ name: g.grade, value: g.count }));
  const semesterCompare = (data?.semester_compare ?? [])
    .filter((s) => s.avg != null && s.best != null)
    .map((s) => ({ semester: s.semester, avg: s.avg as number, best: s.best as number }));
  const strong = data?.strong_subjects ?? [];
  const weak = data?.weak_subjects ?? [];

  return (
    <>
      <PageHeader title="Performance Analysis" subtitle="Visualize your academic strengths and growth." />

      {error ? (
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-sm font-medium">No analysis data available.</p>
            <p className="mt-1 text-xs text-muted-foreground">{error}</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader><CardTitle className="text-base">SGPA Trend</CardTitle></CardHeader>
              <CardContent>
                {sgpaTrend.length ? (
                  <LineChartComponent data={sgpaTrend} xKey="semester" lines={[{ key: "sgpa", name: "SGPA" }]} />
                ) : (
                  <EmptyChart />
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">CGPA Growth</CardTitle></CardHeader>
              <CardContent>
                {cgpaTrend.length ? (
                  <AreaChartComponent data={cgpaTrend} xKey="semester" areas={[{ key: "cgpa", name: "CGPA" }]} />
                ) : (
                  <EmptyChart />
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">Subject Strength</CardTitle></CardHeader>
              <CardContent>
                {subjectStrength.length ? (
                  <BarChartComponent
                    data={subjectStrength}
                    xKey="subject"
                    bars={[{ key: "score", name: "Score", color: "var(--color-chart-2)" }]}
                  />
                ) : (
                  <EmptyChart />
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">Grade Distribution</CardTitle></CardHeader>
              <CardContent>
                {gradeDistribution.length ? (
                  <PieChartComponent data={gradeDistribution} />
                ) : (
                  <EmptyChart />
                )}
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader><CardTitle className="text-base">Semester Comparison — Average vs Best</CardTitle></CardHeader>
              <CardContent>
                {semesterCompare.length ? (
                  <BarChartComponent
                    data={semesterCompare}
                    xKey="semester"
                    bars={[
                      { key: "avg", name: "Average" },
                      { key: "best", name: "Best" },
                    ]}
                  />
                ) : (
                  <EmptyChart />
                )}
              </CardContent>
            </Card>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
            <Card>
              <CardHeader className="flex flex-row items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-success/10 text-success">
                  <TrendingUp className="h-5 w-5" />
                </div>
                <CardTitle className="text-base">Strong Subjects</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {strong.length === 0 ? (
                  <p className="py-4 text-sm text-muted-foreground">No analysis data available.</p>
                ) : strong.map((s) => (
                  <div key={s.subject} className="flex items-center justify-between rounded-lg bg-success/5 p-3">
                    <span className="font-medium">{s.subject}</span>
                    <Badge className="bg-success/15 text-success">{s.score}</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
                  <TrendingDown className="h-5 w-5" />
                </div>
                <CardTitle className="text-base">Focus Areas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {weak.length === 0 ? (
                  <p className="py-4 text-sm text-muted-foreground">No analysis data available.</p>
                ) : weak.map((s) => (
                  <div key={s.subject} className="flex items-center justify-between rounded-lg bg-destructive/5 p-3">
                    <span className="font-medium">{s.subject}</span>
                    <Badge className="bg-destructive/15 text-destructive">{s.score}</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </>
  );
}
