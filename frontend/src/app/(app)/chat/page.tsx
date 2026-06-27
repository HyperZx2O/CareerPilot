/* Hallmark · genre: modern-minimal · macrostructure: Workbench · design-system: design.md · designed-as-app
 * nav: N3 side-rail · theme: Cobalt
 * section head: S4 inline · CTA: C2 inline form
 */
"use client";

import { useState, useRef, useEffect, lazy, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useUser } from "@clerk/nextjs";
import { sendChatMessage, getChatHistory } from "@/lib/api";
import type { ChatMessage } from "@/types";
import { Send, Bot, User, RefreshCw } from "lucide-react";

const MarkdownRenderer = lazy(() => import("./MarkdownRenderer"));

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
    <motion.div className="flex items-center gap-2 px-1" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="flex h-6 w-6 items-center justify-center rounded-full" style={{ background: "var(--color-paper-2)" }}>
        <Bot className="h-3 w-3" style={{ color: "var(--color-text-muted)" }} />
      </div>
      <div className="flex gap-1">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="block h-1.5 w-1.5 rounded-full"
            style={{ background: "var(--color-text-dim)" }}
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
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: index * 0.03 }}
      className={`flex items-start gap-2 ${isUser ? "flex-row-reverse" : "flex-row"}`}
    >
      <div
        className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full"
        style={{ background: isUser ? "var(--color-accent)" : "var(--color-paper-2)" }}
      >
        {isUser ? <User className="h-3.5 w-3.5 text-white" /> : <Bot className="h-3.5 w-3.5" style={{ color: "var(--color-text-muted)" }} />}
      </div>
      <div className={`max-w-[75%] ${isUser ? "items-end" : "items-start"} flex flex-col gap-0.5`}>
        <div
          className="rounded-xl px-3.5 py-2.5 text-sm leading-relaxed"
          style={{
            background: isUser ? "var(--color-accent)" : "var(--color-paper)",
            color: isUser ? "#fff" : "var(--color-text)",
            border: isUser ? "none" : "1px solid var(--color-border)",
          }}
        >
          {isUser ? (
            msg.content
          ) : (
            <Suspense fallback={<span className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</span>}>
              <MarkdownRenderer content={msg.content} />
            </Suspense>
          )}
        </div>
        {msg.sources && msg.sources.length > 0 && !isUser && (
          <div className="mt-1 flex flex-wrap gap-1 px-1">
            {msg.sources.map((src) => (
              <span key={src} className="rounded-full px-2 py-0.5 text-[10px]" style={{ background: "var(--color-paper-2)", color: "var(--color-text-dim)" }}>{src}</span>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}

function SuggestionStrip({ items, onSelect }: { items: string[]; onSelect: (text: string) => void }) {
  return (
    <motion.div
      className="flex gap-2 overflow-x-auto pb-1"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
    >
      {items.map((text) => (
        <motion.button
          key={text}
          onClick={() => onSelect(text)}
          className="shrink-0 rounded-xl border px-3.5 py-2 text-left text-xs whitespace-nowrap transition-all"
          style={{ borderColor: "var(--color-border)", color: "var(--color-text-muted)", background: "var(--color-paper)" }}
          whileHover={{ borderColor: "var(--color-accent)", color: "var(--color-accent)" }}
          whileTap={{ scale: 0.97 }}
        >
          {text}
        </motion.button>
      ))}
    </motion.div>
  );
}

export default function ChatPage() {
  const { user } = useUser();
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Hey! I'm your CareerPilot AI assistant. I've analyzed your CV and I'm ready to help.\n\nWhat would you like to explore?",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const history = await getChatHistory(user?.id || "demo_user_123");
        if (cancelled || !history || history.length === 0) return;
        setMessages(history.map((m) => ({ role: m.role as "user" | "assistant", content: m.content })));
        setShowSuggestions(false);
      } catch {}
    })();
    return () => { cancelled = true; };
  }, []);

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
      setMessages((prev) => [...prev, { role: "assistant", content: answer, sources }]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Sorry, I couldn't process that. Please try again.";
      setMessages((prev) => [...prev, { role: "assistant", content: msg }]);
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
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl" style={{ fontFamily: "var(--font-display)", color: "var(--color-text)" }}>AI Career Chat</h1>
          <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>Responses grounded in your uploaded CV</p>
        </div>
        <motion.button
          onClick={() => {
            setMessages([{ role: "assistant", content: "Hey! I'm your CareerPilot AI assistant. I've analyzed your CV and I'm ready to help.\n\nWhat would you like to explore?" }]);
            setShowSuggestions(true);
          }}
          className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium"
          style={{ borderColor: "var(--color-border)", color: "var(--color-text-muted)" }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <RefreshCw className="h-3.5 w-3.5" />
          New chat
        </motion.button>
      </div>

      <div className="flex-1 overflow-y-auto pb-3">
        <div className="space-y-3">
          <AnimatePresence>
            {messages.map((msg, i) => (
              <MessageBubble key={i} msg={msg} index={i} />
            ))}
          </AnimatePresence>
          {loading && <TypingIndicator />}
          <div ref={bottomRef} />
        </div>

        <AnimatePresence>
          {showSuggestions && messages.length <= 2 && (
            <div className="mt-5 space-y-2">
              <p className="text-xs font-medium" style={{ color: "var(--color-text-dim)" }}>Try asking</p>
              <SuggestionStrip items={SUGGESTIONS} onSelect={handleSend} />
            </div>
          )}
        </AnimatePresence>
      </div>

      <motion.div
        className="rounded-xl border"
        style={{ background: "var(--color-paper)", borderColor: "var(--color-border)" }}
      >
        <div className="flex items-end gap-2 p-2.5">
          <textarea
            ref={textareaRef}
            className="flex-1 resize-none bg-transparent px-2 py-1.5 text-sm outline-none"
            style={{ color: "var(--color-text)", maxHeight: "120px" }}
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
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white disabled:opacity-40"
            style={{ background: "var(--color-accent)" }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {loading ? (
              <motion.div className="h-4 w-4 rounded-full border-2 border-t-transparent" style={{ borderColor: "white", borderTopColor: "transparent" }} animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}
