import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import type { Student } from "@/data/mockData";

export function StudentCard({ student }: { student: Student }) {
  const initials = student.name.split(" ").map((p) => p[0]).slice(0, 2).join("");
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-4">
        <Avatar className="h-12 w-12">
          <AvatarFallback className="bg-primary/10 text-primary font-semibold">{initials}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{student.name}</p>
          <p className="truncate text-xs text-muted-foreground">{student.id} · {student.department}</p>
        </div>
        <Badge variant="secondary" className="shrink-0">CGPA {student.cgpa.toFixed(2)}</Badge>
      </CardContent>
    </Card>
  );
}
