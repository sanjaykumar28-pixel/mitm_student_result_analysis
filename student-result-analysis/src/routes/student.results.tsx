import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Download } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { PageHeader } from "@/components/layout/PageHeader";
import { ResultsTable } from "@/components/tables/ResultsTable";
import { studentSemesterResults, gradePoint } from "@/data/mockData";
import { toast } from "sonner";

export const Route = createFileRoute("/student/results")({
  component: StudentResults,
});

function StudentResults() {
  const [sem, setSem] = useState<number>(studentSemesterResults.length);
  const semData = studentSemesterResults.find((s) => s.semester === sem) ?? studentSemesterResults[0];
  const totalCredits = semData.subjects.reduce((a, s) => a + s.credits, 0);
  const earnedPoints = semData.subjects.reduce((a, s) => a + s.credits * gradePoint[s.grade], 0);
  const passed = semData.subjects.every((s) => s.grade !== "F");

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

      <Card className="mb-4">
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">Semester:</span>
            <Select value={String(sem)} onValueChange={(v) => setSem(Number(v))}>
              <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                {studentSemesterResults.map((s) => (
                  <SelectItem key={s.semester} value={String(s.semester)}>Semester {s.semester}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">SGPA: {semData.sgpa.toFixed(2)}</Badge>
            <Badge variant="secondary">Credits: {totalCredits}</Badge>
            <Badge variant="secondary">Grade Points: {earnedPoints}</Badge>
            <Badge className={passed ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive"}>
              {passed ? "Pass" : "Fail"}
            </Badge>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Subject-wise Results</CardTitle></CardHeader>
        <CardContent>
          <ResultsTable subjects={semData.subjects} />
        </CardContent>
      </Card>
    </>
  );
}
