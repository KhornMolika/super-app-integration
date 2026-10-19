"use client";

import React from "react";
import Link from "next/link";
import { SearchIcon } from "@/components/ui/Icons";
import { Section } from "@/types";

interface GuidelinesSidebarProps {
  sections: Section[];
  activeSection: string;
  setActiveSection: (id: string) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  activeMethodTab: "webview" | "flutter" | "native" | "deeplink";
  setActiveMethodTab: (tab: "webview" | "flutter" | "native" | "deeplink") => void;
}

export function GuidelinesSidebar({
  activeSection,
  setActiveSection,
  searchQuery,
  setSearchQuery,
  activeMethodTab,
  setActiveMethodTab,
}: GuidelinesSidebarProps) {
  return (
    <aside className="w-80 border-r border-slate-200 dark:border-slate-800/80 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md overflow-y-auto no-scrollbar [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] shrink-0 flex flex-col py-6 px-4 relative z-10 select-none">
      {/* Search Bar */}
      <div className="relative mb-6 px-0.5">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search guidelines..."
          className="w-full pl-9 pr-9 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1.5 focus:ring-brand-500 transition-all shadow-none"
        />
        <div className="absolute left-3 top-2.5 text-slate-400 w-4 h-4 pointer-events-none">
          <SearchIcon />
        </div>
        {searchQuery ? (
          <button
            onClick={() => setSearchQuery("")}
            className="absolute right-3 top-2.5 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            ✕
          </button>
        ) : (
          <span className="absolute right-3 top-2.5 text-xs font-mono text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-slate-800 rounded px-1.5">
            /
          </span>
        )}
      </div>

      {/* Structured Navigation Tree */}
      <div className="space-y-6">
        {/* Category 1: GETTING STARTED */}
        <div>
          <div className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider px-3 mb-2 flex items-center justify-between">
            <span>Getting Started</span>
            <span className="text-[10px] font-mono text-slate-400/70">01-02</span>
          </div>
          <nav className="space-y-1">
            {[
              { id: "overview", num: "01", title: "Overview & Roles" },
              { id: "general-requirements", num: "02", title: "General Requirements" },
            ].map((item) => {
              const isActive = activeSection === item.id;
              return (
                <a
                  key={item.id}
                  href={`#${item.id}`}
                  onClick={() => setActiveSection(item.id)}
                  className={`flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium border-l-2 transition-all ${
                    isActive
                      ? "border-brand-500 bg-brand-50/80 dark:bg-brand-500/10 text-brand-600 dark:text-brand-400 font-semibold"
                      : "border-transparent text-slate-600 dark:text-slate-400 hover:bg-slate-100/70 dark:hover:bg-slate-800/40 hover:text-slate-900 dark:hover:text-slate-200"
                  }`}
                >
                  <span
                    className={`font-mono text-xs ${
                      isActive ? "text-brand-500 dark:text-brand-400 font-bold" : "text-slate-400 dark:text-slate-500"
                    }`}
                  >
                    {item.num}
                  </span>
                  <span className="truncate">{item.title}</span>
                </a>
              );
            })}
          </nav>
        </div>

        {/* Category 2: ARCHITECTURE & PROTOCOLS */}
        <div>
          <div className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider px-3 mb-2 flex items-center justify-between">
            <span>Integration Architecture</span>
            <span className="text-[10px] font-mono text-slate-400/70">03-06</span>
          </div>
          <nav className="space-y-1">
            {/* 03 SDK Contract */}
            <a
              href="#sdk-contract"
              onClick={() => setActiveSection("sdk-contract")}
              className={`flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium border-l-2 transition-all ${
                activeSection === "sdk-contract"
                  ? "border-brand-500 bg-brand-50/80 dark:bg-brand-500/10 text-brand-600 dark:text-brand-400 font-semibold"
                  : "border-transparent text-slate-600 dark:text-slate-400 hover:bg-slate-100/70 dark:hover:bg-slate-800/40 hover:text-slate-900 dark:hover:text-slate-200"
              }`}
            >
              <span
                className={`font-mono text-xs ${
                  activeSection === "sdk-contract"
                    ? "text-brand-500 dark:text-brand-400 font-bold"
                    : "text-slate-400 dark:text-slate-500"
                }`}
              >
                03
              </span>
              <span className="truncate">MiniApp SDK Contract</span>
            </a>

            {/* 04 Methods (Expandable sub-tree) */}
            <div className="space-y-1 pt-0.5">
              <a
                href="#methods"
                onClick={() => setActiveSection("methods")}
                className={`flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium border-l-2 transition-all ${
                  activeSection === "methods"
                    ? "border-brand-500 bg-brand-50/80 dark:bg-brand-500/10 text-brand-600 dark:text-brand-400 font-semibold"
                    : "border-transparent text-slate-600 dark:text-slate-400 hover:bg-slate-100/70 dark:hover:bg-slate-800/40 hover:text-slate-900 dark:hover:text-slate-200"
                }`}
              >
                <span
                  className={`font-mono text-xs ${
                    activeSection === "methods"
                      ? "text-brand-500 dark:text-brand-400 font-bold"
                      : "text-slate-400 dark:text-slate-500"
                  }`}
                >
                  04
                </span>
                <span className="truncate">Integration Methods</span>
              </a>

              {/* Sub-tabs for Methods */}
              <div className="pl-6 space-y-1 py-1 border-l border-slate-200/60 dark:border-slate-800/60 ml-4">
                {[
                  { id: "webview", label: "WebView & Verify", badge: "Web" },
                  { id: "flutter", label: "Flutter Package", badge: "Flutter" },
                  { id: "native", label: "Native SDK (AAR/ZIP)", badge: "Native" },
                  { id: "deeplink", label: "Deep Link Protocol", badge: "URI" },
                ].map((sub) => {
                  const isCurrent = activeMethodTab === sub.id && activeSection === "methods";
                  return (
                    <button
                      key={sub.id}
                      type="button"
                      onClick={() => {
                        setActiveMethodTab(sub.id as any);
                        setActiveSection("methods");
                        const el = document.getElementById("methods");
                        if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
                      }}
                      className={`w-full text-left px-3 py-1.5 rounded-lg text-xs font-medium flex items-center justify-between transition-colors ${
                        isCurrent
                          ? "text-brand-600 dark:text-brand-400 font-bold bg-brand-50/60 dark:bg-brand-950/40"
                          : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-300"
                      }`}
                    >
                      <span className="truncate">{sub.label}</span>
                      <span className="text-[10px] font-mono opacity-70 uppercase">{sub.badge}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 05 Capabilities Catalog */}
            <a
              href="#capabilities"
              onClick={() => setActiveSection("capabilities")}
              className={`flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium border-l-2 transition-all ${
                activeSection === "capabilities"
                  ? "border-brand-500 bg-brand-50/80 dark:bg-brand-500/10 text-brand-600 dark:text-brand-400 font-semibold"
                  : "border-transparent text-slate-600 dark:text-slate-400 hover:bg-slate-100/70 dark:hover:bg-slate-800/40 hover:text-slate-900 dark:hover:text-slate-200"
              }`}
            >
              <span
                className={`font-mono text-xs ${
                  activeSection === "capabilities"
                    ? "text-brand-500 dark:text-brand-400 font-bold"
                    : "text-slate-400 dark:text-slate-500"
                }`}
              >
                05
              </span>
              <span className="truncate">Capabilities Catalog</span>
            </a>

            {/* 06 Security Gates */}
            <a
              href="#security-checkpoints"
              onClick={() => setActiveSection("security-checkpoints")}
              className={`flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium border-l-2 transition-all ${
                activeSection === "security-checkpoints"
                  ? "border-brand-500 bg-brand-50/80 dark:bg-brand-500/10 text-brand-600 dark:text-brand-400 font-semibold"
                  : "border-transparent text-slate-600 dark:text-slate-400 hover:bg-slate-100/70 dark:hover:bg-slate-800/40 hover:text-slate-900 dark:hover:text-slate-200"
              }`}
            >
              <span
                className={`font-mono text-xs ${
                  activeSection === "security-checkpoints"
                    ? "text-brand-500 dark:text-brand-400 font-bold"
                    : "text-slate-400 dark:text-slate-500"
                }`}
              >
                06
              </span>
              <span className="truncate">Security Gates</span>
            </a>
          </nav>
        </div>

        {/* Category 3: OPERATIONS & GOVERNANCE */}
        <div>
          <div className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider px-3 mb-2 flex items-center justify-between">
            <span>Operations &amp; Support</span>
            <span className="text-[10px] font-mono text-slate-400/70">07-08</span>
          </div>
          <nav className="space-y-1">
            {[
              { id: "validation-lifecycle", num: "07", title: "Validation Lifecycle (10 States)" },
              { id: "troubleshooting", num: "08", title: "Troubleshooting & Remedies" },
            ].map((item) => {
              const isActive = activeSection === item.id;
              return (
                <a
                  key={item.id}
                  href={`#${item.id}`}
                  onClick={() => setActiveSection(item.id)}
                  className={`flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium border-l-2 transition-all ${
                    isActive
                      ? "border-brand-500 bg-brand-50/80 dark:bg-brand-500/10 text-brand-600 dark:text-brand-400 font-semibold"
                      : "border-transparent text-slate-600 dark:text-slate-400 hover:bg-slate-100/70 dark:hover:bg-slate-800/40 hover:text-slate-900 dark:hover:text-slate-200"
                  }`}
                >
                  <span
                    className={`font-mono text-xs ${
                      isActive ? "text-brand-500 dark:text-brand-400 font-bold" : "text-slate-400 dark:text-slate-500"
                    }`}
                  >
                    {item.num}
                  </span>
                  <span className="truncate">{item.title}</span>
                </a>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Quick Footer Links */}
      <div className="mt-auto pt-6 border-t border-slate-200/80 dark:border-slate-800/80 space-y-2">
        <Link
          href="/"
          className="flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium bg-slate-100/80 dark:bg-slate-800/50 text-slate-700 dark:text-slate-300 hover:bg-brand-500 hover:text-white dark:hover:bg-brand-600 dark:hover:text-white transition-all group shadow-xs"
        >
          <span className="flex items-center gap-2.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Backoffice Console</span>
          </span>
          <span className="text-xs opacity-60 group-hover:translate-x-0.5 transition-transform">→</span>
        </Link>
      </div>
    </aside>
  );
}
