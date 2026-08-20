import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, Trash2, Calculator } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { PageHeader } from "@/components/layout/PageHeader";
import { gradePoint, type Grade } from "@/data/mockData";

export const Route = createFileRoute("/student/sgpa-cgpa")({
  component: SgpaCgpa,
});

interface Row { id: number; name: string; credits: number; grade: Grade }
interface SemRow { id: number; sgpa: number; credits: number }

const grades: Grade[] = ["O", "A+", "A", "B+", "B", "C", "F"];

function SgpaCgpa() {
  const [rows, setRows] = useState<Row[]>([
    { id: 1, name: "Subject 1", credits: 4, grade: "A+" },
    { id: 2, name: "Subject 2", credits: 3, grade: "A" },
    { id: 3, name: "Subject 3", credits: 4, grade: "O" },
  ]);
  const [sems, setSems] = useState<SemRow[]>([
    { id: 1, sgpa: 8.6, credits: 22 },
    { id: 2, sgpa: 8.9, credits: 22 },
    { id: 3, sgpa: 9.1, credits: 22 },
  ]);

  const sgpa = (() => {
    const totalC = rows.reduce((a, r) => a + r.credits, 0);
    if (!totalC) return 0;
    const totalP = rows.reduce((a, r) => a + r.credits * gradePoint[r.grade], 0);
    return totalP / totalC;
  })();

  const cgpa = (() => {
    const totalC = sems.reduce((a, s) => a + s.credits, 0);
    if (!totalC) return 0;
    const totalP = sems.reduce((a, s) => a + s.sgpa * s.credits, 0);
    return totalP / totalC;
  })();

  return (
    <>
      <PageHeader title="SGPA & CGPA Calculator" subtitle="Quickly estimate your semester and cumulative CGPA." />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">SGPA Calculator</CardTitle>
            <Badge className="bg-primary/10 text-primary text-base">{sgpa.toFixed(2)}</Badge>
          </CardHeader>
          <CardContent className="space-y-3">
            {rows.map((r, i) => (
              <div key={r.id} className="grid grid-cols-12 gap-2">
                <Input
                  className="col-span-5"
                  value={r.name}
                  onChange={(e) => setRows((rs) => rs.map((x, j) => j === i ? { ...x, name: e.target.value } : x))}
                />
                <Input
                  type="number" min={1} max={6}
                  className="col-span-3"
                  value={r.credits}
                  onChange={(e) => setRows((rs) => rs.map((x, j) => j === i ? { ...x, credits: Number(e.target.value) } : x))}
                />
                <Select
                  value={r.grade}
                  onValueChange={(v) => setRows((rs) => rs.map((x, j) => j === i ? { ...x, grade: v as Grade } : x))}
                >
                  <SelectTrigger className="col-span-3"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {grades.map((g) => <SelectItem key={g} value={g}>{g} ({gradePoint[g]})</SelectItem>)}
                  </SelectContent>
                </Select>
                <Button size="icon" variant="ghost" className="col-span-1"
                  onClick={() => setRows((rs) => rs.filter((_, j) => j !== i))}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
            <Button variant="outline" size="sm"
              onClick={() => setRows((rs) => [...rs, { id: Date.now(), name: `Subject ${rs.length + 1}`, credits: 3, grade: "A" }])}
            >
              <Plus className="mr-2 h-4 w-4" /> Add Subject
            </Button>
            <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
              <span className="font-medium text-foreground">Formula:</span> SGPA = Σ(Credit × Grade Point) / Σ(Credit)
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">CGPA Calculator</CardTitle>
            <Badge className="bg-primary/10 text-primary text-base">{cgpa.toFixed(2)}</Badge>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-12 gap-2 text-xs font-medium text-muted-foreground">
              <Label className="col-span-5">Semester</Label>
              <Label className="col-span-3">SGPA</Label>
              <Label className="col-span-3">Credits</Label>
            </div>
            {sems.map((s, i) => (
              <div key={s.id} className="grid grid-cols-12 gap-2">
                <div className="col-span-5 flex items-center rounded-md border bg-muted/30 px-3 text-sm">
                  Semester {i + 1}
                </div>
                <Input
                  type="number" step="0.01" min={0} max={10}
                  className="col-span-3"
                  value={s.sgpa}
                  onChange={(e) => setSems((ss) => ss.map((x, j) => j === i ? { ...x, sgpa: Number(e.target.value) } : x))}
                />
                <Input
                  type="number" min={1}
                  className="col-span-3"
                  value={s.credits}
                  onChange={(e) => setSems((ss) => ss.map((x, j) => j === i ? { ...x, credits: Number(e.target.value) } : x))}
                />
                <Button size="icon" variant="ghost" className="col-span-1"
                  onClick={() => setSems((ss) => ss.filter((_, j) => j !== i))}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
            <Button variant="outline" size="sm"
              onClick={() => setSems((ss) => [...ss, { id: Date.now(), sgpa: 8, credits: 22 }])}
            >
              <Plus className="mr-2 h-4 w-4" /> Add Semester
            </Button>
            <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
              <span className="font-medium text-foreground">Formula:</span> CGPA = Σ(SGPA × Credits) / Σ(Credits)
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardContent className="flex items-center gap-3 p-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Calculator className="h-5 w-5" />
          </div>
          <p className="text-sm text-muted-foreground">
            Tip: Grade points — O=10, A+=9, A=8, B+=7, B=6, C=5, F=0. Credits typically range from 1–4 per subject.
          </p>
        </CardContent>
      </Card>
    </>
  );
}
