"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Rocket,
  Briefcase,
  MessageSquare,
  KanbanSquare,
  BarChart3,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";
import { useAppStore } from "@/store/useAppStore";

// ─── Feature cards ────────────────────────────────────────────────────────────

const FEATURES = [
  {
    icon: Briefcase,
    title: "AI Job Hunter",
    description:
      "Submit a natural-language query. Get live job results with a programmatic fit score calculated from your own CV.",
    color: "text-blue-500",
    bg: "bg-blue-50 dark:bg-blue-900/20",
  },
  {
    icon: MessageSquare,
    title: "Personal AI Assistant",
    description:
      "Ask anything — readiness analysis, skill gaps, cover letters, week-by-week roadmaps — all grounded in your uploaded CV.",
    color: "text-indigo-500",
    bg: "bg-indigo-50 dark:bg-indigo-900/20",
  },
  {
    icon: KanbanSquare,
    title: "Application Tracker",
    description:
      "Drag-and-drop Kanban board across Applied → Interviewing → Offer → Rejected. Every status synced to the cloud.",
    color: "text-amber-500",
    bg: "bg-amber-50 dark:bg-amber-900/20",
  },
  {
    icon: BarChart3,
    title: "Progress Dashboard",
    description:
      "Weekly stats, streak counter, upcoming deadlines, and proactive AI nudges to keep you accountable every day.",
    color: "text-green-500",
    bg: "bg-green-50 dark:bg-green-900/20",
  },
];

const BENEFITS = [
  "100% of AI responses cite real CV chunks — zero hallucination",
  "Live job search with fit scores computed in under 5 seconds",
  "Conversational memory across your entire session",
  "Daily-use accountability with streaks, nudges & Kanban",
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function LandingPageClient() {
  const router = useRouter();
  const cvId = useAppStore((s) => s.cvId);

  useEffect(() => {
    if (cvId) {
      router.replace("/dashboard");
    }
  }, [cvId, router]);

  // Prevent flash of landing page if user is already onboarding/logged in
  if (cvId) {
    return null;
  }

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground animate-fade-in">
      {/* ── Top Nav ── */}
      <header className="flex h-14 items-center justify-between border-b border-border px-6">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600">
            <Rocket className="h-4 w-4 text-white" aria-hidden="true" />
          </div>
          <span className="text-sm font-bold tracking-tight">CareerPilot</span>
        </div>

        <nav className="flex items-center gap-2" aria-label="Site navigation">
          <Link
            href="/dashboard"
            className="rounded-lg px-4 py-2 text-sm font-medium text-muted transition-colors hover:text-foreground"
          >
            Sign in
          </Link>
          <Link
            href="/onboarding"
            className="flex items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
          >
            Get started free
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        </nav>
      </header>

      <main>
        {/* ── Hero ── */}
        <section className="relative flex flex-col items-center overflow-hidden px-6 pb-24 pt-20 text-center">
          {/* Ambient glow */}
          <div
            className="pointer-events-none absolute inset-x-0 top-0 h-[500px] opacity-30"
            style={{
              background:
                "radial-gradient(ellipse 80% 60% at 50% 0%, #6366f1 0%, transparent 70%)",
            }}
            aria-hidden="true"
          />

          <div className="relative z-10 flex max-w-3xl flex-col items-center gap-6">
            {/* Badge */}
            <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-100 bg-brand-50 px-3 py-1 text-xs font-medium text-brand-600 dark:border-brand-900 dark:bg-brand-900/30">
              <span className="h-1.5 w-1.5 rounded-full bg-brand-500" aria-hidden="true" />
              AI-First Career Operating System
            </span>

            {/* Headline */}
            <h1 className="text-4xl font-extrabold leading-tight tracking-tight text-foreground sm:text-5xl lg:text-6xl">
              Your AI{" "}
              <span
                style={{
                  background: "linear-gradient(135deg, #6366f1 0%, #a855f7 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                Career Co-pilot
              </span>
            </h1>

            {/* Sub-headline */}
            <p className="max-w-xl text-lg leading-relaxed text-muted">
              CareerPilot hunts jobs, scores fit, drafts applications, and identifies
              skill gaps — all grounded in{" "}
              <span className="font-semibold text-foreground">your own CV</span>.
              No hallucinations. No generic advice.
            </p>

            {/* CTAs */}
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Link
                id="hero-cta-primary"
                href="/onboarding"
                className="flex items-center gap-2 rounded-xl bg-brand-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-brand-500/25 transition-all hover:bg-brand-700 hover:shadow-brand-500/40"
              >
                Upload your CV — it&apos;s free
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <Link
                id="hero-cta-secondary"
                href="/dashboard"
                className="flex items-center gap-2 rounded-xl border border-border px-6 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-surface"
              >
                See the dashboard
              </Link>
            </div>
          </div>
        </section>

        {/* ── Benefits bar ── */}
        <section className="border-y border-border bg-surface px-6 py-6" aria-label="Key benefits">
          <ul className="mx-auto flex max-w-5xl flex-wrap items-center justify-center gap-x-8 gap-y-3">
            {BENEFITS.map((b) => (
              <li key={b} className="flex items-center gap-2 text-sm text-muted">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-green-500" aria-hidden="true" />
                {b}
              </li>
            ))}
          </ul>
        </section>

        {/* ── Features ── */}
        <section className="px-6 py-20" aria-labelledby="features-heading">
          <div className="mx-auto max-w-5xl">
            <div className="mb-12 text-center">
              <h2
                id="features-heading"
                className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl"
              >
                Everything you need to land your next role
              </h2>
              <p className="mt-3 text-sm text-muted">
                Four pillars, one platform.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              {FEATURES.map(({ icon: Icon, title, description, color, bg }) => (
                <div
                  key={title}
                  className="group flex gap-4 rounded-2xl border border-border bg-surface p-6 transition-all hover:border-brand-500/30 hover:shadow-md hover:shadow-brand-500/5"
                >
                  <div
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${bg}`}
                  >
                    <Icon className={`h-5 w-5 ${color}`} aria-hidden="true" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">{title}</h3>
                    <p className="mt-1 text-sm leading-relaxed text-muted">{description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── CTA Section ── */}
        <section className="px-6 pb-24" aria-label="Call to action">
          <div className="mx-auto max-w-2xl rounded-2xl bg-brand-600 px-8 py-12 text-center shadow-xl shadow-brand-500/20">
            <h2 className="text-2xl font-bold text-white">
              Ready to pilot your career?
            </h2>
            <p className="mt-2 text-sm text-brand-100">
              Upload your CV and get personalised job matches, AI guidance, and a
              full productivity suite — for free.
            </p>
            <Link
              id="bottom-cta"
              href="/onboarding"
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-semibold text-brand-600 shadow-sm transition-all hover:bg-brand-50"
            >
              Get started now
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </section>
      </main>

      {/* ── Footer ── */}
      <footer className="border-t border-border px-6 py-6 text-center text-xs text-muted">
        <p>
          © {new Date().getFullYear()} CareerPilot — Built for ambitious job seekers.
        </p>
      </footer>
    </div>
  );
}
