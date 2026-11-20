'use client';

import React, { useState } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  KeyRound,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Info,
  Lock,
} from 'lucide-react';

export interface PermissionDiffItem {
  type: string;
  purpose?: string;
  riskLevel?: 'HIGH' | 'MEDIUM' | 'LOW';
  oldPurpose?: string;
  newPurpose?: string;
}

export interface ReviewPermissionsTabProps {
  added: PermissionDiffItem[];
  removed: PermissionDiffItem[];
  modified: PermissionDiffItem[];
  unchanged: PermissionDiffItem[];
  isHighRiskChange: boolean;
}

export function ReviewPermissionsTab({
  added,
  removed,
  modified,
  unchanged,
  isHighRiskChange,
}: ReviewPermissionsTabProps) {
  const [showUnchanged, setShowUnchanged] = useState(false);
  const totalDeltas = added.length + removed.length + modified.length;

  return (
    <div className="space-y-6">
      {/* Risk Alert Banner */}
      {isHighRiskChange ? (
        <div className="p-4 rounded-2xl bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/60 flex items-start gap-3">
          <div className="p-2 rounded-xl bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400 shrink-0">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div className="text-xs space-y-1">
            <h4 className="font-bold text-rose-900 dark:text-rose-200 uppercase tracking-wider">
              High-Risk Platform Capabilities Declared
            </h4>
            <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
              This revision declares elevated or sensitive capabilities (such as Biometric Authentication, Camera, or External Host Access). Ensure that the developer has provided explicit justification and complies with platform security guidelines before approving.
            </p>
          </div>
        </div>
      ) : (
        <div className="p-4 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/60 flex items-start gap-3">
          <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div className="text-xs space-y-1">
            <h4 className="font-bold text-emerald-900 dark:text-emerald-200 uppercase tracking-wider">
              Standard Capability Envelope
            </h4>
            <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
              No sensitive or uncertified security capabilities were introduced in this version comparison.
            </p>
          </div>
        </div>
      )}

      {/* Overview Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">Total Capabilities</span>
          <span className="text-xl font-extrabold text-slate-900 dark:text-slate-100 mt-1 block">
            {added.length + unchanged.length + modified.length}
          </span>
        </div>
        <div className="p-3.5 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 shadow-2xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 block">Added</span>
          <span className="text-xl font-extrabold text-emerald-700 dark:text-emerald-400 mt-1 block">
            +{added.length}
          </span>
        </div>
        <div className="p-3.5 rounded-2xl bg-rose-50/60 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800 shadow-2xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-rose-700 dark:text-rose-400 block">Removed</span>
          <span className="text-xl font-extrabold text-rose-700 dark:text-rose-400 mt-1 block">
            -{removed.length}
          </span>
        </div>
        <div className="p-3.5 rounded-2xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 shadow-2xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 block">Modified</span>
          <span className="text-xl font-extrabold text-amber-700 dark:text-amber-400 mt-1 block">
            ~{modified.length}
          </span>
        </div>
      </div>

      {/* Added Capabilities */}
      {added.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 rounded-md bg-emerald-500 text-white flex items-center justify-center font-bold text-xs">
              +
            </span>
            <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Added Capabilities ({added.length})
            </h4>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {added.map((perm) => (
              <div
                key={perm.type}
                className="p-4 rounded-2xl border border-emerald-300 dark:border-emerald-800/80 bg-emerald-50/40 dark:bg-emerald-950/20 space-y-2 shadow-2xs"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-xs font-extrabold text-slate-900 dark:text-slate-100">
                    {perm.type}
                  </span>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                      perm.riskLevel === 'HIGH'
                        ? 'bg-rose-100 text-rose-800 dark:bg-rose-900 dark:text-rose-200 border border-rose-300'
                        : perm.riskLevel === 'MEDIUM'
                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200 border border-amber-300'
                        : 'bg-sky-100 text-sky-800 dark:bg-sky-900 dark:text-sky-200 border border-sky-300'
                    }`}
                  >
                    {perm.riskLevel || 'LOW'} RISK
                  </span>
                </div>
                <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                  {perm.purpose || 'No developer justification provided for this capability request.'}
                </p>
                <div className="flex items-center gap-1.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-400">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Newly requested in target version</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Removed Capabilities */}
      {removed.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 rounded-md bg-rose-500 text-white flex items-center justify-center font-bold text-xs">
              -
            </span>
            <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Removed Capabilities ({removed.length})
            </h4>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {removed.map((perm) => (
              <div
                key={perm.type}
                className="p-4 rounded-2xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/30 dark:bg-rose-950/20 space-y-2 shadow-2xs"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-xs font-bold text-slate-600 dark:text-slate-400 line-through">
                    {perm.type}
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300">
                    REMOVED
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed italic">
                  Previously: {perm.purpose || 'Platform runtime integration'}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modified Capabilities */}
      {modified.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 rounded-md bg-amber-500 text-white flex items-center justify-center font-bold text-xs">
              ~
            </span>
            <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Modified Capabilities &amp; Purpose ({modified.length})
            </h4>
          </div>

          <div className="space-y-3">
            {modified.map((perm) => (
              <div
                key={perm.type}
                className="p-4 rounded-2xl border border-amber-300 dark:border-amber-800 bg-amber-50/40 dark:bg-amber-950/20 space-y-2 shadow-2xs"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-xs font-extrabold text-slate-900 dark:text-slate-100">
                    {perm.type}
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                    PURPOSE MODIFIED
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 text-xs">
                  <div className="p-2.5 rounded-xl bg-white/80 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Old Purpose</span>
                    <span className="text-slate-600 dark:text-slate-400">{perm.oldPurpose || '(none)'}</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white/80 dark:bg-slate-900/60 border border-emerald-300 dark:border-emerald-700">
                    <span className="text-[10px] font-bold text-emerald-600 uppercase block mb-1">New Proposed Purpose</span>
                    <span className="text-emerald-800 dark:text-emerald-300 font-medium">{perm.newPurpose}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Unchanged Capabilities Collapsible */}
      {unchanged.length > 0 && (
        <div className="pt-2">
          <button
            type="button"
            onClick={() => setShowUnchanged(!showUnchanged)}
            className="flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-colors cursor-pointer"
          >
            <span>{showUnchanged ? 'Hide' : 'Show'} Unchanged Capabilities ({unchanged.length})</span>
            {showUnchanged ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          {showUnchanged && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 mt-3 animate-in fade-in duration-200">
              {unchanged.map((perm) => (
                <div
                  key={perm.type}
                  className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 text-xs flex items-center justify-between gap-2"
                >
                  <span className="font-mono text-slate-700 dark:text-slate-300 font-semibold">{perm.type}</span>
                  <span className="text-[10px] text-slate-400 font-bold">Unchanged</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {totalDeltas === 0 && (
        <div className="p-8 text-center rounded-2xl bg-slate-50 dark:bg-slate-800/30 border border-slate-200 dark:border-slate-800">
          <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
          <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">No Capability Changes</h4>
          <p className="text-xs text-slate-500 mt-1">Target version declares the exact same platform capabilities as base version.</p>
        </div>
      )}
    </div>
  );
}
