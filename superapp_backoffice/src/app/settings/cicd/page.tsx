'use client';

import React, { useState, useEffect } from 'react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { PipelineTimingCard } from '@/components/settings';
import { PipelineTimingSettings, DEFAULT_PIPELINE_TIMING } from '@/types/settings.types';
import { settingsApi } from '@/api';
import { toast } from '@/components/ui/Toast';

export default function PipelineTimingPage() {
  const [pipelineTiming, setPipelineTiming] = useState<PipelineTimingSettings>(DEFAULT_PIPELINE_TIMING);
  const [loadingTiming, setLoadingTiming] = useState(true);
  const [savingTiming, setSavingTiming] = useState(false);

  const fetchPipelineTiming = async () => {
    try {
      setLoadingTiming(true);
      const data = await settingsApi.getPipelineTiming();
      if (data) {
        setPipelineTiming(data as any);
      }
    } catch (err: any) {
      if (err?.status !== 403 && err?.statusCode !== 403) {
        console.warn('Pipeline timing unavailable:', err?.message);
      }
    } finally {
      setLoadingTiming(false);
    }
  };

  useEffect(() => {
    fetchPipelineTiming();
  }, []);

  const applyPreset = (preset: 'instant' | 'realistic' | 'demo') => {
    let updated: PipelineTimingSettings;
    if (preset === 'instant') {
      updated = {
        ...pipelineTiming,
        preset: 'instant',
        validationStartDelaySec: 0,
        securityScanPacingSec: 0,
        validationPassDelaySec: 0,
        buildTriggerDelaySec: 0,
      };
    } else if (preset === 'realistic') {
      updated = {
        ...pipelineTiming,
        preset: 'realistic',
        validationStartDelaySec: 2,
        securityScanPacingSec: 2,
        validationPassDelaySec: 3,
        buildTriggerDelaySec: 2,
      };
    } else {
      updated = {
        ...pipelineTiming,
        preset: 'demo',
        validationStartDelaySec: 5,
        securityScanPacingSec: 3,
        validationPassDelaySec: 5,
        buildTriggerDelaySec: 4,
      };
    }
    setPipelineTiming(updated);
  };

  const handleSavePipelineTiming = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSavingTiming(true);
    try {
      const data = await settingsApi.updatePipelineTiming(pipelineTiming as any);
      setPipelineTiming(data as any);
      const msg = `Pipeline automation timing updated successfully (Preset: ${(data as any).preset?.toUpperCase() || 'CUSTOM'})!`;
      toast.success(msg, 'Timing Saved');
    } catch (err: any) {
      const msg = err.message || 'Network error saving pipeline settings.';
      toast.error(msg, 'Network Error');
    } finally {
      setSavingTiming(false);
    }
  };

  return (
    <ProtectedRoute requiredRole="SUPER_ADMIN">
      <div className="animate-in fade-in slide-in-from-bottom-3 duration-500 ease-out space-y-6 pb-12">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-4 pb-2 border-b border-slate-200/60 dark:border-slate-800/60">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-brand-600 dark:text-brand-400 uppercase tracking-widest mb-1.5">
              <span>Platform Governance &amp; Automation</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
              CI/CD Pipeline Timing
            </h2>
            <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm max-w-2xl leading-relaxed">
              Configure system-wide automated verification pacing, security scan mock execution delays, and build trigger speeds.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/80 shadow-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>Super Admin Restricted</span>
            </span>
          </div>
        </div>

        {/* Timing Content */}
        <div>
          <PipelineTimingCard
            pipelineTiming={pipelineTiming}
            setPipelineTiming={setPipelineTiming}
            loadingTiming={loadingTiming}
            savingTiming={savingTiming}
            onApplyPreset={applyPreset}
            onSavePipelineTiming={handleSavePipelineTiming}
          />
        </div>
      </div>
    </ProtectedRoute>
  );
}
