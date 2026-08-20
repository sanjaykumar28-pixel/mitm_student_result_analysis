import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/PageHeader";
import { RankCard } from "@/components/cards/RankCard";
import { TopperTable } from "@/components/tables/TopperTable";
import { BarChartComponent } from "@/components/charts/BarChartComponent";
import { mockStudents, departments } from "@/data/mockData";

export const Route = createFileRoute("/admin/toppers")({
  component: Toppers,
});

function Toppers() {
  const ranked = [...mockStudents].sort((a, b) => b.cgpa - a.cgpa);
  const top10 = ranked.slice(0, 10);
  const top3 = ranked.slice(0, 3);

  const deptToppers = departments.map((d) => {
    const t = ranked.find((s) => s.department === d);
    return { department: d.split(" ")[0], cgpa: t?.cgpa ?? 0 };
  });

  return (
    <>
      <PageHeader title="Top Performers" subtitle="Highest performing students across the institution." />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {top3.map((s, i) => (
          <RankCard key={s.id} rank={i + 1} name={s.name} department={s.department} cgpa={s.cgpa} />
        ))}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">CGPA Comparison (Top 10)</CardTitle></CardHeader>
          <CardContent>
            <BarChartComponent
              data={top10.map((s) => ({ name: s.name.split(" ")[0], cgpa: s.cgpa }))}
              xKey="name"
              bars={[{ key: "cgpa", name: "CGPA" }]}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Department Toppers</CardTitle></CardHeader>
          <CardContent>
            <BarChartComponent
              data={deptToppers}
              xKey="department"
              bars={[{ key: "cgpa", name: "Top CGPA", color: "var(--color-chart-3)" }]}
            />
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader><CardTitle className="text-base">Top 10 Students</CardTitle></CardHeader>
        <CardContent><TopperTable toppers={top10} /></CardContent>
      </Card>
    </>
  );
}
