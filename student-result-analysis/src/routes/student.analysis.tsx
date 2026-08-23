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


        </>
      )}
    </>
  );
}
