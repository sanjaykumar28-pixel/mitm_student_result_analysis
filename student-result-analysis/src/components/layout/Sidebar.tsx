import { Link, useLocation } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { X, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface SidebarItem {
  label: string;
  to: string;
  icon: LucideIcon;
  badge?: string;
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
          className="fixed inset-0 z-30 bg-foreground/30 backdrop-blur-sm md:hidden animate-in fade-in"
          onClick={onClose}
        />
      )}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-all duration-300",
          "md:sticky md:top-0 md:h-screen md:translate-x-0 shadow-xl shadow-black/5",
          open ? "translate-x-0" : "-translate-x-full",
          collapsed ? "md:w-[76px]" : "md:w-[260px]",
          "w-[260px]",
        )}
      >
        <div className="flex h-[72px] items-center justify-between gap-3 border-b border-sidebar-border/50 px-5">
          <Link to="/" className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm p-1">
              <img
                src="/images/logo.jpeg"
                alt="College Logo"
                className="h-full w-full object-contain"
              />
            </div>
            {!collapsed && (
              <div className="min-w-0 flex flex-col justify-center">
                <p className="truncate text-[15px] font-bold text-white tracking-wide">
                  MIT MYSORE
                </p>
                <p className="truncate text-[10px] font-medium tracking-widest text-sidebar-foreground/70 uppercase">
                  Result Analytics
                </p>
              </div>
            )}
          </Link>
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground"
            onClick={onClose}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        <nav className="flex-1 overflow-y-auto p-4 scrollbar-none">
          <ul className="space-y-1.5">
            {items.map((item) => {
              const active = pathname === item.to || pathname.startsWith(item.to + "/");
              return (
                <li key={item.to}>
                  <Link
                    to={item.to}
                    onClick={onClose}
                    className={cn(
                      "group relative flex items-center gap-3.5 rounded-xl px-3 py-3 text-sm font-medium transition-all duration-200",
                      active
                        ? "bg-gradient-to-r from-sidebar-primary/20 to-transparent text-white"
                        : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-white",
                    )}
                  >
                    {active && (
                      <span className="absolute inset-y-0 left-0 w-1 rounded-r-full bg-sidebar-primary shadow-[0_0_8px_rgba(var(--color-sidebar-primary),0.6)]" />
                    )}
                    <item.icon
                      className={cn(
                        "h-[18px] w-[18px] shrink-0 transition-transform duration-200",
                        active
                          ? "text-sidebar-primary"
                          : "text-sidebar-foreground/50 group-hover:text-sidebar-foreground group-hover:scale-110",
                      )}
                    />
                    {!collapsed && (
                      <div className="flex flex-1 items-center justify-between">
                        <span className="truncate">{item.label}</span>
                        {item.badge && (
                          <span className="rounded-md bg-sidebar-primary px-1.5 py-0.5 text-[10px] font-bold tracking-wider text-white shadow-sm">
                            {item.badge}
                          </span>
                        )}
                      </div>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {!collapsed && (
          <div className="m-4 rounded-xl bg-sidebar-accent/40 p-4 border border-sidebar-border/50">
            <div className="flex flex-col gap-1.5 relative">
              <div className="h-6 w-6 rounded-md bg-sidebar-primary/20 flex items-center justify-center text-sidebar-primary mb-1">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5" />
                  <path d="M9 18h6" />
                  <path d="M10 22h4" />
                </svg>
              </div>
              <p className="text-sm font-semibold text-white">Building</p>
              <p className="text-sm font-semibold text-white">Better Futures</p>
              <p className="text-xs text-sidebar-foreground/60 font-medium">Through Education</p>
            </div>
          </div>
        )}
      </aside>
    </>
  );
}
