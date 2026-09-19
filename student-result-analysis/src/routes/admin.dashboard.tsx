import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Users,
  BookOpen,
  TrendingUp,
  Award,
  Trophy,
  UserPlus,
  FileSpreadsheet,
  BarChart2,
  Eye,
  ChevronRight,
  Medal,
  Activity,
} from "lucide-react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip as RechartsTooltip,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChartComponent } from "@/components/charts/BarChartComponent";
import { adminService, type AdminResultRow, type AdminTopperRow } from "@/services/adminService";

export const Route = createFileRoute("/admin/dashboard")({
  component: AdminDashboard,
});

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface SemPerf {
  semester: string;
  passed: number;
  failed: number;
}



interface TopPerformerEntry {
  rank: number;
  name: string;
  usn: string;
  cgpa: number;
}

// ---------------------------------------------------------------------------
// Donut chart colours
// ---------------------------------------------------------------------------
const DONUT_COLORS = ["#22c55e", "#ef4444"];

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
function AdminDashboard() {
  // ---- raw state -----------------------------------------------------------
  const [totalStudents, setTotalStudents] = useState(0);
  const [totalSubjects, setTotalSubjects] = useState(0);
  const [passPercentage, setPassPercentage] = useState(0);
  const [averageCGPA, setAverageCGPA] = useState(0);
  const [topPerformerName, setTopPerformerName] = useState("—");
  const [topPerformerCgpa, setTopPerformerCgpa] = useState<number | null>(null);

  const [semesterPerf, setSemesterPerf] = useState<SemPerf[]>([]);
  const [totalPassed, setTotalPassed] = useState(0);
  const [totalFailed, setTotalFailed] = useState(0);

  const [topPerformers, setTopPerformers] = useState<TopPerformerEntry[]>([]);

  const [loading, setLoading] = useState(true);

  // ---- data fetch ----------------------------------------------------------
  useEffect(() => {
    let mounted = true;

    async function loadAll() {
      try {
        const [students, subjects, resultsData, toppersData] = await Promise.all([
          adminService.getStudents().catch(() => []),
          adminService.getSubjects().catch(() => []),
          adminService
            .getResults()
            .catch(() => ({ total: 0, results: [], department: null, semester: null, departments: [] })),
          adminService.getToppers().catch(() => ({ toppers: [], department_toppers: [] })),
        ]);

        if (!mounted) return;

        const results: AdminResultRow[] = resultsData.results ?? [];

        // --- unique-per-student (highest semester, then highest CGPA) -----
        const uniqueMap = new Map<string, AdminResultRow>();
        for (const res of results) {
          const ex = uniqueMap.get(res.usn);
          if (!ex) {
            uniqueMap.set(res.usn, res);
          } else if (res.semester > ex.semester) {
            uniqueMap.set(res.usn, res);
          } else if (res.semester === ex.semester && (res.cgpa ?? 0) > (ex.cgpa ?? 0)) {
            uniqueMap.set(res.usn, res);
          }
        }
        const uniqueResults = Array.from(uniqueMap.values());

        // --- stats cards ---------------------------------------------------
        let passed = 0;
        let failed = 0;
        let cgpaSum = 0;
        let cgpaCount = 0;
        let topCgpa = -1;
        let topName = "—";

        for (const res of uniqueResults) {
          const grade = (res.grade ?? "").toUpperCase();
          if (grade !== "F" && grade !== "FAIL" && grade !== "ABSENT") {
            passed++;
          } else {
            failed++;
          }
          if (res.cgpa != null && res.cgpa > 0) {
            cgpaSum += res.cgpa;
            cgpaCount++;
            if (res.cgpa > topCgpa) {
              topCgpa = res.cgpa;
              topName = res.student_name;
            }
          }
        }

        const total = uniqueResults.length;
        const passedPct = total > 0 ? (passed / total) * 100 : 0;
        const avgCgpa = cgpaCount > 0 ? cgpaSum / cgpaCount : 0;

        setTotalStudents(students.length);
        setTotalSubjects(subjects.length);
        setPassPercentage(passedPct);
        setAverageCGPA(avgCgpa);
        setTopPerformerName(topName);
        setTopPerformerCgpa(topCgpa > 0 ? topCgpa : null);
        setTotalPassed(passed);
        setTotalFailed(failed);

        // --- semester performance (all results, not de-duped) ---------------
        const semMap = new Map<number, { passed: number; failed: number }>();
        for (const res of results) {
          if (res.semester == null) continue;
          if (!semMap.has(res.semester)) semMap.set(res.semester, { passed: 0, failed: 0 });
          const s = semMap.get(res.semester)!;
          const g = (res.grade ?? "").toUpperCase();
          if (g !== "F" && g !== "FAIL" && g !== "ABSENT") {
            s.passed++;
          } else {
            s.failed++;
          }
        }
        const semPerf: SemPerf[] = Array.from(semMap.entries())
          .sort((a, b) => a[0] - b[0])
          .map(([sem, s]) => ({ semester: `Sem ${sem}`, passed: s.passed, failed: s.failed }));
        setSemesterPerf(semPerf);

        // --- top performers (top 5, all semesters) -------------------------
        const topList: TopPerformerEntry[] = (toppersData.toppers ?? [])
          .filter((t: AdminTopperRow) => t.cgpa > 0)
          .sort((a: AdminTopperRow, b: AdminTopperRow) => b.cgpa - a.cgpa)
          .slice(0, 10)
          .map((t: AdminTopperRow, i: number) => ({
            rank: i + 1,
            name: t.name,
            usn: t.usn,
            cgpa: t.cgpa,
          }));
        setTopPerformers(topList);


      } catch (err) {
        console.error("Dashboard load error", err);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadAll();
    return () => {
      mounted = false;
    };
  }, []);

  // ---- derived -------------------------------------------------------------
  const donutData = useMemo(
    () => [
      { name: "Passed", value: totalPassed },
      { name: "Failed", value: totalFailed },
    ],
    [totalPassed, totalFailed],
  );

  const donutTotal = totalPassed + totalFailed;
  const donutPassPct = donutTotal > 0 ? ((totalPassed / donutTotal) * 100).toFixed(2) : "0.00";



  const now = new Date().toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  // =========================================================================
  // RENDER
  // =========================================================================
  return (
    <div className="flex flex-col gap-5 pb-8">
      {/* ================================================================
          HERO BANNER
      ================================================================ */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#1e3a6e] via-[#1a4fa8] to-[#2563eb] shadow-lg min-h-[140px]">
        {/* College image — right side overlay */}
        <div className="absolute inset-y-0 right-0 w-[45%] opacity-30 [mask-image:linear-gradient(to_left,white_30%,transparent)]">
          <img
            src="/images/college.jpeg"
            alt="MIT Mysore Campus"
            className="h-full w-full object-cover object-center"
          />
        </div>

        {/* Content */}
        <div className="relative z-10 flex items-stretch justify-between gap-4 px-8 py-7">
          {/* Left text */}
          <div className="flex flex-col justify-center">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-200">
              WELCOME BACK,
            </p>
            <h1 className="mt-1 text-3xl font-bold text-white tracking-tight">
              Administrator 👋
            </h1>
            <p className="mt-2 text-sm text-blue-100 max-w-sm leading-relaxed">
              Here's what's happening with your institute today.
            </p>
          </div>

          {/* Right — motivational quote */}
          <div className="hidden lg:flex flex-col justify-center items-end max-w-xs text-right pr-4">
            <p className="text-sm italic text-blue-100 leading-relaxed">
              "Education is the most powerful weapon which you can use to change the world."
            </p>
            <p className="mt-2 text-xs font-semibold text-blue-300">— Nelson Mandela</p>
          </div>
        </div>
      </div>

      {/* ================================================================
          FIVE STATS CARDS
      ================================================================ */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {/* 1. Total Students */}
        <StatCard
          icon={<Users className="h-5 w-5 text-blue-600" />}
          iconBg="bg-blue-100"
          label="Total Students"
          value={loading ? "…" : totalStudents.toLocaleString()}
          sub="Registered Students"
          loading={loading}
        />
        {/* 2. Total Subjects */}
        <StatCard
          icon={<BookOpen className="h-5 w-5 text-emerald-600" />}
          iconBg="bg-emerald-100"
          label="Total Subjects"
          value={loading ? "…" : totalSubjects.toLocaleString()}
          sub="Available Subjects"
          loading={loading}
        />
        {/* 3. Pass Percentage */}
        <StatCard
          icon={
            <span className="text-purple-600 font-bold text-base leading-none">%</span>
          }
          iconBg="bg-purple-100"
          label="Pass Percentage"
          value={loading ? "…" : `${passPercentage.toFixed(2)}%`}
          sub="Overall Pass Percentage"
          loading={loading}
        />
        {/* 4. Average CGPA */}
        <StatCard
          icon={<Award className="h-5 w-5 text-amber-500" />}
          iconBg="bg-amber-100"
          label="Average CGPA"
          value={loading ? "…" : averageCGPA.toFixed(2)}
          sub="Overall Average CGPA"
          loading={loading}
        />
        {/* 5. Top Performer */}
        <StatCard
          icon={<Trophy className="h-5 w-5 text-rose-500" />}
          iconBg="bg-rose-100"
          label="Top Performer"
          value={loading ? "…" : topPerformerName}
          sub={
            topPerformerCgpa != null && !loading
              ? `CGPA : ${topPerformerCgpa.toFixed(2)}`
              : "No result data"
          }
          valueSmall
          loading={loading}
        />
      </div>

      {/* ================================================================
          ANALYTICS ROW  (Performance Overview | Result Summary | Quick Actions)
      ================================================================ */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        {/* ---- Overall Performance Overview (left, 5 cols) --------------- */}
        <Card className="lg:col-span-5 border-border/60 shadow-sm">
          <CardHeader className="pb-2 pt-4 px-5">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100">
                <BarChart2 className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <CardTitle className="text-sm font-bold text-foreground">
                  Overall Performance Overview
                </CardTitle>
                <p className="text-[11px] text-muted-foreground leading-tight">
                  Pass vs Fail ratio across all semesters
                </p>
              </div>
              <div className="ml-auto flex items-center gap-3 text-[11px] text-muted-foreground">
                <span className="flex items-center gap-1">
                  <span className="inline-block h-2.5 w-2.5 rounded-full bg-emerald-500" />
                  Pass
                </span>
                <span className="flex items-center gap-1">
                  <span className="inline-block h-2.5 w-2.5 rounded-full bg-red-500" />
                  Fail
                </span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="px-2 pb-4">
            {loading ? (
              <div className="flex h-[200px] items-center justify-center text-sm text-muted-foreground">
                Loading…
              </div>
            ) : semesterPerf.length === 0 ? (
              <div className="flex h-[200px] items-center justify-center text-sm text-muted-foreground">
                No performance data available
              </div>
            ) : (
              <BarChartComponent
                data={semesterPerf}
                xKey="semester"
                bars={[
                  { key: "passed", name: "Passed", color: "#22c55e" },
                  { key: "failed", name: "Failed", color: "#ef4444" },
                ]}
                height={210}
              />
            )}
          </CardContent>
        </Card>

        {/* ---- Student Result Summary (center, 4 cols) ------------------- */}
        <Card className="lg:col-span-4 border-border/60 shadow-sm">
          <CardHeader className="pb-2 pt-4 px-5">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-100">
                <Activity className="h-4 w-4 text-violet-600" />
              </div>
              <div>
                <CardTitle className="text-sm font-bold text-foreground">
                  Student Result Summary
                </CardTitle>
                <p className="text-[11px] text-muted-foreground leading-tight">
                  Based on all semesters
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            {loading ? (
              <div className="flex h-[200px] items-center justify-center text-sm text-muted-foreground">
                Loading…
              </div>
            ) : (
              <>
                {/* Donut chart with center label */}
                <div className="relative">
                  <ResponsiveContainer width="100%" height={180}>
                    <PieChart>
                      <Pie
                        data={donutData}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={52}
                        outerRadius={78}
                        paddingAngle={2}
                        stroke="none"
                      >
                        {donutData.map((_, i) => (
                          <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />
                        ))}
                      </Pie>
                      <RechartsTooltip
                        formatter={(v: number) => [v, ""]}
                        contentStyle={{
                          backgroundColor: "var(--color-popover)",
                          border: "1px solid var(--color-border)",
                          borderRadius: 8,
                          fontSize: 12,
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  {/* Centre text */}
                  <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                    <p className="text-lg font-bold text-foreground leading-none">
                      {donutPassPct}%
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Pass Percentage</p>
                  </div>
                </div>

                {/* Legend rows */}
                <div className="mt-1 flex justify-center gap-6 text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 shrink-0" />
                    <span className="text-muted-foreground">
                      Passed
                    </span>
                    <span className="font-semibold text-foreground ml-1">{totalPassed}</span>
                    <span className="text-muted-foreground ml-0.5">
                      · {donutTotal > 0 ? ((totalPassed / donutTotal) * 100).toFixed(2) : "0"}%
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-red-500 shrink-0" />
                    <span className="text-muted-foreground">Failed</span>
                    <span className="font-semibold text-foreground ml-1">{totalFailed}</span>
                    <span className="text-muted-foreground ml-0.5">
                      · {donutTotal > 0 ? ((totalFailed / donutTotal) * 100).toFixed(2) : "0"}%
                    </span>
                  </div>
                </div>

                {/* CGPA average row */}
                <div className="mt-4 flex items-center justify-between rounded-xl bg-muted/50 px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Award className="h-4 w-4 text-amber-500" />
                    <span className="text-xs text-muted-foreground">CGPA (Average)</span>
                  </div>
                  <span className="text-lg font-bold text-foreground">
                    {averageCGPA.toFixed(2)}
                  </span>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* ---- Quick Actions (right, 3 cols) ----------------------------- */}
        <Card className="lg:col-span-3 border-border/60 shadow-sm">
          <CardHeader className="pb-2 pt-4 px-5">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100">
                <TrendingUp className="h-4 w-4 text-amber-600" />
              </div>
              <CardTitle className="text-sm font-bold text-foreground">Quick Actions</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-4 flex flex-col gap-2">
            <QuickAction
              href="/admin/add-student"
              icon={<UserPlus className="h-4 w-4 text-blue-600" />}
              iconBg="bg-blue-100"
              label="Add Student"
            />
            <QuickAction
              href="/admin/add-subject"
              icon={<BookOpen className="h-4 w-4 text-emerald-600" />}
              iconBg="bg-emerald-100"
              label="Add Subject"
            />
            <QuickAction
              href="/admin/upload-excel"
              icon={<FileSpreadsheet className="h-4 w-4 text-orange-600" />}
              iconBg="bg-orange-100"
              label="Upload Excel"
            />
            <QuickAction
              href="/admin/view-results"
              icon={<Eye className="h-4 w-4 text-red-600" />}
              iconBg="bg-red-100"
              label="View Results"
            />
            <QuickAction
              href="/admin/student-performance"
              icon={<BarChart2 className="h-4 w-4 text-violet-600" />}
              iconBg="bg-violet-100"
              label="Student Performance"
              isNew
            />
          </CardContent>
        </Card>
      </div>

      {/* ================================================================
          FULL-WIDTH TOP 10 PERFORMERS
      ================================================================ */}
      <Card className="border-border/60 shadow-sm">
        <CardHeader className="pb-2 pt-4 px-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100">
                <Medal className="h-4 w-4 text-amber-600" />
              </div>
              <div>
                <CardTitle className="text-sm font-bold text-foreground">Top 10 Performers</CardTitle>
                <p className="text-[11px] text-muted-foreground leading-tight">
                  Highest CGPA across all semesters
                </p>
              </div>
            </div>
            <Link
              to="/admin/toppers"
              className="text-[11px] text-primary hover:underline flex items-center gap-0.5"
            >
              View All <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
        </CardHeader>
        <CardContent className="px-6 pb-5">
          {loading ? (
            <div className="flex h-[200px] items-center justify-center text-sm text-muted-foreground">
              Loading…
            </div>
          ) : topPerformers.length === 0 ? (
            <div className="flex h-[200px] items-center justify-center text-sm text-muted-foreground">
              No topper data available
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/60 bg-muted/30">
                  <th className="py-2.5 pl-3 pr-4 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground w-12">#</th>
                  <th className="py-2.5 px-4 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Name</th>
                  <th className="py-2.5 px-4 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">USN</th>
                  <th className="py-2.5 pl-4 pr-3 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">CGPA</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {topPerformers.map((t) => (
                  <tr key={t.usn} className="hover:bg-muted/20 transition-colors">
                    <td className="py-2.5 pl-3 pr-4">
                      <span
                        className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                          t.rank === 1
                            ? "bg-amber-400 text-white"
                            : t.rank === 2
                              ? "bg-slate-300 text-slate-700"
                              : t.rank === 3
                                ? "bg-orange-400 text-white"
                                : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {t.rank}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 font-medium text-foreground">{t.name}</td>
                    <td className="py-2.5 px-4 text-muted-foreground text-xs uppercase tracking-wider font-mono">
                      {t.usn}
                    </td>
                    <td className="py-2.5 pl-4 pr-3 text-right">
                      <Badge
                        variant="secondary"
                        className="bg-primary/10 text-primary text-xs font-semibold"
                      >
                        {t.cgpa.toFixed(2)}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {/* ================================================================
          FOOTER
      ================================================================ */}
      <footer className="mt-2 flex flex-col items-center justify-between gap-1 border-t border-border/40 pt-4 text-[11px] text-muted-foreground sm:flex-row">
        <span>MIT Mysore &nbsp;|&nbsp; Student Result Analysis &nbsp;|&nbsp; Admin Panel</span>
        <span>Last updated: {now}</span>
      </footer>
    </div>
  );
}

// ===========================================================================
// LOCAL SUB-COMPONENTS (only used in this file — no other files modified)
// ===========================================================================

// --- StatCard ---------------------------------------------------------------
interface StatCardProps {
  icon: React.ReactNode;
  iconBg: string;
  label: string;
  value: string;
  sub: string;
  valueSmall?: boolean;
  loading?: boolean;
}

function StatCard({ icon, iconBg, label, value, sub, valueSmall = false }: StatCardProps) {
  return (
    <Card className="border-border/60 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              {label}
            </p>
            <p
              className={`mt-1.5 font-bold text-foreground leading-tight truncate ${valueSmall ? "text-base" : "text-xl"}`}
            >
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

// --- QuickAction ------------------------------------------------------------
interface QuickActionProps {
  href: string;
  icon: React.ReactNode;
  iconBg: string;
  label: string;
  isNew?: boolean;
}

function QuickAction({ href, icon, iconBg, label, isNew = false }: QuickActionProps) {
  return (
    <a
      href={href}
      className="flex items-center justify-between rounded-xl border border-border/50 bg-muted/30 px-3 py-2.5 transition-colors hover:bg-muted/70 hover:border-border cursor-pointer"
    >
      <div className="flex items-center gap-2.5">
        <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${iconBg}`}>
          {icon}
        </div>
        <span className="text-sm font-medium text-foreground">{label}</span>
        {isNew && (
          <span className="rounded bg-primary/15 px-1 py-0.5 text-[9px] font-bold uppercase tracking-wide text-primary">
            NEW
          </span>
        )}
      </div>
      <ChevronRight className="h-4 w-4 text-muted-foreground" />
    </a>
  );
}
