"use client";

import { useState, useRef, useEffect, useCallback } from "react";

// ─── Types ───────────────────────────────────────────────────────────────────
interface Message {
  role: "user" | "assistant";
  text: string;
}

// ─── Sparkle icon (custom SVG) ───────────────────────────────────────────────
function SparkleIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
    >
      <path d="M12 2a.75.75 0 0 1 .75.75v2.5a.75.75 0 0 1-1.5 0v-2.5A.75.75 0 0 1 12 2ZM12 18.75a.75.75 0 0 1 .75.75v2.5a.75.75 0 0 1-1.5 0v-2.5a.75.75 0 0 1 .75-.75ZM2 12a.75.75 0 0 1 .75-.75h2.5a.75.75 0 0 1 0 1.5h-2.5A.75.75 0 0 1 2 12ZM18.75 12a.75.75 0 0 1 .75-.75h2.5a.75.75 0 0 1 0 1.5h-2.5a.75.75 0 0 1-.75-.75ZM5.636 5.636a.75.75 0 0 1 1.06 0l1.768 1.768a.75.75 0 0 1-1.06 1.06L5.636 6.697a.75.75 0 0 1 0-1.06ZM15.536 15.536a.75.75 0 0 1 1.06 0l1.768 1.768a.75.75 0 0 1-1.06 1.06l-1.768-1.768a.75.75 0 0 1 0-1.06ZM5.636 18.364a.75.75 0 0 1 0-1.06l1.768-1.769a.75.75 0 0 1 1.06 1.06l-1.768 1.769a.75.75 0 0 1-1.06 0ZM15.536 8.464a.75.75 0 0 1 0-1.06l1.768-1.768a.75.75 0 0 1 1.06 1.06l-1.768 1.768a.75.75 0 0 1-1.06 0ZM12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z" />
    </svg>
  );
}

// ─── Send icon ───────────────────────────────────────────────────────────────
function SendIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
    >
      <path d="M3.478 2.405a.75.75 0 0 0-.926.94l2.432 7.905H13.5a.75.75 0 0 1 0 1.5H4.984l-2.432 7.905a.75.75 0 0 0 .926.94 60.519 60.519 0 0 0 18.445-8.986.75.75 0 0 0 0-1.218A60.517 60.517 0 0 0 3.478 2.405Z" />
    </svg>
  );
}

// ─── Typing indicator ────────────────────────────────────────────────────────
function TypingDots() {
  return (
    <div className="flex items-center gap-1 px-4 py-3">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="w-2 h-2 rounded-full bg-[#D4AF37] animate-bounce"
          style={{ animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </div>
  );
}

// ─── Main widget ─────────────────────────────────────────────────────────────
export function AIChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      text: "أهلاً وسهلاً! 👋\nأنا وكيل لمسة إيفنس الذكي. كيف يمكنني مساعدتك في تنظيم مناسبتك الفاخرة؟",
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Scroll to bottom whenever messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  // Auto-focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || isLoading) return;

    setInput("");
    setMessages((prev) => [...prev, { role: "user", text }]);
    setIsLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });

      const data = await res.json();
      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: data.response ?? "عذراً، حدث خطأ. يرجى المحاولة مجدداً." },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: "عذراً، تعذّر الاتصال. يمكنك التواصل معنا على الواتساب: 0547498239 📲",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading]);

  // Submit on Enter (but Shift+Enter for newline)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <>
      {/* ── Floating Toggle Button ──────────────────────────────────────── */}
      <div className="fixed bottom-28 right-6 z-50 flex flex-col items-end gap-2">
        {/* Tooltip (only when closed) */}
        {!isOpen && (
          <div
            className="
              hidden sm:flex items-center gap-2 px-4 py-2 rounded-2xl
              bg-black/70 backdrop-blur-lg border border-[#D4AF37]/40
              shadow-[0_0_20px_rgba(212,175,55,0.25)]
              animate-pulse pointer-events-none
            "
          >
            <SparkleIcon className="w-4 h-4 text-[#D4AF37]" />
            <span className="text-[#F3E5AB] text-sm font-semibold whitespace-nowrap">
              اسأل وكيل لمسة إيفنس
            </span>
          </div>
        )}

        {/* Toggle button */}
        <button
          id="ai-chat-toggle"
          onClick={() => setIsOpen((v) => !v)}
          aria-label={isOpen ? "إغلاق المحادثة" : "فتح المحادثة مع وكيل لمسة إيفنس"}
          className="
            relative w-14 h-14 rounded-full flex items-center justify-center
            bg-gradient-to-br from-[#D4AF37] to-[#8B6914]
            shadow-[0_0_24px_rgba(212,175,55,0.5)]
            hover:shadow-[0_0_36px_rgba(212,175,55,0.7)]
            hover:scale-110 active:scale-95
            transition-all duration-300 focus:outline-none
          "
        >
          <SparkleIcon
            className={`absolute w-7 h-7 text-[#121212] transition-all duration-300 ${
              isOpen ? "rotate-180 scale-0 opacity-0" : "rotate-0 scale-100 opacity-100"
            }`}
          />
          {/* X icon */}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            className={`absolute w-6 h-6 text-[#121212] transition-all duration-300 ${
              isOpen ? "rotate-0 scale-100 opacity-100" : "-rotate-90 scale-0 opacity-0"
            }`}
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      {/* ── Chat Window ─────────────────────────────────────────────────── */}
      <div
        id="ai-chat-window"
        role="dialog"
        aria-label="محادثة وكيل لمسة إيفنس"
        aria-hidden={!isOpen}
        className={`
          fixed bottom-48 right-6 z-50
          w-[min(90vw,380px)]
          flex flex-col
          rounded-2xl overflow-hidden
          bg-[#0e0e0e]/95 backdrop-blur-2xl
          border border-[#D4AF37]/30
          shadow-[0_8px_60px_rgba(212,175,55,0.18),0_2px_20px_rgba(0,0,0,0.7)]
          transition-all duration-400 ease-out
          ${
            isOpen
              ? "opacity-100 translate-y-0 pointer-events-auto scale-100"
              : "opacity-0 translate-y-6 pointer-events-none scale-95"
          }
        `}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-l from-[#1a1400] to-[#0e0e0e] border-b border-[#D4AF37]/20">
          <div className="relative w-9 h-9 rounded-full bg-gradient-to-br from-[#D4AF37] to-[#8B6914] flex items-center justify-center flex-shrink-0 shadow-[0_0_12px_rgba(212,175,55,0.4)]">
            <SparkleIcon className="w-5 h-5 text-[#121212]" />
            {/* Online dot */}
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-[#0e0e0e]" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[#F3E5AB] font-bold text-sm leading-tight truncate">
              وكيل لمسة إيفنس
            </p>
            <p className="text-emerald-400 text-xs font-medium">متاح الآن</p>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            aria-label="إغلاق"
            className="w-7 h-7 rounded-full flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-all duration-200"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-4 h-4"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Messages area */}
        <div
          className="flex-1 overflow-y-auto p-4 space-y-3 max-h-[340px] scrollbar-thin scrollbar-track-transparent scrollbar-thumb-[#D4AF37]/20"
          style={{ direction: "rtl" }}
        >
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.role === "user" ? "justify-start" : "justify-end"}`}
            >
              <div
                className={`
                  max-w-[80%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-line
                  ${
                    msg.role === "user"
                      ? "bg-[#D4AF37]/15 text-white border border-[#D4AF37]/20 rounded-tr-sm"
                      : "bg-[#1c1600] text-[#F3E5AB] border border-[#D4AF37]/30 rounded-tl-sm shadow-[0_0_12px_rgba(212,175,55,0.08)]"
                  }
                `}
              >
                {msg.text}
              </div>
            </div>
          ))}

          {/* Typing indicator */}
          {isLoading && (
            <div className="flex justify-end">
              <div className="bg-[#1c1600] border border-[#D4AF37]/30 rounded-2xl rounded-tl-sm shadow-[0_0_12px_rgba(212,175,55,0.08)]">
                <TypingDots />
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Divider */}
        <div className="h-px bg-gradient-to-l from-transparent via-[#D4AF37]/30 to-transparent" />

        {/* Input area */}
        <div className="flex items-end gap-2 p-3 bg-[#0e0e0e]">
          <textarea
            ref={inputRef}
            id="ai-chat-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="اكتب رسالتك…"
            rows={1}
            disabled={isLoading}
            dir="auto"
            className="
              flex-1 resize-none rounded-xl px-3 py-2.5 text-sm
              bg-white/5 text-white placeholder-white/30
              border border-white/10 focus:border-[#D4AF37]/50
              focus:outline-none focus:ring-1 focus:ring-[#D4AF37]/30
              transition-all duration-200
              max-h-28 overflow-y-auto
              disabled:opacity-50
            "
            style={{
              scrollbarWidth: "none",
              direction: "rtl",
            }}
          />
          <button
            id="ai-chat-send"
            onClick={sendMessage}
            disabled={!input.trim() || isLoading}
            aria-label="إرسال"
            className="
              w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0
              bg-gradient-to-br from-[#D4AF37] to-[#8B6914]
              text-[#121212]
              hover:shadow-[0_0_16px_rgba(212,175,55,0.5)]
              hover:scale-105 active:scale-95
              disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:shadow-none
              transition-all duration-200
            "
          >
            <SendIcon className="w-4 h-4 rotate-180" />
          </button>
        </div>

        {/* Footer branding */}
        <div className="flex items-center justify-center gap-1.5 pb-2 pt-0.5">
          <span className="text-white/20 text-[10px]">مدعوم بالذكاء الاصطناعي •</span>
          <span className="text-[#D4AF37]/40 text-[10px] font-semibold">لمسة إيفنس</span>
        </div>
      </div>
    </>
  );
}
