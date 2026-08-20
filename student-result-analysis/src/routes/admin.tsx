import { createFileRoute, Outlet } from "@tanstack/react-router";
import { LayoutDashboard, UserPlus, FileSpreadsheet, ClipboardList, Trophy } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import type { SidebarItem } from "@/components/layout/Sidebar";

const items: SidebarItem[] = [
  { label: "Dashboard", to: "/admin/dashboard", icon: LayoutDashboard },
  { label: "Add Student", to: "/admin/add-student", icon: UserPlus },
  { label: "Upload Excel", to: "/admin/upload-excel", icon: FileSpreadsheet },
  { label: "View Results", to: "/admin/view-results", icon: ClipboardList },
  { label: "Toppers", to: "/admin/toppers", icon: Trophy },
];

export const Route = createFileRoute("/admin")({
  component: AdminLayout,
});

function AdminLayout() {
  return (
    <ProtectedRoute role="admin">
      <DashboardLayout items={items}>
        <Outlet />
      </DashboardLayout>
    </ProtectedRoute>
  );
}
