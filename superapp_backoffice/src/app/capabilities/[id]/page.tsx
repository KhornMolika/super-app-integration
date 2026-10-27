'use client';

import React, { useEffect, useState, useMemo, use } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { BackButton } from '@/components/ui/BackButton';
import { Card } from '@/components/ui/card';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useAuth } from '@/lib/auth';
import { toast } from '@/components/ui/Toast';
import { Button, Input, Label, Textarea } from '@/components/ui/inputs';
import {
  permissionsApi,
  Permission,
  miniappsApi,
  MiniApp,
  unwrapData,
  unwrapItem,
} from '@/api';
import { getCapabilityVisual } from '@/lib/capability-visuals';
import {
  IntegrationMethodOption,
  INTEGRATION_METHOD_CONFIGS,
  getCapabilityMethodSyntax,
  generateCapabilityCodeSample,
} from '@/lib/capability-methods';
import { AppLogoAvatar } from '@/components/ui/AppLogoAvatar';
import { CreateProposalModal } from '@/components/capabilities/CreateProposalModal';
import {
  Copy,
  Check,
  Package,
  Shield,
  Smartphone,
  Code2,
  Layers,
  ArrowRight,
  ExternalLink,
  Edit3,
  GitPullRequest,
  CheckCircle2,
  AlertCircle,
  FileCode,
  Search,
  X,
} from 'lucide-react';
import { Pagination } from '@/components/ui/Pagination';

export default function CapabilityDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const id = resolvedParams.id;
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { can } = useAuth();
  const canManage = can('permission:manage');

  const activeTab = searchParams.get('tab') || 'specs';

  const [capability, setCapability] = useState<Permission | null>(null);
  const [associatedApps, setAssociatedApps] = useState<MiniApp[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [selectedMethod, setSelectedMethod] =
    useState<Exclude<IntegrationMethodOption, 'ALL'>>('WEBVIEW');

  // Associated MiniApps Tab State
  const [appsPage, setAppsPage] = useState(1);
  const [appsPageSize, setAppsPageSize] = useState(6);
  const [appsSearchQuery, setAppsSearchQuery] = useState('');

  // Edit State
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Permission>>({});
  const [metadataText, setMetadataText] = useState('{}');

  // Proposal Modal State
  const [isProposalModalOpen, setIsProposalModalOpen] = useState(false);

  const handleTabChange = (tab: string) => {
    const p = new URLSearchParams(searchParams.toString());
    if (tab === 'specs') {
      p.delete('tab');
    } else {
      p.set('tab', tab);
    }
    const q = p.toString();
    router.replace(`${pathname}${q ? `?${q}` : ''}`, { scroll: false });
  };

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(label);
    toast.success(`${label} copied to clipboard!`);
    setTimeout(() => setCopiedKey(null), 1500);
  };

  // Fetch Capability Details & Associated Mini-Apps
  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [capRes, appsRes] = await Promise.all([
          permissionsApi.getById(id),
          miniappsApi.getAll().catch(() => []),
        ]);

        const capData = unwrapItem<Permission>(capRes) || (capRes as any);
        setCapability(capData);
        setEditForm(capData);
        setMetadataText(JSON.stringify(capData.metadata || {}, null, 2));

        // Find associated mini apps by permission key
        const allApps = unwrapData<MiniApp>(appsRes);
        const capKey = (capData.key || '').toLowerCase();
        const matching = allApps.filter((app: any) => {
          const perms = (app.requiredPermissions || []).map((p: string) => p.toLowerCase());
          const caps = (app.capabilities || []).map((c: string) => c.toLowerCase());
          return perms.includes(capKey) || caps.includes(capKey);
        });
        setAssociatedApps(matching);
      } catch (err: any) {
        console.error('Failed to load capability details:', err);
        toast.error('Failed to load capability details.');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [id]);

  // Handle Save Edits
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManage || !capability) return;

    let parsedMetadata = null;
    if (metadataText.trim()) {
      try {
        parsedMetadata = JSON.parse(metadataText);
      } catch {
        toast.error('Invalid JSON structure in metadata field.');
        return;
      }
    }

    try {
      setSaving(true);
      const updated = await permissionsApi.update(capability.id, {
        name: editForm.name,
        description: editForm.description,
        category: editForm.category,
        isActive: editForm.isActive,
        isDeprecated: editForm.isDeprecated,
        minSuperAppVersion: editForm.minSuperAppVersion,
        maxSuperAppVersion: editForm.maxSuperAppVersion,
        metadata: parsedMetadata,
      });

      const unwrapped = unwrapItem<Permission>(updated) || (updated as any);
      setCapability(unwrapped);
      setEditForm(unwrapped);
      setIsEditing(false);
      toast.success('Capability configuration updated successfully!');
    } catch (err: any) {
      toast.error(err.message || 'Failed to update capability configuration.');
    } finally {
      setSaving(false);
    }
  };

  const visual = useMemo(() => {
    if (!capability) return null;
    return getCapabilityVisual(
      capability.key || id,
      capability.name,
      capability.description
    );
  }, [capability, id]);

  const jsBridgeMethod = useMemo(() => {
    if (!capability) return '';
    const meta = capability.metadata as any;
    if (meta?.jsBridgeMethod) return meta.jsBridgeMethod;
    const cleanKey = (capability.key || 'feature')
      .replace(/_([a-z])/g, (_, c) => c.toUpperCase());
    return `FSASuperApp.${cleanKey}()`;
  }, [capability]);

  const activeMethodSyntax = useMemo(() => {
    if (!capability) return null;
    return getCapabilityMethodSyntax(
      capability.key || id,
      selectedMethod,
      jsBridgeMethod,
      capability.metadata,
      capability.category
    );
  }, [capability, id, selectedMethod, jsBridgeMethod]);

  const activeCodeSample = useMemo(() => {
    if (!capability) {
      return {
        filename: 'client-sdk-example.ts',
        code: '',
        lang: 'typescript',
      };
    }
    return generateCapabilityCodeSample(
      capability.key || id,
      capability.name,
      selectedMethod,
      jsBridgeMethod,
      capability.metadata,
      capability.category
    );
  }, [capability, id, selectedMethod, jsBridgeMethod]);

  const filteredAssociatedApps = useMemo(() => {
    const q = appsSearchQuery.trim().toLowerCase();
    if (!q) return associatedApps;
    return associatedApps.filter(
      (app) =>
        app.name?.toLowerCase().includes(q) ||
        app.appId?.toLowerCase().includes(q) ||
        app.tagline?.toLowerCase().includes(q) ||
        app.description?.toLowerCase().includes(q)
    );
  }, [associatedApps, appsSearchQuery]);

  const totalAppsItems = filteredAssociatedApps.length;
  const totalAppsPages = Math.max(1, Math.ceil(totalAppsItems / appsPageSize));
  const safeAppsPage = Math.min(appsPage, totalAppsPages);

  const paginatedAssociatedApps = useMemo(() => {
    const start = (safeAppsPage - 1) * appsPageSize;
    return filteredAssociatedApps.slice(start, start + appsPageSize);
  }, [filteredAssociatedApps, safeAppsPage, appsPageSize]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
        <Smartphone className="w-8 h-8 text-brand-600 animate-pulse" />
        <span className="text-sm font-medium text-slate-500">Loading capability details...</span>
      </div>
    );
  }

  if (!capability || !visual) {
    return (
      <div className="max-w-md mx-auto py-16 text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 mx-auto">
          <AlertCircle className="w-8 h-8 text-rose-500" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Capability Not Found</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
          The requested platform capability definition &ldquo;{id}&rdquo; does not exist or has been removed from the registry.
        </p>
        <Button onClick={() => router.push('/capabilities')} className="mt-2 font-semibold text-xs">
          Back to Capabilities Registry
        </Button>
      </div>
    );
  }

  const Icon = visual.Icon;
  const meta = (capability.metadata || {}) as any;
  const providerPackage = meta.providerPackage || capability.key;
  const requiredPermissions = meta.requiredPermissions || [capability.key];
  const isActive = capability.isActive !== false;

  return (
    <ProtectedRoute permission="permission:read">
      <div className="w-full min-w-0 space-y-6 pb-16 animate-in fade-in slide-in-from-bottom-4 duration-500">
        {/* Navigation Breadcrumb Line */}
        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          <BackButton href="/capabilities" />
          <div className="flex items-center gap-1.5 min-w-0">
            <Link
              href="/capabilities"
              className="hover:text-brand-600 dark:hover:text-brand-400 font-medium transition-colors"
            >
              Capabilities
            </Link>
            <span className="text-slate-300 dark:text-slate-700">/</span>
            <span className="text-slate-700 dark:text-slate-300 font-semibold truncate max-w-xs">
              {capability.name}
            </span>
            <span className="text-slate-300 dark:text-slate-700">/</span>
            <span className="text-brand-600 dark:text-brand-400 font-bold capitalize">
              {activeTab === 'specs'
                ? 'Runtime & Bridge Specs'
                : activeTab === 'apps'
                ? 'Associated MiniApps'
                : 'Governance & Edit'}
            </span>
          </div>
        </div>

        {/* Clean, De-cluttered Hero Header Card */}
        <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-5 transition-all">
          {/* Left: Icon, Title & Clean Subtitle */}
          <div className="flex items-start sm:items-center gap-4 sm:gap-5 min-w-0">
            <div
              className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl ${visual.bgColor} ${visual.borderColor} border flex items-center justify-center shrink-0 shadow-sm`}
            >
              <Icon className={`w-7 h-7 sm:w-8 sm:h-8 ${visual.iconColor}`} />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                  {capability.name}
                </h1>

                {/* Key Chip */}
                <button
                  type="button"
                  onClick={() => handleCopy(capability.key || '', 'Capability Key')}
                  title="Click to copy unique key"
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-mono font-medium text-slate-500 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-400 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
                >
                  <span>#{capability.key}</span>
                  <Copy className="w-3 h-3 opacity-60" />
                </button>

                {/* Status Pill */}
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                    isActive
                      ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20'
                      : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-slate-400'}`}
                  />
                  <span>{isActive ? 'Active in Shell' : 'Deprecated'}</span>
                </span>

                {/* Category Pill */}
                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-semibold ${visual.pillBgColor} ${visual.badgeTextColor} border ${visual.borderColor}`}
                >
                  <span>{visual.category}</span>
                </span>
              </div>
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2.5 shrink-0 self-start lg:self-center flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                handleCopy(
                  activeMethodSyntax?.full || jsBridgeMethod,
                  'Capability Method Call'
                )
              }
              className="text-xs font-semibold gap-1.5 rounded-xl cursor-pointer shadow-xs"
            >
              {copiedKey === 'Capability Method Call' ? (
                <Check className="w-4 h-4 text-emerald-500" />
              ) : (
                <Copy className="w-4 h-4 text-slate-500" />
              )}
              <span>Copy SDK Call</span>
            </Button>

            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsProposalModalOpen(true)}
              className="text-xs font-semibold gap-1.5 rounded-xl cursor-pointer shadow-xs"
            >
              <GitPullRequest className="w-4 h-4" />
              <span>Propose Revision</span>
            </Button>

            {canManage && (
              <Button
                variant={activeTab === 'config' ? 'secondary' : 'outline'}
                size="sm"
                onClick={() => {
                  if (activeTab === 'config') {
                    setIsEditing(!isEditing);
                  } else {
                    setIsEditing(true);
                    handleTabChange('config');
                  }
                }}
                className="text-xs font-semibold gap-1.5 rounded-xl cursor-pointer shadow-xs"
              >
                <Edit3 className="w-4 h-4" />
                <span>{activeTab === 'config' && isEditing ? 'Editing Config' : 'Edit Config'}</span>
              </Button>
            )}
          </div>
        </div>

        {/* Mobile-Only Tab Switcher (Desktop tabs are navigated via Sidebar) */}
        <div className="lg:hidden border-b border-slate-200 dark:border-slate-800">
          <nav className="flex space-x-6 overflow-x-auto no-scrollbar" aria-label="Capability tabs">
            <button
              type="button"
              onClick={() => handleTabChange('specs')}
              className={`group inline-flex items-center gap-2 py-3 px-1 border-b-2 font-medium text-xs whitespace-nowrap cursor-pointer transition-all ${
                activeTab === 'specs'
                  ? 'border-brand-600 text-brand-600 dark:border-brand-400 dark:text-brand-400 font-bold'
                  : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'
              }`}
            >
              <Code2 className="w-4 h-4" />
              <span>Runtime & Bridge Specs</span>
            </button>

            <button
              type="button"
              onClick={() => handleTabChange('apps')}
              className={`group inline-flex items-center gap-2 py-3 px-1 border-b-2 font-medium text-xs whitespace-nowrap cursor-pointer transition-all ${
                activeTab === 'apps'
                  ? 'border-brand-600 text-brand-600 dark:border-brand-400 dark:text-brand-400 font-bold'
                  : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>Associated MiniApps</span>
              <span
                className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                  activeTab === 'apps'
                    ? 'bg-brand-50 text-brand-600 dark:bg-brand-500/20 dark:text-brand-300'
                    : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                }`}
              >
                {associatedApps.length}
              </span>
            </button>

            {canManage && (
              <button
                type="button"
                onClick={() => handleTabChange('config')}
                className={`group inline-flex items-center gap-2 py-3 px-1 border-b-2 font-medium text-xs whitespace-nowrap cursor-pointer transition-all ${
                  activeTab === 'config'
                    ? 'border-brand-600 text-brand-600 dark:border-brand-400 dark:text-brand-400 font-bold'
                    : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'
                }`}
              >
                <Shield className="w-4 h-4" />
                <span>Governance & Edit</span>
              </button>
            )}
          </nav>
        </div>

        {/* Tab 1: Runtime & Bridge Specifications */}
        {activeTab === 'specs' && (
          <div className="space-y-6">
            {/* Description & Overview */}
            <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <FileCode className="w-4 h-4 text-brand-500" />
                <span>Capability Purpose & Architectural Role</span>
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                {capability.description ||
                  'Enables sandboxed MiniApps to securely access hardware sensors, cryptographic hardware, or host shell services through the native bridge.'}
              </p>
            </div>

            {/* Interactive Bridge Code Sandbox */}
            <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
              {/* Method Selector Tabs Header */}
              <div className="p-3 sm:px-6 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                {/* Method Tabs */}
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                  {(
                    [
                      'WEBVIEW',
                      'FLUTTER_PACKAGE',
                      'NATIVE_SDK',
                      'DEEP_LINK',
                    ] as const
                  ).map((m) => {
                    const cfg = INTEGRATION_METHOD_CONFIGS[m];
                    const isSelected = selectedMethod === m;
                    return (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setSelectedMethod(m)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                          isSelected
                            ? `${cfg.badgeColor.bg} ${cfg.badgeColor.text} ${cfg.badgeColor.border} border shadow-xs`
                            : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                        }`}
                      >
                        {cfg.label}
                      </button>
                    );
                  })}
                </div>

                {/* Right: Filename & Copy Button */}
                <div className="flex items-center justify-between sm:justify-end gap-2.5">
                  <span className="text-xs font-mono font-semibold text-slate-600 dark:text-slate-400">
                    {activeCodeSample.filename}
                  </span>

                  <button
                    type="button"
                    onClick={() =>
                      handleCopy(
                        activeCodeSample.code,
                        `${INTEGRATION_METHOD_CONFIGS[selectedMethod].label} Snippet`
                      )
                    }
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer shrink-0"
                  >
                    {copiedKey?.includes('Snippet') ? (
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                    <span>Copy Snippet</span>
                  </button>
                </div>
              </div>

              <div className="p-4 sm:p-6 bg-slate-950 font-mono text-xs text-slate-200 overflow-x-auto leading-relaxed">
                <pre>{activeCodeSample.code}</pre>
              </div>
            </div>

            {/* Technical Specifications Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Card 1: Native Host Dependencies */}
              <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Package className="w-4 h-4 text-sky-500" />
                  <span>Native Host Dependencies</span>
                </h3>

                <div className="space-y-3 text-xs">
                  <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-slate-500 dark:text-slate-400">Provider Package</span>
                    <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                      {providerPackage}
                    </span>
                  </div>

                  <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-slate-500 dark:text-slate-400">Implementation Type</span>
                    <span className="font-medium text-slate-800 dark:text-slate-200">
                      {meta.implementationType || 'FLUTTER_PLUGIN'}
                    </span>
                  </div>

                  <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-slate-500 dark:text-slate-400">Host OS Permissions</span>
                    <div className="flex flex-wrap gap-1 justify-end max-w-xs">
                      {requiredPermissions.map((perm: string) => (
                        <span
                          key={perm}
                          className="font-mono text-[11px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 border border-blue-200/60 dark:border-blue-900/40"
                        >
                          {perm}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="flex justify-between py-2">
                    <span className="text-slate-500 dark:text-slate-400">Target Shell Platform</span>
                    <span className="font-medium text-slate-800 dark:text-slate-200">
                      {capability.platform || 'Cross-Platform (Android & iOS)'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Card 2: Security & Governance Compliance */}
              <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-emerald-500" />
                  <span>Security & Governance Status</span>
                </h3>

                <div className="space-y-3 text-xs">
                  <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-slate-500 dark:text-slate-400">Registry Status</span>
                    <span className="inline-flex items-center gap-1.5 font-semibold text-emerald-600 dark:text-emerald-400">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{capability.status || 'Active'}</span>
                    </span>
                  </div>

                  <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-slate-500 dark:text-slate-400">Deprecation Policy</span>
                    <span className="font-medium text-slate-700 dark:text-slate-300">
                      {capability.isDeprecated ? 'Deprecated in next major release' : 'Fully Supported'}
                    </span>
                  </div>

                  <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-slate-500 dark:text-slate-400">Introduced In</span>
                    <span className="font-mono text-slate-700 dark:text-slate-300">
                      v{capability.introducedInVersion || '1.0.0'}
                    </span>
                  </div>

                  <div className="flex justify-between py-2">
                    <span className="text-slate-500 dark:text-slate-400">Sandbox Isolation</span>
                    <span className="font-medium text-slate-700 dark:text-slate-300">
                      Strict WebMessageChannel + Token Verification
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Associated MiniApps */}
        {activeTab === 'apps' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <span>Applications Utilizing {capability.name}</span>
                  <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400 border border-brand-200 dark:border-brand-500/20">
                    {associatedApps.length}
                  </span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Registered mini-applications that declare or request this hardware/bridge capability.
                </p>
              </div>

              {associatedApps.length > 1 && (
                <div className="relative w-full sm:w-64">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={appsSearchQuery}
                    onChange={(e) => {
                      setAppsSearchQuery(e.target.value);
                      setAppsPage(1);
                    }}
                    placeholder="Filter applications..."
                    className="w-full pl-9 pr-8 py-1.5 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 text-slate-800 dark:text-slate-200 transition-all placeholder:text-slate-400"
                  />
                  {appsSearchQuery && (
                    <button
                      type="button"
                      onClick={() => {
                        setAppsSearchQuery('');
                        setAppsPage(1);
                      }}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              )}
            </div>

            {associatedApps.length === 0 ? (
              <div className="p-12 text-center rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-2">
                <Smartphone className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600" />
                <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  No MiniApps Requesting This Capability
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                  When developers declare #{capability.key} in their mini-app bundle configuration, they will be listed here.
                </p>
              </div>
            ) : paginatedAssociatedApps.length === 0 ? (
              <div className="p-8 text-center rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  No mini-apps match your filter &ldquo;{appsSearchQuery}&rdquo;.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setAppsSearchQuery('');
                    setAppsPage(1);
                  }}
                  className="text-xs font-semibold text-brand-600 dark:text-brand-400 hover:underline mt-2 cursor-pointer"
                >
                  Clear Search
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {paginatedAssociatedApps.map((app) => (
                  <div
                    key={app.id}
                    className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm hover:border-brand-500/40 transition-all flex flex-col justify-between group"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <AppLogoAvatar logo={app.logo} name={app.name} size="md" />
                        <div className="min-w-0">
                          <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100 truncate group-hover:text-brand-600 transition-colors">
                            {app.name}
                          </h4>
                          <span className="font-mono text-[11px] text-slate-400 block truncate">
                            {app.appId}
                          </span>
                        </div>
                      </div>

                      <p className="text-xs text-slate-500 line-clamp-2">
                        {app.tagline || app.shortDescription || 'No description provided.'}
                      </p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                      <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                        v{app.version || '1.0.0'}
                      </span>
                      <Link
                        href={`/miniapps/${app.id}`}
                        className="text-xs font-semibold text-brand-600 dark:text-brand-400 inline-flex items-center gap-1 group-hover:translate-x-0.5 transition-transform"
                      >
                        <span>View MiniApp</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Pagination Controls */}
            {totalAppsItems > 0 && (
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80">
                <Pagination
                  currentPage={safeAppsPage}
                  totalPages={totalAppsPages}
                  totalItems={totalAppsItems}
                  pageSize={appsPageSize}
                  onPageChange={(page) => setAppsPage(page)}
                  onPageSizeChange={(size) => {
                    setAppsPageSize(size);
                    setAppsPage(1);
                  }}
                  showPageSizeSelector={true}
                  pageSizeOptions={[2, 4, 6, 12]}
                  showTotal={true}
                />
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Governance & Edit Configuration */}
        {activeTab === 'config' && canManage && (
          <Card className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
            <form onSubmit={handleSave} className="space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                    Capability Registry Configuration
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Update metadata, category mapping, and deprecation timers in database registry.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                      editForm.isActive
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-slate-100 text-slate-700 border-slate-200'
                    }`}
                  >
                    {editForm.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label>Capability Unique Key</Label>
                  <Input value={capability.key || ''} disabled className="bg-slate-50 dark:bg-slate-800/50 font-mono text-xs" />
                  <p className="text-[11px] text-slate-400 mt-1">Unique platform bridge identifier (immutable).</p>
                </div>

                <div>
                  <Label>Display Name</Label>
                  <Input
                    value={editForm.name || ''}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className="text-xs"
                    required
                  />
                </div>

                <div className="md:col-span-2">
                  <Label>Human-Readable Description</Label>
                  <Textarea
                    value={editForm.description || ''}
                    onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                    rows={2}
                    className="text-xs"
                  />
                </div>

                <div>
                  <Label>Category</Label>
                  <Input
                    value={editForm.category || ''}
                    onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                    className="text-xs font-medium"
                    placeholder="e.g. Camera & Imaging"
                  />
                </div>

                <div>
                  <Label>Minimum Host SuperApp Version</Label>
                  <Input
                    value={editForm.minSuperAppVersion || ''}
                    onChange={(e) => setEditForm({ ...editForm, minSuperAppVersion: e.target.value })}
                    className="text-xs font-mono"
                    placeholder="1.0.0"
                  />
                </div>

                <div className="flex items-center gap-6 md:col-span-2 pt-2">
                  <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editForm.isActive !== false}
                      onChange={(e) => setEditForm({ ...editForm, isActive: e.target.checked })}
                      className="rounded border-slate-300 text-brand-600 focus:ring-brand-500 w-4 h-4 cursor-pointer"
                    />
                    <span>Active in SuperApp Host Shell</span>
                  </label>

                  <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={Boolean(editForm.isDeprecated)}
                      onChange={(e) => setEditForm({ ...editForm, isDeprecated: e.target.checked })}
                      className="rounded border-slate-300 text-brand-600 focus:ring-brand-500 w-4 h-4 cursor-pointer"
                    />
                    <span>Mark as Deprecated</span>
                  </label>
                </div>

                <div className="md:col-span-2">
                  <Label>Technical Metadata (JSON Payload)</Label>
                  <Textarea
                    value={metadataText}
                    onChange={(e) => setMetadataText(e.target.value)}
                    rows={8}
                    className="font-mono text-xs leading-relaxed"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    Advanced configuration including Flutter plugin, iOS usage strings, and Android permissions.
                  </p>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setEditForm(capability);
                    setMetadataText(JSON.stringify(capability.metadata || {}, null, 2));
                    setIsEditing(false);
                  }}
                  className="text-xs"
                >
                  Reset Form
                </Button>
                <Button
                  type="submit"
                  disabled={saving}
                  className="text-xs font-semibold bg-brand-600 hover:bg-brand-700 text-white"
                >
                  {saving ? 'Saving Changes...' : 'Save Configuration'}
                </Button>
              </div>
            </form>
          </Card>
        )}

        {/* Propose Capability Modal */}
        <CreateProposalModal
          isOpen={isProposalModalOpen}
          onClose={() => setIsProposalModalOpen(false)}
          onCreated={async () => {
            toast.success('Proposal submitted successfully!');
            router.push('/capabilities?tab=proposals');
          }}
        />
      </div>
    </ProtectedRoute>
  );
}
