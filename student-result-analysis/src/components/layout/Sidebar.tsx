import { Link, useLocation } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { GraduationCap, X, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface SidebarItem {
  label: string;
  to: string;
  icon: LucideIcon;
}

interface Props {
  items: SidebarItem[];
  collapsed: boolean;
  open: boolean;
  onClose: () => void;
}

export function Sidebar({ items, collapsed, open, onClose }: Props) {
  const { pathname } = useLocation();

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-30 bg-foreground/30 backdrop-blur-sm md:hidden"
          onClick={onClose}
        />
      )}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex flex-col border-r bg-sidebar text-sidebar-foreground transition-all duration-300",
          "md:sticky md:top-0 md:h-screen md:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
          collapsed ? "md:w-[76px]" : "md:w-64",
          "w-64",
        )}
      >
        <div className="flex h-16 items-center justify-between gap-2 border-b px-4">
          <Link to="/" className="flex min-w-0 items-center gap-2">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary-glow text-primary-foreground shadow-sm">
              <GraduationCap className="h-5 w-5" />
            </div>
            {!collapsed && (
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">EduMetric</p>
                <p className="truncate text-[10px] uppercase tracking-wide text-muted-foreground">
                  Result Analytics
                </p>
              </div>
            )}
          </Link>
          <Button variant="ghost" size="icon" className="md:hidden" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        <nav className="flex-1 overflow-y-auto p-3">
          <ul className="space-y-1">
            {items.map((item) => {
              const active = pathname === item.to || pathname.startsWith(item.to + "/");
              return (
                <li key={item.to}>
                  <Link
                    to={item.to}
                    onClick={onClose}
                    className={cn(
                      "group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                      active
                        ? "bg-sidebar-accent text-sidebar-accent-foreground"
                        : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
                    )}
                  >
                    {active && (
                      <span className="absolute inset-y-1 left-0 w-1 rounded-r bg-sidebar-primary" />
                    )}
                    <item.icon className="h-[18px] w-[18px] shrink-0" />
                    {!collapsed && <span className="truncate">{item.label}</span>}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {!collapsed && (
          <div className="m-3 rounded-xl bg-gradient-to-br from-primary/10 to-primary-glow/10 p-4 text-xs">
            <p className="font-semibold text-foreground">Need help?</p>
            <p className="mt-1 text-muted-foreground">Visit the docs or contact the academic office.</p>
          </div>
        )}
      </aside>
    </>
  );
}
