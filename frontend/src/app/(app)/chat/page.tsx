"use client";

import React, { useState, useEffect } from "react";
import { useAppStore } from "@/store/useAppStore";
import {
  createSession,
  sendChat,
  getChatHistory,
  getCVSections,
} from "@/lib/api";
import ChatWindow from "@/components/Chat/ChatWindow";
import ChatInput from "@/components/Chat/ChatInput";
import { toast } from "react-hot-toast";
import {
  Info,
  FileText,
  UserCheck,
  RefreshCw,
  AlertCircle,
} from "lucide-react";
import type { ChatMessage as ChatMessageType } from "@/types";

export default function ChatPage() {
  const { cvId, sessionId, setSessionId } = useAppStore();
  const [messages, setMessages] = useState<ChatMessageType[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // CV Grounding Context state
  const [cvSections, setCvSections] = useState<Record<string, string> | null>(null);
  const [isLoadingSections, setIsLoadingSections] = useState(false);
  const [expandedSection, setExpandedSection] = useState<string | null>("skills");

  // 1. Initialize session on mount if missing
  useEffect(() => {
    async function initSession() {
      if (!sessionId) {
        try {
          const res = await createSession();
          setSessionId(res.session_id);
        } catch {
          toast.error("Failed to initialize chat session.");
        }
      }
    }
    initSession();
  }, [sessionId, setSessionId]);

  // 2. Fetch chat history once session is set
  useEffect(() => {
    async function fetchHistory() {
      if (!sessionId) return;
      setIsLoadingHistory(true);
      try {
        const history = await getChatHistory(sessionId);
        setMessages(history);
      } catch {
        toast.error("Failed to load chat history.");
      } finally {
        setIsLoadingHistory(false);
      }
    }
    fetchHistory();
  }, [sessionId]);

  // 3. Fetch CV Sections for the grounding panel
  useEffect(() => {
    async function fetchCVSections() {
      if (!cvId) return;
      setIsLoadingSections(true);
      try {
        const sections = await getCVSections(cvId);
        setCvSections(sections);
      } catch (err) {
        console.error("Failed to load CV sections for grounding panel:", err);
      } finally {
        setIsLoadingSections(false);
      }
    }
    fetchCVSections();
  }, [cvId]);

  // 4. Handle sending a message
  const handleSendMessage = async (text: string) => {
    if (!text.trim() || isSending || !sessionId || !cvId) {
      if (!cvId) {
        toast.error("Please upload a CV to chat with the assistant.");
      }
      return;
    }

    const userMessage: ChatMessageType = {
      id: `msg-user-${Math.random().toString(36).substring(2, 9)}`,
      session_id: sessionId,
      role: "user",
      content: text,
      sources: [],
      query_type: null,
      created_at: new Date().toISOString(),
    };

    // Optimistic update
    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setIsSending(true);

    try {
      const res = await sendChat(text, sessionId, cvId);
      
      const assistantMessage: ChatMessageType = {
        id: `msg-assistant-${Math.random().toString(36).substring(2, 9)}`,
        session_id: sessionId,
        role: "assistant",
        content: res.reply,
        sources: res.sources,
        query_type: null, // query type is determined on backend/mock layer
        created_at: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch {
      toast.error("Failed to receive response from assistant.");
    } finally {
      setIsSending(false);
    }
  };

  // 5. Populate suggested prompt into the input field
  const handleSelectPrompt = (prompt: string) => {
    setInputValue(prompt);
  };

  return (
    <div className="flex flex-col gap-4 animate-fade-in h-[calc(100vh-140px)] overflow-hidden">
      {/* Informational Grounding Banner */}
      <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl border border-brand-100 bg-brand-50 text-brand-700 text-xs shrink-0 select-none shadow-sm">
        <Info className="h-4 w-4 text-brand-500 shrink-0" />
        <span className="font-medium flex-1">
          Responses are grounded in your uploaded CV. Upload a new CV to update your profile.
        </span>
      </div>

      {/* Main Split Layout */}
      <div className="flex flex-1 gap-5 overflow-hidden">
        {/* Left Panel: Chat Stream (70% on lg, 100% on small) */}
        <div className="flex-1 flex flex-col border border-border bg-surface/50 rounded-2xl overflow-hidden shadow-sm h-full">
          {/* Chat Stream Header */}
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-border/80 bg-surface shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="h-2 w-2 rounded-full bg-green-500 animate-ping" />
              <span className="text-sm font-semibold text-foreground">
                AI Career Copilot
              </span>
            </div>
            {sessionId && (
              <span className="text-[10px] font-mono text-muted uppercase tracking-wider">
                Session: {sessionId.slice(0, 12)}...
              </span>
            )}
          </div>

          {/* Chat Area */}
          <div className="flex-1 overflow-hidden flex flex-col bg-background/30">
            {isLoadingHistory ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-2">
                <RefreshCw className="h-6 w-6 text-brand-500 animate-spin" />
                <span className="text-xs text-muted">Retrieving conversation memory...</span>
              </div>
            ) : (
              <ChatWindow
                messages={messages}
                isLoading={isSending}
                onSelectPrompt={handleSelectPrompt}
              />
            )}
          </div>

          {/* Input Bar */}
          <div className="p-4 border-t border-border/80 bg-surface shrink-0">
            <ChatInput
              value={inputValue}
              onChange={setInputValue}
              onSend={handleSendMessage}
              isLoading={isSending}
            />
          </div>
        </div>

        {/* Right Panel: CV Profile Context details (30% on lg, hidden on small) */}
        <div className="hidden lg:flex flex-col w-[340px] border border-border bg-surface/50 rounded-2xl overflow-hidden shrink-0 shadow-sm h-full">
          <div className="px-5 py-4 border-b border-border bg-surface flex items-center gap-2">
            <FileText className="h-4.5 w-4.5 text-brand-600" />
            <h2 className="text-sm font-semibold text-foreground">
              CV Profile Context
            </h2>
          </div>

          {/* CV Section Viewer */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {isLoadingSections ? (
              <div className="h-full flex flex-col items-center justify-center gap-2">
                <RefreshCw className="h-5 w-5 text-muted animate-spin" />
                <span className="text-xs text-muted">Parsing CV context...</span>
              </div>
            ) : cvSections ? (
              <div className="space-y-3.5">
                <div className="flex items-center gap-2 p-3 rounded-xl bg-brand-50/50 border border-brand-100/60 text-brand-700 text-xs">
                  <UserCheck className="h-4 w-4 text-brand-500" />
                  <span className="font-semibold">Contextual Grounding Enabled</span>
                </div>

                {Object.entries(cvSections).map(([key, content]) => {
                  const isExpanded = expandedSection === key;
                  return (
                    <div
                      key={key}
                      className="border border-border rounded-xl bg-surface/80 overflow-hidden shadow-2xs transition-all duration-200"
                    >
                      <button
                        onClick={() => setExpandedSection(isExpanded ? null : key)}
                        className="w-full flex items-center justify-between px-4 py-3 text-xs font-bold text-foreground hover:bg-brand-50/20 text-left uppercase tracking-wider cursor-pointer border-b border-border"
                      >
                        <span className="capitalize">{key}</span>
                        <span className="text-muted text-[10px]">
                          {isExpanded ? "Collapse" : "Expand"}
                        </span>
                      </button>
                      
                      {isExpanded && (
                        <div className="p-3.5 text-xs text-muted bg-background/50 max-h-[220px] overflow-y-auto whitespace-pre-wrap font-sans leading-relaxed">
                          {content}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 gap-2">
                <AlertCircle className="h-8 w-8 text-muted" />
                <p className="text-xs font-medium text-foreground">
                  No active CV found
                </p>
                <p className="text-[11px] text-muted max-w-[200px]">
                  Upload a resume on the dashboard to enable grounding.
                </p>
              </div>
            )}
          </div>

          {/* Footer Metadata */}
          <div className="p-3.5 bg-surface border-t border-border text-center shrink-0">
            <span className="text-[10px] text-muted">
              RAG grounding active &bull; local storage persist
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
