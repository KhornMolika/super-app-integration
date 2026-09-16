'use client';

import React from 'react';
import { Card } from '@/components/ui/card';
import { Button, Input, Label } from '@/components/ui/inputs';
import { PipelineTimingSettings } from '@/types/settings.types';

interface PipelineTimingCardProps {
  pipelineTiming: PipelineTimingSettings;
  setPipelineTiming: React.Dispatch<React.SetStateAction<PipelineTimingSettings>>;
  loadingTiming: boolean;
  savingTiming: boolean;
  onApplyPreset: (preset: 'instant' | 'realistic' | 'demo') => void;
  onSavePipelineTiming: (e?: React.FormEvent) => Promise<void>;
}

export function PipelineTimingCard({
  pipelineTiming,
  setPipelineTiming,
  loadingTiming,
  savingTiming,
  onApplyPreset,
  onSavePipelineTiming,
}: PipelineTimingCardProps) {
  return (
    <Card className="p-6 sm:p-8">
      <form onSubmit={onSavePipelineTiming}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <span>Pipeline Automation &amp; Stage Timing</span>
                <span className="text-xs px-2.5 py-0.5 rounded-full font-mono font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 uppercase">
                  {pipelineTiming.preset}
                </span>
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                Configure pacing durations (in seconds) between registration, validation progress, and build compilation.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              type="submit"
              disabled={savingTiming || loadingTiming}
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm px-4 py-2 rounded-xl flex items-center gap-2 shadow-sm font-semibold"
            >
              {savingTiming ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Save Timing Settings</span>
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Presets Bar */}
        <div className="mt-6 p-4 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <span className="text-sm font-bold text-slate-800 dark:text-slate-200 block">
              ⚡ Quick Duration Presets
            </span>
            <span className="text-xs text-slate-500">
              Select a pre-configured timing template or customize individual stage seconds below.
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => onApplyPreset('instant')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                pipelineTiming.preset === 'instant'
                  ? 'bg-brand-600 text-white border-brand-600 shadow-sm'
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-brand-300'
              }`}
            >
              ⚡ Instant (0s)
            </button>
            <button
              type="button"
              onClick={() => onApplyPreset('realistic')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                pipelineTiming.preset === 'realistic'
                  ? 'bg-brand-600 text-white border-brand-600 shadow-sm'
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-brand-300'
              }`}
            >
              ⏱️ Realistic (2s)
            </button>
            <button
              type="button"
              onClick={() => onApplyPreset('demo')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                pipelineTiming.preset === 'demo'
                  ? 'bg-brand-600 text-white border-brand-600 shadow-sm'
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-brand-300'
              }`}
            >
              🎬 Demo Mode (5s)
            </button>
          </div>
        </div>

        {/* Duration Input Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                ⏳ Validation Start Delay
              </Label>
              <span className="text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400">
                {pipelineTiming.validationStartDelaySec}s
              </span>
            </div>
            <Input
              type="number"
              min="0"
              max="60"
              step="1"
              value={pipelineTiming.validationStartDelaySec}
              onChange={(e) => {
                const val = Math.max(0, parseInt(e.target.value) || 0);
                setPipelineTiming({
                  ...pipelineTiming,
                  validationStartDelaySec: val,
                  preset: 'custom',
                });
              }}
              className="font-mono text-sm"
            />
            <p className="text-[11px] text-slate-500 leading-tight">
              Delay before scanning begins after registration.
            </p>
          </div>

          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                🔍 Security Scan Pacing
              </Label>
              <span className="text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400">
                {pipelineTiming.securityScanPacingSec}s
              </span>
            </div>
            <Input
              type="number"
              min="0"
              max="60"
              step="1"
              value={pipelineTiming.securityScanPacingSec}
              onChange={(e) => {
                const val = Math.max(0, parseInt(e.target.value) || 0);
                setPipelineTiming({
                  ...pipelineTiming,
                  securityScanPacingSec: val,
                  preset: 'custom',
                });
              }}
              className="font-mono text-sm"
            />
            <p className="text-[11px] text-slate-500 leading-tight">
              Pacing between AST, SAST, and digest checks.
            </p>
          </div>

          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                🟢 Validation Pass Cooldown
              </Label>
              <span className="text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400">
                {pipelineTiming.validationPassDelaySec}s
              </span>
            </div>
            <Input
              type="number"
              min="0"
              max="60"
              step="1"
              value={pipelineTiming.validationPassDelaySec}
              onChange={(e) => {
                const val = Math.max(0, parseInt(e.target.value) || 0);
                setPipelineTiming({
                  ...pipelineTiming,
                  validationPassDelaySec: val,
                  preset: 'custom',
                });
              }}
              className="font-mono text-sm"
            />
            <p className="text-[11px] text-slate-500 leading-tight">
              Delay before emitting &quot;Validation Passed&quot; card.
            </p>
          </div>

          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                🔨 Build Trigger Delay
              </Label>
              <span className="text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400">
                {pipelineTiming.buildTriggerDelaySec}s
              </span>
            </div>
            <Input
              type="number"
              min="0"
              max="60"
              step="1"
              value={pipelineTiming.buildTriggerDelaySec}
              onChange={(e) => {
                const val = Math.max(0, parseInt(e.target.value) || 0);
                setPipelineTiming({
                  ...pipelineTiming,
                  buildTriggerDelaySec: val,
                  preset: 'custom',
                });
              }}
              className="font-mono text-sm"
            />
            <p className="text-[11px] text-slate-500 leading-tight">
              Delay before queuing Jenkins compilation.
            </p>
          </div>
        </div>

        {/* Telegram UI Style & Buttons Options */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6 p-4 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800">
          <div className="space-y-2">
            <Label className="text-xs font-bold text-slate-800 dark:text-slate-200">
              📱 Telegram Notification Style
            </Label>
            <select
              value={pipelineTiming.telegramStyle}
              onChange={(e) =>
                setPipelineTiming({
                  ...pipelineTiming,
                  telegramStyle: e.target.value as 'rich_cards' | 'compact',
                })
              }
              className="w-full text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 px-3 py-2"
            >
              <option value="rich_cards">Rich Cards with Formatted Badges (Recommended)</option>
              <option value="compact">Compact Plain Summary</option>
            </select>
            <p className="text-[11px] text-slate-500">
              Controls visual layout, status banners, and quote formatting in Telegram.
            </p>
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 mt-2 sm:mt-0">
            <div>
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                🔘 Interactive Action Buttons
              </span>
              <span className="text-[11px] text-slate-500 block">
                Attach <code>[View Backoffice]</code>, <code>[Download APK]</code> buttons.
              </span>
            </div>
            <input
              type="checkbox"
              checked={pipelineTiming.enableTelegramActionButtons}
              onChange={(e) =>
                setPipelineTiming({
                  ...pipelineTiming,
                  enableTelegramActionButtons: e.target.checked,
                })
              }
              className="w-5 h-5 accent-indigo-600 rounded cursor-pointer"
            />
          </div>
        </div>
      </form>
    </Card>
  );
}
