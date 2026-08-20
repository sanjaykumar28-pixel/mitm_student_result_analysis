import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Download, Search } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { PageHeader } from "@/components/layout/PageHeader";
import { StudentTable } from "@/components/tables/StudentTable";
import { mockStudents, departments } from "@/data/mockData";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/view-results")({
  component: ViewResults,
});

const PAGE_SIZE = 8;

function ViewResults() {
  const [query, setQuery] = useState("");
  const [dept, setDept] = useState<string>("all");
  const [sem, setSem] = useState<string>("all");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    return mockStudents.filter((s) => {
      const matchesQ =
        !query ||
        s.name.toLowerCase().includes(query.toLowerCase()) ||
        s.id.toLowerCase().includes(query.toLowerCase());
      const matchesD = dept === "all" || s.department === dept;
      const matchesS = sem === "all" || String(s.semester) === sem;
      return matchesQ && matchesD && matchesS;
    });
  }, [query, dept, sem]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageData = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <>
      <PageHeader
        title="Student Results"
        subtitle={`${filtered.length} records matching your filters.`}
        actions={
          <Button variant="outline" onClick={() => toast.success("Export started")}>
            <Download className="mr-2 h-4 w-4" /> Export
          </Button>
        }
      />

      <Card className="mb-4">
        <CardContent className="flex flex-col gap-3 p-4 md:flex-row md:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by name or ID…"
              className="pl-9"
              value={query}
              onChange={(e) => { setQuery(e.target.value); setPage(1); }}
            />
          </div>
          <Select value={dept} onValueChange={(v) => { setDept(v); setPage(1); }}>
            <SelectTrigger className="md:w-56"><SelectValue placeholder="Department" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Departments</SelectItem>
              {departments.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={sem} onValueChange={(v) => { setSem(v); setPage(1); }}>
            <SelectTrigger className="md:w-44"><SelectValue placeholder="Semester" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Semesters</SelectItem>
              {[1,2,3,4,5,6,7,8].map((s) => <SelectItem key={s} value={String(s)}>Semester {s}</SelectItem>)}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <StudentTable
        students={pageData}
        onEdit={(s) => toast.info(`Edit ${s.name}`)}
        onDelete={(s) => toast.error(`Deleted ${s.name}`)}
      />

      <div className="mt-4 flex items-center justify-between text-sm">
        <p className="text-muted-foreground">Page {page} of {totalPages}</p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
          <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
        </div>
      </div>
    </>
  );
}
