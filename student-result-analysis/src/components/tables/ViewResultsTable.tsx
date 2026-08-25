import { useState } from "react";
import { FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { AdminResultRow } from "@/services/adminService";
import { gradePoint, type Grade } from "@/data/mockData";

// ── helpers ──────────────────────────────────────────────────────────────────

function fmt(value: number | null | undefined, digits = 2) {
  if (value === null || value === undefined) return "—";
  return Number(value).toFixed(digits);
}

function CgpaBadge({ value }: { value: number | null | undefined }) {
  if (value === null || value === undefined)
    return <span className="text-muted-foreground">—</span>;
  const num = Number(value);
  let colorClass = "bg-primary/10 text-primary border border-primary/20";
  if (num >= 9)
    colorClass = "bg-emerald-50 text-emerald-700 border border-emerald-200";
  else if (num >= 8)
    colorClass = "bg-blue-50 text-blue-700 border border-blue-200";
  else if (num >= 7)
    colorClass = "bg-amber-50 text-amber-700 border border-amber-200";
  else colorClass = "bg-red-50 text-red-600 border border-red-200";
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${colorClass}`}
    >
      {num.toFixed(2)}
    </span>
  );
}

// ── Grade legend data (matches backend grading.py GRADE_POINTS) ───────────────
const GRADE_LEGEND: Array<{ grade: string; label: string; points: number }> = [
  { grade: "O", label: "Outstanding", points: 10 },
  { grade: "A+", label: "Excellent", points: 9 },
  { grade: "A", label: "Very Good", points: 8 },
  { grade: "B+", label: "Good", points: 7 },
  { grade: "B", label: "Average", points: 6 },
  { grade: "C", label: "Pass", points: 5 },
  { grade: "F", label: "Fail", points: 0 },
];


// ── Dummy Subject Data for UI Testing ─────────────────────────────────────────
const dummySubjects = [
  {
    code: "MCA101",
    name: "Mathematics for Computer Science",
    credits: 4,
    grade: "A",
    internal_marks: 42,
    external_marks: 44,
    total_marks: 86,
  },
  {
    code: "MCA102",
    name: "Problem Solving using Python",
    credits: 4,
    grade: "A+",
    internal_marks: 45,
    external_marks: 47,
    total_marks: 92,
  },
  {
    code: "MCA103",
    name: "Computer Organization",
    credits: 4,
    grade: "A",
    internal_marks: 43,
    external_marks: 42,
    total_marks: 85,
  },
  {
    code: "MCA104",
    name: "Web Technologies",
    credits: 4,
    grade: "A",
    internal_marks: 41,
    external_marks: 43,
    total_marks: 84,
  },
  {
    code: "MCA105",
    name: "Programming in JAVA",
    credits: 4,
    grade: "B+",
    internal_marks: 38,
    external_marks: 37,
    total_marks: 75,
  },
  {
    code: "MCA106",
    name: "Database Management Systems",
    credits: 4,
    grade: "A",
    internal_marks: 42,
    external_marks: 41,
    total_marks: 83,
  },
];

// ── Result Sheet Modal ────────────────────────────────────────────────────────
function ResultSheetModal({
  row,
  open,
  onClose,
}: {
  row: AdminResultRow | null;
  open: boolean;
  onClose: () => void;
}) {
  if (!row) return null;

  const gradePointValue =
    row.grade && row.grade in gradePoint
      ? gradePoint[row.grade as Grade]
      : null;

  // Compute total grade points from summary figures available
  // grand_total = sum of all subject totals; credits_earned already provided
  // We can compute weighted points if sgpa and credits_earned are available
  const totalPoints =
    row.sgpa != null && row.credits_earned != null
      ? (row.sgpa * row.credits_earned).toFixed(1)
      : "—";

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-[95vw] lg:max-w-5xl xl:max-w-[1200px] w-full max-h-[90vh] overflow-y-auto overflow-x-hidden p-0">
        {/* ── Header ── */}
        <DialogHeader className="px-6 pt-6 pb-4 border-b bg-muted/30">
          <DialogTitle className="flex items-center gap-2 text-lg font-bold tracking-tight">
            <FileText className="h-5 w-5 text-primary" />
            Student Result Sheet
          </DialogTitle>
          <p className="text-xs text-muted-foreground mt-0.5">
            Maharaja Institute of Technology Mysore · Provisional Grade Card
          </p>
        </DialogHeader>

        <div className="px-6 py-5 space-y-6">
          {/* ── Student Info Card ── */}
          <div className="rounded-xl border bg-card p-5 shadow-sm flex flex-col sm:flex-row justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center text-xl font-bold text-primary select-none shrink-0">
                {row.student_name.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase()}
              </div>
              <div>
                <h2 className="text-lg font-bold text-foreground uppercase tracking-wide leading-tight">
                  {row.student_name}
                </h2>
                <p className="text-sm text-muted-foreground mt-1 font-mono font-medium">
                  {row.usn}
                </p>
              </div>
            </div>
            <div className="flex flex-col justify-center gap-1.5 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground w-24">Department</span>
                <span className="font-semibold text-foreground">: {row.department}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground w-24">Semester</span>
                <span className="font-semibold text-foreground">: {row.semester}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground w-24">CGPA</span>
                <span className="font-semibold text-foreground">: {row.cgpa != null ? Number(row.cgpa).toFixed(2) : "—"}</span>
              </div>
            </div>
          </div>

          {/* ── Subject-wise Results ── */}
          <section className="rounded-xl border bg-card shadow-sm overflow-hidden">
            <div className="bg-muted/30 px-5 py-4 border-b">
              <h3 className="text-base font-bold text-foreground">
                Subject-wise Results (Semester {row.semester})
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/10">
                    {["#", "Subject Code", "Subject Name", "Credit", "Grade", "CIE Marks (50)", "SEE Marks (50)", "Total (100)", "Grade Point"].map((h) => (
                      <th
                        key={h}
                        className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground whitespace-nowrap"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {(() => {
                    const existingSubjects = (row as any).subjects || [];
                    const displaySubjects = existingSubjects.length > 0 ? existingSubjects : dummySubjects;
                    return displaySubjects.map((s: any, idx: number) => {
                      const gp = s.grade && s.grade in gradePoint ? gradePoint[s.grade as Grade] : "—";
                      return (
                        <tr key={s.code || idx} className="hover:bg-muted/5 transition-colors">
                          <td className="px-5 py-3 font-medium text-muted-foreground">{idx + 1}</td>
                          <td className="px-5 py-3 font-mono text-foreground">{s.code || "—"}</td>
                          <td className="px-5 py-3 text-foreground whitespace-normal min-w-[200px]">{s.name || "—"}</td>
                          <td className="px-5 py-3 tabular-nums text-muted-foreground">{s.credits ?? "—"}</td>
                          <td className="px-5 py-3 font-bold text-primary">{s.grade || "—"}</td>
                          <td className="px-5 py-3 tabular-nums text-muted-foreground">{s.internal_marks ?? "—"}</td>
                          <td className="px-5 py-3 tabular-nums text-muted-foreground">{s.external_marks ?? "—"}</td>
                          <td className="px-5 py-3 tabular-nums font-semibold text-foreground">{s.total_marks ?? s.marks ?? "—"}</td>
                          <td className="px-5 py-3 tabular-nums text-muted-foreground">{gp}</td>
                        </tr>
                      );
                    });
                  })()}
                </tbody>
              </table>
            </div>
          </section>

          {/* ── Summary Statistics ── */}
          <section>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: "Total Credits", value: row.credits_earned ?? "—" },
                { label: "Total Points", value: totalPoints },
                { label: "SGPA", value: row.sgpa != null ? Number(row.sgpa).toFixed(2) : "—" },
                { label: "CGPA", value: row.cgpa != null ? Number(row.cgpa).toFixed(2) : "—" },
              ].map(({ label, value }) => (
                <div
                  key={label}
                  className="rounded-xl border bg-card p-4 shadow-sm flex flex-col items-center justify-center text-center"
                >
                  <p className="text-xs font-medium text-muted-foreground">
                    {label}
                  </p>
                  <p className="mt-1 text-2xl font-bold text-foreground tabular-nums">
                    {value}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* ── Grade Legend ── */}
          <section>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
              Grade Legend
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
              {GRADE_LEGEND.map(({ grade, label, points }) => (
                <div
                  key={grade}
                  className="rounded-lg border bg-card p-2 text-center shadow-sm"
                >
                  <p className="text-base font-bold text-foreground">{grade}</p>
                  <p className="text-xs text-muted-foreground leading-tight">
                    {label}
                  </p>
                  <p className="mt-1 text-xs font-semibold text-primary">
                    {points} pts
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* ── Footer / Close ── */}
          <div className="flex items-center justify-between pt-2 border-t text-xs text-muted-foreground">
            <span>
              Generated: {new Date().toLocaleDateString("en-GB")} · Provisional
              result only
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={onClose}
              className="gap-1.5"
            >
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Main table component ──────────────────────────────────────────────────────

interface ViewResultsTableProps {
  results: AdminResultRow[];
  onDeleted?: (resultId: number) => void; // kept for interface compat but unused
}

export function ViewResultsTable({ results }: ViewResultsTableProps) {
  const [viewTarget, setViewTarget] = useState<AdminResultRow | null>(null);

  if (results.length === 0) {
    return (
      <div className="rounded-2xl border bg-card p-16 text-center shadow-sm">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
          <svg
            className="h-6 w-6 text-muted-foreground"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
            />
          </svg>
        </div>
        <p className="text-sm font-semibold text-foreground">No results found</p>
        <p className="mt-1 text-xs text-muted-foreground">
          No stored results match your filters. Try adjusting the search or
          department filter.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-2xl border bg-card shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  ID
                </th>
                <th className="px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Name
                </th>
                <th className="px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground hidden md:table-cell">
                  Department
                </th>
                <th className="px-4 py-3.5 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Sem
                </th>
                <th className="px-4 py-3.5 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground hidden sm:table-cell">
                  SGPA
                </th>
                <th className="px-4 py-3.5 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  CGPA
                </th>
                <th className="px-4 py-3.5 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  View
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {results.map((row) => (
                <tr
                  key={row.result_id}
                  className="group transition-colors hover:bg-muted/30"
                >
                  {/* USN */}
                  <td className="px-4 py-3.5">
                    <span className="font-mono text-xs font-medium text-primary bg-primary/8 rounded-md px-1.5 py-0.5 border border-primary/15">
                      {row.usn}
                    </span>
                  </td>

                  {/* Name */}
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary select-none">
                        {row.student_name
                          .split(" ")
                          .slice(0, 2)
                          .map((n) => n[0])
                          .join("")
                          .toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-foreground truncate">
                          {row.student_name}
                        </p>
                        <p className="text-xs text-muted-foreground md:hidden truncate">
                          {row.department}
                        </p>
                      </div>
                    </div>
                  </td>

                  {/* Department */}
                  <td className="px-4 py-3.5 hidden md:table-cell">
                    <Badge variant="secondary" className="font-normal whitespace-nowrap">
                      {row.department}
                    </Badge>
                  </td>

                  {/* Semester */}
                  <td className="px-4 py-3.5 text-center">
                    <span className="tabular-nums text-foreground font-medium">
                      {row.semester}
                    </span>
                  </td>

                  {/* SGPA */}
                  <td className="px-4 py-3.5 text-center hidden sm:table-cell">
                    <span className="tabular-nums text-muted-foreground">
                      {fmt(row.sgpa)}
                    </span>
                  </td>

                  {/* CGPA */}
                  <td className="px-4 py-3.5 text-center">
                    <CgpaBadge value={row.cgpa} />
                  </td>

                  {/* View More */}
                  <td className="px-4 py-3.5 text-center">
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5 text-xs h-8 border-primary/30 text-primary hover:bg-primary hover:text-primary-foreground transition-colors"
                      onClick={() => setViewTarget(row)}
                    >
                      <FileText className="h-3.5 w-3.5" />
                      View More
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Result Sheet Modal */}
      <ResultSheetModal
        row={viewTarget}
        open={!!viewTarget}
        onClose={() => setViewTarget(null)}
      />
    </>
  );
}
