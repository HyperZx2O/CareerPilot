"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useUser, useClerk } from "@clerk/nextjs";
import { motion } from "framer-motion";
import {
  LayoutDashboard,
  Search,
  MessageSquare,
  CheckSquare,
  Calendar,
  User,
  Settings,
  ChevronRight,
  Target,
  LogOut,
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/jobs", label: "Job Hunter", icon: Search },
  { href: "/chat", label: "AI Assistant", icon: MessageSquare },
  { href: "/tracker", label: "Tracker", icon: CheckSquare },
  { href: "/calendar", label: "Calendar", icon: Calendar },
  { href: "/profile", label: "Profile", icon: User },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { isSignedIn, user } = useUser();
  const { signOut } = useClerk();

  return (
    <motion.aside
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="fixed left-0 top-0 z-40 flex h-screen w-64 flex-col border-r backdrop-blur-sm"
      style={{
        background: "color-mix(in srgb, var(--color-paper) 92%, transparent)",
        borderColor: "var(--color-border)",
      }}
    >
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 border-b px-5" style={{ borderColor: "var(--color-border)" }}>
        <div
          className="flex h-9 w-9 items-center justify-center rounded-lg"
          style={{ background: "var(--color-accent)" }}
        >
          <Target className="h-5 w-5 text-white" strokeWidth={2.5} />
        </div>
        <span className="text-lg font-bold tracking-tight" style={{ color: "var(--color-text)" }}>
          CareerPilot
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-4">
        {NAV_ITEMS.map((item, index) => {
          const isActive = pathname === item.href || pathname?.startsWith(item.href + "/");
          const Icon = item.icon;

          return (
            <motion.div
              key={item.href}
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.08 + index * 0.04, duration: 0.3, ease: "easeOut" }}
            >
              <Link href={item.href} className="block">
                <div
                  className="relative flex items-center gap-3 rounded-lg px-3 py-2.5 transition-all"
                  style={{
                    background: isActive ? "var(--color-accent-subtle)" : "transparent",
                    color: isActive ? "var(--color-accent)" : "var(--color-text-muted)",
                  }}
                >
                  {isActive && (
                    <motion.div
                      layoutId="sidebar-active"
                      className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-1 rounded-r-full"
                      style={{ background: "var(--color-accent)" }}
                    />
                  )}

                  <Icon className="h-5 w-5" strokeWidth={isActive ? 2.5 : 2} />
                  <span className="relative z-10 text-sm font-medium">{item.label}</span>

                  {isActive && (
                    <ChevronRight className="ml-auto h-4 w-4" />
                  )}
                </div>
              </Link>
            </motion.div>
          );
        })}
      </nav>

      {/* Bottom section */}
      <div className="border-t px-3 py-4" style={{ borderColor: "var(--color-border)" }}>
        <Link href="/settings" className="block">
          <div className="flex items-center gap-3 rounded-lg px-3 py-2.5 transition-all" style={{ color: "var(--color-text-muted)" }}>
            <Settings className="h-5 w-5" />
            <span className="text-sm font-medium">Settings</span>
          </div>
        </Link>

        <div className="mt-4 flex items-center gap-3 rounded-lg px-3 py-2.5" style={{ background: "var(--color-paper-2)" }}>
          <div className="flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold text-white" style={{ background: "var(--color-accent)" }}>
            {isSignedIn ? (user?.firstName?.[0] || "U") : "D"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate" style={{ color: "var(--color-text)" }}>
              {isSignedIn ? (user?.fullName || "User") : "Dev Mode"}
            </p>
            <p className="text-xs truncate" style={{ color: "var(--color-text-dim)" }}>
              {isSignedIn ? (user?.primaryEmailAddress?.emailAddress || "") : "demo_user_123"}
            </p>
          </div>
        </div>

        <button
          onClick={() => signOut()}
          className="mt-2 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 transition-all hover:opacity-100"
          style={{ color: "var(--color-text-muted)", opacity: 0.7 }}
          onMouseEnter={(e) => e.currentTarget.style.color = "var(--color-error)"}
          onMouseLeave={(e) => e.currentTarget.style.color = "var(--color-text-muted)"}
        >
          <LogOut className="h-5 w-5" strokeWidth={2} />
          <span className="text-sm font-medium">Sign Out</span>
        </button>
      </div>
    </motion.aside>
  );
}
