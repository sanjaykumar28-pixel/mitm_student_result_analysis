import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Search,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Printer,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
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
import {
  adminService,
  type AdminResultDetailResponse,
  type AdminResultSemester,
} from "@/services/adminService";
import { getApiErrorMessage } from "@/services/api";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const Route = createFileRoute("/admin/student-performance")({
  component: StudentPerformancePage,
});

const PAGE_SIZE = 10;

// ── Types for the Table View ──
interface GroupedStudent {
  usn: string;
  student_name: string;
  department: string;
  semesters: Record<number, string>; // e.g., { 1: "P", 2: "F" }
  maxSem: number;
}

// ── Main Page Component ──
function StudentPerformancePage() {
  const [selectedUsn, setSelectedUsn] = useState<string | null>(null);

  if (selectedUsn) {
    return <StudentPerformanceDetail usn={selectedUsn} onBack={() => setSelectedUsn(null)} />;
  }

  return <StudentPerformanceList onSelectUsn={setSelectedUsn} />;
}

// ── List View Component ──
function StudentPerformanceList({ onSelectUsn }: { onSelectUsn: (usn: string) => void }) {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [dept, setDept] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [groupedStudents, setGroupedStudents] = useState<GroupedStudent[]>([]);
  const [apiDepartments, setApiDepartments] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Debounce search
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
        search: debouncedQuery || undefined,
      })
      .then((data) => {
        if (cancelled) return;

        // Group the flat results by USN
        const groupedMap = new Map<string, GroupedStudent>();
        for (const row of data.results) {
          if (!groupedMap.has(row.usn)) {
            groupedMap.set(row.usn, {
              usn: row.usn,
              student_name: row.student_name,
              department: row.department,
              semesters: {},
              maxSem: row.semester,
            });
          }
          const st = groupedMap.get(row.usn)!;
          // Determine Pass/Fail from overall grade if available
          st.semesters[row.semester] = row.grade === "F" ? "F" : "P";
          if (row.semester > st.maxSem) st.maxSem = row.semester;
        }

        setGroupedStudents(Array.from(groupedMap.values()));
        setApiDepartments(data.departments);
        setPage(1);
      })
      .catch((err) => {
        if (cancelled) return;
        const message = getApiErrorMessage(err, "Could not load performance data.");
        setError(message);
        setGroupedStudents([]);
        toast.error(message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [dept, debouncedQuery]);

  const departmentOptions = useMemo(() => {
    const merged = new Set<string>([...knownDepartments, ...apiDepartments]);
    return Array.from(merged);
  }, [apiDepartments]);

  const totalPages = Math.max(1, Math.ceil(groupedStudents.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageData = groupedStudents.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  // Find max semester globally to dynamically render columns
  const globalMaxSem = useMemo(() => {
    let max = 4; // Default to at least 4
    for (const st of groupedStudents) {
      if (st.maxSem > max) max = st.maxSem;
    }
    return max;
  }, [groupedStudents]);

  const semesterColumns = Array.from({ length: globalMaxSem }, (_, i) => i + 1);

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-8">
      {/* ── Page Header ── */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl flex items-center gap-2">
          <TrendingUp className="h-7 w-7 text-primary" />
          Student Performance
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          View student academic progress and semester-wise failed subjects.
        </p>
      </div>

      {/* ── Search & Filter Card ── */}
      <Card className="border-border shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="hidden lg:flex items-center gap-1.5 text-sm text-muted-foreground shrink-0">
              <SlidersHorizontal className="h-4 w-4" />
              <span className="font-medium">Filters</span>
            </div>

            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Search by USN or Student Name..."
                className="pl-9 bg-background"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>

            <Select value={dept} onValueChange={setDept}>
              <SelectTrigger className="lg:w-52 bg-background">
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
          </div>
        </CardContent>
      </Card>

      {/* ── Students Table ── */}
      {error ? (
        <div className="rounded-2xl border border-destructive/30 bg-card p-12 text-center shadow-sm">
          <AlertTriangle className="mx-auto h-12 w-12 text-destructive mb-3" />
          <p className="text-sm font-semibold text-destructive">Could not load results</p>
          <p className="mt-1 text-xs text-muted-foreground">{error}</p>
        </div>
      ) : loading ? (
        <div className="rounded-2xl border bg-card p-6 shadow-sm space-y-4">
          <Skeleton className="h-8 w-full" />
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      ) : groupedStudents.length === 0 ? (
        <div className="rounded-2xl border bg-card p-12 text-center shadow-sm">
          <Search className="mx-auto h-12 w-12 text-muted-foreground/50 mb-3" />
          <p className="text-sm font-semibold text-foreground">No students found.</p>
          {debouncedQuery && (
            <p className="text-xs text-muted-foreground mt-1">
              No students found for "{debouncedQuery}"
            </p>
          )}
        </div>
      ) : (
        <div className="rounded-2xl border bg-card shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">SL NO</TableHead>
                  <TableHead>USN</TableHead>
                  <TableHead>Student Name</TableHead>
                  <TableHead>Department</TableHead>
                  {semesterColumns.map((sem) => (
                    <TableHead key={sem} className="text-center whitespace-nowrap">
                      SEM {sem}
                    </TableHead>
                  ))}
                  <TableHead className="text-center">View</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pageData.map((st, idx) => (
                  <TableRow key={st.usn}>
                    <TableCell className="text-muted-foreground text-center">
                      {(safePage - 1) * PAGE_SIZE + idx + 1}
                    </TableCell>
                    <TableCell className="font-mono font-bold text-primary bg-primary/10 rounded-md px-2 py-1 uppercase tracking-wider my-2 mx-1 inline-block">
                      {st.usn}
                    </TableCell>
                    <TableCell className="font-semibold text-foreground whitespace-nowrap">
                      {st.student_name}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      <Badge variant="secondary" className="font-normal">
                        {st.department}
                      </Badge>
                    </TableCell>
                    {semesterColumns.map((sem) => {
                      const status = st.semesters[sem];
                      return (
                        <TableCell key={sem} className="text-center">
                          {!status ? (
                            <span className="text-muted-foreground/30">—</span>
                          ) : status === "P" ? (
                            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-success/15 text-success font-bold text-xs ring-1 ring-inset ring-success/20">
                              P
                            </span>
                          ) : (
                            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-destructive/15 text-destructive font-bold text-xs ring-1 ring-inset ring-destructive/20">
                              F
                            </span>
                          )}
                        </TableCell>
                      );
                    })}
                    <TableCell className="text-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-primary hover:text-primary hover:bg-primary/10 gap-1.5 h-8 px-3"
                        onClick={() => onSelectUsn(st.usn)}
                      >
                        <TrendingUp className="h-3.5 w-3.5" />
                        View Performance
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* ── Pagination ── */}
      {!loading && !error && groupedStudents.length > 0 && (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between text-sm">
          <p className="text-muted-foreground">
            Showing{" "}
            <span className="font-medium text-foreground">
              {(safePage - 1) * PAGE_SIZE + 1}–
              {Math.min(safePage * PAGE_SIZE, groupedStudents.length)}
            </span>{" "}
            of <span className="font-medium text-foreground">{groupedStudents.length}</span> results
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

// ── Detail View Component ──
function StudentPerformanceDetail({ usn, onBack }: { usn: string; onBack: () => void }) {
  const [detail, setDetail] = useState<AdminResultDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedSems, setExpandedSems] = useState<Set<number>>(new Set());

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    adminService
      .getResultDetails(usn)
      .then((data) => {
        if (!cancelled) setDetail(data);
      })
      .catch((err) => {
        if (!cancelled) setError(getApiErrorMessage(err, "Failed to load details"));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [usn]);

  const toggleSem = (sem: number) => {
    setExpandedSems((prev) => {
      const next = new Set(prev);
      if (next.has(sem)) next.delete(sem);
      else next.add(sem);
      return next;
    });
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-in fade-in duration-500 pb-8">
        <Button variant="ghost" onClick={onBack} className="gap-2 -ml-2 text-muted-foreground">
          <ChevronLeft className="h-4 w-4" /> Back to List
        </Button>
        <div className="rounded-2xl border bg-card p-12 shadow-sm flex flex-col items-center justify-center">
          <Skeleton className="h-12 w-12 rounded-full mb-4" />
          <p className="text-muted-foreground font-medium">Loading student performance...</p>
        </div>
      </div>
    );
  }

  if (error || !detail) {
    return (
      <div className="space-y-6 animate-in fade-in duration-500 pb-8">
        <Button variant="ghost" onClick={onBack} className="gap-2 -ml-2 text-muted-foreground">
          <ChevronLeft className="h-4 w-4" /> Back to List
        </Button>
        <div className="rounded-2xl border bg-card p-12 text-center shadow-sm">
          <AlertTriangle className="mx-auto h-12 w-12 text-destructive mb-3" />
          <p className="text-sm font-semibold text-destructive">Could not load performance data</p>
          <p className="mt-1 text-xs text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  const sortedSemesters = [...detail.semesters].sort((a, b) => a.semester - b.semester);
  const totalSemesters = sortedSemesters.length;
  const latestSemester =
    totalSemesters > 0 ? sortedSemesters[sortedSemesters.length - 1].semester : 0;

  const semestersWithBacklogs = sortedSemesters.filter((sem) =>
    sem.subjects.some((s) => s.grade === "F"),
  ).length;

  const totalFailedSubjects = sortedSemesters.reduce(
    (acc, sem) => acc + sem.subjects.filter((s) => s.grade === "F").length,
    0,
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-8">
      {/* ── Header Area ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <Button
          variant="ghost"
          onClick={onBack}
          className="gap-2 -ml-2 text-primary hover:text-primary self-start hover:bg-primary/10"
        >
          <ChevronLeft className="h-4 w-4" /> Back to List
        </Button>
        <Button
          variant="outline"
          className="gap-2 self-start bg-background hover:bg-muted"
          onClick={() => window.print()}
        >
          <Printer className="h-4 w-4" />
          Print / Export
        </Button>
      </div>

      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl flex items-center gap-2">
          <TrendingUp className="h-7 w-7 text-primary" />
          Student Performance
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          View student academic progress and semester-wise failed subjects.
        </p>
      </div>

      {/* ── Student Identity ── */}
      <div className="rounded-2xl border bg-card p-6 shadow-sm flex items-center gap-5">
        <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center text-2xl font-bold text-primary select-none shrink-0">
          {detail.student_name
            .split(" ")
            .slice(0, 2)
            .map((n) => n[0])
            .join("")
            .toUpperCase()}
        </div>
        <div>
          <h2 className="text-xl font-bold text-foreground capitalize tracking-tight leading-tight">
            {detail.student_name}
          </h2>
          <div className="flex items-center gap-3 mt-1.5 text-sm text-muted-foreground">
            <span className="font-mono bg-muted px-2 py-0.5 rounded text-foreground">
              {detail.usn}
            </span>
            <span className="flex items-center gap-1.5">
              Department: <span className="font-medium text-foreground">{detail.department}</span>
            </span>
          </div>
        </div>
      </div>

      {/* ── Summary Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: "Total Semesters",
            value: totalSemesters,
            icon: Calendar,
            color: "text-foreground",
          },
          {
            label: "Latest Semester",
            value: latestSemester,
            icon: Calendar,
            color: "text-foreground",
          },
          {
            label: "Semesters with Backlogs",
            value: semestersWithBacklogs,
            icon: AlertTriangle,
            color: semestersWithBacklogs > 0 ? "text-destructive" : "text-success",
          },
          {
            label: "Total Failed Subjects",
            value: totalFailedSubjects,
            icon: AlertTriangle,
            color: totalFailedSubjects > 0 ? "text-destructive" : "text-success",
          },
        ].map((card, i) => (
          <div
            key={i}
            className="rounded-2xl border bg-card p-5 shadow-sm flex flex-col items-center justify-center text-center"
          >
            <div className="flex items-center gap-2 mb-2">
              <card.icon
                className={`h-4 w-4 ${card.color === "text-foreground" ? "text-primary" : card.color}`}
              />
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {card.label}
              </p>
            </div>
            <p className={`text-3xl font-bold tabular-nums ${card.color}`}>{card.value}</p>
          </div>
        ))}
      </div>

      {/* ── Semester-wise Performance ── */}
      <div className="space-y-4">
        <h3 className="text-lg font-bold text-foreground">Semester-wise Performance</h3>

        {sortedSemesters.length === 0 ? (
          <div className="rounded-xl border bg-card p-12 text-center text-muted-foreground shadow-sm">
            No result data available for this student.
          </div>
        ) : (
          <div className="space-y-3">
            {sortedSemesters.map((sem) => {
              const failedSubjects = sem.subjects.filter((s) => s.grade === "F");
              const hasFailed = failedSubjects.length > 0;
              const isExpanded = expandedSems.has(sem.semester) || hasFailed; // default expand if failed

              return (
                <div
                  key={sem.semester}
                  className={`rounded-xl border bg-card shadow-sm transition-all overflow-hidden ${hasFailed ? "border-destructive/30" : "border-border"}`}
                >
                  <button
                    onClick={() => toggleSem(sem.semester)}
                    className="w-full px-5 py-4 flex items-center justify-between hover:bg-muted/5 transition-colors focus:outline-none"
                  >
                    <div className="flex items-start gap-3 text-left">
                      <div className="mt-0.5">
                        {hasFailed ? (
                          <div className="h-6 w-6 rounded-full bg-destructive/10 flex items-center justify-center">
                            <AlertTriangle className="h-4 w-4 text-destructive" />
                          </div>
                        ) : (
                          <div className="h-6 w-6 rounded-full bg-success/10 flex items-center justify-center">
                            <CheckCircle2 className="h-4 w-4 text-success" />
                          </div>
                        )}
                      </div>
                      <div>
                        <div className="font-bold text-foreground">
                          Semester {sem.semester}{" "}
                          {sem.academic_year && (
                            <span className="font-normal text-muted-foreground ml-1">
                              ({sem.academic_year})
                            </span>
                          )}
                        </div>
                        <div
                          className={`text-sm mt-0.5 ${hasFailed ? "text-destructive font-semibold" : "text-success"}`}
                        >
                          {hasFailed
                            ? `${failedSubjects.length} Failed Subject${failedSubjects.length !== 1 ? "s" : ""}`
                            : "No failed subjects"}
                        </div>
                      </div>
                    </div>
                    {hasFailed && (
                      <div className="text-muted-foreground p-2">
                        {isExpanded ? (
                          <ChevronUp className="h-5 w-5" />
                        ) : (
                          <ChevronDown className="h-5 w-5" />
                        )}
                      </div>
                    )}
                  </button>

                  {hasFailed && isExpanded && (
                    <div className="border-t bg-background overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            {[
                              "Subject Code",
                              "Subject Name",
                              "Grade",
                              "Grade Point",
                              "Credits",
                              "CIE",
                              "SEE",
                              "Total",
                            ].map((h) => (
                              <TableHead key={h} className="whitespace-nowrap">
                                {h}
                              </TableHead>
                            ))}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {failedSubjects.map((sub, idx) => (
                            <TableRow key={sub.subject_code + idx}>
                              <TableCell className="font-mono">{sub.subject_code}</TableCell>
                              <TableCell className="whitespace-nowrap min-w-[200px]">
                                {sub.subject_name}
                              </TableCell>
                              <TableCell className="font-bold text-destructive">
                                {sub.grade ?? "F"}
                              </TableCell>
                              <TableCell className="tabular-nums text-muted-foreground">
                                {sub.grade_point ?? 0}
                              </TableCell>
                              <TableCell className="tabular-nums text-muted-foreground">
                                {sub.credits ?? "—"}
                              </TableCell>
                              <TableCell className="tabular-nums text-muted-foreground">
                                {sub.internal_marks ?? "—"}
                              </TableCell>
                              <TableCell className="tabular-nums text-muted-foreground">
                                {sub.external_marks ?? "—"}
                              </TableCell>
                              <TableCell className="tabular-nums font-semibold">
                                {sub.total_marks ?? "—"}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
