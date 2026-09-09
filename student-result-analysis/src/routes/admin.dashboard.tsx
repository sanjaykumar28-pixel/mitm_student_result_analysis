import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Users, BookOpen, TrendingUp, Award, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatsCard } from "@/components/cards/StatsCard";
import { PageHeader } from "@/components/layout/PageHeader";
import { BarChartComponent } from "@/components/charts/BarChartComponent";
import { LineChartComponent } from "@/components/charts/LineChartComponent";
import { PieChartComponent } from "@/components/charts/PieChartComponent";
import { TopperTable } from "@/components/tables/TopperTable";
import { adminService, type AdminResultRow } from "@/services/adminService";

export const Route = createFileRoute("/admin/dashboard")({
  component: AdminDashboard,
});

function AdminDashboard() {
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalSubjects: 0,
    passPercentage: 0,
    averageCGPA: 0,
    topPerformer: "No data",
    topPerformerCgpa: 0,
  });

  const [charts, setCharts] = useState({
    genderPerformance: [] as Array<{ gender: string; avgCgpa: number }>,
    semesterPass: [] as Array<{ semester: string; pass: number }>,
    gradeDistribution: [] as Array<{ name: string; value: number }>,
    performanceTrend: [] as Array<{ semester: string; cgpa: number }>,
    toppers: [] as Array<any>,
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function loadStats() {
      try {
        const [students, subjects, resultsData] = await Promise.all([
          adminService.getStudents().catch(() => []),
          adminService.getSubjects().catch(() => []),
          adminService.getResults().catch(() => ({ total: 0, results: [], department: null, semester: null, departments: [] })),
        ]);

        if (!mounted) return;

        const totalStudents = students.length;
        const totalSubjects = subjects.length;

        const results = resultsData.results || [];
        
        // Ensure one result per student (use the highest semester or highest CGPA)
        const uniqueResults = new Map<string, AdminResultRow>();
        for (const res of results) {
          const existing = uniqueResults.get(res.usn);
          if (!existing) {
            uniqueResults.set(res.usn, res);
          } else {
            if (res.semester > existing.semester) {
              uniqueResults.set(res.usn, res);
            } else if (res.semester === existing.semester && (res.cgpa || 0) > (existing.cgpa || 0)) {
              uniqueResults.set(res.usn, res);
            }
          }
        }

        const evaluatedStudents = Array.from(uniqueResults.values());
        
        let passedCount = 0;
        let validCgpaSum = 0;
        let validCgpaCount = 0;
        let topPerformer = "No data";
        let topCgpa = -1;

        for (const res of evaluatedStudents) {
          const grade = res.grade?.toUpperCase() || "";
          if (grade !== "F" && grade !== "FAIL" && grade !== "ABSENT") {
            passedCount++;
          }

          if (res.cgpa !== null && res.cgpa !== undefined && res.cgpa > 0) {
            validCgpaSum += res.cgpa;
            validCgpaCount++;
            if (res.cgpa > topCgpa) {
              topCgpa = res.cgpa;
              topPerformer = res.student_name;
            }
          }
        }

        const passPercentage = evaluatedStudents.length > 0 
          ? (passedCount / evaluatedStudents.length) * 100 
          : 0;
          
        const averageCGPA = validCgpaCount > 0 
          ? validCgpaSum / validCgpaCount 
          : 0;

        setStats({
          totalStudents,
          totalSubjects,
          passPercentage,
          averageCGPA,
          topPerformer,
          topPerformerCgpa: topCgpa > 0 ? topCgpa : 0,
        });

        // Calculate chart data
        // 1. Gender Performance
        const studentGenderMap = new Map();
        students.forEach(s => studentGenderMap.set(s.usn, s.gender));

        const maleCgpas: number[] = [];
        const femaleCgpas: number[] = [];

        evaluatedStudents.forEach(res => {
           const gender = studentGenderMap.get(res.usn);
           if (res.cgpa && res.cgpa > 0) {
               if (gender === 'Male') maleCgpas.push(res.cgpa);
               else if (gender === 'Female') femaleCgpas.push(res.cgpa);
           }
        });
        
        const genderPerformance = [
          { gender: "Male", avgCgpa: maleCgpas.length ? (maleCgpas.reduce((a,b)=>a+b,0)/maleCgpas.length) : 0 },
          { gender: "Female", avgCgpa: femaleCgpas.length ? (femaleCgpas.reduce((a,b)=>a+b,0)/femaleCgpas.length) : 0 },
        ];

        // 2. Semester Pass Percentage
        const semesterStats = new Map();
        results.forEach(res => {
            if (!semesterStats.has(res.semester)) {
                semesterStats.set(res.semester, { total: 0, passed: 0 });
            }
            const stat = semesterStats.get(res.semester);
            stat.total++;
            const grade = res.grade?.toUpperCase() || "";
            if (grade !== "F" && grade !== "FAIL" && grade !== "ABSENT") {
                stat.passed++;
            }
        });
        const semesterPass = Array.from(semesterStats.entries())
          .sort((a,b) => a[0] - b[0])
          .map(([sem, stat]) => ({
            semester: `Sem ${sem}`,
            pass: stat.total > 0 ? (stat.passed / stat.total) * 100 : 0
          }));

        // 3. Grade Distribution
        const gradeCounts: Record<string, number> = {};
        results.forEach(res => {
            const grade = res.grade || "N/A";
            gradeCounts[grade] = (gradeCounts[grade] || 0) + 1;
        });
        const gradeDistribution = Object.entries(gradeCounts).map(([grade, count]) => ({
            name: grade, value: count
        }));

        // 4. Performance Trend (Average CGPA per semester)
        const semCgpaStats = new Map();
        results.forEach(res => {
            if (res.cgpa && res.cgpa > 0) {
                if (!semCgpaStats.has(res.semester)) {
                    semCgpaStats.set(res.semester, { sum: 0, count: 0 });
                }
                const stat = semCgpaStats.get(res.semester);
                stat.sum += res.cgpa;
                stat.count++;
            }
        });
        const performanceTrend = Array.from(semCgpaStats.entries())
          .sort((a,b) => a[0] - b[0])
          .map(([sem, stat]) => ({
            semester: `Sem ${sem}`,
            cgpa: stat.count > 0 ? stat.sum / stat.count : 0
          }));

        // 5. Toppers
        const top5 = evaluatedStudents
          .filter(res => res.cgpa && res.cgpa > 0)
          .sort((a, b) => (b.cgpa || 0) - (a.cgpa || 0))
          .slice(0, 5)
          .map(res => ({
              id: res.usn,
              name: res.student_name,
              email: "",
              department: res.department,
              semester: res.semester,
              cgpa: res.cgpa
          }));

        setCharts({
          genderPerformance,
          semesterPass,
          gradeDistribution,
          performanceTrend,
          toppers: top5
        });

      } catch (err) {
        console.error("Failed to load dashboard stats", err);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadStats();
    return () => { mounted = false; };
  }, []);

  return (
    <>
      <PageHeader
        title="Admin Dashboard"
        subtitle="Overview of institution-wide academic performance."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatsCard 
          title="Total Students" 
          value={loading ? "..." : stats.totalStudents.toLocaleString()} 
          icon={Users} 
          accent="primary" 
        />
        <StatsCard 
          title="Total Subjects" 
          value={loading ? "..." : stats.totalSubjects.toLocaleString()} 
          icon={BookOpen} 
          accent="primary" 
        />
        <StatsCard 
          title="Pass Percentage" 
          value={loading ? "..." : `${stats.passPercentage.toFixed(2)}%`} 
          icon={TrendingUp} 
          accent="success" 
        />
        <StatsCard 
          title="Average CGPA" 
          value={loading ? "..." : stats.averageCGPA.toFixed(2)} 
          icon={Award} 
          accent="warning" 
        />
        <StatsCard 
          title="Top Performer" 
          value={loading ? "..." : stats.topPerformer} 
          icon={Sparkles} 
          accent="primary" 
          trend={stats.topPerformer !== "No data" && !loading ? `CGPA: ${stats.topPerformerCgpa.toFixed(2)}` : undefined}
          trendUp={true}
        />
      </div>

      {!loading && (
        <>
          <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Performance by Gender</CardTitle>
              </CardHeader>
              <CardContent>
                {charts.genderPerformance.length > 0 ? (
                  <BarChartComponent
                    data={charts.genderPerformance}
                    xKey="gender"
                    bars={[
                      { key: "avgCgpa", name: "Average CGPA" },
                    ]}
                  />
                ) : (
                  <p className="text-sm text-muted-foreground p-4 text-center">No analysis data available</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Semester-wise Pass Percentage</CardTitle>
              </CardHeader>
              <CardContent>
                {charts.semesterPass.length > 0 ? (
                  <LineChartComponent
                    data={charts.semesterPass}
                    xKey="semester"
                    lines={[{ key: "pass", name: "Pass %" }]}
                  />
                ) : (
                  <p className="text-sm text-muted-foreground p-4 text-center">No analysis data available</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Grade Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                {charts.gradeDistribution.length > 0 ? (
                  <PieChartComponent
                    data={charts.gradeDistribution}
                  />
                ) : (
                  <p className="text-sm text-muted-foreground p-4 text-center">No analysis data available</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Average CGPA Trend</CardTitle>
              </CardHeader>
              <CardContent>
                {charts.performanceTrend.length > 0 ? (
                  <LineChartComponent
                    data={charts.performanceTrend}
                    xKey="semester"
                    lines={[{ key: "cgpa", name: "Avg CGPA" }]}
                  />
                ) : (
                  <p className="text-sm text-muted-foreground p-4 text-center">No analysis data available</p>
                )}
              </CardContent>
            </Card>
          </div>

          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-base">Top Performers</CardTitle>
            </CardHeader>
            <CardContent>
              {charts.toppers.length > 0 ? (
                <TopperTable toppers={charts.toppers} />
              ) : (
                <p className="text-sm text-muted-foreground text-center p-4">No results available</p>
              )}
            </CardContent>
          </Card>
        </>
      )}
      
      {loading && (
        <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
             <Card key={i}>
                <CardContent className="h-64 flex items-center justify-center text-muted-foreground">
                   Loading chart...
                </CardContent>
             </Card>
          ))}
        </div>
      )}
    </>
  );
}
