import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  User,
  BookOpen,
  TrendingUp,
  Award,
  BarChart2,
  Star,
  CheckCircle2,
  GraduationCap,
  Activity,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { LineChartComponent } from "@/components/charts/LineChartComponent";
import { BarChartComponent } from "@/components/charts/BarChartComponent";
import { useAuth } from "@/context/AuthContext";
import {
  studentService,
  type StudentDashboardResponse,
  type StudentResultsResponse,
  type StudentSubjectMark,
} from "@/services/studentService";
import { getApiErrorMessage } from "@/services/api";

export const Route = createFileRoute("/student/dashboard")({
  component: StudentDashboard,
});

// ---------------------------------------------------------------------------
// Local type: subject enriched with its semester number
// ---------------------------------------------------------------------------
type SubjectWithSem = StudentSubjectMark & { semester: number };

// ---------------------------------------------------------------------------
// Circular progress ring (inline SVG — zero new dependencies)
// ---------------------------------------------------------------------------
interface CircularRingProps {
  value: number | null;
  max?: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  trackColor?: string;
}

function CircularRing({
  value,
  max = 10,
  size = 100,
  strokeWidth = 9,
  color = "#2563eb",
  trackColor = "#e2e8f0",
}: CircularRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = value == null ? 0 : Math.min(1, Math.max(0, value / max));
  const offset = circumference * (1 - pct);
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="rotate-[-90deg]">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={trackColor}
        strokeWidth={strokeWidth}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        style={{ transition: "stroke-dashoffset 0.6s ease" }}
      />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Small stat card (matches admin dashboard StatCard style)
// ---------------------------------------------------------------------------
interface StatCardProps {
  icon: React.ReactNode;
  iconBg: string;
  label: string;
  value: string;
  sub: string;
}

function StatCard({ icon, iconBg, label, value, sub }: StatCardProps) {
  return (
    <Card className="border-border/60 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              {label}
            </p>
            <p className="mt-1.5 text-xl font-bold text-foreground leading-tight truncate">
              {value}
            </p>
            <p className="mt-1 text-[10px] text-muted-foreground truncate">{sub}</p>
          </div>
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${iconBg}`}
          >
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ===========================================================================
// MAIN COMPONENT
// ===========================================================================
function StudentDashboard() {
  const { user } = useAuth();
  const [data, setData] = useState<StudentDashboardResponse | null>(null);
  const [resultsData, setResultsData] = useState<StudentResultsResponse | null>(null);
  const [selectedSemTab, setSelectedSemTab] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  // ---- fetch dashboard + full results in parallel --------------------------
  useEffect(() => {
    let cancelled = false;

    Promise.allSettled([studentService.getDashboard(), studentService.getResults()]).then(
      ([dashResult, resultsResult]) => {
        if (cancelled) return;

        if (dashResult.status === "fulfilled") {
          setData(dashResult.value);
        } else {
          setError(getApiErrorMessage(dashResult.reason, "Could not load your dashboard."));
        }

        if (resultsResult.status === "fulfilled") {
          const rd = resultsResult.value;
          setResultsData(rd);

          // Default tab: current semester from dashboard, else latest semester
          const currentSem =
            dashResult.status === "fulfilled" ? dashResult.value.current_semester : null;
          const sems = rd.semesters;
          if (sems.length > 0) {
            const target =
              currentSem && sems.some((s) => s.semester === currentSem)
                ? currentSem
                : Math.max(...sems.map((s) => s.semester));
            setSelectedSemTab(target);
          }
        }
        // If results fail, dashboard still shows; analytics cards show "—"
      },
    );

    return () => {
      cancelled = true;
    };
  }, []);

  // ---- Name / initials from dashboard data ---------------------------------
  const name = data?.name ?? user?.name ?? "";
  const initials =
    name
      .split(" ")
      .map((p) => p[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("") || "S";
  const firstName = name.split(" ")[0] || "Student";

  // ==========================================================================
  // ALL-SEMESTER derived values — computed from studentService.getResults()
  // ==========================================================================

  /** Every subject across every semester, tagged with its semester number */
  const allSubjects = useMemo<SubjectWithSem[]>(() => {
    if (!resultsData) return [];
    return resultsData.semesters.flatMap((sem) =>
      sem.subjects.map((s) => ({ ...s, semester: sem.semester })),
    );
  }, [resultsData]);

  /** Total subject entries across ALL semesters */
  const totalSubjects = allSubjects.length;

  /**
   * Total credits across ALL semesters.
   * Primary: sum of credits_earned per semester (the backend-computed value).
   * Fallback: sum of individual subject credits.
   */
  const totalCredits = useMemo(() => {
    if (!resultsData || resultsData.semesters.length === 0) return null;

    // Try semester-level credits_earned first
    const semSum = resultsData.semesters.reduce(
      (acc, sem) => acc + (sem.credits_earned ?? 0),
      0,
    );
    if (semSum > 0) return semSum;

    // Fallback: sum individual subject credits
    const subSum = allSubjects.reduce((acc, s) => acc + (s.credits ?? 0), 0);
    return subSum > 0 ? subSum : null;
  }, [resultsData, allSubjects]);

  /**
   * Overall average marks across ALL semesters.
   * Uses `marks` field (same field used by the existing charts).
   * Only includes subjects with non-null marks.
   */
  const overallAvgMarks = useMemo(() => {
    const valid = allSubjects.filter((s) => s.marks != null);
    if (valid.length === 0) return null;
    const sum = valid.reduce((acc, s) => acc + (s.marks as number), 0);
    return sum / valid.length;
  }, [allSubjects]);

  /**
   * Highest individual subject mark across ALL semesters.
   * Uses `marks` field (same as charts). Returns the full subject
   * object so we can display subject name + semester in the card sub-text.
   */
  const highestSubject = useMemo<SubjectWithSem | null>(() => {
    const valid = allSubjects.filter((s) => s.marks != null);
    if (valid.length === 0) return null;
    return valid.reduce((best, s) => ((s.marks as number) > (best.marks as number) ? s : best));
  }, [allSubjects]);

  // ==========================================================================
  // CGPA GROWTH CHART — all semesters, dual SGPA + CGPA lines
  // Source: resultsData.semesters (each semester has .sgpa and .cgpa)
  // Fallback: data.cgpa_trend from dashboard (CGPA only)
  // ==========================================================================
  const cgpaGrowthData = useMemo(() => {
    if (resultsData && resultsData.semesters.length > 0) {
      return [...resultsData.semesters]
        .sort((a, b) => a.semester - b.semester)
        .map((sem) => ({
          semester: `Sem ${sem.semester}`,
          sgpa: sem.sgpa,
          cgpa: sem.cgpa,
        }));
    }
    // Fallback to dashboard cgpa_trend (CGPA only)
    return (data?.cgpa_trend ?? []).map((t) => ({
      semester: t.semester,
      sgpa: null as number | null,
      cgpa: t.cgpa,
    }));
  }, [resultsData, data?.cgpa_trend]);

  // ==========================================================================
  // SUBJECT PERFORMANCE — semester tabs
  // ==========================================================================

  /** Sorted list of available semester objects */
  const availableSemesters = useMemo(() => {
    if (!resultsData) return [];
    return [...resultsData.semesters].sort((a, b) => a.semester - b.semester);
  }, [resultsData]);

  /** Currently selected semester's subjects for the bar chart */
  const selectedSemSubjectChartData = useMemo(() => {
    if (!resultsData || selectedSemTab === null) return [];
    const sem = resultsData.semesters.find((s) => s.semester === selectedSemTab);
    if (!sem) return [];
    return sem.subjects.map((s) => ({
      name: s.code,
      marks: s.marks,
    }));
  }, [resultsData, selectedSemTab]);

  /** Semester-level SGPA summary for the selected tab info row */
  const selectedSemInfo = useMemo(() => {
    if (!resultsData || selectedSemTab === null) return null;
    return resultsData.semesters.find((s) => s.semester === selectedSemTab) ?? null;
  }, [resultsData, selectedSemTab]);

  // Current-semester subject marks (used for current semester tab default)
  // (kept from dashboard, for fallback)
  const currentSemSubjectComparison = useMemo(
    () =>
      (data?.subject_marks ?? []).map((s) => ({
        name: s.code,
        marks: s.marks,
      })),
    [data?.subject_marks],
  );

  // Timestamp for footer
  const now = new Date().toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  // ===========================================================================
  // RENDER
  // ===========================================================================
  return (
    <div className="flex flex-col gap-5 pb-8 animate-in fade-in duration-500">
      {/* ================================================================
          HERO BANNER — matches admin dashboard style exactly
      ================================================================ */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#1e3a6e] via-[#1a4fa8] to-[#2563eb] shadow-lg min-h-[140px]">
        <div className="absolute inset-y-0 right-0 w-[45%] opacity-25 [mask-image:linear-gradient(to_left,white_30%,transparent)]">
          <img
            src="/images/college.jpeg"
            alt="MIT Mysore Campus"
            className="h-full w-full object-cover object-center"
          />
        </div>
        <div className="relative z-10 flex items-stretch justify-between gap-4 px-8 py-7">
          <div className="flex flex-col justify-center">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-200">
              WELCOME BACK,
            </p>
            <h1 className="mt-1 text-3xl font-bold text-white tracking-tight">{firstName} 👋</h1>
            <p className="mt-2 text-sm text-blue-100 max-w-sm leading-relaxed">
              Here's a snapshot of your academic performance. Review your results, track your CGPA
              growth, and monitor your academic status.
            </p>
          </div>
          <div className="hidden lg:flex flex-col justify-center items-end max-w-xs text-right pr-4 gap-2">
            {data?.current_sgpa != null && (
              <div className="rounded-xl bg-white/10 border border-white/20 px-5 py-2.5 text-right backdrop-blur-sm">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-blue-200">
                  Current SGPA
                </p>
                <p className="text-2xl font-bold text-white mt-0.5">
                  {data.current_sgpa.toFixed(2)}
                </p>
              </div>
            )}
            {data?.overall_cgpa != null && (
              <div className="rounded-xl bg-white/10 border border-white/20 px-5 py-2.5 text-right backdrop-blur-sm">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-blue-200">
                  Overall CGPA
                </p>
                <p className="text-2xl font-bold text-white mt-0.5">
                  {data.overall_cgpa.toFixed(2)}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ================================================================
          ERROR STATE
      ================================================================ */}
      {error && (
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-sm font-medium">No student data available.</p>
            <p className="mt-1 text-xs text-muted-foreground">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* ================================================================
          MAIN CONTENT (shown even if results failed — dashboard still loads)
      ================================================================ */}
      {!error && (
        <>
          {/* ==============================================================
              SUMMARY CARDS ROW  — 3 columns
          ============================================================== */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            {/* ---- Card 1: Student Profile -------------------------------- */}
            <Card className="border-border/60 shadow-sm lg:col-span-1">
              <CardHeader className="pb-2 pt-4 px-5">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100">
                    <User className="h-4 w-4 text-blue-600" />
                  </div>
                  <CardTitle className="text-sm font-bold text-foreground">
                    Student Profile
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="px-5 pb-5">
                <div className="flex items-center gap-3 mb-4">
                  <Avatar className="h-14 w-14 border-2 border-blue-100">
                    <AvatarFallback className="bg-gradient-to-br from-[#1a4fa8] to-[#2563eb] text-base font-bold text-white">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="truncate text-base font-bold text-foreground">{name || "—"}</p>
                    <p className="truncate text-xs text-muted-foreground font-mono mt-0.5">
                      {data?.usn ?? user?.usn ?? user?.id ?? "—"}
                    </p>
                    <p className="truncate text-xs text-muted-foreground mt-0.5">
                      {data?.email ?? user?.email ?? "—"}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2.5 text-sm">
                  <div className="rounded-xl bg-muted/50 px-3 py-2.5 border border-border/40">
                    <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                      Department
                    </p>
                    <p className="mt-0.5 font-semibold text-foreground text-sm truncate">
                      {data?.department ?? user?.department ?? "—"}
                    </p>
                  </div>
                  <div className="rounded-xl bg-muted/50 px-3 py-2.5 border border-border/40">
                    <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                      Semester
                    </p>
                    <p className="mt-0.5 font-semibold text-foreground text-sm">
                      {(data?.semester ?? user?.semester)
                        ? `Sem ${data?.semester ?? user?.semester}`
                        : "—"}
                    </p>
                  </div>
                </div>
                <div className="mt-3">
                  <Badge
                    className={`text-xs font-semibold px-2.5 py-1 ${
                      (data?.academic_status ?? "").toLowerCase().includes("active")
                        ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100"
                        : "bg-blue-100 text-blue-700 hover:bg-blue-100"
                    }`}
                  >
                    <CheckCircle2 className="h-3 w-3 mr-1 inline-block" />
                    Academic Status: {data?.academic_status ?? "No result data"}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* ---- Card 2: Current Semester SGPA (current semester only) -- */}
            <Card className="border-border/60 shadow-sm">
              <CardHeader className="pb-2 pt-4 px-5">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-100">
                    <TrendingUp className="h-4 w-4 text-violet-600" />
                  </div>
                  <CardTitle className="text-sm font-bold text-foreground">
                    Current Semester SGPA
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="px-5 pb-5">
                <div className="flex flex-col items-center justify-center py-2">
                  <div className="relative flex items-center justify-center">
                    <CircularRing
                      value={data?.current_sgpa ?? null}
                      max={10}
                      size={120}
                      strokeWidth={10}
                      color="#7c3aed"
                      trackColor="var(--color-muted)"
                    />
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-2xl font-bold text-foreground leading-none">
                        {data?.current_sgpa != null ? data.current_sgpa.toFixed(2) : "—"}
                      </span>
                      <span className="text-[10px] text-muted-foreground mt-0.5">/ 10.0</span>
                    </div>
                  </div>
                  <p className="mt-3 text-sm font-medium text-foreground">
                    {data?.current_semester
                      ? `Semester ${data.current_semester} results`
                      : "No result data available"}
                  </p>
                  {data?.current_sgpa != null && (
                    <div className="mt-2 w-full rounded-xl bg-violet-50 border border-violet-100 px-4 py-2 text-center">
                      <p className="text-[10px] uppercase tracking-wide text-violet-500 font-semibold">
                        Performance
                      </p>
                      <p className="text-xs font-medium text-violet-700 mt-0.5">
                        {data.current_sgpa >= 9
                          ? "Outstanding"
                          : data.current_sgpa >= 8
                            ? "Excellent"
                            : data.current_sgpa >= 7
                              ? "Good"
                              : data.current_sgpa >= 6
                                ? "Average"
                                : "Needs Improvement"}
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* ---- Card 3: Overall CGPA (cumulative) ---------------------- */}
            <Card className="border-border/60 shadow-sm">
              <CardHeader className="pb-2 pt-4 px-5">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100">
                    <Award className="h-4 w-4 text-amber-600" />
                  </div>
                  <CardTitle className="text-sm font-bold text-foreground">Overall CGPA</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="px-5 pb-5">
                <div className="flex flex-col items-center justify-center py-2">
                  <div className="relative flex items-center justify-center">
                    <CircularRing
                      value={data?.overall_cgpa ?? null}
                      max={10}
                      size={120}
                      strokeWidth={10}
                      color="#d97706"
                      trackColor="var(--color-muted)"
                    />
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-2xl font-bold text-foreground leading-none">
                        {data?.overall_cgpa != null ? data.overall_cgpa.toFixed(2) : "—"}
                      </span>
                      <span className="text-[10px] text-muted-foreground mt-0.5">/ 10.0</span>
                    </div>
                  </div>
                  <p className="mt-3 text-sm font-medium text-foreground">
                    {data?.current_semester ? "Latest stored CGPA" : "No result data available"}
                  </p>
                  {data?.overall_cgpa != null && (
                    <div className="mt-2 w-full rounded-xl bg-amber-50 border border-amber-100 px-4 py-2 text-center">
                      <p className="text-[10px] uppercase tracking-wide text-amber-500 font-semibold">
                        Standing
                      </p>
                      <p className="text-xs font-medium text-amber-700 mt-0.5">
                        {data.overall_cgpa >= 9
                          ? "Distinction"
                          : data.overall_cgpa >= 8
                            ? "First Class"
                            : data.overall_cgpa >= 6
                              ? "Second Class"
                              : "Pass"}
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* ================================================================
              ANALYTICS ROW — CGPA Growth (all semesters) + Subject Performance
          ================================================================ */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {/* ---- CGPA Growth — dual SGPA + CGPA lines across ALL semesters */}
            <Card className="border-border/60 shadow-sm">
              <CardHeader className="pb-2 pt-4 px-5">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100">
                    <TrendingUp className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <CardTitle className="text-sm font-bold text-foreground">CGPA Growth</CardTitle>
                    <p className="text-[11px] text-muted-foreground leading-tight">
                      SGPA &amp; CGPA trend across all semesters
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="px-2 pb-4">
                {cgpaGrowthData.length === 0 ? (
                  <div className="flex h-[220px] items-center justify-center text-sm text-muted-foreground">
                    No CGPA trend data available
                  </div>
                ) : (
                  <LineChartComponent
                    data={cgpaGrowthData}
                    xKey="semester"
                    lines={[
                      { key: "sgpa", name: "SGPA", color: "#7c3aed" },
                      { key: "cgpa", name: "CGPA", color: "#2563eb" },
                    ]}
                    height={220}
                  />
                )}
              </CardContent>
            </Card>

            {/* ---- All Semester Subject Performance — semester tabs -------- */}
            <Card className="border-border/60 shadow-sm">
              <CardHeader className="pb-2 pt-4 px-5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100">
                      <BarChart2 className="h-4 w-4 text-emerald-600" />
                    </div>
                    <div>
                      <CardTitle className="text-sm font-bold text-foreground">
                        All Semester — Subject Performance
                      </CardTitle>
                      <p className="text-[11px] text-muted-foreground leading-tight">
                        {selectedSemInfo
                          ? `Semester ${selectedSemInfo.semester} · SGPA: ${selectedSemInfo.sgpa != null ? selectedSemInfo.sgpa.toFixed(2) : "—"}`
                          : "Select a semester to view subject marks"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Semester tabs */}
                {availableSemesters.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {availableSemesters.map((sem) => (
                      <button
                        key={sem.semester}
                        onClick={() => setSelectedSemTab(sem.semester)}
                        className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
                          selectedSemTab === sem.semester
                            ? "bg-emerald-600 text-white shadow-sm"
                            : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
                        }`}
                      >
                        Sem {sem.semester}
                      </button>
                    ))}
                  </div>
                )}
              </CardHeader>

              <CardContent className="px-2 pb-4">
                {/* If resultsData not yet loaded, fall back to current-semester chart */}
                {resultsData === null ? (
                  currentSemSubjectComparison.length === 0 ? (
                    <div className="flex h-[200px] items-center justify-center text-sm text-muted-foreground">
                      Loading subject data…
                    </div>
                  ) : (
                    <BarChartComponent
                      data={currentSemSubjectComparison}
                      xKey="name"
                      bars={[{ key: "marks", name: "Marks", color: "#10b981" }]}
                      height={200}
                    />
                  )
                ) : selectedSemSubjectChartData.length === 0 ? (
                  <div className="flex h-[200px] items-center justify-center text-sm text-muted-foreground">
                    {availableSemesters.length === 0
                      ? "No subject data available"
                      : "No subjects found for this semester"}
                  </div>
                ) : (
                  <BarChartComponent
                    data={selectedSemSubjectChartData}
                    xKey="name"
                    bars={[{ key: "marks", name: "Marks", color: "#10b981" }]}
                    height={200}
                  />
                )}
              </CardContent>
            </Card>
          </div>

          {/* ================================================================
              INSIGHT STATS ROW — ALL-SEMESTER computed values
              Sources: resultsData.semesters (getResults API)
          ================================================================ */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {/* Total Credits — sum across ALL semesters */}
            <StatCard
              icon={<GraduationCap className="h-5 w-5 text-blue-600" />}
              iconBg="bg-blue-100"
              label="Total Credits"
              value={totalCredits != null ? String(totalCredits) : "—"}
              sub="All semesters combined"
            />

            {/* Total Subjects — count across ALL semesters */}
            <StatCard
              icon={<BookOpen className="h-5 w-5 text-emerald-600" />}
              iconBg="bg-emerald-100"
              label="Total Subjects"
              value={totalSubjects > 0 ? String(totalSubjects) : "—"}
              sub="All semesters combined"
            />

            {/* Overall Avg Marks — mean of all valid subject marks */}
            <StatCard
              icon={<Activity className="h-5 w-5 text-violet-600" />}
              iconBg="bg-violet-100"
              label="Overall Avg Marks"
              value={overallAvgMarks != null ? overallAvgMarks.toFixed(1) : "—"}
              sub="Across all subjects"
            />

            {/* Highest Subject Mark — best individual mark across ALL semesters */}
            <StatCard
              icon={<Star className="h-5 w-5 text-amber-500" />}
              iconBg="bg-amber-100"
              label="Highest Mark"
              value={highestSubject != null ? String(highestSubject.marks) : "—"}
              sub={
                highestSubject
                  ? `${highestSubject.code} · Sem ${highestSubject.semester}`
                  : "Best subject mark"
              }
            />

            {/* Current SGPA — current semester only */}
            <StatCard
              icon={<TrendingUp className="h-5 w-5 text-rose-500" />}
              iconBg="bg-rose-100"
              label="Current SGPA"
              value={data?.current_sgpa != null ? data.current_sgpa.toFixed(2) : "—"}
              sub={
                data?.current_semester ? `Semester ${data.current_semester}` : "Current semester"
              }
            />

            {/* Overall CGPA — cumulative */}
            <StatCard
              icon={<Award className="h-5 w-5 text-indigo-500" />}
              iconBg="bg-indigo-100"
              label="Overall CGPA"
              value={data?.overall_cgpa != null ? data.overall_cgpa.toFixed(2) : "—"}
              sub="Cumulative GPA"
            />
          </div>

          {/* ================================================================
              SEMESTER PERFORMANCE SUMMARY TABLE — all semesters at a glance
          ================================================================ */}
          {availableSemesters.length > 0 && (
            <Card className="border-border/60 shadow-sm">
              <CardHeader className="pb-2 pt-4 px-5">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-100">
                    <BarChart2 className="h-4 w-4 text-indigo-600" />
                  </div>
                  <div>
                    <CardTitle className="text-sm font-bold text-foreground">
                      Semester-wise Performance Summary
                    </CardTitle>
                    <p className="text-[11px] text-muted-foreground leading-tight">
                      SGPA, CGPA and credits across all semesters
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="px-5 pb-4">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border/60 bg-muted/30">
                        <th className="py-2.5 pl-3 pr-4 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          Semester
                        </th>
                        <th className="py-2.5 px-4 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          Subjects
                        </th>
                        <th className="py-2.5 px-4 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          Credits Earned
                        </th>
                        <th className="py-2.5 px-4 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          SGPA
                        </th>
                        <th className="py-2.5 pl-4 pr-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          CGPA
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/30">
                      {availableSemesters.map((sem) => (
                        <tr
                          key={sem.semester}
                          className={`hover:bg-muted/20 transition-colors cursor-pointer ${
                            selectedSemTab === sem.semester ? "bg-emerald-50/50" : ""
                          }`}
                          onClick={() => setSelectedSemTab(sem.semester)}
                        >
                          <td className="py-2.5 pl-3 pr-4 font-medium text-foreground">
                            Semester {sem.semester}
                          </td>
                          <td className="py-2.5 px-4 text-muted-foreground">
                            {sem.subjects.length}
                          </td>
                          <td className="py-2.5 px-4 text-muted-foreground">
                            {sem.credits_earned != null ? sem.credits_earned : "—"}
                          </td>
                          <td className="py-2.5 px-4">
                            <Badge
                              variant="secondary"
                              className="bg-violet-100 text-violet-700 text-xs font-semibold"
                            >
                              {sem.sgpa != null ? sem.sgpa.toFixed(2) : "—"}
                            </Badge>
                          </td>
                          <td className="py-2.5 pl-4 pr-3">
                            <Badge
                              variant="secondary"
                              className="bg-blue-100 text-blue-700 text-xs font-semibold"
                            >
                              {sem.cgpa != null ? sem.cgpa.toFixed(2) : "—"}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* ================================================================
              RECENT RESULTS — kept exactly, focused on latest semester
          ================================================================ */}
          <Card className="border-border/60 shadow-sm">
            <CardHeader className="pb-2 pt-4 px-5">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100">
                  <BookOpen className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                  <CardTitle className="text-sm font-bold text-foreground">
                    Recent Results
                  </CardTitle>
                  <p className="text-[11px] text-muted-foreground leading-tight">
                    Latest semester subject results
                    {data?.current_semester ? ` — Semester ${data.current_semester}` : ""}
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="px-5 pb-5">
              {(data?.recent_subjects ?? []).length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  No result data available.
                </p>
              ) : (
                <ul className="divide-y divide-border/50">
                  {data!.recent_subjects.map((s) => (
                    <li
                      key={s.code}
                      className="flex items-center justify-between py-3 text-sm hover:bg-muted/30 -mx-2 px-2 rounded-lg transition-colors"
                    >
                      <div className="min-w-0">
                        <p className="font-medium text-foreground truncate">{s.name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {s.code}
                          {s.credits != null ? ` · ${s.credits} credits` : ""}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0 ml-4">
                        <span className="font-bold text-foreground text-base">
                          {s.marks ?? "—"}
                        </span>
                        <Badge variant="secondary" className="text-xs font-semibold">
                          {s.grade ?? "—"}
                        </Badge>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          {/* ================================================================
              FOOTER — matches admin dashboard
          ================================================================ */}
          <footer className="mt-2 flex flex-col items-center justify-between gap-1 border-t border-border/40 pt-4 text-[11px] text-muted-foreground sm:flex-row">
            <span>
              MIT Mysore &nbsp;|&nbsp; Student Result Analysis &nbsp;|&nbsp; Student Portal
            </span>
            <span>Last updated: {now}</span>
          </footer>
        </>
      )}
    </div>
  );
}
