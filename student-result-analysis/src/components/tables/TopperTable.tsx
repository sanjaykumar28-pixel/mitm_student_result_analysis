import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export interface TopperEntry {
  id: string; // USN
  name: string;
  department: string;
  semester: number;
  cgpa: number;
  academic_year?: string | null;
}

export function TopperTable({ toppers }: { toppers: TopperEntry[] }) {
  if (toppers.length === 0) {
    return (
      <div className="rounded-xl border bg-card p-12 text-center">
        <p className="text-sm font-medium">No top performers found for this academic year.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12">Rank</TableHead>
            <TableHead>Student</TableHead>
            <TableHead className="hidden md:table-cell">Department</TableHead>
            <TableHead className="text-right">CGPA</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {toppers.map((s, i) => (
            <TableRow key={s.id}>
              <TableCell>
                <span
                  className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold shadow-sm ${
                    i === 0
                      ? "bg-amber-400 text-white"
                      : i === 1
                        ? "bg-slate-300 text-slate-700"
                        : i === 2
                          ? "bg-orange-400 text-white"
                          : "bg-muted text-muted-foreground"
                  }`}
                >
                  {i + 1}
                </span>
              </TableCell>
              <TableCell>
                <div className="font-semibold">{s.name}</div>
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
                  {s.id}
                </div>
              </TableCell>
              <TableCell className="hidden md:table-cell">{s.department}</TableCell>
              <TableCell className="text-right">
                <Badge variant="secondary" className="bg-primary/10 text-primary">
                  {s.cgpa.toFixed(2)}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
