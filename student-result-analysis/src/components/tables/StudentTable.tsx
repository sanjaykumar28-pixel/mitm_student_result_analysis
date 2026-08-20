import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Pencil, Trash2 } from "lucide-react";
import type { Student } from "@/data/mockData";

interface Props {
  students: Student[];
  onEdit?: (s: Student) => void;
  onDelete?: (s: Student) => void;
}

export function StudentTable({ students, onEdit, onDelete }: Props) {
  if (students.length === 0) {
    return (
      <div className="rounded-xl border bg-card p-12 text-center">
        <p className="text-sm font-medium">No students found</p>
        <p className="mt-1 text-xs text-muted-foreground">Try adjusting your filters or search query.</p>
      </div>
    );
  }
  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>ID</TableHead>
            <TableHead>Name</TableHead>
            <TableHead className="hidden md:table-cell">Email</TableHead>
            <TableHead>Department</TableHead>
            <TableHead className="text-center">Sem</TableHead>
            <TableHead className="text-center">CGPA</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {students.map((s) => (
            <TableRow key={s.id}>
              <TableCell className="font-mono text-xs">{s.id}</TableCell>
              <TableCell className="font-medium">{s.name}</TableCell>
              <TableCell className="hidden md:table-cell text-muted-foreground text-sm">{s.email}</TableCell>
              <TableCell>{s.department}</TableCell>
              <TableCell className="text-center">{s.semester}</TableCell>
              <TableCell className="text-center">
                <Badge variant="secondary">{s.cgpa.toFixed(2)}</Badge>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-1">
                  <Button size="icon" variant="ghost" onClick={() => onEdit?.(s)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => onDelete?.(s)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
