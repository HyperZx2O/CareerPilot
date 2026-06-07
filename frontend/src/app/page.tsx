"use client";

import Link from "next/link";
import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import { ArrowRight, Search, FileText, MessageSquare, BarChart3, Target } from "lucide-react";

const PILLARS = [
  {
    icon: Search,
    title: "Job Hunter Agent",
    desc: "Live job search with real-time fit scores powered by cosine similarity against your CV.",
    color: "#6366f1",
    gradient: "from-indigo-500/20 to-indigo-500/5",
    borderColor: "rgba(99, 102, 241, 0.3)",
  },
  {
    icon: FileText,
    title: "Resume Intelligence",
    desc: "Upload PDF/DOCX. We chunk, embed, and use your CV as the single source of truth.",
    color: "#06b6d4",
    gradient: "from-cyan-500/20 to-cyan-500/5",
    borderColor: "rgba(6, 182, 212, 0.3)",
  },
  {
    icon: MessageSquare,
    title: "AI Assistant",
    desc: "Career readiness, skill gaps, learning roadmaps, and cover letters — all grounded in your CV.",
    color: "#8b5cf6",
    gradient: "from-violet-500/20 to-violet-500/5",
    borderColor: "rgba(139, 92, 246, 0.3)",
  },
  {
    icon: BarChart3,
    title: "Progress Tracker",
    desc: "Kanban board, to-dos, goals, streak counter, and proactive AI nudges for accountability.",
    color: "#22c55e",
    gradient: "from-emerald-500/20 to-emerald-500/5",
    borderColor: "rgba(34, 197, 94, 0.3)",
  },
];

function AnimatedPillarCard({
  pillar,
  index,
}: {
  pillar: (typeof PILLARS)[0];
  index: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      whileHover={{ y: -5, transition: { duration: 0.2 } }}
      className="group relative overflow-hidden rounded-2xl border p-6 transition-all hover:shadow-xl cursor-pointer"
      style={{
        background: `linear-gradient(135deg, var(--cp-surface) 0%, var(--cp-surface-2) 100%)`,
        borderColor: pillar.borderColor,
      }}
    >
      {/* Glow effect */}
      <div
        className="absolute -right-10 -top-10 h-32 w-32 rounded-full opacity-0 blur-3xl transition-opacity duration-500 group-hover:opacity-20"
        style={{ background: pillar.color }}
      />

      {/* Icon */}
      <motion.div
        className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-110"
        style={{ background: `${pillar.color}20` }}
        whileHover={{ rotate: 5 }}
      >
        <pillar.icon className="h-7 w-7" style={{ color: pillar.color }} />
      </motion.div>

      {/* Title */}
      <h3 className="mb-2 text-lg font-semibold text-white">{pillar.title}</h3>

      {/* Description */}
      <p className="text-sm leading-relaxed" style={{ color: "var(--cp-text-muted)" }}>
        {pillar.desc}
      </p>

      {/* Animated border gradient on hover */}
      <div
        className="absolute bottom-0 left-0 h-1 w-0 transition-all duration-500 group-hover:w-full"
        style={{ background: `linear-gradient(90deg, ${pillar.color}, transparent)` }}
      />
    </motion.div>
  );
}

export default function Home() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"],
  });

  const y = useTransform(scrollYProgress, [0, 1], [0, 200]);
  const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);

  return (
    <div ref={containerRef} className="relative min-h-screen overflow-hidden">
      {/* Animated ambient background */}
      <div className="fixed inset-0 -z-10">
        {/* Gradient orbs */}
        <motion.div
          className="absolute top-[-20%] left-[30%] h-[600px] w-[600px] rounded-full opacity-20 blur-[120px]"
          style={{
            background: "var(--cp-primary)",
            y: useTransform(scrollYProgress, [0, 1], [0, -100]),
          }}
        />
        <motion.div
          className="absolute bottom-[-10%] right-[20%] h-[400px] w-[400px] rounded-full opacity-15 blur-[100px]"
          style={{
            background: "var(--cp-accent)",
            y: useTransform(scrollYProgress, [0, 1], [0, 100]),
          }}
        />
        {/* Grid pattern overlay */}
        <div
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: `linear-gradient(var(--cp-border) 1px, transparent 1px),
                             linear-gradient(90deg, var(--cp-border) 1px, transparent 1px)`,
            backgroundSize: "60px 60px",
          }}
        />
      </div>

      {/* Header */}
      <motion.header
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="relative z-10 flex items-center justify-between px-8 py-5"
      >
        <div className="flex items-center gap-3">
          <motion.div
            className="flex h-10 w-10 items-center justify-center rounded-xl"
            style={{ background: "var(--cp-gradient)" }}
            whileHover={{ rotate: 10, scale: 1.1 }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            <Target className="h-5 w-5 text-white" strokeWidth={2.5} />
          </motion.div>
          <motion.span
            className="text-xl font-bold cp-glow-text"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            CareerPilot
          </motion.span>
        </div>
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Link href="/dashboard">
            <motion.button
              className="relative overflow-hidden rounded-xl bg-gradient-to-r from-indigo-500 to-cyan-500 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25"
              whileHover={{ scale: 1.05, boxShadow: "0 0 30px rgba(99, 102, 241, 0.4)" }}
              whileTap={{ scale: 0.95 }}
            >
              Get Started →
            </motion.button>
          </Link>
        </motion.div>
      </motion.header>

      {/* Hero */}
      <motion.section
        style={{ y, opacity }}
        className="relative z-10 mx-auto flex max-w-5xl flex-col items-center px-6 pt-20 pb-16 text-center"
      >
        {/* Animated badge */}
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

        {/* Hero title with word animation */}
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

        {/* Hero description */}
        <motion.p
          className="mb-10 max-w-2xl text-lg leading-relaxed"
          style={{ color: "var(--cp-text-muted)" }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          Upload your CV once. CareerPilot hunts jobs, scores your fit, drafts cover letters,
          identifies skill gaps, and keeps you accountable — all grounded in{" "}
          <motion.span
            className="cp-glow-text font-semibold"
            whileHover={{ scale: 1.05 }}
          >
            your
          </motion.span>{" "}
          real experience.
        </motion.p>

        {/* CTA buttons */}
        <motion.div
          className="flex items-center gap-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
        >
          <Link href="/dashboard">
            <motion.button
              className="group relative flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-cyan-500 px-8 py-3.5 text-base font-semibold text-white shadow-lg shadow-indigo-500/25 transition-shadow hover:shadow-xl hover:shadow-indigo-500/30"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Target className="h-4 w-4" strokeWidth={2.5} />
              Launch Dashboard
              <motion.span
                className="ml-1"
                initial={{ x: 0 }}
                whileHover={{ x: 4 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                →
              </motion.span>
              {/* Shimmer effect */}
              <div className="absolute inset-0 -z-10 rounded-xl bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 transition-opacity duration-300 group-hover:animate-shimmer" />
            </motion.button>
          </Link>
          <a href="#pillars">
            <motion.button
              className="flex items-center gap-2 rounded-xl border px-8 py-3.5 text-base font-semibold transition-all hover:border-indigo-500/50 hover:bg-indigo-500/10"
              style={{
                borderColor: "var(--cp-border)",
                color: "var(--cp-text-muted)",
              }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              See How It Works
              <motion.svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                animate={{ y: [0, 3, 0] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                <path d="m6 9 6 6 6-6" />
              </motion.svg>
            </motion.button>
          </a>
        </motion.div>
      </motion.section>

      {/* Pillars */}
      <section
        id="pillars"
        className="relative z-10 mx-auto max-w-6xl px-6 pb-24"
      >
        <motion.h2
          className="mb-12 text-center text-3xl font-bold"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          Four Pillars of Career Intelligence
        </motion.h2>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {PILLARS.map((pillar, index) => (
            <AnimatedPillarCard key={pillar.title} pillar={pillar} index={index} />
          ))}
        </div>
      </section>

      {/* Features section */}
      <motion.section
        className="relative z-10 mx-auto max-w-5xl px-6 pb-24"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
      >
        <motion.div
          className="rounded-3xl border p-8 md:p-12"
          style={{
            background: "linear-gradient(135deg, var(--cp-surface) 0%, var(--cp-surface-2) 100%)",
            borderColor: "var(--cp-border)",
          }}
        >
          <motion.h3
            className="mb-8 text-center text-2xl font-bold"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            Built for Modern Careers
          </motion.h3>
          <div className="grid gap-6 md:grid-cols-3">
            {[
              { icon: "⚡", label: "Instant Results", desc: "Get job matches in seconds" },
              { icon: "🎯", label: "AI-Powered", desc: "Grounded in your experience" },
              { icon: "🔒", label: "Private & Secure", desc: "Your data stays yours" },
            ].map((feature, i) => (
              <motion.div
                key={feature.label}
                className="flex flex-col items-center text-center"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
              >
                <motion.span
                  className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl text-2xl"
                  style={{ background: "var(--cp-primary-glow)" }}
                  whileHover={{ scale: 1.1, rotate: 5 }}
                >
                  {feature.icon}
                </motion.span>
                <span className="mb-1 font-semibold">{feature.label}</span>
                <span className="text-sm" style={{ color: "var(--cp-text-muted)" }}>
                  {feature.desc}
                </span>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </motion.section>

      {/* Footer */}
      <motion.footer
        className="relative z-10 border-t px-8 py-6 text-center text-sm"
        style={{ borderColor: "var(--cp-border)", color: "var(--cp-text-dim)" }}
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
      >
        Built for CodeSprint Hackathon &apos;26 — CareerPilot © 2026
      </motion.footer>

      {/* Add shimmer animation to globals */}
      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        .animate-shimmer {
          animation: shimmer 2s infinite;
        }
      `}</style>
    </div>
  );
}
