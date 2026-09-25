"use client";

import React, { useState } from "react";
import {
  PackageIcon,
  CheckCircleIcon,
  AlertTriangleIcon,
  ShieldCheckIcon,
  ZapIcon,
  SparklesIcon,
  DownloadIcon,
  CopyIcon,
  ClipboardCheckIcon,
  XIcon,
} from "@/components/ui/Icons";

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
  const [showHelperModal, setShowHelperModal] = useState(false);
  const [copiedBash, setCopiedBash] = useState(false);
  const [copiedPs, setCopiedPs] = useState(false);

  const backofficeBaseUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_BACKOFFICE_URL ||
    (typeof window !== "undefined" && window.location.origin
      ? window.location.origin
      : "");


  const bashScriptCmd = `curl -sSL ${backofficeBaseUrl}/tools/pack-miniapp.sh | bash`;
  const psScriptCmd = `irm ${backofficeBaseUrl}/tools/pack-miniapp.ps1 | iex`;


  const copyToClipboard = (text: string, type: "bash" | "ps") => {
    navigator.clipboard.writeText(text);
    if (type === "bash") {
      setCopiedBash(true);
      setTimeout(() => setCopiedBash(false), 2000);
    } else {
      setCopiedPs(true);
      setTimeout(() => setCopiedPs(false), 2000);
    }
  };

  const hasArchive = Boolean(archiveUploadSuccess || existingFilename || existingChecksum);
  const displayFilename = archiveUploadSuccess?.filename || existingFilename || "uploaded_package.zip";
  const displaySha = (archiveUploadSuccess?.sha256 || existingChecksum || "").substring(0, 16);
  const displaySize = archiveUploadSuccess?.size || existingSize;

  return (
    <div className="space-y-4">
      {/* Upload Dropzone & Instructions Card */}
      <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-50 dark:bg-brand-950/60 border border-brand-200 dark:border-brand-800 flex items-center justify-center flex-shrink-0 text-brand-600 dark:text-brand-400">
              <PackageIcon className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>Upload Flutter Package Archive (.zip / .tar.gz)</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                  Zero Credentials
                </span>
              </h4>
              <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Upload your zipped package bundle to auto-extract metadata, dependencies &amp; security capabilities.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowHelperModal(true)}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <DownloadIcon className="w-3.5 h-3.5 text-slate-500" />
              <span>Packaging Helper</span>
            </button>

            <label className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold text-white transition-all shadow-sm ${
              isUploading
                ? "bg-slate-400 cursor-not-allowed"
                : "bg-brand-600 hover:bg-brand-700 cursor-pointer active:scale-95"
            }`}>
              {isUploading ? (
                <>
                  <ZapIcon className="w-3.5 h-3.5 animate-spin" />
                  <span>Inspecting...</span>
                </>
              ) : (
                <>
                  <PackageIcon className="w-3.5 h-3.5" />
                  <span>{hasArchive ? "Replace Archive" : "Choose Archive"}</span>
                </>
              )}
              <input
                type="file"
                accept=".zip,.tar.gz,.tgz,.tar"
                onChange={onFileSelected}
                disabled={isUploading || !isEditable}
                className="hidden"
              />
            </label>
          </div>
        </div>

        {/* Error Alert */}
        {archiveUploadError && (
          <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-800 dark:text-rose-300 flex items-center gap-2">
            <AlertTriangleIcon className="w-4 h-4 text-rose-600 flex-shrink-0" />
            <span>{archiveUploadError}</span>
          </div>
        )}

        {/* Success / Inspected Metadata Card */}
        {hasArchive && (
          <div className="p-3.5 bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-300/80 dark:border-emerald-800/80 rounded-xl text-xs space-y-2.5 animate-in fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-200 font-bold">
                <CheckCircleIcon className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span className="font-mono truncate">{displayFilename}</span>
              </div>
              {displaySha && (
                <span className="font-mono text-[10px] text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800 self-start sm:self-auto">
                  SHA-256: {displaySha}...
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 border-t border-emerald-200/60 dark:border-emerald-800/60 text-[11px]">
              <div>
                <span className="text-slate-500 dark:text-slate-400">Package Name:</span>
                <p className="font-mono font-bold text-slate-900 dark:text-white">
                  {archiveUploadSuccess?.pubspec?.name || "Extracted from pubspec"}
                </p>
              </div>
              <div>
                <span className="text-slate-500 dark:text-slate-400">Version:</span>
                <p className="font-mono font-bold text-slate-900 dark:text-white">
                  {archiveUploadSuccess?.pubspec?.version || "^1.0.0"}
                </p>
              </div>
              <div>
                <span className="text-slate-500 dark:text-slate-400">Clean Size:</span>
                <p className="font-mono font-bold text-slate-900 dark:text-white">
                  {displaySize ? `${(displaySize / 1024).toFixed(1)} KB` : "15.0 KB"}
                </p>
              </div>
              <div>
                <span className="text-slate-500 dark:text-slate-400">Sanitizer:</span>
                <p className="font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-1">
                  <ShieldCheckIcon className="w-3.5 h-3.5" />
                  <span>Build Bloat Stripped</span>
                </p>
              </div>
            </div>

            {/* Detected Permissions */}
            {archiveUploadSuccess?.detectedPermissions && archiveUploadSuccess.detectedPermissions.length > 0 && (
              <div className="pt-2 border-t border-emerald-200/60 dark:border-emerald-800/60 flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                  Detected Capabilities:
                </span>
                {archiveUploadSuccess.detectedPermissions.map((perm: any) => (
                  <span
                    key={typeof perm === "string" ? perm : perm.type || perm.name}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300"
                  >
                    <SparklesIcon className="w-3 h-3 text-emerald-600" />
                    <span>{typeof perm === "string" ? perm : perm.type || perm.name}</span>
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Packaging Helper Tool Modal */}
      {showHelperModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 relative">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <PackageIcon className="w-5 h-5 text-brand-600 dark:text-brand-400" />
                <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white">
                  Mini App Packaging Scripts
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowHelperModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-sm"
              >
                <XIcon className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Run this 1-line command inside your Flutter Mini App project root to automatically clean build caches and generate an optimized <code className="font-mono bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded text-brand-600">.zip</code> archive ready for submission:
            </p>

            <div className="space-y-3">
              {/* Bash */}
              <div>
                <div className="flex items-center justify-between text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  <span>Linux / macOS / Git Bash:</span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(bashScriptCmd, "bash")}
                    className="text-brand-600 hover:underline flex items-center gap-1"
                  >
                    {copiedBash ? <ClipboardCheckIcon className="w-3 h-3 text-emerald-600" /> : <CopyIcon className="w-3 h-3" />}
                    <span>{copiedBash ? "Copied!" : "Copy"}</span>
                  </button>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-950 text-slate-100 font-mono text-xs border border-slate-800 overflow-x-auto">
                  {bashScriptCmd}
                </div>
              </div>

              {/* PowerShell */}
              <div>
                <div className="flex items-center justify-between text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  <span>Windows PowerShell:</span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(psScriptCmd, "ps")}
                    className="text-brand-600 hover:underline flex items-center gap-1"
                  >
                    {copiedPs ? <ClipboardCheckIcon className="w-3 h-3 text-emerald-600" /> : <CopyIcon className="w-3 h-3" />}
                    <span>{copiedPs ? "Copied!" : "Copy"}</span>
                  </button>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-950 text-slate-100 font-mono text-xs border border-slate-800 overflow-x-auto">
                  {psScriptCmd}
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setShowHelperModal(false)}
                className="px-4 py-2 rounded-lg text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
