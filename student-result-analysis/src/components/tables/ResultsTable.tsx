import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import type { SubjectResult } from "@/data/mockData";

const gradeClass: Record<string, string> = {
  O: "bg-success/15 text-success",
  "A+": "bg-primary/15 text-primary",
  A: "bg-primary/15 text-primary",
  "B+": "bg-warning/20 text-warning-foreground",
  B: "bg-warning/20 text-warning-foreground",
  C: "bg-muted text-muted-foreground",
  F: "bg-destructive/15 text-destructive",
  X: "bg-destructive/15 text-destructive",
  AB: "bg-muted text-muted-foreground",
  W: "bg-muted text-muted-foreground",
  NE: "bg-muted text-muted-foreground",
};

export function ResultsTable({ subjects }: { subjects: SubjectResult[] }) {
  if (subjects.length === 0) {
    return (
      <div className="rounded-xl border bg-card p-12 text-center">
        <p className="text-sm font-medium">No results found</p>
        <p className="mt-1 text-xs text-muted-foreground">No stored marks for this semester.</p>
      </div>
    );
  }
  return (
    <div className="rounded-xl border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Code</TableHead>
            <TableHead>Subject</TableHead>
            <TableHead className="text-center">Credits</TableHead>
            <TableHead className="text-center">Marks</TableHead>
            <TableHead className="text-center">Grade</TableHead>
            <TableHead className="text-center">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {subjects.map((s) => (
            <TableRow key={s.code}>
              <TableCell className="font-mono text-xs">{s.code}</TableCell>
              <TableCell className="font-medium">{s.name}</TableCell>
              <TableCell className="text-center">{s.credits}</TableCell>
              <TableCell className="text-center">{s.marks}</TableCell>
              <TableCell className="text-center">
                {s.grade ? (
                  <Badge variant="secondary" className={gradeClass[s.grade]}>
                    {s.grade}
                  </Badge>
                ) : (
                  "—"
                )}
              </TableCell>
              <TableCell className="text-center">
                {!s.grade ? (
                  <span className="text-xs text-muted-foreground">—</span>
                ) : s.grade === "F" || s.grade === "X" ? (
                  <span className="text-xs font-medium text-destructive">Fail</span>
                ) : s.grade === "W" ? (
                  <span className="text-xs font-medium text-muted-foreground">Withdrawn</span>
                ) : s.grade === "AB" ? (
                  <span className="text-xs font-medium text-muted-foreground">Absent</span>
                ) : s.grade === "NE" ? (
                  <span className="text-xs font-medium text-muted-foreground">Not Evaluated</span>
                ) : (
                  <span className="text-xs font-medium text-success">Pass</span>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
