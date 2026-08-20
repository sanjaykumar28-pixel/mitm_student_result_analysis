import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/PageHeader";
import { RankCard } from "@/components/cards/RankCard";
import { TopperTable } from "@/components/tables/TopperTable";
import { BarChartComponent } from "@/components/charts/BarChartComponent";
import type { Student } from "@/data/mockData";
import { adminService, type AdminTopperRow } from "@/services/adminService";
import { getApiErrorMessage } from "@/services/api";

export const Route = createFileRoute("/admin/toppers")({
  component: Toppers,
});

function toStudent(row: AdminTopperRow): Student {
  return {
    id: row.usn,
    name: row.name,
    email: "",
    department: row.department,
    semester: row.semester,
    cgpa: row.cgpa,
  };
}

function Toppers() {
  const [top10, setTop10] = useState<Student[]>([]);
  const [deptToppers, setDeptToppers] = useState<Array<{ department: string; cgpa: number }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    adminService
      .getToppers()
      .then((data) => {
        if (cancelled) return;
        setTop10((data.toppers ?? []).map(toStudent));
        setDeptToppers(
          (data.department_toppers ?? []).map((d) => ({
            department: d.department.split(" ")[0],
            cgpa: d.cgpa,
          })),
        );
      })
      .catch((err) => {
        if (cancelled) return;
        setTop10([]);
        setDeptToppers([]);
        setError(getApiErrorMessage(err, "Could not load topper data."));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const top3 = top10.slice(0, 3);

  return (
    <>
      <PageHeader title="Top Performers" subtitle="Highest performing students across the institution." />

      {loading ? (
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-sm text-muted-foreground">Loading topper data…</p>
          </CardContent>
        </Card>
      ) : error ? (
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-sm font-medium">No topper data available.</p>
            <p className="mt-1 text-xs text-muted-foreground">{error}</p>
          </CardContent>
        </Card>
      ) : top10.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-sm font-medium">No topper data available.</p>
          </CardContent>
        </Card>
      ) : (
        <>
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
      )}
    </>
  );
}
