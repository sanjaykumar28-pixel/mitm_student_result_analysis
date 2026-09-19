import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/PageHeader";
import { RankCard } from "@/components/cards/RankCard";
import { TopperTable, type TopperEntry } from "@/components/tables/TopperTable";
import { BarChartComponent } from "@/components/charts/BarChartComponent";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Info } from "lucide-react";
import { adminService, type AdminTopperRow } from "@/services/adminService";
import { getApiErrorMessage } from "@/services/api";

export const Route = createFileRoute("/admin/toppers")({
  component: Toppers,
});

function toTopperEntry(row: AdminTopperRow): TopperEntry {
  return {
    id: row.usn,
    name: row.name,
    department: row.department,
    semester: row.semester,
    cgpa: row.cgpa,
    academic_year: null,
  };
}

function Toppers() {
  const [top10, setTop10] = useState<TopperEntry[]>([]);
  const [semesterToppers, setSemesterToppers] = useState<
    Array<{ semester: number; studentName: string; cgpa: number }>
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    Promise.all([adminService.getToppers(), adminService.getResults()])
      .then(([toppersData, resultsData]) => {
        if (cancelled) return;

        // Top-10 overall list (unchanged)
        const toppers = toppersData.toppers ?? [];
        setTop10(toppers.map(toTopperEntry));

        // Semester Topper List — derived from the FULL results dataset so
        // every semester with valid data appears, not just semesters that
        // happen to be represented in the top-10 overall list.
        const allResults = resultsData.results ?? [];
        const semMap: Record<number, { semester: number; studentName: string; cgpa: number }> = {};

        for (const res of allResults) {
          if (res.semester == null || res.cgpa == null || res.cgpa <= 0) continue;
          const existing = semMap[res.semester];
          if (!existing || res.cgpa > existing.cgpa) {
            semMap[res.semester] = {
              semester: res.semester,
              studentName: res.student_name,
              cgpa: res.cgpa,
            };
          }
        }

        setSemesterToppers(Object.values(semMap).sort((a, b) => a.semester - b.semester));
      })
      .catch((err) => {
        if (cancelled) return;
        setTop10([]);
        setSemesterToppers([]);
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
    <div className="flex flex-col gap-6 pb-8 animate-in fade-in duration-500">
      <PageHeader
        title="Top Performers"
        subtitle="Highest performing students across the institution."
      />

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
              <RankCard
                key={s.id}
                rank={i + 1}
                name={s.name}
                department={s.department}
                cgpa={s.cgpa}
              />
            ))}
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">CGPA Comparison (Top 10)</CardTitle>
              </CardHeader>
              <CardContent>
                <BarChartComponent
                  data={top10.map((s) => ({ name: s.name.split(" ")[0], cgpa: s.cgpa }))}
                  xKey="name"
                  bars={[{ key: "cgpa", name: "CGPA" }]}
                />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Semester Topper List</CardTitle>
              </CardHeader>
              <CardContent>
                {semesterToppers.length === 0 ? (
                  <div className="flex h-[200px] items-center justify-center">
                    <p className="text-sm text-muted-foreground">
                      No semester topper data available.
                    </p>
                  </div>
                ) : (
                  <>
                    <Table>
                      <TableHeader className="bg-muted/50">
                        <TableRow>
                          <TableHead>Semester</TableHead>
                          <TableHead>Topper</TableHead>
                          <TableHead className="text-right">CGPA</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {semesterToppers.map((st) => (
                          <TableRow key={st.semester}>
                            <TableCell className="font-medium">Semester {st.semester}</TableCell>
                            <TableCell>{st.studentName}</TableCell>
                            <TableCell className="text-right">{st.cgpa.toFixed(2)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
                      <Info className="h-4 w-4" />
                      <p>Topper is based on the highest CGPA in each semester.</p>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-base">Top 10 Students</CardTitle>
            </CardHeader>
            <CardContent>
              <TopperTable toppers={top10} />
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
