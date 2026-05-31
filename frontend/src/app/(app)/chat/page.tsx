"use client";

import { useState, useRef, useEffect } from "react";
import { sendChatMessage } from "@/lib/api";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";

interface Msg {
  role: "user" | "assistant";
  content: string;
  sources?: string[];
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: Msg = { role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await sendChatMessage(text);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: res.answer, sources: res.sources },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Sorry, I couldn't process that. Please try again." },
      ]);
    }
    setLoading(false);
  }

  const suggestions = [
    "Am I ready for a frontend developer role?",
    "What skills am I missing for ML engineering?",
    "Create a 4-week learning roadmap for React",
    "Draft a cover letter for a Python developer position",
  ];

  return (
    <div className="flex h-[calc(100vh-3rem)] flex-col animate-slide-up">
      <div className="mb-4">
        <h1 className="text-3xl font-bold mb-1">AI Assistant</h1>
        <p style={{ color: "var(--cp-text-muted)" }}>Career guidance grounded in your CV</p>
      </div>

      {/* Chat area */}
      <div className="flex-1 overflow-y-auto rounded-xl border p-4 space-y-4 mb-4"
        style={{ background: "var(--cp-surface)", borderColor: "var(--cp-border)" }}>
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <span className="text-5xl mb-4">💬</span>
            <h2 className="text-xl font-semibold mb-2">Ask me anything about your career</h2>
            <p className="text-sm mb-8 max-w-md" style={{ color: "var(--cp-text-muted)" }}>
              I support job readiness analysis, skill gap analysis, learning roadmaps, and cover letter drafting.
              All answers are grounded in your uploaded CV.
            </p>
            <div className="grid gap-2 md:grid-cols-2 max-w-xl w-full">
              {suggestions.map((s) => (
                <button
                  key={s}
                  onClick={() => setInput(s)}
                  className="cp-btn cp-btn-ghost text-left text-xs"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"} animate-fade-in`}
          >
            <div
              className="max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed"
              style={{
                background: msg.role === "user" ? "var(--cp-primary)" : "var(--cp-surface-2)",
                color: msg.role === "user" ? "white" : "var(--cp-text)",
                borderBottomRightRadius: msg.role === "user" ? "4px" : undefined,
                borderBottomLeftRadius: msg.role === "assistant" ? "4px" : undefined,
              }}
            >
              {msg.role === "user" ? (
                <p className="whitespace-pre-wrap">{msg.content}</p>
              ) : (
                <ReactMarkdown
                  remarkPlugins={[remarkGfm, remarkMath]}
                  rehypePlugins={[rehypeKatex]}
                  components={{
                    p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                    ul: ({ children }) => <ul className="list-disc list-inside mb-2 space-y-1">{children}</ul>,
                    ol: ({ children }) => <ol className="list-decimal list-inside mb-2 space-y-1">{children}</ol>,
                    li: ({ children }) => <li>{children}</li>,
                    strong: ({ children }) => <strong className="font-semibold text-blue-400">{children}</strong>,
                    code: ({ inline, className, children }) => {
                      if (inline) {
                        return <code className="bg-black/20 px-1 py-0.5 rounded text-xs font-mono">{children}</code>;
                      }
                      return <code className="block bg-black/20 p-2 rounded text-xs font-mono overflow-x-auto">{children}</code>;
                    },
                  }}
                >
                  {msg.content}
                </ReactMarkdown>
              )}
              {msg.sources && msg.sources.length > 0 && (
                <div className="mt-2 pt-2 border-t flex flex-wrap gap-1"
                  style={{ borderColor: "rgba(255,255,255,0.1)" }}>
                  <span className="text-xs opacity-60">Sources:</span>
                  {msg.sources.map((s) => (
                    <span key={s} className="text-xs rounded-full px-2 py-0.5"
                      style={{ background: "rgba(99,102,241,0.2)", color: "var(--cp-primary-hover)" }}>
                      {s}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start animate-fade-in">
            <div className="rounded-2xl px-4 py-3" style={{ background: "var(--cp-surface-2)" }}>
              <div className="flex gap-1">
                <span className="h-2 w-2 rounded-full animate-bounce" style={{ background: "var(--cp-primary)", animationDelay: "0ms" }} />
                <span className="h-2 w-2 rounded-full animate-bounce" style={{ background: "var(--cp-primary)", animationDelay: "150ms" }} />
                <span className="h-2 w-2 rounded-full animate-bounce" style={{ background: "var(--cp-primary)", animationDelay: "300ms" }} />
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSend} className="flex gap-3">
        <input
          className="cp-input flex-1"
          placeholder="Ask about your career..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={loading}
        />
        <button type="submit" className="cp-btn cp-btn-primary" disabled={loading || !input.trim()}>
          Send
        </button>
      </form>
    </div>
  );
}
