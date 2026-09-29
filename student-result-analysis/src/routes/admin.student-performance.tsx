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
  Clock,
  XCircle,
  Eye,
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
  type AdminStudentFailedSubjectsResponse,
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";

export const Route = createFileRoute("/admin/student-performance")({
  component: StudentPerformancePage,
});

const PAGE_SIZE = 10;

// ── Extended Frontend Interface ──
interface GroupedStudent {
  usn: string;
  student_name: string;
  department: string;
  semesters: Record<number, "P" | "F" | "—">;
  maxSem: number;
  relevant_failed_semester?: number; // E.g. the specific semester for makeup
  relevant_failed_semesters?: number[];
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
  const [semesterFilter, setSemesterFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [groupedStudents, setGroupedStudents] = useState<GroupedStudent[]>([]);
  const [makeupRecords, setMakeupRecords] = useState<GroupedStudent[]>([]);
  const [failRecords, setFailRecords] = useState<GroupedStudent[]>([]);
  const [passedStudentCount, setPassedStudentCount] = useState(0);
  const [apiDepartments, setApiDepartments] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Tab state
  const [activeTab, setActiveTab] = useState<"performance" | "makeup" | "fail">("performance");

  // Drawer states
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedStudentForDrawer, setSelectedStudentForDrawer] = useState<GroupedStudent | null>(
    null,
  );
  const [drawerFailedSubjects, setDrawerFailedSubjects] =
    useState<AdminStudentFailedSubjectsResponse | null>(null);
  const [drawerGrade, setDrawerGrade] = useState<"X" | "F" | null>(null);
  const [drawerLoading, setDrawerLoading] = useState(false);
  const [drawerError, setDrawerError] = useState<string | null>(null);

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

    const params = {
      department: dept === "all" ? undefined : dept,
      search: debouncedQuery || undefined,
    };
    Promise.all([
      adminService.getStudentPerformance(params),
      adminService.getMakeupEligibleStudents(params),
      adminService.getFailedPerformanceStudents(params),
    ])
      .then(([data, makeupData, failData]) => {
        if (cancelled) return;

        setGroupedStudents(
          data.students.map((row) => {
            const sems: Record<number, "P" | "F" | "—"> = {};
            row.semesters.forEach((semester) => {
              sems[semester.semester] =
                semester.status === "FAIL" ? "F" : semester.status === "PASS" ? "P" : "—";
            });

            return {
              usn: row.usn,
              student_name: row.student_name,
              department: row.department,
              semesters: sems,
              maxSem: row.semesters.reduce(
                (maxSemester, semester) => Math.max(maxSemester, semester.semester),
                0,
              ),
            };
          }),
        );
        const toGroupedStudents = (
          records: typeof makeupData.students,
          category: "MAKEUP_ELIGIBLE" | "FAIL",
        ): GroupedStudent[] => records.map((row) => {
          const semesters: Record<number, "P" | "F" | "—"> = {};
          row.semesters.forEach((semester) => {
            semesters[semester.semester] = "F";
          });
          const relevantSemesters = row.semesters.map((semester) => semester.semester);
          return {
            usn: row.usn,
            student_name: row.student_name,
            department: row.department,
            semesters,
            maxSem: relevantSemesters.length ? Math.max(...relevantSemesters) : 0,
            relevant_failed_semester: relevantSemesters.length
              ? Math.max(...relevantSemesters)
              : undefined,
            relevant_failed_semesters: relevantSemesters,
          };
        });
        setMakeupRecords(toGroupedStudents(makeupData.students, "MAKEUP_ELIGIBLE"));
        setFailRecords(toGroupedStudents(failData.students, "FAIL"));
        setPassedStudentCount(data.passed_students);
        setApiDepartments(data.departments);
        setPage(1);
      })
      .catch((err) => {
        if (cancelled) return;
        const message = getApiErrorMessage(err, "Could not load performance data.");
        setError(message);
        setGroupedStudents([]);
        setMakeupRecords([]);
        setFailRecords([]);
        setPassedStudentCount(0);
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

  // Filter students by semester if selected
  const filteredGroupedStudents = useMemo(() => {
    if (semesterFilter === "all") return groupedStudents;
    const targetSem = parseInt(semesterFilter, 10);
    return groupedStudents.filter((student) => !!student.semesters[targetSem]);
  }, [groupedStudents, semesterFilter]);

  const makeupStudents = useMemo(
    () => semesterFilter === "all"
      ? makeupRecords
      : makeupRecords.filter((student) => student.relevant_failed_semesters?.includes(Number(semesterFilter))),
    [makeupRecords, semesterFilter],
  );
  const failStudents = useMemo(
    () => semesterFilter === "all"
      ? failRecords
      : failRecords.filter((student) => student.relevant_failed_semesters?.includes(Number(semesterFilter))),
    [failRecords, semesterFilter],
  );

  // Pagination for active tab
  const activeList =
    activeTab === "performance"
      ? filteredGroupedStudents
      : activeTab === "makeup"
        ? makeupStudents
        : failStudents;

  const totalPages = Math.max(1, Math.ceil(activeList.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageData = activeList.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const globalMaxSem = useMemo(() => {
    let max = 4;
    for (const st of groupedStudents) {
      if (st.maxSem > max) max = st.maxSem;
    }
    return max;
  }, [groupedStudents]);
  const semesterColumns = Array.from({ length: globalMaxSem }, (_, i) => i + 1);

  // Summary counts
  const totalCount = semesterFilter === "all"
    ? groupedStudents.length
    : groupedStudents.filter((student) => !!student.semesters[Number(semesterFilter)]).length;
  const passedCount = semesterFilter === "all"
    ? passedStudentCount
    : groupedStudents.filter((student) => student.semesters[Number(semesterFilter)] === "P").length;
  const makeupCount = makeupStudents.length;
  const failCount = failStudents.length;

  const passedPercent = totalCount > 0 ? ((passedCount / totalCount) * 100).toFixed(1) : "0.0";
  const makeupPercent = totalCount > 0 ? ((makeupCount / totalCount) * 100).toFixed(1) : "0.0";
  const failPercent = totalCount > 0 ? ((failCount / totalCount) * 100).toFixed(1) : "0.0";

  // Drawer handler
  const openDrawer = (student: GroupedStudent) => {
    setSelectedStudentForDrawer(student);
    setIsDrawerOpen(true);
    setDrawerLoading(true);
    setDrawerError(null);
    setDrawerFailedSubjects(null);
    setDrawerGrade(activeTab === "makeup" ? "X" : activeTab === "fail" ? "F" : null);

    adminService
      .getFailedSubjects(student.usn)
      .then((data) => {
        setDrawerFailedSubjects(data);
      })
      .catch((err) => {
        setDrawerError(getApiErrorMessage(err, "Failed to load subjects"));
      })
      .finally(() => {
        setDrawerLoading(false);
      });
  };

  const drawerSemesters = (drawerFailedSubjects?.semesters ?? [])
    .map((semester) => ({
      ...semester,
      subjects: semester.subjects.filter((subject) =>
        drawerGrade ? subject.grade === drawerGrade : true,
      ),
    }))
    .filter((semester) => semester.subjects.length > 0);

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-8">
      {/* ── Page Header ── */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl flex items-center gap-2">
          <TrendingUp className="h-7 w-7 text-primary" />
          Student Performance
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          View and analyze student performance across all semesters and manage failed student results.
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
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPage(1);
                }}
              />
            </div>

            <Select
              value={dept}
              onValueChange={(v) => {
                setDept(v);
                setPage(1);
              }}
            >
              <SelectTrigger className="lg:w-[180px] bg-background">
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

            <Select
              value={semesterFilter}
              onValueChange={(v) => {
                setSemesterFilter(v);
                setPage(1);
              }}
            >
              <SelectTrigger className="lg:w-[180px] bg-background">
                <SelectValue placeholder="All Semesters" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Semesters</SelectItem>
                {Array.from({ length: globalMaxSem }, (_, i) => i + 1).map((sem) => (
                  <SelectItem key={sem} value={sem.toString()}>
                    Semester {sem}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* ── Summary Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: "Total Students",
            value: totalCount,
            sub: null,
            icon: Calendar,
            color: "text-primary",
          },
          {
            label: "Passed",
            value: passedCount,
            sub: `${passedPercent}% of total`,
            icon: CheckCircle2,
            color: "text-success",
          },
          {
            label: "Makeup Eligible",
            value: makeupCount,
            sub: `${makeupPercent}% of total`,
            icon: Clock,
            color: "text-yellow-600",
          },
          {
            label: "Fail",
            value: failCount,
            sub: `${failPercent}% of total`,
            icon: XCircle,
            color: "text-destructive",
          },
        ].map((card, i) => (
          <div
            key={i}
            className="rounded-2xl border bg-card p-5 shadow-sm flex flex-col items-center justify-center text-center"
          >
            <div className="flex items-center gap-2 mb-2">
              <card.icon className={`h-4 w-4 ${card.color}`} />
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {card.label}
              </p>
            </div>
            <p className={`text-3xl font-bold tabular-nums ${card.color}`}>{card.value}</p>
            {card.sub && (
              <p className="text-xs text-muted-foreground mt-1 font-medium">{card.sub}</p>
            )}
          </div>
        ))}
      </div>

      {/* ── Tabs & Content ── */}
      <Tabs
        value={activeTab}
        onValueChange={(v: any) => {
          setActiveTab(v);
          setPage(1);
        }}
        className="w-full"
      >
        <TabsList className="mb-4">
          <TabsTrigger
            value="performance"
            className="data-[state=active]:text-primary data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-4"
          >
            Student Performance
          </TabsTrigger>
          <TabsTrigger
            value="makeup"
            className="data-[state=active]:text-primary data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-4"
          >
            Makeup Eligible ({makeupCount})
          </TabsTrigger>
          <TabsTrigger
            value="fail"
            className="data-[state=active]:text-primary data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-4"
          >
            Fail ({failCount})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="performance" className="mt-0">
          <StudentTable
            loading={loading}
            error={error}
            data={pageData}
            activeTab="performance"
            globalMaxSem={globalMaxSem}
            semesterColumns={semesterColumns}
            debouncedQuery={debouncedQuery}
            safePage={safePage}
            onSelectUsn={onSelectUsn}
            onViewSubjects={(st) => openDrawer(st)}
          />
        </TabsContent>

        <TabsContent value="makeup" className="mt-0">
          <StudentTable
            loading={loading}
            error={error}
            data={pageData}
            activeTab="makeup"
            globalMaxSem={globalMaxSem}
            semesterColumns={semesterColumns}
            debouncedQuery={debouncedQuery}
            safePage={safePage}
            onSelectUsn={onSelectUsn}
            onViewSubjects={(st) => openDrawer(st)}
          />
        </TabsContent>

        <TabsContent value="fail" className="mt-0">
          <StudentTable
            loading={loading}
            error={error}
            data={pageData}
            activeTab="fail"
            globalMaxSem={globalMaxSem}
            semesterColumns={semesterColumns}
            debouncedQuery={debouncedQuery}
            safePage={safePage}
            onSelectUsn={onSelectUsn}
            onViewSubjects={(st) => openDrawer(st)}
          />
        </TabsContent>
      </Tabs>

      {/* ── Pagination ── */}
      {!loading && !error && activeList.length > 0 && (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between text-sm">
          <p className="text-muted-foreground">
            Showing{" "}
            <span className="font-medium text-foreground">
              {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, activeList.length)}
            </span>{" "}
            of <span className="font-medium text-foreground">{activeList.length}</span> results
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

      {/* ── Drawer for View Subjects ── */}
      <Sheet open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
        <SheetContent className="w-full sm:max-w-md md:max-w-lg lg:max-w-xl overflow-y-auto">
          <SheetHeader className="mb-6">
            <SheetTitle className="text-2xl flex items-center gap-2">
              <Eye className="h-6 w-6 text-primary" /> View Subjects
            </SheetTitle>
            <SheetDescription>
              {drawerGrade === "X"
                ? "View makeup-eligible subjects for the selected student."
                : "View failed subjects for the selected student."}
            </SheetDescription>
          </SheetHeader>

          {selectedStudentForDrawer && (
            <div className="space-y-6">
              {/* Student Details */}
              <div className="rounded-xl border bg-muted/30 p-4 shadow-sm">
                <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                  Student Details
                </h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="block text-muted-foreground text-xs mb-1">USN</span>
                    <span className="font-mono font-medium text-foreground">
                      {selectedStudentForDrawer.usn}
                    </span>
                  </div>
                  <div>
                    <span className="block text-muted-foreground text-xs mb-1">Name</span>
                    <span className="font-medium text-foreground">
                      {selectedStudentForDrawer.student_name}
                    </span>
                  </div>
                  <div>
                    <span className="block text-muted-foreground text-xs mb-1">Branch</span>
                    <span className="font-medium text-foreground">
                      {selectedStudentForDrawer.department}
                    </span>
                  </div>
                  <div>
                    <span className="block text-muted-foreground text-xs mb-1">Semester</span>
                    <span className="font-medium text-foreground">
                      {selectedStudentForDrawer.relevant_failed_semester ??
                        selectedStudentForDrawer.maxSem}
                    </span>
                  </div>
                </div>
              </div>

              {/* Subjects Table */}
              <div>
                <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                  {drawerGrade === "X" ? "Makeup Eligible Subjects" : "Failed Subjects (Original Result)"}
                </h4>
                {drawerError ? (
                  <div className="text-sm text-destructive">{drawerError}</div>
                ) : drawerLoading ? (
                  <Skeleton className="h-32 w-full" />
                ) : drawerSemesters.flatMap((semester) => semester.subjects).length === 0 ? (
                  <div className="text-sm text-muted-foreground">No subjects found.</div>
                ) : (
                  <div className="rounded-xl border shadow-sm overflow-hidden bg-background">
                    <Table>
                      <TableHeader className="bg-muted/50">
                        <TableRow>
                          <TableHead className="py-2">Code</TableHead>
                          <TableHead className="py-2">Subject Name</TableHead>
                          <TableHead className="py-2">Grade</TableHead>
                          <TableHead className="py-2">Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {drawerSemesters
                          .flatMap((semester) => semester.subjects)
                          .map((sub, idx) => (
                            <TableRow key={idx}>
                              <TableCell className="font-mono py-2">{sub.subject_code}</TableCell>
                              <TableCell className="py-2">
                                <div>{sub.subject_name}</div>
                                <div className="text-xs text-muted-foreground">
                                  CIE {sub.internal_marks ?? "—"} | SEE {sub.external_marks ?? "—"} | Total {sub.total_marks ?? "—"}
                                </div>
                              </TableCell>
                              <TableCell className="py-2 font-bold text-destructive">
                                {sub.grade ?? "F"}
                              </TableCell>
                              <TableCell className="py-2 text-destructive">
                                {sub.grade === "X" ? "Makeup Eligible" : "Failed"}
                              </TableCell>
                            </TableRow>
                          ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="mt-8 flex justify-end">
            <Button variant="outline" onClick={() => setIsDrawerOpen(false)}>
              Close
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

// ── Render Helpers ──
const renderStatusBadge = (status: "P" | "F" | "—" | undefined) => {
  if (!status || status === "—") {
    return <span className="text-muted-foreground/30">—</span>;
  }
  if (status === "P") {
    return (
      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-success/15 text-success font-bold text-xs ring-1 ring-inset ring-success/20">
        P
      </span>
    );
  }
  return (
    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-destructive/15 text-destructive font-bold text-xs ring-1 ring-inset ring-destructive/20">
      F
    </span>
  );
};

// ── Reusable Table Component ──
interface StudentTableProps {
  loading: boolean;
  error: string | null;
  data: GroupedStudent[];
  activeTab: "performance" | "makeup" | "fail";
  globalMaxSem: number;
  semesterColumns: number[];
  debouncedQuery: string;
  safePage: number;
  onSelectUsn: (usn: string) => void;
  onViewSubjects: (student: GroupedStudent) => void;
}

function StudentTable({
  loading,
  error,
  data,
  activeTab,
  globalMaxSem,
  semesterColumns,
  debouncedQuery,
  safePage,
  onSelectUsn,
  onViewSubjects,
}: StudentTableProps) {
  if (error) {
    return (
      <div className="rounded-2xl border border-destructive/30 bg-card p-12 text-center shadow-sm">
        <AlertTriangle className="mx-auto h-12 w-12 text-destructive mb-3" />
        <p className="text-sm font-semibold text-destructive">Could not load results</p>
        <p className="mt-1 text-xs text-muted-foreground">{error}</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="rounded-2xl border bg-card p-6 shadow-sm space-y-4">
        <Skeleton className="h-8 w-full" />
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    );
  }

  if (data.length === 0) {
    let emptyTitle = "No students found.";
    let emptySub = debouncedQuery ? `No students found for "${debouncedQuery}"` : "";

    if (activeTab === "makeup" && !debouncedQuery) {
      emptyTitle = "No Makeup Eligible Students";
      emptySub = "No students are currently eligible for makeup examination.";
    } else if (activeTab === "fail" && !debouncedQuery) {
      emptyTitle = "No Failed Students";
      emptySub = "No failed students found.";
    }

    return (
      <div className="rounded-2xl border bg-card p-12 text-center shadow-sm">
        <Search className="mx-auto h-12 w-12 text-muted-foreground/50 mb-3" />
        <p className="text-sm font-semibold text-foreground">{emptyTitle}</p>
        {emptySub && <p className="text-xs text-muted-foreground mt-1">{emptySub}</p>}
      </div>
    );
  }

  return (
    <div className="rounded-2xl border bg-card shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader className="bg-muted/30">
            <TableRow>
              <TableHead className="w-16">S.No</TableHead>
              <TableHead>USN</TableHead>
              <TableHead>Student Name</TableHead>

              {activeTab === "makeup" ? (
                <>
                  <TableHead className="text-center">Semester</TableHead>
                  <TableHead className="text-center">View Subjects</TableHead>
                </>
              ) : (
                <>
                  <TableHead>Department</TableHead>
                  {semesterColumns.map((sem) => (
                    <TableHead key={sem} className="text-center whitespace-nowrap">
                      SEM {sem}
                    </TableHead>
                  ))}
                  {activeTab === "performance" ? (
                    <TableHead className="text-center">View Performance</TableHead>
                  ) : (
                    <TableHead className="text-center">View Subjects</TableHead>
                  )}
                </>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((st, idx) => (
              <TableRow key={st.usn} className="hover:bg-muted/10 transition-colors">
                <TableCell className="text-muted-foreground text-center">
                  {(safePage - 1) * PAGE_SIZE + idx + 1}
                </TableCell>
                <TableCell className="font-mono font-bold text-primary bg-primary/10 rounded-md px-2 py-1 uppercase tracking-wider my-2 mx-1 inline-block">
                  {st.usn}
                </TableCell>
                <TableCell className="font-semibold text-foreground whitespace-nowrap">
                  {st.student_name}
                </TableCell>

                {activeTab === "makeup" ? (
                  <>
                    <TableCell className="text-center font-medium">
                      {st.relevant_failed_semester ?? st.maxSem}
                    </TableCell>
                    <TableCell className="text-center">
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-primary border-primary/30 hover:bg-primary/10 gap-1.5 h-8 px-3"
                        onClick={() => onViewSubjects(st)}
                      >
                        <Eye className="h-3.5 w-3.5" />
                        View Subjects
                      </Button>
                    </TableCell>
                  </>
                ) : (
                  <>
                    <TableCell className="text-muted-foreground">
                      <Badge variant="secondary" className="font-normal">
                        {st.department}
                      </Badge>
                    </TableCell>
                    {semesterColumns.map((sem) => (
                      <TableCell key={sem} className="text-center">
                        {renderStatusBadge(st.semesters[sem])}
                      </TableCell>
                    ))}
                    {activeTab === "performance" ? (
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
                    ) : (
                      <TableCell className="text-center">
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-primary border-primary/30 hover:bg-primary/10 gap-1.5 h-8 px-3"
                          onClick={() => onViewSubjects(st)}
                        >
                          <Eye className="h-3.5 w-3.5" />
                          View Subjects
                        </Button>
                      </TableCell>
                    )}
                  </>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
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
    Promise.all([adminService.getResultDetails(usn), adminService.getFailedSubjects(usn)])
      .then(([resultDetail, failedSubjects]) => {
        if (cancelled) return;
        const failedBySemester = new Map(
          failedSubjects.semesters.map((semester) => [semester.semester, semester.subjects]),
        );
        setDetail({
          ...resultDetail,
          semesters: resultDetail.semesters.map((semester) => ({
            ...semester,
            subjects: failedBySemester.get(semester.semester) ?? [],
          })),
        });
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

  const semestersWithBacklogs = sortedSemesters.length; // Actually need to count only ones with subjects > 0
  const totalFailedSubjects = sortedSemesters.reduce(
    (acc, sem) => acc + sem.subjects.length,
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
              const failedSubjects = sem.subjects;
              const hasFailed = failedSubjects.length > 0;
              const isExpanded = expandedSems.has(sem.semester) || hasFailed;

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
                          Semester {sem.semester}
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