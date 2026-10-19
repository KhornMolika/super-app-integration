"use client";

import React from "react";
import { Section } from "./types";

interface GuidelinesTableOfContentsProps {
  sections: Section[];
  activeSection: string;
  setActiveSection: (id: string) => void;
}

export function GuidelinesTableOfContents({
  sections,
  activeSection,
  setActiveSection,
}: GuidelinesTableOfContentsProps) {
  return (
    <aside className="w-60 border-l border-slate-200 dark:border-slate-800/80 bg-white/60 dark:bg-slate-900/60 backdrop-blur-md overflow-y-auto no-scrollbar [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] shrink-0 hidden xl:flex flex-col py-6 px-4 text-xs select-none">
      <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3 px-1">
        On This Page
      </div>
      <nav className="space-y-1 text-slate-600 dark:text-slate-400">
        {sections.map((sec) => {
          const isActive = activeSection === sec.id;
          return (
            <a
              key={sec.id}
              href={`#${sec.id}`}
              onClick={() => setActiveSection(sec.id)}
              className={`flex items-center gap-2 py-1.5 px-2 rounded-md transition-all text-xs ${
                isActive
                  ? "text-brand-600 dark:text-brand-400 font-semibold bg-brand-50/60 dark:bg-brand-500/10"
                  : "hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100/50 dark:hover:bg-slate-800/30"
              }`}
            >
              <span className={`font-mono text-[10px] ${isActive ? "text-brand-500 dark:text-brand-400 font-bold" : "text-slate-400 dark:text-slate-500"}`}>
                {sec.number}
              </span>
              <span className="truncate">{sec.shortTitle || sec.title}</span>
            </a>
          );
        })}
      </nav>

      <div className="mt-auto pt-6 border-t border-slate-200/60 dark:border-slate-800/60">
        <a
          href="#overview"
          onClick={() => {
            window.scrollTo({ top: 0, behavior: "smooth" });
            setActiveSection("overview");
          }}
          className="flex items-center justify-between text-[11px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors py-1 px-1"
        >
          <span>↑ Back to top</span>
          <span className="text-[10px] font-mono">v1.0</span>
        </a>
      </div>
    </aside>
  );
}
