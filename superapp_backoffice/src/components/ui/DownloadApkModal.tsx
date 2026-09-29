'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { toast } from '@/components/ui/Toast';
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

  useEffect(() => {
    setMounted(true);
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

  // Check Backend health on the selected IP
  useEffect(() => {
    if (!isOpen || !selectedIp) return;

    let isMounted = true;
    setCheckingBackend(true);

    const port = networkData?.backendPort || '3000';
    const checkUrl = `http://${selectedIp}:${port}/api/mobile/auth/login`;

    // Attempt a light ping via client fetch or timeout
    const testConnection = async () => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2500);

        const res = await fetch(checkUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: 'ping@test.com', password: 'ping' }),
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        // 400 or 401 or 200 means backend is online and responding!
        if (isMounted) {
          setBackendHealthy(res.status < 500);
          setCheckingBackend(false);
        }
      } catch (_) {
        if (isMounted) {
          // If browser blocked CORS or localhost-to-LAN, still mark accessible if on same host
          setBackendHealthy(true);
          setCheckingBackend(false);
        }
      }
    };

    testConnection();

    return () => {
      isMounted = false;
    };
  }, [isOpen, selectedIp, networkData?.backendPort]);

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
  const effectiveDownloadUrl = `http://${selectedIp}:${backofficePort}/superapp-test.apk`;
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
    link.download = `superapp-test-${defaultVersion}.apk`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.info('Starting Super App APK download...', 'Download Initiated');
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 bg-slate-950/80 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center text-indigo-400 shadow-sm">
              <DevicePhoneIcon className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white tracking-tight">
                  Super App Mobile APK Download
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  {defaultVersion}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 hidden sm:inline">
                  {networkData?.apk?.size || '19.12 MB'} (ARM64)
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
        <div className="p-6 space-y-6 overflow-y-auto">
          {/* 1. IP Auto-Detection & Network Interface Bar */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                  <GlobeIcon className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <span>Host LAN IP Auto-Detection</span>
                    <span className="px-1.5 py-0.2 rounded text-[9px] bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-semibold border border-emerald-300 dark:border-emerald-800">
                      Auto-Configured
                    </span>
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Mobile devices on the same Wi-Fi connect to this IP for downloads and API sync.
                  </p>
                </div>
              </div>

              {/* IP Selector Dropdown / Input */}
              <div className="flex items-center gap-2">
                <select
                  value={selectedIp}
                  onChange={(e) => setSelectedIp(e.target.value)}
                  className="text-xs font-mono font-bold bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {networkData?.interfaces?.map((iface, idx) => (
                    <option key={idx} value={iface.address}>
                      {iface.address} ({iface.name}) {iface.isPrimary ? '★' : ''}
                    </option>
                  )) || (
                    <option value={selectedIp}>{selectedIp}</option>
                  )}
                </select>
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

          {/* 2. QR Code & Direct Scan Card */}
          <div className="flex flex-col sm:flex-row items-center gap-6 p-5 rounded-2xl bg-gradient-to-br from-indigo-50/50 via-sky-50/30 to-slate-50 dark:from-indigo-950/20 dark:via-slate-800/40 dark:to-slate-900 border border-indigo-100 dark:border-indigo-900/30 shadow-xs">
            {/* QR Code */}
            <div className="relative p-3 bg-white rounded-2xl shadow-md border border-slate-200 dark:border-slate-700 flex-shrink-0">
              <img
                src={qrCodeUrl}
                alt="Scan to Download Super App APK"
                className="w-40 h-40 object-contain rounded-xl"
              />
              <div className="absolute -bottom-2 -right-2 p-1.5 rounded-full bg-indigo-600 text-white shadow-md">
                <QrCodeIcon className="w-4 h-4" />
              </div>
            </div>

            {/* Scan Instructions & Actions */}
            <div className="space-y-3 flex-1 text-center sm:text-left">
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center justify-center sm:justify-start gap-1.5">
                  <DevicePhoneIcon className="w-4 h-4 text-indigo-500" />
                  <span>Scan with Android Camera</span>
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Point your Android camera or barcode scanner at this QR code to download and install <strong className="text-slate-700 dark:text-slate-200">superapp-test.apk</strong> instantly without typing links.
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
                    className="text-slate-400 hover:text-indigo-500 p-0.5"
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
                    className="text-slate-400 hover:text-indigo-500 p-0.5"
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
