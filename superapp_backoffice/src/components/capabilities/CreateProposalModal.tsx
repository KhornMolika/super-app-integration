import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/inputs';
import {
  Sparkles,
  X,
  Smartphone,
  Globe,
  Layers,
  ChevronDown,
  Info,
  Check,
} from 'lucide-react';
import { permissionsApi } from '@/api/permissions.api';
import { miniappsApi } from '@/api';
import { useAuth } from '@/lib/auth';
import { toast } from '@/components/ui/Toast';
import { getCapabilityVisual } from '@/lib/capability-visuals';

function deriveDisplayName(key: string): string {
  if (!key.trim()) return '';
  return key
    .split(/[_\-\s]+/)
    .map((word) => {
      const lower = word.toLowerCase();
      if (lower === 'nfc') return 'NFC';
      if (lower === 'gps') return 'GPS';
      if (lower === 'qr') return 'QR';
      if (lower === 'ble') return 'BLE';
      if (lower === 'sdk') return 'SDK';
      if (lower === 'api') return 'API';
      if (lower === 'sms') return 'SMS';
      if (lower === 'id') return 'ID';
      if (lower === 'otp') return 'OTP';
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');
}

type ScopeType = 'platform' | 'registered' | 'custom';

interface CreateProposalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
  initialCapabilityKey?: string;
  initialCapabilityName?: string;
  initialDescription?: string;
}

export function CreateProposalModal({
  isOpen,
  onClose,
  onCreated,
  initialCapabilityKey = '',
  initialCapabilityName = '',
  initialDescription = '',
}: CreateProposalModalProps) {
  const { user, hasRole } = useAuth();
  const isSuper = hasRole('SUPER_ADMIN') || hasRole('ADMIN');

  const [scopeType, setScopeType] = useState<ScopeType>('platform');
  const [permissionKey, setPermissionKey] = useState(initialCapabilityKey);
  const [permissionName, setPermissionName] = useState(initialCapabilityName);
  const [description, setDescription] = useState(initialDescription);
  const [miniapps, setMiniapps] = useState<any[]>([]);
  const [selectedMiniAppId, setSelectedMiniAppId] = useState<string>('');
  const [customMiniAppName, setCustomMiniAppName] = useState<string>('');
  const [isLoadingApps, setIsLoadingApps] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setPermissionKey(initialCapabilityKey);
      setPermissionName(initialCapabilityName);
      setDescription(initialDescription);
      setScopeType('platform');
      setCustomMiniAppName('');

      setIsLoadingApps(true);
      miniappsApi
        .getAll({ mine: !isSuper })
        .then((data) => {
          if (Array.isArray(data)) {
            setMiniapps(data);
            if (data.length > 0) {
              setSelectedMiniAppId(data[0].id);
            }
          }
        })
        .catch((err) => {
          console.warn('Failed to load miniapps list:', err);
        })
        .finally(() => {
          setIsLoadingApps(false);
        });
    }
  }, [isOpen, isSuper, initialCapabilityKey, initialCapabilityName, initialDescription]);

  if (!isOpen || !mounted) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!permissionKey.trim()) {
      toast.error('Capability key is required');
      return;
    }

    if (scopeType === 'custom' && !customMiniAppName.trim()) {
      toast.error('Please specify the MiniApp name or package identifier');
      return;
    }

    if (scopeType === 'registered' && !selectedMiniAppId && miniapps.length > 0) {
      toast.error('Please select a registered MiniApp from the list');
      return;
    }

    try {
      setIsSubmitting(true);

      const isPlatform = scopeType === 'platform';
      const isCustom = scopeType === 'custom';
      const chosenMiniApp = miniapps.find((m) => m.id === selectedMiniAppId);

      const miniAppName = isPlatform
        ? 'Platform / SuperApp Core Shell'
        : isCustom
          ? customMiniAppName.trim()
          : chosenMiniApp?.name || 'MiniApp';

      const autoName = deriveDisplayName(permissionKey);
      const finalName = permissionName.trim() || autoName || permissionKey.trim();
      const visual = getCapabilityVisual(permissionKey, finalName, description);

      await permissionsApi.createProposal({
        permissionKey: permissionKey.trim(),
        permissionName: finalName,
        description: description.trim() || `Capability proposal for ${permissionKey.trim()}`,
        miniAppId: !isPlatform && !isCustom && chosenMiniApp ? chosenMiniApp.id : undefined,
        metadata: {
          miniAppName,
          miniAppId: !isPlatform && !isCustom && chosenMiniApp ? chosenMiniApp.id : undefined,
          appId: !isPlatform && !isCustom && chosenMiniApp ? chosenMiniApp.appId : undefined,
          category: visual.category,
          visualId: visual.id,
          requestedSource: 'DIRECT_PROPOSAL',
        },
      });

      toast.success(`Capability proposal for '${permissionKey}' created successfully!`);
      setPermissionKey('');
      setPermissionName('');
      setDescription('');
      setScopeType('platform');
      setCustomMiniAppName('');
      onClose();
      onCreated();
    } catch (err: any) {
      toast.error(err.message || 'Failed to create capability proposal');
    } finally {
      setIsSubmitting(false);
    }
  };

  const autoName = deriveDisplayName(permissionKey);
  const matchedVisual = getCapabilityVisual(permissionKey, permissionName || autoName, description);

  return createPortal(
    <div className="fixed inset-0 z-[9999] w-screen h-screen min-h-screen flex items-center justify-center p-4 sm:p-6 bg-slate-950/80 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl max-h-[92vh] my-auto overflow-y-auto no-scrollbar rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-2xl p-5 sm:p-6 space-y-4 sm:space-y-5 transition-all text-left">
        {/* Modal Header */}
        <div className="flex items-start justify-between border-b border-slate-100 dark:border-slate-800/80 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-500/10 border border-brand-500/20 text-brand-600 dark:text-brand-400 flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">
                Propose Host Capability
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Submit a native device feature or bridge method for SuperApp host integration.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Scope Selector: Clean 3-Card Segmented Selector */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <span>Associated Scope / Target</span>
                <span className="text-rose-500 font-bold">*</span>
              </label>
              <span className="text-[11px] text-slate-400">Where will this be used?</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {/* Card 1: Platform / Core Shell */}
              <button
                type="button"
                onClick={() => setScopeType('platform')}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                  scopeType === 'platform'
                    ? 'border-brand-500 bg-brand-500/10 ring-2 ring-brand-500/20 text-slate-900 dark:text-white'
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/60 dark:bg-slate-800/40 text-slate-600 dark:text-slate-300'
                }`}
              >
                <div className="flex items-center justify-between w-full mb-1.5">
                  <Globe className={`w-4 h-4 ${scopeType === 'platform' ? 'text-brand-500' : 'text-slate-400'}`} />
                  {scopeType === 'platform' && (
                    <span className="w-2 h-2 rounded-full bg-brand-500" />
                  )}
                </div>
                <div>
                  <div className="text-xs font-bold">Platform Shell</div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight mt-0.5">
                    Universal for all MiniApps
                  </div>
                </div>
              </button>

              {/* Card 2: Registered MiniApp */}
              <button
                type="button"
                onClick={() => setScopeType('registered')}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                  scopeType === 'registered'
                    ? 'border-brand-500 bg-brand-500/10 ring-2 ring-brand-500/20 text-slate-900 dark:text-white'
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/60 dark:bg-slate-800/40 text-slate-600 dark:text-slate-300'
                }`}
              >
                <div className="flex items-center justify-between w-full mb-1.5">
                  <Smartphone className={`w-4 h-4 ${scopeType === 'registered' ? 'text-brand-500' : 'text-slate-400'}`} />
                  {scopeType === 'registered' && (
                    <span className="w-2 h-2 rounded-full bg-brand-500" />
                  )}
                </div>
                <div>
                  <div className="text-xs font-bold">Registered App</div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight mt-0.5">
                    Specific existing MiniApp
                  </div>
                </div>
              </button>

              {/* Card 3: Unregistered / New MiniApp */}
              <button
                type="button"
                onClick={() => setScopeType('custom')}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                  scopeType === 'custom'
                    ? 'border-brand-500 bg-brand-500/10 ring-2 ring-brand-500/20 text-slate-900 dark:text-white'
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/60 dark:bg-slate-800/40 text-slate-600 dark:text-slate-300'
                }`}
              >
                <div className="flex items-center justify-between w-full mb-1.5">
                  <Layers className={`w-4 h-4 ${scopeType === 'custom' ? 'text-brand-500' : 'text-slate-400'}`} />
                  {scopeType === 'custom' && (
                    <span className="w-2 h-2 rounded-full bg-brand-500" />
                  )}
                </div>
                <div>
                  <div className="text-xs font-bold">New / External App</div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight mt-0.5">
                    Not yet in registry
                  </div>
                </div>
              </button>
            </div>

            {/* Sub-inputs based on Scope Selection */}
            {scopeType === 'registered' && (
              <div className="pt-1.5 space-y-1.5 animate-in fade-in slide-in-from-top-1 duration-150">
                <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                  Select Registered MiniApp
                </label>
                {isLoadingApps ? (
                  <div className="text-xs text-slate-400 py-2">Loading MiniApps catalog...</div>
                ) : miniapps.length === 0 ? (
                  <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800/60 text-xs text-slate-500">
                    No registered MiniApps found. Switch to <strong>New / External App</strong> to specify an upcoming MiniApp.
                  </div>
                ) : (
                  <div className="relative">
                    <select
                      value={selectedMiniAppId}
                      onChange={(e) => setSelectedMiniAppId(e.target.value)}
                      className="w-full h-10 text-xs pl-3 pr-8 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-800/70 text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 cursor-pointer appearance-none"
                    >
                      {miniapps.map((app) => (
                        <option key={app.id} value={app.id}>
                          {app.name} ({app.appId || app.organization || 'MiniApp'})
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                )}
              </div>
            )}

            {scopeType === 'custom' && (
              <div className="pt-1.5 space-y-1.5 animate-in fade-in slide-in-from-top-1 duration-150">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                    MiniApp Name or Identifier <span className="text-rose-500 font-bold">*</span>
                  </label>
                  <span className="text-[10px] text-slate-400">e.g. In-development or partner app</span>
                </div>
                <input
                  type="text"
                  required
                  value={customMiniAppName}
                  onChange={(e) => setCustomMiniAppName(e.target.value)}
                  placeholder="e.g. Daffo Insurance, ma_flutter_kyc, E-Wallet"
                  className="w-full h-10 text-xs px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-800/70 text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                />
              </div>
            )}

            {scopeType === 'platform' && (
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
                <Info className="w-3.5 h-3.5 text-brand-500 shrink-0" />
                <span>
                  Universal platform feature that will be exposed to all current &amp; future MiniApps in the shell.
                </span>
              </div>
            )}
          </div>

          {/* Capability Key & Display Name */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Capability Key */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center justify-between">
                <span>Capability Key (ID)</span>
                <span className="text-rose-500 font-bold">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono text-xs text-slate-400 font-semibold select-none">
                  #
                </span>
                <input
                  type="text"
                  required
                  value={permissionKey}
                  onChange={(e) => {
                    const cleaned = e.target.value.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
                    setPermissionKey(cleaned);
                  }}
                  placeholder="e.g. nfc_reader"
                  className="w-full h-10 pl-7 pr-3 text-xs font-mono rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-800/70 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all placeholder:text-slate-400"
                />
              </div>
            </div>

            {/* Capability Display Name */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Display Name
                </label>
                {autoName && !permissionName && (
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                    Auto: {autoName}
                  </span>
                )}
              </div>
              <input
                type="text"
                value={permissionName}
                onChange={(e) => setPermissionName(e.target.value)}
                placeholder={autoName ? `e.g. ${autoName}` : 'e.g. NFC Reader'}
                className="w-full h-10 px-3 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-800/70 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all placeholder:text-slate-400"
              />
            </div>
          </div>

          {/* Purpose & Technical Justification */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center justify-between">
              <span>Purpose &amp; Technical Justification</span>
              <span className="text-rose-500 font-bold">*</span>
            </label>
            <textarea
              required
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Scan contactless smart cards and national identity e-chips for biometric authentication."
              className="w-full text-xs p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-800/70 text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 resize-none transition-all placeholder:text-slate-400 leading-relaxed"
            />
          </div>

          {/* Automated Visual & Styling Preview */}
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800/80 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div
                className={`w-10 h-10 rounded-xl ${matchedVisual.bgColor} ${matchedVisual.borderColor} border flex items-center justify-center shrink-0 transition-transform`}
              >
                <matchedVisual.Icon className={`w-5 h-5 ${matchedVisual.iconColor}`} />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                    {permissionName.trim() || autoName || (permissionKey.trim() ? permissionKey.trim() : 'Platform Feature')}
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${matchedVisual.pillBgColor} ${matchedVisual.badgeTextColor}`}
                  >
                    {matchedVisual.category}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Visual icon &amp; styling categorized automatically
                </p>
              </div>
            </div>
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-1 rounded-md border border-emerald-200/60 dark:border-emerald-800/60 shrink-0">
              <Sparkles className="w-3 h-3" />
              Auto-Styled
            </span>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={onClose}
              disabled={isSubmitting}
              className="text-xs font-semibold px-4 py-2 rounded-xl"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={isSubmitting || !permissionKey.trim()}
              className="inline-flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white shadow-xs cursor-pointer disabled:opacity-50"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'Submitting...' : 'Submit Proposal'}</span>
            </Button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}

export default CreateProposalModal;
