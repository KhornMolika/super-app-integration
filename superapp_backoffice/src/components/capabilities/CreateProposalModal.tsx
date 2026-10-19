'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button, Input, Label } from '@/components/ui/inputs';
import { PlusCircle, Sparkles, X, Smartphone } from 'lucide-react';
import { permissionsApi } from '@/api/permissions.api';
import { miniappsApi } from '@/api';
import { useAuth } from '@/lib/auth';
import { toast } from '@/components/ui/Toast';

interface CreateProposalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export function CreateProposalModal({
  isOpen,
  onClose,
  onCreated,
}: CreateProposalModalProps) {
  const { user, hasRole } = useAuth();
  const isSuper = hasRole('SUPER_ADMIN') || hasRole('ADMIN');

  const [permissionKey, setPermissionKey] = useState('');
  const [permissionName, setPermissionName] = useState('');
  const [description, setDescription] = useState('');
  const [miniapps, setMiniapps] = useState<any[]>([]);
  const [selectedMiniAppId, setSelectedMiniAppId] = useState<string>('platform');
  const [customMiniAppName, setCustomMiniAppName] = useState<string>('');
  const [isLoadingApps, setIsLoadingApps] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsLoadingApps(true);
      miniappsApi
        .getAll({ mine: !isSuper })
        .then((data) => {
          if (Array.isArray(data)) {
            setMiniapps(data);
          }
        })
        .catch((err) => {
          console.warn('Failed to load miniapps list:', err);
        })
        .finally(() => {
          setIsLoadingApps(false);
        });
    }
  }, [isOpen, isSuper]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!permissionKey.trim()) {
      toast.error('Capability key is required');
      return;
    }

    if (selectedMiniAppId === 'custom' && !customMiniAppName.trim()) {
      toast.error('Please specify the MiniApp name');
      return;
    }

    try {
      setIsSubmitting(true);

      const isPlatform = selectedMiniAppId === 'platform';
      const isCustom = selectedMiniAppId === 'custom';
      const chosenMiniApp = miniapps.find((m) => m.id === selectedMiniAppId);

      const miniAppName = isPlatform
        ? 'Platform / SuperApp Core Shell'
        : isCustom
          ? customMiniAppName.trim()
          : chosenMiniApp?.name || 'MiniApp';

      await permissionsApi.createProposal({
        permissionKey: permissionKey.trim(),
        permissionName: permissionName.trim() || permissionKey.trim(),
        description: description.trim() || `Capability proposal for ${permissionKey.trim()}`,
        miniAppId: !isPlatform && !isCustom && chosenMiniApp ? chosenMiniApp.id : undefined,
        metadata: {
          miniAppName,
          miniAppId: !isPlatform && !isCustom && chosenMiniApp ? chosenMiniApp.id : undefined,
          appId: !isPlatform && !isCustom && chosenMiniApp ? chosenMiniApp.appId : undefined,
          category: chosenMiniApp?.category,
          requestedSource: 'DIRECT_PROPOSAL',
        },
      });

      toast.success(`Capability proposal for '${permissionKey}' created successfully!`);
      setPermissionKey('');
      setPermissionName('');
      setDescription('');
      setSelectedMiniAppId('platform');
      setCustomMiniAppName('');
      onClose();
      onCreated();
    } catch (err: any) {
      toast.error(err.message || 'Failed to create capability proposal');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <Card className="w-full max-w-lg p-6 space-y-4 shadow-2xl border-slate-700 bg-white dark:bg-slate-900">
        <div className="flex items-start justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400">
              <PlusCircle className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Propose New Host Capability
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Submit an unlisted device or platform feature for code injection.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {/* Associated MiniApp Selector */}
          <div className="space-y-1">
            <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Smartphone className="w-3.5 h-3.5 text-brand-500" />
                <span>Associated MiniApp / Scope</span>
              </span>
              {isLoadingApps && (
                <span className="text-[10px] text-slate-400">Loading MiniApps...</span>
              )}
            </Label>
            <select
              value={selectedMiniAppId}
              onChange={(e) => setSelectedMiniAppId(e.target.value)}
              className="w-full h-9 text-xs px-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 cursor-pointer"
            >
              <option value="platform">
                🌐 Platform / SuperApp Core Shell (Shared feature)
              </option>
              {miniapps.length > 0 && (
                <optgroup label={isSuper ? "Registered MiniApps" : `My MiniApps (${user?.email || 'Logged-in User'})`}>
                  {miniapps.map((app) => (
                    <option key={app.id} value={app.id}>
                      📱 {app.name} ({app.appId || app.organization || 'MiniApp'})
                    </option>
                  ))}
                </optgroup>
              )}
              <option value="custom">
                ➕ Other / Unregistered / In-Development MiniApp...
              </option>
            </select>
          </div>

          {selectedMiniAppId === 'custom' && (
            <div className="space-y-1 animate-in fade-in duration-200">
              <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                MiniApp Name / Package Identifier <span className="text-rose-500 font-bold">*</span>
              </Label>
              <Input
                required
                value={customMiniAppName}
                onChange={(e) => setCustomMiniAppName(e.target.value)}
                placeholder="e.g. Daffo Insurance, ma_flutter_kyc, E-Wallet"
                className="h-9 text-xs"
              />
            </div>
          )}

          <div className="space-y-1">
            <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Capability Key <span className="text-rose-500 font-bold">*</span>
            </Label>
            <Input
              required
              value={permissionKey}
              onChange={(e) => setPermissionKey(e.target.value)}
              placeholder="e.g. nfc, bluetooth, healthkit, telephony"
              className="h-9 text-xs font-mono"
            />
          </div>

          <div className="space-y-1">
            <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Display Name
            </Label>
            <Input
              value={permissionName}
              onChange={(e) => setPermissionName(e.target.value)}
              placeholder="e.g. NFC Smart Card Reader"
              className="h-9 text-xs"
            />
          </div>

          <div className="space-y-1">
            <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Purpose &amp; Technical Justification <span className="text-rose-500 font-bold">*</span>
            </Label>
            <textarea
              required
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Scan contactless smart cards and national identity e-chips for biometric authentication."
              className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={isSubmitting || !permissionKey.trim()}
              className="inline-flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'Submitting...' : 'Submit Proposal'}</span>
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
