"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { sendChatMessage } from "@/lib/api";
import type { ChatMessage } from "@/types";
import { Send, Bot, User, RefreshCw } from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string;
  sources?: string[];
}

const SUGGESTIONS = [
  "Am I ready for a data engineer role?",
  "What skills am I missing for a Google internship?",
  "Build me a 3-month roadmap to become job-ready",
  "Draft a cover letter for [paste job here]",
];

function TypingIndicator() {
  return (
    <motion.div
      className="mt-3 flex items-center gap-1.5"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <motion.div
        className="flex h-8 w-8 items-center justify-center rounded-full"
        style={{ background: "var(--cp-surface-2)" }}
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
      >
        <Bot className="h-4 w-4" style={{ color: "var(--cp-text-muted)" }} />
      </motion.div>
      <div className="ml-2 flex gap-1">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="block h-2 w-2 rounded-full"
            style={{ background: "var(--cp-text-dim)" }}
            animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1, 0.8] }}
            transition={{ duration: 1, repeat: Infinity, delay: i * 0.15 }}
          />
        ))}
      </div>
    </motion.div>
  );
}

function MessageBubble({ msg, index }: { msg: Message; index: number }) {
  const isUser = msg.role === "user";
  return (
    <motion.div
      initial={{ opacity: 0, x: isUser ? 20 : -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      className={`flex items-end gap-2 ${isUser ? "flex-row-reverse" : "flex-row"}`}
    >
      <motion.div
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
        style={{
          background: isUser ? "var(--cp-primary)" : "var(--cp-surface-2)",
          color: isUser ? "#fff" : "var(--cp-text-muted)",
        }}
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 300 }}
      >
        {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </motion.div>
      <div className={`max-w-[75%] ${isUser ? "items-end" : "items-start"} flex flex-col gap-1`}>
        <div
          className="overflow-hidden rounded-2xl px-4 py-3 text-sm"
          style={{
            background: isUser ? "var(--cp-primary)" : "var(--cp-surface)",
            color: isUser ? "#fff" : "var(--cp-text)",
            border: isUser ? "none" : "1px solid var(--cp-border)",
          }}
        >
          <div className="whitespace-pre-wrap">
            {isUser ? (
              msg.content
            ) : (
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                allowedElements={["p", "ul", "ol", "li", "h1", "h2", "h3", "code", "pre", "strong", "em", "a", "br", "hr", "blockquote", "table", "thead", "tbody", "tr", "th", "td"]}
                components={{
                  p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                  ul: ({ children }) => <ul className="mb-2 list-disc pl-5">{children}</ul>,
                  ol: ({ children }) => <ol className="mb-2 list-decimal pl-5">{children}</ol>,
                  li: ({ children }) => <li className="mb-1">{children}</li>,
                  h1: ({ children }) => <h1 className="mb-2 text-xl font-bold">{children}</h1>,
                  h2: ({ children }) => <h2 className="mb-2 text-lg font-bold">{children}</h2>,
                  h3: ({ children }) => <h3 className="mb-2 text-base font-semibold">{children}</h3>,
                  code: ({ children }) => (
                    <code className="rounded bg-black/20 px-1.5 py-0.5 font-mono text-xs">
                      {children}
                    </code>
                  ),
                  pre: ({ children }) => (
                    <pre className="mb-2 overflow-x-auto rounded-lg bg-black/20 p-3">
                      {children}
                    </pre>
                  ),
                  strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                  em: ({ children }) => <em className="italic">{children}</em>,
                  a: ({ href, children }) => {
                    const sanitized = href?.startsWith("http://") || href?.startsWith("https://") ? href : undefined;
                    return (
                      <a href={sanitized} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2" style={{ color: "var(--cp-primary)" }}>
                        {children}
                      </a>
                    );
                  },
                }}
              >
                {msg.content}
              </ReactMarkdown>
            )}
          </div>
        </div>
        {msg.sources && msg.sources.length > 0 && !isUser && (
          <motion.div
            className="flex flex-wrap gap-1"
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {msg.sources.map((src) => (
              <span
                key={src}
                className="rounded-full px-2 py-0.5 text-xs"
                style={{ background: "var(--cp-surface-2)", color: "var(--cp-text-muted)" }}
              >
                {src}
              </span>
            ))}
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}

function SuggestionCard({ text, onClick }: { text: string; onClick: () => void }) {
  return (
    <motion.button
      onClick={onClick}
      className="text-left rounded-xl border px-4 py-3 text-sm transition-all hover:border-indigo-500/50 hover:bg-indigo-500/5"
      style={{ borderColor: "var(--cp-border)", color: "var(--cp-text)" }}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      {text}
    </motion.button>
  );
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "👋 Hey! I'm your CareerPilot AI assistant. I've analyzed your CV and I'm ready to help you navigate your career journey.\n\nWhat would you like to explore?",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend(text: string) {
    const trimmed = text.trim();
    if (!trimmed || loading) return;
    setShowSuggestions(false);
    setMessages((prev) => [...prev, { role: "user", content: trimmed }]);
    setInput("");
    setLoading(true);
    try {
      const { answer, sources } = await sendChatMessage(trimmed);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: answer, sources },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Sorry, I couldn't process that. Please try again." },
      ]);
    }
    setLoading(false);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend(input);
    }
  }

  return (
    <motion.div
      className="flex h-[calc(100vh-8rem)] flex-col"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      {/* Header */}
      <motion.div
        className="mb-4 flex items-center justify-between"
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
      >
        <div>
          <h1 className="text-2xl font-bold">AI Career Chat</h1>
          <p className="text-sm" style={{ color: "var(--cp-text-muted)" }}>
            Responses grounded in your uploaded CV
          </p>
        </div>
        <motion.button
          onClick={() => {
            setMessages([{
              role: "assistant",
              content: "👋 Hey! I'm your CareerPilot AI assistant. I've analyzed your CV and I'm ready to help you navigate your career journey.\n\nWhat would you like to explore?",
            }]);
            setShowSuggestions(true);
          }}
          className="flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium transition-colors hover:bg-indigo-500/10"
          style={{ borderColor: "var(--cp-border)", color: "var(--cp-text-muted)" }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <RefreshCw className="h-4 w-4" />
          New chat
        </motion.button>
      </motion.div>

      {/* Banner */}
      <motion.div
        className="mb-4 rounded-xl border p-3 text-sm"
        style={{ background: "var(--cp-primary-glow)", borderColor: "rgba(99,102,241,0.3)", color: "var(--cp-text-muted)" }}
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        💡 Responses are grounded in your uploaded CV. <a href="/profile" className="underline" style={{ color: "var(--cp-primary)" }}>Upload a new CV</a> to update your profile.
      </motion.div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto pb-4">
        <div className="space-y-4">
          <AnimatePresence>
            {messages.map((msg, i) => (
              <MessageBubble key={i} msg={msg} index={i} />
            ))}
          </AnimatePresence>
          {loading && <TypingIndicator />}
          <div ref={bottomRef} />
        </div>

        {/* Suggestions */}
        <AnimatePresence>
          {showSuggestions && messages.length <= 2 && (
            <motion.div
              className="mt-6 grid gap-3 sm:grid-cols-2"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
            >
              {SUGGESTIONS.map((s, i) => (
                <motion.div key={s} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.05 }}>
                  <SuggestionCard
                    text={s}
                    onClick={() => handleSend(s)}
                  />
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Input */}
      <motion.div
        className="overflow-hidden rounded-2xl border"
        style={{ background: "var(--cp-surface)", borderColor: "var(--cp-border)" }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <div className="flex items-end gap-2 p-3">
          <textarea
            ref={textareaRef}
            className="flex-1 resize-none bg-transparent py-1 text-sm outline-none"
            style={{ color: "var(--cp-text)" }}
            placeholder="Ask about your career…"
            rows={1}
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              e.target.style.height = "auto";
              e.target.style.height = `${e.target.scrollHeight}px`;
            }}
            onKeyDown={handleKeyDown}
            disabled={loading}
          />
          <motion.button
            onClick={() => handleSend(input)}
            disabled={loading || !input.trim()}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-r from-indigo-500 to-cyan-500 text-white disabled:opacity-40"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {loading ? (
              <motion.div
                className="h-4 w-4 rounded-full border-2 border-t-transparent"
                style={{ borderColor: "white", borderTopColor: "transparent" }}
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}
