import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Plus, Trash2, Calculator, TrendingUp, Award, BookOpen } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/layout/PageHeader";
import { gradePoint, type Grade } from "@/data/mockData";
import { studentService } from "@/services/studentService";
import { getApiErrorMessage } from "@/services/api";

export const Route = createFileRoute("/student/sgpa-cgpa")({
  component: SgpaCgpa,
});

interface PredictRow {
  id: number;
  code: string;
  name: string;
  credits: number;
  internal: number;
  external: number;
}

interface SemRow {
  id: number;
  semester: number;
  sgpa: number;
  credits: number;
}

const MAX_CIE = 50;
const MAX_SEE = 50;
const MAX_TOTAL = MAX_CIE + MAX_SEE;

function calculateGrade(percentage: number): Grade {
  if (percentage >= 90) return "O";
  if (percentage >= 80) return "A+";
  if (percentage >= 70) return "A";
  if (percentage >= 60) return "B+";
  if (percentage >= 50) return "B";
  if (percentage >= 40) return "C";
  return "F";
}

function SgpaCgpa() {
  const [rows, setRows] = useState<PredictRow[]>([]);
  const [sems, setSems] = useState<SemRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    studentService
      .getSgpaCgpa()
      .then((data) => {
        if (cancelled) return;
        setRows(
          data.subjects.map((s, i) => {
            // Estimate some default values if we only have total marks
            const defaultInternal = Math.min(MAX_CIE, Math.floor((s.marks || 0) / 2));
            const defaultExternal = Math.min(MAX_SEE, Math.ceil((s.marks || 0) / 2));

            return {
              id: i + 1,
              code: s.code || `SUB${i + 1}`,
              name: s.name,
              credits: s.credits || 3,
              internal: defaultInternal,
              external: defaultExternal,
            };
          }),
        );
        setSems(
          data.semesters
            .filter((s) => s.sgpa != null && s.credits > 0)
            .map((s) => ({
              id: s.semester,
              semester: s.semester,
              sgpa: s.sgpa as number,
              credits: s.credits,
            })),
        );
        setError(null);
        setLoaded(true);
      })
      .catch((err) => {
        if (cancelled) return;
        setRows([]);
        setSems([]);
        setError(getApiErrorMessage(err, "Could not load SGPA/CGPA data."));
        setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Compute Current Semester Results
  const computedRows = rows.map((r) => {
    const total = (r.internal || 0) + (r.external || 0);
    const percentage = Math.min((total / MAX_TOTAL) * 100, 100);
    const grade = calculateGrade(percentage);
    const gp = gradePoint[grade];
    return { ...r, total, percentage, grade, gp };
  });

  const predictedSgpa = (() => {
    const totalC = computedRows.reduce((a, r) => a + r.credits, 0);
    if (!totalC) return 0;
    const totalP = computedRows.reduce((a, r) => a + r.credits * r.gp, 0);
    return totalP / totalC;
  })();

  const currentSemesterCredits = computedRows.reduce((a, r) => a + r.credits, 0);

  // Compute Overall CGPA
  const predictedCgpa = (() => {
    let totalCredits = 0;
    let totalPoints = 0;

    // Add previous semesters
    sems.forEach((s) => {
      totalCredits += s.credits;
      totalPoints += s.sgpa * s.credits;
    });

    // Add current predicted semester
    totalCredits += currentSemesterCredits;
    totalPoints += predictedSgpa * currentSemesterCredits;

    if (!totalCredits) return 0;
    return totalPoints / totalCredits;
  })();

  const totalCreditsEarned = sems.reduce((a, s) => a + s.credits, 0) + currentSemesterCredits;

  // Calculate predicted overall grade based on predicted CGPA
  const predictedOverallGrade = calculateGrade(predictedCgpa * 10);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Result Prediction Calculator"
        subtitle="Enter your internal and predicted external marks to estimate your SGPA and CGPA."
      />

      {error ? (
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-sm font-medium">Data unavailable</p>
            <p className="mt-1 text-xs text-muted-foreground">{error}</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* SECTION 1 - CURRENT SEMESTER */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Current Semester Result Prediction</CardTitle>
                  <CardDescription>
                    Enter your internal marks (CIE) and predicted external marks (SEE) to estimate your final result.
                  </CardDescription>
                </div>
                <Badge className="bg-primary/10 text-primary px-4 py-1 text-lg font-bold">
                  SGPA: {predictedSgpa.toFixed(2)}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-md border overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b bg-muted/50 text-muted-foreground">
                    <tr>
                      <th className="h-10 px-4 text-left font-medium align-middle">S.No.</th>
                      <th className="h-10 px-4 text-left font-medium align-middle">Subject Code</th>
                      <th className="h-10 px-4 text-left font-medium align-middle min-w-[200px]">Subject Name</th>
                      <th className="h-10 px-4 text-left font-medium align-middle">Credits</th>
                      <th className="h-10 px-4 text-left font-medium align-middle">Internal (CIE)</th>
                      <th className="h-10 px-4 text-left font-medium align-middle">Predicted External (SEE)</th>
                      <th className="h-10 px-4 text-left font-medium align-middle">Total</th>
                      <th className="h-10 px-4 text-left font-medium align-middle">Grade Point</th>
                      <th className="h-10 px-4 text-left font-medium align-middle">Grade</th>
                      <th className="h-10 px-4 text-left font-medium align-middle"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {loaded && computedRows.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="py-6 text-center text-sm text-muted-foreground">
                          No subjects available. Add a subject to start predicting.
                        </td>
                      </tr>
                    ) : (
                      computedRows.map((r, i) => (
                        <tr key={r.id} className="border-b last:border-0 transition-colors hover:bg-muted/50">
                          <td className="p-4 align-middle">{i + 1}</td>
                          <td className="p-2 align-middle">
                            <Input
                              value={r.code}
                              className="h-8 min-w-[80px]"
                              onChange={(e) => setRows((rs) => rs.map((x, j) => j === i ? { ...x, code: e.target.value } : x))}
                            />
                          </td>
                          <td className="p-2 align-middle">
                            <Input
                              value={r.name}
                              className="h-8"
                              onChange={(e) => setRows((rs) => rs.map((x, j) => j === i ? { ...x, name: e.target.value } : x))}
                            />
                          </td>
                          <td className="p-2 align-middle">
                            <Input
                              type="number" min={1} max={6}
                              className="h-8 w-[70px]"
                              value={r.credits}
                              onChange={(e) => setRows((rs) => rs.map((x, j) => j === i ? { ...x, credits: Number(e.target.value) } : x))}
                            />
                          </td>
                          <td className="p-2 align-middle">
                            <Input
                              type="number" min={0} max={MAX_CIE}
                              className="h-8 w-[80px]"
                              value={r.internal || ""}
                              onChange={(e) => setRows((rs) => rs.map((x, j) => j === i ? { ...x, internal: Math.min(MAX_CIE, Math.max(0, Number(e.target.value))) } : x))}
                            />
                          </td>
                          <td className="p-2 align-middle">
                            <Input
                              type="number" min={0} max={MAX_SEE}
                              className="h-8 w-[80px]"
                              value={r.external || ""}
                              onChange={(e) => setRows((rs) => rs.map((x, j) => j === i ? { ...x, external: Math.min(MAX_SEE, Math.max(0, Number(e.target.value))) } : x))}
                            />
                          </td>
                          <td className="p-4 align-middle font-medium">{r.total}</td>
                          <td className="p-4 align-middle">{r.gp}</td>
                          <td className="p-4 align-middle">
                            <Badge variant={r.grade === "F" ? "destructive" : "outline"} className={r.grade !== "F" ? "bg-primary/5 border-primary/20" : ""}>
                              {r.grade}
                            </Badge>
                          </td>
                          <td className="p-2 align-middle">
                            <Button size="icon" variant="ghost" onClick={() => setRows((rs) => rs.filter((_, j) => j !== i))}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-between">
                <Button variant="outline" size="sm" onClick={() => setRows((rs) => [...rs, { id: Date.now(), code: `SUB${rs.length + 1}`, name: `Subject ${rs.length + 1}`, credits: 3, internal: 0, external: 0 }])}>
                  <Plus className="mr-2 h-4 w-4" /> Add Subject
                </Button>

                <div className="text-sm font-medium">
                  Current Semester Credits: {currentSemesterCredits}
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* SECTION 2 - PREVIOUS SEMESTERS */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Previous Semesters</CardTitle>
                <CardDescription>
                  Enter previous semester details to calculate cumulative CGPA.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-md border">
                  <table className="w-full text-sm">
                    <thead className="border-b bg-muted/50 text-muted-foreground">
                      <tr>
                        <th className="h-10 px-4 text-left font-medium">Semester</th>
                        <th className="h-10 px-4 text-left font-medium">Credits Earned</th>
                        <th className="h-10 px-4 text-left font-medium">SGPA</th>
                        <th className="h-10 px-4 text-left font-medium"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {loaded && sems.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="py-6 text-center text-sm text-muted-foreground">
                            No previous semesters added.
                          </td>
                        </tr>
                      ) : (
                        sems.map((s, i) => (
                          <tr key={s.id} className="border-b last:border-0 hover:bg-muted/50 transition-colors">
                            <td className="p-2 align-middle">
                              <div className="flex items-center rounded-md border bg-muted/30 px-3 h-8 w-[120px] text-sm">
                                Semester {s.semester}
                              </div>
                            </td>
                            <td className="p-2 align-middle">
                              <Input
                                type="number" min={1}
                                className="h-8 w-[100px]"
                                value={s.credits || ""}
                                onChange={(e) => setSems((ss) => ss.map((x, j) => j === i ? { ...x, credits: Number(e.target.value) } : x))}
                              />
                            </td>
                            <td className="p-2 align-middle">
                              <Input
                                type="number" step="0.01" min={0} max={10}
                                className="h-8 w-[100px]"
                                value={s.sgpa || ""}
                                onChange={(e) => setSems((ss) => ss.map((x, j) => j === i ? { ...x, sgpa: Math.min(10, Math.max(0, Number(e.target.value))) } : x))}
                              />
                            </td>
                            <td className="p-2 align-middle text-right">
                              <Button size="icon" variant="ghost" onClick={() => setSems((ss) => ss.filter((_, j) => j !== i))}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
                <Button variant="outline" size="sm" onClick={() => setSems((ss) => [...ss, { id: Date.now(), semester: ss.length + 1, sgpa: 0, credits: 20 }])}>
                  <Plus className="mr-2 h-4 w-4" /> Add Semester
                </Button>
              </CardContent>
            </Card>

            {/* SECTION 3 - PREDICTED FINAL RESULT */}
            <Card className="bg-primary/5 border-primary/20">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  Predicted Final Result
                </CardTitle>
                <CardDescription>
                  Your overall performance prediction including current semester.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-xl border bg-background p-4 shadow-sm">
                    <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-2">
                      <Calculator className="h-4 w-4" /> Predicted SGPA
                    </div>
                    <div className="text-3xl font-bold text-foreground">
                      {predictedSgpa.toFixed(2)}
                    </div>
                  </div>

                  <div className="rounded-xl border bg-background p-4 shadow-sm border-primary/30 ring-1 ring-primary/10">
                    <div className="flex items-center gap-2 text-sm font-medium text-primary mb-2">
                      <Award className="h-4 w-4" /> Predicted CGPA
                    </div>
                    <div className="text-3xl font-bold text-primary">
                      {predictedCgpa.toFixed(2)}
                    </div>
                  </div>

                  <div className="rounded-xl border bg-background p-4 shadow-sm">
                    <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-2">
                      <TrendingUp className="h-4 w-4" /> Overall Grade
                    </div>
                    <div className="text-2xl font-bold">
                      <Badge variant={predictedOverallGrade === "F" ? "destructive" : "default"} className="text-base px-3">
                        {predictedOverallGrade}
                      </Badge>
                    </div>
                  </div>

                  <div className="rounded-xl border bg-background p-4 shadow-sm">
                    <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-2">
                      <BookOpen className="h-4 w-4" /> Total Credits
                    </div>
                    <div className="text-2xl font-bold text-foreground">
                      {totalCreditsEarned}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
