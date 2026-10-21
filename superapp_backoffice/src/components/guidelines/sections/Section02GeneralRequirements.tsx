"use client";

import React from "react";
import { TagIcon, HashIcon } from "@/components/ui/Icons";

export function Section02GeneralRequirements() {
  return (
    <div className="space-y-6 text-base text-slate-600 dark:text-slate-300">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div id="req-identity" className="border border-slate-200 dark:border-slate-800 rounded-xl p-5 bg-slate-50/50 dark:bg-slate-900/40 scroll-mt-24">
          <h5 className="font-bold text-slate-900 dark:text-white text-base flex items-center gap-2 mb-2">
            <TagIcon /> MiniApp Identity
          </h5>
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-3 leading-relaxed">
            Every MiniApp registers an immutable unique identifier prefixed with{" "}
            <code className="font-mono text-brand-600 dark:text-brand-400">miniapp_</code>.
          </p>
          <div className="bg-slate-900 text-slate-200 px-3 py-2 rounded-lg font-mono text-sm">
            miniapp_hr_attendance_8f32a1
          </div>
          <p className="text-sm text-slate-500 mt-2">
            Allowed: lowercase letters, digits, and underscores.
          </p>
        </div>

        <div id="req-semver" className="border border-slate-200 dark:border-slate-800 rounded-xl p-5 bg-slate-50/50 dark:bg-slate-900/40 scroll-mt-24">
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

      <div id="req-environments" className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 space-y-3 scroll-mt-24">
        <h5 className="font-semibold text-slate-900 dark:text-white text-sm uppercase tracking-wider">
          Environment Segregation
        </h5>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
          <div className="p-3.5 rounded-lg bg-slate-100 dark:bg-slate-800/60">
            <span className="font-bold text-slate-800 dark:text-slate-200 block mb-1">DEV</span>
            <p className="text-slate-600 dark:text-slate-400">
              For ongoing feature work and local developer sandbox harnesses.
            </p>
          </div>
          <div className="p-3.5 rounded-lg bg-slate-100 dark:bg-slate-800/60">
            <span className="font-bold text-slate-800 dark:text-slate-200 block mb-1">STAGING</span>
            <p className="text-slate-600 dark:text-slate-400">
              Pre-production verification against real SuperApp test builds.
            </p>
          </div>
          <div className="p-3.5 rounded-lg bg-slate-100 dark:bg-slate-800/60">
            <span className="font-bold text-slate-800 dark:text-slate-200 block mb-1">PROD</span>
            <p className="text-slate-600 dark:text-slate-400">
              Publicly active release serving live end-users inside SuperApp.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
