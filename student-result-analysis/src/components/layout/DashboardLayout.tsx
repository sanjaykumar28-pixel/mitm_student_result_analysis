import { useState, type ReactNode } from "react";
import { Sidebar, type SidebarItem } from "./Sidebar";
import { Navbar } from "./Navbar";

interface Props {
  items: SidebarItem[];
  children: ReactNode;
}

export function DashboardLayout({ items, children }: Props) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar
        items={items}
        collapsed={collapsed}
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <Navbar
          onMenuClick={() => setMobileOpen(true)}
          onToggleCollapse={() => setCollapsed((c) => !c)}
          collapsed={collapsed}
        />
        <main className="flex-1 p-4 md:p-6 lg:p-8 animate-in fade-in duration-300">
          {children}
        </main>
      </div>
    </div>
  );
}
