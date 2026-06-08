"use client";

import Link from "next/link";
import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import {
  ArrowRight, Search, FileText, MessageSquare, BarChart3, Target,
  Zap, Crosshair, Shield, Upload, Brain, Sparkles, Quote, ChevronDown,
} from "lucide-react";

const PILLARS = [
  {
    icon: Search,
    title: "Job Hunter Agent",
    desc: "Live job search with real-time fit scores powered by cosine similarity against your CV.",
    color: "#6366f1",
    borderColor: "rgba(99, 102, 241, 0.3)",
  },
  {
    icon: FileText,
    title: "Resume Intelligence",
    desc: "Upload PDF/DOCX. We chunk, embed, and use your CV as the single source of truth.",
    color: "#06b6d4",
    borderColor: "rgba(6, 182, 212, 0.3)",
  },
  {
    icon: MessageSquare,
    title: "AI Assistant",
    desc: "Career readiness, skill gaps, learning roadmaps, and cover letters — all grounded in your CV.",
    color: "#8b5cf6",
    borderColor: "rgba(139, 92, 246, 0.3)",
  },
  {
    icon: BarChart3,
    title: "Progress Tracker",
    desc: "Kanban board, to-dos, goals, streak counter, and proactive AI nudges for accountability.",
    color: "#22c55e",
    borderColor: "rgba(34, 197, 94, 0.3)",
  },
];

function PillarCard({ pillar, index }: { pillar: (typeof PILLARS)[0]; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      whileHover={{ y: -6, transition: { duration: 0.2 } }}
      className="group relative overflow-hidden rounded-2xl border p-6 transition-all duration-300 hover:shadow-xl hover:shadow-indigo-500/5 cursor-pointer"
      style={{
        background: "linear-gradient(135deg, var(--cp-surface) 0%, var(--cp-surface-2) 100%)",
        borderColor: pillar.borderColor,
      }}
    >
      <div
        className="absolute -right-10 -top-10 h-32 w-32 rounded-full opacity-0 blur-3xl transition-opacity duration-500 group-hover:opacity-20"
        style={{ background: pillar.color }}
      />
      <motion.div
        className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl transition-all duration-300 group-hover:scale-110 group-hover:shadow-lg"
        style={{ background: `${pillar.color}20` }}
        whileHover={{ rotate: 5 }}
      >
        <pillar.icon className="h-7 w-7" style={{ color: pillar.color }} />
      </motion.div>
      <h3 className="mb-2 text-lg font-semibold text-white">{pillar.title}</h3>
      <p className="text-sm leading-relaxed" style={{ color: "var(--cp-text-muted)" }}>
        {pillar.desc}
      </p>
      <div
        className="absolute bottom-0 left-0 h-1 w-0 transition-all duration-500 group-hover:w-full"
        style={{ background: `linear-gradient(90deg, ${pillar.color}, transparent)` }}
      />
    </motion.div>
  );
}

const FEATURES = [
  { icon: Upload, label: "Instant Parsing", desc: "Upload PDF or DOCX. CV is chunked, embedded, and ready in seconds." },
  { icon: Crosshair, label: "Smart Matching", desc: "Cosine similarity fit scores show exactly how you match each role." },
  { icon: Brain, label: "AI Coach", desc: "Personalized roadmaps, cover letters, and skill gap analysis grounded in your CV." },
  { icon: Shield, label: "Privacy First", desc: "Your data stays yours. Encrypted storage, no sharing, no training on your CV." },
];

const STEPS = [
  { icon: Upload, step: "01", title: "Upload Your CV", desc: "Drop your PDF or DOCX. AI extracts sections, skills, and experience automatically." },
  { icon: Zap, step: "02", title: "Get Matched", desc: "Search live jobs with real-time fit scores. Know your chances before applying." },
  { icon: Sparkles, step: "03", title: "Level Up", desc: "AI-generated roadmaps, cover letters, and skill gap analysis keep you growing." },
];

export default function Home() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"],
  });
  const heroY = useTransform(scrollYProgress, [0, 1], [0, 200]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);

  return (
    <div ref={containerRef} className="relative min-h-screen overflow-hidden">
      {/* Ambient background */}
      <div className="fixed inset-0 -z-10">
        <motion.div
          className="absolute top-[-20%] left-[30%] h-[600px] w-[600px] rounded-full opacity-20 blur-[120px]"
          style={{ background: "var(--cp-primary)", y: useTransform(scrollYProgress, [0, 1], [0, -100]) }}
        />
        <motion.div
          className="absolute bottom-[-10%] right-[20%] h-[400px] w-[400px] rounded-full opacity-15 blur-[100px]"
          style={{ background: "var(--cp-accent)", y: useTransform(scrollYProgress, [0, 1], [0, 100]) }}
        />
        <div
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: `linear-gradient(var(--cp-border) 1px, transparent 1px),
                             linear-gradient(90deg, var(--cp-border) 1px, transparent 1px)`,
            backgroundSize: "60px 60px",
          }}
        />
      </div>

      {/* ── Header ── */}
      <motion.header
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="relative z-10 flex items-center justify-between px-6 py-5 md:px-10"
      >
        <Link href="/" className="flex items-center gap-3">
          <motion.div
            className="flex h-10 w-10 items-center justify-center rounded-xl"
            style={{ background: "var(--cp-gradient)" }}
            whileHover={{ rotate: 10, scale: 1.1 }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            <Target className="h-5 w-5 text-white" strokeWidth={2.5} />
          </motion.div>
          <span className="text-xl font-bold cp-glow-text">CareerPilot</span>
        </Link>
        <nav className="hidden items-center gap-8 md:flex">
          <a href="#pillars" className="text-sm font-medium transition-colors duration-200 hover:text-white" style={{ color: "var(--cp-text-muted)" }}>Features</a>
          <a href="#how-it-works" className="text-sm font-medium transition-colors duration-200 hover:text-white" style={{ color: "var(--cp-text-muted)" }}>How It Works</a>
          <a href="#testimonials" className="text-sm font-medium transition-colors duration-200 hover:text-white" style={{ color: "var(--cp-text-muted)" }}>Testimonials</a>
        </nav>
        <Link href="/dashboard">
          <motion.button
            className="group relative overflow-hidden rounded-xl bg-gradient-to-r from-indigo-500 to-cyan-500 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition-shadow duration-300 hover:shadow-xl hover:shadow-indigo-500/40 cursor-pointer"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Get Started
            <div className="absolute inset-0 -z-10 rounded-xl bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 transition-opacity duration-300 group-hover:animate-shimmer" />
          </motion.button>
        </Link>
      </motion.header>

      {/* ── Hero ── */}
      <motion.section
        style={{ y: heroY, opacity: heroOpacity }}
        className="relative z-10 mx-auto flex max-w-5xl flex-col items-center px-6 pt-20 pb-16 text-center"
      >
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-6 inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm"
          style={{ borderColor: "var(--cp-border)", color: "var(--cp-text-muted)" }}
        >
          <motion.span
            className="inline-block h-2 w-2 rounded-full"
            style={{ background: "var(--cp-success)" }}
            animate={{ scale: [1, 1.2, 1], opacity: [1, 0.8, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
          AI-powered career intelligence
        </motion.div>

        <motion.h1
          className="mb-6 text-5xl font-extrabold leading-tight tracking-tight md:text-7xl"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          {"Your Career, ".split(" ").map((word, i) => (
            <motion.span
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 + i * 0.05 }}
              className="inline-block mr-4"
            >
              {word}
            </motion.span>
          ))}
          <motion.span
            className="cp-glow-text"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.7, type: "spring", stiffness: 200 }}
          >
            Autopiloted
          </motion.span>
        </motion.h1>

        <motion.p
          className="mb-10 max-w-2xl text-lg leading-relaxed"
          style={{ color: "var(--cp-text-muted)" }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          Upload your CV once. CareerPilot hunts jobs, scores your fit, drafts cover letters,
          identifies skill gaps, and keeps you accountable — all grounded in{" "}
          <span className="cp-glow-text font-semibold">your</span> real experience.
        </motion.p>

        <motion.div
          className="flex flex-col items-center gap-4 sm:flex-row"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
        >
          <Link href="/dashboard">
            <motion.button
              className="group relative flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-cyan-500 px-8 py-3.5 text-base font-semibold text-white shadow-lg shadow-indigo-500/25 transition-shadow duration-300 hover:shadow-xl hover:shadow-indigo-500/30 cursor-pointer"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Target className="h-4 w-4" strokeWidth={2.5} />
              Launch Dashboard
              <ArrowRight className="ml-1 h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
            </motion.button>
          </Link>
          <a href="#pillars">
            <motion.button
              className="flex items-center gap-2 rounded-xl border px-8 py-3.5 text-base font-semibold transition-all duration-300 hover:border-indigo-500/50 hover:bg-indigo-500/10 cursor-pointer"
              style={{ borderColor: "var(--cp-border)", color: "var(--cp-text-muted)" }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              See How It Works
              <ChevronDown className="h-4 w-4" />
            </motion.button>
          </a>
        </motion.div>
      </motion.section>

      {/* ── Social Proof Stats ── */}
      <motion.section
        className="relative z-10 mx-auto max-w-4xl px-6 pb-20"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
      >
        <div
          className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border md:grid-cols-4"
          style={{ borderColor: "var(--cp-border)" }}
        >
          {[
            { value: "10K+", label: "Live Jobs" },
            { value: "98%", label: "Fit Accuracy" },
            { value: "5min", label: "Setup Time" },
            { value: "Free", label: "To Start" },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="flex flex-col items-center py-8 text-center transition-colors duration-300 hover:bg-white/[0.02] cursor-default"
              style={{ background: "var(--cp-surface)" }}
            >
              <span className="mb-1 text-3xl font-bold cp-glow-text">{stat.value}</span>
              <span className="text-sm" style={{ color: "var(--cp-text-muted)" }}>{stat.label}</span>
            </motion.div>
          ))}
        </div>
      </motion.section>

      {/* ── Pillars ── */}
      <section id="pillars" className="relative z-10 mx-auto max-w-6xl px-6 pb-24">
        <motion.h2
          className="mb-4 text-center text-3xl font-bold"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          Four Pillars of Career Intelligence
        </motion.h2>
        <motion.p
          className="mx-auto mb-12 max-w-xl text-center text-sm"
          style={{ color: "var(--cp-text-muted)" }}
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
        >
          Every feature is designed around one principle: your CV is the single source of truth.
        </motion.p>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {PILLARS.map((pillar, index) => (
            <PillarCard key={pillar.title} pillar={pillar} index={index} />
          ))}
        </div>
      </section>

      {/* ── Features Grid ── */}
      <motion.section
        className="relative z-10 mx-auto max-w-6xl px-6 pb-24"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
      >
        <motion.h3
          className="mb-4 text-center text-3xl font-bold"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          Built for Modern Careers
        </motion.h3>
        <motion.p
          className="mx-auto mb-12 max-w-xl text-center text-sm"
          style={{ color: "var(--cp-text-muted)" }}
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
        >
          Everything you need to navigate the job market with AI-powered precision.
        </motion.p>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((feature, i) => (
            <motion.div
              key={feature.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              whileHover={{ y: -4 }}
              className="group cursor-pointer"
            >
              <div
                className="flex h-full flex-col rounded-2xl border p-6 transition-all duration-300 hover:shadow-lg hover:shadow-indigo-500/5"
                style={{
                  background: "linear-gradient(135deg, var(--cp-surface) 0%, var(--cp-surface-2) 100%)",
                  borderColor: "var(--cp-border)",
                }}
              >
                <motion.div
                  className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl transition-all duration-300 group-hover:scale-110 group-hover:shadow-lg"
                  style={{ background: "var(--cp-primary-glow)" }}
                  whileHover={{ rotate: 5 }}
                >
                  <feature.icon className="h-6 w-6" style={{ color: "var(--cp-primary)" }} />
                </motion.div>
                <h4 className="mb-2 font-semibold text-white">{feature.label}</h4>
                <p className="text-sm leading-relaxed" style={{ color: "var(--cp-text-muted)" }}>
                  {feature.desc}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.section>

      {/* ── How It Works ── */}
      <section id="how-it-works" className="relative z-10 mx-auto max-w-5xl px-6 pb-24">
        <motion.h2
          className="mb-4 text-center text-3xl font-bold"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          How It Works
        </motion.h2>
        <motion.p
          className="mx-auto mb-16 max-w-xl text-center text-sm"
          style={{ color: "var(--cp-text-muted)" }}
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
        >
          Three steps to take control of your career trajectory.
        </motion.p>
        <div className="relative grid gap-8 md:grid-cols-3">
          {/* Connector line */}
          <div className="absolute left-1/2 top-12 hidden h-[2px] w-3/4 -translate-x-1/2 md:block" style={{ background: "linear-gradient(90deg, var(--cp-primary), var(--cp-accent), transparent)" }} />
          {STEPS.map((step, i) => (
            <motion.div
              key={step.step}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.2 }}
              className="relative flex flex-col items-center text-center cursor-default"
            >
              <motion.div
                className="relative z-10 mb-6 flex h-20 w-20 items-center justify-center rounded-2xl border-2 transition-all duration-300 hover:shadow-lg hover:shadow-indigo-500/10"
                style={{
                  background: "linear-gradient(135deg, var(--cp-surface) 0%, var(--cp-surface-2) 100%)",
                  borderColor: i === 0 ? "var(--cp-primary)" : i === 1 ? "var(--cp-accent)" : "var(--cp-border)",
                }}
                whileHover={{ scale: 1.1, rotate: [0, -5, 5, 0] }}
                transition={{ duration: 0.3 }}
              >
                <step.icon className="h-8 w-8" style={{
                  color: i === 0 ? "var(--cp-primary)" : i === 1 ? "var(--cp-accent)" : "var(--cp-text)",
                }} />
              </motion.div>
              <span
                className="mb-2 text-xs font-bold tracking-widest uppercase"
                style={{ color: i === 0 ? "var(--cp-primary)" : i === 1 ? "var(--cp-accent)" : "var(--cp-text-muted)" }}
              >
                Step {step.step}
              </span>
              <h3 className="mb-2 text-lg font-semibold text-white">{step.title}</h3>
              <p className="max-w-xs text-sm leading-relaxed" style={{ color: "var(--cp-text-muted)" }}>
                {step.desc}
              </p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── Testimonials ── */}
      <section id="testimonials" className="relative z-10 mx-auto max-w-5xl px-6 pb-24">
        <motion.h2
          className="mb-4 text-center text-3xl font-bold"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          What Early Users Say
        </motion.h2>
        <motion.p
          className="mx-auto mb-12 max-w-xl text-center text-sm"
          style={{ color: "var(--cp-text-muted)" }}
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
        >
          Built by developers, for developers.
        </motion.p>
        <div className="grid gap-6 md:grid-cols-3">
          {[
            {
              quote: "The fit score saved me hours. I knew exactly which jobs to apply for instead of spraying resumes everywhere.",
              author: "Rafiq H.",
              role: "Frontend Engineer",
            },
            {
              quote: "Uploaded my CV and got a personalized learning roadmap within seconds. The AI coach actually understands my background.",
              author: "Sadia T.",
              role: "CS Graduate",
            },
            {
              quote: "The Kanban tracker + nudge combo keeps me accountable. I've doubled my application output this month.",
              author: "Tanvir A.",
              role: "Full Stack Developer",
            },
          ].map((t, i) => (
            <motion.div
              key={t.author}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="group cursor-default"
            >
              <div
                className="flex h-full flex-col rounded-2xl border p-6 transition-all duration-300 hover:shadow-lg hover:shadow-indigo-500/5"
                style={{
                  background: "linear-gradient(135deg, var(--cp-surface) 0%, var(--cp-surface-2) 100%)",
                  borderColor: "var(--cp-border)",
                }}
              >
                <Quote className="mb-4 h-6 w-6" style={{ color: "var(--cp-primary)" }} />
                <p className="mb-6 flex-1 text-sm leading-relaxed italic" style={{ color: "var(--cp-text-muted)" }}>
                  &ldquo;{t.quote}&rdquo;
                </p>
                <div className="flex items-center gap-3 border-t pt-4" style={{ borderColor: "var(--cp-border)" }}>
                  <div
                    className="flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold text-white"
                    style={{ background: "var(--cp-gradient)" }}
                  >
                    {t.author.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">{t.author}</p>
                    <p className="text-xs" style={{ color: "var(--cp-text-dim)" }}>{t.role}</p>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── Final CTA ── */}
      <motion.section
        className="relative z-10 mx-auto max-w-3xl px-6 pb-24"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
      >
        <motion.div
          className="relative overflow-hidden rounded-3xl border p-12 text-center"
          style={{
            background: "linear-gradient(135deg, var(--cp-surface) 0%, var(--cp-surface-2) 100%)",
            borderColor: "var(--cp-border)",
          }}
          whileHover={{ boxShadow: "0 0 40px rgba(99, 102, 241, 0.1)" }}
        >
          <div className="absolute -right-20 -top-20 h-60 w-60 rounded-full opacity-10 blur-[80px]" style={{ background: "var(--cp-primary)" }} />
          <motion.h3
            className="mb-4 text-3xl font-bold"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            Ready to <span className="cp-glow-text">Autopilot</span> Your Career?
          </motion.h3>
          <motion.p
            className="mx-auto mb-8 max-w-md text-sm"
            style={{ color: "var(--cp-text-muted)" }}
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
          >
            Upload your CV, get matched with live jobs, and let AI guide every step.
          </motion.p>
          <Link href="/dashboard">
            <motion.button
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-cyan-500 px-8 py-3.5 text-base font-semibold text-white shadow-lg shadow-indigo-500/25 transition-shadow duration-300 hover:shadow-xl hover:shadow-indigo-500/40 cursor-pointer"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Target className="h-4 w-4" strokeWidth={2.5} />
              Launch Dashboard
              <ArrowRight className="h-4 w-4" />
            </motion.button>
          </Link>
        </motion.div>
      </motion.section>

      {/* ── Footer ── */}
      <motion.footer
        className="relative z-10 border-t"
        style={{ borderColor: "var(--cp-border)" }}
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
      >
        <div className="mx-auto max-w-6xl px-6 py-12">
          <div className="grid gap-8 md:grid-cols-4">
            {/* Brand */}
            <div className="md:col-span-2">
              <Link href="/" className="mb-4 flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: "var(--cp-gradient)" }}>
                  <Target className="h-4 w-4 text-white" strokeWidth={2.5} />
                </div>
                <span className="text-lg font-bold cp-glow-text">CareerPilot</span>
              </Link>
              <p className="mb-4 max-w-xs text-sm leading-relaxed" style={{ color: "var(--cp-text-dim)" }}>
                AI-first career operating system. Upload your CV, search jobs with fit scores, get personalized career guidance, and track your progress.
              </p>
              <div className="flex gap-3">
                {[
                  { name: "GitHub", path: "M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" },
                  { name: "Twitter", path: "M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z" },
                  { name: "LinkedIn", path: "M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" },
                ].map((social, i) => (
                  <motion.a
                    key={social.name}
                    href="#"
                    whileHover={{ scale: 1.1, y: -2 }}
                    className="flex h-9 w-9 items-center justify-center rounded-lg transition-colors duration-200 hover:bg-white/5"
                    style={{ color: "var(--cp-text-dim)" }}
                    aria-label={social.name}
                  >
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                      <path d={social.path} />
                    </svg>
                  </motion.a>
                ))}
              </div>
            </div>
            {/* Product */}
            <div>
              <h4 className="mb-4 text-sm font-semibold text-white">Product</h4>
              <ul className="space-y-3">
                {["Features", "How It Works", "Pricing", "FAQ"].map((item) => (
                  <li key={item}>
                    <a href="#" className="text-sm transition-colors duration-200 hover:text-white" style={{ color: "var(--cp-text-dim)" }}>{item}</a>
                  </li>
                ))}
              </ul>
            </div>
            {/* Company */}
            <div>
              <h4 className="mb-4 text-sm font-semibold text-white">Company</h4>
              <ul className="space-y-3">
                {["About", "Blog", "GitHub", "Contact"].map((item) => (
                  <li key={item}>
                    <a href="#" className="text-sm transition-colors duration-200 hover:text-white" style={{ color: "var(--cp-text-dim)" }}>{item}</a>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div className="mt-10 border-t pt-6 text-center text-xs" style={{ borderColor: "var(--cp-border)", color: "var(--cp-text-dim)" }}>
            Built for CodeSprint Hackathon &apos;26 — CareerPilot &copy; 2026
          </div>
        </div>
      </motion.footer>

      {/* Shimmer keyframe */}
      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        .animate-shimmer {
          animation: shimmer 2s infinite;
        }
        html { scroll-behavior: smooth; }
      `}</style>
    </div>
  );
}
