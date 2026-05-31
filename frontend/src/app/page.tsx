import Link from "next/link";

export default function Home() {
  return (
    <main className="relative min-h-screen overflow-hidden" style={{ background: "var(--cp-bg)" }}>
      {/* Ambient glow */}
      <div className="absolute top-[-20%] left-[30%] h-[600px] w-[600px] rounded-full opacity-20 blur-[120px]"
        style={{ background: "var(--cp-primary)" }} />
      <div className="absolute bottom-[-10%] right-[20%] h-[400px] w-[400px] rounded-full opacity-15 blur-[100px]"
        style={{ background: "var(--cp-accent)" }} />

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-8 py-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl"
            style={{ background: "var(--cp-gradient)" }}>
            <span className="text-xl">🚀</span>
          </div>
          <span className="text-xl font-bold cp-glow-text">CareerPilot</span>
        </div>
        <Link href="/dashboard" className="cp-btn cp-btn-primary">
          Get Started →
        </Link>
      </header>

      {/* Hero */}
      <section className="relative z-10 mx-auto flex max-w-5xl flex-col items-center px-6 pt-20 pb-16 text-center animate-slide-up">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm"
          style={{ borderColor: "var(--cp-border)", color: "var(--cp-text-muted)" }}>
          <span className="inline-block h-2 w-2 rounded-full animate-pulse" style={{ background: "var(--cp-success)" }} />
          AI-powered career intelligence
        </div>

        <h1 className="mb-6 text-5xl font-extrabold leading-tight tracking-tight md:text-7xl">
          Your Career,{" "}
          <span className="cp-glow-text">Autopiloted</span>
        </h1>

        <p className="mb-10 max-w-2xl text-lg leading-relaxed" style={{ color: "var(--cp-text-muted)" }}>
          Upload your CV once. CareerPilot hunts jobs, scores your fit, drafts cover letters,
          identifies skill gaps, and keeps you accountable — all grounded in{" "}
          <em>your</em> real experience.
        </p>

        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="cp-btn cp-btn-primary text-base px-8 py-3">
            🚀 Launch Dashboard
          </Link>
          <a href="#pillars" className="cp-btn cp-btn-ghost text-base px-8 py-3">
            See How It Works
          </a>
        </div>
      </section>

      {/* Pillars */}
      <section id="pillars" className="relative z-10 mx-auto max-w-6xl px-6 pb-24">
        <h2 className="mb-12 text-center text-3xl font-bold">Four Pillars of Career Intelligence</h2>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {[
            {
              icon: "🔍",
              title: "Job Hunter Agent",
              desc: "Live job search with real-time fit scores powered by cosine similarity against your CV.",
              color: "#6366f1",
            },
            {
              icon: "📄",
              title: "Resume Intelligence",
              desc: "Upload PDF/DOCX. We chunk, embed, and use your CV as the single source of truth.",
              color: "#06b6d4",
            },
            {
              icon: "💬",
              title: "AI Assistant",
              desc: "Career readiness, skill gaps, learning roadmaps, and cover letters — all grounded in your CV.",
              color: "#8b5cf6",
            },
            {
              icon: "📊",
              title: "Progress Tracker",
              desc: "Kanban board, to-dos, goals, streak counter, and proactive AI nudges for accountability.",
              color: "#22c55e",
            },
          ].map((pillar) => (
            <div key={pillar.title} className="cp-card group animate-fade-in">
              <div
                className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl text-2xl"
                style={{ background: `${pillar.color}20` }}
              >
                {pillar.icon}
              </div>
              <h3 className="mb-2 text-lg font-semibold">{pillar.title}</h3>
              <p className="text-sm leading-relaxed" style={{ color: "var(--cp-text-muted)" }}>
                {pillar.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t px-8 py-6 text-center text-sm"
        style={{ borderColor: "var(--cp-border)", color: "var(--cp-text-dim)" }}>
        Built for CodeSprint Hackathon &apos;26 — CareerPilot © 2026
      </footer>
    </main>
  );
}
