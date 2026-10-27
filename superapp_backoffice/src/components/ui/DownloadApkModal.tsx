'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '@/lib/auth';
import { toast } from '@/components/ui/Toast';
import { QrCodeSvg } from '@/components/ui/QrCodeSvg';
import {
  Smartphone,
  Download,
  QrCode,
  Copy,
  Check,
  CheckCircle2,
  AlertTriangle,
  Globe,
  Wifi,
  ShieldCheck,
  X,
  Zap,
  ChevronDown,
  Layers,
  Sparkles,
  ExternalLink,
} from 'lucide-react';

export interface DownloadApkModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultVersion?: string;
}

interface NetworkInfoData {
  primaryIp: string;
  port: string;
  backendPort: string;
  interfaces: Array<{ name: string; address: string; family: string; isPrimary: boolean }>;
  apk: {
    exists: boolean;
    version?: string;
    buildMode?: 'release' | 'debug';
    size: string;
    filename: string;
    lastModified: string | null;
    downloadPath: string;
    staticPath: string;
    directUrl: string;
    apiDownloadUrl: string;
    availableVersions?: Array<{
      version: string;
      size: string;
      buildMode: 'release' | 'debug';
      lastModified: string;
      downloadUrl: string;
    }>;
  };
  availableVersions?: Array<{
    version: string;
    size: string;
    buildMode: 'release' | 'debug';
    lastModified: string;
    downloadUrl: string;
  }>;
  backend: {
    port: string;
    baseUrl: string;
    mobileAuthUrl: string;
  };
  clientRequestHost: string;
}

export default function DownloadApkModal({
  isOpen,
  onClose,
  defaultVersion = 'v0.0.1',
}: DownloadApkModalProps) {
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [networkData, setNetworkData] = useState<NetworkInfoData | null>(null);
  const [selectedIp, setSelectedIp] = useState<string>('127.0.0.1');
  const [selectedVersion, setSelectedVersion] = useState<string>(defaultVersion);
  const [copiedLink, setCopiedLink] = useState(false);
  const [backendHealthy, setBackendHealthy] = useState<boolean | null>(null);
  const [checkingBackend, setCheckingBackend] = useState(false);

  const [targetEnv, setTargetEnv] = useState<'cloud' | 'lan'>('cloud');

  // Check if running in production cloud environment
  const isProduction =
    process.env.NEXT_PUBLIC_ENVIRONMENT === 'PROD' ||
    (typeof window !== 'undefined' &&
      (window.location.hostname.includes('fintechcenterfsa.com') ||
        (!['localhost', '127.0.0.1'].includes(window.location.hostname) &&
          !window.location.hostname.startsWith('192.168.') &&
          !window.location.hostname.startsWith('10.') &&
          !window.location.hostname.startsWith('172.'))));

  useEffect(() => {
    setMounted(true);
    if (typeof window !== 'undefined') {
      setTargetEnv(isProduction ? 'cloud' : 'lan');
    }
  }, [isProduction]);

  // Fetch auto-detected IP and APK metadata
  const fetchNetworkInfo = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/system/network-info', { cache: 'no-store' });
      if (res.ok) {
        const data: NetworkInfoData = await res.json();
        setNetworkData(data);

        // Auto-select IP: if window.location has non-localhost IP, prioritize it, otherwise use server's primary IP
        if (
          typeof window !== 'undefined' &&
          window.location.hostname &&
          window.location.hostname !== 'localhost' &&
          window.location.hostname !== '127.0.0.1'
        ) {
          setSelectedIp(window.location.hostname);
        } else {
          setSelectedIp(data.primaryIp || '127.0.0.1');
        }

        // Set latest version from live Nexus data if no explicit defaultVersion passed
        if (data.apk?.version && (!defaultVersion || defaultVersion === 'v0.0.1')) {
          setSelectedVersion(data.apk.version);
        } else if (defaultVersion) {
          setSelectedVersion(defaultVersion);
        }
      }
    } catch (err) {
      console.error('Failed to fetch network info:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchNetworkInfo();
    }
  }, [isOpen]);

  // Check Backend health on the selected environment
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    setCheckingBackend(true);

    const port = networkData?.backendPort || '3000';
    const checkUrl =
      targetEnv === 'cloud'
        ? '/api/health'
        : `http://${selectedIp}:${port}/health`;

    const testConnection = async () => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2500);

        const res = await fetch(checkUrl, {
          method: 'GET',
          signal: controller.signal,
        }).catch(async () => {
          return await fetch('/api/health', { signal: controller.signal });
        });
        clearTimeout(timeoutId);

        if (isMounted) {
          setBackendHealthy(Boolean(res && res.status < 500));
          setCheckingBackend(false);
        }
      } catch (_) {
        if (isMounted) {
          setBackendHealthy(true);
          setCheckingBackend(false);
        }
      }
    };

    testConnection();

    return () => {
      isMounted = false;
    };
  }, [isOpen, selectedIp, targetEnv, networkData?.backendPort]);

  const { role, user } = useAuth();
  const isAdmin = role === 'SUPER_ADMIN' || role === 'ADMIN';

  // Keyboard shortcut: Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!mounted || !isOpen) return null;

  const backofficePort =
    networkData?.port ||
    (typeof window !== 'undefined' ? window.location.port || '3002' : '3002');
  const allVersions =
    networkData?.availableVersions || networkData?.apk?.availableVersions || [];
  const activeVerObj =
    allVersions.find((v) => v.version === selectedVersion) ||
    (networkData?.apk?.version === selectedVersion ? networkData?.apk : null) ||
    allVersions[0] ||
    networkData?.apk;

  const activeVersion = selectedVersion || activeVerObj?.version || defaultVersion;
  const isRelease =
    activeVerObj?.buildMode === 'release' || networkData?.apk?.buildMode === 'release';
  const activeSize = activeVerObj?.size || networkData?.apk?.size || '19.50 MB';
  const normVer = activeVersion.startsWith('v') ? activeVersion : `v${activeVersion}`;
  const activeFilename = `superapp-test-${normVer}.apk`;

  const isCloud = isProduction || targetEnv === 'cloud';
  const effectiveDownloadUrl = isCloud
    ? `https://app.fintechcenterfsa.com/api/download-apk?version=${encodeURIComponent(
        normVer,
      )}&type=test&appName=superapp`
    : `http://${selectedIp}:${backofficePort}/api/download-apk?version=${encodeURIComponent(
        normVer,
      )}&type=test&appName=superapp`;

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedLink(true);
    toast.success('Direct APK download link copied to clipboard!');
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = effectiveDownloadUrl;
    link.download = activeFilename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.info(`Starting download for ${activeFilename} (${activeSize})...`);
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] w-screen h-screen min-h-screen flex items-center justify-center p-4 sm:p-6 bg-slate-950/80 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200 text-left">
      <div className="relative w-full max-w-2xl my-auto rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[92vh] transition-all text-left">
        {/* Modal Header */}
        <div className="px-5 sm:px-6 py-4 bg-slate-50/80 dark:bg-slate-900/90 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-brand-500/10 border border-brand-500/20 text-brand-600 dark:text-brand-400 flex items-center justify-center shrink-0 shadow-xs">
              <Smartphone className="w-5 h-5" />
            </div>

            <div className="min-w-0 space-y-0.5">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">
                  SuperApp Mobile APK
                </h3>

                {/* Version badge with live dot */}
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <span>{activeVersion}</span>
                </span>

                {/* Build Mode badge */}
                <span
                  className={`px-2 py-0.5 rounded-md text-[10px] font-semibold border ${
                    isRelease
                      ? 'bg-brand-50 text-brand-700 dark:bg-brand-950/50 dark:text-brand-300 border-brand-200 dark:border-brand-800'
                      : 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                  }`}
                >
                  {activeSize} • {isRelease ? 'Release ARM64 AOT' : 'Debug Test Build'}
                </span>
              </div>

              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                Install and test the native SuperApp host shell on physical Android devices.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
            title="Close (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 space-y-4 overflow-y-auto no-scrollbar">
          {/* Environment & Network Target Bar (Admin / Dev Mode) */}
          {isAdmin && !isProduction && (
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 space-y-2.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                {/* Segmented Environment Tabs */}
                <div className="flex items-center p-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shrink-0">
                  <button
                    type="button"
                    onClick={() => setTargetEnv('lan')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      !isCloud
                        ? 'bg-white dark:bg-slate-900 text-brand-600 dark:text-brand-400 shadow-xs'
                        : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                    }`}
                  >
                    <Wifi className="w-3.5 h-3.5 text-sky-500" />
                    <span>Office Local LAN</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTargetEnv('cloud')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      isCloud
                        ? 'bg-white dark:bg-slate-900 text-brand-600 dark:text-brand-400 shadow-xs'
                        : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                    }`}
                  >
                    <Globe className="w-3.5 h-3.5 text-accent-500" />
                    <span>Cloud Production</span>
                  </button>
                </div>

                {/* Host LAN IP Selector (Only visible if Local LAN is active) */}
                {!isCloud && (
                  <div className="flex items-center gap-2 min-w-0 flex-1 justify-end">
                    <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 whitespace-nowrap">
                      Host IP:
                    </span>
                    <div className="relative min-w-[200px]">
                      <select
                        value={selectedIp}
                        onChange={(e) => setSelectedIp(e.target.value)}
                        className="w-full h-8 text-xs font-mono font-bold pl-2.5 pr-7 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 outline-none focus:ring-1 focus:ring-brand-500 cursor-pointer appearance-none"
                      >
                        {Array.from(
                          new Map(
                            (networkData?.interfaces || []).map((iface) => [iface.address, iface]),
                          ).values(),
                        ).map((iface, idx) => (
                          <option key={idx} value={iface.address}>
                            {iface.address} ({iface.name}) {iface.isPrimary ? '★' : ''}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>

                    {/* Backend Health Dot */}
                    {backendHealthy !== null && (
                      <span
                        className={`w-2 h-2 rounded-full shrink-0 ${
                          backendHealthy ? 'bg-emerald-500' : 'bg-amber-500'
                        }`}
                        title={backendHealthy ? 'Backend reachable' : 'Checking connection...'}
                      />
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Hero Section: QR Code & Direct Download Card */}
          <div className="flex flex-col sm:flex-row items-center gap-5 sm:gap-6 p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 shadow-xs">
            {/* QR Code Container */}
            <div className="relative p-3 bg-white rounded-2xl shadow-md border border-slate-200/80 dark:border-slate-700 shrink-0 flex items-center justify-center">
              <QrCodeSvg
                value={effectiveDownloadUrl}
                size={144}
                fgColor="#0f172a"
                bgColor="#ffffff"
                className="w-36 h-36"
              />
              <div className="absolute -bottom-2 -right-2 p-1.5 rounded-xl bg-brand-600 text-white shadow-md">
                <QrCode className="w-4 h-4" />
              </div>
            </div>

            {/* Scan Instructions & Primary Download Action */}
            <div className="space-y-3 min-w-0 flex-1 text-center sm:text-left">
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center justify-center sm:justify-start gap-1.5">
                  <QrCode className="w-4 h-4 text-brand-500" />
                  <span>Scan with Android Camera</span>
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                  Scan this QR code with any Android camera or browser to download and install{' '}
                  <strong className="text-slate-800 dark:text-slate-200 font-mono text-[11px]">
                    {activeFilename}
                  </strong>{' '}
                  directly onto your device.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-2.5 justify-center sm:justify-start pt-0.5">
                <button
                  type="button"
                  onClick={handleDownload}
                  className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs hover:shadow transition-all cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Download APK ({activeSize})</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleCopy(effectiveDownloadUrl)}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-semibold rounded-xl border transition-all cursor-pointer shadow-xs ${
                    copiedLink
                      ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
                      : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                  }`}
                >
                  {copiedLink ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                      <span className="font-bold text-emerald-600 dark:text-emerald-400">Copied Link!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-slate-400" />
                      <span>Copy Download Link</span>
                    </>
                  )}
                </button>
              </div>

              {/* Direct Link Chip */}
              <div className="pt-0.5">
                <button
                  type="button"
                  onClick={() => handleCopy(effectiveDownloadUrl)}
                  className="w-full text-left font-mono text-[10px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 truncate block transition-colors cursor-pointer"
                  title="Click to copy full download URL"
                >
                  URL: {effectiveDownloadUrl}
                </button>
              </div>
            </div>
          </div>

          {/* Clean 3-Step Testing Instructions */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 space-y-2.5">
            <h5 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              <span>Mobile Testing Instructions</span>
            </h5>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
              <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-slate-100">
                  <span className="w-5 h-5 rounded-full bg-brand-500/10 text-brand-600 dark:text-brand-400 text-[10px] flex items-center justify-center font-bold">
                    1
                  </span>
                  <span>Install APK</span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  Open the downloaded file and allow &ldquo;Install unknown apps&rdquo; if prompted.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-slate-100">
                  <span className="w-5 h-5 rounded-full bg-brand-500/10 text-brand-600 dark:text-brand-400 text-[10px] flex items-center justify-center font-bold">
                    2
                  </span>
                  <span>Sign In</span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed truncate">
                  Log in with your portal credentials ({user?.email || 'admin@fsa.gov'}).
                </p>
              </div>

              <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-slate-100">
                  <span className="w-5 h-5 rounded-full bg-brand-500/10 text-brand-600 dark:text-brand-400 text-[10px] flex items-center justify-center font-bold">
                    3
                  </span>
                  <span>Launch MiniApps</span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  Open your registered MiniApp from the host shell grid to test capabilities.
                </p>
              </div>
            </div>
          </div>

          {/* Admin Diagnostics: Release Specs & Version Switcher */}
          {isAdmin && (
            <div className="space-y-2">
              {/* Version Selector (if multiple builds detected) */}
              {allVersions.length > 1 && (
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800">
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-brand-500" />
                      <span>Target APK Release Version</span>
                    </span>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Select published SuperApp build version from artifact repository.
                    </p>
                  </div>
                  <div className="relative">
                    <select
                      value={activeVersion}
                      onChange={(e) => setSelectedVersion(e.target.value)}
                      className="text-xs font-mono font-semibold pl-2.5 pr-7 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 cursor-pointer outline-none focus:ring-1 focus:ring-brand-500 appearance-none"
                    >
                      {allVersions.map((v) => (
                        <option key={v.version} value={v.version}>
                          {v.version} — {v.size} ({v.buildMode === 'release' ? 'Release' : 'Debug'})
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>
              )}

              {/* Build Mode Specs Banner */}
              {isRelease ? (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <div className="space-y-0.5 text-slate-800 dark:text-slate-200">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-emerald-800 dark:text-emerald-300">
                        Size-Optimized Release Build ({activeSize})
                      </span>
                      <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                        ARM64 AOT
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                      Compiled with Flutter ahead-of-time (AOT) machine code, symbol stripping, and bytecode tree-shaking for minimal network footprint.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                  <div className="space-y-0.5 text-slate-800 dark:text-slate-200">
                    <span className="font-bold text-amber-800 dark:text-amber-300">
                      Debug Test Build Active ({activeSize})
                    </span>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                      Debug APK includes debugging symbols and hot-reload hooks for local developer testing.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 sm:px-6 py-3 bg-slate-50/80 dark:bg-slate-900/90 border-t border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
            <Zap className="w-3.5 h-3.5 text-amber-500" />
            <span>Fast Native Streaming (HTTP 206 byte-range supported)</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
