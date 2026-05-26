"use client";

import React, { useRef, useEffect } from "react";
import { Send, CornerDownLeft } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChatInputProps {
  value: string;
  onChange: (val: string) => void;
  onSend: (text: string) => void;
  isLoading: boolean;
}

export default function ChatInput({
  value,
  onChange,
  onSend,
  isLoading,
}: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize the textarea based on text height
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 180)}px`;
  }, [value]);

  const handleSend = () => {
    if (!value.trim() || isLoading) return;
    onSend(value.trim());
    // Focus back on textarea after sending
    setTimeout(() => textareaRef.current?.focus(), 50);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const charLimit = 2000;
  const isLimitReached = value.length >= charLimit;

  return (
    <div className="relative flex flex-col gap-1.5 p-3 rounded-2xl border border-border bg-surface shadow-sm focus-within:border-brand-500 focus-within:ring-1 focus-within:ring-brand-500 transition-all duration-200">
      {/* Input Textarea */}
      <textarea
        ref={textareaRef}
        rows={1}
        value={value}
        onChange={(e) => onChange(e.target.value.slice(0, charLimit))}
        onKeyDown={handleKeyDown}
        placeholder={isLoading ? "Awaiting assistant response..." : "Ask a career question..."}
        disabled={isLoading}
        className="w-full bg-transparent pr-12 text-sm text-foreground placeholder:text-muted focus:outline-none resize-none min-h-[24px] max-h-[180px] py-1 leading-relaxed"
      />

      {/* Control Row */}
      <div className="flex items-center justify-between border-t border-border/50 pt-2 text-xs text-muted select-none">
        {/* Helper text on desktop */}
        <span className="hidden sm:inline-flex items-center gap-1">
          <CornerDownLeft className="h-3 w-3" />
          Press <kbd className="px-1 rounded bg-muted/10 font-mono text-[10px]">Enter</kbd> to send, <kbd className="px-1 rounded bg-muted/10 font-mono text-[10px]">Shift+Enter</kbd> for newline
        </span>
        <span className="sm:hidden" />

        <div className="flex items-center gap-3">
          {/* Character counter */}
          <span
            className={cn(
              "font-mono text-[11px]",
              isLimitReached ? "text-red-500 font-bold" : "text-muted"
            )}
          >
            {value.length}/{charLimit}
          </span>

          {/* Send Button */}
          <button
            onClick={handleSend}
            disabled={!value.trim() || isLoading}
            className={cn(
              "inline-flex h-8 w-8 items-center justify-center rounded-xl bg-brand-600 text-white hover:bg-brand-700 active:scale-95 transition-all shadow-sm cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
            )}
            aria-label="Send message"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
