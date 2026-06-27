"use client";

import { type ReactNode } from "react";
import { ClerkProvider } from "@clerk/nextjs";
import ClerkAuthSync from "@/components/providers/ClerkAuthSync";

/* ponytail: dark mode applied via ClerkProvider CSS variables — no @clerk/themes dep needed */

const clerkAppearance = {
  variables: {
    colorPrimary: "#6366f1",
    colorText: "#e2e8f0",
    colorTextSecondary: "#94a3b8",
    colorInputText: "#e2e8f0",
    colorInputBackground: "#1e293b",
    colorBackground: "#0f172a",
    colorNeutral: "#334155",
    colorDanger: "#ef4444",
    colorSuccess: "#22c55e",
    colorWarning: "#f59e0b",
    fontFamily: "var(--font-body), Inter, sans-serif",
    fontFamilyButtons: "var(--font-display), Space Grotesk, sans-serif",
    fontSize: "0.875rem",
    borderRadius: "0.5rem",
  },
  elements: {
    card: "border border-slate-800 shadow-xl",
    headerTitle: "font-display text-lg font-semibold",
    headerSubtitle: "text-slate-400",
    socialButtonsBlockButton:
      "border border-slate-700 hover:border-slate-500 transition-colors",
    formButtonPrimary:
      "font-display font-medium tracking-wide",
    footerActionLink:
      "text-indigo-400 hover:text-indigo-300 transition-colors",
    formFieldInput:
      "bg-slate-800/50 border-slate-700 focus:border-indigo-500 transition-colors",
    dividerLine: "bg-slate-700",
    dividerText: "text-slate-500",
  },
};

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <ClerkProvider
      appearance={clerkAppearance}
      afterSignUpUrl="/dashboard"
      afterSignInUrl="/dashboard"
    >
      <ClerkAuthSync />
      {children}
    </ClerkProvider>
  );
}
