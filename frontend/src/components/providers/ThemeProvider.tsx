"use client";

import { useEffect } from "react";
import { useAppStore } from "@/store/useAppStore";

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useAppStore((s) => s.settings.theme);

  useEffect(() => {
    const root = document.documentElement;
    
    if (theme === "auto") {
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      root.setAttribute("data-theme", prefersDark ? "dark" : "light");
      
      // Listen for system theme changes
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
      const handler = (e: MediaQueryListEvent) => {
        root.setAttribute("data-theme", e.matches ? "dark" : "light");
      };
      mediaQuery.addEventListener("change", handler);
      return () => mediaQuery.removeEventListener("change", handler);
    } else {
      root.setAttribute("data-theme", theme === "light" ? "light" : "dark");
    }
  }, [theme]);

  return <>{children}</>;
}

// ── Notification Service ──────────────────────────────────────────────────────

export async function requestNotificationPermission(): Promise<boolean> {
  if (!("Notification" in window)) return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  
  const perm = await Notification.requestPermission();
  return perm === "granted";
}

export function getNotificationPermission(): NotificationPermission | null {
  if (!("Notification" in window)) return null;
  return Notification.permission;
}

export async function sendNotification(title: string, options?: NotificationOptions) {
  if (Notification.permission !== "granted") return;
  
  if (navigator.serviceWorker) {
    try {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration) {
        registration.showNotification(title, {
          icon: "/favicon.ico",
          badge: "/favicon.ico",
          ...options,
        });
      }
    } catch {
      // Fallback to regular notification
      new Notification(title, options);
    }
  } else {
    new Notification(title, options);
  }
}