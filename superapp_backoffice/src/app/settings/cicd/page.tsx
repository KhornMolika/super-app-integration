'use client';

import React, { useState, useEffect } from 'react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { PipelineTimingCard, SettingsPageHeader } from '@/components/settings';
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
      <div className="w-full min-w-0 space-y-6 pb-12 animate-in fade-in slide-in-from-bottom-3 duration-500 ease-out">
        <SettingsPageHeader
          section="Platform Governance & Automation"
          title="CI/CD Pipeline Timing"
          description="Configure system-wide automated verification pacing, security scan execution delays, and build trigger speeds."
          badge={{ label: 'Super Admin Restricted', tone: 'emerald', pulse: true }}
        />

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
