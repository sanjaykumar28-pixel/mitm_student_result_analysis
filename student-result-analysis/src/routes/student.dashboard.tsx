import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/layout/PageHeader";
import { PerformanceCard } from "@/components/cards/PerformanceCard";
import { LineChartComponent } from "@/components/charts/LineChartComponent";
import { BarChartComponent } from "@/components/charts/BarChartComponent";
import { useAuth } from "@/context/AuthContext";
import { studentService, type StudentDashboardResponse } from "@/services/studentService";
import { getApiErrorMessage } from "@/services/api";

export const Route = createFileRoute("/student/dashboard")({
  component: StudentDashboard,
});

function StudentDashboard() {
  const { user } = useAuth();
  const [data, setData] = useState<StudentDashboardResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    studentService
      .getDashboard()
      .then((payload) => {
        if (!cancelled) {
          setData(payload);
          setError(null);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setData(null);
          setError(getApiErrorMessage(err, "Could not load your dashboard."));
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const name = data?.name ?? user?.name ?? "";
  const initials =
    name
      .split(" ")
      .map((p) => p[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("") || "S";
  const firstName = name.split(" ")[0] || "Student";
  const subjectComparison = (data?.subject_marks ?? []).map((s) => ({
    name: s.code,
    marks: s.marks,
  }));

  return (
    <div className="flex flex-col gap-6 pb-8 animate-in fade-in duration-500">
      {/* Hero Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-sidebar-primary to-primary-glow shadow-md">
        <div className="absolute inset-0 right-0 w-1/2 ml-auto opacity-40 mix-blend-overlay [mask-image:linear-gradient(to_left,white,transparent)]">
          <img
            src="/images/college.jpeg"
            alt="College Campus"
            className="h-full w-full object-cover"
          />
        </div>
        <div className="relative z-10 flex flex-col justify-center p-8 md:p-10 text-white">
          <h1 className="text-3xl font-bold tracking-tight mb-2">Welcome back, {firstName}</h1>
          <p className="text-white/80 max-w-xl text-[15px]">
            Here's a snapshot of your academic performance. Review your results, track your CGPA
            growth, and monitor your academic status.
          </p>
        </div>
      </div>

      {error ? (
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-sm font-medium">No student data available.</p>
            <p className="mt-1 text-xs text-muted-foreground">{error}</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-1">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <Avatar className="h-16 w-16">
                    <AvatarFallback className="bg-gradient-to-br from-primary to-primary-glow text-lg font-semibold text-primary-foreground">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="truncate text-lg font-semibold">{name || "—"}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {data?.usn ?? user?.usn ?? user?.id} · {data?.email ?? user?.email}
                    </p>
                  </div>
                </div>
                <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-lg bg-muted/50 p-3">
                    <p className="text-xs text-muted-foreground">Department</p>
                    <p className="mt-0.5 font-medium">
                      {data?.department ?? user?.department ?? "—"}
                    </p>
                  </div>
                  <div className="rounded-lg bg-muted/50 p-3">
                    <p className="text-xs text-muted-foreground">Semester</p>
                    <p className="mt-0.5 font-medium">
                      {(data?.semester ?? user?.semester)
                        ? `Semester ${data?.semester ?? user?.semester}`
                        : "—"}
                    </p>
                  </div>
                </div>
                <Badge className="mt-4 bg-success/15 text-success hover:bg-success/15">
                  Academic Status: {data?.academic_status ?? "No result data"}
                </Badge>
              </CardContent>
            </Card>

            <PerformanceCard
              title="Current Semester SGPA"
              value={data?.current_sgpa ?? null}
              description={
                data?.current_semester
                  ? `Semester ${data.current_semester} results`
                  : "No result data available"
              }
            />
            <PerformanceCard
              title="Overall CGPA"
              value={data?.overall_cgpa ?? null}
              description={
                data?.current_semester ? `Latest stored CGPA` : "No result data available"
              }
            />
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">CGPA Growth</CardTitle>
              </CardHeader>
              <CardContent>
                <LineChartComponent
                  data={data?.cgpa_trend ?? []}
                  xKey="semester"
                  lines={[{ key: "cgpa", name: "CGPA" }]}
                />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Current Semester — Subject Marks</CardTitle>
              </CardHeader>
              <CardContent>
                <BarChartComponent
                  data={subjectComparison}
                  xKey="name"
                  bars={[{ key: "marks", name: "Marks" }]}
                />
              </CardContent>
            </Card>
          </div>

          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-base">Recent Results</CardTitle>
            </CardHeader>
            <CardContent>
              {(data?.recent_subjects ?? []).length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  No result data available.
                </p>
              ) : (
                <ul className="divide-y">
                  {data!.recent_subjects.map((s) => (
                    <li key={s.code} className="flex items-center justify-between py-3 text-sm">
                      <div>
                        <p className="font-medium">{s.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {s.code} · {s.credits ?? "—"} credits
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-semibold">{s.marks}</span>
                        <Badge variant="secondary">{s.grade ?? "—"}</Badge>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
