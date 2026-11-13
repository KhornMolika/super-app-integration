"use client";

import React from "react";
import { PackageIcon, GlobeIcon } from "@/components/ui/Icons";

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
      title: "Upload a package",
      description: "A .zip or .tar.gz of your package. No access keys needed.",
      icon: PackageIcon,
    },
    {
      id: "git" as FlutterIntegrationMode,
      title: "Connect a Git repository",
      description: "GitHub or GitLab. Private repos use a deploy key or token.",
      icon: GlobeIcon,
    },
  ];

  return (
    <fieldset>
      <legend className="block text-sm font-semibold text-slate-800 dark:text-slate-200 mb-2">Package source</legend>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {options.map((opt) => {
          const isSelected = mode === opt.id;
          const Icon = opt.icon;
          return (
            <button
              key={opt.id}
              type="button"
              role="radio"
              aria-checked={isSelected}
              disabled={disabled}
              onClick={() => onSelectMode(opt.id)}
              className={`flex items-start gap-3 rounded-2xl border p-4 text-left transition-colors ${
                isSelected
                  ? "border-brand-500 bg-brand-500/5 ring-1 ring-brand-500"
                  : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
              } ${disabled ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}`}
            >
              <span
                className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                  isSelected ? "bg-brand-600 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                }`}
              >
                <Icon className="w-5 h-5" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-slate-900 dark:text-slate-100">{opt.title}</span>
                <span className="block mt-0.5 text-xs text-slate-500 dark:text-slate-400">{opt.description}</span>
              </span>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
