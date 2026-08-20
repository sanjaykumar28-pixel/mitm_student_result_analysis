import { createFileRoute, Outlet } from "@tanstack/react-router";
import { LayoutDashboard, ClipboardList, Calculator, LineChart } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import type { SidebarItem } from "@/components/layout/Sidebar";

const items: SidebarItem[] = [
  { label: "Dashboard", to: "/student/dashboard", icon: LayoutDashboard },
  { label: "Results", to: "/student/results", icon: ClipboardList },
  { label: "SGPA & CGPA", to: "/student/sgpa-cgpa", icon: Calculator },
  { label: "Analysis", to: "/student/analysis", icon: LineChart },
];

export const Route = createFileRoute("/student")({
  component: StudentLayout,
});

function StudentLayout() {
  return (
    <ProtectedRoute role="student">
      <DashboardLayout items={items}>
        <Outlet />
      </DashboardLayout>
    </ProtectedRoute>
  );
}
