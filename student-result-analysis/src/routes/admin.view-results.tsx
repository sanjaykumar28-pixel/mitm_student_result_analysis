import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Download, Search } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/layout/PageHeader";
import { AdminResultsTable } from "@/components/tables/AdminResultsTable";
import { departments as knownDepartments } from "@/data/mockData";
import { adminService, type AdminResultRow } from "@/services/adminService";
import { getApiErrorMessage } from "@/services/api";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/view-results")({
  component: ViewResults,
});

const PAGE_SIZE = 8;

function ViewResults() {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [dept, setDept] = useState<string>("all");
  const [sem, setSem] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [results, setResults] = useState<AdminResultRow[]>([]);
  const [apiDepartments, setApiDepartments] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(query.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    adminService
      .getResults({
        department: dept === "all" ? undefined : dept,
        semester: sem === "all" ? undefined : Number(sem),
        search: debouncedQuery || undefined,
      })
      .then((data) => {
        if (cancelled) return;
        setResults(data.results);
        setApiDepartments(data.departments);
        setPage(1);
      })
      .catch((err) => {
        if (cancelled) return;
        const message = getApiErrorMessage(err, "Could not load student results.");
        setError(message);
        setResults([]);
        toast.error(message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [dept, sem, debouncedQuery]);

  const departmentOptions = useMemo(() => {
    const merged = new Set<string>([...knownDepartments, ...apiDepartments]);
    return Array.from(merged);
  }, [apiDepartments]);

  const totalPages = Math.max(1, Math.ceil(results.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageData = results.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  return (
    <>
      <PageHeader
        title="Student Results"
        subtitle={
          loading
            ? "Loading results from the database…"
            : `${results.length} records matching your filters.`
        }
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
              placeholder="Search by name or USN…"
              className="pl-9"
              value={query}
              onChange={(e) => { setQuery(e.target.value); }}
            />
          </div>
          <Select value={dept} onValueChange={(v) => { setDept(v); }}>
            <SelectTrigger className="md:w-56"><SelectValue placeholder="Department" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Departments</SelectItem>
              {departmentOptions.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={sem} onValueChange={(v) => { setSem(v); }}>
            <SelectTrigger className="md:w-44"><SelectValue placeholder="Semester" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Semesters</SelectItem>
              {[1,2,3,4,5,6,7,8].map((s) => <SelectItem key={s} value={String(s)}>Semester {s}</SelectItem>)}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {error ? (
        <div className="rounded-xl border border-destructive/30 bg-card p-12 text-center">
          <p className="text-sm font-medium text-destructive">Could not load results</p>
          <p className="mt-1 text-xs text-muted-foreground">{error}</p>
        </div>
      ) : loading ? (
        <div className="rounded-xl border bg-card p-6 space-y-3">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-5/6" />
        </div>
      ) : (
        <AdminResultsTable results={pageData} />
      )}

      {!loading && !error && results.length > 0 && (
        <div className="mt-4 flex items-center justify-between text-sm">
          <p className="text-muted-foreground">Page {safePage} of {totalPages}</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={safePage === 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Previous</Button>
            <Button variant="outline" size="sm" disabled={safePage === totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
          </div>
        </div>
      )}
    </>
  );
}
