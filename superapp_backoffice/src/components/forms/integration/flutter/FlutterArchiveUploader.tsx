"use client";

import React, { useState } from "react";
import { CheckIcon } from "@/components/ui/Icons";
import { copyText } from "@/lib/clipboard";

export interface FlutterArchiveUploaderProps {
  isUploading: boolean;
  archiveUploadSuccess: any;
  archiveUploadError: string | null;
  onFileSelected: (e: React.ChangeEvent<HTMLInputElement>) => void;
  isEditable?: boolean;
  existingFilename?: string;
  existingChecksum?: string;
  existingSize?: number;
}

function Command({ label, cmd }: { label: string; cmd: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div>
      <div className="flex items-center justify-between gap-2 mb-1">
        <span className="text-xs text-slate-500 dark:text-slate-400">{label}</span>
        <button
          type="button"
          onClick={() => {
            copyText(cmd);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          }}
          className="text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="overflow-x-auto rounded-lg bg-slate-950 p-2.5 font-mono text-xs text-slate-100">{cmd}</pre>
    </div>
  );
}

/** Pick the package archive; shows what the inspection found. */
export default function FlutterArchiveUploader({
  isUploading,
  archiveUploadSuccess,
  archiveUploadError,
  onFileSelected,
  isEditable = true,
  existingFilename,
  existingChecksum,
  existingSize,
}: FlutterArchiveUploaderProps) {
  const [showHelp, setShowHelp] = useState(false);

  const base =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_BACKOFFICE_URL ||
    (typeof window !== "undefined" ? window.location.origin : "");

  const hasArchive = Boolean(archiveUploadSuccess || existingFilename || existingChecksum);
  const filename = archiveUploadSuccess?.filename || existingFilename || "package.zip";
  const sha = (archiveUploadSuccess?.sha256 || existingChecksum || "").substring(0, 12);
  const size = archiveUploadSuccess?.size || existingSize;
  const perms: any[] = archiveUploadSuccess?.detectedPermissions || [];

  return (
    <section className="rounded-2xl border border-slate-200/80 dark:border-slate-800 p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Package file <span className="text-rose-500">*</span>
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            .zip or .tar.gz with pubspec.yaml at the top.{" "}
            <button
              type="button"
              onClick={() => setShowHelp((v) => !v)}
              aria-expanded={showHelp}
              className="font-medium text-slate-700 dark:text-slate-300 underline-offset-2 hover:underline"
            >
              {showHelp ? "Hide how to pack it" : "How to pack it"}
            </button>
          </p>
        </div>
        <label
          className={`h-9 px-4 rounded-xl text-sm font-semibold inline-flex items-center ${
            isUploading || !isEditable
              ? "bg-slate-200 dark:bg-slate-800 text-slate-500 cursor-not-allowed"
              : hasArchive
                ? "border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                : "bg-brand-600 hover:bg-brand-700 text-white cursor-pointer"
          }`}
        >
          {isUploading ? "Checking file..." : hasArchive ? "Replace file" : "Choose file"}
          <input
            type="file"
            accept=".zip,.tar.gz,.tgz,.tar"
            onChange={onFileSelected}
            disabled={isUploading || !isEditable}
            className="sr-only"
          />
        </label>
      </div>

      {showHelp && (
        <div className="space-y-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 p-3">
          <p className="text-xs text-slate-600 dark:text-slate-400">
            Run one of these in your package folder. It removes build files and makes the .zip.
          </p>
          <Command label="macOS, Linux, Git Bash" cmd={`curl -sSL ${base}/tools/pack-miniapp.sh | bash`} />
          <Command label="Windows PowerShell" cmd={`irm ${base}/tools/pack-miniapp.ps1 | iex`} />
        </div>
      )}

      {archiveUploadError && <p className="text-sm text-rose-600 dark:text-rose-400">{archiveUploadError}</p>}

      {hasArchive && (
        <div className="rounded-xl bg-slate-50 dark:bg-slate-900/60 p-3 space-y-2">
          <p className="flex items-center gap-1.5 text-sm font-medium text-slate-900 dark:text-slate-100 min-w-0">
            <CheckIcon className="w-4 h-4 text-brand-600 dark:text-brand-400 shrink-0" />
            <span className="font-mono truncate">{filename}</span>
          </p>
          <dl className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            {[
              ["Package", archiveUploadSuccess?.pubspec?.name],
              ["Version", archiveUploadSuccess?.pubspec?.version],
              ["Size", size ? `${(size / 1024).toFixed(1)} KB` : ""],
              ["SHA-256", sha ? `${sha}...` : ""],
            ]
              .filter(([, v]) => v)
              .map(([k, v]) => (
                <div key={k} className="min-w-0">
                  <dt className="text-slate-500 dark:text-slate-400">{k}</dt>
                  <dd className="font-mono text-slate-800 dark:text-slate-200 truncate">{v}</dd>
                </div>
              ))}
          </dl>
          {perms.length > 0 && (
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Uses: {perms.map((p) => (typeof p === "string" ? p : p.type || p.name)).join(", ")}
            </p>
          )}
        </div>
      )}
    </section>
  );
}
