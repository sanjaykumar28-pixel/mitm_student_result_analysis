import { createFileRoute } from "@tanstack/react-router";
import { Users, BookOpen, TrendingUp, Award, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatsCard } from "@/components/cards/StatsCard";
import { PageHeader } from "@/components/layout/PageHeader";
import { BarChartComponent } from "@/components/charts/BarChartComponent";
import { LineChartComponent } from "@/components/charts/LineChartComponent";
import { PieChartComponent } from "@/components/charts/PieChartComponent";
import { TopperTable } from "@/components/tables/TopperTable";
import {
  adminStats,
  departmentPerformance,
  semesterPass,
  gradeDistribution,
  performanceTrend,
  mockStudents,
} from "@/data/mockData";

export const Route = createFileRoute("/admin/dashboard")({
  component: AdminDashboard,
});

function AdminDashboard() {
  const toppers = [...mockStudents].sort((a, b) => b.cgpa - a.cgpa).slice(0, 5);

  return (
    <>
      <PageHeader
        title="Admin Dashboard"
        subtitle="Overview of institution-wide academic performance."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatsCard title="Total Students" value={adminStats.totalStudents.toLocaleString()} icon={Users} trend="+4.2% this term" trendUp />
        <StatsCard title="Total Subjects" value={adminStats.totalSubjects} icon={BookOpen} accent="primary" />
        <StatsCard title="Pass Percentage" value={`${adminStats.passPercentage}%`} icon={TrendingUp} trend="+1.8%" trendUp accent="success" />
        <StatsCard title="Average CGPA" value={adminStats.averageCGPA.toFixed(2)} icon={Award} accent="warning" />
        <StatsCard title="Top Performer" value={adminStats.topPerformer} icon={Sparkles} accent="primary" />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Department-wise Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <BarChartComponent
              data={departmentPerformance}
              xKey="department"
              bars={[
                { key: "avgCgpa", name: "Avg CGPA" },
                { key: "pass", name: "Pass %" },
              ]}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Semester-wise Pass Percentage</CardTitle>
          </CardHeader>
          <CardContent>
            <LineChartComponent
              data={semesterPass}
              xKey="semester"
              lines={[{ key: "pass", name: "Pass %" }]}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Grade Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <PieChartComponent
              data={gradeDistribution.map((g) => ({ name: g.grade, value: g.count }))}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Average CGPA Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <LineChartComponent
              data={performanceTrend}
              xKey="month"
              lines={[{ key: "cgpa", name: "Avg CGPA" }]}
            />
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">Top Performers</CardTitle>
        </CardHeader>
        <CardContent>
          <TopperTable toppers={toppers} />
        </CardContent>
      </Card>
    </>
  );
}
