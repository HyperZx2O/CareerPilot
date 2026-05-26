"use client";

import React from "react";
import { Sparkles } from "lucide-react";

interface SuggestedPromptsProps {
  onSelectPrompt: (prompt: string) => void;
}

export default function SuggestedPrompts({ onSelectPrompt }: SuggestedPromptsProps) {
  const prompts = [
    "Am I ready for a data engineer role?",
    "What skills am I missing for a Google internship?",
    "Build me a 3-month roadmap to become job-ready",
    "Draft a cover letter for [paste job here]",
  ];

  return (
    <div className="flex flex-col gap-3 py-4 animate-fade-in">
      <div className="flex items-center gap-2 text-xs font-semibold text-brand-600 uppercase tracking-wider">
        <Sparkles className="h-4 w-4 text-brand-500 animate-pulse" />
        Suggested Prompts
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {prompts.map((prompt, idx) => (
          <button
            key={idx}
            onClick={() => onSelectPrompt(prompt)}
            className="text-left p-4 rounded-xl border border-border bg-surface hover:bg-brand-50 hover:border-brand-500 hover:shadow-sm transition-all duration-200 text-sm text-foreground cursor-pointer group"
          >
            <span className="font-medium group-hover:text-brand-700 transition-colors">
              {prompt}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
