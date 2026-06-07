"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
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
import { useUser, useClerk } from "@clerk/nextjs";

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

  return (
    <motion.aside
      initial={{ x: -100, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="fixed left-0 top-0 z-40 flex h-screen w-64 flex-col border-r backdrop-blur-sm"
      style={{
        background: "rgba(17, 24, 39, 0.8)",
        borderColor: "var(--cp-border)",
        backdropFilter: "blur(10px)",
      }}
    >
      {/* Logo */}
      <motion.div
        className="flex h-16 items-center gap-3 border-b px-5"
        style={{ borderColor: "var(--cp-border)" }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        <motion.div
          className="flex h-9 w-9 items-center justify-center rounded-lg relative"
          style={{ background: "var(--cp-gradient)" }}
          whileHover={{ scale: 1.1, rotate: -5 }}
          transition={{ type: "spring", stiffness: 300 }}
        >
          <Target className="h-5 w-5 text-white" strokeWidth={2.5} />
          {/* Glow effect */}
          <motion.div
            className="absolute inset-0 rounded-lg"
            style={{ background: "var(--cp-gradient)" }}
            animate={{
              boxShadow: [
                "0 0 15px rgba(99, 102, 241, 0.4)",
                "0 0 30px rgba(99, 102, 241, 0.6)",
                "0 0 15px rgba(99, 102, 241, 0.4)",
              ],
            }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        </motion.div>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="flex items-center gap-1.5"
        >
          <span
            className="text-lg font-bold tracking-tight bg-clip-text"
            style={{
              background: "var(--cp-gradient)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              color: "transparent",
            }}
          >
            CareerPilot
          </span>
        </motion.div>
      </motion.div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-4">
        {NAV_ITEMS.map((item, index) => {
          const isActive =
            pathname === item.href || pathname?.startsWith(item.href + "/");
          const Icon = item.icon;

          return (
            <motion.div
              key={item.href}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 + index * 0.05 }}
            >
              <Link href={item.href} className="block">
                <motion.div
                  className={`cp-sidebar-link relative ${
                    isActive ? "active" : ""
                  }`}
                  whileHover={{ x: 4 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {/* Active indicator */}
                  <AnimatePresence>
                    {isActive && (
                      <motion.div
                        initial={{ scaleX: 0 }}
                        animate={{ scaleX: 1 }}
                        exit={{ scaleX: 0 }}
                        className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-1 rounded-r-full"
                        style={{ background: "var(--cp-gradient)" }}
                      />
                    )}
                  </AnimatePresence>

                  {/* Icon */}
                  <motion.div
                    className="relative z-10 flex items-center gap-3"
                    whileHover={{ scale: 1.05 }}
                  >
                    <Icon
                      className={`h-5 w-5 transition-colors ${
                        isActive
                          ? "text-indigo-400"
                          : "text-slate-400 group-hover:text-slate-200"
                      }`}
                      strokeWidth={isActive ? 2.5 : 2}
                    />
                    <span className="relative z-10">{item.label}</span>

                    {/* Chevron for active state */}
                    <AnimatePresence>
                      {isActive && (
                        <motion.div
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -10 }}
                          className="ml-auto"
                        >
                          <ChevronRight className="h-4 w-4 text-indigo-400" />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>

                  {/* Hover glow effect */}
                  {!isActive && (
                    <motion.div
                      className="absolute inset-0 rounded-lg opacity-0 transition-opacity"
                      style={{
                        background:
                          "linear-gradient(90deg, var(--cp-primary-glow), transparent)",
                      }}
                      whileHover={{ opacity: 1 }}
                    />
                  )}
                </motion.div>
              </Link>
            </motion.div>
          );
        })}
      </nav>

      {/* Bottom section */}
      <motion.div
        className="border-t px-3 py-4"
        style={{ borderColor: "var(--cp-border)" }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
      >
        <Link href="/settings" className="block">
          <motion.div
            className="cp-sidebar-link"
            whileHover={{ x: 4 }}
            whileTap={{ scale: 0.98 }}
          >
            <Settings className="h-5 w-5" />
            <span>Settings</span>
          </motion.div>
        </Link>

        {/* User avatar section */}
        <SidebarUser />
      </motion.div>
    </motion.aside>
  );
}

function SidebarUser() {
  const { user, isSignedIn } = useUser();
  const { signOut } = useClerk();

  if (!isSignedIn || !user) {
    return (
      <motion.div
        className="mt-4 flex items-center gap-3 rounded-lg px-3 py-2.5"
        style={{ background: "var(--cp-surface-2)" }}
      >
        <div className="flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold"
          style={{ background: "var(--cp-gradient)", color: "white" }}
        >
          U
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">Dev Mode</p>
          <p className="text-xs truncate" style={{ color: "var(--cp-text-dim)" }}>Demo User</p>
        </div>
      </motion.div>
    );
  }

  const initial = (user.firstName?.[0] || user.emailAddresses?.[0]?.emailAddress?.[0] || "U").toUpperCase();

  return (
    <motion.div
      className="mt-4 flex items-center gap-3 rounded-lg px-3 py-2.5"
      style={{ background: "var(--cp-surface-2)" }}
    >
      <motion.div
        className="flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold"
        style={{ background: "var(--cp-gradient)", color: "white" }}
        whileHover={{ scale: 1.1 }}
      >
        {initial}
      </motion.div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{user.firstName || "User"}</p>
        <p className="text-xs truncate" style={{ color: "var(--cp-text-dim)" }}>
          {user.primaryEmailAddress?.emailAddress || ""}
        </p>
      </div>
      <motion.button
        onClick={() => signOut()}
        className="flex h-7 w-7 items-center justify-center rounded-lg transition-colors hover:bg-red-500/10"
        style={{ color: "var(--cp-text-dim)" }}
        whileHover={{ scale: 1.1, color: "var(--cp-danger)" }}
        whileTap={{ scale: 0.9 }}
        title="Sign out"
      >
        <LogOut className="h-4 w-4" />
      </motion.button>
    </motion.div>
  );
}
