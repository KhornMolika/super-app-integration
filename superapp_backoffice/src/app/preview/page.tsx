"use client";

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  DevicePhoneIcon,
  RefreshIcon,
  QrCodeIcon,
  DownloadIcon,
  ArrowRightIcon,
  SparklesIcon,
  ZapIcon,
  CheckCircleIcon,
  EyeIcon,
} from '@/components/ui/Icons';
import DownloadApkModal from '@/components/ui/DownloadApkModal';

type DeviceModel = 'iphone-16-pro' | 'galaxy-s25' | 'pixel-9-pro';
type DeviceFinish = 'titanium' | 'space-black' | 'midnight-blue';

interface DeviceSpec {
  name: string;
  width: number;
  height: number;
  borderRadius: string;
  hasDynamicIsland: boolean;
  hasCameraPunch: boolean;
}

const DEVICE_SPECS: Record<DeviceModel, DeviceSpec> = {
  'iphone-16-pro': {
    name: 'iPhone 16 Pro',
    width: 393,
    height: 852,
    borderRadius: '52px',
    hasDynamicIsland: true,
    hasCameraPunch: false,
  },
  'galaxy-s25': {
    name: 'Galaxy S25 Ultra',
    width: 412,
    height: 915,
    borderRadius: '42px',
    hasDynamicIsland: false,
    hasCameraPunch: true,
  },
  'pixel-9-pro': {
    name: 'Pixel 9 Pro',
    width: 410,
    height: 890,
    borderRadius: '48px',
    hasDynamicIsland: false,
    hasCameraPunch: true,
  },
};

export default function MobilePreviewPage() {
  const [device, setDevice] = useState<DeviceModel>('iphone-16-pro');
  const [finish, setFinish] = useState<DeviceFinish>('titanium');
  const [isLandscape, setIsLandscape] = useState(false);
  const [scaleMode, setScaleMode] = useState<'fit' | '100' | '90' | '80'>('fit');
  const [reloadKey, setReloadKey] = useState(0);
  const [currentTime, setCurrentTime] = useState('09:41');
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'kyc' | 'marketplace'>('all');
  const [autoScaleFactor, setAutoScaleFactor] = useState(1);

  const containerRef = useRef<HTMLDivElement>(null);
  const spec = DEVICE_SPECS[device];

  // Dynamic live clock for phone status bar
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const hours = now.getHours().toString().padStart(2, '0');
      const minutes = now.getMinutes().toString().padStart(2, '0');
      setCurrentTime(`${hours}:${minutes}`);
    };
    updateTime();
    const timer = setInterval(updateTime, 10000);
    return () => clearInterval(timer);
  }, []);

  // Compute responsive auto-scale to ensure the entire phone fits nicely on any desktop/tablet screen
  useEffect(() => {
    const calculateScale = () => {
      if (!containerRef.current) return;
      const containerH = containerRef.current.clientHeight - 40; // padding
      const containerW = containerRef.current.clientWidth - 40;
      const targetW = isLandscape ? spec.height : spec.width;
      const targetH = isLandscape ? spec.width : spec.height;

      const scaleH = containerH / (targetH + 40);
      const scaleW = containerW / (targetW + 40);
      const maxAllowed = Math.min(scaleH, scaleW, 1);
      setAutoScaleFactor(Math.max(maxAllowed, 0.45));
    };

    calculateScale();
    window.addEventListener('resize', calculateScale);
    return () => window.removeEventListener('resize', calculateScale);
  }, [device, isLandscape, spec]);

  const effectiveScale =
    scaleMode === 'fit' ? autoScaleFactor : Number(scaleMode) / 100;

  const targetWidth = isLandscape ? spec.height : spec.width;
  const targetHeight = isLandscape ? spec.width : spec.height;

  const sandboxUrl = `/superapp-sandbox/index.html?t=${reloadKey}${
    activeTab !== 'all' ? `#/miniapp/${activeTab}` : ''
  }`;

  const getFinishBorder = () => {
    switch (finish) {
      case 'space-black':
        return 'border-[#1a1a1e] ring-1 ring-white/10 shadow-[0_25px_70px_rgba(0,0,0,0.85)]';
      case 'midnight-blue':
        return 'border-[#172033] ring-1 ring-cyan-500/20 shadow-[0_25px_70px_rgba(15,23,42,0.85)]';
      case 'titanium':
      default:
        return 'border-[#2d2d34] ring-1 ring-white/15 shadow-[0_25px_70px_rgba(0,0,0,0.7)]';
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col overflow-hidden select-none font-sans">
      {/* Top Header Bar */}
      <header className="h-14 border-b border-slate-800 bg-slate-900/80 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between z-30 shrink-0">
        <div className="flex items-center space-x-3">
          <Link
            href="/"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            <span className="hidden sm:inline">BackOffice</span>
          </Link>
          <div className="h-4 w-px bg-slate-700" />
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-brand-600 to-brand-800 flex items-center justify-center text-white shadow-md">
              <DevicePhoneIcon className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-xs sm:text-sm font-bold text-white flex items-center gap-1.5">
                <span>FSA SuperApp</span>
                <span className="px-1.5 py-0.5 text-[10px] font-mono font-bold bg-accent-500/20 text-accent-300 rounded border border-accent-500/30">
                  Mobile Simulator
                </span>
              </h1>
            </div>
          </div>
        </div>

        {/* Center Controls: Device & Finish Selector */}
        <div className="hidden md:flex items-center gap-2 bg-slate-950/60 p-1 rounded-xl border border-slate-800">
          {(Object.keys(DEVICE_SPECS) as DeviceModel[]).map((m) => (
            <button
              key={m}
              onClick={() => setDevice(m)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                device === m
                  ? 'bg-accent-500 text-slate-950 font-bold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <DevicePhoneIcon className="w-3.5 h-3.5" />
              <span>{DEVICE_SPECS[m].name}</span>
            </button>
          ))}
        </div>

        {/* Right Actions */}
        <div className="flex items-center space-x-2">
          {/* Reload simulator */}
          <button
            onClick={() => setReloadKey((k) => k + 1)}
            title="Reload Simulator App"
            className="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors flex items-center gap-1 text-xs font-medium"
          >
            <RefreshIcon className="w-4 h-4" />
            <span className="hidden lg:inline">Reload</span>
          </button>

          {/* Orientation Toggle */}
          <button
            onClick={() => setIsLandscape((l) => !l)}
            title="Rotate Device Orientation"
            className={`p-2 rounded-lg transition-colors flex items-center gap-1 text-xs font-medium ${
              isLandscape
                ? 'bg-accent-500 text-slate-950 font-bold'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span className="hidden lg:inline">{isLandscape ? 'Landscape' : 'Portrait'}</span>
          </button>

          {/* QR Code */}
          <button
            onClick={() => setIsQrModalOpen(true)}
            className="px-3 py-1.5 bg-accent-500 hover:bg-accent-600 text-slate-950 text-xs font-bold rounded-lg shadow-sm flex items-center gap-1.5 transition-all"
          >
            <QrCodeIcon className="w-4 h-4" />
            <span>Install APK</span>
          </button>
        </div>
      </header>

      {/* Main Workspace: Simulator Container */}
      <div
        ref={containerRef}
        className="flex-1 relative flex items-center justify-center p-4 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black overflow-hidden"
      >
        {/* Background Grid Accent */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f29370f_1px,transparent_1px),linear-gradient(to_bottom,#1f29370f_1px,transparent_1px)] bg-[size:4rem_4rem] pointer-events-none" />

        {/* Floating Scale & Finish Toolbar */}
        <div className="absolute top-4 left-4 z-20 flex items-center gap-2 bg-slate-900/90 backdrop-blur-md p-1.5 rounded-xl border border-slate-800 shadow-xl">
          <span className="text-[11px] font-medium text-slate-400 px-2">Finish:</span>
          {(['titanium', 'space-black', 'midnight-blue'] as DeviceFinish[]).map((f) => (
            <button
              key={f}
              onClick={() => setFinish(f)}
              title={f}
              className={`w-5 h-5 rounded-full border-2 transition-all ${
                f === 'titanium'
                  ? 'bg-slate-400'
                  : f === 'space-black'
                  ? 'bg-zinc-900'
                  : 'bg-blue-950'
              } ${finish === f ? 'border-accent-400 scale-110 shadow-sm' : 'border-transparent opacity-60 hover:opacity-100'}`}
            />
          ))}

          <div className="h-4 w-px bg-slate-700 mx-1" />

          <span className="text-[11px] font-medium text-slate-400 px-1">Scale:</span>
          {(['fit', '100', '90', '80'] as const).map((m) => (
            <button
              key={m}
              onClick={() => setScaleMode(m)}
              className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                scaleMode === m
                  ? 'bg-accent-500 text-slate-950 font-bold'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              {m === 'fit' ? 'Auto' : `${m}%`}
            </button>
          ))}
        </div>

        {/* Physical Mobile Device Mockup */}
        <div
          className="transition-transform duration-300 ease-out origin-center shrink-0 flex items-center justify-center relative"
          style={{
            transform: `scale(${effectiveScale})`,
            width: targetWidth + 28,
            height: targetHeight + 28,
          }}
        >
          {/* Hardware Device Outer Frame */}
          <div
            className={`relative p-[14px] bg-[#0d0d11] border-[10px] ${getFinishBorder()} transition-all duration-300 shadow-2xl flex flex-col`}
            style={{
              width: targetWidth + 28,
              height: targetHeight + 28,
              borderRadius: spec.borderRadius,
            }}
          >
            {/* Side Hardware Buttons (Vol & Power) */}
            <div className="absolute -left-[14px] top-[110px] w-[4px] h-[36px] bg-slate-700 rounded-l-sm" />
            <div className="absolute -left-[14px] top-[160px] w-[4px] h-[55px] bg-slate-700 rounded-l-sm" />
            <div className="absolute -left-[14px] top-[225px] w-[4px] h-[55px] bg-slate-700 rounded-l-sm" />
            <div className="absolute -right-[14px] top-[140px] w-[4px] h-[75px] bg-slate-700 rounded-r-sm" />

            {/* Inner Screen Surface */}
            <div
              className="relative w-full h-full bg-black overflow-hidden flex flex-col"
              style={{
                borderRadius: `calc(${spec.borderRadius} - 14px)`,
              }}
            >
              {/* Dynamic Status Bar Overlay */}
              {!isLandscape && (
                <div className="absolute top-0 left-0 right-0 h-11 px-7 flex items-center justify-between z-30 pointer-events-none text-white text-xs font-semibold">
                  <span>{currentTime}</span>

                  {/* Notch / Dynamic Island / Camera Punch Hole */}
                  {spec.hasDynamicIsland && (
                    <div className="w-[120px] h-[32px] bg-black rounded-full flex items-center justify-between px-3 shadow-sm pointer-events-auto transition-all hover:w-[130px]">
                      <div className="w-2.5 h-2.5 rounded-full bg-[#1c1c1e] flex items-center justify-center">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-900/60" />
                      </div>
                      <div className="w-2.5 h-2.5 rounded-full bg-[#1c1c1e]" />
                    </div>
                  )}

                  {spec.hasCameraPunch && (
                    <div className="w-3.5 h-3.5 rounded-full bg-black border border-zinc-800 shadow-inner" />
                  )}

                  {/* Right Status Icons (5G, WiFi, Battery) */}
                  <div className="flex items-center gap-1.5 text-[11px]">
                    <span className="font-bold">5G</span>
                    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 3C7.5 3 3.5 4.8 0.5 7.7L12 21.5L23.5 7.7C20.5 4.8 16.5 3 12 3Z" />
                    </svg>
                    <div className="w-5 h-2.5 border border-white rounded-sm p-0.5 flex items-center">
                      <div className="h-full w-4/5 bg-white rounded-2xs" />
                    </div>
                  </div>
                </div>
              )}

              {/* Flutter SuperApp Web Iframe */}
              <iframe
                src={sandboxUrl}
                title="SuperApp Mobile View"
                className="w-full h-full border-none bg-white"
                allow="geolocation; camera; microphone; accelerometer; gyroscope"
              />

              {/* Bottom iOS Home Swipe Bar / Android Gesture Bar */}
              {!isLandscape && (
                <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-[134px] h-[5px] bg-white/60 rounded-full z-30 pointer-events-none backdrop-blur-sm" />
              )}
            </div>
          </div>
        </div>

        {/* Quick Tips Floating Banner */}
        <div className="absolute bottom-4 right-4 hidden md:flex items-center gap-2 bg-slate-900/80 backdrop-blur-md px-3.5 py-2 rounded-xl border border-slate-800 text-xs text-slate-400">
          <SparklesIcon className="w-4 h-4 text-accent-400" />
          <span>Interactive Flutter MiniApp Sandbox container loaded live.</span>
        </div>
      </div>

      {/* Download / QR Code Modal */}
      <DownloadApkModal
        isOpen={isQrModalOpen}
        onClose={() => setIsQrModalOpen(false)}
      />
    </div>
  );
}
