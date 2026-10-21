"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { Section, IntegrationMethodTab } from "@/types";
import {
  GuidelinesHeader,
  GuidelinesSidebar,
  GuidelinesTableOfContents,
  Section01Overview,
  Section02GeneralRequirements,
  Section03Methods,
  Section04SdkContract,
  Section05Capabilities,
  Section06UxUiGuidelines,
  Section07SecurityCheckpoints,
  Section08ValidationLifecycle,
  Section09Troubleshooting,
} from "@/components/guidelines";

const CATEGORY_FRIENDLY_NAMES: Record<string, string> = {
  GENERAL: "Fundamentals",
  METHODS: "Choose Tech Stack",
  CONTRACT: "SDK Setup",
  DESIGN: "UI/UX Design",
  CAPABILITIES: "Features & APIs",
  SECURITY: "Security & Compliance",
  LIFECYCLE: "Testing & Launch",
  SUPPORT: "Troubleshooting",
};

export default function GuidelinesPage() {
  const [activeSection, setActiveSection] = useState<string>("overview");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [activeMethodTab, setActiveMethodTab] = useState<IntegrationMethodTab>("webview");
  const [copiedStack, setCopiedStack] = useState<string | null>(null);

  // Hash & Query Parameter Deep Linking
  useEffect(() => {
    const handleDeepLink = () => {
      if (typeof window === "undefined") return;

      const params = new URLSearchParams(window.location.search);
      const methodParam = params.get("method");
      if (
        methodParam &&
        ["webview", "artifact", "source", "flutter", "native", "deeplink"].includes(methodParam)
      ) {
        const mapped = methodParam === "artifact" || methodParam === "source" ? "flutter" : methodParam;
        setActiveMethodTab(mapped as IntegrationMethodTab);
        setActiveSection("methods");
      }

      const hash = window.location.hash.replace("#", "");
      if (hash === "domain-verification") {
        setActiveMethodTab("webview");
        setActiveSection("methods");
        setTimeout(() => {
          const el = document.getElementById("domain-verification");
          if (el) {
            el.scrollIntoView({ behavior: "smooth", block: "start" });
          }
        }, 150);
      } else if (hash) {
        setTimeout(() => {
          const el = document.getElementById(hash);
          if (el) {
            el.scrollIntoView({ behavior: "smooth", block: "start" });
          }
        }, 150);
      }
    };

    handleDeepLink();
    window.addEventListener("hashchange", handleDeepLink);
    return () => window.removeEventListener("hashchange", handleDeepLink);
  }, []);

  // ScrollSpy for Active Section
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        });
      },
      { rootMargin: "-10% 0px -60% 0px" }
    );

    const sectionElements = document.querySelectorAll("section[id]");
    sectionElements.forEach((el) => observer.observe(el));

    return () => {
      sectionElements.forEach((el) => observer.unobserve(el));
    };
  }, []);

  const sections: Section[] = useMemo(
    () => [
      {
        id: "overview",
        number: "01",
        title: "Overview & Ecosystem Roles",
        shortTitle: "Overview & Roles",
        category: "GENERAL",
        summary:
          "Runtime mental model, 3-step integration roadmap, and architectural boundaries.",
        badge: "Core Governance",
        content: <Section01Overview />,
      },
      {
        id: "general-requirements",
        number: "02",
        title: "General Integration Requirements",
        shortTitle: "General Requirements",
        category: "GENERAL",
        summary:
          "Global conventions, naming syntax, SemVer rules, and environment segregation.",
        content: <Section02GeneralRequirements />,
      },
      {
        id: "methods",
        number: "03",
        title: "Supported Integration Methods",
        shortTitle: "Choose Tech Stack",
        category: "METHODS",
        summary:
          "Pick your framework: step-by-step guides for WebView, Flutter Package, Native SDK, and Deep Link.",
        badge: "4 Methods",
        content: (
          <Section03Methods
            activeMethodTab={activeMethodTab}
            setActiveMethodTab={setActiveMethodTab}
          />
        ),
      },
      {
        id: "sdk-contract",
        number: "04",
        title: "MiniApp SDK / API Contract",
        shortTitle: "SDK & Bridge Setup",
        category: "CONTRACT",
        summary:
          "Scoped registry setup, bridge API interfaces, authentication tokens, and strict runtime prohibitions.",
        content: (
          <Section04SdkContract
            activeMethodTab={activeMethodTab}
            setActiveMethodTab={setActiveMethodTab}
          />
        ),
      },
      {
        id: "capabilities",
        number: "05",
        title: "Platform Capabilities Catalog",
        shortTitle: "Features & APIs",
        category: "CAPABILITIES",
        summary:
          "Standardized SuperApp host capabilities, catalog resolution, bridge governance, and approval rules.",
        badge: "API Catalog",
        content: (
          <Section05Capabilities
            activeMethodTab={activeMethodTab}
            setActiveMethodTab={setActiveMethodTab}
          />
        ),
      },
      {
        id: "ux-ui-guidelines",
        number: "06",
        title: "MiniApp UX/UI & Screen Design System",
        shortTitle: "UI/UX & Safe Areas",
        category: "DESIGN",
        summary:
          "Viewport anatomy, capsule reserved zones, safe insets, touch targets, and visual DOs/DON'Ts.",
        badge: "Design Standards",
        content: <Section06UxUiGuidelines />,
      },
      {
        id: "security-checkpoints",
        number: "07",
        title: "Security Checkpoints & Automated Scanners",
        shortTitle: "Security Gates",
        category: "SECURITY",
        summary:
          "Gitleaks secrets detection, Semgrep SAST rules, Trivy SCA, OWASP ZAP DAST, and ClamAV quarantine.",
        badge: "Zero Trust Gate",
        content: <Section07SecurityCheckpoints />,
      },
      {
        id: "validation-lifecycle",
        number: "08",
        title: "State Progression & Validation Lifecycle",
        shortTitle: "Validation Lifecycle",
        category: "LIFECYCLE",
        summary:
          "State machine flow from DRAFT submission to CI build, dual manual testing, and final ACTIVATION.",
        content: <Section08ValidationLifecycle />,
      },
      {
        id: "troubleshooting",
        number: "09",
        title: "Troubleshooting & Common Failure Remedies",
        shortTitle: "Troubleshooting",
        category: "SUPPORT",
        summary:
          "Actionable solutions for frequent validation errors, dependency conflicts, and bridge misconfigurations.",
        content: <Section09Troubleshooting />,
      },
    ],
    [activeMethodTab]
  );

  const filteredSections = useMemo(() => {
    if (!searchQuery) return sections;
    const q = searchQuery.toLowerCase();
    return sections.filter(
      (sec) => sec.title.toLowerCase().includes(q) || sec.summary.toLowerCase().includes(q)
    );
  }, [sections, searchQuery]);

  const copyCommand = (text: string, stack: string) => {
    navigator.clipboard.writeText(text);
    setCopiedStack(stack);
    setTimeout(() => setCopiedStack(null), 2000);
  };

  const jumpToMethod = (tab: IntegrationMethodTab) => {
    setActiveMethodTab(tab);
    setActiveSection("methods");
    const el = document.getElementById("methods");
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300 font-sans h-screen overflow-hidden antialiased">
      {/* Top Navbar */}
      <GuidelinesHeader />

      {/* 3-Column Layout */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Left Navigation Sidebar */}
        <GuidelinesSidebar
          sections={sections}
          activeSection={activeSection}
          setActiveSection={setActiveSection}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          activeMethodTab={activeMethodTab}
          setActiveMethodTab={setActiveMethodTab}
        />

        {/* Center Content Area */}
        <main className="flex-1 overflow-y-auto no-scrollbar [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] bg-white dark:bg-slate-950 relative scroll-smooth px-6 sm:px-10 lg:px-12 py-10">
          <div className="max-w-4xl mx-auto pb-24">
            {/* Quickstart Hero Banner */}
            <div className="mb-12 p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-brand-500/10 via-indigo-500/5 to-slate-100 dark:to-slate-900/60 border border-brand-500/20 shadow-xs">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                <div>
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-500/10 text-brand-600 dark:text-brand-400 font-mono text-xs font-semibold mb-3 border border-brand-500/20">
                    <span>⚡ Quickstart Hub</span>
                    <span>•</span>
                    <span>v1.0 Production SDKs</span>
                  </div>
                  <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-950 dark:text-white tracking-tight mb-2">
                    FSA SuperApp Developer Guidelines
                  </h1>
                  <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 max-w-2xl leading-relaxed">
                    Build, test in sandbox, and seamlessly integrate your MiniApp. Choose your tech stack below to view immediate installation commands, live code contracts, and UX/UI safe area rules.
                  </p>
                </div>
                <div className="shrink-0 flex items-center gap-3">
                  <Link
                    href="/miniapps/register"
                    className="px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-sm shadow-sm transition inline-flex items-center gap-2"
                  >
                    <span>Register MiniApp</span>
                    <span>→</span>
                  </Link>
                </div>
              </div>

              {/* 4 Interactive Framework Quickstart Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* 1. Web */}
                <div className="p-4 rounded-2xl bg-white/90 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between hover:border-brand-500/50 transition group">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-brand-600 dark:text-brand-400 font-mono uppercase">
                        Web MiniApp
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-brand-50 dark:bg-brand-950 text-brand-600 dark:text-brand-400 font-bold">
                        React / Vue
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mb-3 line-clamp-2">
                      Modern web apps running in secure SuperApp WebViews.
                    </p>
                    <div className="p-2 rounded-lg bg-slate-950 text-slate-200 font-mono text-[11px] flex items-center justify-between mb-3 border border-slate-800">
                      <span className="truncate mr-2">pnpm add @fsasuperapp/miniapp-web-sdk</span>
                      <button
                        onClick={() => copyCommand("pnpm add @fsasuperapp/miniapp-web-sdk", "web")}
                        className="text-xs text-slate-400 hover:text-white shrink-0"
                        title="Copy command"
                      >
                        {copiedStack === "web" ? "✓" : "📋"}
                      </button>
                    </div>
                  </div>
                  <button
                    onClick={() => jumpToMethod("webview")}
                    className="text-xs font-bold text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-1 mt-1"
                  >
                    <span>View Web Contract</span>
                    <span>→</span>
                  </button>
                </div>

                {/* 2. Flutter */}
                <div className="p-4 rounded-2xl bg-white/90 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between hover:border-indigo-500/50 transition group">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 font-mono uppercase">
                        Flutter MiniApp
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 font-bold">
                        Dart / Pub
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mb-3 line-clamp-2">
                      Modular Flutter packages embedded in the SuperApp host shell.
                    </p>
                    <div className="p-2 rounded-lg bg-slate-950 text-slate-200 font-mono text-[11px] flex items-center justify-between mb-3 border border-slate-800">
                      <span className="truncate mr-2">flutter pub add fsa_superapp_miniapp_flutter_sdk</span>
                      <button
                        onClick={() => copyCommand("flutter pub add fsa_superapp_miniapp_flutter_sdk", "flutter")}
                        className="text-xs text-slate-400 hover:text-white shrink-0"
                        title="Copy command"
                      >
                        {copiedStack === "flutter" ? "✓" : "📋"}
                      </button>
                    </div>
                  </div>
                  <button
                    onClick={() => jumpToMethod("flutter")}
                    className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 mt-1"
                  >
                    <span>View Flutter Contract</span>
                    <span>→</span>
                  </button>
                </div>

                {/* 3. Native */}
                <div className="p-4 rounded-2xl bg-white/90 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between hover:border-emerald-500/50 transition group">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 font-mono uppercase">
                        Native SDK
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 font-bold">
                        AAR / XCFramework
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mb-3 line-clamp-2">
                      Compiled Android &amp; iOS platform libraries with native performance.
                    </p>
                    <div className="p-2 rounded-lg bg-slate-950 text-slate-200 font-mono text-[11px] flex items-center justify-between mb-3 border border-slate-800">
                      <span className="truncate mr-2">FSASuperAppMiniAppNativeSDK</span>
                      <button
                        onClick={() => copyCommand("implementation 'com.fsasuperapp:miniapp-native-sdk:1.0.0'", "native")}
                        className="text-xs text-slate-400 hover:text-white shrink-0"
                        title="Copy command"
                      >
                        {copiedStack === "native" ? "✓" : "📋"}
                      </button>
                    </div>
                  </div>
                  <button
                    onClick={() => jumpToMethod("native")}
                    className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 mt-1"
                  >
                    <span>View Native Contract</span>
                    <span>→</span>
                  </button>
                </div>

                {/* 4. Deep Link */}
                <div className="p-4 rounded-2xl bg-white/90 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between hover:border-amber-500/50 transition group">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-amber-600 dark:text-amber-400 font-mono uppercase">
                        Deep Link
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400 font-bold">
                        URI Protocol
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mb-3 line-clamp-2">
                      Seamless app-to-app handoff with cryptographic return callbacks.
                    </p>
                    <div className="p-2 rounded-lg bg-slate-950 text-slate-200 font-mono text-[11px] flex items-center justify-between mb-3 border border-slate-800">
                      <span className="truncate mr-2">@fsasuperapp/miniapp-deeplink-sdk</span>
                      <button
                        onClick={() => copyCommand("pnpm add @fsasuperapp/miniapp-deeplink-sdk", "deeplink")}
                        className="text-xs text-slate-400 hover:text-white shrink-0"
                        title="Copy command"
                      >
                        {copiedStack === "deeplink" ? "✓" : "📋"}
                      </button>
                    </div>
                  </div>
                  <button
                    onClick={() => jumpToMethod("deeplink")}
                    className="text-xs font-bold text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1 mt-1"
                  >
                    <span>View Deep Link Contract</span>
                    <span>→</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Sticky Global Tech Stack Focus Bar */}
            <div className="sticky top-0 z-30 mb-10 -mx-2 px-4 py-3 rounded-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200/80 dark:border-slate-800/80 shadow-xs flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-2.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Active Tech Stack:
                </span>
                <span className="text-xs font-bold text-brand-600 dark:text-brand-400 font-mono">
                  {activeMethodTab === "webview" && "🌐 WebView MiniApp (React / Vue / HTML5)"}
                  {activeMethodTab === "flutter" && "📦 Flutter Modular Package (Dart)"}
                  {activeMethodTab === "native" && "⚙️ Native Mobile SDK (Kotlin / Swift)"}
                  {activeMethodTab === "deeplink" && "🔗 Deep Link Protocol (External App)"}
                </span>
              </div>

              <div className="flex items-center gap-1.5 flex-wrap">
                {[
                  { id: "webview", label: "WebView", badge: "Web" },
                  { id: "flutter", label: "Flutter", badge: "Dart" },
                  { id: "native", label: "Native", badge: "Native" },
                  { id: "deeplink", label: "Deep Link", badge: "URI" },
                ].map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => {
                      setActiveMethodTab(m.id as any);
                    }}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 border ${
                      activeMethodTab === m.id
                        ? "bg-brand-600 text-white border-brand-600 shadow-xs"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:text-slate-900 dark:hover:text-slate-200"
                    }`}
                  >
                    <span>{m.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Sections Content */}
            {filteredSections.map((sec, index) => (
              <section key={sec.id} id={sec.id} className="scroll-mt-24 mb-16">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm font-mono font-bold text-brand-600 dark:text-brand-400">
                    Section {sec.number}
                  </span>
                  <span className="text-slate-300 dark:text-slate-700">•</span>
                  <span className="text-sm font-medium text-slate-500 uppercase tracking-wider">
                    {CATEGORY_FRIENDLY_NAMES[sec.category] || sec.category}
                  </span>
                  {sec.badge && (
                    <span className="ml-auto text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                      {sec.badge}
                    </span>
                  )}
                </div>

                <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-3">
                  {sec.title}
                </h2>
                <p className="text-base text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
                  {sec.summary}
                </p>

                {/* Section Content */}
                <div className="pt-2">{sec.content}</div>

                {/* Subtle Divider */}
                {index !== filteredSections.length - 1 && (
                  <div className="mt-16 h-px bg-slate-100 dark:bg-slate-800/80 w-full" />
                )}
              </section>
            ))}
          </div>
        </main>

        {/* Right Sticky Table of Contents */}
        <GuidelinesTableOfContents
          sections={filteredSections}
          activeSection={activeSection}
          setActiveSection={setActiveSection}
          activeMethodTab={activeMethodTab}
          setActiveMethodTab={setActiveMethodTab}
        />
      </div>
    </div>
  );
}
