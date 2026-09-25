"use client";

import React from "react";
import { PackageIcon, GlobeIcon, TagIcon } from "@/components/ui/Icons";

export type FlutterIntegrationMode = "artifact" | "git";

export interface FlutterModeSelectorProps {
  mode: FlutterIntegrationMode;
  onSelectMode: (mode: FlutterIntegrationMode) => void;
  disabled?: boolean;
}

export default function FlutterModeSelector({
  mode,
  onSelectMode,
  disabled = false,
}: FlutterModeSelectorProps) {
  const options = [
    {
      id: "artifact" as FlutterIntegrationMode,
      title: "Flutter Package Artifact (.zip / .tar.gz)",
      description: "Zero credentials required. Upload your zipped package bundle to auto-extract metadata, dependencies & capabilities.",
      icon: PackageIcon,
      badge: "Zero-Config",
      badgeColor: "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800",
    },
    {
      id: "git" as FlutterIntegrationMode,
      title: "Flutter Package Source Code (Git Repository)",
      description: "Connect directly to source repository via GitHub or GitLab using SSH Deploy Keys or Personal Access Tokens.",
      icon: GlobeIcon,
      badge: "Direct Sync",
      badgeColor: "bg-sky-100 dark:bg-sky-950/60 text-sky-800 dark:text-sky-300 border-sky-300 dark:border-sky-800",
    },
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <PackageIcon className="w-4 h-4 text-brand-600 dark:text-brand-400" />
          <span>Package Integration Mode</span>
        </label>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {options.map((opt) => {
          const isSelected = mode === opt.id;
          const Icon = opt.icon;
          return (
            <button
              key={opt.id}
              type="button"
              disabled={disabled}
              onClick={() => onSelectMode(opt.id)}
              className={`p-4 rounded-xl border text-left transition-all relative flex flex-col justify-between ${
                isSelected
                  ? "bg-brand-50/70 dark:bg-brand-950/40 border-brand-500 ring-2 ring-brand-500/20 shadow-sm"
                  : "bg-white dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
              } ${disabled ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}`}
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2 font-bold text-xs sm:text-sm text-slate-900 dark:text-white">
                    <Icon className={`w-4 h-4 ${isSelected ? "text-brand-600 dark:text-brand-400" : "text-slate-500"}`} />
                    <span>{opt.title}</span>
                  </div>
                </div>
                <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  {opt.description}
                </p>
              </div>

              <div className="mt-3 flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800/80">
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${opt.badgeColor}`}>
                  {opt.badge}
                </span>
                <span className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                  isSelected
                    ? "border-brand-600 bg-brand-600 text-white"
                    : "border-slate-300 dark:border-slate-700"
                }`}>
                  {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
