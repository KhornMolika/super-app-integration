'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '@/lib/auth';
import { toast } from '@/components/ui/Toast';
import { Select } from '@/components/ui/inputs';
import { QrCodeSvg } from '@/components/ui/QrCodeSvg';
import {
  DevicePhoneIcon,
  DownloadIcon,
  QrCodeIcon,
  CopyIcon,
  CheckIcon,
  CheckCircleIcon,
  AlertTriangleIcon,
  GlobeIcon,
  ShieldCheckIcon,
  XIcon,
  ZapIcon,
} from '@/components/ui/Icons';

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
  const [copiedCreds, setCopiedCreds] = useState<string | null>(null);
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
        if (typeof window !== 'undefined' && window.location.hostname && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
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
    const checkUrl = targetEnv === 'cloud'
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

  const backofficePort = networkData?.port || (typeof window !== 'undefined' ? window.location.port || '3002' : '3002');
  const allVersions = networkData?.availableVersions || networkData?.apk?.availableVersions || [];
  const activeVerObj = allVersions.find((v) => v.version === selectedVersion) || (networkData?.apk?.version === selectedVersion ? networkData?.apk : null) || allVersions[0] || networkData?.apk;
  const activeVersion = selectedVersion || activeVerObj?.version || defaultVersion;
  const isRelease = activeVerObj?.buildMode === 'release' || networkData?.apk?.buildMode === 'release';
  const activeSize = activeVerObj?.size || networkData?.apk?.size || '19.44 MB';
  const normVer = activeVersion.startsWith('v') ? activeVersion : `v${activeVersion}`;
  // Standardized Test APK filename across all channels: modal, direct links, and Telegram
  const activeFilename = `superapp-test-${normVer}.apk`;

  const isCloud = isProduction || targetEnv === 'cloud';
  const effectiveDownloadUrl = isCloud
    ? `https://app.fintechcenterfsa.com/api/download-apk?version=${encodeURIComponent(normVer)}&type=test&appName=superapp`
    : `http://${selectedIp}:${backofficePort}/api/download-apk?version=${encodeURIComponent(normVer)}&type=test&appName=superapp`;

  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(
    effectiveDownloadUrl,
  )}&color=0f172a&bgcolor=f8fafc&margin=2`;

  const handleCopy = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    if (type === 'link') {
      setCopiedLink(true);
      toast.success('Direct APK download link copied to clipboard!', 'Link Copied');
      setTimeout(() => setCopiedLink(false), 2000);
    } else {
      setCopiedCreds(type);
      toast.success(`Copied ${type} to clipboard!`, 'Copied');
      setTimeout(() => setCopiedCreds(null), 2000);
    }
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = effectiveDownloadUrl;
    link.download = activeFilename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.info(`Starting download for ${activeFilename} (${activeSize})...`, 'Download Initiated');
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 bg-slate-950/80 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 text-white border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent-500/20 border border-accent-500/30 flex items-center justify-center text-accent-400 shadow-sm">
              <DevicePhoneIcon className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white tracking-tight">
                  SuperApp Mobile APK Download
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  {activeVersion}
                </span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border hidden sm:inline ${
                  isRelease
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                    : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                }`}>
                  {activeSize} ({isRelease ? 'Release ARM64' : 'Debug ARM64'})
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Install and test the unified SuperApp container on physical Android devices.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800/80 rounded-lg transition-colors cursor-pointer"
            title="Close (Esc)"
          >
            <XIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content Body */}
        <div className="p-6 space-y-5 overflow-y-auto">
          {/* Local Development Only: Environment Diagnostics & LAN IP Selection */}
          {isAdmin && !isProduction && (
            <>
              {/* Target Environment Switcher Tabs */}
              <div className="flex p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl gap-1 border border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setTargetEnv('lan')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    !isCloud
                      ? 'bg-white dark:bg-slate-700 text-brand-600 dark:text-brand-300 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  <DevicePhoneIcon className="w-3.5 h-3.5 text-sky-500" />
                  <span>Office Local LAN</span>
                  <span className="px-1.5 py-0.2 rounded text-[9px] bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300 font-bold border border-sky-300 dark:border-sky-800">
                    Wi-Fi / Hotspot
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setTargetEnv('cloud')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    isCloud
                      ? 'bg-white dark:bg-slate-700 text-brand-600 dark:text-brand-300 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  <GlobeIcon className="w-3.5 h-3.5 text-accent-500" />
                  <span>Cloud Production</span>
                  <span className="px-1.5 py-0.2 rounded text-[9px] bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold border border-emerald-300 dark:border-emerald-800">
                    Live Cloud
                  </span>
                </button>
              </div>

              {/* Environment Target Card (Local Dev Only) */}
              {!isCloud && (
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20">
                        <GlobeIcon className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                          <span>Host LAN IP Selection</span>
                        </h4>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          Select the active network IP where backend and backoffice are reachable.
                        </p>
                      </div>
                    </div>

                    {/* IP Selector Dropdown with deduplication */}
                    <div className="flex items-center gap-2 min-w-[200px]">
                      <Select
                        value={selectedIp}
                        onChange={(e) => setSelectedIp(e.target.value)}
                        className="!py-1.5 !px-3 text-xs font-mono font-bold"
                      >
                        {Array.from(
                          new Map(
                            (networkData?.interfaces || []).map((iface) => [iface.address, iface])
                          ).values()
                        ).map((iface, idx) => (
                          <option key={idx} value={iface.address}>
                            {iface.address} ({iface.name}) {iface.isPrimary ? '★' : ''}
                          </option>
                        ))}
                      </Select>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {/* QR Code & Direct Scan Card */}
          <div className="flex flex-col sm:flex-row items-center gap-6 p-5 rounded-2xl bg-gradient-to-br from-accent-50/30 via-slate-50 to-white dark:from-accent-950/20 dark:via-slate-800/40 dark:to-slate-900 border border-accent-200/60 dark:border-accent-800/40 shadow-xs">
            {/* QR Code */}
            <div className="relative p-3 bg-white rounded-2xl shadow-md border border-slate-200 dark:border-slate-700 flex-shrink-0 flex items-center justify-center">
              <QrCodeSvg
                value={effectiveDownloadUrl}
                size={160}
                fgColor="#0f172a"
                bgColor="#ffffff"
                className="w-40 h-40"
              />
              <div className="absolute -bottom-2 -right-2 p-1.5 rounded-full bg-accent-500 text-slate-950 font-bold shadow-md">
                <QrCodeIcon className="w-4 h-4" />
              </div>
            </div>

            {/* Scan Instructions & Actions */}
            <div className="space-y-3 flex-1 text-center sm:text-left">
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center justify-center sm:justify-start gap-1.5">
                  <DevicePhoneIcon className="w-4 h-4 text-accent-500" />
                  <span>Scan with Android Camera</span>
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Point your Android camera or barcode scanner at this QR code to download and install <strong className="text-slate-700 dark:text-slate-200">{activeFilename}</strong> directly on your mobile device.
                </p>
              </div>

              <div className="flex flex-wrap gap-2 justify-center sm:justify-start pt-1">
                <button
                  type="button"
                  onClick={handleDownload}
                  className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm hover:shadow transition-all cursor-pointer"
                >
                  <DownloadIcon className="w-4 h-4" />
                  <span>Download APK Binary</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleCopy(effectiveDownloadUrl, 'link')}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-semibold rounded-xl border transition-all cursor-pointer shadow-2xs ${
                    copiedLink
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                      : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 hover:text-slate-950 dark:text-slate-100 dark:hover:text-white border-slate-300 dark:border-slate-600'
                  }`}
                >
                  {copiedLink ? (
                    <>
                      <CheckIcon className="w-3.5 h-3.5 text-white" />
                      <span className="font-bold text-white">Copied URL!</span>
                    </>
                  ) : (
                    <>
                      <CopyIcon className="w-3.5 h-3.5 text-slate-600 dark:text-slate-300" />
                      <span className="font-semibold text-slate-800 dark:text-slate-100">Copy Link</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Quick Installation & Testing Guide (User-Friendly & Safe) */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-750 space-y-2.5">
            <h5 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <ShieldCheckIcon className="w-4 h-4 text-emerald-500" />
              <span>Mobile Testing Instructions</span>
            </h5>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
              <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1">
                <span className="font-bold text-brand-600 dark:text-brand-400">1. Install APK</span>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-normal">
                  Open the downloaded file and allow &quot;Install from unknown sources&quot; if prompted.
                </p>
              </div>
              <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1">
                <span className="font-bold text-brand-600 dark:text-brand-400">2. Sign In</span>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-normal">
                  Sign in with your registered portal account ({user?.email || 'your account'}).
                </p>
              </div>
              <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1">
                <span className="font-bold text-brand-600 dark:text-brand-400">3. Test MiniApp</span>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-normal">
                  Open your registered MiniApp from the SuperApp grid to test features in real-time.
                </p>
              </div>
            </div>
          </div>

          {/* Admin Technical Diagnostics & Version Switcher */}
          {isAdmin && (
            <>
              {/* Version Selector (if multiple builds detected in Nexus) */}
              {allVersions.length > 1 && (
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60">
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      Target APK Release Version
                    </span>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Select published SuperApp build version from repository.
                    </p>
                  </div>
                  <select
                    value={activeVersion}
                    onChange={(e) => setSelectedVersion(e.target.value)}
                    className="text-xs font-mono font-semibold px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                  >
                    {allVersions.map((v) => (
                      <option key={v.version} value={v.version}>
                        {v.version} — {v.size} ({v.buildMode === 'release' ? 'Release' : 'Debug'})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Build Mode Diagnostic Note */}
              {isRelease ? (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 dark:text-emerald-200 text-xs flex items-start gap-2.5 shadow-2xs">
                  <CheckCircleIcon className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-emerald-950 dark:text-emerald-100">
                        Size-Optimized Release Build ({activeSize})
                      </span>
                      <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                        ARM64 AOT
                      </span>
                    </div>
                    <p className="text-[11px] text-emerald-700 dark:text-emerald-300 leading-relaxed">
                      Compiled with Flutter ahead-of-time (AOT) machine code, symbol stripping, and bytecode tree-shaking for minimal network transfer.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-200 text-xs flex items-start gap-2.5">
                  <AlertTriangleIcon className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <span className="font-bold">Debug Test Build Active ({activeSize}):</span>
                    <p className="text-[11px] text-amber-700 dark:text-amber-300 leading-relaxed">
                      Debug APK includes debugging symbols and hot-reload hooks for local development.
                    </p>
                  </div>
                </div>
              )}

              {/* Direct Download URL Input (Admin Only) */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                  <span>Direct APK Download URL:</span>
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={effectiveDownloadUrl}
                    className="w-full text-xs font-mono px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-950 text-slate-700 dark:text-slate-300 select-all focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => handleCopy(effectiveDownloadUrl, 'link')}
                    className="flex-shrink-0 inline-flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 transition-all cursor-pointer"
                  >
                    <CopyIcon className="w-3.5 h-3.5" />
                    <span>Copy</span>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
            <ZapIcon className="w-3.5 h-3.5 text-amber-500" />
            <span>Fast Native Streaming (Byte-range supported)</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
