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

// Minimalist vector icons
const GlobeIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
    <path d="M2 12h20" />
  </svg>
);

const PackageIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m7.5 4.27 9 5.15" />
    <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
    <path d="m3.3 7 8.7 5 8.7-5" />
    <path d="M12 22V12" />
  </svg>
);

const FolderIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-1.2-1.8A2 2 0 0 0 7.55 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z" />
  </svg>
);

const WrenchIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
  </svg>
);

const LinkIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
  </svg>
);

const ShieldIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2-1 4-2 7-2 2.82 0 5.3 1.05 7 2a1 1 0 0 1 1 1v7z" />
  </svg>
);

const KeyIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="7.5" cy="15.5" r="5.5" />
    <path d="m21 2-9.6 9.6" />
    <path d="m15.5 7.5 3 3L22 7l-3-3" />
  </svg>
);

const CheckCircleIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <polyline points="22 4 12 14.01 9 11.01" />
  </svg>
);

const SearchIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" />
    <path d="m21 21-4.3-4.3" />
  </svg>
);

const UserIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

const SettingsIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const ClipboardIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="8" height="4" x="8" y="2" rx="1" ry="1" />
    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
  </svg>
);

const BanIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <path d="m4.9 4.9 14.2 14.2" />
  </svg>
);

const TargetIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <circle cx="12" cy="12" r="6" />
    <circle cx="12" cy="12" r="2" />
  </svg>
);

const TagIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2H2v10l9.29 9.29c.94.94 2.48.94 3.42 0l6.58-6.58c.94-.94.94-2.48 0-3.42L12 2Z" />
    <path d="M7 7h.01" />
  </svg>
);

const HashIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="4" x2="20" y1="9" y2="9" />
    <line x1="4" x2="20" y1="15" y2="15" />
    <line x1="10" x2="8" y1="3" y2="21" />
    <line x1="16" x2="14" y1="3" y2="21" />
  </svg>
);

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
        /("(?:\\.|[^"\\])*")(\s*:)?|\b(true|false|null)\b|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)|([{}[\],])/g;
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

    if (lang === "dart") {
      const dartTokenRegex =
        /(\/\/[^\n]*)|('(?:\\.|[^'\\])*'|"(?:\\.|[^"\\])*")|(@\w+)|\b(import|class|extends|final|return|void|const|new|var|async|await|if|else|true|false)\b|\b([A-Z][a-zA-Z0-9_]*)\b|(\b\d+(?:\.\d+)?\b)/g;

      let lastIndex = 0;
      let result = "";
      let match;

      while ((match = dartTokenRegex.exec(text)) !== null) {
        if (match.index > lastIndex) {
          result += escapeHtml(text.slice(lastIndex, match.index));
        }

        const [full, comment, str, annotation, kw, type, num] = match;
        if (comment) {
          result += `<span class="text-slate-500 italic">${escapeHtml(comment)}</span>`;
        } else if (str) {
          result += `<span class="text-amber-300 dark:text-amber-200">${escapeHtml(str)}</span>`;
        } else if (annotation) {
          result += `<span class="text-purple-400">${escapeHtml(annotation)}</span>`;
        } else if (kw) {
          result += `<span class="text-sky-400 font-medium">${escapeHtml(kw)}</span>`;
        } else if (type) {
          result += `<span class="text-emerald-300 dark:text-emerald-400 font-medium">${escapeHtml(type)}</span>`;
        } else if (num) {
          result += `<span class="text-rose-300 dark:text-rose-400">${escapeHtml(num)}</span>`;
        } else {
          result += escapeHtml(full);
        }
        lastIndex = dartTokenRegex.lastIndex;
      }
      if (lastIndex < text.length) {
        result += escapeHtml(text.slice(lastIndex));
      }
      return result;
    }

    return escapeHtml(text);
  };

  return (
    <div className="rounded-xl overflow-hidden border border-slate-800 bg-[#0f172a] shadow-lg">
      {/* Code Editor Header */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-[#090d16] border-b border-slate-800/80">
        <div className="flex items-center gap-3 overflow-x-auto">
          {/* MacOS Window Dots */}
          <div className="flex items-center gap-1.5 pr-2 border-r border-slate-800 shrink-0">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80 inline-block"></span>
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80 inline-block"></span>
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80 inline-block"></span>
          </div>
          {/* File Tabs */}
          <div className="flex items-center gap-1.5">
            {files.map((file) => (
              <button
                key={file.filename}
                onClick={() => setActiveFilename(file.filename)}
                className={`px-2.5 py-1 text-xs font-mono rounded-md transition-all ${
                  activeFilename === file.filename
                    ? "bg-slate-800 text-slate-100 font-semibold border border-slate-700/80"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                }`}
              >
                {file.filename}
              </button>
            ))}
          </div>
        </div>

        {/* Copy Button */}
        <button
          onClick={handleCopy}
          className="shrink-0 flex items-center gap-1.5 px-2.5 py-1 text-xs text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-md transition border border-slate-700/80"
        >
          {copied ? (
            <span className="text-emerald-400 flex items-center gap-1 font-medium">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7"/></svg>
              Copied
            </span>
          ) : (
            <span className="flex items-center gap-1">
              <svg className="w-3.5 h-3.5 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>
              Copy
            </span>
          )}
        </button>
      </div>

      {/* Code Content */}
      <div className="p-4 overflow-x-auto no-scrollbar [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] text-xs font-mono leading-relaxed text-slate-200">
        <pre>
          <code
            dangerouslySetInnerHTML={{
              __html: activeFile ? highlight(activeFile.code, activeFile.language) : "",
            }}
          />
        </pre>
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
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [activeMethodTab, setActiveMethodTab] = useState<
    "webview" | "artifact" | "source" | "native" | "deeplink"
  >("webview");

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
        <div className="space-y-6 text-sm text-slate-600 dark:text-slate-300">
          <p className="leading-relaxed">
            The Super App Mini App ecosystem provides a high-performance, sandboxed runtime enabling autonomous delivery of vertical services. The platform strictly isolates third-party business logic while enabling standardized access to device features and Super App APIs.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-5 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 space-y-3">
              <div className="w-9 h-9 rounded-lg bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <UserIcon />
              </div>
              <h4 className="font-bold text-slate-900 dark:text-white text-base">MA Manager</h4>
              <span className="inline-block px-2 py-0.5 text-xs font-semibold rounded bg-slate-200/70 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                External / Mini App Team
              </span>
              <ul className="text-xs space-y-1.5 text-slate-600 dark:text-slate-400">
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
              <h4 className="font-bold text-slate-900 dark:text-white text-base">SA Admin</h4>
              <span className="inline-block px-2 py-0.5 text-xs font-semibold rounded bg-slate-200/70 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                Super App Platform Owner
              </span>
              <ul className="text-xs space-y-1.5 text-slate-600 dark:text-slate-400">
                <li>• Reviews integration contracts</li>
                <li>• Approves new capability requests</li>
                <li>• Audits automated security scans</li>
                <li>• Authorizes CI integration builds</li>
                <li>• Grants final release activation</li>
              </ul>
            </div>

            <div className="p-5 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 space-y-3">
              <div className="w-9 h-9 rounded-lg bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                <SettingsIcon />
              </div>
              <h4 className="font-bold text-slate-900 dark:text-white text-base">System CI (Jenkins)</h4>
              <span className="inline-block px-2 py-0.5 text-xs font-semibold rounded bg-slate-200/70 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                Automated Engine
              </span>
              <ul className="text-xs space-y-1.5 text-slate-600 dark:text-slate-400">
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
        <div className="space-y-6 text-sm text-slate-600 dark:text-slate-300">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-5 bg-slate-50/50 dark:bg-slate-900/40">
              <h5 className="font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-2">
                <TagIcon /> Mini App Identity
              </h5>
              <p className="text-xs text-slate-600 dark:text-slate-400 mb-3">
                Every Mini App registers an immutable unique identifier prefixed with <code className="font-mono text-brand-600 dark:text-brand-400">miniapp_</code>.
              </p>
              <div className="bg-slate-900 text-slate-200 px-3 py-2 rounded-lg font-mono text-xs">
                miniapp_banking_8f32a1
              </div>
              <p className="text-xs text-slate-500 mt-2">
                Allowed: lowercase letters, digits, and underscores.
              </p>
            </div>

            <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-5 bg-slate-50/50 dark:bg-slate-900/40">
              <h5 className="font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-2">
                <HashIcon /> Semantic Versioning
              </h5>
              <p className="text-xs text-slate-600 dark:text-slate-400 mb-3">
                Strict adherence to SemVer 2.0.0 is mandated for all build artifacts and releases.
              </p>
              <div className="bg-slate-900 text-slate-200 px-3 py-2 rounded-lg font-mono text-xs">
                MAJOR.MINOR.PATCH (e.g. 1.4.2)
              </div>
              <p className="text-xs text-slate-500 mt-2">
                Duplicate version numbers in the same environment are rejected.
              </p>
            </div>
          </div>

          <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 space-y-3">
            <h5 className="font-semibold text-slate-900 dark:text-white text-xs uppercase tracking-wider">
              Environment Segregation
            </h5>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <div className="p-3 rounded-lg bg-slate-100 dark:bg-slate-800/60">
                <span className="font-bold text-slate-800 dark:text-slate-200 block mb-1">DEV</span>
                <p className="text-slate-600 dark:text-slate-400">For ongoing feature work and local developer sandbox harnesses.</p>
              </div>
              <div className="p-3 rounded-lg bg-slate-100 dark:bg-slate-800/60">
                <span className="font-bold text-slate-800 dark:text-slate-200 block mb-1">STAGING</span>
                <p className="text-slate-600 dark:text-slate-400">Pre-production verification against real Super App test builds.</p>
              </div>
              <div className="p-3 rounded-lg bg-slate-100 dark:bg-slate-800/60">
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
        <div className="space-y-6 text-sm text-slate-600 dark:text-slate-300">
          <p>
            Mini Apps operate within a controlled sandbox. All platform interactions (authentication, device camera, navigation, network tokens) must pass through the official <code>SuperAppSDK</code>.
          </p>

          <VSCodeEditor
            files={[
              {
                filename: "entrypoint.dart",
                language: "dart",
                code: `import 'package:flutter/material.dart';\nimport 'package:super_app_sdk/super_app_sdk.dart';\n\n// Official Mini App entrypoint contract\nclass MiniAppEntryPoint extends MiniAppWidget {\n  @override\n  Widget build(BuildContext context, MiniAppContext appCtx) {\n    final user = appCtx.auth.currentUser;\n    final token = appCtx.auth.accessToken;\n\n    return Scaffold(\n      appBar: SuperAppBar(title: 'Food Delivery', appCtx: appCtx),\n      body: MiniAppHomeView(user: user, apiToken: token),\n    );\n  }\n}`,
              },
              {
                filename: "pubspec.yaml",
                language: "yaml",
                code: `name: food_delivery_miniapp\ndescription: A Food Delivery Mini App module\nversion: 1.0.0\n\nenvironment:\n  sdk: '>=3.2.0 <4.0.0'\n  flutter: '>=3.16.0'\n\ndependencies:\n  flutter:\n    sdk: flutter\n  super_app_sdk: ^1.2.0\n  http: ^1.1.0`,
              },
              {
                filename: "security-rule.yaml",
                language: "yaml",
                code: `rules:\n  - id: forbid-main-entrypoint\n    patterns:\n      - pattern: void main() { ... }\n    message: "Mini Apps must not define void main() or invoke runApp()."\n    severity: ERROR\n    languages: [dart]\n  - id: forbid-exit-calls\n    pattern: exit($CODE)\n    message: "Mini Apps cannot terminate the host Super App process."\n    severity: ERROR\n    languages: [dart]`,
              },
            ]}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="p-4 rounded-xl border border-rose-200 dark:border-rose-900/40 bg-rose-50/50 dark:bg-rose-950/20 text-rose-900 dark:text-rose-300 space-y-2">
              <strong className="flex items-center gap-1.5 font-bold text-rose-700 dark:text-rose-400">
                <BanIcon /> Strictly Prohibited
              </strong>
              <ul className="space-y-1 list-disc pl-4 text-slate-700 dark:text-slate-300">
                <li>No <code>void main()</code> or <code>runApp()</code> entrypoints</li>
                <li>No direct <code>exit(0)</code> or <code>SystemNavigator.pop()</code></li>
                <li>No custom unvetted <code>MethodChannel</code> calls</li>
                <li>No direct modification of Super App theme globals</li>
              </ul>
            </div>

            <div className="p-4 rounded-xl border border-emerald-200 dark:border-emerald-900/40 bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-900 dark:text-emerald-300 space-y-2">
              <strong className="flex items-center gap-1.5 font-bold text-emerald-700 dark:text-emerald-400">
                <CheckCircleIcon /> Required Conventions
              </strong>
              <ul className="space-y-1 list-disc pl-4 text-slate-700 dark:text-slate-300">
                <li>Extend <code>MiniAppWidget</code> as the root view</li>
                <li>Consume <code>MiniAppContext</code> for auth and tokens</li>
                <li>Use <code>SuperAppSDK.navigation</code> for host routing</li>
                <li>Declare required device features via Capabilities</li>
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
        "Detailed breakdown, requirements, security checks, and specifications for all 5 integration channels.",
      badge: "Comprehensive Matrix",
      content: (
        <div className="space-y-6 text-sm text-slate-600 dark:text-slate-300">
          <p>
            The Super App platform supports 5 distinct integration tiers tailored to your deployment strategy and source confidentiality requirements:
          </p>

          {/* Interactive Method Tabs */}
          <div className="flex border-b border-slate-200 dark:border-slate-800 overflow-x-auto no-scrollbar [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] gap-1">
            {[
              { id: "webview", label: "WebView & Domain Verification", icon: <GlobeIcon /> },
              { id: "artifact", label: "Package Artifact", icon: <PackageIcon /> },
              { id: "source", label: "Source Code", icon: <FolderIcon /> },
              { id: "native", label: "Native SDK", icon: <WrenchIcon /> },
              { id: "deeplink", label: "Deep Link", icon: <LinkIcon /> },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveMethodTab(tab.id as any)}
                className={`px-4 py-2.5 text-xs font-semibold rounded-t-lg transition flex items-center gap-2 border-b-2 -mb-px whitespace-nowrap ${
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
                <h5 className="text-base font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
                  <GlobeIcon /> WebView Integration
                </h5>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  Embeds external web applications into an isolated, secure Super App WebView container. The web application interacts with native features via the standardized JavaScript Bridge.
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
                        <h5 className="text-lg font-bold text-slate-900 dark:text-white">
                          Domain Ownership Verification (.well-known)
                        </h5>
                        <p className="text-xs text-slate-600 dark:text-slate-400">
                          Host <code className="text-brand-600 dark:text-brand-400 font-semibold font-mono">superapp-miniapp-association.json</code> to prove administrative control
                        </p>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-brand-100 text-brand-800 dark:bg-brand-950 dark:text-brand-300 border border-brand-300 dark:border-brand-800">
                      Mandatory for WebView
                    </span>
                  </div>

                  <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                    To prevent malicious framing of third-party websites or hijacking WebView sessions, the Super App requires all WebView Mini Apps to host an association manifest proving origin ownership before activation.
                  </p>

                  <div className="space-y-4">
                    <h6 className="font-bold text-slate-900 dark:text-white text-xs flex items-center gap-1.5">
                      <TargetIcon /> 1. Expected Endpoint URL
                    </h6>
                    <div className="p-3 bg-slate-900 text-slate-100 rounded-lg font-mono text-xs overflow-x-auto">
                      <span>https://&lt;your-domain&gt;/.well-known/superapp-miniapp-association.json</span>
                    </div>

                    <h6 className="font-bold text-slate-900 dark:text-white text-xs flex items-center gap-1.5 pt-2">
                      <ClipboardIcon /> 2. Manifest JSON Schema & Deployment Configs
                    </h6>
                    <VSCodeEditor
                      files={[
                        {
                          filename: "superapp-miniapp-association.json",
                          language: "json",
                          code: `{\n  "appId": "miniapp_banking_8f32a1",\n  "verificationToken": "tok_live_7e8b91c23f4a012d987e45b6a1c2d3e4",\n  "environment": "DEV",\n  "allowedDomains": [\n    "banking.partner.com",\n    "auth.partner.com"\n  ],\n  "permissions": [\n    "Camera",\n    "Location"\n  ]\n}`,
                        },
                        {
                          filename: "Next.js (App / Pages)",
                          language: "yaml",
                          code: `# Place the file in your public directory:\n# your-project/public/.well-known/superapp-miniapp-association.json\n# Next.js will automatically serve it statically at:\n# https://your-domain.com/.well-known/superapp-miniapp-association.json`,
                        },
                        {
                          filename: "nginx.conf",
                          language: "yaml",
                          code: `# Nginx location block configuration\nlocation /.well-known/ {\n    root /var/www/html;\n    default_type application/json;\n    add_header Access-Control-Allow-Origin *;\n    try_files $uri =404;\n}`,
                        },
                        {
                          filename: "Express (Node.js)",
                          language: "dart",
                          code: `// Express.js static route\napp.use('/.well-known', express.static(path.join(__dirname, 'public/.well-known'), {\n  setHeaders: (res) => {\n    res.setHeader('Content-Type', 'application/json');\n    res.setHeader('Access-Control-Allow-Origin', '*');\n  }\n}));`,
                        },
                      ]}
                    />

                    <h6 className="font-bold text-slate-900 dark:text-white text-xs flex items-center gap-1.5 pt-2">
                      <CheckCircleIcon /> 3. Verification HTTP Requirements
                    </h6>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                      <div className="p-3 rounded-lg bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
                        <strong className="text-slate-900 dark:text-slate-100 block mb-1">HTTP Status: 200 OK</strong>
                        <span className="text-slate-600 dark:text-slate-400">Must respond with 200 OK without redirects (301/302).</span>
                      </div>
                      <div className="p-3 rounded-lg bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
                        <strong className="text-slate-900 dark:text-slate-100 block mb-1">Content-Type Header</strong>
                        <span className="text-slate-600 dark:text-slate-400">Must be <code className="text-brand-600 dark:text-brand-400 font-mono">application/json</code>.</span>
                      </div>
                      <div className="p-3 rounded-lg bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
                        <strong className="text-slate-900 dark:text-slate-100 block mb-1">Public Accessibility</strong>
                        <span className="text-slate-600 dark:text-slate-400">Accessible without Basic Auth, VPNs, or IP firewalls.</span>
                      </div>
                      <div className="p-3 rounded-lg bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
                        <strong className="text-slate-900 dark:text-slate-100 block mb-1">CORS Headers</strong>
                        <span className="text-slate-600 dark:text-slate-400">Include <code className="text-brand-600 dark:text-brand-400 font-mono">Access-Control-Allow-Origin: *</code>.</span>
                      </div>
                    </div>

                    <h6 className="font-bold text-slate-900 dark:text-white text-xs flex items-center gap-1.5 pt-2">
                      <WrenchIcon /> 4. Testing with cURL
                    </h6>
                    <div className="p-3 bg-slate-900 text-slate-200 rounded-lg font-mono text-xs space-y-1">
                      <p className="text-slate-400"># Verify the endpoint response in terminal:</p>
                      <p className="text-emerald-400">curl -i https://&lt;your-domain&gt;/.well-known/superapp-miniapp-association.json</p>
                    </div>
                  </div>
                </div>
              </section>
            </div>
          )}

          {/* Method 2: Flutter Package Artifact */}
          {activeMethodTab === "artifact" && (
            <div className="space-y-4 pt-2">
              <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 space-y-3">
                <h5 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <PackageIcon /> Flutter Package Artifact (.tar.gz / .zip)
                </h5>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  Integrates a pre-compiled Flutter package archive directly. Uses zero-trust MinIO pre-signed URLs (50MB limit, 5-minute expiry) to upload directly to quarantine storage before inspection.
                </p>
              </div>
            </div>
          )}

          {/* Method 3: Flutter Source Code */}
          {activeMethodTab === "source" && (
            <div className="space-y-4 pt-2">
              <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 space-y-3">
                <h5 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <FolderIcon /> Flutter Package Source Code (Git)
                </h5>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  Links a Git repository (GitHub/GitLab) with Commit SHA locking. Allows maximum tree-shaking optimization and runtime performance inside the Super App host shell.
                </p>
              </div>
            </div>
          )}

          {/* Method 4: Native SDK */}
          {activeMethodTab === "native" && (
            <div className="space-y-4 pt-2">
              <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 space-y-3">
                <h5 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <WrenchIcon /> Native SDK (.aar / .xcframework)
                </h5>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  Embeds platform-specific binaries for specialized hardware or legacy modules. Requires architectural manual review by the Super App administration team.
                </p>
              </div>
            </div>
          )}

          {/* Method 5: Deep Link */}
          {activeMethodTab === "deeplink" && (
            <div className="space-y-4 pt-2">
              <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 space-y-3">
                <h5 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <LinkIcon /> Deep Link Router
                </h5>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  Treats the Super App as a discovery launchpad, redirecting the user to a standalone mobile app installed on the device via registered App Links / Universal Links.
                </p>
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
        <div className="space-y-6 text-sm text-slate-600 dark:text-slate-300">
          <p className="leading-relaxed">
            The Super App acts as the <strong>central authority for all Mini App capabilities and permissions</strong>. To maintain zero security drift and strict platform governance, permissions follow a zero-trust runtime access model.
          </p>

          {/* Core Gatekeeper Banner */}
          <div className="p-5 rounded-xl border-l-4 border-brand-500 bg-brand-50/70 dark:bg-brand-950/30 text-xs text-brand-900 dark:text-brand-200 space-y-2">
            <span className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-[11px] block">
              Core Platform Principle: Capability Gatekeeper
            </span>
            <p className="italic font-medium leading-relaxed">
              &ldquo;The Super App is the single central gatekeeper for all Mini App capabilities. A Mini App may request any capability, but it can only use capabilities exposed and supported by the Super App. Unsupported capabilities must be genuinely inaccessible.&rdquo;
            </p>
          </div>

          {/* Strategy to Maximize App Store & Google Play Approval */}
          <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h5 className="font-bold text-slate-900 dark:text-white text-xs uppercase tracking-wider flex items-center gap-2">
                <span>🛡️ Maximizing App Store & Google Play Approval Probability</span>
              </h5>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                Apple Guideline 4.7 & Google Play Host Policy
              </span>
            </div>
            
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Apple and Google review the host application, metadata, third-party code, permissions, and runtime behavior. To maximize approval probability and prevent platform rejection, the Super App implements seven mandatory architectural pillars:
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div className="p-3.5 rounded-lg bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-1">
                <strong className="text-slate-900 dark:text-white font-bold block">1. Super App as Central Gatekeeper</strong>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                  If a Mini App declares 5 capabilities and the Super App exposes 3, the remaining 2 are <strong>genuinely unavailable</strong>—not secretly accessible through raw native APIs or hidden bridge hooks.
                </p>
              </div>

              <div className="p-3.5 rounded-lg bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-1">
                <strong className="text-slate-900 dark:text-white font-bold block">2. Separate Required vs. Optional Capabilities</strong>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                  If a Mini App requires an unsupported capability for its <strong>core function</strong> → <strong>Reject the Mini App</strong>. If it is <strong>optional</strong> → Integrate it, but disable that specific feature cleanly.
                </p>
              </div>

              <div className="p-3.5 rounded-lg bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-1">
                <strong className="text-slate-900 dark:text-white font-bold block">3. Just-in-Time Runtime Requests</strong>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                  Runtime permission requests apply only to supported capabilities. Prompt the user <strong>at runtime when the feature is actually used</strong> (Google Play compliance requirement).
                </p>
              </div>

              <div className="p-3.5 rounded-lg bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-1">
                <strong className="text-slate-900 dark:text-white font-bold block">4. Strict Capability Layer Isolation</strong>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                  Host app is 100% legally and technically responsible for hosted software under Apple rules and must never expose native platform APIs/technologies without authorization.
                </p>
              </div>

              <div className="p-3.5 rounded-lg bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-1">
                <strong className="text-slate-900 dark:text-white font-bold block">5. Pre-Publish Automated Validation</strong>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                  Validate every Mini App before publishing (capabilities, privacy/data use, URLs, TLS, prohibited content, and actual behavior) to protect host app integrity.
                </p>
              </div>

              <div className="p-3.5 rounded-lg bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-1">
                <strong className="text-slate-900 dark:text-white font-bold block">6. Accurate Data Disclosures</strong>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                  Clearly disclose what data is collected, why, and with whom it is shared across Info.plist usage descriptions and Google Play Prominent In-App Disclosures.
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-lg bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-900/50 text-xs space-y-1">
              <strong className="text-indigo-950 dark:text-indigo-200 font-bold block">7. Apple Guideline 4.7 & Manifest Compliance</strong>
              <p className="text-indigo-900 dark:text-indigo-300 leading-relaxed">
                Implements structured Mini App manifest declarations (bundle metadata, version constraints, age rating, and sandboxed bridge scopes) aligned with Apple&apos;s Mini Apps Partner Program.
              </p>
            </div>
          </div>

          {/* Practical Example & Decision Flow */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Practical Example */}
            <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 space-y-3">
              <h5 className="font-bold text-slate-900 dark:text-white text-xs uppercase tracking-wider">
                Capability Matching Example
              </h5>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Evaluating declared capabilities against Super App platform support:
              </p>
              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                <div className="p-2.5 rounded-lg bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
                  <span className="text-[10px] text-slate-400 font-sans block mb-1 font-semibold uppercase">Super App Supports:</span>
                  <div className="text-emerald-600 dark:text-emerald-400">• Camera ✅</div>
                  <div className="text-emerald-600 dark:text-emerald-400">• Location ✅</div>
                  <div className="text-emerald-600 dark:text-emerald-400">• Notification ✅</div>
                </div>
                <div className="p-2.5 rounded-lg bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
                  <span className="text-[10px] text-slate-400 font-sans block mb-1 font-semibold uppercase">Mini App Requests (5):</span>
                  <div className="text-emerald-600 dark:text-emerald-400">• Camera (Req) ✅</div>
                  <div className="text-emerald-600 dark:text-emerald-400">• Location (Req) ✅</div>
                  <div className="text-emerald-600 dark:text-emerald-400">• Notification (Opt) ✅</div>
                  <div className="text-rose-500 font-semibold">• Contacts (Opt) ❌</div>
                  <div className="text-rose-500 font-semibold">• Microphone (Req) ⚠️</div>
                </div>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Outcome: If Microphone is <strong>Required</strong>, the Mini App is <strong>REJECTED</strong>. If marked <strong>Optional</strong>, the Mini App is approved with Camera/Location/Notification active and Contacts/Microphone safely disabled.
              </p>
            </div>

            {/* Decision Flowchart */}
            <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 space-y-3">
              <h5 className="font-bold text-slate-900 dark:text-white text-xs uppercase tracking-wider">
                The Final Decision Rule Flow
              </h5>
              <div className="p-3 bg-slate-900 text-slate-200 rounded-lg font-mono text-[11px] leading-relaxed">
                <div className="text-slate-400">Mini App requests N capabilities</div>
                <div className="text-slate-500 pl-4">↓ Compare with Super App catalog (M supported)</div>
                <div className="text-amber-400">Required capability unsupported?</div>
                <div className="text-rose-400 pl-4">├── Yes → ❌ REJECT Mini App</div>
                <div className="text-emerald-400 pl-4">└── No  → ✅ Continue (Optional features disabled)</div>
                <div className="text-slate-400 pl-8">↓</div>
                <div className="text-indigo-300 pl-8">M supported capabilities exposed</div>
                <div className="text-slate-400 pl-8">↓</div>
                <div className="text-emerald-300 pl-8">Runtime JIT permission prompt → Allowed</div>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                Unsupported capabilities are <strong>technically inaccessible</strong> in the sandbox, ensuring host stability and zero store policy violations.
              </p>
            </div>
          </div>

          {/* Capability Catalog Table */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40">
              <h5 className="font-bold text-slate-900 dark:text-white text-xs uppercase tracking-wider mb-3">
                Supported Super App Capabilities
              </h5>
              <div className="space-y-2">
                {[
                  { code: "CAMERA", name: "Camera Access", desc: "android.permission.CAMERA / NSCameraUsageDescription", approval: true },
                  { code: "LOCATION", name: "Geolocation", desc: "ACCESS_FINE_LOCATION / NSLocationWhenInUseUsageDescription", approval: true },
                  { code: "MICROPHONE", name: "Audio Record", desc: "RECORD_AUDIO / NSMicrophoneUsageDescription", approval: true },
                  { code: "CLIPBOARD", name: "Clipboard API", desc: "SuperAppSDK Clipboard Bridge", approval: false },
                  { code: "NOTIFICATION", name: "Push Alerts", desc: "POST_NOTIFICATIONS / APNS Token Scopes", approval: true },
                ].map((cap) => (
                  <div key={cap.code} className="p-2.5 rounded-lg bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-2">
                    <div>
                      <span className="font-mono font-bold text-xs text-brand-600 dark:text-brand-400">{cap.code}</span>
                      <span className="text-xs text-slate-600 dark:text-slate-300 ml-2">{cap.name}</span>
                    </div>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                      cap.approval ? "bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300" : "bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400"
                    }`}>
                      {cap.approval ? "Approval Required" : "Auto-Approved"}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 flex flex-col justify-between space-y-3">
              <div>
                <h5 className="font-bold text-slate-900 dark:text-white text-xs uppercase tracking-wider mb-2">
                  DAG Resolver & App Store Compliance
                </h5>
                <p className="text-xs text-slate-600 dark:text-slate-400 mb-2 leading-relaxed">
                  Composite capabilities (e.g. <code>VIDEO_CALL</code>) automatically resolve required child dependencies (<code>CAMERA</code> + <code>MICROPHONE</code>) via DAG topological sorting.
                </p>
                <div className="p-3 bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg text-xs space-y-1">
                  <strong className="text-slate-900 dark:text-white block">App Store & Play Store Publishing Note:</strong>
                  <span className="text-slate-600 dark:text-slate-400">Having a Mini App request capabilities does not prevent the Super App from being published. Compliance is determined by proper implementation, purpose disclosure strings, and store guidelines.</span>
                </div>
              </div>
              <div className="p-2.5 bg-brand-50/60 dark:bg-brand-950/30 border border-brand-200 dark:border-brand-900/50 rounded-lg text-[11px] text-brand-800 dark:text-brand-300 font-medium">
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
        <div className="space-y-6 text-sm text-slate-600 dark:text-slate-300">
          <p>
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
                  <h5 className="font-bold text-slate-900 dark:text-white text-sm">{scanner.name}</h5>
                  <span className="text-[10px] uppercase font-bold text-brand-600 dark:text-brand-400">Hard Gate</span>
                </div>
                <span className="text-xs font-medium text-slate-500 block mb-2">{scanner.type}</span>
                <p className="text-xs text-slate-600 dark:text-slate-400">{scanner.desc}</p>
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
        <div className="space-y-6 text-sm text-slate-600 dark:text-slate-300">
          <p>
            Mini App integrations transition through a strictly governed finite state machine ensuring complete traceability:
          </p>

          <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40">
            <LifecycleFlow />
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
        <div className="space-y-3 text-sm text-slate-600 dark:text-slate-300">
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
            <div key={idx} className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 space-y-1.5">
              <div className="font-mono font-bold text-xs text-rose-600 dark:text-rose-400">{item.issue}</div>
              <p className="text-xs text-slate-700 dark:text-slate-300"><span className="font-semibold text-slate-900 dark:text-white">Cause: </span>{item.cause}</p>
              <p className="text-xs text-slate-700 dark:text-slate-300"><span className="font-semibold text-emerald-600 dark:text-emerald-400">Fix: </span>{item.fix}</p>
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
            <div className="w-7 h-7 rounded-lg bg-brand-600 text-white flex items-center justify-center font-extrabold text-sm shadow-sm">
              <Image src="/fsa-logo.png" alt="FSA Logo" width={20} height={20} className="object-cover rounded-full" />
            </div>
            <span className="text-base tracking-tight font-extrabold text-slate-900 dark:text-white">
              Super App <span className="text-brand-600 dark:text-brand-400 font-medium">Docs</span>
            </span>
          </Link>
          <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-mono font-medium border border-slate-200 dark:border-slate-700">
            v2.4
          </span>
        </div>

        {/* Global Action Links */}
        <div className="flex items-center gap-4 text-xs font-medium">
          <Link
            href="/miniapps/register"
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-700 text-white font-semibold transition shadow-sm"
          >
            Register Mini App
          </Link>
          <div className="h-4 w-px bg-slate-200 dark:bg-slate-800 hidden sm:block"></div>
          <ThemeToggle />
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition"
          >
            <span>Dashboard</span>
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg>
          </Link>
        </div>
      </header>

      {/* 3-Column Layout */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Left Navigation Sidebar */}
        <aside className="w-72 border-r border-slate-200 dark:border-slate-800/80 bg-white/70 dark:bg-slate-900/60 backdrop-blur-sm overflow-y-auto no-scrollbar [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] shrink-0 flex flex-col py-6 px-4 relative z-10">
          {/* Search Bar */}
          <div className="relative mb-6">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search documentation..."
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-brand-500 transition"
            />
            <div className="absolute left-2.5 top-2 text-slate-400">
              <SearchIcon />
            </div>
          </div>

          {/* Navigation Tree */}
          <div className="space-y-6 text-xs">
            <div>
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-2 mb-2">Getting Started</div>
              <nav className="space-y-0.5">
                {sections.slice(0, 2).map((sec) => (
                  <a
                    key={sec.id}
                    href={`#${sec.id}`}
                    onClick={() => setActiveSection(sec.id)}
                    className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg font-medium transition ${
                      activeSection === sec.id
                        ? "bg-brand-50 dark:bg-brand-950/50 text-brand-600 dark:text-brand-400 font-semibold"
                        : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200"
                    }`}
                  >
                    <span className="w-4 h-4 opacity-70"><FolderIcon /></span>
                    <span>{sec.shortTitle || sec.title}</span>
                  </a>
                ))}
              </nav>
            </div>

            <div>
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-2 mb-2">Integration Methods</div>
              <nav className="space-y-0.5">
                <a
                  href="#methods"
                  onClick={() => { setActiveSection("methods"); setActiveMethodTab("webview"); }}
                  className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg font-medium transition ${
                    activeSection === "methods" && activeMethodTab === "webview"
                      ? "bg-brand-50 dark:bg-brand-950/50 text-brand-600 dark:text-brand-400 font-semibold"
                      : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                  }`}
                >
                  <span className="w-4 h-4 opacity-70"><GlobeIcon /></span>
                  <span>WebView & Domain Verify</span>
                </a>
                <a
                  href="#methods"
                  onClick={() => { setActiveSection("methods"); setActiveMethodTab("artifact"); }}
                  className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg font-medium transition ${
                    activeSection === "methods" && activeMethodTab === "artifact"
                      ? "bg-brand-50 dark:bg-brand-950/50 text-brand-600 dark:text-brand-400 font-semibold"
                      : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                  }`}
                >
                  <span className="w-4 h-4 opacity-70"><PackageIcon /></span>
                  <span>Package Artifact</span>
                </a>
                <a
                  href="#methods"
                  onClick={() => { setActiveSection("methods"); setActiveMethodTab("source"); }}
                  className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg font-medium transition ${
                    activeSection === "methods" && activeMethodTab === "source"
                      ? "bg-brand-50 dark:bg-brand-950/50 text-brand-600 dark:text-brand-400 font-semibold"
                      : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                  }`}
                >
                  <span className="w-4 h-4 opacity-70"><FolderIcon /></span>
                  <span>Source Code (Git)</span>
                </a>
                <a
                  href="#methods"
                  onClick={() => { setActiveSection("methods"); setActiveMethodTab("native"); }}
                  className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg font-medium transition ${
                    activeSection === "methods" && activeMethodTab === "native"
                      ? "bg-brand-50 dark:bg-brand-950/50 text-brand-600 dark:text-brand-400 font-semibold"
                      : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                  }`}
                >
                  <span className="w-4 h-4 opacity-70"><WrenchIcon /></span>
                  <span>Native SDK</span>
                </a>
                <a
                  href="#methods"
                  onClick={() => { setActiveSection("methods"); setActiveMethodTab("deeplink"); }}
                  className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg font-medium transition ${
                    activeSection === "methods" && activeMethodTab === "deeplink"
                      ? "bg-brand-50 dark:bg-brand-950/50 text-brand-600 dark:text-brand-400 font-semibold"
                      : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                  }`}
                >
                  <span className="w-4 h-4 opacity-70"><LinkIcon /></span>
                  <span>Deep Link</span>
                </a>
              </nav>
            </div>

            <div>
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-2 mb-2">Architecture & Rules</div>
              <nav className="space-y-0.5">
                {sections.slice(2, 3).concat(sections.slice(4, 6)).map((sec) => (
                  <a
                    key={sec.id}
                    href={`#${sec.id}`}
                    onClick={() => setActiveSection(sec.id)}
                    className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg font-medium transition ${
                      activeSection === sec.id
                        ? "bg-brand-50 dark:bg-brand-950/50 text-brand-600 dark:text-brand-400 font-semibold"
                        : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200"
                    }`}
                  >
                    <span className="w-4 h-4 opacity-70"><ShieldIcon /></span>
                    <span>{sec.shortTitle || sec.title}</span>
                  </a>
                ))}
              </nav>
            </div>

            <div>
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-2 mb-2">Operations & Support</div>
              <nav className="space-y-0.5">
                {sections.slice(6).map((sec) => (
                  <a
                    key={sec.id}
                    href={`#${sec.id}`}
                    onClick={() => setActiveSection(sec.id)}
                    className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg font-medium transition ${
                      activeSection === sec.id
                        ? "bg-brand-50 dark:bg-brand-950/50 text-brand-600 dark:text-brand-400 font-semibold"
                        : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200"
                    }`}
                  >
                    <span className="w-4 h-4 opacity-70"><SettingsIcon /></span>
                    <span>{sec.shortTitle || sec.title}</span>
                  </a>
                ))}
              </nav>
            </div>
          </div>
        </aside>

        {/* Center Content Area */}
        <main className="flex-1 overflow-y-auto no-scrollbar [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] bg-white dark:bg-slate-950 relative scroll-smooth px-6 sm:px-10 lg:px-12 py-10">
          <div className="max-w-4xl mx-auto space-y-16 pb-24">
            {filteredSections.map((sec, index) => (
              <section key={sec.id} id={sec.id} className="scroll-mt-24">
                {/* Clean Header Bar */}
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-mono font-bold text-brand-600 dark:text-brand-400">
                    Section {sec.number}
                  </span>
                  <span className="text-slate-300 dark:text-slate-700">•</span>
                  <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                    {sec.category}
                  </span>
                </div>

                <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-3">
                  {sec.title}
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
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
        <aside className="w-60 border-l border-slate-200 dark:border-slate-800/80 bg-white/50 dark:bg-slate-900/40 backdrop-blur-sm overflow-y-auto no-scrollbar [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] shrink-0 hidden xl:block py-8 px-5 text-xs">
          <div className="font-semibold text-slate-900 dark:text-white text-xs uppercase tracking-wider mb-3">
            On This Page
          </div>
          <nav className="space-y-1.5 text-slate-600 dark:text-slate-400">
            {sections.map((sec) => (
              <a
                key={sec.id}
                href={`#${sec.id}`}
                onClick={() => setActiveSection(sec.id)}
                className={`block py-1 transition ${
                  activeSection === sec.id
                    ? "text-brand-600 dark:text-brand-400 font-semibold translate-x-1"
                    : "hover:text-slate-900 dark:hover:text-slate-200"
                }`}
              >
                {sec.shortTitle || sec.title}
              </a>
            ))}
          </nav>
        </aside>
      </div>
    </div>
  );
}
