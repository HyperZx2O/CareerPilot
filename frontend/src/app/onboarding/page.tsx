"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Rocket } from "lucide-react";
import { CVUpload } from "@/components/cv/CVUpload";
import { useAppStore } from "@/store/useAppStore";

/**
 * Onboarding page — the first screen new users see after landing.
 * - If cv_id already exists in the Zustand store (persisted in localStorage),
 *   the user is redirected straight to /dashboard.
 * - Otherwise the CV upload flow is shown.
 */
export default function OnboardingPage() {
  const router = useRouter();
  const cvId = useAppStore((s) => s.cvId);

  // Skip onboarding if cv already uploaded
  useEffect(() => {
    if (cvId) {
      router.replace("/dashboard");
    }
  }, [cvId, router]);

  // While checking hydration, render nothing to prevent flash
  if (cvId) return null;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-16">
      {/* ── Brand mark ── */}
      <div className="mb-8 flex flex-col items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-600 shadow-lg shadow-brand-500/30">
          <Rocket className="h-6 w-6 text-white" aria-hidden="true" />
        </div>
        <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
          Welcome to CareerPilot
        </h1>
        <p className="max-w-sm text-center text-sm text-muted">
          Upload your CV to get AI-powered job matches, skill gap analysis, and
          personalised career guidance — all grounded in{" "}
          <span className="font-semibold text-foreground">your actual experience</span>.
        </p>
      </div>

      {/* ── Upload card ── */}
      <div className="w-full max-w-[560px] rounded-2xl border border-border bg-surface p-8 shadow-xl shadow-black/5">
        {/* Step indicator */}
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-600 text-xs font-bold text-white">
            1
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Upload your CV</p>
            <p className="text-xs text-muted">PDF or DOCX · Max 10 MB</p>
          </div>

          {/* Connector */}
          <div className="mx-2 flex-1 border-t border-dashed border-border" />

          <div className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-border bg-background text-xs font-bold text-muted">
            2
          </div>
          <p className="text-xs text-muted">View profile</p>
        </div>

        <CVUpload />
      </div>

      {/* ── Footer note ── */}
      <p className="mt-6 text-center text-xs text-muted">
        Your CV is processed securely and never shared.
        <br />
        Already have an account?{" "}
        <button
          onClick={() => router.push("/dashboard")}
          className="font-medium text-brand-600 underline underline-offset-2 hover:text-brand-700"
        >
          Go to dashboard
        </button>
      </p>
    </div>
  );
}
