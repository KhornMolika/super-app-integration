"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import LifecycleFlow from "@/components/ui/LifecycleFlow";

interface Section {
  id: string;
  number: string;
  title: string;
  shortTitle?: string;
  category:
    | "GENERAL"
    | "CONTRACT"
    | "METHODS"
    | "CAPABILITIES"
    | "SECURITY"
    | "LIFECYCLE"
    | "SUPPORT";
  summary: string;
  badge?: string;
  content: React.ReactNode;
}

import {
  GlobeIcon,
  PackageIcon,
  FolderIcon,
  WrenchIcon,
  LinkIcon,
  CodeIcon,
  ShieldIcon,
  KeyIcon,
  LockIcon,
  CheckCircleIcon,
  SearchIcon,
  UserIcon,
  SettingsIcon,
  ClipboardIcon,
  BanIcon,
  TargetIcon,
  TagIcon,
  HashIcon,
} from "@/components/ui/Icons";

const VSCodeEditor = ({
  files,
}: {
  files: { filename: string; language: string; code: string }[];
}) => {
  const [activeFilename, setActiveFilename] = useState(files[0]?.filename || "");
  const [copied, setCopied] = useState(false);

  const activeFile = files.find((f) => f.filename === activeFilename) || files[0];

  const handleCopy = () => {
    if (!activeFile) return;
    navigator.clipboard.writeText(activeFile.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const escapeHtml = (str: string) =>
    str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  const highlight = (text: string, lang: string) => {
    if (lang === "json") {
      const jsonTokenRegex =
        /("(?:\\.|[^"\\])*")(\s*:)?|\b(true|false|null)\b|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)|([{}[],])/g;
      let lastIndex = 0;
      let result = "";
      let match;

      while ((match = jsonTokenRegex.exec(text)) !== null) {
        if (match.index > lastIndex) {
          result += escapeHtml(text.slice(lastIndex, match.index));
        }
        const [full, str, colon, bool, num, bracket] = match;
        if (str) {
          if (colon) {
            result += `<span class="text-sky-300 dark:text-sky-400">${escapeHtml(str)}</span>${escapeHtml(colon)}`;
          } else {
            result += `<span class="text-amber-300 dark:text-amber-200">${escapeHtml(str)}</span>`;
          }
        } else if (bool) {
          result += `<span class="text-blue-400 font-semibold">${escapeHtml(bool)}</span>`;
        } else if (num) {
          result += `<span class="text-emerald-300 dark:text-emerald-400">${escapeHtml(num)}</span>`;
        } else if (bracket) {
          result += `<span class="text-slate-400">${escapeHtml(bracket)}</span>`;
        } else {
          result += escapeHtml(full);
        }
        lastIndex = jsonTokenRegex.lastIndex;
      }
      if (lastIndex < text.length) {
        result += escapeHtml(text.slice(lastIndex));
      }
      return result;
    }

    if (lang === "yaml") {
      return text
        .split("\n")
        .map((line) => {
          const commentIdx = line.indexOf("#");
          const codePart = commentIdx !== -1 ? line.slice(0, commentIdx) : line;
          const commentPart = commentIdx !== -1 ? line.slice(commentIdx) : "";

          const formattedCode = codePart.replace(
            /^(\s*(?:-\s+)?)([a-zA-Z0-9_-]+):(\s*)(.*)$/,
            (_, prefix, key, space, val) => {
              return `${escapeHtml(prefix)}<span class="text-sky-300 dark:text-sky-400">${escapeHtml(key)}</span>:${escapeHtml(space)}<span class="text-amber-300 dark:text-amber-200">${escapeHtml(val)}</span>`;
            },
          );

          const safeCode = formattedCode === codePart ? escapeHtml(codePart) : formattedCode;
          const safeComment = commentPart ? `<span class="text-slate-500 italic">${escapeHtml(commentPart)}</span>` : "";
          return safeCode + safeComment;
        })
        .join("\n");
    }

    if (["dart", "kotlin", "swift", "typescript", "ts", "javascript", "js"].includes(lang)) {
      const codeTokenRegex =
        /(\/\/[^\n]*|\/\*[\s\S]*?\*\/)|('(?:\\.|[^'\\])*'|"(?:\\.|[^"\\])*"|`[\s\S]*?`)|(@\w+)|\b(package|import|class|protocol|interface|fun|func|override|public|private|protected|internal|final|return|void|const|val|var|let|new|async|await|if|else|try|catch|true|false|super|this|self|weak|required|extends|implements)\b|\b([A-Z][a-zA-Z0-9_]*)\b|(\b\d+(?:\.\d+)?\b)/g;

      let lastIndex = 0;
      let result = "";
      let match;

      while ((match = codeTokenRegex.exec(text)) !== null) {
        if (match.index > lastIndex) {
          result += escapeHtml(text.slice(lastIndex, match.index));
        }

        const [full, comment, str, annotation, kw, type, num] = match;
        if (comment) {
          result += `<span class="text-slate-500 italic">${escapeHtml(comment)}</span>`;
        } else if (str) {
          result += `<span class="text-amber-300 dark:text-amber-200">${escapeHtml(str)}</span>`;
        } else if (annotation) {
          result += `<span class="text-purple-400 font-medium">${escapeHtml(annotation)}</span>`;
        } else if (kw) {
          result += `<span class="text-sky-400 font-medium">${escapeHtml(kw)}</span>`;
        } else if (type) {
          result += `<span class="text-emerald-300 dark:text-emerald-400 font-medium">${escapeHtml(type)}</span>`;
        } else if (num) {
          result += `<span class="text-rose-300 dark:text-rose-400">${escapeHtml(num)}</span>`;
        } else {
          result += escapeHtml(full);
        }
        lastIndex = codeTokenRegex.lastIndex;
      }
      if (lastIndex < text.length) {
        result += escapeHtml(text.slice(lastIndex));
      }
      return result;
    }

    return escapeHtml(text);
  };

  const getLanguageBadgeColor = (lang: string) => {
    switch (lang) {
      case "dart": return "bg-cyan-500/20 text-cyan-400 border-cyan-500/30";
      case "kotlin": return "bg-purple-500/20 text-purple-400 border-purple-500/30";
      case "swift": return "bg-orange-500/20 text-orange-400 border-orange-500/30";
      case "typescript":
      case "ts": return "bg-blue-500/20 text-blue-400 border-blue-500/30";
      case "yaml": return "bg-amber-500/20 text-amber-400 border-amber-500/30";
      default: return "bg-slate-700/40 text-slate-400 border-slate-600/30";
    }
  };

  const getLanguageDot = (filename: string) => {
    if (filename.endsWith(".dart")) return "bg-cyan-400";
    if (filename.endsWith(".kt")) return "bg-purple-400";
    if (filename.endsWith(".swift")) return "bg-orange-400";
    if (filename.endsWith(".ts") || filename.endsWith(".js")) return "bg-blue-400";
    if (filename.endsWith(".yaml") || filename.endsWith(".yml")) return "bg-amber-400";
    return "bg-slate-400";
  };

  const codeLines = (activeFile?.code || "").split("\n");

  return (
    <div className="rounded-2xl overflow-hidden border border-slate-800/90 bg-[#0a0e17] shadow-xl">
      {/* Code Editor Header */}
      <div className="flex items-center justify-between px-3.5 py-2 bg-[#070a12] border-b border-slate-800/80 gap-3 min-w-0">
        {/* Left Side: Window Controls & Scrollable Tab Strip */}
        <div className="flex items-center gap-3 min-w-0 flex-1 overflow-hidden">
          {/* MacOS Window Dots */}
          <div className="flex items-center gap-1.5 pr-2.5 border-r border-slate-800 shrink-0 select-none">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80 hover:bg-rose-500 transition-colors"></span>
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80 hover:bg-amber-500 transition-colors"></span>
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80 hover:bg-emerald-500 transition-colors"></span>
          </div>

          {/* File Tabs Strip */}
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] py-0.5">
            {files.map((file) => {
              const isActive = activeFilename === file.filename;
              return (
                <button
                  key={file.filename}
                  onClick={() => setActiveFilename(file.filename)}
                  className={`px-2.5 py-1 text-xs font-mono rounded-lg transition-all flex items-center gap-1.5 shrink-0 whitespace-nowrap select-none ${
                    isActive
                      ? "bg-slate-800/90 text-slate-100 font-semibold border border-slate-700 shadow-sm"
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 border border-transparent"
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${getLanguageDot(file.filename)} ${isActive ? "opacity-100 ring-2 ring-slate-700" : "opacity-60"}`}></span>
                  <span>{file.filename}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Side: Language Badge & Action Copy Button */}
        <div className="flex items-center gap-2 shrink-0 pl-3 border-l border-slate-800/80 bg-[#070a12] select-none z-10">
          <span className={`hidden md:inline-flex text-[10px] font-mono uppercase tracking-wider font-semibold border px-2 py-0.5 rounded-md ${getLanguageBadgeColor(activeFile?.language || "")}`}>
            {activeFile?.language || "code"}
          </span>

          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700 rounded-lg transition-all border border-slate-700/80 active:scale-95 shadow-sm"
            title="Copy code to clipboard"
          >
            {copied ? (
              <span className="text-emerald-400 flex items-center gap-1 font-semibold">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7"/></svg>
                <span>Copied</span>
              </span>
            ) : (
              <span className="flex items-center gap-1 text-slate-300">
                <svg className="w-3.5 h-3.5 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>
                <span>Copy</span>
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Code Content Area with Line Numbers */}
      <div className="overflow-x-auto text-xs font-mono leading-relaxed text-slate-200 flex py-3.5">
        {/* Line Numbers Column */}
        <div className="select-none text-right pr-3.5 pl-3 border-r border-slate-800/70 text-slate-600 dark:text-slate-600 font-mono text-[11px] leading-relaxed shrink-0">
          {codeLines.map((_, i) => (
            <div key={i}>{i + 1}</div>
          ))}
        </div>

        {/* Code Lines Container */}
        <div className="pl-4 pr-6 flex-1 overflow-x-auto">
          <pre className="font-mono text-xs leading-relaxed">
            <code
              dangerouslySetInnerHTML={{
                __html: activeFile ? highlight(activeFile.code, activeFile.language) : "",
              }}
            />
          </pre>
        </div>
      </div>
    </div>
  );
};

const CodeBlock = ({
  code,
  language,
  filename,
}: {
  code: string;
  language: string;
  filename?: string;
}) => {
  return (
    <VSCodeEditor files={[{ filename: filename || "code", language, code }]} />
  );
};

export default function GuidelinesPage() {
  const [activeSection, setActiveSection] = useState<string>("overview");
  const [searchQuery, setSearchQuery] = useState<string>("" );
  const [activeMethodTab, setActiveMethodTab] = useState<'webview' | 'flutter' | 'native' | 'deeplink'>('webview');

  // Hash & Query Parameter Deep Linking
  useEffect(() => {
    const handleDeepLink = () => {
      if (typeof window === "undefined") return;

      const params = new URLSearchParams(window.location.search);
      const methodParam = params.get("method");
      if (
        methodParam &&
        ["webview", "artifact", "source", "native", "deeplink"].includes(methodParam)
      ) {
        setActiveMethodTab(methodParam as any);
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

  const sections: Section[] = [
    {
      id: "overview",
      number: "01",
      title: "Overview & Ecosystem Roles",
      shortTitle: "Overview & Roles",
      category: "GENERAL",
      summary:
        "Roles, architectural boundaries, and governance across the Mini App onboarding lifecycle.",
      badge: "Core Governance",
      content: (
        <div className="space-y-6 text-base text-slate-600 dark:text-slate-300">
          <p className="leading-relaxed">
            The Super App Mini App ecosystem provides a high-performance, sandboxed runtime enabling autonomous delivery of vertical services. The platform strictly isolates third-party business logic while enabling standardized access to device features and Super App APIs.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-5 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 space-y-3">
              <div className="w-9 h-9 rounded-lg bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <UserIcon />
              </div>
              <h4 className="font-bold text-slate-900 dark:text-white text-lg">Mini App Developer (MA Manager)</h4>
              <span className="inline-block px-2.5 py-0.5 text-sm font-semibold rounded bg-slate-200/70 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                External / Mini App Team
              </span>
              <ul className="text-sm space-y-2 text-slate-600 dark:text-slate-400">
                <li>• Registers Mini App metadata & icon</li>
                <li>• Configures integration method & source</li>
                <li>• Reviews detected permission claims</li>
                <li>• Resolves validation & security findings</li>
                <li>• Performs acceptance testing on test builds</li>
              </ul>
            </div>

            <div className="p-5 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 space-y-3">
              <div className="w-9 h-9 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <ShieldIcon />
              </div>
              <h4 className="font-bold text-slate-900 dark:text-white text-lg">Super App Admin (SA Admin)</h4>
              <span className="inline-block px-2.5 py-0.5 text-sm font-semibold rounded bg-slate-200/70 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                Super App Platform Owner
              </span>
              <ul className="text-sm space-y-2 text-slate-600 dark:text-slate-400">
                <li>• Reviews integration contracts</li>
                <li>• Approves new capability requests</li>
                <li>• Audits automated security scans</li>
                <li>• Authorizes CI integration builds</li>
                <li>• Grants final release activation</li>
              </ul>
            </div>

            <div className="p-5 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 space-y-3">
              <div className="w-9 h-9 rounded-lg bg-brand-100 dark:bg-brand-900/40 text-brand-600 dark:text-brand-400 flex items-center justify-center">
                <SettingsIcon />
              </div>
              <h4 className="font-bold text-slate-900 dark:text-white text-lg">Automated CI/CD Engine (Jenkins)</h4>
              <span className="inline-block px-2.5 py-0.5 text-sm font-semibold rounded bg-slate-200/70 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                Automated Engine
              </span>
              <ul className="text-sm space-y-2 text-slate-600 dark:text-slate-400">
                <li>• Runs backend and method validation</li>
                <li>• Resolves DAG capabilities and SBOM</li>
                <li>• Executes SAST and DAST security gates</li>
                <li>• Generates sandbox test APKs</li>
                <li>• Promotes trusted packages to Nexus</li>
              </ul>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "general-requirements",
      number: "02",
      title: "General Integration Requirements",
      shortTitle: "General Requirements",
      category: "GENERAL",
      summary:
        "Global conventions, naming syntax, SemVer rules, and environment segregation.",
      content: (
        <div className="space-y-6 text-base text-slate-600 dark:text-slate-300">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-5 bg-slate-50/50 dark:bg-slate-900/40">
              <h5 className="font-bold text-slate-900 dark:text-white text-base flex items-center gap-2 mb-2">
                <TagIcon /> Mini App Identity
              </h5>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-3 leading-relaxed">
                Every Mini App registers an immutable unique identifier prefixed with <code className="font-mono text-brand-600 dark:text-brand-400">miniapp_</code>.
              </p>
              <div className="bg-slate-900 text-slate-200 px-3 py-2 rounded-lg font-mono text-sm">
                miniapp_banking_8f32a1
              </div>
              <p className="text-sm text-slate-500 mt-2">
                Allowed: lowercase letters, digits, and underscores.
              </p>
            </div>

            <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-5 bg-slate-50/50 dark:bg-slate-900/40">
              <h5 className="font-bold text-slate-900 dark:text-white text-base flex items-center gap-2 mb-2">
                <HashIcon /> Semantic Versioning
              </h5>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-3 leading-relaxed">
                Strict adherence to SemVer 2.0.0 is mandated for all build artifacts and releases.
              </p>
              <div className="bg-slate-900 text-slate-200 px-3 py-2 rounded-lg font-mono text-sm">
                MAJOR.MINOR.PATCH (e.g. 1.4.2)
              </div>
              <p className="text-sm text-slate-500 mt-2">
                Duplicate version numbers in the same environment are rejected.
              </p>
            </div>
          </div>

          <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 space-y-3">
            <h5 className="font-semibold text-slate-900 dark:text-white text-sm uppercase tracking-wider">
              Environment Segregation
            </h5>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
              <div className="p-3.5 rounded-lg bg-slate-100 dark:bg-slate-800/60">
                <span className="font-bold text-slate-800 dark:text-slate-200 block mb-1">DEV</span>
                <p className="text-slate-600 dark:text-slate-400">For ongoing feature work and local developer sandbox harnesses.</p>
              </div>
              <div className="p-3.5 rounded-lg bg-slate-100 dark:bg-slate-800/60">
                <span className="font-bold text-slate-800 dark:text-slate-200 block mb-1">STAGING</span>
                <p className="text-slate-600 dark:text-slate-400">Pre-production verification against real Super App test builds.</p>
              </div>
              <div className="p-3.5 rounded-lg bg-slate-100 dark:bg-slate-800/60">
                <span className="font-bold text-slate-800 dark:text-slate-200 block mb-1">PROD</span>
                <p className="text-slate-600 dark:text-slate-400">Publicly active release serving live end-users inside Super App.</p>
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "sdk-contract",
      number: "03",
      title: "Mini App SDK / API Contract",
      shortTitle: "SDK Contract",
      category: "CONTRACT",
      summary:
        "Required bridge APIs, lifecycle bindings, authentication tokens, and strict runtime prohibitions.",
      badge: "Critical Rule",
      content: (
        <div className="space-y-6 text-base text-slate-600 dark:text-slate-300">
          <p className="leading-relaxed">
            Mini Apps operate within a strictly sandboxed runtime. All platform interactions (authentication tokens, payments, biometrics, hardware camera, and navigation) must pass through the standardized Super App Host SDK / Bridge interfaces.
          </p>

          {/* Integration vs Capability Matrix Table */}
          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-100/80 dark:bg-slate-800/60 text-slate-900 dark:text-slate-100 font-semibold">
                  <th className="py-3 px-4">Integration Method</th>
                  <th className="py-3 px-4">Delivery Format</th>
                  <th className="py-3 px-4">Language / Tech Stack</th>
                  <th className="py-3 px-4">How Capabilities Are Accessed</th>
                  <th className="py-3 px-4">Host Context &amp; Auth</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-[11px]">
                <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                  <td className="py-2.5 px-4 font-bold text-slate-800 dark:text-slate-200 font-sans">WebView Mini App</td>
                  <td className="py-2.5 px-4 font-sans text-slate-600 dark:text-slate-400">Hosted HTTPS URL (Domain Verified)</td>
                  <td className="py-2.5 px-4 text-brand-600 dark:text-brand-400 font-sans">JavaScript / TypeScript (React, Vue, etc.)</td>
                  <td className="py-2.5 px-4 text-slate-600 dark:text-slate-400 font-sans"><code>@fsasuperapp/sdk</code> or <code>window.FSASuperApp</code> asynchronous JS-to-Native bridge</td>
                  <td className="py-2.5 px-4 text-slate-600 dark:text-slate-400 font-sans"><code>FSASuperApp.getAuthToken()</code> and <code>FSASuperApp.close()</code></td>
                </tr>
                <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                  <td className="py-2.5 px-4 font-bold text-slate-800 dark:text-slate-200 font-sans">Flutter Package</td>
                  <td className="py-2.5 px-4 font-sans text-slate-600 dark:text-slate-400">
                    <span className="block">• <strong>Source Code</strong> (Git Repo)</span>
                    <span className="block">• <strong>Package Artifact</strong> (.zip)</span>
                  </td>
                  <td className="py-2.5 px-4 text-brand-600 dark:text-brand-400 font-sans">Dart / Flutter Module (Flutter 3.x)</td>
                  <td className="py-2.5 px-4 text-slate-600 dark:text-slate-400 font-sans"><code>package:super_app_sdk</code> injected through <code>MiniAppContext</code></td>
                  <td className="py-2.5 px-4 text-slate-600 dark:text-slate-400 font-sans"><code>appCtx.auth.currentUser</code> and <code>appCtx.navigation.exit()</code></td>
                </tr>
                <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                  <td className="py-2.5 px-4 font-bold text-slate-800 dark:text-slate-200 font-sans">Native SDK</td>
                  <td className="py-2.5 px-4 font-sans text-slate-600 dark:text-slate-400">
                    <span className="block">• <strong>Android Binary</strong> (<code>.aar</code>)</span>
                    <span className="block">• <strong>iOS Binary</strong> (<code>.xcframework</code> / <code>.zip</code>)</span>
                  </td>
                  <td className="py-2.5 px-4 text-brand-600 dark:text-brand-400 font-sans">
                    Kotlin / Java (Android)<br />
                    Swift / Objective-C (iOS)
                  </td>
                  <td className="py-2.5 px-4 text-slate-600 dark:text-slate-400 font-sans">Implement <code>SuperAppPlugin</code> / <code>SuperAppModuleProtocol</code> host delegates</td>
                  <td className="py-2.5 px-4 text-slate-600 dark:text-slate-400 font-sans"><code>HostBridge.currentUser</code> and <code>HostBridge.terminateSession()</code></td>
                </tr>
                <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                  <td className="py-2.5 px-4 font-bold text-slate-800 dark:text-slate-200 font-sans">Deep Link</td>
                  <td className="py-2.5 px-4 font-sans text-slate-600 dark:text-slate-400">URI Scheme / Universal App Links</td>
                  <td className="py-2.5 px-4 text-brand-600 dark:text-brand-400 font-sans">External Native / Hybrid App</td>
                  <td className="py-2.5 px-4 text-slate-600 dark:text-slate-400 font-sans">Decoupled standalone app invoked via host router</td>
                  <td className="py-2.5 px-4 text-slate-600 dark:text-slate-400 font-sans">URL query parameters (<code>auth_token</code>) and redirect URI</td>
                </tr>
              </tbody>
            </table>
          </div>

          <VSCodeEditor
            files={[
              {
                filename: "entrypoint.dart",
                language: "dart",
                code: `import 'package:flutter/material.dart';
import 'package:super_app_sdk/super_app_sdk.dart';

// Official Flutter Mini App entrypoint
class MiniAppEntryPoint extends MiniAppWidget {
  @override
  Widget build(BuildContext context, MiniAppContext appCtx) {
    final user = appCtx.auth.currentUser;
    final token = appCtx.auth.accessToken;

    return Scaffold(
      appBar: SuperAppBar(title: 'Food Delivery', appCtx: appCtx),
      body: MiniAppHomeView(user: user, apiToken: token),
    );
  }
}`,
              },
              {
                filename: "MiniAppPlugin.kt",
                language: "kotlin",
                code: `package com.merchant.miniapp

import com.superapp.host.sdk.SuperAppPlugin
import com.superapp.host.sdk.MiniAppContext
import android.content.Context

class MiniAppPlugin : SuperAppPlugin {
    override fun onAttachedToHost(context: Context, appCtx: MiniAppContext) {
        val userSession = appCtx.auth.currentUser
        // Initialize native service bindings
    }

    override fun onDetachedFromHost() {
        // Clean up resources
    }
}`,
              },
              {
                filename: "MiniAppPlugin.swift",
                language: "swift",
                code: `import Foundation
import SuperAppHostSDK

@objc public class MiniAppPlugin: NSObject, SuperAppModuleProtocol {
    public func initialize(with context: MiniAppContext) {
        let currentSession = context.auth.currentUser
        // Configure Swift host delegate
    }

    public func terminate() {
        // Clean up memory and observers
    }
}`,
              },
              {
                filename: "web-bridge.ts",
                language: "typescript",
                code: `import FSASuperApp from '@fsasuperapp/sdk';

// Consume Host authentication and profile
export async function initMiniApp() {
  const auth = await FSASuperApp.getAuthToken();
  const user = await FSASuperApp.getUserProfile();
  console.log('Logged in user:', user.displayName, 'Token:', auth.accessToken);
}

// Exit Mini App safely
export function exitApp() {
  FSASuperApp.close();
}`,
              },
              {
                filename: "pubspec.yaml",
                language: "yaml",
                code: `name: food_delivery_miniapp
description: A Food Delivery Mini App module
version: 1.0.0

environment:
  sdk: '>=3.2.0 <4.0.0'
  flutter: '>=3.16.0'

dependencies:
  flutter:
    sdk: flutter
  super_app_sdk: ^1.2.0
  http: ^1.1.0`,
              },
              {
                filename: "security-rule.yaml",
                language: "yaml",
                code: `rules:
  - id: forbid-main-entrypoint
    patterns:
      - pattern: void main() { ... }
    message: "Mini Apps must not define void main() or invoke runApp()."
    severity: ERROR
    languages: [dart]
  - id: forbid-exit-calls
    pattern: exit($CODE)
    message: "Mini Apps cannot terminate the host Super App process."
    severity: ERROR
    languages: [dart]`,
              },
            ]}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="p-4 rounded-xl border border-rose-200 dark:border-rose-900/40 bg-rose-50/50 dark:bg-rose-950/20 text-rose-900 dark:text-rose-300 space-y-2">
              <strong className="flex items-center gap-1.5 font-bold text-rose-700 dark:text-rose-400 text-base">
                <BanIcon /> Strictly Prohibited
              </strong>
              <ul className="space-y-1.5 list-disc pl-4 text-slate-700 dark:text-slate-300">
                <li>No <code>void main()</code> or <code>runApp()</code> root entrypoints</li>
                <li>No direct <code>exit(0)</code> or <code>SystemNavigator.pop()</code> process kill calls</li>
                <li>No unvetted, arbitrary <code>MethodChannel</code> or raw JNI calls</li>
                <li>No direct modification of Super App global theme singletons</li>
              </ul>
            </div>

            <div className="p-4 rounded-xl border border-emerald-200 dark:border-emerald-900/40 bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-900 dark:text-emerald-300 space-y-2">
              <strong className="flex items-center gap-1.5 font-bold text-emerald-700 dark:text-emerald-400 text-base">
                <CheckCircleIcon /> Required Conventions
              </strong>
              <ul className="space-y-1.5 list-disc pl-4 text-slate-700 dark:text-slate-300">
                <li>Extend <code>MiniAppWidget</code> or implement <code>SuperAppPlugin</code> as root</li>
                <li>Consume <code>MiniAppContext</code> or <code>FSASuperApp</code> for auth &amp; tokens</li>
                <li>Use <code>SuperAppSDK.navigation</code> for host view routing</li>
                <li>Declare all sensitive device features upfront in Capabilities Catalog</li>
              </ul>
            </div>
          </div>
        </div>
      ),
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
        <div className="space-y-6 text-base text-slate-600 dark:text-slate-300">
          <p className="leading-relaxed">
            The Super App platform supports 4 official integration methods tailored to your architecture, tech stack, and distribution model:
          </p>

          {/* Interactive Method Tabs */}
          <div className="flex border-b border-slate-200 dark:border-slate-800 overflow-x-auto no-scrollbar [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] gap-1">
            {[
              { id: "webview", label: "WebView Mini App", icon: <GlobeIcon /> },
              { id: "flutter", label: "Flutter Package (Git / ZIP)", icon: <PackageIcon /> },
              { id: "native", label: "Native SDK (Kotlin / Swift)", icon: <WrenchIcon /> },
              { id: "deeplink", label: "Deep Link Protocol", icon: <LinkIcon /> },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveMethodTab(tab.id as any)}
                className={`px-4 py-2.5 text-sm font-semibold rounded-t-lg transition flex items-center gap-2 border-b-2 -mb-px whitespace-nowrap ${
                  activeMethodTab === tab.id
                    ? "border-brand-600 text-brand-600 dark:border-brand-400 dark:text-brand-400 bg-brand-50/50 dark:bg-brand-950/30"
                    : "border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-200"
                }`}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>

          {/* Method 1: WebView */}
          {activeMethodTab === "webview" && (
            <div className="space-y-6 pt-2">
              <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40">
                <h5 className="text-lg font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
                  <GlobeIcon /> WebView Mini App Integration
                </h5>
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  Embeds external web applications into an isolated, secure Super App WebView container. The web application interacts with native features via the standardized JavaScript Bridge (<code>@fsasuperapp/sdk</code>).
                </p>
              </div>

              {/* Dedicated Domain Verification Callout */}
              <section id="domain-verification" className="scroll-mt-28 space-y-4">
                <div className="p-6 rounded-2xl border-2 border-brand-500/40 dark:border-brand-500/30 bg-gradient-to-br from-brand-50/70 via-slate-50 to-white dark:from-brand-950/30 dark:via-slate-900/60 dark:to-slate-900/40 shadow-sm space-y-5">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-xl bg-brand-500/10 text-brand-600 dark:text-brand-400">
                        <GlobeIcon />
                      </div>
                      <div>
                        <h5 className="text-xl font-bold text-slate-900 dark:text-white">
                          Mandatory Domain Ownership Verification
                        </h5>
                        <p className="text-sm text-slate-600 dark:text-slate-400 mt-0.5">
                          Mini Apps serving web content must cryptographically prove domain ownership before staging submission.
                        </p>
                      </div>
                    </div>
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-brand-500/15 text-brand-600 dark:text-brand-400 border border-brand-500/30">
                      Automated Pre-flight Gate
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 space-y-2.5">
                      <strong className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                        <TagIcon className="w-4 h-4 text-brand-500" />
                        Method A: DNS TXT Record (Recommended)
                      </strong>
                      <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                        Add a TXT record to your root or subdomain DNS zone. Verification is cached and automatically checked during pre-flight.
                      </p>
                      <div className="p-3 bg-slate-900 text-slate-100 font-mono rounded-lg text-[11px] space-y-1">
                        <p className="text-slate-400"># Host / Name:</p>
                        <p className="text-brand-300">_superapp-challenge.yourdomain.com</p>
                        <p className="text-slate-400 mt-2"># Value / Content:</p>
                        <p className="text-brand-300">superapp-site-verification=&lt;token&gt;</p>
                      </div>
                    </div>

                    <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 space-y-2.5">
                      <strong className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                        <HashIcon className="w-4 h-4 text-brand-500" />
                        Method B: HTML Meta Tag
                      </strong>
                      <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                        Place a verification meta tag in the <code>&lt;head&gt;</code> section of your production URL homepage.
                      </p>
                      <div className="p-3 bg-slate-900 text-slate-100 font-mono rounded-lg text-[11px] space-y-1">
                        <p className="text-slate-400">&lt;!-- Inside &lt;head&gt; of index.html --&gt;</p>
                        <p className="text-brand-300">&lt;meta name=&quot;superapp-site-verification&quot; content=&quot;&lt;token&gt;&quot; /&gt;</p>
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            </div>
          )}

          {/* Method 2: Flutter Package (Source Code Git & Package Artifact ZIP) */}
          {activeMethodTab === "flutter" && (
            <div className="space-y-6 pt-2">
              <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40">
                <h5 className="text-lg font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
                  <PackageIcon /> Flutter Package Integration (Git &amp; ZIP Archive)
                </h5>
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  Deliver your Mini App as a modular Flutter Dart package. The Super App platform supports two distribution formats: <strong>Source Code (Git Repository)</strong> or pre-packaged <strong>Package Artifact (.zip Archive)</strong>.
                </p>
              </div>

              {/* Delivery Options Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="p-2 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold">
                      <FolderIcon />
                    </span>
                    <div>
                      <strong className="text-sm font-bold text-slate-900 dark:text-white block">Option A: Source Code (Git)</strong>
                      <span className="text-slate-500">Continuous Integration via automated Git clone</span>
                    </div>
                  </div>
                  <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                    Provide your Git repository URL and branch. The platform CI/CD engine automatically clones, runs SAST / Semgrep scans, and compiles the bundle into the host Super App.
                  </p>
                  <ul className="space-y-1.5 list-disc pl-4 text-slate-600 dark:text-slate-400">
                    <li>Supports SSH Deploy Keys (ED25519) or Read-Only Personal Access Tokens</li>
                    <li>Automatic subpath monorepo resolution (<code>gitPath</code>)</li>
                    <li>Automated dependency vulnerability audits on commit</li>
                  </ul>
                </div>

                <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold">
                      <PackageIcon />
                    </span>
                    <div>
                      <strong className="text-sm font-bold text-slate-900 dark:text-white block">Option B: Package Artifact (.zip)</strong>
                      <span className="text-slate-500">Pre-packaged standalone Dart package archive</span>
                    </div>
                  </div>
                  <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                    Upload a sanitized <code>.zip</code> package containing your Flutter module source code and <code>pubspec.yaml</code> directly in the registration portal.
                  </p>
                  <ul className="space-y-1.5 list-disc pl-4 text-slate-600 dark:text-slate-400">
                    <li>Maximum archive size: 50 MB</li>
                    <li>Pre-upload sanitization strips unnecessary binaries, <code>.git</code>, and build folders</li>
                    <li>SHA-256 integrity checksum calculated and signed on upload</li>
                  </ul>
                </div>
              </div>

              {/* Pubspec Standards & Code Contracts */}
              <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 space-y-4">
                <h5 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <CheckCircleIcon className="w-5 h-5 text-emerald-500" />
                  <span>Flutter Package Structure &amp; Pubspec Contract</span>
                </h5>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-1">
                    <strong className="text-slate-800 dark:text-slate-200 block">1. Canonical Package Name</strong>
                    <span className="text-slate-500">Must be lowercase with underscores (e.g. <code className="text-brand-600 dark:text-brand-400 font-mono">my_transit_miniapp</code>).</span>
                  </div>
                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-1">
                    <strong className="text-slate-800 dark:text-slate-200 block">2. Root Export File</strong>
                    <span className="text-slate-500">Must export primary screens / widgets in <code className="text-brand-600 dark:text-brand-400 font-mono">lib/&lt;package_name&gt;.dart</code>.</span>
                  </div>
                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-1">
                    <strong className="text-slate-800 dark:text-slate-200 block">3. Isolated State</strong>
                    <span className="text-slate-500">Do not execute <code className="text-rose-500 font-mono">exit(0)</code> or override container-level GetX controllers.</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Method 3: Native SDK (Kotlin / Swift) */}
          {activeMethodTab === "native" && (
            <div className="space-y-6 pt-2">
              <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40">
                <h5 className="text-lg font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
                  <WrenchIcon /> Native SDK Integration (Kotlin / Swift)
                </h5>
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  Deliver native compiled binaries for high-performance graphics, hardware device drivers, or legacy codebases. Third-party developers author modules in <strong>Kotlin / Java (Android)</strong> and <strong>Swift / Objective-C (iOS)</strong> and upload compiled binaries.
                </p>
              </div>

              {/* Native Binaries Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold">
                      AAR
                    </span>
                    <div>
                      <strong className="text-sm font-bold text-slate-900 dark:text-white block">Android: AAR Library (<code>.aar</code>)</strong>
                      <span className="text-slate-500">Compiled Kotlin / Java Android Archive</span>
                    </div>
                  </div>
                  <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                    Upload your compiled <code>.aar</code> binary. In the registration form, specify the Android Package Name (e.g. <code>com.merchant.miniapp</code>) and Plugin Entry Class (e.g. <code>MiniAppPlugin</code>).
                  </p>
                  <div className="p-3 bg-slate-900 text-slate-100 font-mono rounded-lg text-[11px] space-y-1">
                    <p className="text-slate-400">// Kotlin Implementation</p>
                    <p className="text-brand-300">class MiniAppPlugin : SuperAppPlugin &#123;</p>
                    <p className="text-slate-300 pl-4">override fun onAttachedToHost(ctx: Context, appCtx: MiniAppContext) &#123; ... &#125;</p>
                    <p className="text-brand-300">&#125;</p>
                  </div>
                </div>

                <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="p-2 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold">
                      ZIP
                    </span>
                    <div>
                      <strong className="text-sm font-bold text-slate-900 dark:text-white block">iOS: Framework (<code>.xcframework</code> / <code>.zip</code>)</strong>
                      <span className="text-slate-500">Compiled Swift / Objective-C Binary Framework</span>
                    </div>
                  </div>
                  <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                    Upload a <code>.zip</code> archive containing your compiled <code>.xcframework</code> or <code>.framework</code>. Specify the iOS Module Name (e.g. <code>MerchantMiniApp</code>) and Entry Type (e.g. <code>MiniAppPlugin</code>).
                  </p>
                  <div className="p-3 bg-slate-900 text-slate-100 font-mono rounded-lg text-[11px] space-y-1">
                    <p className="text-slate-400">// Swift Implementation</p>
                    <p className="text-brand-300">@objc public class MiniAppPlugin: NSObject, SuperAppModuleProtocol &#123;</p>
                    <p className="text-slate-300 pl-4">public func initialize(with context: MiniAppContext) &#123; ... &#125;</p>
                    <p className="text-brand-300">&#125;</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Method 4: Deep Link */}
          {activeMethodTab === "deeplink" && (
            <div className="space-y-6 pt-2">
              <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 space-y-3">
                <h5 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <LinkIcon /> Deep Link Integration Protocol
                </h5>
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  Treats the Super App as an ecosystem discovery launchpad, seamlessly redirecting the user to your standalone mobile application installed on the device via registered Custom URL Schemes or Universal / App Links.
                </p>
              </div>

              <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 space-y-4">
                <h5 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <KeyIcon className="w-4 h-4 text-brand-500" />
                  <span>Required Configuration Parameters</span>
                </h5>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-1">
                    <strong className="text-slate-800 dark:text-slate-200 block">1. URL Scheme</strong>
                    <span className="text-slate-500">Registered custom URI (e.g. <code className="text-brand-600 dark:text-brand-400 font-mono">merchantapp://checkout</code>).</span>
                  </div>
                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-1">
                    <strong className="text-slate-800 dark:text-slate-200 block">2. Android Package Name</strong>
                    <span className="text-slate-500">Google Play Store package identifier for store fallback redirect.</span>
                  </div>
                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-1">
                    <strong className="text-slate-800 dark:text-slate-200 block">3. iOS App Store URL</strong>
                    <span className="text-slate-500">Apple App Store URL for automatic app installation fallback.</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      ),
    },
    {
      id: "capabilities",
      number: "05",
      title: "Permissions & Capability Catalog",
      shortTitle: "Capabilities Catalog",
      category: "CAPABILITIES",
      summary:
        "High-level Capability abstraction vs. platform OS permissions, catalog resolution, and approval rules.",
      badge: "Catalog Architecture",
      content: (
        <div className="space-y-6 text-base text-slate-600 dark:text-slate-300">
          <p className="leading-relaxed">
            The Super App acts as the <strong>central authority for all Mini App capabilities and permissions</strong>. To maintain zero security drift and strict platform governance, permissions follow a zero-trust runtime access model.
          </p>

          {/* Core Gatekeeper Banner */}
          <div className="p-5 rounded-xl border-l-4 border-brand-500 bg-brand-50/70 dark:bg-brand-950/30 text-sm text-brand-900 dark:text-brand-200 space-y-2">
            <span className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-xs block">
              Core Platform Principle: Capability Gatekeeper
            </span>
            <p className="italic font-medium leading-relaxed">
              &ldquo;The Super App is the single central gatekeeper for all Mini App capabilities. A Mini App may request any capability, but it can only use capabilities exposed and supported by the Super App. Unsupported capabilities must be genuinely inaccessible.&rdquo;
            </p>
          </div>

          {/* Strategy to Maximize App Store & Google Play Approval */}
          <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h5 className="font-bold text-slate-900 dark:text-white text-sm uppercase tracking-wider flex items-center gap-2">
                <ShieldIcon />
                <span>Maximizing App Store & Google Play Approval Probability</span>
              </h5>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-accent-50 text-accent-800 dark:bg-accent-950 dark:text-accent-300 border border-accent-200 dark:border-accent-800">
                Apple Guideline 4.7 & Google Play Host Policy
              </span>
            </div>
            
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              Apple and Google review the host application, metadata, third-party code, permissions, and runtime behavior. To maximize approval probability and prevent platform rejection, the Super App implements seven mandatory architectural pillars:
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <div className="p-4 rounded-lg bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-1">
                <strong className="text-slate-900 dark:text-white font-bold block">1. Super App as Central Gatekeeper</strong>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                  If a Mini App declares 5 capabilities and the Super App exposes 3, the remaining 2 are <strong>genuinely unavailable</strong>—not secretly accessible through raw native APIs or hidden bridge hooks.
                </p>
              </div>

              <div className="p-4 rounded-lg bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-1">
                <strong className="text-slate-900 dark:text-white font-bold block">2. Separate Required vs. Optional Capabilities</strong>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                  If a Mini App requires an unsupported capability for its <strong>core function</strong> → <strong>Reject the Mini App</strong>. If it is <strong>optional</strong> → Integrate it, but disable that specific feature cleanly.
                </p>
              </div>

              <div className="p-4 rounded-lg bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-1">
                <strong className="text-slate-900 dark:text-white font-bold block">3. Just-in-Time Runtime Requests</strong>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                  Runtime permission requests apply only to supported capabilities. Prompt the user <strong>at runtime when the feature is actually used</strong> (Google Play compliance requirement).
                </p>
              </div>

              <div className="p-4 rounded-lg bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-1">
                <strong className="text-slate-900 dark:text-white font-bold block">4. Strict Capability Layer Isolation</strong>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                  Host app is 100% legally and technically responsible for hosted software under Apple rules and must never expose native platform APIs/technologies without authorization.
                </p>
              </div>

              <div className="p-4 rounded-lg bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-1">
                <strong className="text-slate-900 dark:text-white font-bold block">5. Pre-Publish Automated Validation</strong>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                  Validate every Mini App before publishing (capabilities, privacy/data use, URLs, TLS, prohibited content, and actual behavior) to protect host app integrity.
                </p>
              </div>

              <div className="p-4 rounded-lg bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-1">
                <strong className="text-slate-900 dark:text-white font-bold block">6. Accurate Data Disclosures</strong>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                  Clearly disclose what data is collected, why, and with whom it is shared across Info.plist usage descriptions and Google Play Prominent In-App Disclosures.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-lg bg-brand-50/70 dark:bg-brand-950/30 border border-brand-200 dark:border-brand-900/50 text-sm space-y-1">
              <strong className="text-brand-950 dark:text-brand-200 font-bold block">7. Apple Guideline 4.7 & Manifest Compliance</strong>
              <p className="text-brand-900 dark:text-brand-300 leading-relaxed">
                Implements structured Mini App manifest declarations (bundle metadata, version constraints, age rating, and sandboxed bridge scopes) aligned with Apple&apos;s Mini Apps Partner Program.
              </p>
            </div>
          </div>

          {/* Practical Example & Decision Flow */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Practical Example */}
            <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 space-y-3">
              <h5 className="font-bold text-slate-900 dark:text-white text-sm uppercase tracking-wider">
                Capability Matching Example
              </h5>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Evaluating declared capabilities against Super App platform support:
              </p>
              <div className="grid grid-cols-2 gap-2 text-sm font-mono">
                <div className="p-3 rounded-lg bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
                  <span className="text-xs text-slate-400 font-sans block mb-1 font-semibold uppercase">Super App Supports:</span>
                  <div className="text-emerald-600 dark:text-emerald-400">• Camera [OK]</div>
                  <div className="text-emerald-600 dark:text-emerald-400">• Location [OK]</div>
                  <div className="text-emerald-600 dark:text-emerald-400">• Notification [OK]</div>
                </div>
                <div className="p-3 rounded-lg bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
                  <span className="text-xs text-slate-400 font-sans block mb-1 font-semibold uppercase">Mini App Requests (5):</span>
                  <div className="text-emerald-600 dark:text-emerald-400">• Camera (Req) [OK]</div>
                  <div className="text-emerald-600 dark:text-emerald-400">• Location (Req) [OK]</div>
                  <div className="text-emerald-600 dark:text-emerald-400">• Notification (Opt) [OK]</div>
                  <div className="text-rose-500 font-semibold">• Contacts (Opt) [BLOCKED]</div>
                  <div className="text-rose-500 font-semibold">• Microphone (Req) [UNSUPPORTED]</div>
                </div>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Outcome: If Microphone is <strong>Required</strong>, the Mini App is <strong>REJECTED</strong>. If marked <strong>Optional</strong>, the Mini App is approved with Camera/Location/Notification active and Contacts/Microphone safely disabled.
              </p>
            </div>

            {/* Decision Flowchart */}
            <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 space-y-3">
              <h5 className="font-bold text-slate-900 dark:text-white text-sm uppercase tracking-wider">
                The Final Decision Rule Flow
              </h5>
              <div className="p-3.5 bg-slate-900 text-slate-200 rounded-lg font-mono text-xs leading-relaxed">
                <div className="text-slate-400">Mini App requests N capabilities</div>
                <div className="text-slate-500 pl-4">↓ Compare with Super App catalog (M supported)</div>
                <div className="text-amber-400">Required capability unsupported?</div>
                <div className="text-rose-400 pl-4">├── Yes → REJECT Mini App</div>
                <div className="text-emerald-400 pl-4">└── No  → Continue (Optional features disabled)</div>
                <div className="text-slate-400 pl-8">↓</div>
                <div className="text-sky-300 pl-8">M supported capabilities exposed</div>
                <div className="text-slate-400 pl-8">↓</div>
                <div className="text-emerald-300 pl-8">Runtime JIT permission prompt → Allowed</div>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Unsupported capabilities are <strong>technically inaccessible</strong> in the sandbox, ensuring host stability and zero store policy violations.
              </p>
            </div>
          </div>

          {/* Capability Catalog Table */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40">
              <h5 className="font-bold text-slate-900 dark:text-white text-sm uppercase tracking-wider mb-3">
                Supported Super App Capabilities (JS Bridge &amp; Native)
              </h5>
              <div className="space-y-2.5">
                {[
                  { code: "CAMERA", name: "Camera & QR Scanner", desc: "FSASuperApp.scanQRCode() / OS Camera Frame", approval: true },
                  { code: "PAYMENT", name: "In-App KHQR & Wallet", desc: "FSASuperApp.requestPayment() / National KHQR", approval: true },
                  { code: "BIOMETRIC", name: "Biometric & FaceID Signing", desc: "FSASuperApp.authenticateBiometric() / Secure Enclave", approval: true },
                  { code: "LOCATION", name: "High-Precision GPS", desc: "FSASuperApp.getLocation() / ACCESS_FINE_LOCATION", approval: true },
                  { code: "MICROPHONE", name: "Audio & Voice Input", desc: "RECORD_AUDIO / NSMicrophoneUsageDescription", approval: true },
                  { code: "CLIPBOARD", name: "Secure Clipboard Bridge", desc: "FSASuperApp.setClipboardData() / Read & Write", approval: false },
                  { code: "NOTIFICATION", name: "Transactional Push Alerts", desc: "POST_NOTIFICATIONS / System Alerts", approval: true },
                  { code: "STORAGE", name: "Encrypted KV Storage", desc: "FSASuperApp.getSecureStorage() / AES-256 Vault", approval: false },
                  { code: "SSO_PROFILE", name: "Single Sign-On Identity", desc: "FSASuperApp.getUserProfile() / Verified Claims", approval: false },
                ].map((cap) => (
                  <div key={cap.code} className="p-3 rounded-lg bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-2">
                    <div>
                      <span className="font-mono font-bold text-sm text-brand-600 dark:text-brand-400">{cap.code}</span>
                      <span className="text-sm text-slate-600 dark:text-slate-300 ml-2">{cap.name}</span>
                      <span className="block text-xs text-slate-400 dark:text-slate-500 font-mono mt-0.5">{cap.desc}</span>
                    </div>
                    <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full whitespace-nowrap ${
                      cap.approval ? "bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300" : "bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400"
                    }`}>
                      {cap.approval ? "Admin Approval" : "Auto-Approved"}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 flex flex-col justify-between space-y-3">
              <div>
                <h5 className="font-bold text-slate-900 dark:text-white text-sm uppercase tracking-wider mb-2">
                  DAG Resolver & App Store Compliance
                </h5>
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-2 leading-relaxed">
                  Composite capabilities (e.g. <code>VIDEO_CALL</code>) automatically resolve required child dependencies (<code>CAMERA</code> + <code>MICROPHONE</code>) via DAG topological sorting.
                </p>
                <div className="p-3.5 bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg text-sm space-y-1">
                  <strong className="text-slate-900 dark:text-white block">App Store & Play Store Publishing Note:</strong>
                  <span className="text-slate-600 dark:text-slate-400">Having a Mini App request capabilities does not prevent the Super App from being published. Compliance is determined by proper implementation, purpose disclosure strings, and store guidelines.</span>
                </div>
              </div>
              <div className="p-3 bg-brand-50/60 dark:bg-brand-950/30 border border-brand-200 dark:border-brand-900/50 rounded-lg text-xs text-brand-800 dark:text-brand-300 font-medium">
                Tip: Circular dependencies in requested capabilities are automatically rejected by the DAG validation engine.
              </div>
            </div>
          </div>
        </div>
      ),
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
      content: (
        <div className="space-y-6 text-base text-slate-600 dark:text-slate-300">
          <p className="leading-relaxed">
            Security validation is fully automated. Submissions failing Critical or High severity gates are immediately blocked with actionable line-by-line remediation logs.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { name: "Gitleaks", type: "Secrets Detection", desc: "Scans for API keys, AWS/GCP credentials, and JWT private secrets." },
              { name: "Semgrep", type: "SAST Engine", desc: "Enforces sandbox rules, detects SQLi, and blocks disallowed Dart syntax." },
              { name: "Trivy", type: "Dependency SCA", desc: "Audits transitive dependencies against official CVE vulnerability databases." },
              { name: "OWASP ZAP", type: "DAST Scanner", desc: "Performs dynamic web scans for CSP compliance, open redirects, and SSRF." },
            ].map((scanner) => (
              <div key={scanner.name} className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40">
                <div className="flex items-center justify-between mb-1.5">
                  <h5 className="font-bold text-slate-900 dark:text-white text-base">{scanner.name}</h5>
                  <span className="text-xs uppercase font-bold text-brand-600 dark:text-brand-400">Hard Gate</span>
                </div>
                <span className="text-sm font-medium text-slate-500 block mb-2">{scanner.type}</span>
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{scanner.desc}</p>
              </div>
            ))}
          </div>
        </div>
      ),
    },
    {
      id: "validation-lifecycle",
      number: "07",
      title: "State Progression & Validation Lifecycle",
      shortTitle: "Validation Lifecycle",
      category: "LIFECYCLE",
      summary:
        "State machine flow from DRAFT submission to CI build, dual manual testing, and final ACTIVATION.",
      content: (
        <div className="space-y-6 text-base text-slate-600 dark:text-slate-300">
          <p className="leading-relaxed">
            Mini App integrations transition through a strictly governed 10-state finite state machine. Every stage enforces automated security gates, role-based authorizations, and end-to-end audit logging.
          </p>

          <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40">
            <LifecycleFlow />
          </div>

          {/* State Progression Table */}
          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-100/80 dark:bg-slate-800/60 text-slate-900 dark:text-slate-100 font-semibold">
                  <th className="py-3 px-4">State</th>
                  <th className="py-3 px-4">Trigger / Actor</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Next Available States</th>
                  <th className="py-3 px-4">Developer Action / Remedy</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-slate-600 dark:text-slate-300">
                <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                  <td className="py-2.5 px-4 font-mono font-bold text-slate-700 dark:text-slate-300">DRAFT</td>
                  <td className="py-2.5 px-4">MA Manager saves registration draft</td>
                  <td className="py-2.5 px-4"><span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">Manual</span></td>
                  <td className="py-2.5 px-4 font-mono text-[11px] text-brand-600 dark:text-brand-400">SUBMITTED</td>
                  <td className="py-2.5 px-4 text-xs">Fill out metadata, verify integration URL, and click &quot;Submit for Review&quot;.</td>
                </tr>
                <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                  <td className="py-2.5 px-4 font-mono font-bold text-blue-600 dark:text-blue-400">SUBMITTED</td>
                  <td className="py-2.5 px-4">MA Manager submits Mini App</td>
                  <td className="py-2.5 px-4"><span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300">Automated</span></td>
                  <td className="py-2.5 px-4 font-mono text-[11px] text-blue-600 dark:text-blue-400">IN_REVIEW</td>
                  <td className="py-2.5 px-4 text-xs">System automatically executes pre-flight checks and queues app for admin audit.</td>
                </tr>
                <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                  <td className="py-2.5 px-4 font-mono font-bold text-amber-600 dark:text-amber-400">IN_REVIEW</td>
                  <td className="py-2.5 px-4">Super App Admin initiates governance audit</td>
                  <td className="py-2.5 px-4"><span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300">Manual</span></td>
                  <td className="py-2.5 px-4 font-mono text-[11px] text-amber-600 dark:text-amber-400">APPROVED, REJECTED</td>
                  <td className="py-2.5 px-4 text-xs">Admin evaluates capability justifications, security scan reports, and contracts.</td>
                </tr>
                <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                  <td className="py-2.5 px-4 font-mono font-bold text-emerald-600 dark:text-emerald-400">APPROVED</td>
                  <td className="py-2.5 px-4">SA Admin approves architectural contract</td>
                  <td className="py-2.5 px-4"><span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300">Manual</span></td>
                  <td className="py-2.5 px-4 font-mono text-[11px] text-emerald-600 dark:text-emerald-400">BUILDING</td>
                  <td className="py-2.5 px-4 text-xs">Approval triggers automated release CI/CD pipeline in Jenkins.</td>
                </tr>
                <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                  <td className="py-2.5 px-4 font-mono font-bold text-indigo-600 dark:text-indigo-400">BUILDING</td>
                  <td className="py-2.5 px-4">Jenkins CI/CD compiles sandbox test bundle</td>
                  <td className="py-2.5 px-4"><span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300">Automated</span></td>
                  <td className="py-2.5 px-4 font-mono text-[11px] text-indigo-600 dark:text-indigo-400">TESTING, REJECTED</td>
                  <td className="py-2.5 px-4 text-xs">Builds signed test APK artifact; pushes package to internal Sonatype Nexus repository.</td>
                </tr>
                <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                  <td className="py-2.5 px-4 font-mono font-bold text-cyan-600 dark:text-cyan-400">TESTING</td>
                  <td className="py-2.5 px-4">MA Manager &amp; SA Operator perform sandbox QA</td>
                  <td className="py-2.5 px-4"><span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-100 dark:bg-cyan-900/40 text-cyan-700 dark:text-cyan-300">Manual</span></td>
                  <td className="py-2.5 px-4 font-mono text-[11px] text-cyan-600 dark:text-cyan-400">ACTIVE, REJECTED</td>
                  <td className="py-2.5 px-4 text-xs">Download test APK, verify functionality on physical device, and submit sign-off.</td>
                </tr>
                <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                  <td className="py-2.5 px-4 font-mono font-bold text-emerald-600 dark:text-emerald-400">ACTIVE</td>
                  <td className="py-2.5 px-4">SA Admin publishes Mini App to live catalog</td>
                  <td className="py-2.5 px-4"><span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300">Live</span></td>
                  <td className="py-2.5 px-4 font-mono text-[11px] text-emerald-600 dark:text-emerald-400">SUSPENDED, ARCHIVED</td>
                  <td className="py-2.5 px-4 text-xs">Mini App is live to millions of Super App end-users in production.</td>
                </tr>
                <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                  <td className="py-2.5 px-4 font-mono font-bold text-rose-600 dark:text-rose-400">REJECTED</td>
                  <td className="py-2.5 px-4">Admin or CI scanner detects security violation</td>
                  <td className="py-2.5 px-4"><span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300">Terminal</span></td>
                  <td className="py-2.5 px-4 font-mono text-[11px] text-rose-600 dark:text-rose-400">DRAFT (via Re-submission)</td>
                  <td className="py-2.5 px-4 text-xs">Review rejection reason, resolve flagged vulnerabilities or contract issues, and re-submit.</td>
                </tr>
                <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                  <td className="py-2.5 px-4 font-mono font-bold text-orange-600 dark:text-orange-400">SUSPENDED</td>
                  <td className="py-2.5 px-4">SA Admin revokes live access due to policy violation</td>
                  <td className="py-2.5 px-4"><span className="px-2 py-0.5 rounded text-[10px] font-bold bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300">Revoked</span></td>
                  <td className="py-2.5 px-4 font-mono text-[11px] text-orange-600 dark:text-orange-400">ACTIVE, ARCHIVED</td>
                  <td className="py-2.5 px-4 text-xs">Contact Super App platform compliance team to remediate suspension triggers.</td>
                </tr>
                <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                  <td className="py-2.5 px-4 font-mono font-bold text-slate-500 dark:text-slate-400">ARCHIVED</td>
                  <td className="py-2.5 px-4">Organization decommissions Mini App</td>
                  <td className="py-2.5 px-4"><span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400">Closed</span></td>
                  <td className="py-2.5 px-4 font-mono text-[11px] text-slate-400">None</td>
                  <td className="py-2.5 px-4 text-xs">Read-only historical audit record. Cannot be re-activated.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      ),
    },
    {
      id: "troubleshooting",
      number: "08",
      title: "Troubleshooting & Common Failure Remedies",
      shortTitle: "Troubleshooting",
      category: "SUPPORT",
      summary:
        "Actionable solutions for frequent validation errors, dependency conflicts, and bridge misconfigurations.",
      content: (
        <div className="space-y-3 text-base text-slate-600 dark:text-slate-300">
          {[
            {
              issue: "BUILD_FAILED: Multiple conflicting versions of Flutter SDK",
              cause: "Mini App pubspec.yaml specifies an incompatible SDK range.",
              fix: 'Align environment constraint to match Super App runtime (e.g. sdk: ">=3.2.0 <4.0.0").',
            },
            {
              issue: "SECURITY_CHECK_FAILED: Gitleaks detected sensitive key in assets",
              cause: "Hardcoded staging/dev API secret or private key committed in source repository.",
              fix: "Remove token from Git history, rotate credential, and retrieve keys via SuperAppSDK auth context.",
            },
            {
              issue: "WEBVIEW_SSRF_DETECTED: Destination points to RFC 1918 private IP",
              cause: "Target URL resolves to private internal subnets (e.g. 192.168.x.x or 10.x.x.x).",
              fix: "Provide a publicly reachable HTTPS domain with valid TLS certificates.",
            },
          ].map((item, idx) => (
            <div key={idx} className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 space-y-2">
              <div className="font-mono font-bold text-sm text-rose-600 dark:text-rose-400">{item.issue}</div>
              <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed"><span className="font-semibold text-slate-900 dark:text-white">Cause: </span>{item.cause}</p>
              <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed"><span className="font-semibold text-emerald-600 dark:text-emerald-400">Fix: </span>{item.fix}</p>
            </div>
          ))}
        </div>
      ),
    },
  ];

  const filteredSections = sections.filter((sec) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return sec.title.toLowerCase().includes(q) || sec.summary.toLowerCase().includes(q);
  });

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300 font-sans h-screen overflow-hidden antialiased">
      {/* Sleek Top Navbar */}
      <header className="h-16 border-b border-slate-200 dark:border-slate-800/80 flex items-center justify-between px-6 lg:px-8 shrink-0 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md relative z-20">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2.5 font-bold text-slate-900 dark:text-white hover:opacity-90 transition">
            <Image
              src="/fsa-logo.png"
              alt="FSA Logo"
              width={28}
              height={28}
              className="w-7 h-7 object-cover rounded-full shadow-sm"
            />
            <span className="text-base tracking-tight font-extrabold text-slate-900 dark:text-white">
              Super App <span className="text-brand-600 dark:text-brand-400 font-medium">Docs</span>
            </span>
          </Link>
          <span className="text-sm px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-mono font-medium border border-slate-200 dark:border-slate-700">
            v2.4
          </span>
        </div>

        {/* Global Action Links */}
        <div className="flex items-center gap-4 text-sm font-medium">
          <Link
            href="/miniapps/register"
            className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-700 text-white font-semibold transition shadow-sm text-sm"
          >
            Register Mini App
          </Link>
          <div className="h-4 w-px bg-slate-200 dark:bg-slate-800 hidden sm:block"></div>
          <ThemeToggle />
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition text-sm"
          >
            <span>Dashboard</span>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg>
          </Link>
        </div>
      </header>

      {/* 3-Column Layout */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Left Navigation Sidebar */}
                <aside className="w-72 border-r border-slate-200 dark:border-slate-800/80 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md overflow-y-auto no-scrollbar [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] shrink-0 flex flex-col py-5 px-3 relative z-10 select-none">
          {/* Search Bar */}
          <div className="relative mb-5 px-1">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search guidelines..."
              className="w-full pl-8 pr-8 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-brand-500 transition-all shadow-none"
            />
            <div className="absolute left-3.5 top-2 text-slate-400 w-3.5 h-3.5 pointer-events-none">
              <SearchIcon />
            </div>
            {searchQuery ? (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-2 text-[10px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                ✕
              </button>
            ) : (
              <span className="absolute right-3 top-2 text-[10px] font-mono text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-slate-800 rounded px-1">
                /
              </span>
            )}
          </div>

          {/* Structured Navigation Tree */}
          <div className="space-y-5 text-xs">
            {/* Category 1: GETTING STARTED */}
            <div>
              <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider px-3 mb-1.5 flex items-center justify-between">
                <span>Getting Started</span>
                <span className="text-[9px] font-mono text-slate-400/60">01-02</span>
              </div>
              <nav className="space-y-0.5">
                {[
                  { id: "overview", num: "01", title: "Overview & Roles", icon: <UserIcon /> },
                  { id: "general-requirements", num: "02", title: "General Requirements", icon: <CheckCircleIcon /> },
                ].map((item) => {
                  const isActive = activeSection === item.id;
                  return (
                    <a
                      key={item.id}
                      href={`#${item.id}`}
                      onClick={() => setActiveSection(item.id)}
                      className={`flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-xs font-medium border-l-2 transition-all ${
                        isActive
                          ? "border-brand-500 bg-brand-50/70 dark:bg-brand-500/10 text-brand-600 dark:text-brand-400 font-semibold"
                          : "border-transparent text-slate-600 dark:text-slate-400 hover:bg-slate-100/70 dark:hover:bg-slate-800/40 hover:text-slate-900 dark:hover:text-slate-200"
                      }`}
                    >
                      <span className={`font-mono text-[10px] ${isActive ? "text-brand-500 dark:text-brand-400 font-bold" : "text-slate-400 dark:text-slate-500"}`}>
                        {item.num}
                      </span>
                      <span className="truncate">{item.title}</span>
                    </a>
                  );
                })}
              </nav>
            </div>

            {/* Category 2: ARCHITECTURE & CONTRACTS */}
            <div>
              <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider px-3 mb-1.5 flex items-center justify-between">
                <span>Architecture &amp; Rules</span>
                <span className="text-[9px] font-mono text-slate-400/60">03-06</span>
              </div>
              <nav className="space-y-0.5">
                {/* 03 SDK Contract */}
                <a
                  href="#sdk-contract"
                  onClick={() => setActiveSection("sdk-contract")}
                  className={`flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-xs font-medium border-l-2 transition-all ${
                    activeSection === "sdk-contract"
                      ? "border-brand-500 bg-brand-50/70 dark:bg-brand-500/10 text-brand-600 dark:text-brand-400 font-semibold"
                      : "border-transparent text-slate-600 dark:text-slate-400 hover:bg-slate-100/70 dark:hover:bg-slate-800/40 hover:text-slate-900 dark:hover:text-slate-200"
                  }`}
                >
                  <span className={`font-mono text-[10px] ${activeSection === "sdk-contract" ? "text-brand-500 dark:text-brand-400 font-bold" : "text-slate-400 dark:text-slate-500"}`}>
                    03
                  </span>
                  <span className="truncate">SDK &amp; Host Contract</span>
                </a>

                {/* 04 Supported Integration Methods */}
                <div>
                  <a
                    href="#methods"
                    onClick={() => setActiveSection("methods")}
                    className={`flex items-center justify-between px-3 py-1.5 rounded-lg text-xs font-medium border-l-2 transition-all ${
                      activeSection === "methods"
                        ? "border-brand-500 bg-brand-50/70 dark:bg-brand-500/10 text-brand-600 dark:text-brand-400 font-semibold"
                        : "border-transparent text-slate-600 dark:text-slate-400 hover:bg-slate-100/70 dark:hover:bg-slate-800/40 hover:text-slate-900 dark:hover:text-slate-200"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <span className={`font-mono text-[10px] ${activeSection === "methods" ? "text-brand-500 dark:text-brand-400 font-bold" : "text-slate-400 dark:text-slate-500"}`}>
                        04
                      </span>
                      <span className="truncate">Integration Methods</span>
                    </div>
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-400">4</span>
                  </a>

                  {/* Nested Method Tabs */}
                  <div className="ml-5 pl-2.5 my-1 border-l border-slate-200 dark:border-slate-800 space-y-0.5">
                    {[
                      { id: "webview", label: "WebView & Verify", badge: "Web" },
                      { id: "flutter", label: "Flutter Package (Git / ZIP)", badge: "Flutter" },
                      { id: "native", label: "Native SDK (Kotlin / Swift)", badge: "Native" },
                      { id: "deeplink", label: "Deep Link Protocol", badge: "URI" },
                    ].map((m) => {
                      const isTabActive = activeSection === "methods" && activeMethodTab === m.id;
                      return (
                        <a
                          key={m.id}
                          href="#methods"
                          onClick={() => {
                            setActiveSection("methods");
                            setActiveMethodTab(m.id as any);
                          }}
                          className={`flex items-center justify-between px-2 py-1 rounded-md text-[11px] transition-all ${
                            isTabActive
                              ? "bg-brand-500/10 text-brand-600 dark:text-brand-400 font-medium"
                              : "text-slate-500 dark:text-slate-400 hover:bg-slate-100/50 dark:hover:bg-slate-800/30 hover:text-slate-800 dark:hover:text-slate-200"
                          }`}
                        >
                          <span className="truncate">{m.label}</span>
                          <span className="text-[9px] font-mono opacity-60 uppercase">{m.badge}</span>
                        </a>
                      );
                    })}
                  </div>
                </div>

                {/* 05 Capabilities */}
                <a
                  href="#capabilities"
                  onClick={() => setActiveSection("capabilities")}
                  className={`flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-xs font-medium border-l-2 transition-all ${
                    activeSection === "capabilities"
                      ? "border-brand-500 bg-brand-50/70 dark:bg-brand-500/10 text-brand-600 dark:text-brand-400 font-semibold"
                      : "border-transparent text-slate-600 dark:text-slate-400 hover:bg-slate-100/70 dark:hover:bg-slate-800/40 hover:text-slate-900 dark:hover:text-slate-200"
                  }`}
                >
                  <span className={`font-mono text-[10px] ${activeSection === "capabilities" ? "text-brand-500 dark:text-brand-400 font-bold" : "text-slate-400 dark:text-slate-500"}`}>
                    05
                  </span>
                  <span className="truncate">Capabilities Catalog</span>
                </a>

                {/* 06 Security Gates */}
                <a
                  href="#security-checkpoints"
                  onClick={() => setActiveSection("security-checkpoints")}
                  className={`flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-xs font-medium border-l-2 transition-all ${
                    activeSection === "security-checkpoints"
                      ? "border-brand-500 bg-brand-50/70 dark:bg-brand-500/10 text-brand-600 dark:text-brand-400 font-semibold"
                      : "border-transparent text-slate-600 dark:text-slate-400 hover:bg-slate-100/70 dark:hover:bg-slate-800/40 hover:text-slate-900 dark:hover:text-slate-200"
                  }`}
                >
                  <span className={`font-mono text-[10px] ${activeSection === "security-checkpoints" ? "text-brand-500 dark:text-brand-400 font-bold" : "text-slate-400 dark:text-slate-500"}`}>
                    06
                  </span>
                  <span className="truncate">Security Gates</span>
                </a>
              </nav>
            </div>

            {/* Category 3: OPERATIONS & GOVERNANCE */}
            <div>
              <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider px-3 mb-1.5 flex items-center justify-between">
                <span>Operations &amp; Support</span>
                <span className="text-[9px] font-mono text-slate-400/60">07-08</span>
              </div>
              <nav className="space-y-0.5">
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
                      className={`flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-xs font-medium border-l-2 transition-all ${
                        isActive
                          ? "border-brand-500 bg-brand-50/70 dark:bg-brand-500/10 text-brand-600 dark:text-brand-400 font-semibold"
                          : "border-transparent text-slate-600 dark:text-slate-400 hover:bg-slate-100/70 dark:hover:bg-slate-800/40 hover:text-slate-900 dark:hover:text-slate-200"
                      }`}
                    >
                      <span className={`font-mono text-[10px] ${isActive ? "text-brand-500 dark:text-brand-400 font-bold" : "text-slate-400 dark:text-slate-500"}`}>
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
              className="flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium bg-slate-100/80 dark:bg-slate-800/50 text-slate-700 dark:text-slate-300 hover:bg-brand-500 hover:text-white dark:hover:bg-brand-600 dark:hover:text-white transition-all group"
            >
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>Backoffice Console</span>
              </span>
              <span className="text-[10px] opacity-60 group-hover:translate-x-0.5 transition-transform">→</span>
            </Link>
          </div>
        </aside>

        {/* Center Content Area */}
        <main className="flex-1 overflow-y-auto no-scrollbar [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] bg-white dark:bg-slate-950 relative scroll-smooth px-6 sm:px-10 lg:px-12 py-10">
          <div className="max-w-4xl mx-auto space-y-16 pb-24">
            {filteredSections.map((sec, index) => (
              <section key={sec.id} id={sec.id} className="scroll-mt-24">
                {/* Clean Header Bar */}
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm font-mono font-bold text-brand-600 dark:text-brand-400">
                    Section {sec.number}
                  </span>
                  <span className="text-slate-300 dark:text-slate-700">•</span>
                  <span className="text-sm font-medium text-slate-500 uppercase tracking-wider">
                    {sec.category}
                  </span>
                </div>

                <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-3">
                  {sec.title}
                </h2>
                <p className="text-base text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
                  {sec.summary}
                </p>

                {/* Section Content */}
                <div className="pt-2">
                  {sec.content}
                </div>

                {/* Subtle Divider */}
                {index !== filteredSections.length - 1 && (
                  <div className="mt-16 h-px bg-slate-100 dark:bg-slate-800/80 w-full" />
                )}
              </section>
            ))}
          </div>
        </main>

                {/* Right "On This Page" TOC Sidebar */}
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
                window.scrollTo({ top: 0, behavior: 'smooth' });
                setActiveSection('overview');
              }}
              className="flex items-center justify-between text-[11px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors py-1 px-1"
            >
              <span>↑ Back to top</span>
              <span className="text-[10px] font-mono">v2.4</span>
            </a>
          </div>
        </aside>
      </div>
    </div>
  );
}
