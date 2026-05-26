"use client";

import React, { useState } from "react";
import ReactMarkdown from "react-markdown";
import { Copy, Check, Bot, User, FileText } from "lucide-react";
import { toast } from "react-hot-toast";
import { cn } from "@/lib/utils";
import type { ChatMessage as ChatMessageType } from "@/types";

interface ChatMessageProps {
  message: ChatMessageType;
}

export default function ChatMessage({ message }: ChatMessageProps) {
  const [copied, setCopied] = useState(false);
  const isAssistant = message.role === "assistant";

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      toast.success("Copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy text.");
    }
  };

  return (
    <div
      className={cn(
        "flex w-full gap-3 py-4 animate-fade-in group",
        isAssistant ? "justify-start" : "justify-end"
      )}
    >
      {/* Avatar for Assistant */}
      {isAssistant && (
        <div className="flex h-9 w-9 shrink-0 select-none items-center justify-center rounded-xl bg-brand-50 border border-brand-100 text-brand-600">
          <Bot className="h-5 w-5" />
        </div>
      )}

      {/* Message Bubble & Citations */}
      <div
        className={cn(
          "flex flex-col max-w-[85%] sm:max-w-[75%] gap-2",
          isAssistant ? "items-start" : "items-end"
        )}
      >
        {/* Bubble content wrapper */}
        <div
          className={cn(
            "relative px-4 py-3 rounded-2xl shadow-sm text-sm border",
            isAssistant
              ? "bg-surface border-border text-foreground rounded-tl-none"
              : "bg-brand-600 border-brand-700 text-white rounded-tr-none"
          )}
        >
          {/* Markdown Content */}
          <div className="prose prose-sm dark:prose-invert max-w-none">
            {isAssistant ? (
              <ReactMarkdown
                components={{
                  h1: ({ ...props }) => <h1 className="text-base font-bold mt-2 mb-1 text-foreground" {...props} />,
                  h2: ({ ...props }) => <h2 className="text-sm font-bold mt-2 mb-1 text-foreground" {...props} />,
                  h3: ({ ...props }) => <h3 className="text-xs font-bold mt-1.5 mb-1 text-foreground animate-pulse" {...props} />,
                  p: ({ ...props }) => <p className="mb-2 last:mb-0 leading-relaxed" {...props} />,
                  ul: ({ ...props }) => <ul className="list-disc pl-4 mb-2 space-y-1" {...props} />,
                  ol: ({ ...props }) => <ol className="list-decimal pl-4 mb-2 space-y-1" {...props} />,
                  li: ({ ...props }) => <li className="mb-0.5" {...props} />,
                  strong: ({ ...props }) => <strong className="font-semibold text-brand-600 dark:text-brand-300" {...props} />,
                  code: ({ ...props }) => <code className="bg-brand-50/50 dark:bg-slate-800 text-brand-700 dark:text-brand-300 px-1 rounded font-mono text-xs" {...props} />,
                }}
              >
                {message.content}
              </ReactMarkdown>
            ) : (
              <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
            )}
          </div>

          {/* Copy Button (Only for Assistant messages, shown on bubble hover or focus) */}
          {isAssistant && (
            <button
              onClick={handleCopy}
              className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg bg-surface border border-border text-muted hover:text-foreground hover:bg-brand-50 hover:border-brand-300 cursor-pointer"
              title="Copy message"
              aria-label="Copy message to clipboard"
            >
              {copied ? (
                <Check className="h-3.5 w-3.5 text-green-600" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
            </button>
          )}
        </div>

        {/* Sources/Citations Row */}
        {isAssistant && message.sources && message.sources.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 mt-1 px-1">
            <span className="text-[10px] uppercase font-semibold tracking-wider text-muted mr-1">
              Sources used:
            </span>
            {message.sources.map((source, idx) => (
              <span
                key={idx}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-brand-50 border border-brand-100 text-[11px] font-medium text-brand-700 capitalize transition-all hover:bg-brand-100/50"
              >
                <FileText className="h-3 w-3 text-brand-500" />
                {source.replace("_", " ")}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Avatar for User */}
      {!isAssistant && (
        <div className="flex h-9 w-9 shrink-0 select-none items-center justify-center rounded-xl bg-surface border border-border text-muted">
          <User className="h-5 w-5" />
        </div>
      )}
    </div>
  );
}
