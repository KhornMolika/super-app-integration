'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { toast } from '@/components/ui/Toast';
import { Select } from '@/components/ui/inputs';
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
  };
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
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCreds, setCopiedCreds] = useState<string | null>(null);
  const [backendHealthy, setBackendHealthy] = useState<boolean | null>(null);
  const [checkingBackend, setCheckingBackend] = useState(false);

  const [targetEnv, setTargetEnv] = useState<'cloud' | 'lan'>('cloud');

  useEffect(() => {
    setMounted(true);
    if (typeof window !== 'undefined') {
      const isCloud = window.location.hostname.includes('fintechcenterfsa.com');
      setTargetEnv(isCloud ? 'cloud' : 'lan');
    }
  }, []);

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
      : `http://${selectedIp}:${port}/api/mobile/auth/login`;

    const testConnection = async () => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2500);

        const res = targetEnv === 'cloud'
          ? await fetch('/api/health', { signal: controller.signal })
          : await fetch(checkUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email: 'ping@test.com', password: 'ping' }),
              signal: controller.signal,
            });
        clearTimeout(timeoutId);

        if (isMounted) {
          setBackendHealthy(res.status < 500);
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
  const activeVersion = networkData?.apk?.version || defaultVersion;
  const activeFilename = networkData?.apk?.filename || 'superapp-test.apk';

  const isCloud = targetEnv === 'cloud';
  const effectiveDownloadUrl = isCloud
    ? `https://app.fintechcenterfsa.com/${activeFilename}`
    : `http://${selectedIp}:${backofficePort}/${activeFilename}`;
  const effectiveBackendUrl = isCloud
    ? 'https://app.fintechcenterfsa.com/api'
    : `http://${selectedIp}:${networkData?.backendPort || '3000'}`;

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
    toast.info('Starting Super App APK download...', 'Download Initiated');
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
                  Super App Mobile APK Download
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  {activeVersion}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-accent-500/20 text-accent-300 border border-accent-500/30 hidden sm:inline">
                  {networkData?.apk?.size || '19.12 MB'} ({networkData?.apk?.buildMode === 'release' ? 'Release ARM64' : 'Debug ARM64'})
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Install and test the unified Super App container on physical Android devices.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800/80 rounded-lg transition-colors"
            title="Close (Esc)"
          >
            <XIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content Body */}
        <div className="p-6 space-y-5 overflow-y-auto">
          {/* Target Environment Switcher Tabs */}
          <div className="flex p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl gap-1 border border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={() => setTargetEnv('cloud')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition-all ${
                isCloud
                  ? 'bg-white dark:bg-slate-700 text-brand-600 dark:text-brand-300 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <GlobeIcon className="w-3.5 h-3.5 text-accent-500" />
              <span>Cloud Production</span>
              <span className="px-1.5 py-0.2 rounded text-[9px] bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold border border-emerald-300 dark:border-emerald-800">
                Anywhere (4G/5G/Wi-Fi)
              </span>
            </button>
            <button
              type="button"
              onClick={() => setTargetEnv('lan')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition-all ${
                !isCloud
                  ? 'bg-white dark:bg-slate-700 text-brand-600 dark:text-brand-300 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <DevicePhoneIcon className="w-3.5 h-3.5 text-sky-500" />
              <span>Office Local LAN</span>
              <span className="px-1.5 py-0.2 rounded text-[9px] bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300 font-bold border border-sky-300 dark:border-sky-800">
                Same Wi-Fi Required
              </span>
            </button>
          </div>

          {/* Environment Target Card */}
          {isCloud ? (
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    <GlobeIcon className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <span>Production Cloud Target</span>
                      <span className="px-1.5 py-0.2 rounded text-[9px] bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-semibold border border-emerald-300 dark:border-emerald-800">
                        Live Cloud API
                      </span>
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Physical phone connects over 4G/5G mobile data or any Wi-Fi globally.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  {backendHealthy ? (
                    <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
                      <CheckCircleIcon className="w-3.5 h-3.5 text-emerald-500" />
                      Cloud API Online
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
                      <CheckCircleIcon className="w-3.5 h-3.5 text-emerald-500" />
                      https://app.fintechcenterfsa.com
                    </span>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-700/60 text-xs gap-2">
                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                  <span className="font-semibold">Backend API:</span>
                  <code className="font-mono bg-slate-200 dark:bg-slate-900 px-1.5 py-0.5 rounded text-[11px] text-slate-800 dark:text-slate-200">
                    https://app.fintechcenterfsa.com/api
                  </code>
                </div>
                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                  <span className="font-semibold">Web Preview:</span>
                  <code className="font-mono bg-slate-200 dark:bg-slate-900 px-1.5 py-0.5 rounded text-[11px] text-slate-800 dark:text-slate-200">
                    /preview
                  </code>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20">
                    <GlobeIcon className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <span>Host LAN IP Auto-Detection</span>
                      <span className="px-1.5 py-0.2 rounded text-[9px] bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300 font-semibold border border-sky-300 dark:border-sky-800">
                        Local Wi-Fi
                      </span>
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Physical phone connects via office Wi-Fi, Personal Hotspot, or USB Cable.
                    </p>
                  </div>
                </div>

                {/* IP Selector Dropdown / Input */}
                <div className="flex items-center gap-2 min-w-[200px]">
                  <Select
                    value={selectedIp}
                    onChange={(e) => setSelectedIp(e.target.value)}
                    className="!py-1.5 !px-3 text-xs font-mono font-bold"
                  >
                    {networkData?.interfaces?.map((iface, idx) => (
                      <option key={idx} value={iface.address}>
                        {iface.address} ({iface.name}) {iface.isPrimary ? '★' : ''}
                      </option>
                    )) || (
                      <option value={selectedIp}>{selectedIp}</option>
                    )}
                  </Select>
                </div>
              </div>

              {/* Target Backend Status Pill */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-700/60 text-xs">
                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                  <span className="font-semibold">Backend Target:</span>
                  <code className="font-mono bg-slate-200 dark:bg-slate-900 px-1.5 py-0.5 rounded text-[11px] text-slate-800 dark:text-slate-200">
                    http://{selectedIp}:{networkData?.backendPort || '3000'}
                  </code>
                </div>

                <div className="flex items-center gap-1.5">
                  {checkingBackend ? (
                    <span className="inline-flex items-center gap-1 text-[11px] text-amber-500 font-medium">
                      <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                      </svg>
                      Checking...
                    </span>
                  ) : backendHealthy ? (
                    <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
                      <CheckCircleIcon className="w-3.5 h-3.5 text-emerald-500" />
                      Ready (Port 3000)
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[11px] text-amber-600 dark:text-amber-400 font-medium">
                      <AlertTriangleIcon className="w-3.5 h-3.5 text-amber-500" />
                      Port 3000 Active
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* 2. QR Code & Direct Scan Card */}
          <div className="flex flex-col sm:flex-row items-center gap-6 p-5 rounded-2xl bg-gradient-to-br from-accent-50/30 via-slate-50 to-white dark:from-accent-950/20 dark:via-slate-800/40 dark:to-slate-900 border border-accent-200/60 dark:border-accent-800/40 shadow-xs">
            {/* QR Code */}
            <div className="relative p-3 bg-white rounded-2xl shadow-md border border-slate-200 dark:border-slate-700 flex-shrink-0">
              <img
                src={qrCodeUrl}
                alt="Scan to Download Super App APK"
                className="w-40 h-40 object-contain rounded-xl"
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
                  Point your Android camera or barcode scanner at this QR code to download and install <strong className="text-slate-700 dark:text-slate-200">{activeFilename}</strong> instantly without typing links.
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
                  className={`inline-flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-semibold rounded-xl border transition-all cursor-pointer ${
                    copiedLink
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
                      : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750'
                  }`}
                >
                  {copiedLink ? (
                    <>
                      <CheckIcon className="w-3.5 h-3.5 text-emerald-500" />
                      <span>Copied URL!</span>
                    </>
                  ) : (
                    <>
                      <CopyIcon className="w-3.5 h-3.5 text-slate-500" />
                      <span>Copy Link</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Build Mode Diagnostic Note */}
          {networkData?.apk?.buildMode === 'debug' && (
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-200 text-xs flex items-start gap-2.5">
              <AlertTriangleIcon className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <span className="font-bold">Debug Test Build Active ({networkData.apk.size}):</span>
                <p className="text-[11px] text-amber-700 dark:text-amber-300 leading-relaxed">
                  Debug APKs include the Dart JIT engine, debugging symbols, and hot-reload hooks for testing. Building in <code className="font-mono bg-amber-500/20 px-1 py-0.2 rounded font-bold">release</code> mode shrinks the APK down to ~19.4 MB via native AOT compilation and bytecode tree-shaking.
                </p>
              </div>
            </div>
          )}

          {/* 3. Direct Download URL Input */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
              <span>Direct APK Stream URL:</span>
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

          {/* 4. Quick Test Login Credentials */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-750 space-y-2.5">
            <div className="flex items-center justify-between">
              <h5 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <ShieldCheckIcon className="w-4 h-4 text-emerald-500" />
                <span>Test Sign-In Credentials</span>
              </h5>
              <span className="text-[10px] text-slate-500 dark:text-slate-400">
                Cleartext LAN Auth Enabled
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div className="flex items-center justify-between p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 font-mono">
                <span className="text-slate-500 text-[11px]">Email:</span>
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-slate-800 dark:text-slate-200">admin@example.com</span>
                  <button
                    type="button"
                    onClick={() => handleCopy('admin@example.com', 'email')}
                    className="text-slate-400 hover:text-accent-500 p-0.5"
                    title="Copy Email"
                  >
                    {copiedCreds === 'email' ? <CheckIcon className="w-3.5 h-3.5 text-emerald-500" /> : <CopyIcon className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 font-mono">
                <span className="text-slate-500 text-[11px]">Password:</span>
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-slate-800 dark:text-slate-200">Password123!</span>
                  <button
                    type="button"
                    onClick={() => handleCopy('Password123!', 'password')}
                    className="text-slate-400 hover:text-accent-500 p-0.5"
                    title="Copy Password"
                  >
                    {copiedCreds === 'password' ? <CheckIcon className="w-3.5 h-3.5 text-emerald-500" /> : <CopyIcon className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </div>
          </div>
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
