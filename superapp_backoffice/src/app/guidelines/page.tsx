"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { Section, IntegrationMethodTab } from "@/types";
import { GuidelinesHeader } from "@/components/guidelines/GuidelinesHeader";
import { GuidelinesSidebar } from "@/components/guidelines/GuidelinesSidebar";
import { GuidelinesTableOfContents } from "@/components/guidelines/GuidelinesTableOfContents";
import {
  Section01Overview,
  Section02GeneralRequirements,
  Section03Methods,
  Section04SdkContract,
  Section05Capabilities,
  Section06UxUiGuidelines,
  Section07SecurityCheckpoints,
  Section08ValidationLifecycle,
  Section09Troubleshooting,
} from "@/components/guidelines/sections";
import { copyText } from '@/lib/clipboard';
import { Copy, Check, ArrowRight } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';

interface QuickstartStack {
  id: IntegrationMethodTab;
  title: string;
  runtime: string;
  desc: string;
  command: string;
  copyKey: string;
  cta: string;
  accentText: string;
  badgeClass: string;
}

const QUICKSTART_STACKS: QuickstartStack[] = [
  {
    id: 'webview',
    title: 'Web MiniApp',
    runtime: 'React / Vue',
    desc: 'Modern web apps running in secure SuperApp WebViews.',
    command: 'pnpm add @fsasuperapp/miniapp-web-sdk',
    copyKey: 'web',
    cta: 'View Web Contract',
    accentText: 'text-brand-600 dark:text-brand-400',
    badgeClass: 'bg-brand-50 dark:bg-brand-950/60 text-brand-700 dark:text-brand-300 border-brand-200/70 dark:border-brand-800/60',
  },
  {
    id: 'flutter',
    title: 'Flutter MiniApp',
    runtime: 'Dart / Pub',
    desc: 'Modular Flutter packages embedded in the SuperApp host shell.',
    command: 'flutter pub add fsa_superapp_miniapp_flutter_sdk',
    copyKey: 'flutter',
    cta: 'View Flutter Contract',
    accentText: 'text-indigo-600 dark:text-indigo-400',
    badgeClass: 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-200/70 dark:border-indigo-800/60',
  },
  {
    id: 'native',
    title: 'Native SDK',
    runtime: 'Android / iOS',
    desc: 'Compiled AAR & XCFramework libraries with native performance.',
    command: "implementation 'com.fsasuperapp:miniapp-native-sdk:1.0.0'",
    copyKey: 'native',
    cta: 'View Native Contract',
    accentText: 'text-emerald-600 dark:text-emerald-400',
    badgeClass: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200/70 dark:border-emerald-800/60',
  },
  {
    id: 'deeplink',
    title: 'Deep Link',
    runtime: 'URI Protocol',
    desc: 'Seamless app-to-app handoff with cryptographic callbacks.',
    command: 'pnpm add @fsasuperapp/miniapp-deeplink-sdk',
    copyKey: 'deeplink',
    cta: 'View Deep Link Contract',
    accentText: 'text-amber-600 dark:text-amber-400',
    badgeClass: 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200/70 dark:border-amber-800/60',
  },
];

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
    copyText(text);
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
            {/* Quickstart Header & Stack Cards */}
            <div className="mb-10 space-y-6">
              <PageHeader
                title="FSA SuperApp Developer Guidelines"
                description="Build, test in sandbox, and integrate your MiniApp. Choose your tech stack below for installation commands, live code contracts, and UX/UI rules."
                actions={
                  <Link
                    href="/miniapps/register"
                    className="px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-semibold text-sm shadow-sm transition inline-flex items-center gap-2 shrink-0"
                  >
                    <span>Register MiniApp</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                }
              />

              {/* 4 Clean Interactive Framework Quickstart Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {QUICKSTART_STACKS.map((stack) => {
                  const isActive = activeMethodTab === stack.id;
                  const isCopied = copiedStack === stack.copyKey;
                  return (
                    <div
                      key={stack.id}
                      onClick={() => setActiveMethodTab(stack.id)}
                      className={`p-5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between gap-4 ${
                        isActive
                          ? 'bg-white dark:bg-slate-900 border-brand-500 ring-1 ring-brand-500/20 shadow-sm'
                          : 'bg-white/80 dark:bg-slate-900/70 border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                      }`}
                    >
                      <div className="space-y-2.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className={`text-sm font-bold ${stack.accentText}`}>
                            {stack.title}
                          </span>
                          <span className={`text-xs px-2 py-0.5 rounded-md font-semibold border shrink-0 ${stack.badgeClass}`}>
                            {stack.runtime}
                          </span>
                        </div>
                        <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                          {stack.desc}
                        </p>
                      </div>

                      <div className="space-y-3">
                        <div
                          onClick={(e) => e.stopPropagation()}
                          className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-950 text-slate-800 dark:text-slate-200 font-mono text-xs flex items-center justify-between gap-2 border border-slate-200/80 dark:border-slate-800"
                        >
                          <span className="truncate">{stack.command}</span>
                          <button
                            type="button"
                            onClick={() => copyCommand(stack.command, stack.copyKey)}
                            className="p-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors shrink-0 cursor-pointer"
                            title="Copy command"
                          >
                            {isCopied ? (
                              <Check className="w-3.5 h-3.5 text-emerald-500" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            jumpToMethod(stack.id);
                          }}
                          className={`text-xs font-semibold ${stack.accentText} hover:underline inline-flex items-center gap-1.5 cursor-pointer`}
                        >
                          <span>{stack.cta}</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Sticky Global Tech Stack Focus Bar */}
            <div className="sticky top-0 z-30 mb-10 px-4 py-3 rounded-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-2.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Active Tech Stack:
                </span>
                <span className="text-sm font-semibold text-slate-900 dark:text-white">
                  {activeMethodTab === "webview" && "WebView MiniApp (React / Vue / HTML5)"}
                  {activeMethodTab === "flutter" && "Flutter Modular Package (Dart)"}
                  {activeMethodTab === "native" && "Native Mobile SDK (Kotlin / Swift)"}
                  {activeMethodTab === "deeplink" && "Deep Link Protocol (External App)"}
                </span>
              </div>

              <div className="inline-flex items-center rounded-xl p-1 bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 flex-wrap">
                {[
                  { id: "webview", label: "WebView" },
                  { id: "flutter", label: "Flutter" },
                  { id: "native", label: "Native" },
                  { id: "deeplink", label: "Deep Link" },
                ].map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => {
                      setActiveMethodTab(m.id as any);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      activeMethodTab === m.id
                        ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs"
                        : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Sections Content */}
            {filteredSections.map((sec, index) => (
              <section key={sec.id} id={sec.id} className="scroll-mt-24 mb-24">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm font-mono font-bold text-brand-600 dark:text-brand-400">
                    Section {sec.number}
                  </span>
                  <span className="text-slate-300 dark:text-slate-700">•</span>
                  <span className="text-sm font-medium text-slate-500 uppercase tracking-wider">
                    {CATEGORY_FRIENDLY_NAMES[sec.category] || sec.category}
                  </span>
                  {sec.badge && (
                    <span className="ml-auto text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                      {sec.badge}
                    </span>
                  )}
                </div>

                <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-3">
                  {sec.title}
                </h2>
                <p className="text-base text-slate-500 dark:text-slate-400 mb-8 leading-relaxed">
                  {sec.summary}
                </p>

                {/* Section Content */}
                <div className="pt-2">{sec.content}</div>

                {/* Subtle Divider */}
                {index !== filteredSections.length - 1 && (
                  <div className="mt-24 h-px bg-slate-200/80 dark:bg-slate-800 w-full" />
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
