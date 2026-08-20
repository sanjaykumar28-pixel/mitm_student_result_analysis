import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import type { AdminResultRow } from "@/services/adminService";

const gradeClass: Record<string, string> = {
  O: "bg-success/15 text-success",
  "A+": "bg-primary/15 text-primary",
  A: "bg-primary/15 text-primary",
  "B+": "bg-warning/20 text-warning-foreground",
  B: "bg-warning/20 text-warning-foreground",
  C: "bg-muted text-muted-foreground",
  F: "bg-destructive/15 text-destructive",
};

function fmt(value: number | null | undefined, digits = 2) {
  if (value === null || value === undefined) return "—";
  return Number(value).toFixed(digits);
}

export function AdminResultsTable({ results }: { results: AdminResultRow[] }) {
  if (results.length === 0) {
    return (
      <div className="rounded-xl border bg-card p-12 text-center">
        <p className="text-sm font-medium">No results found</p>
        <p className="mt-1 text-xs text-muted-foreground">
          No stored results match the selected department. Upload a result sheet or choose another department.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border bg-card overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>USN</TableHead>
            <TableHead>Student Name</TableHead>
            <TableHead>Department</TableHead>
            <TableHead className="text-center">Sem</TableHead>
            <TableHead className="hidden lg:table-cell text-center">Year</TableHead>
            <TableHead className="text-right">Grand Total</TableHead>
            <TableHead className="text-right">Average</TableHead>
            <TableHead className="text-center">Credits</TableHead>
            <TableHead className="text-center">Grade</TableHead>
            <TableHead className="text-center">SGPA</TableHead>
            <TableHead className="text-center">CGPA</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {results.map((row) => (
            <TableRow key={row.result_id}>
              <TableCell className="font-mono text-xs">{row.usn}</TableCell>
              <TableCell className="font-medium">{row.student_name}</TableCell>
              <TableCell>{row.department}</TableCell>
              <TableCell className="text-center">{row.semester}</TableCell>
              <TableCell className="hidden lg:table-cell text-center text-muted-foreground">
                {row.academic_year ?? "—"}
              </TableCell>
              <TableCell className="text-right tabular-nums">{fmt(row.grand_total)}</TableCell>
              <TableCell className="text-right tabular-nums">{fmt(row.average_marks)}</TableCell>
              <TableCell className="text-center">{row.credits_earned ?? "—"}</TableCell>
              <TableCell className="text-center">
                {row.grade ? (
                  <Badge variant="secondary" className={gradeClass[row.grade] ?? "bg-muted text-muted-foreground"}>
                    {row.grade}
                  </Badge>
                ) : (
                  "—"
                )}
              </TableCell>
              <TableCell className="text-center">
                <Badge variant="secondary">{fmt(row.sgpa)}</Badge>
              </TableCell>
              <TableCell className="text-center">
                <Badge variant="secondary">{fmt(row.cgpa)}</Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
