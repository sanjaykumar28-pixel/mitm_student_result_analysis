import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import type { Student } from "@/data/mockData";

export function TopperTable({ toppers }: { toppers: Student[] }) {
  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12">Rank</TableHead>
            <TableHead>Student</TableHead>
            <TableHead className="hidden md:table-cell">Department</TableHead>
            <TableHead className="text-center">Sem</TableHead>
            <TableHead className="text-right">CGPA</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {toppers.map((s, i) => (
            <TableRow key={s.id}>
              <TableCell>
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                  {i + 1}
                </span>
              </TableCell>
              <TableCell>
                <div className="font-medium">{s.name}</div>
                <div className="text-xs text-muted-foreground">{s.id}</div>
              </TableCell>
              <TableCell className="hidden md:table-cell">{s.department}</TableCell>
              <TableCell className="text-center">{s.semester}</TableCell>
              <TableCell className="text-right">
                <Badge variant="secondary" className="bg-primary/10 text-primary">{s.cgpa.toFixed(2)}</Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
