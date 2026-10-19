"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Section, IntegrationMethodTab } from "@/types";
import {
  GuidelinesHeader,
  GuidelinesSidebar,
  Section01Overview,
  Section02GeneralRequirements,
  Section03SdkContract,
  Section04Methods,
  Section05Capabilities,
  Section06SecurityCheckpoints,
  Section07ValidationLifecycle,
  Section08Troubleshooting,
} from "@/components/guidelines";

export default function GuidelinesPage() {
  const [activeSection, setActiveSection] = useState<string>("overview");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [activeMethodTab, setActiveMethodTab] = useState<IntegrationMethodTab>("webview");

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
      { rootMargin: "-15% 0px -65% 0px" }
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
          "Roles, architectural boundaries, and governance across the MiniApp onboarding lifecycle.",
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
        id: "sdk-contract",
        number: "03",
        title: "MiniApp SDK / API Contract",
        shortTitle: "SDK Contract",
        category: "CONTRACT",
        summary:
          "Required bridge APIs, lifecycle bindings, authentication tokens, and strict runtime prohibitions.",
        badge: "Critical Rule",
        content: <Section03SdkContract />,
      },
      {
        id: "methods",
        number: "04",
        title: "Supported Integration Methods",
        shortTitle: "Integration Methods",
        category: "METHODS",
        summary:
          "Detailed breakdown, requirements, security checks, and specifications for all 4 official integration methods.",
        badge: "4 Integration Tiers",
        content: (
          <Section04Methods
            activeMethodTab={activeMethodTab}
            setActiveMethodTab={setActiveMethodTab}
          />
        ),
      },
      {
        id: "capabilities",
        number: "05",
        title: "Platform Capabilities Catalog",
        shortTitle: "Capabilities Catalog",
        category: "CAPABILITIES",
        summary:
          "Standardized SuperApp host capabilities, catalog resolution, bridge governance, and approval rules.",
        badge: "Catalog Architecture",
        content: <Section05Capabilities />,
      },
      {
        id: "security-checkpoints",
        number: "06",
        title: "Security Checkpoints & Automated Scanners",
        shortTitle: "Security Gates",
        category: "SECURITY",
        summary:
          "Gitleaks secrets detection, Semgrep SAST rules, Trivy SCA, OWASP ZAP DAST, and ClamAV quarantine.",
        badge: "Zero Trust Gate",
        content: <Section06SecurityCheckpoints />,
      },
      {
        id: "validation-lifecycle",
        number: "07",
        title: "State Progression & Validation Lifecycle",
        shortTitle: "Validation Lifecycle",
        category: "LIFECYCLE",
        summary:
          "State machine flow from DRAFT submission to CI build, dual manual testing, and final ACTIVATION.",
        content: <Section07ValidationLifecycle />,
      },
      {
        id: "troubleshooting",
        number: "08",
        title: "Troubleshooting & Common Failure Remedies",
        shortTitle: "Troubleshooting",
        category: "SUPPORT",
        summary:
          "Actionable solutions for frequent validation errors, dependency conflicts, and bridge misconfigurations.",
        content: <Section08Troubleshooting />,
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

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300 font-sans h-screen overflow-hidden antialiased">
      {/* Top Navbar */}
      <GuidelinesHeader />

      {/* 2-Column Layout */}
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
        <main className="flex-1 overflow-y-auto no-scrollbar [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] bg-white dark:bg-slate-950 relative scroll-smooth px-6 sm:px-10 lg:px-16 py-10">
          <div className="max-w-5xl mx-auto space-y-16 pb-24">
            {filteredSections.map((sec, index) => (
              <section key={sec.id} id={sec.id} className="scroll-mt-24">
                {/* Header Bar */}
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm font-mono font-bold text-brand-600 dark:text-brand-400">
                    Section {sec.number}
                  </span>
                  <span className="text-slate-300 dark:text-slate-700">•</span>
                  <span className="text-sm font-medium text-slate-500 uppercase tracking-wider">
                    {sec.category}
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
      </div>
    </div>
  );
}
