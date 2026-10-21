"use client";

import React, { useState, useEffect } from "react";
import { Section } from "./types";

interface SubTopic {
  id: string;
  label: string;
  badge?: string;
}

// Sub-content map for each section (non-redundant, deeply granular)
const SECTION_SUBTOPICS: Record<string, SubTopic[]> = {
  overview: [
    { id: "overview-quickstart", label: "Integration in 3 Steps", badge: "Roadmap" },
    { id: "overview-mental-model", label: "Runtime Mental Model", badge: "Arch" },
    { id: "overview-roles", label: "Ecosystem Governance Roles", badge: "Roles" },
  ],
  "general-requirements": [
    { id: "req-identity", label: "MiniApp Unique Identifier", badge: "miniapp_" },
    { id: "req-semver", label: "Semantic Versioning 2.0.0", badge: "SemVer" },
    { id: "req-environments", label: "Environment Segregation", badge: "Stages" },
  ],
  "sdk-contract": [
    { id: "contract-shared-model", label: "1. Shared Responsibility Model", badge: "Zero-Crash" },
    { id: "contract-can-i-use", label: "2. canIUse() Introspection Protocol", badge: "Protocol" },
    { id: "contract-code-examples", label: "3. Code Samples (All 4 Methods)", badge: "SDK Steps" },
    { id: "contract-prohibitions", label: "4. Consolidated Prohibitions", badge: "Enforced" },
  ],
  methods: [
    { id: "methods", label: "Overview & Selection", badge: "4 Tiers" },
    { id: "webview-spec", label: "WebView & Domain Verification", badge: "Web" },
    { id: "flutter-spec", label: "Flutter Modular Package", badge: "Flutter" },
    { id: "native-spec", label: "Native Mobile SDK (AAR/XCFramework)", badge: "Native" },
    { id: "deeplink-spec", label: "Deep Link Protocol & Callbacks", badge: "URI" },
  ],
  "ux-ui-guidelines": [
    { id: "ui-viewport", label: "1. Viewport Anatomy & Insets", badge: "Visual" },
    { id: "ui-capsule", label: "2. Capsule Safe Zone (96×40pt)", badge: "Critical" },
    { id: "ui-safe-area", label: "3. Bottom Safe Area (34pt)", badge: "CSS Inset" },
    { id: "ui-touch", label: "4. Touch Targets & Ergonomics", badge: "Tokens" },
    { id: "ui-dos-donts", label: "5. Visual DO's & DON'Ts", badge: "Guidelines" },
  ],
  capabilities: [
    { id: "capabilities", label: "1. Capabilities Architecture", badge: "Catalog" },
    { id: "cap-gatekeeper", label: "2. Central Gatekeeper Principle", badge: "Gate" },
    { id: "cap-approval", label: "3. Store Compliance Pillars", badge: "AppStore" },
    { id: "cap-directory", label: "4. Live Capabilities & Syntax", badge: "SDK APIs" },
  ],
  "security-checkpoints": [
    { id: "security-checkpoints", label: "Zero-Trust Scanner Gates", badge: "Gate" },
    { id: "sec-secrets", label: "Gitleaks Secrets Detection", badge: "SAST" },
    { id: "sec-dast", label: "OWASP ZAP DAST Scanner", badge: "DAST" },
    { id: "sec-malware", label: "ClamAV Package Quarantine", badge: "AntiVirus" },
  ],
  "validation-lifecycle": [
    { id: "validation-lifecycle", label: "10-State Progression Model", badge: "Flow" },
    { id: "lifecycle-submission", label: "Draft to CI Pipeline", badge: "CI/CD" },
    { id: "lifecycle-testing", label: "Dual Acceptance UAT", badge: "QA" },
    { id: "lifecycle-activation", label: "Production Activation", badge: "Live" },
  ],
  troubleshooting: [
    { id: "troubleshooting", label: "Common Integration Errors", badge: "Remedies" },
    { id: "trouble-bridge", label: "Bridge Timeout & Fallback", badge: "Bridge" },
    { id: "trouble-version", label: "Version Conflict Resolution", badge: "SemVer" },
  ],
};

const METHOD_SPECIFIC_SUBTOPICS: Record<string, SubTopic[]> = {
  webview: [
    { id: "webview-spec", label: "1. WebView Container Overview", badge: "Web" },
    { id: "domain-verification", label: "2. Domain Verification (DNS/Meta)", badge: "Pre-flight" },
  ],
  flutter: [
    { id: "flutter-spec", label: "1. Flutter Module Architecture", badge: "Dart" },
    { id: "flutter-delivery", label: "2. Delivery (Git vs ZIP Archive)", badge: "Packaging" },
    { id: "flutter-pubspec", label: "3. Pubspec Structure Contract", badge: "pubspec" },
  ],
  native: [
    { id: "native-spec", label: "1. Native Mobile SDK Architecture", badge: "Native" },
    { id: "native-android", label: "2. Android AAR Binary Spec", badge: "Kotlin" },
    { id: "native-ios", label: "3. iOS XCFramework Spec", badge: "Swift" },
  ],
  deeplink: [
    { id: "deeplink-spec", label: "1. Deep Link Protocol Handoff", badge: "URI" },
    { id: "deeplink-params", label: "2. URL Schemes & Store Fallbacks", badge: "Routing" },
  ],
};

interface GuidelinesTableOfContentsProps {
  sections: Section[];
  activeSection: string;
  setActiveSection: (id: string) => void;
  activeMethodTab?: string;
  setActiveMethodTab?: (tab: any) => void;
}

export function GuidelinesTableOfContents({
  sections,
  activeSection,
  setActiveSection,
  activeMethodTab = "webview",
}: GuidelinesTableOfContentsProps) {
  const [activeSubTopic, setActiveSubTopic] = useState<string>("");

  const currentIndex = sections.findIndex((s) => s.id === activeSection);
  const currentSection = sections[currentIndex] || sections[0];
  
  const rawSubTopics = SECTION_SUBTOPICS[currentSection.id] || [];
  const subTopics = React.useMemo(() => {
    if (currentSection.id === "methods") {
      return METHOD_SPECIFIC_SUBTOPICS[activeMethodTab] || METHOD_SPECIFIC_SUBTOPICS.webview;
    }
    if (currentSection.id === "sdk-contract") {
      const methodNames: Record<string, { label: string; badge: string }> = {
        webview: { label: "3. Web SDK Codebase Guide", badge: "React/Vue" },
        flutter: { label: "3. Flutter SDK Codebase Guide", badge: "Dart" },
        native: { label: "3. Native SDK Codebase Guide", badge: "Kotlin/Swift" },
        deeplink: { label: "3. Deep Link Codebase Guide", badge: "URI Scheme" },
      };
      const custom = methodNames[activeMethodTab] || methodNames.webview;
      return rawSubTopics.map((item) =>
        item.id === "contract-code-examples"
          ? { ...item, label: custom.label, badge: custom.badge }
          : item
      );
    }
    return rawSubTopics;
  }, [currentSection.id, rawSubTopics, activeMethodTab]);

  const prevSection = currentIndex > 0 ? sections[currentIndex - 1] : null;
  const nextSection = currentIndex < sections.length - 1 ? sections[currentIndex + 1] : null;

  // Track subtopic scrollspy inside the current section
  useEffect(() => {
    if (subTopics.length > 0) {
      setActiveSubTopic(subTopics[0].id);
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSubTopic(entry.target.id);
          }
        });
      },
      { rootMargin: "-15% 0px -60% 0px" }
    );

    subTopics.forEach((topic) => {
      const el = document.getElementById(topic.id);
      if (el) observer.observe(el);
    });

    return () => {
      subTopics.forEach((topic) => {
        const el = document.getElementById(topic.id);
        if (el) observer.unobserve(el);
      });
    };
  }, [activeSection, subTopics]);

  const handleScrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      setActiveSubTopic(id);
    } else {
      // Fallback to parent section if sub-element not mounted
      const parentEl = document.getElementById(activeSection);
      if (parentEl) parentEl.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const handleSwitchSection = (sectionId: string) => {
    setActiveSection(sectionId);
    const el = document.getElementById(sectionId);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

const CATEGORY_FRIENDLY_NAMES: Record<string, string> = {
  GENERAL: "Fundamentals",
  METHODS: "Tech Stack",
  CONTRACT: "SDK Setup",
  DESIGN: "UI/UX Design",
  CAPABILITIES: "Features & APIs",
  SECURITY: "Compliance",
  LIFECYCLE: "Testing & Launch",
  SUPPORT: "Troubleshooting",
};

  return (
    <aside className="w-72 border-l border-slate-200 dark:border-slate-800/80 bg-white/70 dark:bg-slate-900/70 backdrop-blur-md overflow-y-auto no-scrollbar [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] shrink-0 hidden xl:flex flex-col py-6 px-4 text-xs select-none">
      {/* Active Section Context Header */}
      <div className="mb-4 pb-3 border-b border-slate-200/80 dark:border-slate-800/80">
        <div className="flex items-center justify-between gap-1 mb-1.5">
          <span className="text-[10px] font-bold text-brand-600 dark:text-brand-400 uppercase tracking-wider font-mono">
            Section {currentSection.number}
          </span>
          <span className="text-[9px] px-2 py-0.5 rounded-full font-semibold uppercase bg-brand-50 dark:bg-brand-950/60 text-brand-700 dark:text-brand-300 border border-brand-200/60 dark:border-brand-800/60">
            {CATEGORY_FRIENDLY_NAMES[currentSection.category] || currentSection.category}
          </span>
        </div>
        <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-snug truncate" title={currentSection.title}>
          {currentSection.shortTitle || currentSection.title}
        </h3>
      </div>

      {/* Sub-Content Outline */}
      <div className="flex-1 space-y-1">
        <div className="flex items-center justify-between mb-2 px-1">
          <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
            Sub-Topics &amp; Details
          </span>
          <span className="text-[10px] font-mono text-slate-400">
            {subTopics.length} topics
          </span>
        </div>

        <nav className="space-y-1">
          {subTopics.map((topic, idx) => {
            const isSubActive = activeSubTopic === topic.id;
            return (
              <button
                key={topic.id}
                type="button"
                onClick={() => handleScrollTo(topic.id)}
                className={`w-full text-left flex items-center justify-between gap-2 py-1.5 px-2.5 rounded-lg transition-all text-xs group ${
                  isSubActive
                    ? "text-brand-600 dark:text-brand-400 font-semibold bg-brand-50/80 dark:bg-brand-500/10 border-l-2 border-brand-500"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100/60 dark:hover:bg-slate-800/40"
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <span className={`text-[10px] font-mono shrink-0 ${isSubActive ? "text-brand-500 font-bold" : "text-slate-400"}`}>
                    {idx + 1}.
                  </span>
                  <span className="truncate">{topic.label}</span>
                </div>
                {topic.badge && (
                  <span className={`text-[9px] font-mono px-1 py-0.2 rounded shrink-0 opacity-70 group-hover:opacity-100 ${
                    isSubActive ? "bg-brand-100 dark:bg-brand-900/60 text-brand-700 dark:text-brand-300" : "bg-slate-100 dark:bg-slate-800 text-slate-500"
                  }`}>
                    {topic.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom Section Navigator (Next/Prev) */}
      <div className="pt-4 mt-6 border-t border-slate-200/80 dark:border-slate-800/80 space-y-2">
        <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5 px-1">
          Navigate Sections
        </div>
        <div className="grid grid-cols-2 gap-2">
          {prevSection ? (
            <button
              type="button"
              onClick={() => handleSwitchSection(prevSection.id)}
              className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 text-left hover:border-brand-500/50 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition group"
            >
              <span className="text-[9px] text-slate-400 block">← Prev</span>
              <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 truncate block group-hover:text-brand-600 dark:group-hover:text-brand-400">
                {prevSection.number} {prevSection.shortTitle || prevSection.title}
              </span>
            </button>
          ) : (
            <div />
          )}

          {nextSection ? (
            <button
              type="button"
              onClick={() => handleSwitchSection(nextSection.id)}
              className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 text-right hover:border-brand-500/50 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition group"
            >
              <span className="text-[9px] text-slate-400 block">Next →</span>
              <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 truncate block group-hover:text-brand-600 dark:group-hover:text-brand-400">
                {nextSection.number} {nextSection.shortTitle || nextSection.title}
              </span>
            </button>
          ) : (
            <div />
          )}
        </div>

        <button
          type="button"
          onClick={() => {
            const el = document.getElementById(activeSection);
            if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
          }}
          className="w-full text-center py-1.5 text-[11px] text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition rounded hover:bg-slate-100/50 dark:hover:bg-slate-800/30"
        >
          ↑ Top of this Section
        </button>
      </div>
    </aside>
  );
}
