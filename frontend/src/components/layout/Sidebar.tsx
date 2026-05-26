"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Briefcase,
  MessageSquare,
  KanbanSquare,
  CalendarDays,
  User,
  Settings,
  ChevronLeft,
  Rocket,
  UploadCloud,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/useAppStore";

// ─── Nav Items ────────────────────────────────────────────────────────────────

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard",   icon: LayoutDashboard },
  { href: "/jobs",      label: "Job Hunter",  icon: Briefcase        },
  { href: "/chat",      label: "AI Assistant",icon: MessageSquare    },
  { href: "/tracker",   label: "Tracker",     icon: KanbanSquare     },
  { href: "/calendar",  label: "Calendar",    icon: CalendarDays     },
] as const;

const BOTTOM_ITEMS = [
  { href: "/profile",  label: "Profile",  icon: User     },
  { href: "/settings", label: "Settings", icon: Settings },
] as const;

// ─── Component ────────────────────────────────────────────────────────────────

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { sidebarCollapsed, toggleSidebar, setCvId } = useAppStore();

  function handleReupload() {
    setCvId(null);
    router.push("/onboarding");
  }

  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-40 flex flex-col border-r border-border bg-surface transition-all duration-300 ease-in-out md:static md:translate-x-0",
        sidebarCollapsed 
          ? "-translate-x-full md:w-[60px] md:translate-x-0" 
          : "translate-x-0 w-[240px]"
      )}
    >
      {/* ── Logo ── */}
      <div className="flex h-14 items-center gap-3 border-b border-border px-4">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-600">
          <Rocket className="h-4 w-4 text-white" />
        </div>
        {!sidebarCollapsed && (
          <span className="text-sm font-bold tracking-tight text-foreground">
            CareerPilot
          </span>
        )}
      </div>

      {/* ── Main Nav ── */}
      <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto p-2" aria-label="Main navigation">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              prefetch
              className={cn(
                "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150",
                active
                  ? "bg-brand-600 text-white shadow-sm"
                  : "text-muted hover:bg-border hover:text-foreground"
              )}
              aria-current={active ? "page" : undefined}
              title={sidebarCollapsed ? label : undefined}
            >
              <Icon
                className={cn(
                  "h-4 w-4 shrink-0 transition-colors",
                  active ? "text-white" : "text-muted group-hover:text-foreground"
                )}
                aria-hidden="true"
              />
              {!sidebarCollapsed && <span>{label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* ── Re-upload CV ── */}
      {!sidebarCollapsed && (
        <div className="px-2 pb-1">
          <button
            onClick={handleReupload}
            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium text-muted transition-colors hover:bg-border hover:text-foreground"
            title="Re-upload CV"
          >
            <UploadCloud className="h-4 w-4 shrink-0" aria-hidden="true" />
            Re-upload CV
          </button>
        </div>
      )}

      {/* ── Bottom Nav ── */}
      <div className="flex flex-col gap-0.5 border-t border-border p-2">
        {BOTTOM_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              prefetch
              className={cn(
                "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150",
                active
                  ? "bg-brand-600 text-white"
                  : "text-muted hover:bg-border hover:text-foreground"
              )}
              aria-current={active ? "page" : undefined}
              title={sidebarCollapsed ? label : undefined}
            >
              <Icon
                className={cn(
                  "h-4 w-4 shrink-0",
                  active ? "text-white" : "text-muted group-hover:text-foreground"
                )}
                aria-hidden="true"
              />
              {!sidebarCollapsed && <span>{label}</span>}
            </Link>
          );
        })}
      </div>

      {/* ── Collapse Toggle (Only on desktops) ── */}
      <button
        onClick={toggleSidebar}
        className="absolute -right-3 top-[70px] hidden md:flex h-6 w-6 items-center justify-center rounded-full border border-border bg-surface text-muted shadow-sm transition-colors hover:bg-brand-50 hover:text-brand-600"
        aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        <ChevronLeft
          className={cn(
            "h-3.5 w-3.5 transition-transform duration-300",
            sidebarCollapsed && "rotate-180"
          )}
          aria-hidden="true"
        />
      </button>
    </aside>
  );
}


