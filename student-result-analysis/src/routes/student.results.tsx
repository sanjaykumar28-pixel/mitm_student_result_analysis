import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Download } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { PageHeader } from "@/components/layout/PageHeader";
import { ResultsTable } from "@/components/tables/ResultsTable";
import { gradePoint, type Grade, type SubjectResult } from "@/data/mockData";
import { toast } from "sonner";
import { studentService, type StudentSemesterResult } from "@/services/studentService";
import { getApiErrorMessage } from "@/services/api";

export const Route = createFileRoute("/student/results")({
  component: StudentResults,
});

function toSubjectRows(row: StudentSemesterResult): SubjectResult[] {
  return row.subjects.map((s) => ({
    code: s.code,
    name: s.name,
    credits: s.credits ?? 0,
    marks: s.marks,
    grade: (s.grade as Grade) || ("" as Grade),
  }));
}

function StudentResults() {
  const [semesters, setSemesters] = useState<StudentSemesterResult[]>([]);
  const [sem, setSem] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    studentService
      .getResults()
      .then((data) => {
        if (cancelled) return;
        setSemesters(data.semesters);
        setSem(data.semesters.length ? data.semesters[data.semesters.length - 1].semester : null);
        setError(null);
      })
      .catch((err) => {
        if (cancelled) return;
        setSemesters([]);
        setSem(null);
        setError(getApiErrorMessage(err, "Could not load your results."));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const semData = useMemo(
    () => (sem == null ? undefined : semesters.find((s) => s.semester === sem)),
    [sem, semesters],
  );
  const subjects = semData ? toSubjectRows(semData) : [];
  const totalCredits = subjects.reduce((a, s) => a + s.credits, 0);
  const earnedPoints = subjects.reduce((a, s) => {
    const points = s.grade && s.grade in gradePoint ? gradePoint[s.grade as Grade] : 0;
    return a + s.credits * points;
  }, 0);
  const passed = subjects.length > 0 && subjects.every((s) => s.grade !== "F");

  return (
    <>
      <PageHeader
        title="Semester Results"
        subtitle="Detailed subject-wise marks and grades."
        actions={
          <Button variant="outline" onClick={() => toast.success("Result downloaded")}>
            <Download className="mr-2 h-4 w-4" /> Download Result
          </Button>
        }
      />

      {error ? (
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-sm font-medium">No results found</p>
            <p className="mt-1 text-xs text-muted-foreground">{error}</p>
          </CardContent>
        </Card>
      ) : semesters.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-sm font-medium">No results found</p>
            <p className="mt-1 text-xs text-muted-foreground">No stored results for your account.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card className="mb-4">
            <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground">Semester:</span>
                <Select value={sem == null ? undefined : String(sem)} onValueChange={(v) => setSem(Number(v))}>
                  <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {semesters.map((s) => (
                      <SelectItem key={s.semester} value={String(s.semester)}>Semester {s.semester}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary">SGPA: {semData?.sgpa != null ? semData.sgpa.toFixed(2) : "—"}</Badge>
                <Badge variant="secondary">Credits: {totalCredits}</Badge>
                <Badge variant="secondary">Grade Points: {earnedPoints}</Badge>
                {subjects.length > 0 && (
                  <Badge className={passed ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive"}>
                    {passed ? "Pass" : "Fail"}
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Subject-wise Results</CardTitle></CardHeader>
            <CardContent>
              <ResultsTable subjects={subjects} />
            </CardContent>
          </Card>
        </>
      )}
    </>
  );
}
