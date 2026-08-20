import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/layout/PageHeader";
import { PerformanceCard } from "@/components/cards/PerformanceCard";
import { LineChartComponent } from "@/components/charts/LineChartComponent";
import { BarChartComponent } from "@/components/charts/BarChartComponent";
import { useAuth } from "@/context/AuthContext";
import { cgpaGrowth, studentSemesterResults } from "@/data/mockData";

export const Route = createFileRoute("/student/dashboard")({
  component: StudentDashboard,
});

function StudentDashboard() {
  const { user } = useAuth();
  const current = studentSemesterResults[studentSemesterResults.length - 1];
  const initials = user?.name.split(" ").map((p) => p[0]).slice(0, 2).join("") ?? "S";

  const subjectComparison = current.subjects.map((s) => ({
    name: s.code,
    marks: s.marks,
  }));

  return (
    <>
      <PageHeader title={`Welcome back, ${user?.name.split(" ")[0]} 👋`} subtitle="Here's a snapshot of your academic performance." />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarFallback className="bg-gradient-to-br from-primary to-primary-glow text-lg font-semibold text-primary-foreground">{initials}</AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="truncate text-lg font-semibold">{user?.name}</p>
                <p className="truncate text-xs text-muted-foreground">{user?.id} · {user?.email}</p>
              </div>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-lg bg-muted/50 p-3">
                <p className="text-xs text-muted-foreground">Department</p>
                <p className="mt-0.5 font-medium">{user?.department}</p>
              </div>
              <div className="rounded-lg bg-muted/50 p-3">
                <p className="text-xs text-muted-foreground">Semester</p>
                <p className="mt-0.5 font-medium">Semester {user?.semester}</p>
              </div>
            </div>
            <Badge className="mt-4 bg-success/15 text-success hover:bg-success/15">Academic Status: Excellent</Badge>
          </CardContent>
        </Card>

        <PerformanceCard title="Current Semester SGPA" value={current.sgpa} description="Semester 5 results" />
        <PerformanceCard title="Overall CGPA" value={9.21} description="Across 5 semesters" />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">CGPA Growth</CardTitle></CardHeader>
          <CardContent>
            <LineChartComponent data={cgpaGrowth} xKey="semester" lines={[{ key: "cgpa", name: "CGPA" }]} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Current Semester — Subject Marks</CardTitle></CardHeader>
          <CardContent>
            <BarChartComponent data={subjectComparison} xKey="name" bars={[{ key: "marks", name: "Marks" }]} />
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader><CardTitle className="text-base">Recent Results</CardTitle></CardHeader>
        <CardContent>
          <ul className="divide-y">
            {current.subjects.map((s) => (
              <li key={s.code} className="flex items-center justify-between py-3 text-sm">
                <div>
                  <p className="font-medium">{s.name}</p>
                  <p className="text-xs text-muted-foreground">{s.code} · {s.credits} credits</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-semibold">{s.marks}</span>
                  <Badge variant="secondary">{s.grade}</Badge>
                </div>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </>
  );
}
