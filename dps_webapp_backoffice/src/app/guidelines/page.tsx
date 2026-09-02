"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { Card } from "@/components/ui/card";
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

const FolderIcon = () => (
  <svg
    className="w-4 h-4 inline-block text-amber-500"
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-1.2-1.8A2 2 0 0 0 7.55 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z" />
  </svg>
);
const WrenchIcon = () => (
  <svg
    className="w-4 h-4 inline-block text-slate-500"
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
  </svg>
);
const SparklesIcon = () => (
  <svg
    className="w-4 h-4 inline-block text-brand-500"
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" />
    <path d="M20 3v4" />
    <path d="M22 5h-4" />
    <path d="M4 17v2" />
    <path d="M5 18H3" />
  </svg>
);
const SearchIcon = () => (
  <svg
    className="w-4 h-4 inline-block text-blue-500"
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="11" cy="11" r="8" />
    <path d="m21 21-4.3-4.3" />
  </svg>
);
const TargetIcon = () => (
  <svg
    className="w-4 h-4 inline-block text-rose-500"
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="12" r="10" />
    <circle cx="12" cy="12" r="6" />
    <circle cx="12" cy="12" r="2" />
  </svg>
);
const ClipboardIcon = () => (
  <svg
    className="w-4 h-4 inline-block text-emerald-500"
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect width="8" height="4" x="8" y="2" rx="1" ry="1" />
    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
  </svg>
);
const SettingsIcon = () => (
  <svg
    className="w-4 h-4 inline-block text-slate-500"
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);
const ShieldIcon = () => (
  <svg
    className="w-4 h-4 inline-block text-rose-500"
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2-1 4-2 7-2 2.82 0 5.3 1.05 7 2a1 1 0 0 1 1 1v7z" />
  </svg>
);
const LinkIcon = () => (
  <svg
    className="w-4 h-4 inline-block text-cyan-500"
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
  </svg>
);
const KeyIcon = () => (
  <svg
    className="w-4 h-4 inline-block text-amber-500"
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="7.5" cy="15.5" r="5.5" />
    <path d="m21 2-9.6 9.6" />
    <path d="m15.5 7.5 3 3L22 7l-3-3" />
  </svg>
);
const PackageIcon = () => (
  <svg
    className="w-4 h-4 inline-block text-purple-500"
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="m7.5 4.27 9 5.15" />
    <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
    <path d="m3.3 7 8.7 5 8.7-5" />
    <path d="M12 22V12" />
  </svg>
);
const CheckCircleIcon = () => (
  <svg
    className="w-4 h-4 inline-block text-emerald-500"
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <polyline points="22 4 12 14.01 9 11.01" />
  </svg>
);
const TagIcon = () => (
  <svg
    className="w-4 h-4 inline-block text-indigo-500"
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M12 2H2v10l9.29 9.29c.94.94 2.48.94 3.42 0l6.58-6.58c.94-.94.94-2.48 0-3.42L12 2Z" />
    <path d="M7 7h.01" />
  </svg>
);
const UserIcon = () => (
  <svg
    className="w-4 h-4 inline-block text-blue-500"
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);
const LightbulbIcon = () => (
  <svg
    className="w-4 h-4 inline-block text-amber-500"
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.9 1.2 1.5 1.5 2.5" />
    <path d="M9 18h6" />
    <path d="M10 22h4" />
  </svg>
);
const HashIcon = () => (
  <svg
    className="w-4 h-4 inline-block text-slate-500"
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <line x1="4" x2="20" y1="9" y2="9" />
    <line x1="4" x2="20" y1="15" y2="15" />
    <line x1="10" x2="8" y1="3" y2="21" />
    <line x1="16" x2="14" y1="3" y2="21" />
  </svg>
);
const BanIcon = () => (
  <svg
    className="w-4 h-4 inline-block text-rose-500"
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="12" r="10" />
    <path d="m4.9 4.9 14.2 14.2" />
  </svg>
);
const CheckIcon = () => (
  <svg
    className="w-4 h-4 inline-block"
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="20 6 9 17 4 12" />
  </svg>
);
const FileTextIcon = () => (
  <svg
    className="w-4 h-4 inline-block"
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" x2="8" y1="13" y2="13" />
    <line x1="16" x2="8" y1="17" y2="17" />
    <line x1="10" x2="8" y1="9" y2="9" />
  </svg>
);
const AlertCircleIcon = () => <svg></svg>;

const VSCodeEditor = ({
  files,
}: {
  files: { filename: string; language: string; code: string }[];
}) => {
  const [activeFilename, setActiveFilename] = useState(files[0].filename);
  const [copied, setCopied] = useState(false);

  const activeFile =
    files.find((f) => f.filename === activeFilename) || files[0];

  const handleCopy = () => {
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
            result += `<span class="text-[#9cdcfe]">${escapeHtml(str)}</span>${escapeHtml(colon)}`;
          } else {
            result += `<span class="text-[#ce9178]">${escapeHtml(str)}</span>`;
          }
        } else if (bool) {
          result += `<span class="text-[#569cd6]">${escapeHtml(bool)}</span>`;
        } else if (num) {
          result += `<span class="text-[#b5cea8]">${escapeHtml(num)}</span>`;
        } else if (bracket) {
          if (bracket === "{" || bracket === "}") {
            result += `<span class="text-[#ffd700]">${escapeHtml(bracket)}</span>`;
          } else if (bracket === "[" || bracket === "]") {
            result += `<span class="text-[#da70d6]">${escapeHtml(bracket)}</span>`;
          } else {
            result += escapeHtml(bracket);
          }
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
              let valFormatted = escapeHtml(val);
              if (val.trim()) {
                if (
                  /^['"].*['"]$/.test(val.trim()) ||
                  /^\[.*\]$/.test(val.trim())
                ) {
                  valFormatted = `<span class="text-[#ce9178]">${escapeHtml(val)}</span>`;
                } else if (/^\d+(\.\d+)*$/.test(val.trim())) {
                  valFormatted = `<span class="text-[#b5cea8]">${escapeHtml(val)}</span>`;
                } else {
                  valFormatted = `<span class="text-[#ce9178]">${escapeHtml(val)}</span>`;
                }
              }
              return `${escapeHtml(prefix)}<span class="text-[#9cdcfe]">${escapeHtml(key)}</span>:${escapeHtml(space)}${valFormatted}`;
            },
          );

          const safeCode =
            formattedCode === codePart ? escapeHtml(codePart) : formattedCode;
          const safeComment = commentPart
            ? `<span class="text-[#6A9955]">${escapeHtml(commentPart)}</span>`
            : "";
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
          result += `<span class="text-[#6A9955]">${escapeHtml(comment)}</span>`;
        } else if (str) {
          result += `<span class="text-[#ce9178]">${escapeHtml(str)}</span>`;
        } else if (annotation) {
          result += `<span class="text-[#c586c0]">${escapeHtml(annotation)}</span>`;
        } else if (kw) {
          result += `<span class="text-[#569cd6]">${escapeHtml(kw)}</span>`;
        } else if (type) {
          result += `<span class="text-[#4ec9b0]">${escapeHtml(type)}</span>`;
        } else if (num) {
          result += `<span class="text-[#b5cea8]">${escapeHtml(num)}</span>`;
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
    <div className="rounded-md border border-[#3c3c3c] bg-[#1e1e1e] shadow-xl overflow-hidden my-4 text-[13px] leading-[1.4rem]">
      {/* VSCode Tab Bar */}
      <div className="flex items-center justify-between bg-[#252526] pr-2">
        <div className="flex items-center overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {files.map((f) => (
            <button
              key={f.filename}
              onClick={() => setActiveFilename(f.filename)}
              className={`flex items-center gap-2 px-3 py-2 font-sans text-xs border-t transition-colors ${
                activeFilename === f.filename
                  ? "bg-[#1e1e1e] text-[#cccccc] border-[#007acc] border-r border-r-[#1e1e1e] -mr-px"
                  : "bg-[#2d2d2d] text-[#969696] border-transparent border-r border-r-[#252526] hover:bg-[#2b2b2b]"
              }`}
            >
              <svg
                className="w-3.5 h-3.5 text-[#519aba]"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9l-7-7z" />
              </svg>
              {f.filename}
            </button>
          ))}
        </div>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-[#cccccc] hover:bg-[#333333] hover:text-white rounded transition-colors font-sans whitespace-nowrap"
        >
          {copied ? (
            <span className="text-[#4ec9b0] flex items-center gap-1">
              <CheckIcon /> Copied
            </span>
          ) : (
            <span className="flex items-center gap-1">
              <ClipboardIcon /> Copy
            </span>
          )}
        </button>
      </div>

      {/* Code Area */}
      <div className="p-4 overflow-x-auto min-h-[200px]">
        <pre className="font-mono text-[#d4d4d4] whitespace-pre">
          <code
            dangerouslySetInnerHTML={{
              __html: highlight(activeFile.code, activeFile.language),
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
<svg
  className="w-4 h-4 inline-block"
  xmlns="http://www.w3.org/2000/svg"
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"
  strokeWidth="2"
  strokeLinecap="round"
  strokeLinejoin="round"
>
  <circle cx="12" cy="12" r="10" />
  <line x1="12" x2="12" y1="8" y2="12" />
  <line x1="12" x2="12.01" y1="16" y2="16" />
</svg>;
const GlobeIcon = () => (
  <svg
    className="w-4 h-4 inline-block text-blue-500"
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="12" r="10" />
    <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
    <path d="M2 12h20" />
  </svg>
);

export default function GuidelinesPage() {
  const [activeCategory, setActiveCategory] = useState<string>("ALL");
  const [activeSection, setActiveSection] = useState<string>("overview");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [copiedIndex, setCopiedIndex] = useState<string | null>(null);
  const [activeCodeTab, setActiveCodeTab] = useState<
    "dart" | "yaml" | "manifest" | "plist" | "semgrep"
  >("dart");
  const [activeMethodTab, setActiveMethodTab] = useState<
    "webview" | "artifact" | "source" | "native" | "deeplink"
  >("webview");

  // ScrollSpy for Sidebar
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        });
      },
      { rootMargin: "-20% 0px -60% 0px" },
    );

    const sectionElements = document.querySelectorAll("section[id]");
    sectionElements.forEach((el) => observer.observe(el));

    return () => {
      sectionElements.forEach((el) => observer.unobserve(el));
    };
  }, []);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(id);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const sections: Section[] = [
    {
      id: "overview",
      number: "01",
      title: "Overview & Ecosystem Roles",
      shortTitle: "Overview",
      category: "GENERAL",
      summary:
        "Roles, architectural boundaries, and governance across the Mini App onboarding lifecycle.",
      badge: "Core Governance",
      content: (
        <div className="space-y-4 text-sm text-slate-600 dark:text-slate-300">
          <p className="leading-relaxed">
            The Super App Mini App ecosystem provides a high-performance,
            sandboxed runtime enabling autonomous delivery of vertical services.
            The platform strictly isolates third-party business logic while
            enabling standardized access to device features and Super App APIs.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            <div className="p-5 rounded-2xl bg-gradient-to-b from-slate-50 to-white dark:from-slate-800/80 dark:to-slate-800/40 border border-slate-200 dark:border-slate-700 shadow-sm hover:border-slate-200 dark:border-slate-700 dark:hover:border-slate-200 dark:border-slate-700 transition-all">
              <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white flex items-center justify-center font-bold text-lg mb-3 shadow-md shadow-slate-500/10">
                <UserIcon />
              </div>
              <h4 className="font-bold text-slate-900 dark:text-white text-base">
                MA Manager
              </h4>
              <span className="inline-block px-2 py-0.5 text-xs font-bold rounded-full bg-slate-100 text-slate-700 dark:bg-slate-800/60 dark:text-slate-300 mt-1 mb-2">
                External / Mini App Team
              </span>
              <ul className="text-base space-y-1.5 text-slate-700 dark:text-slate-300">
                <li>• Registers Mini App metadata & icon</li>
                <li>• Configures integration method & source</li>
                <li>• Reviews detected permission claims</li>
                <li>• Resolves validation & security findings</li>
                <li>• Performs acceptance testing on test builds</li>
              </ul>
            </div>

            <div className="p-5 rounded-2xl bg-gradient-to-b from-slate-50 to-white dark:from-slate-800/80 dark:to-slate-800/40 border border-slate-200 dark:border-slate-700 shadow-sm hover:border-slate-200 dark:border-slate-700 dark:hover:border-slate-200 dark:border-slate-700 transition-all">
              <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white flex items-center justify-center font-bold text-lg mb-3 shadow-md shadow-slate-500/10">
                <ShieldIcon />
              </div>
              <h4 className="font-bold text-slate-900 dark:text-white text-base">
                SA Admin
              </h4>
              <span className="inline-block px-2 py-0.5 text-xs font-bold rounded-full bg-slate-100 text-slate-700 dark:bg-slate-800/60 dark:text-slate-300 mt-1 mb-2">
                Super App Platform Owner
              </span>
              <ul className="text-base space-y-1.5 text-slate-700 dark:text-slate-300">
                <li>• Reviews integration architecture & contracts</li>
                <li>• Approves/rejects new capability requests</li>
                <li>• Audits automated security scans (Gitleaks, Semgrep)</li>
                <li>• Authorizes CI integration builds</li>
                <li>• Grants final release approval & activates version</li>
              </ul>
            </div>

            <div className="p-5 rounded-2xl bg-gradient-to-b from-slate-50 to-white dark:from-slate-800/80 dark:to-slate-800/40 border border-slate-200 dark:border-slate-700 shadow-sm hover:border-slate-200 dark:border-slate-700 dark:hover:border-slate-200 dark:border-slate-700 transition-all">
              <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white flex items-center justify-center font-bold text-lg mb-3 shadow-md shadow-slate-500/10">
                <SettingsIcon />
              </div>
              <h4 className="font-bold text-slate-900 dark:text-white text-base">
                System / CI (Jenkins)
              </h4>
              <span className="inline-block px-2 py-0.5 text-xs font-bold rounded-full bg-slate-100 text-slate-700 dark:bg-slate-800/60 dark:text-slate-300 mt-1 mb-2">
                Automated Engine
              </span>
              <ul className="text-base space-y-1.5 text-slate-700 dark:text-slate-300">
                <li>
                  • Receive validation/build jobs triggered by the Backend
                </li>
                <li>• Retrieve submitted artifacts/source code from MinIO</li>
                <li>• Run backend and method-specific validation</li>
                <li>• Verify Git repository and commit SHA</li>
                <li>
                  • Detect required permissions and capabilities, including DAG
                  dependency resolution
                </li>
                <li>
                  • Compare detected capabilities against the Super App
                  Capability Catalog
                </li>
                <li>• Run security validation and generate SBOM</li>
                <li>• Analyze dependencies and package requirements</li>
                <li>• Build and integrate the Mini App</li>
                <li>• Generate test builds</li>
                <li>• Run validation/build jobs in isolated Jenkins agents</li>
                <li>
                  • Store validation results, SBOMs, and security reports in
                  MinIO
                </li>
                <li>
                  • On successful validation, publish the trusted package to
                  Sonatype Nexus
                </li>
                <li>• Record validation status and immutable audit logs</li>
                <li>• Report validation/build results back to the Backend</li>
              </ul>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "general-requirements",
      number: "02",
      title: "General Integration Requirements & Metadata",
      shortTitle: "Requirements",
      category: "GENERAL",
      summary:
        "Global conventions, naming syntax, SemVer rules, and environment segregation.",
      content: (
        <div className="space-y-4 text-sm text-slate-600 dark:text-slate-300">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="border border-slate-200 dark:border-slate-700 rounded-xl p-4 bg-slate-50/50 dark:bg-slate-800/30">
              <h5 className="font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-2">
                <span className="text-slate-900 dark:text-slate-100">
                  <TagIcon />
                </span>{" "}
                Mini App Identity
              </h5>
              <p className="text-sm text-slate-700 dark:text-slate-300 mb-3">
                Every Mini App must register an immutable unique identifier
                using reverse-domain notation.
              </p>
              <div className="bg-slate-900 text-slate-200 px-3 py-2 rounded-lg font-mono text-xs">
                com.company.module_name
              </div>
              <p className="text-sm text-slate-500 mt-2">
                Allowed: lowercase letters, digits, dots, and underscores.
              </p>
            </div>

            <div className="border border-slate-200 dark:border-slate-700 rounded-xl p-4 bg-slate-50/50 dark:bg-slate-800/30">
              <h5 className="font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-2">
                <span className="text-slate-900 dark:text-slate-100">
                  <HashIcon />
                </span>{" "}
                Versioning Standard
              </h5>
              <p className="text-sm text-slate-700 dark:text-slate-300 mb-3">
                Strict adherence to Semantic Versioning (SemVer 2.0.0) is
                mandated for all releases.
              </p>
              <div className="bg-slate-900 text-slate-200 px-3 py-2 rounded-lg font-mono text-xs">
                MAJOR.MINOR.PATCH (e.g. 2.4.1)
              </div>
              <p className="text-sm text-slate-500 mt-2">
                Duplicate version numbers on the same environment are rejected.
              </p>
            </div>
          </div>

          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 space-y-2">
            <h5 className="font-semibold text-slate-900 dark:text-slate-100 text-xs uppercase tracking-wider">
              Target Environment Segregation
            </h5>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="p-2.5 rounded-lg bg-slate-100 dark:bg-slate-700/50">
                <span className="font-bold text-slate-700 dark:text-slate-300">
                  DEVELOPMENT
                </span>
                <p className="text-sm text-slate-700 dark:text-slate-300 mt-1">
                  For ongoing feature work and local developer test harnesses.
                </p>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-100 dark:bg-slate-700/50">
                <span className="font-bold text-slate-700 dark:text-slate-300">
                  STAGING
                </span>
                <p className="text-sm text-slate-700 dark:text-slate-300 mt-1">
                  Pre-production verification against actual Super App test
                  builds.
                </p>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-100 dark:bg-slate-700/50">
                <span className="font-bold text-slate-700 dark:text-slate-300">
                  PRODUCTION
                </span>
                <p className="text-sm text-slate-700 dark:text-slate-300 mt-1">
                  Publicly active release serving live end-users inside the
                  Super App.
                </p>
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "sdk-contract",
      number: "03",
      title: "Mini App SDK / API Contract & Runtime Constraints",
      shortTitle: "SDK Contract",
      category: "CONTRACT",
      summary:
        "Required bridge APIs, lifecycle bindings, authentication tokens, and strict runtime prohibitions.",
      badge: "Critical Rule",
      content: (
        <div className="space-y-4 text-sm text-slate-600 dark:text-slate-300">
          <p>
            Mini Apps operate within a controlled sandbox. All platform
            interactions (authentication, device camera, navigation, network
            tokens) must pass through the official <code>SuperAppSDK</code>.
            Direct native access via custom MethodChannels or background process
            hijacking is forbidden.
          </p>

          {/* VSCode Editor Tabs */}
          <VSCodeEditor
            files={[
              {
                filename: "entrypoint.dart",
                language: "dart",
                code: `import 'package:flutter/material.dart';\nimport 'package:super_app_sdk/super_app_sdk.dart';\n\n// Official Mini App entrypoint contract\nclass MiniAppEntryPoint extends MiniAppWidget {\n  @override\n  Widget build(BuildContext context, MiniAppContext appCtx) {\n    // Retrieve authenticated user and scoped token\n    final user = appCtx.auth.currentUser;\n    final token = appCtx.auth.accessToken;\n\n    return Scaffold(\n      appBar: SuperAppBar(title: 'Food Delivery', appCtx: appCtx),\n      body: MiniAppHomeView(user: user, apiToken: token),\n    );\n  }\n}`,
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 text-xs">
            <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-700/60 bg-slate-100 dark:bg-slate-800/20 text-slate-700 dark:text-slate-300">
              <strong className="block font-bold mb-1 text-slate-700 dark:text-slate-300">
                <BanIcon /> Strictly Prohibited
              </strong>
              <ul className="space-y-1 list-disc pl-4 text-[12px]">
                <li>
                  No <code>void main()</code> or <code>runApp()</code>{" "}
                  entrypoints
                </li>
                <li>
                  No direct <code>exit(0)</code> or{" "}
                  <code>SystemNavigator.pop()</code>
                </li>
                <li>
                  No custom unvetted <code>MethodChannel</code> calls
                </li>
                <li>No direct modification of Super App theme globals</li>
              </ul>
            </div>

            <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-700/60 bg-slate-100 dark:bg-slate-800/20 text-slate-700 dark:text-slate-300">
              <strong className="block font-bold mb-1 text-slate-700 dark:text-slate-300">
                <CheckCircleIcon /> Required Conventions
              </strong>
              <ul className="space-y-1 list-disc pl-4 text-[12px]">
                <li>
                  Extend <code>MiniAppWidget</code> as the root view
                </li>
                <li>
                  Consume <code>MiniAppContext</code> for auth and tokens
                </li>
                <li>
                  Use <code>SuperAppSDK.navigation</code> for host routing
                </li>
                <li>Declare all required device features via Capabilities</li>
              </ul>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "methods",
      number: "04",
      title: "Supported Integration Methods — Detailed Breakdown",
      shortTitle: "Integration Methods",
      category: "METHODS",
      summary:
        "Exhaustive requirements, validation rules, security checks, and specifications for all 5 integration channels.",
      badge: "Comprehensive Matrix",
      content: (
        <div className="space-y-6 text-sm text-slate-600 dark:text-slate-300">
          <p>
            The Super App platform supports 5 distinct integration methods. The
            critical architectural distinction lies in{" "}
            <strong>what the Super App receives</strong> and{" "}
            <strong>who performs the compilation/build</strong>:
          </p>

          {/* Architectural Comparison Table */}
          <div className="overflow-x-auto border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="w-[20%] p-3.5">Method</th>
                  <th className="w-[20%] p-3.5">Super App Receives</th>
                  <th className="w-[20%] p-3.5">Who Builds / Hosts?</th>
                  <th className="w-[20%] p-3.5">Source Confidentiality</th>
                  <th className="w-[20%] p-3.5">Runtime Performance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700 bg-white dark:bg-slate-800/40">
                <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/60">
                  <td className="p-3.5 font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <span>
                      <GlobeIcon />
                    </span>{" "}
                    WebView
                  </td>
                  <td className="p-3.5 font-mono text-sm">HTTPS URL</td>
                  <td className="p-3.5 text-slate-700 dark:text-slate-300 font-semibold">
                    Vendor hosts / builds
                  </td>
                  <td className="p-3.5 text-slate-700 dark:text-slate-300 font-medium">
                    Complete (Remote)
                  </td>
                  <td className="p-3.5 text-slate-700 dark:text-slate-300">
                    Standard Web
                  </td>
                </tr>
                <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/60">
                  <td className="p-3.5 font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <span>
                      <PackageIcon />
                    </span>{" "}
                    Flutter Artifact
                  </td>
                  <td className="p-3.5 font-mono text-sm">
                    Flutter package archive (.zip / .tar.gz)
                  </td>
                  <td className="p-3.5 text-slate-700 dark:text-slate-300 font-semibold">
                    Super App builds
                  </td>
                  <td className="p-3.5 text-slate-700 dark:text-slate-300 font-medium">
                    Complete (No Git access)
                  </td>
                  <td className="p-3.5 text-slate-700 dark:text-slate-300 font-bold">
                    Native 60fps
                  </td>
                </tr>
                <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/60">
                  <td className="p-3.5 font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <span>
                      <FolderIcon />
                    </span>{" "}
                    Flutter Source Code
                  </td>
                  <td className="p-3.5 font-mono text-sm">
                    Git Repo (Commit SHA / Tag)
                  </td>
                  <td className="p-3.5 text-slate-700 dark:text-slate-300 font-semibold">
                    Super App builds
                  </td>
                  <td className="p-3.5 text-slate-700 dark:text-slate-300 font-medium">
                    Shared Repository
                  </td>
                  <td className="p-3.5 text-slate-700 dark:text-slate-300 font-bold">
                    Native 60fps
                  </td>
                </tr>
                <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/60">
                  <td className="p-3.5 font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <span>
                      <WrenchIcon />
                    </span>{" "}
                    Native SDK
                  </td>
                  <td className="p-3.5 font-mono text-sm">
                    .aar / .xcframework binaries
                  </td>
                  <td className="p-3.5 text-slate-700 dark:text-slate-300 font-semibold">
                    Super App links
                  </td>
                  <td className="p-3.5 text-slate-700 dark:text-slate-300 font-medium">
                    Complete (Compiled)
                  </td>
                  <td className="p-3.5 text-slate-700 dark:text-slate-300 font-bold">
                    Native OS
                  </td>
                </tr>
                <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/60">
                  <td className="p-3.5 font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <span>
                      <LinkIcon />
                    </span>{" "}
                    Deep Link
                  </td>
                  <td className="p-3.5 font-mono text-sm">
                    URI Scheme / App Link Config
                  </td>
                  <td className="p-3.5 text-slate-700 dark:text-slate-300 font-semibold">
                    Target Application
                  </td>
                  <td className="p-3.5 text-slate-700 dark:text-slate-300 font-medium">
                    Complete (External)
                  </td>
                  <td className="p-3.5 text-slate-700 dark:text-slate-300 font-bold">
                    Native OS
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Interactive Method Tabs */}
          <div className="relative mb-8 mt-4">
            {/* Background Track Line */}
            <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-slate-200 dark:bg-slate-800 pointer-events-none" />

            <div className="flex overflow-x-auto gap-8 relative z-10 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              {[
                {
                  id: "webview",
                  label: (
                    <span className="flex items-center gap-2">
                      <GlobeIcon /> WebView
                    </span>
                  ),
                  name: "WebView",
                },
                {
                  id: "artifact",
                  label: (
                    <span className="flex items-center gap-2">
                      <PackageIcon /> Flutter Package Artifact
                    </span>
                  ),
                  name: "Package Artifact",
                },
                {
                  id: "source",
                  label: (
                    <span className="flex items-center gap-2">
                      <FolderIcon /> Flutter Source Code
                    </span>
                  ),
                  name: "Source Code",
                },
                {
                  id: "native",
                  label: (
                    <span className="flex items-center gap-2">
                      <WrenchIcon /> Native SDK
                    </span>
                  ),
                  name: "Native SDK",
                },
                {
                  id: "deeplink",
                  label: (
                    <span className="flex items-center gap-2">
                      <LinkIcon /> Deep Link
                    </span>
                  ),
                  name: "Deep Link",
                },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveMethodTab(tab.id as any)}
                  className={`pb-4 text-sm font-semibold transition-all duration-300 ease-out flex items-center gap-2 whitespace-nowrap border-b-2 relative ${
                    activeMethodTab === tab.id
                      ? "text-brand-600 dark:text-brand-400 border-brand-600 dark:border-brand-400"
                      : "text-slate-500 dark:text-slate-400 border-transparent hover:text-slate-900 dark:hover:text-slate-200 hover:border-slate-300 dark:hover:border-slate-600"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Method 1: WebView */}
          {activeMethodTab === "webview" && (
            <div className="space-y-8 animate-in fade-in duration-300 pt-4">
              <div>
                <h4 className="text-2xl font-extrabold text-slate-900 dark:text-white flex items-center gap-3 mb-4">
                  <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400">
                    <GlobeIcon />
                  </div>
                  WebView Integration Method
                </h4>
                <p className="text-lg text-slate-600 dark:text-slate-300 leading-relaxed">
                  Embeds external web applications into an isolated, secure
                  Super App WebView container. This container interfaces with
                  native device features exclusively via a standardized, secure
                  JavaScript Bridge, completely sandboxng the web context from
                  the native app memory.
                </p>
              </div>

              <div className="space-y-6 text-base text-slate-700 dark:text-slate-300">
                <section>
                  <h5 className="text-lg font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                    <TargetIcon /> Purpose & When to Use
                  </h5>
                  <p className="leading-relaxed">
                    Designed for seamlessly rendering responsive web
                    applications inside the Super App without requiring Dart or
                    Flutter development. This is the optimal path for
                    integrating existing web platforms, high-frequency campaign
                    pages, micro-frontends, or when rapid remote updates without
                    requiring an app store release are strictly required.
                  </p>
                </section>

                <section>
                  <h5 className="text-lg font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                    <ClipboardIcon /> Requirements & Architecture
                  </h5>
                  <ul className="list-disc pl-5 space-y-2">
                    <li>
                      <strong className="text-slate-900 dark:text-slate-100">
                        Target Web URL:
                      </strong>{" "}
                      Must be strictly HTTPS. HTTP is globally blocked at the
                      network layer.
                    </li>
                    <li>
                      <strong className="text-slate-900 dark:text-slate-100">
                        Domain Ownership (.well-known):
                      </strong>{" "}
                      The target domain must host a verification file to prove
                      control over the WebView origin, preventing unauthorized
                      framing of third-party sites.
                    </li>
                    <li>
                      <strong className="text-slate-900 dark:text-slate-100">
                        Allowed Domain List:
                      </strong>{" "}
                      A strict whitelist of domains the WebView is permitted to
                      navigate to or fetch resources from.
                    </li>
                    <li>
                      <strong className="text-slate-900 dark:text-slate-100">
                        Bridge API Version:
                      </strong>{" "}
                      Specifies the JavaScript bridge contract version to ensure
                      backward compatibility.
                    </li>
                  </ul>
                </section>

                <section>
                  <h5 className="text-lg font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                    <ShieldIcon /> Automated Security Validation
                  </h5>
                  <div className="bg-slate-100/50 dark:bg-slate-800/30 rounded-xl p-5 border border-slate-200 dark:border-slate-700/60">
                    <ul className="list-disc pl-5 space-y-3">
                      <li>
                        <strong className="text-slate-900 dark:text-slate-100">
                          SSRF & DNS Rebinding Protection:
                        </strong>{" "}
                        Blocks resolution to private/internal IPs (RFC 1918,
                        127.0.0.1) to prevent the WebView from accessing
                        internal APIs.
                      </li>
                      <li>
                        <strong className="text-slate-900 dark:text-slate-100">
                          Open Redirect Detection:
                        </strong>{" "}
                        Verifies that domain navigation strictly stays within
                        the approved allowlist.
                      </li>
                      <li>
                        <strong className="text-slate-900 dark:text-slate-100">
                          DAST Scanning:
                        </strong>{" "}
                        Automated OWASP ZAP scans are triggered against the URL
                        to detect XSS and ensure strict Content-Security-Policy
                        (CSP) headers are present.
                      </li>
                    </ul>
                  </div>
                </section>
              </div>
            </div>
          )}

          {/* Method 2: Flutter Package Artifact */}
          {activeMethodTab === "artifact" && (
            <div className="space-y-8 animate-in fade-in duration-300 pt-4">
              <div>
                <h4 className="text-2xl font-extrabold text-slate-900 dark:text-white flex items-center gap-3 mb-4">
                  <div className="p-2 rounded-lg bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400">
                    <PackageIcon />
                  </div>
                  Flutter Package Artifact
                </h4>
                <p className="text-lg text-slate-600 dark:text-slate-300 leading-relaxed">
                  Integrates a pre-compiled Flutter package (`.tar.gz` or `.zip`)
                  directly into the Super App workspace. This method utilizes a
                  zero-trust upload architecture via MinIO pre-signed URLs to
                  entirely bypass the Node.js backend.
                </p>
              </div>

              <div className="space-y-6 text-base text-slate-700 dark:text-slate-300">
                <section>
                  <h5 className="text-lg font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                    <TargetIcon /> Purpose & When to Use
                  </h5>
                  <p className="leading-relaxed">
                    Ideal for teams that require complete obfuscation of their
                    intellectual property (source code) from the Super App
                    platform, or teams that have proprietary internal CI/CD
                    pipelines and only wish to deliver the final compiled
                    artifact.
                  </p>
                </section>

                <section>
                  <h5 className="text-lg font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                    <ClipboardIcon /> Requirements & Architecture
                  </h5>
                  <ul className="list-disc pl-5 space-y-2">
                    <li>
                      <strong className="text-slate-900 dark:text-slate-100">
                        Zero-Trust Upload:
                      </strong>{" "}
                      The browser requests a JWT-authorized Pre-Signed MinIO URL
                      (strict 50MB limit, 5-minute expiry). The artifact is
                      uploaded directly to an isolated Quarantine bucket,
                      protecting the backend from memory exhaustion and parsing
                      exploits.
                    </li>
                    <li>
                      <strong className="text-slate-900 dark:text-slate-100">
                        pubspec.yaml:
                      </strong>{" "}
                      Must accurately declare all dependencies. Overriding
                      global Super App dependencies is forbidden.
                    </li>
                    <li>
                      <strong className="text-slate-900 dark:text-slate-100">
                        Trusted Promotion:
                      </strong>{" "}
                      Once validated, the artifact is moved from the MinIO
                      Quarantine bucket to the secure Sonatype Nexus Registry
                      for consumption by the Super App build pipeline.
                    </li>
                  </ul>
                </section>

                <section>
                  <h5 className="text-lg font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                    <ShieldIcon /> Automated Security Validation
                  </h5>
                  <div className="bg-slate-100/50 dark:bg-slate-800/30 rounded-xl p-5 border border-slate-200 dark:border-slate-700/60">
                    <ul className="list-disc pl-5 space-y-3">
                      <li>
                        <strong className="text-slate-900 dark:text-slate-100">
                          SBOM Generation:
                        </strong>{" "}
                        The system automatically unpacks the artifact in a
                        sandbox and generates a Software Bill of Materials
                        (SBOM) to track transitive vulnerabilities.
                      </li>
                      <li>
                        <strong className="text-slate-900 dark:text-slate-100">
                          Malware & Dependency SCA:
                        </strong>{" "}
                        Scanned using Trivy to block artifacts containing known
                        CVEs in their declared dependencies.
                      </li>
                    </ul>
                  </div>
                </section>
              </div>
            </div>
          )}

          {/* Method 3: Flutter Package Source Code */}
          {activeMethodTab === "source" && (
            <div className="space-y-8 animate-in fade-in duration-300 pt-4">
              <div>
                <h4 className="text-2xl font-extrabold text-slate-900 dark:text-white flex items-center gap-3 mb-4">
                  <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-500">
                    <FolderIcon />
                  </div>
                  Flutter Package Source Code
                </h4>
                <p className="text-lg text-slate-600 dark:text-slate-300 leading-relaxed">
                  Directly links a Git repository containing the Mini App source
                  code to the Super App CI/CD pipeline, enabling automated
                  compilation, static analysis, and version locking.
                </p>
              </div>

              <div className="space-y-6 text-base text-slate-700 dark:text-slate-300">
                <section>
                  <h5 className="text-lg font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                    <TargetIcon /> Purpose & When to Use
                  </h5>
                  <p className="leading-relaxed">
                    The highly recommended approach for deep integrations. It
                    allows the Super App platform to fully optimize the Dart
                    compilation (Tree-shaking) alongside the host app, resulting
                    in the smallest possible binary footprint and highest
                    runtime performance.
                  </p>
                </section>

                <section>
                  <h5 className="text-lg font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                    <ClipboardIcon /> Requirements & Architecture
                  </h5>
                  <ul className="list-disc pl-5 space-y-2">
                    <li>
                      <strong className="text-slate-900 dark:text-slate-100">
                        Git Provider Auth:
                      </strong>{" "}
                      Uses GitHub Apps or GitLab OAuth for secure, granular
                      Read-Only access. Personal Access Tokens (PATs) are
                      strictly forbidden due to security policies.
                    </li>
                    <li>
                      <strong className="text-slate-900 dark:text-slate-100">
                        Git SHA Locking:
                      </strong>{" "}
                      When integration is requested via a Branch or Tag, the
                      Super App backend automatically resolves and locks the
                      integration to the exact Commit SHA. This ensures
                      subsequent commits cannot bypass the review pipeline.
                    </li>
                  </ul>
                </section>

                <section>
                  <h5 className="text-lg font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                    <ShieldIcon /> Automated Security Validation
                  </h5>
                  <div className="bg-slate-100/50 dark:bg-slate-800/30 rounded-xl p-5 border border-slate-200 dark:border-slate-700/60">
                    <ul className="list-disc pl-5 space-y-3">
                      <li>
                        <strong className="text-slate-900 dark:text-slate-100">
                          SAST & Secrets Detection:
                        </strong>{" "}
                        Semgrep and Gitleaks automatically scan the source code
                        for hardcoded API keys, passwords, and prohibited Dart
                        code patterns (e.g., `void main()`, `exit()`).
                      </li>
                      <li>
                        <strong className="text-slate-900 dark:text-slate-100">
                          Deterministic Build:
                        </strong>{" "}
                        The CI engine checks out the locked SHA, executes the
                        Flutter analyzer, and verifies that the code compiles
                        cleanly against the Super App SDK interface.
                      </li>
                    </ul>
                  </div>
                </section>
              </div>
            </div>
          )}

          {/* Method 4: Native SDK */}
          {activeMethodTab === "native" && (
            <div className="space-y-8 animate-in fade-in duration-300 pt-4">
              <div>
                <h4 className="text-2xl font-extrabold text-slate-900 dark:text-white flex items-center gap-3 mb-4">
                  <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-400">
                    <WrenchIcon />
                  </div>
                  Native SDK (AAR / XCFramework)
                </h4>
                <p className="text-lg text-slate-600 dark:text-slate-300 leading-relaxed">
                  Embeds platform-specific binaries (.aar for Android,
                  .xcframework for iOS) directly into the Super App shell,
                  requiring custom MethodChannels and platform-side integration.
                </p>
              </div>

              <div className="space-y-6 text-base text-slate-700 dark:text-slate-300">
                <section>
                  <h5 className="text-lg font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                    <TargetIcon /> Purpose & When to Use
                  </h5>
                  <p className="leading-relaxed">
                    Reserved exclusively for legacy integrations or specialized
                    hardware interfaces (e.g., custom biometric scanners, legacy
                    banking encryption libraries) that cannot be ported to Dart.
                    Requires heavy manual review and platform engineering
                    effort.
                  </p>
                </section>

                <section>
                  <h5 className="text-lg font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                    <ClipboardIcon /> Requirements & Architecture
                  </h5>
                  <ul className="list-disc pl-5 space-y-2">
                    <li>
                      <strong className="text-slate-900 dark:text-slate-100">
                        Binary Architecture:
                      </strong>{" "}
                      iOS frameworks must contain arm64 slices (Bitcode
                      disabled). Android AARs must support arm64-v8a.
                    </li>
                    <li>
                      <strong className="text-slate-900 dark:text-slate-100">
                        Wrapper Provisioning:
                      </strong>{" "}
                      A Dart wrapper bridging the native `MethodChannels` must
                      be provided and heavily audited to prevent memory leaks
                      and threading blocks.
                    </li>
                  </ul>
                </section>

                <section>
                  <h5 className="text-lg font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                    <ShieldIcon /> Automated Security Validation
                  </h5>
                  <div className="bg-slate-100/50 dark:bg-slate-800/30 rounded-xl p-5 border border-slate-200 dark:border-slate-700/60">
                    <ul className="list-disc pl-5 space-y-3">
                      <li>
                        <strong className="text-slate-900 dark:text-slate-100">
                          Manual Audit Requirement:
                        </strong>{" "}
                        Unlike Flutter packages, Native SDKs cannot be fully
                        analyzed via SAST. They require a mandatory manual
                        architectural review by the SA Admin team.
                      </li>
                      <li>
                        <strong className="text-slate-900 dark:text-slate-100">
                          Binary Scanning:
                        </strong>{" "}
                        Uploaded binaries are scanned for known malware
                        signatures and disallowed dynamic library bindings.
                      </li>
                    </ul>
                  </div>
                </section>
              </div>
            </div>
          )}

          {/* Method 5: Deep Link */}
          {activeMethodTab === "deeplink" && (
            <div className="space-y-8 animate-in fade-in duration-300 pt-4 mb-10">
              <div>
                <h4 className="text-2xl font-extrabold text-slate-900 dark:text-white flex items-center gap-3 mb-4">
                  <div className="p-2 rounded-lg bg-cyan-50 dark:bg-cyan-500/10 text-cyan-600 dark:text-cyan-400">
                    <LinkIcon />
                  </div>
                  Deep Link Integration
                </h4>
                <p className="text-lg text-slate-600 dark:text-slate-300 leading-relaxed">
                  A lightweight integration that acts as a router, redirecting
                  the user out of the Super App context into a standalone native
                  application installed on their device.
                </p>
              </div>

              <div className="space-y-6 text-base text-slate-700 dark:text-slate-300">
                <section>
                  <h5 className="text-lg font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                    <TargetIcon /> Purpose & When to Use
                  </h5>
                  <p className="leading-relaxed">
                    Utilized when the Partner Application is too massive to
                    embed, or requires strict OS-level separation. This method
                    effectively treats the Super App as a discovery portal
                    rather than a host runtime.
                  </p>
                </section>

                <section>
                  <h5 className="text-lg font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                    <ClipboardIcon /> Requirements & Architecture
                  </h5>
                  <ul className="list-disc pl-5 space-y-2">
                    <li>
                      <strong className="text-slate-900 dark:text-slate-100">
                        URI Scheme & App Links:
                      </strong>{" "}
                      Must register a unique <code>uriScheme</code> and the
                      associated Android App Links / iOS Universal Links domain
                      for seamless routing.
                    </li>
                    <li>
                      <strong className="text-slate-900 dark:text-slate-100">
                        Fallback Routing:
                      </strong>{" "}
                      A <code>fallbackUrl</code> (typically an App Store / Play
                      Store link) is mandatory in case the user does not have
                      the standalone app installed.
                    </li>
                  </ul>
                </section>

                <section>
                  <h5 className="text-lg font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                    <ShieldIcon /> Automated Security Validation
                  </h5>
                  <div className="bg-slate-100/50 dark:bg-slate-800/30 rounded-xl p-5 border border-slate-200 dark:border-slate-700/60">
                    <ul className="list-disc pl-5 space-y-3">
                      <li>
                        <strong className="text-slate-900 dark:text-slate-100">
                          Domain Verification:
                        </strong>{" "}
                        Similar to WebViews, the registered App Links domain
                        must pass an ownership verification check to prevent
                        deep-link hijacking.
                      </li>
                      <li>
                        <strong className="text-slate-900 dark:text-slate-100">
                          Scheme Conflict Detection:
                        </strong>{" "}
                        The backend verifies that the requested URI scheme is
                        globally unique across the Super App ecosystem to
                        prevent intent hijacking.
                      </li>
                    </ul>
                  </div>
                </section>
              </div>

              {/* Deep Link Example Payload */}
              <CodeBlock
                filename="payload.json"
                language="json"
                code={`{
  "integrationMethod": "DEEP_LINK",
  "name": "Partner Bank Link",
  "version": "1.0.0",
  "deepLinkConfig": {
    "uriScheme": "partnerbank://",
    "androidAppLinksDomain": "bank.partner.com",
    "iosUniversalLinksDomain": "bank.partner.com",
    "fallbackUrl": "https://bank.partner.com/download",
    "playStoreId": "com.partner.bank",
    "appStoreId": "id123456789"
  }
}`}
              />
            </div>
          )}
        </div>
      ),
    },
    {
      id: "capabilities",
      number: "05",
      title: "Permissions & Capability Catalog",
      shortTitle: "Capabilities",
      category: "CAPABILITIES",
      summary:
        "High-level Capability abstraction vs. platform OS permissions, catalog resolution, and approval rules.",
      badge: "Catalog Architecture",
      content: (
        <div className="space-y-4 text-sm text-slate-600 dark:text-slate-300">
          <p>
            To maintain zero security drift, Mini Apps request abstract{" "}
            <strong>Capabilities</strong> (e.g. <code>CAMERA</code>,{" "}
            <code>LOCATION</code>) rather than direct Android/iOS manifest
            permissions. The Super App rule engine safely translates approved
            capabilities into platform artifacts during build generation.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
              <h5 className="font-bold text-slate-900 dark:text-white text-xs uppercase tracking-wider mb-3">
                Supported Super App Capabilities
              </h5>
              <div className="space-y-2.5">
                {[
                  {
                    code: "CAMERA",
                    name: "Camera Access",
                    cat: "Hardware",
                    desc: "android.permission.CAMERA / NSCameraUsageDescription",
                    approval: true,
                  },
                  {
                    code: "LOCATION",
                    name: "Geolocation",
                    cat: "Sensors",
                    desc: "ACCESS_FINE_LOCATION / NSLocationWhenInUseUsageDescription",
                    approval: true,
                  },
                  {
                    code: "MICROPHONE",
                    name: "Audio Record",
                    cat: "Hardware",
                    desc: "RECORD_AUDIO / NSMicrophoneUsageDescription",
                    approval: true,
                  },
                  {
                    code: "CLIPBOARD",
                    name: "Clipboard API",
                    cat: "System",
                    desc: "SuperAppSDK Clipboard Bridge",
                    approval: false,
                  },
                  {
                    code: "NOTIFICATION",
                    name: "Push Alerts",
                    cat: "System",
                    desc: "POST_NOTIFICATIONS / APNS Token Scopes",
                    approval: true,
                  },
                ].map((cap) => (
                  <div
                    key={cap.code}
                    className="p-3 rounded-xl bg-slate-50 dark:bg-slate-700/40 border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-4"
                  >
                    <div className="min-w-0">
                      <span className="font-mono font-bold text-[11px] text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                        {cap.code}
                      </span>
                      <span className="text-xs font-medium text-slate-600 dark:text-slate-300 ml-2">
                        {cap.name}
                      </span>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono mt-1.5 break-all leading-relaxed">
                        {cap.desc}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 text-center text-[10px] uppercase tracking-wider font-bold px-2.5 py-1 rounded-full ${
                        cap.approval
                          ? "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                          : "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400"
                      }`}
                    >
                      {cap.approval ? "SA Approval" : "Auto"}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex flex-col justify-between">
              <div>
                <h5 className="font-bold text-slate-900 dark:text-white text-xs uppercase tracking-wider mb-3">
                  Unsupported Capability Flow
                </h5>
                <p className="text-sm text-slate-700 dark:text-slate-300 mb-3">
                  If your Mini App requires a capability not currently in the
                  catalog (e.g. <code>BLUETOOTH</code>, <code>NFC</code>), the
                  validation engine generates a formal{" "}
                  <strong>Capability Request</strong>.
                </p>
                <div className="space-y-2 text-xs">
                  <div className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center font-bold text-sm shrink-0">
                      1
                    </span>
                    <span>
                      System triggers <code>CAPABILITY_REQUESTED</code> state.
                    </span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center font-bold text-sm shrink-0">
                      2
                    </span>
                    <span>
                      SA Admin evaluates architectural impact and security
                      posture.
                    </span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center font-bold text-sm shrink-0">
                      3
                    </span>
                    <span>
                      If approved, platform team implements & adds capability to
                      Catalog.
                    </span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center font-bold text-sm shrink-0">
                      4
                    </span>
                    <span>
                      Mini App integration automatically resumes validation.
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-3 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-slate-100 mt-4">
                <strong>Directed Acyclic Graph (DAG) Resolver:</strong> Complex
                capabilities (e.g. <code>VIDEO_CALL</code>) automatically
                resolve underlying required child capabilities (
                <code>CAMERA</code> + <code>MICROPHONE</code>). The engine
                performs topological sorting and strictly rejects circular
                dependencies.
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
      shortTitle: "Security",
      category: "SECURITY",
      summary:
        "Gitleaks secrets detection, Semgrep SAST rules, Trivy SCA, OWASP ZAP DAST, and ClamAV quarantine.",
      badge: "Zero Trust Gate",
      content: (
        <div className="space-y-4 text-sm text-slate-600 dark:text-slate-300">
          <p>
            Security validation is fully automated and non-negotiable.
            Submissions failing Critical or High severity gates are immediately
            blocked with actionable line-by-line remediation logs.
          </p>

          {/* 5 Security Checkpoints Overview */}
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30">
            <h5 className="font-bold text-slate-900 dark:text-white text-xs uppercase tracking-wider mb-3">
              5 Defense-in-Depth Checkpoints
            </h5>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 text-xs">
              <div className="p-2.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                <span className="font-bold text-slate-900 dark:text-white block mb-1">1. Submission Boundary</span>
                <p className="text-slate-600 dark:text-slate-400">Direct MinIO upload via pre-signed URLs; backend never parses untrusted binaries directly.</p>
              </div>
              <div className="p-2.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                <span className="font-bold text-slate-900 dark:text-white block mb-1">2. Ephemeral Isolation</span>
                <p className="text-slate-600 dark:text-slate-400">All scans and builds execute inside ephemeral, isolated CI containers destroyed post-run.</p>
              </div>
              <div className="p-2.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                <span className="font-bold text-slate-900 dark:text-white block mb-1">3. Automated Scanning</span>
                <p className="text-slate-600 dark:text-slate-400">Gitleaks, Semgrep, Trivy SCA, ClamAV, and OWASP ZAP dynamic analysis.</p>
              </div>
              <div className="p-2.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                <span className="font-bold text-slate-900 dark:text-white block mb-1">4. Trusted Nexus Gate</span>
                <p className="text-slate-600 dark:text-slate-400">Only artifacts passing 100% of policy gates are published to Sonatype Nexus for Super App builds.</p>
              </div>
              <div className="p-2.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                <span className="font-bold text-slate-900 dark:text-white block mb-1">5. Remediation Loop</span>
                <p className="text-slate-600 dark:text-slate-400">Detected issues are recorded in the Portal and reset status to DRAFT for resubmission.</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40">
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span className="p-1 rounded bg-slate-100 text-slate-700 text-xs">
                    <KeyIcon />
                  </span>{" "}
                  Gitleaks (Secrets Detection)
                </span>
                <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                  Hard Block
                </span>
              </div>
              <p className="text-sm text-slate-700 dark:text-slate-300">
                Scans every commit, archive, and file for private keys, AWS/GCP
                credentials, JWT secrets, and bearer tokens. Any detected
                credential immediately fails the build.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40">
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span className="p-1 rounded bg-slate-100 text-slate-700 text-xs">
                    <SearchIcon />
                  </span>{" "}
                  Semgrep (SAST Engine)
                </span>
                <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                  Hard Block
                </span>
              </div>
              <p className="text-sm text-slate-700 dark:text-slate-300">
                Executes static security rules enforcing Super App sandbox
                boundaries, detecting SQL injections, unvalidated redirects, and
                unauthorized system calls.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40">
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span className="p-1 rounded bg-slate-100 text-slate-700 text-xs">
                    <PackageIcon />
                  </span>{" "}
                  Trivy (Dependency SCA)
                </span>
                <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                  CVE Audit
                </span>
              </div>
              <p className="text-sm text-slate-700 dark:text-slate-300">
                Audits direct and transitive dependencies in{" "}
                <code>pubspec.lock</code>, Android Gradle files, and iOS
                Podfiles against official CVE vulnerability databases.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40">
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span className="p-1 rounded bg-slate-100 text-slate-700 text-xs">
                    <ShieldIcon />
                  </span>{" "}
                  ClamAV (Malware Scan)
                </span>
                <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                  Binary Gate
                </span>
              </div>
              <p className="text-sm text-slate-700 dark:text-slate-300">
                Performs signature and heuristic scanning of uploaded package
                archives, binaries, and assets to detect malicious payloads prior to build ingestion.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40 md:col-span-2">
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span className="p-1 rounded bg-slate-100 text-slate-700 text-xs">
                    <GlobeIcon />
                  </span>{" "}
                  OWASP ZAP (DAST for WebView)
                </span>
                <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-slate-100 text-slate-700">
                  Dynamic Gate
                </span>
              </div>
              <p className="text-sm text-slate-700 dark:text-slate-300">
                Runs headless baseline dynamic scans against WebView URLs
                testing for missing Content-Security-Policy (CSP), open
                redirects, XSS, and SSRF vulnerabilities.
              </p>
            </div>
          </div>

          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs">
            <h5 className="font-bold text-slate-900 dark:text-white mb-2">
              Severity Response Policy Matrix
            </h5>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
              <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700">
                <span className="font-bold text-rose-600 dark:text-rose-400">
                  CRITICAL
                </span>
                <p className="text-sm text-slate-700 dark:text-slate-300 mt-0.5">
                  Immediate hard block. Issue logged; integration state resets to{" "}
                  <code>DRAFT</code> for remediation.
                </p>
              </div>
              <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700">
                <span className="font-bold text-amber-600 dark:text-amber-400">
                  HIGH
                </span>
                <p className="text-sm text-slate-700 dark:text-slate-300 mt-0.5">
                  Build blocked. Issue logged; integration state resets to{" "}
                  <code>DRAFT</code> until resolved and resubmitted.
                </p>
              </div>
              <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700">
                <span className="font-bold text-slate-700 dark:text-slate-300">
                  MEDIUM
                </span>
                <p className="text-sm text-slate-700 dark:text-slate-300 mt-0.5">
                  Warning logged. Requires explicit SA Admin review and sign-off.
                </p>
              </div>
              <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700">
                <span className="font-bold text-slate-700 dark:text-slate-300">
                  LOW / INFO
                </span>
                <p className="text-sm text-slate-700 dark:text-slate-300 mt-0.5">
                  Informational note recorded in audit log.
                </p>
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "validation-lifecycle",
      number: "07",
      title: "State Progression & Validation Lifecycle",
      shortTitle: "Lifecycle",
      category: "LIFECYCLE",
      summary:
        "State machine flow from DRAFT submission to CI build, dual manual testing, and final ACTIVATION.",
      content: (
        <div className="space-y-4 text-sm text-slate-600 dark:text-slate-300">
          <p>
            Mini App integrations transition through a strictly governed finite
            state machine ensuring complete traceability and audit compliance:
          </p>

          {/* Modern React Flow Lifecycle */}
          <div className="mb-10 mt-6">
            <LifecycleFlow />
          </div>

          {/* Modern Lifecycle Phases Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8 mb-8">
            {[
              {
                title: "Phase 1: Preparation",
                icon: <FolderIcon />,
                colorClass:
                  "bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-500 border-amber-200 dark:border-amber-500/30",
                states: ["DRAFT", "SUBMITTED"],
                desc: "Initial payload creation and submission by the MA Manager.",
              },
              {
                title: "Phase 2: Automated Analysis",
                icon: <ShieldIcon />,
                colorClass:
                  "bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-500 border-rose-200 dark:border-rose-500/30",
                states: [
                  "BACKEND_VALIDATION",
                  "METHOD_VALIDATION",
                  "CAPABILITY_CHECK",
                  "SECURITY_CHECK",
                ],
                desc: "System performs .well-known verification, SBOM generation, and capability DAG sorting.",
              },
              {
                title: "Phase 3: Review & Build",
                icon: <WrenchIcon />,
                colorClass:
                  "bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-500 border-blue-200 dark:border-blue-500/30",
                states: ["IN_REVIEW", "BUILDING"],
                desc: "SA Admin manual audit (if required) followed by CI/CD artifact generation.",
              },
              {
                title: "Phase 4: Release",
                icon: <CheckCircleIcon />,
                colorClass:
                  "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-500 border-emerald-200 dark:border-emerald-500/30",
                states: ["TESTING", "ACTIVE"],
                desc: "Dual manual testing via TestFlight/APK, culminating in global activation.",
              },
            ].map((phase, idx) => (
              <div
                key={idx}
                className={`rounded-xl border p-5 ${phase.colorClass} relative overflow-hidden group transition-all hover:shadow-md`}
              >
                <div className="flex items-center justify-between mb-3">
                  <h5 className="font-extrabold text-lg flex items-center gap-2">
                    {phase.icon} {phase.title}
                  </h5>
                  <span className="text-3xl opacity-10 font-black">
                    {idx + 1}
                  </span>
                </div>
                <p className="text-sm opacity-90 mb-4 font-medium leading-relaxed">
                  {phase.desc}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {phase.states.map((state) => (
                    <span
                      key={state}
                      className="px-2 py-1 rounded bg-white/60 dark:bg-black/20 text-[10px] font-mono font-bold tracking-wider backdrop-blur-sm border border-black/5 dark:border-white/10"
                    >
                      {state}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-base">
            <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40">
              <strong className="block font-bold text-slate-900 dark:text-white mb-1.5">
                Dual Testing Protocol
              </strong>
              <p className="text-slate-700 dark:text-slate-300">
                Once the CI pipeline builds the test Android APK and iOS test
                package and stores them securely in Sonatype Nexus (promoted
                from verified MinIO submissions):
              </p>
              <ul className="list-disc pl-4 mt-2 space-y-1 text-slate-700 dark:text-slate-300">
                <li>
                  <strong>MA Manager:</strong> Validates user journeys, API
                  calls, and business logic.
                </li>
                <li>
                  <strong>SA Admin:</strong> Validates Super App frame
                  navigation, back stack, and permissions.
                </li>
              </ul>
            </div>

            <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40">
              <strong className="block font-bold text-slate-900 dark:text-white mb-1.5">
                Issue & Fix Remediation Loop
              </strong>
              <p className="text-slate-700 dark:text-slate-300">
                If validation, security, or testing detects an issue:
              </p>
              <ul className="list-disc pl-4 mt-2 space-y-1 text-slate-700 dark:text-slate-300">
                <li>
                  Integration state resets to <code>DRAFT</code> with attached
                  error logs.
                </li>
                <li>MA Manager pushes fix commit or updated artifact.</li>
                <li>
                  Resubmission triggers automatic re-scan of affected stages.
                </li>
              </ul>
            </div>
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
              issue:
                "BUILD_FAILED: Multiple conflicting versions of Flutter SDK",
              cause:
                "Mini App pubspec.yaml specifies an incompatible SDK range.",
              fix: 'Align environment constraint to match Super App runtime (e.g. sdk: ">=3.2.0 <4.0.0").',
            },
            {
              issue:
                "SECURITY_CHECK_FAILED: Gitleaks detected sensitive key in assets",
              cause:
                "Hardcoded staging/dev API secret or private key committed in source repository.",
              fix: "Remove token from Git history, rotate the compromised credential, and retrieve keys dynamically via SuperAppSDK auth context.",
            },
            {
              issue:
                "CAPABILITY_UNSUPPORTED: Camera requested but not configured",
              cause:
                "Mini App attempts to invoke device camera without registering the CAMERA capability.",
              fix: "Add CAMERA in Mini App configuration claim during submission to trigger automatic permission generation.",
            },
            {
              issue:
                "WEBVIEW_SSRF_DETECTED: Destination points to RFC 1918 private IP",
              cause:
                "Target URL resolves to private internal subnets (e.g. 192.168.x.x or 10.x.x.x).",
              fix: "Provide a publicly reachable HTTPS domain with valid TLS certificates.",
            },
          ].map((item, idx) => (
            <div
              key={idx}
              className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
            >
              <div className="font-mono font-bold text-slate-700 dark:text-slate-300 mb-1">
                {item.issue}
              </div>
              <p className="text-slate-700 dark:text-slate-300 mb-1">
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  Root Cause:
                </span>{" "}
                {item.cause}
              </p>
              <p className="text-slate-700 dark:text-slate-300">
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  Remedy:
                </span>{" "}
                {item.fix}
              </p>
            </div>
          ))}
        </div>
      ),
    },
  ];

  const categories = [
    { key: "ALL", label: "All Sections" },
    { key: "GENERAL", label: "General & Roles" },
    { key: "CONTRACT", label: "SDK Contract" },
    { key: "METHODS", label: "Methods" },
    { key: "CAPABILITIES", label: "Capabilities" },
    { key: "SECURITY", label: "Security Scans" },
    { key: "LIFECYCLE", label: "Lifecycle" },
    { key: "SUPPORT", label: "Troubleshooting" },
  ];

  const filteredSections = sections.filter((sec) => {
    const matchesCategory =
      activeCategory === "ALL" || sec.category === activeCategory;
    const matchesSearch =
      sec.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sec.summary.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-300 font-sans h-screen overflow-hidden">
      {/* Top Navbar */}
      <header className="h-20 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-10 shrink-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md relative z-10">
        <div className="flex items-center gap-2">
          <span className="text-xl font-extrabold text-slate-900 dark:text-white tracking-widest flex items-center gap-1.5">
            <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center overflow-hidden">
              <Image
                src="/fsa-logo.png"
                alt="FSA Logo"
                width={24}
                height={24}
                className="object-cover"
              />
            </div>
            FinTech
            <span className="text-brand-600 dark:text-brand-400 font-light">
              Docs
            </span>
          </span>
        </div>
        <div className="flex items-center gap-8 text-sm font-medium text-slate-700 dark:text-slate-300">
          <a
            href="/"
            className="hover:text-slate-900 dark:hover:text-white transition-colors"
          >
            Super App Back Office
          </a>
          <a href="#docs" className="text-brand-600 dark:text-brand-400">
            Documentation
          </a>
          <div className="h-4 w-px bg-slate-300 dark:bg-slate-700"></div>
          <ThemeToggle />
          <a
            href="/"
            className="inline-flex items-center gap-2 text-slate-900 dark:text-white hover:text-brand-600 dark:hover:text-brand-400 transition-colors"
          >
            Back to Dashboard{" "}
            <svg
              className="w-4 h-4"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M5 12h14" />
              <path d="m12 5 7 7-7 7" />
            </svg>
          </a>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden relative">
        {/* Left Sidebar */}
        <aside className="w-72 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 overflow-y-auto shrink-0 flex flex-col py-8 relative z-10">
          <div className="mb-8 px-4">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 px-3">
              Getting Started
            </h4>
            <nav className="space-y-0.5">
              {sections.slice(0, 2).map((sec) => (
                <a
                  key={sec.id}
                  href={`#${sec.id}`}
                  onClick={() => setActiveSection(sec.id)}
                  className={`block px-3 py-2 text-base font-medium leading-snug transition-all border-l-2 ${activeSection === sec.id ? "text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-500/10 border-brand-500 dark:border-brand-400 shadow-sm" : "text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white border-transparent"}`}
                >
                  {sec.shortTitle || sec.title}
                </a>
              ))}
            </nav>
          </div>

          <div className="mb-8 px-4">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 px-3">
              Integrations
            </h4>
            <nav className="space-y-0.5">
              {sections.slice(2, 4).map((sec) => (
                <a
                  key={sec.id}
                  href={`#${sec.id}`}
                  onClick={() => setActiveSection(sec.id)}
                  className={`block px-3 py-2 text-base font-medium leading-snug transition-all border-l-2 ${activeSection === sec.id ? "text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-500/10 border-brand-500 dark:border-brand-400 shadow-sm" : "text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white border-transparent"}`}
                >
                  {sec.shortTitle || sec.title}
                </a>
              ))}
            </nav>
          </div>

          <div className="mb-8 px-4">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 px-3">
              Core Concepts
            </h4>
            <nav className="space-y-0.5">
              {sections.slice(4).map((sec) => (
                <a
                  key={sec.id}
                  href={`#${sec.id}`}
                  onClick={() => setActiveSection(sec.id)}
                  className={`block px-3 py-2 text-base font-medium leading-snug transition-all border-l-2 ${activeSection === sec.id ? "text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-500/10 border-brand-500 dark:border-brand-400 shadow-sm" : "text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white border-transparent"}`}
                >
                  {sec.shortTitle || sec.title}
                </a>
              ))}
            </nav>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto bg-white dark:bg-slate-950 relative scroll-smooth">
          {/* Subtle background glow */}

          <div className="p-4 sm:p-6 lg:p-10 w-full relative z-10">
            <div className="space-y-20 pb-20">
              {sections.map((sec, index) => (
                <section key={sec.id} id={sec.id} className="scroll-mt-24">
                  {/* Cyberpunk Badge */}
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-brand-200 dark:border-brand-800 bg-brand-50 dark:bg-brand-950/30 text-brand-600 dark:text-brand-400 text-xs font-bold tracking-widest uppercase mb-4 shadow-sm">
                    <span className="w-1.5 h-1.5 rounded-full bg-brand-500 dark:bg-brand-400 "></span>{" "}
                    {sec.category || "Documentation"}
                  </div>

                  {/* Section Heading */}
                  <h2 className="text-3xl lg:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-6">
                    {sec.shortTitle || sec.title}
                  </h2>

                  {/* Section Body */}
                  <div className="text-slate-600 dark:text-slate-300 leading-relaxed text-lg space-y-6">
                    {sec.content}
                  </div>

                  {/* Subtle Divider */}
                  {index !== sections.length - 1 && (
                    <div className="mt-20 h-px bg-gradient-to-r from-transparent via-slate-200 dark:via-slate-800 to-transparent w-full" />
                  )}
                </section>
              ))}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
