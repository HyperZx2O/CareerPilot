"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useRef } from "react";
import { Target, ArrowRight, Upload, Search, BarChart3, Quote } from "lucide-react";

/* Hallmark · genre: modern-minimal · macrostructure: Letter · theme: Cobalt
 * nav: N5 floating pill · footer: Ft1 minimal · enrichment: none
 * axes: paper=light(>85%) · display=grotesk-sans · accent=cool(256°)
 */

const STORIES = [
  {
    quote: "The fit score saved me hours. I knew exactly which jobs to apply for instead of spraying resumes everywhere.",
    author: "Rafiq H.",
    role: "Frontend Engineer",
  },
  {
    quote: "Uploaded my CV and got a personalised learning roadmap within seconds. The AI coach actually understands my background.",
    author: "Sadia T.",
    role: "CS Graduate",
  },
  {
    quote: "The Kanban tracker plus nudge combo keeps me accountable. I have doubled my application output this month.",
    author: "Tanvir A.",
    role: "Full Stack Developer",
  },
];

const HOW = [
  {
    icon: Upload,
    label: "Upload your CV",
    body: "Drop a PDF or DOCX. We chunk, embed, and use your CV as the single source of truth — for every match, every recommendation, every letter.",
  },
  {
    icon: Search,
    label: "Search with clarity",
    body: "Live job search with real-time fit scores powered by cosine similarity. Know your chances before you apply, not after.",
  },
  {
    icon: BarChart3,
    label: "Track your trajectory",
    body: "Kanban board, to-dos, goals, streak counter, and AI nudges that keep you moving. Career progress, not application spam.",
  },
];

/* ── Helpers ── */

function FadeIn({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* ── Page ── */

export default function Home() {
  const navRef = useRef<HTMLElement>(null);

  return (
    <div className="relative" style={{ background: "var(--color-paper)", color: "var(--color-text)", fontFamily: "var(--font-body)" }}>
      {/* ── N5 Floating pill nav ── */}
      <motion.nav
        ref={navRef}
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="fixed left-1/2 top-4 z-50 -translate-x-1/2"
      >
        <div
          className="flex items-center gap-6 rounded-full px-5 py-2.5 shadow-lg backdrop-blur-md"
          style={{
            background: "color-mix(in srgb, var(--color-paper) 85%, transparent)",
            border: "var(--rule) solid var(--color-border)",
          }}
        >
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <div
              className="flex h-7 w-7 items-center justify-center rounded-lg"
              style={{ background: "var(--color-accent)" }}
            >
              <Target className="h-3.5 w-3.5 text-white" strokeWidth={2.5} />
            </div>
            <span className="text-sm font-semibold" style={{ fontFamily: "var(--font-display)" }}>
              CareerPilot
            </span>
          </Link>
          <div className="hidden items-center gap-5 sm:flex">
            <a href="#how" className="text-sm transition-opacity" style={{ color: "var(--color-text-muted)" }}>
              How it works
            </a>
            <a href="#stories" className="text-sm transition-opacity" style={{ color: "var(--color-text-muted)" }}>
              Stories
            </a>
          </div>
          <Link href="/sign-up">
            <button
              className="rounded-lg px-4 py-1.5 text-sm font-medium text-white transition-all duration-200"
              style={{ background: "var(--color-accent)" }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "var(--color-accent-hover)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "var(--color-accent)"; }}
            >
              Start free
            </button>
          </Link>
        </div>
      </motion.nav>

      {/* ── Hero / Salutation ── */}
      <section className="mx-auto flex min-h-[80vh] max-w-3xl flex-col justify-center px-6 pt-32 pb-20">
        <FadeIn>
          <p
            className="mb-6 text-sm font-medium tracking-wider uppercase"
            style={{ color: "var(--color-accent)", letterSpacing: "0.15em" }}
          >
            A letter to fresh graduates
          </p>
        </FadeIn>
        <FadeIn delay={0.1}>
          <h1
            className="mb-6 leading-tight"
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "var(--text-display)",
              fontWeight: 400,
              color: "var(--color-text)",
            }}
          >
            You got the degree.
            <br />
            <span style={{ color: "var(--color-accent)" }}>Now get the career.</span>
          </h1>
        </FadeIn>
        <FadeIn delay={0.2}>
          <p
            className="mb-10 max-w-xl leading-relaxed"
            style={{ fontSize: "var(--text-body)", color: "var(--color-text-muted)" }}
          >
            The job market does not care about your GPA. It cares about fit — how your
            actual experience matches what employers need. CareerPilot bridges that gap.
            Upload your CV once, and let AI do the rest.
          </p>
        </FadeIn>
        <FadeIn delay={0.3}>
          <div className="flex flex-wrap gap-4">
            <Link href="/sign-up">
              <button
                className="inline-flex items-center gap-2 rounded-lg px-7 py-3 text-base font-medium text-white transition-all duration-200"
                style={{ background: "var(--color-accent)" }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "var(--color-accent-hover)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "var(--color-accent)"; }}
              >
                Upload CV &mdash; free
                <ArrowRight className="h-4 w-4" strokeWidth={2} />
              </button>
            </Link>
            <a href="#how">
              <button
                className="inline-flex items-center gap-2 rounded-lg border px-7 py-3 text-base font-medium transition-all duration-200"
                style={{
                  borderColor: "var(--color-border)",
                  color: "var(--color-text-muted)",
                  background: "transparent",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "var(--color-border-hover)";
                  e.currentTarget.style.color = "var(--color-text)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "var(--color-border)";
                  e.currentTarget.style.color = "var(--color-text-muted)";
                }}
              >
                See how it works
              </button>
            </a>
          </div>
        </FadeIn>
      </section>

      {/* ── How it works ── */}
      <section id="how" className="mx-auto max-w-3xl px-6 pb-32">
        <FadeIn>
          <h2
            className="mb-4"
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "var(--text-display-s)",
              fontWeight: 400,
            }}
          >
            Three moves, one CV
          </h2>
        </FadeIn>
        <FadeIn delay={0.1}>
          <p
            className="mb-16 max-w-lg leading-relaxed"
            style={{ fontSize: "var(--text-body)", color: "var(--color-text-muted)" }}
          >
            No dashboards to learn. No profiles to fill. Your CV is your profile.
          </p>
        </FadeIn>

        <div className="flex flex-col gap-16">
          {HOW.map((item, i) => (
            <FadeIn key={item.label} delay={0.1 * i}>
              <div className="group flex flex-col gap-4 sm:flex-row sm:gap-8">
                <div
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl transition-all duration-300"
                  style={{ background: "var(--color-accent-subtle)" }}
                >
                  <item.icon
                    className="h-5 w-5"
                    style={{ color: "var(--color-accent)" }}
                    strokeWidth={1.5}
                  />
                </div>
                <div className="min-w-0">
                  <p
                    className="mb-2 text-lg font-semibold"
                    style={{
                      fontFamily: "var(--font-display)",
                      fontSize: "var(--text-h2)",
                      fontWeight: 400,
                    }}
                  >
                    {item.label}
                  </p>
                  <p
                    className="max-w-prose leading-relaxed"
                    style={{ fontSize: "var(--text-body)", color: "var(--color-text-muted)" }}
                  >
                    {item.body}
                  </p>
                </div>
              </div>
            </FadeIn>
          ))}
        </div>
      </section>

      {/* ── Stories ── */}
      <section id="stories" className="mx-auto max-w-5xl px-6 pb-32">
        <FadeIn>
          <h2
            className="mb-4 text-center"
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "var(--text-display-s)",
              fontWeight: 400,
            }}
          >
            What early users say
          </h2>
        </FadeIn>
        <FadeIn delay={0.1}>
          <p
            className="mx-auto mb-14 max-w-md text-center leading-relaxed"
            style={{ fontSize: "var(--text-body)", color: "var(--color-text-muted)" }}
          >
            Built by developers who remember what the first job search felt like.
          </p>
        </FadeIn>

        <div className="grid gap-6 md:grid-cols-3">
          {STORIES.map((story, i) => (
            <FadeIn key={story.author} delay={0.1 * i}>
              <div
                className="flex h-full flex-col rounded-xl p-7 transition-all duration-300"
                style={{
                  background: "var(--color-paper-2)",
                  border: "var(--rule) solid var(--color-border)",
                }}
              >
                <Quote
                  className="mb-4 h-5 w-5 shrink-0"
                  style={{ color: "var(--color-accent)" }}
                  strokeWidth={1.5}
                />
                <p
                  className="mb-6 flex-1 text-sm leading-relaxed"
                  style={{ color: "var(--color-text-muted)" }}
                >
                  &ldquo;{story.quote}&rdquo;
                </p>
                <div
                  className="flex items-center gap-3 pt-4"
                  style={{ borderTop: "var(--rule) solid var(--color-border)" }}
                >
                  <div
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-medium text-white"
                    style={{ background: "var(--color-accent)" }}
                  >
                    {story.author.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <p
                      className="text-sm font-semibold truncate"
                      style={{ color: "var(--color-text)" }}
                    >
                      {story.author}
                    </p>
                    <p
                      className="text-xs truncate"
                      style={{ color: "var(--color-text-dim)" }}
                    >
                      {story.role}
                    </p>
                  </div>
                </div>
              </div>
            </FadeIn>
          ))}
        </div>
      </section>

      {/* ── Closing ── */}
      <section className="mx-auto max-w-2xl px-6 pb-40 text-center">
        <FadeIn>
          <div
            className="rounded-xl p-12 sm:p-16"
            style={{
              background: "var(--color-paper-2)",
              border: "var(--rule) solid var(--color-border)",
            }}
          >
            <h2
              className="mb-4"
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "var(--text-display-s)",
                fontWeight: 400,
              }}
            >
              Your first job is out there.
              <br />
              <span style={{ color: "var(--color-accent)" }}>Let us find it together.</span>
            </h2>
            <p
              className="mx-auto mb-8 max-w-sm leading-relaxed"
              style={{ fontSize: "var(--text-body)", color: "var(--color-text-muted)" }}
            >
              No credit card. No setup. Just your CV and five minutes.
            </p>
            <Link href="/sign-up">
              <button
                className="inline-flex items-center gap-2 rounded-lg px-8 py-3.5 text-base font-medium text-white transition-all duration-200"
                style={{ background: "var(--color-accent)" }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "var(--color-accent-hover)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "var(--color-accent)"; }}
              >
                Upload CV &mdash; free
                <ArrowRight className="h-4 w-4" strokeWidth={2} />
              </button>
            </Link>
          </div>
        </FadeIn>
      </section>

      {/* ── Ft1 Minimal footer ── */}
      <footer
        className="mx-auto max-w-5xl px-6 pb-10"
        style={{ borderTop: "var(--rule) solid var(--color-border)" }}
      >
        <div className="flex flex-col items-center justify-between gap-4 pt-8 sm:flex-row">
          <div className="flex items-center gap-2">
            <div
              className="flex h-6 w-6 items-center justify-center rounded-md"
              style={{ background: "var(--color-accent)" }}
            >
              <Target className="h-3 w-3 text-white" strokeWidth={2.5} />
            </div>
            <span
              className="text-sm"
              style={{
                fontFamily: "var(--font-display)",
                color: "var(--color-text-dim)",
              }}
            >
              CareerPilot
            </span>
          </div>
          <p className="text-xs" style={{ color: "var(--color-text-dim)" }}>
            Built for CodeSprint Hackathon &apos;26 &middot; CareerPilot &copy; 2026
          </p>
        </div>
      </footer>
    </div>
  );
}
