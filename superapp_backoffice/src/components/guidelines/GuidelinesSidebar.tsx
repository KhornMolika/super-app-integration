"use client";

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
        {/* Milestone 1: START HERE */}
        <div>
          <div className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider px-3 mb-2 flex items-center justify-between">
            <span>1. Start Here</span>
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

        {/* Milestone 2: STACK & SDK SETUP */}
        <div>
          <div className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider px-3 mb-2 flex items-center justify-between">
            <span>2. Stack &amp; SDK Setup</span>
            <span className="text-[10px] font-mono text-slate-400/70">03-04</span>
          </div>
          <nav className="space-y-1">
            {/* 03 Methods */}
            <a
              href="#methods"
              onClick={() => setActiveSection("methods")}
              className={`flex items-center justify-between px-3 py-2 rounded-xl text-sm font-medium border-l-2 transition-all ${
                activeSection === "methods"
                  ? "border-brand-500 bg-brand-50/80 dark:bg-brand-500/10 text-brand-600 dark:text-brand-400 font-semibold"
                  : "border-transparent text-slate-600 dark:text-slate-400 hover:bg-slate-100/70 dark:hover:bg-slate-800/40 hover:text-slate-900 dark:hover:text-slate-200"
              }`}
            >
              <div className="flex items-center gap-3 truncate">
                <span
                  className={`font-mono text-xs ${
                    activeSection === "methods"
                      ? "text-brand-500 dark:text-brand-400 font-bold"
                      : "text-slate-400 dark:text-slate-500"
                  }`}
                >
                  03
                </span>
                <span className="truncate">Tech Stack &amp; Delivery</span>
              </div>
              <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 uppercase">
                {activeMethodTab === "webview" ? "Web" : activeMethodTab === "flutter" ? "Flutter" : activeMethodTab === "native" ? "Native" : "Deep Link"}
              </span>
            </a>

            {/* 04 SDK Contract */}
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
                04
              </span>
              <span className="truncate">SDK &amp; Bridge Setup</span>
            </a>
          </nav>
        </div>

        {/* Milestone 3: BUILD & INTEGRATE */}
        <div>
          <div className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider px-3 mb-2 flex items-center justify-between">
            <span>3. Build &amp; Integrate</span>
            <span className="text-[10px] font-mono text-slate-400/70">05-06</span>
          </div>
          <nav className="space-y-1">
            {/* 05 Features & APIs */}
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
              <span className="truncate">Features &amp; APIs</span>
            </a>

            {/* 06 UI/UX & Safe Areas */}
            <a
              href="#ux-ui-guidelines"
              onClick={() => setActiveSection("ux-ui-guidelines")}
              className={`flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium border-l-2 transition-all ${
                activeSection === "ux-ui-guidelines"
                  ? "border-brand-500 bg-brand-50/80 dark:bg-brand-500/10 text-brand-600 dark:text-brand-400 font-semibold"
                  : "border-transparent text-slate-600 dark:text-slate-400 hover:bg-slate-100/70 dark:hover:bg-slate-800/40 hover:text-slate-900 dark:hover:text-slate-200"
              }`}
            >
              <span
                className={`font-mono text-xs ${
                  activeSection === "ux-ui-guidelines"
                    ? "text-brand-500 dark:text-brand-400 font-bold"
                    : "text-slate-400 dark:text-slate-500"
                }`}
              >
                06
              </span>
              <span className="truncate">UI/UX &amp; Safe Areas</span>
            </a>
          </nav>
        </div>

        {/* Milestone 4: LAUNCH & SUPPORT */}
        <div>
          <div className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider px-3 mb-2 flex items-center justify-between">
            <span>4. Launch &amp; Support</span>
            <span className="text-[10px] font-mono text-slate-400/70">07-09</span>
          </div>
          <nav className="space-y-1">
            {[
              { id: "security-checkpoints", num: "07", title: "Security & Compliance" },
              { id: "validation-lifecycle", num: "08", title: "Review, Testing & Launch" },
              { id: "troubleshooting", num: "09", title: "Help & Troubleshooting" },
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
    </aside>
  );
}
