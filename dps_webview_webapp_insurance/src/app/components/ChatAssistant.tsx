"use client";

import React, { useState, useRef, useEffect } from "react";
import { 
  MessageCircle, 
  X, 
  Send, 
  Bot
} from "lucide-react";
import { LiquidGlassContainer } from "./LiquidGlass";

interface Message {
  id: string;
  sender: "bot" | "user";
  text: string;
  time: string;
}

export default function ChatAssistant({
  isOpen,
  onToggle,
}: {
  isOpen: boolean;
  onToggle: () => void;
  onOpenQuote?: () => void;
}) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      sender: "bot",
      text: "Hey! 👋 I'm Nova, your zero-BS insurance buddy. Got questions about gadgets, apartment coverage, or filing a lightning claim? Ask me anything!",
      time: "Just now",
    },
  ]);
  const [inputVal, setInputVal] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const nextId = useRef(2);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const quickQuestions = [
    { label: "⚡ How fast are claims?", query: "How fast do claims get paid out?" },
    { label: "📱 Is screen cracking covered?", query: "Does gadget insurance cover dropped cracked screens?" },
    { label: "🛡️ What is DPS Native Bridge?", query: "How does the DPS Super App bridge work?" },
    { label: "💸 Can I cancel anytime?", query: "Is there a lock-in contract or cancellation fee?" },
  ];

  const handleSend = (textToSend?: string) => {
    const text = textToSend || inputVal.trim();
    if (!text) return;

    const userMsgId = String(nextId.current++);
    const userMsg: Message = {
      id: userMsgId,
      sender: "user",
      text: text,
      time: "Just now",
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInputVal("");
    setIsTyping(true);

    // Bot response logic
    setTimeout(() => {
      let reply = "I'm right here with you! You can customize your plan or get protected in under 90 seconds using our quote builder.";
      const lower = text.toLowerCase();

      if (lower.includes("claim") || lower.includes("fast") || lower.includes("payout")) {
        reply = "Lightning fast! Over 85% of claims are approved in ~8 minutes. Once approved, the cash goes straight to your DPS Super App wallet — no waiting for checks or bank wires.";
      } else if (lower.includes("screen") || lower.includes("drop") || lower.includes("crack") || lower.includes("phone")) {
        reply = "Yes, 100%! Dropped it on concrete? Spilled matcha latte on your keyboard? Accidental drops and liquid damage are fully covered under Tech & Gear.";
      } else if (lower.includes("bridge") || lower.includes("dps") || lower.includes("sensor")) {
        reply = "The DPS Native Bridge lets Nova talk directly to your phone's camera, GPS, and biometrics. You can submit damage photos with 1 tap and sign contracts with FaceID!";
      } else if (lower.includes("cancel") || lower.includes("fee") || lower.includes("contract")) {
        reply = "Zero lock-in! No 12-month traps, no cancellation fees, and no awkward sales calls. You can cancel or pause anytime directly in the app.";
      } else if (lower.includes("price") || lower.includes("cost") || lower.includes("quote")) {
        reply = "Plans start as low as $8/month for tech and $12/month for apartment renters. Hit 'Get Instant Quote' to see your exact price in 60 seconds!";
      }

      const botMsgId = String(nextId.current++);
      const botMsg: Message = {
        id: botMsgId,
        sender: "bot",
        text: reply,
        time: "Just now",
      };

      setMessages((prev) => [...prev, botMsg]);
      setIsTyping(false);
    }, 800);
  };

  return (
    <>
      {/* Floating Liquid Glass Launcher Button */}
      <div className="fixed bottom-6 right-6 z-40">
        <button
          onClick={onToggle}
          aria-label="Open Chat Assistant"
          className="relative group p-4 rounded-full liquid-glass-accent-btn shadow-2xl transition-transform hover:scale-105 active:scale-95 cursor-pointer flex items-center gap-2.5"
        >
          {isOpen ? (
            <X className="w-6 h-6" />
          ) : (
            <>
              <MessageCircle className="w-6 h-6" />
              <span className="hidden sm:inline font-bold text-xs pr-1">Chat with Nova</span>
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-emerald-400 border-2 border-white dark:border-slate-900 animate-pulse" />
            </>
          )}
        </button>
      </div>

      {/* Liquid Glass Chat Popover Window */}
      {isOpen && (
        <div className="fixed bottom-22 right-4 sm:right-6 w-[calc(100vw-2rem)] sm:w-96 max-h-[560px] h-[520px] z-50 flex flex-col overflow-hidden animate-in slide-in-from-bottom-5">
          <LiquidGlassContainer
            variant="rounded"
            className="w-full h-full flex flex-col overflow-hidden shadow-2xl border border-white/50 dark:border-slate-700/80"
          >
            {/* Header */}
            <div className="p-4 bg-gradient-to-r from-violet-600/90 to-indigo-600/90 text-white flex items-center justify-between backdrop-blur-md">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center font-bold text-sm shadow-inner">
                  ⚡
                </div>
                <div>
                  <div className="font-extrabold text-sm flex items-center gap-1.5">
                    <span>Nova AI Support</span>
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  </div>
                  <div className="text-[11px] text-violet-200 font-medium">
                    Liquid Glass AI Assistant
                  </div>
                </div>
              </div>
              <button
                onClick={onToggle}
                className="p-1.5 rounded-full hover:bg-white/20 transition-colors text-violet-200 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Messages Container */}
            <div className="flex-1 p-4 overflow-y-auto space-y-3 text-xs">
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`flex gap-2.5 ${m.sender === "user" ? "justify-end" : "justify-start"}`}
                >
                  {m.sender === "bot" && (
                    <div className="w-7 h-7 rounded-full liquid-glass-nested text-violet-600 dark:text-violet-400 flex items-center justify-center font-bold text-xs shrink-0">
                      <Bot className="w-4 h-4" />
                    </div>
                  )}
                  <div
                    className={`max-w-[78%] p-3.5 rounded-2xl leading-relaxed ${
                      m.sender === "user"
                        ? "liquid-glass-accent-btn text-white rounded-tr-xs"
                        : "liquid-glass-nested text-slate-800 dark:text-slate-200 rounded-tl-xs"
                    }`}
                  >
                    {m.text}
                    <div
                      className={`text-[9px] mt-1 text-right ${
                        m.sender === "user" ? "text-violet-200" : "text-slate-400"
                      }`}
                    >
                      {m.time}
                    </div>
                  </div>
                </div>
              ))}

              {isTyping && (
                <div className="flex gap-2 items-center text-slate-400 text-xs">
                  <div className="w-6 h-6 rounded-full liquid-glass-nested text-violet-600 flex items-center justify-center">
                    <Bot className="w-3.5 h-3.5" />
                  </div>
                  <div className="p-2.5 rounded-2xl liquid-glass-nested flex gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-bounce" />
                    <span className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-bounce [animation-delay:0.2s]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-bounce [animation-delay:0.4s]" />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Quick Questions Chips */}
            <div className="p-2.5 liquid-glass-nested border-t border-white/20 dark:border-slate-800 flex gap-1.5 overflow-x-auto no-scrollbar">
              {quickQuestions.map((q, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSend(q.query)}
                  className="shrink-0 px-3 py-1 rounded-full text-[10px] font-bold liquid-glass-btn text-slate-700 dark:text-slate-300 hover:text-violet-600 transition-colors cursor-pointer"
                >
                  {q.label}
                </button>
              ))}
            </div>

            {/* Chat Input */}
            <div className="p-3 border-t border-white/20 dark:border-slate-800 flex items-center gap-2">
              <input
                type="text"
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSend();
                }}
                placeholder="Ask anything in plain English..."
                className="flex-1 text-xs p-2.5 rounded-xl liquid-glass-nested text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
              <button
                onClick={() => handleSend()}
                disabled={!inputVal.trim()}
                className="p-2.5 rounded-xl liquid-glass-accent-btn transition-transform active:scale-95 disabled:opacity-40 cursor-pointer"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </LiquidGlassContainer>
        </div>
      )}
    </>
  );
}
