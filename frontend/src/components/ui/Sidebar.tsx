"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: "📊" },
  { href: "/jobs", label: "Job Hunter", icon: "🔍" },
  { href: "/chat", label: "AI Assistant", icon: "💬" },
  { href: "/tracker", label: "Tracker", icon: "📋" },
  { href: "/calendar", label: "Calendar", icon: "📅" },
  { href: "/profile", label: "Profile", icon: "👤" },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-64 flex-col border-r"
      style={{ background: "var(--cp-surface)", borderColor: "var(--cp-border)" }}>
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 px-5 border-b" style={{ borderColor: "var(--cp-border)" }}>
        <div className="flex h-9 w-9 items-center justify-center rounded-lg"
          style={{ background: "var(--cp-gradient)" }}>
          <span className="text-lg">🚀</span>
        </div>
        <span className="text-lg font-bold cp-glow-text">CareerPilot</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-4">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href || pathname?.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`cp-sidebar-link ${isActive ? "active" : ""}`}
            >
              <span className="text-lg">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Bottom section */}
      <div className="border-t px-3 py-4" style={{ borderColor: "var(--cp-border)" }}>
        <Link href="/settings" className="cp-sidebar-link">
          <span className="text-lg">⚙️</span>
          Settings
        </Link>
      </div>
    </aside>
  );
}
