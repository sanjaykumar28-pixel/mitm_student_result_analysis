import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Download, Search, ChevronLeft, ChevronRight, SlidersHorizontal } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { departments as knownDepartments } from "@/data/mockData";
import { adminService, type AdminResultRow } from "@/services/adminService";
import { getApiErrorMessage } from "@/services/api";
import { toast } from "sonner";
import { ViewResultsTable } from "@/components/tables/ViewResultsTable";

export const Route = createFileRoute("/admin/view-results")({
  component: ViewResults,
});

const PAGE_SIZE = 10;

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

  // Debounce search query
  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(query.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [query]);

  // Fetch results
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

  // Handle deletion — remove from local state so UI updates instantly
  const handleDeleted = useCallback((resultId: number) => {
    setResults((prev) => prev.filter((r) => r.result_id !== resultId));
  }, []);

  // Export handler
  const handleExport = () => {
    if (results.length === 0) {
      toast.warning("No data to export.");
      return;
    }
    const headers = ["USN", "Student Name", "Department", "Semester", "SGPA", "CGPA", "Grand Total", "Average"];
    const rows = results.map((r) => [
      r.usn,
      r.student_name,
      r.department,
      r.semester,
      r.sgpa ?? "",
      r.cgpa ?? "",
      r.grand_total,
      r.average_marks,
    ]);
    const csv = [headers, ...rows].map((row) => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `student-results-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Export downloaded successfully.");
  };

  return (
    <div className="space-y-6">
      {/* ── Page Header ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">
            Student Results
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {loading
              ? "Loading results from the database…"
              : `${results.length} record${results.length !== 1 ? "s" : ""} matching your filters.`}
          </p>
        </div>
        <Button
          variant="outline"
          className="shrink-0 gap-2 self-start border-border shadow-sm hover:shadow transition-shadow"
          onClick={handleExport}
          disabled={loading}
        >
          <Download className="h-4 w-4" />
          Export
        </Button>
      </div>

      {/* ── Search & Filter Card ── */}
      <Card className="border-border shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            {/* Filter label (desktop) */}
            <div className="hidden lg:flex items-center gap-1.5 text-sm text-muted-foreground shrink-0">
              <SlidersHorizontal className="h-4 w-4" />
              <span className="font-medium">Filters</span>
            </div>

            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <Input
                id="vr-search"
                placeholder="Search by name or ID..."
                className="pl-9 bg-background"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                }}
              />
            </div>

            {/* Department filter */}
            <Select value={dept} onValueChange={(v) => { setDept(v); }}>
              <SelectTrigger id="vr-dept" className="lg:w-52 bg-background">
                <SelectValue placeholder="All Departments" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {departmentOptions.map((d) => (
                  <SelectItem key={d} value={d}>
                    {d}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Semester filter */}
            <Select value={sem} onValueChange={(v) => { setSem(v); }}>
              <SelectTrigger id="vr-sem" className="lg:w-44 bg-background">
                <SelectValue placeholder="All Semesters" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Semesters</SelectItem>
                {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                  <SelectItem key={s} value={String(s)}>
                    Semester {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* ── Results Table ── */}
      {error ? (
        <div className="rounded-2xl border border-destructive/30 bg-card p-12 text-center shadow-sm">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
            <svg className="h-6 w-6 text-destructive" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <p className="text-sm font-semibold text-destructive">Could not load results</p>
          <p className="mt-1 text-xs text-muted-foreground">{error}</p>
        </div>
      ) : loading ? (
        <div className="rounded-2xl border bg-card p-6 shadow-sm space-y-3">
          {/* Table skeleton header */}
          <div className="flex gap-4 pb-2 border-b">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-28 hidden md:block" />
            <Skeleton className="h-4 w-12" />
            <Skeleton className="h-4 w-16" />
          </div>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex gap-4 items-center py-1">
              <Skeleton className="h-5 w-20" />
              <div className="flex items-center gap-2 flex-1">
                <Skeleton className="h-8 w-8 rounded-full shrink-0" />
                <Skeleton className="h-4 flex-1 max-w-[160px]" />
              </div>
              <Skeleton className="h-5 w-24 hidden md:block" />
              <Skeleton className="h-4 w-6 mx-auto" />
              <Skeleton className="h-6 w-14 rounded-full mx-auto" />
              <div className="flex gap-1.5 mx-auto">
                <Skeleton className="h-7 w-7 rounded" />
                <Skeleton className="h-7 w-7 rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <ViewResultsTable results={pageData} onDeleted={handleDeleted} />
      )}

      {/* ── Pagination ── */}
      {!loading && !error && results.length > 0 && (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between text-sm">
          <p className="text-muted-foreground">
            Showing{" "}
            <span className="font-medium text-foreground">
              {(safePage - 1) * PAGE_SIZE + 1}–
              {Math.min(safePage * PAGE_SIZE, results.length)}
            </span>{" "}
            of{" "}
            <span className="font-medium text-foreground">{results.length}</span>{" "}
            results
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              disabled={safePage === 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <span className="text-muted-foreground tabular-nums px-1">
              Page {safePage} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              disabled={safePage === totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
