'use client';

import React from 'react';

export interface MarkdownRendererProps {
  content?: string;
  className?: string;
}

export function MarkdownRenderer({
  content = '',
  className = '',
}: MarkdownRendererProps) {
  if (!content || !content.trim()) return null;

  const lines = content.split('\n');

  const renderInline = (text: string): React.ReactNode => {
    const parts: React.ReactNode[] = [];
    let remaining = text;
    let key = 0;

    while (remaining.length > 0) {
      // 1. Bold: **text** or __text__
      const boldMatch = remaining.match(/^(\*\*|__)(.*?)\1/);
      if (boldMatch) {
        parts.push(
          <strong key={key++} className="font-bold text-slate-900 dark:text-slate-100">
            {renderInline(boldMatch[2])}
          </strong>
        );
        remaining = remaining.slice(boldMatch[0].length);
        continue;
      }

      // 2. Inline code: `code`
      const codeMatch = remaining.match(/^`([^`]+)`/);
      if (codeMatch) {
        parts.push(
          <code
            key={key++}
            className="font-mono text-[11px] px-1.5 py-0.5 bg-slate-200/70 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded"
          >
            {codeMatch[1]}
          </code>
        );
        remaining = remaining.slice(codeMatch[0].length);
        continue;
      }

      // 3. Links: [text](url)
      const linkMatch = remaining.match(/^\[([^\]]+)\]\(([^)]+)\)/);
      if (linkMatch) {
        parts.push(
          <a
            key={key++}
            href={linkMatch[2]}
            target="_blank"
            rel="noopener noreferrer"
            className="text-brand-600 dark:text-brand-400 hover:underline font-medium"
          >
            {linkMatch[1]}
          </a>
        );
        remaining = remaining.slice(linkMatch[0].length);
        continue;
      }

      // 4. Italic: *text* or _text_
      const italicMatch = remaining.match(/^(\*|_)([^*_]+)\1/);
      if (italicMatch) {
        parts.push(
          <em key={key++} className="italic text-slate-800 dark:text-slate-200">
            {italicMatch[2]}
          </em>
        );
        remaining = remaining.slice(italicMatch[0].length);
        continue;
      }

      // 5. Plain text segment
      const nextSpecial = remaining.search(/[\*_`\[]/);
      if (nextSpecial === -1) {
        parts.push(remaining);
        break;
      } else if (nextSpecial === 0) {
        parts.push(remaining[0]);
        remaining = remaining.slice(1);
      } else {
        parts.push(remaining.slice(0, nextSpecial));
        remaining = remaining.slice(nextSpecial);
      }
    }

    return <>{parts}</>;
  };

  const elements: React.ReactNode[] = [];

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const line = rawLine.trim();

    if (!line) {
      continue;
    }

    // Horizontal Rule (---, ***, ___)
    if (/^([-*_]){3,}$/.test(line)) {
      elements.push(
        <hr key={i} className="my-2.5 border-slate-200 dark:border-slate-700" />
      );
      continue;
    }

    // Headings (# Heading, ## Heading, etc.)
    const headingMatch = line.match(/^(#{1,6})\s+(.*)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const title = headingMatch[2];

      if (level === 1) {
        elements.push(
          <h3
            key={i}
            className="text-sm font-bold text-slate-900 dark:text-white pb-1.5 border-b border-slate-200/80 dark:border-slate-700/80 mt-2 mb-2 flex items-center gap-1.5"
          >
            {renderInline(title)}
          </h3>
        );
      } else if (level === 2) {
        elements.push(
          <h4
            key={i}
            className="text-xs font-bold text-slate-900 dark:text-white mt-2.5 mb-1"
          >
            {renderInline(title)}
          </h4>
        );
      } else {
        elements.push(
          <h5
            key={i}
            className="text-xs font-semibold text-slate-800 dark:text-slate-200 mt-2 mb-1"
          >
            {renderInline(title)}
          </h5>
        );
      }
      continue;
    }

    // Blockquote (> Quote)
    const bqMatch = line.match(/^>\s*(.*)$/);
    if (bqMatch) {
      elements.push(
        <blockquote
          key={i}
          className="pl-3 border-l-2 border-brand-500 text-xs italic text-slate-600 dark:text-slate-400 my-1.5"
        >
          {renderInline(bqMatch[1])}
        </blockquote>
      );
      continue;
    }

    // Ordered list item (1. Item or 1) Item)
    const olMatch = line.match(/^(\d+)[.)]\s+(.*)$/);
    if (olMatch) {
      const num = olMatch[1];
      const itemContent = olMatch[2];
      elements.push(
        <div key={i} className="flex items-start gap-2 text-xs leading-relaxed my-1">
          <span className="font-bold font-mono text-brand-600 dark:text-brand-400 shrink-0 w-4 text-right">
            {num}.
          </span>
          <div className="text-slate-700 dark:text-slate-300 flex-1">
            {renderInline(itemContent)}
          </div>
        </div>
      );
      continue;
    }

    // Unordered list item (- Item or * Item)
    const ulMatch = line.match(/^[-*•]\s+(.*)$/);
    if (ulMatch) {
      elements.push(
        <div key={i} className="flex items-start gap-2 text-xs leading-relaxed my-1">
          <span className="text-brand-500 font-bold shrink-0 mt-0.5">•</span>
          <div className="text-slate-700 dark:text-slate-300 flex-1">
            {renderInline(ulMatch[1])}
          </div>
        </div>
      );
      continue;
    }

    // Standard paragraph
    elements.push(
      <p key={i} className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed my-1">
        {renderInline(line)}
      </p>
    );
  }

  return <div className={`space-y-1 font-sans ${className}`}>{elements}</div>;
}

export default MarkdownRenderer;
