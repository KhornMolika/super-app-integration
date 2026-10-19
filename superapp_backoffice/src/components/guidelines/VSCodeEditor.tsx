"use client";

import React, { useState } from "react";

export interface EditorFile {
  filename: string;
  language: string;
  code: string;
}

export function VSCodeEditor({ files }: { files: EditorFile[] }) {
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
}

export function CodeBlock({
  code,
  language,
  filename,
}: {
  code: string;
  language: string;
  filename?: string;
}) {
  return <VSCodeEditor files={[{ filename: filename || "code", language, code }]} />;
}
