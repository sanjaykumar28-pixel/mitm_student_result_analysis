import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingDown, TrendingUp } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { LineChartComponent } from "@/components/charts/LineChartComponent";
import { BarChartComponent } from "@/components/charts/BarChartComponent";
import { PieChartComponent } from "@/components/charts/PieChartComponent";
import { AreaChartComponent } from "@/components/charts/AreaChartComponent";
import { cgpaGrowth, subjectStrength, studentSemesterResults, gradeDistribution } from "@/data/mockData";

export const Route = createFileRoute("/student/analysis")({
  component: Analysis,
});

function Analysis() {
  const sgpaTrend = studentSemesterResults.map((s) => ({
    semester: `S${s.semester}`,
    sgpa: s.sgpa,
  }));

  const semesterCompare = studentSemesterResults.map((s) => ({
    semester: `Sem ${s.semester}`,
    avg: s.subjects.reduce((a, x) => a + x.marks, 0) / s.subjects.length,
    best: Math.max(...s.subjects.map((x) => x.marks)),
  }));

  const sorted = [...subjectStrength].sort((a, b) => b.score - a.score);
  const strong = sorted.slice(0, 3);
  const weak = [...subjectStrength].sort((a, b) => a.score - b.score).slice(0, 3);

  return (
    <>
      <PageHeader title="Performance Analysis" subtitle="Visualize your academic strengths and growth." />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">SGPA Trend</CardTitle></CardHeader>
          <CardContent>
            <LineChartComponent data={sgpaTrend} xKey="semester" lines={[{ key: "sgpa", name: "SGPA" }]} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">CGPA Growth</CardTitle></CardHeader>
          <CardContent>
            <AreaChartComponent data={cgpaGrowth} xKey="semester" areas={[{ key: "cgpa", name: "CGPA" }]} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Subject Strength</CardTitle></CardHeader>
          <CardContent>
            <BarChartComponent
              data={subjectStrength}
              xKey="subject"
              bars={[{ key: "score", name: "Score", color: "var(--color-chart-2)" }]}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Grade Distribution</CardTitle></CardHeader>
          <CardContent>
            <PieChartComponent data={gradeDistribution.map((g) => ({ name: g.grade, value: g.count }))} />
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-base">Semester Comparison — Average vs Best</CardTitle></CardHeader>
          <CardContent>
            <BarChartComponent
              data={semesterCompare}
              xKey="semester"
              bars={[
                { key: "avg", name: "Average" },
                { key: "best", name: "Best" },
              ]}
            />
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
            {strong.map((s) => (
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
            {weak.map((s) => (
              <div key={s.subject} className="flex items-center justify-between rounded-lg bg-destructive/5 p-3">
                <span className="font-medium">{s.subject}</span>
                <Badge className="bg-destructive/15 text-destructive">{s.score}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
