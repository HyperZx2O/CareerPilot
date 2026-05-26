"use client";

import React, { useRef, useEffect } from "react";
import ChatMessage from "./ChatMessage";
import SuggestedPrompts from "./SuggestedPrompts";
import { Bot } from "lucide-react";
import type { ChatMessage as ChatMessageType } from "@/types";

interface ChatWindowProps {
  messages: ChatMessageType[];
  isLoading: boolean;
  onSelectPrompt: (prompt: string) => void;
}

export default function ChatWindow({
  messages,
  isLoading,
  onSelectPrompt,
}: ChatWindowProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on message list update or loading state change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  return (
    <div
      ref={scrollContainerRef}
      className="flex-1 overflow-y-auto px-4 py-2 space-y-4 min-h-[300px]"
    >
      {/* Empty State / Welcome Screen */}
      {messages.length === 0 && (
        <div className="flex flex-col gap-6 max-w-2xl mx-auto py-12 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 border border-brand-100 text-brand-600 mx-auto shadow-sm">
            <Bot className="h-8 w-8" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">
              Your Personal Career Copilot
            </h2>
            <p className="mt-2 text-sm text-muted max-w-md mx-auto">
              Ask me about your job readiness, skill gaps, or how to design a roadmap. My responses are contextually tailored to your uploaded CV.
            </p>
          </div>

          <div className="border-t border-border/50 pt-4 text-left">
            <SuggestedPrompts onSelectPrompt={onSelectPrompt} />
          </div>
        </div>
      )}

      {/* Message List */}
      {messages.map((message) => (
        <ChatMessage key={message.id} message={message} />
      ))}

      {/* Typing Indicator */}
      {isLoading && (
        <div className="flex w-full gap-3 py-4 animate-fade-in justify-start">
          <div className="flex h-9 w-9 shrink-0 select-none items-center justify-center rounded-xl bg-brand-50 border border-brand-100 text-brand-600">
            <Bot className="h-5 w-5" />
          </div>
          <div className="flex flex-col items-start gap-1">
            <div className="flex items-center gap-1.5 bg-surface border border-border px-4 py-3.5 rounded-2xl rounded-tl-none shadow-sm min-w-[70px]">
              <span className="h-2 w-2 rounded-full bg-brand-500 animate-pulse-dot" />
              <span className="h-2 w-2 rounded-full bg-brand-500 animate-pulse-dot [animation-delay:0.2s]" />
              <span className="h-2 w-2 rounded-full bg-brand-500 animate-pulse-dot [animation-delay:0.4s]" />
            </div>
            <span className="text-[10px] text-muted px-1">Thinking...</span>
          </div>
        </div>
      )}

      {/* Scroll Anchor */}
      <div ref={bottomRef} className="h-1" />
    </div>
  );
}
