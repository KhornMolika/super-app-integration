"use client";

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Button } from './inputs';
import IframePreviewEngine from './IframePreviewEngine';

export type DeviceType = 
  | 'Responsive' | 'Custom' 
  | 'iPhone 16 Pro' | 'Galaxy S25 Ultra' | 'iPad Pro 11"' | 'Laptop 14"';
export type Orientation = 'Portrait' | 'Landscape';

interface PreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  url: string;
  title?: string;
  version?: string;
  category?: string;
  appId?: string;
  apkUrl?: string;
  isFlutter?: boolean;
  status?: string;
  buildCompletedAt?: string | Date;
}

const DEVICE_DIMENSIONS = {
  'iPhone 16 Pro': { width: 393, height: 852, type: 'Phone' },
  'Galaxy S25 Ultra': { width: 412, height: 915, type: 'Phone' },
  'iPad Pro 11"': { width: 834, height: 1194, type: 'iPad' },
  'Laptop 14"': { width: 1440, height: 900, type: 'Laptop' },
};

export default function PreviewModal({
  isOpen,
  onClose,
  url,
  title = 'Mini App',
  version = '1.0.0',
  category,
  appId,
  apkUrl = '/api/download-apk?type=test&version=v0.0.1',
  isFlutter = false,
  status,
  buildCompletedAt,
}: PreviewModalProps) {
  const [device, setDevice] = useState<DeviceType>('iPhone 16 Pro');
  const [orientation, setOrientation] = useState<Orientation>('Portrait');
  const [zoom, setZoom] = useState(100);
  const [customDimensions, setCustomDimensions] = useState({ width: 800, height: 600 });
  const [reloadKey, setReloadKey] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [currentScreen, setCurrentScreen] = useState<'flutter-web' | 'miniapp'>('flutter-web');
  
  const previewAreaRef = useRef<HTMLDivElement>(null);
  const [autoScale, setAutoScale] = useState(1);
  const [containerSize, setContainerSize] = useState({ width: 1024, height: 768 });

  // Set initial active screen whenever preview opens
  useEffect(() => {
    if (isOpen) {
      setCurrentScreen(isFlutter ? 'flutter-web' : 'miniapp');
    }
  }, [isOpen, isFlutter]);

  // Effective preview URL: If Flutter package, load the real compiled Flutter Web binary!
  const effectiveUrl = (isFlutter || url.includes('localhost:8081') || !url.startsWith('http'))
    ? '/flutter-web/index.html'
    : url;

  useEffect(() => {
    setMounted(true);
  }, []);

  // Prevent background scrolling
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
    return () => { document.body.style.overflow = 'auto'; };
  }, [isOpen]);

  const handleReload = () => setReloadKey(prev => prev + 1);
  const handleZoomIn = () => setZoom(z => Math.min(z + 25, 200));
  const handleZoomOut = () => setZoom(z => Math.max(z - 25, 25));
  const handleZoomReset = () => setZoom(100);

  const getViewportDimensions = () => {
    if (device === 'Responsive') {
      return { width: '100%', height: '100%' };
    }
    
    let w = 0;
    let h = 0;
    if (device === 'Custom') {
      w = customDimensions.width;
      h = customDimensions.height;
    } else {
      w = DEVICE_DIMENSIONS[device as keyof typeof DEVICE_DIMENSIONS].width;
      h = DEVICE_DIMENSIONS[device as keyof typeof DEVICE_DIMENSIONS].height;
    }

    const isLaptopOrCustom = device === 'Custom' || DEVICE_DIMENSIONS[device as keyof typeof DEVICE_DIMENSIONS]?.type === 'Laptop';

    if (!isLaptopOrCustom && orientation === 'Landscape') {
      return { width: h, height: w };
    }
    return { width: w, height: h };
  };

  const viewport = getViewportDimensions();
  const activeDeviceType = device === 'Responsive' || device === 'Custom' 
    ? 'Responsive' 
    : DEVICE_DIMENSIONS[device as keyof typeof DEVICE_DIMENSIONS].type;

  // Calculate autoScale based on preview area size and device size
  useEffect(() => {
    const updateScale = () => {
      if (previewAreaRef.current) {
        const { clientWidth, clientHeight } = previewAreaRef.current;
        setContainerSize({ width: clientWidth, height: clientHeight });
        
        if (device !== 'Responsive' && typeof viewport.width === 'number' && typeof viewport.height === 'number') {
          const padding = 48;
          const availableW = clientWidth - padding;
          const availableH = clientHeight - padding;
          
          const scaleX = availableW / viewport.width;
          const scaleY = availableH / viewport.height;
          
          const fitScale = Math.min(scaleX, scaleY); 
          setAutoScale(Math.min(1, fitScale));
        }
      }
    };
    
    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, [device, orientation, customDimensions, viewport.width, viewport.height]);

  const effectiveScale = device === 'Responsive' ? 1 : autoScale * (zoom / 100);

  const buildDate = buildCompletedAt ? new Date(buildCompletedAt) : null;
  const fullBuildTime = buildDate ? buildDate.toLocaleString('en-US') : null;
  const formattedBuildTime = buildDate
    ? buildDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) +
      ', ' +
      buildDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
    : null;

  const displayVersion = version ? (version.startsWith('v') ? version : `v${version}`) : 'v1.0.0';

  if (!mounted || !isOpen) return null;

  const modalContent = (
    <div className="fixed inset-0 z-[9999] flex flex-col bg-slate-950/90 backdrop-blur-md">
      {/* Top Header / Toolbar */}
      <div className="flex items-center justify-between px-4 bg-slate-900 border-b border-slate-800 text-slate-100 shadow-sm z-20 h-14 shrink-0 gap-3">
        
        {/* LEFT: App Brand & Build Info */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-indigo-600/30 border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-bold text-base shrink-0">
              📱
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm text-slate-100 truncate max-w-[140px]" title={title}>{title}</h3>
                <span className="text-[10px] bg-indigo-500/20 text-indigo-300 font-semibold px-2 py-0.5 rounded-full border border-indigo-500/30 shrink-0">
                  {isFlutter ? 'Flutter' : 'WebView'}
                </span>
              </div>
            </div>
          </div>

          <div className="h-5 w-px bg-slate-800 shrink-0 hidden sm:block"></div>

          {/* Version Badge */}
          <span 
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-mono font-bold bg-indigo-950/60 text-indigo-300 border border-indigo-800/80 shrink-0 shadow-xs"
            title={`App Version: ${displayVersion}`}
          >
            <svg className="w-3.5 h-3.5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
            </svg>
            <span>{displayVersion}</span>
          </span>

          {/* Build Complete Timestamp Badge */}
          {formattedBuildTime ? (
            <span 
              className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-xs font-mono bg-emerald-950/60 text-emerald-300 border border-emerald-800/80 shrink-0 shadow-xs cursor-default"
              title={`Build Completed At: ${fullBuildTime}`}
            >
              <svg className="w-3.5 h-3.5 text-emerald-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-emerald-400/80 font-medium hidden md:inline">Built:</span>
              <span className="font-semibold text-emerald-300">{formattedBuildTime}</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-xs font-mono bg-slate-800/80 text-slate-300 border border-slate-700 shrink-0 shadow-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0"></span>
              <span className="text-slate-300 text-[11px] font-medium">Ready</span>
            </span>
          )}
        </div>

        {/* CENTER: Device Selector, Orientation & Zoom */}
        <div className="flex items-center gap-2">
          {/* Compact Device Dropdown Switcher */}
          <div className="flex items-center bg-slate-800/90 rounded-xl p-0.5 border border-slate-700/80 shadow-xs">
            <select
              value={device}
              onChange={(e) => setDevice(e.target.value as DeviceType)}
              className="bg-transparent text-xs font-semibold text-slate-200 pl-2.5 pr-2 py-1.5 focus:outline-none cursor-pointer rounded-lg hover:bg-slate-700/50 transition-colors"
            >
              <option value="iPhone 16 Pro" className="bg-slate-900 text-slate-200">📱 iPhone 16 Pro (393×852)</option>
              <option value="Galaxy S25 Ultra" className="bg-slate-900 text-slate-200">📱 Galaxy S25 Ultra (412×915)</option>
              <option value="iPad Pro 11&quot;" className="bg-slate-900 text-slate-200">📱 iPad Pro 11&quot; (834×1194)</option>
              <option value="Laptop 14&quot;" className="bg-slate-900 text-slate-200">💻 Laptop 14&quot; (1440×900)</option>
              <option value="Responsive" className="bg-slate-900 text-slate-200">↔ Responsive (Fluid)</option>
            </select>

            {/* Orientation Toggle Button */}
            {activeDeviceType === 'Phone' && (
              <button
                onClick={() => setOrientation(orientation === 'Portrait' ? 'Landscape' : 'Portrait')}
                className="px-2 py-1 text-xs font-semibold rounded-lg text-slate-300 hover:text-white hover:bg-slate-700 transition-colors flex items-center gap-1 border-l border-slate-700/80"
                title={`Rotate device (Current: ${orientation})`}
              >
                <svg className="w-3.5 h-3.5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span className="hidden xl:inline text-[11px]">{orientation}</span>
              </button>
            )}
          </div>

          {/* Zoom Controls */}
          <div className="flex items-center bg-slate-800/90 rounded-xl p-0.5 border border-slate-700/80 shadow-xs">
            <button onClick={handleZoomOut} className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-700 transition-colors" title="Zoom Out">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 12H4" /></svg>
            </button>
            <button onClick={handleZoomReset} className="px-2 py-0.5 text-xs font-mono text-slate-300 hover:bg-slate-700 rounded transition-colors" title="Reset Zoom">
              {zoom}%
            </button>
            <button onClick={handleZoomIn} className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-700 transition-colors" title="Zoom In">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
            </button>
          </div>
        </div>

        {/* RIGHT: Screen Switcher & Action Tools */}
        <div className="flex items-center gap-2">
          {/* Screen Switcher (Super App vs Mini App) */}
          <div className="flex bg-slate-800/90 rounded-xl p-0.5 border border-slate-700/80 text-xs shadow-xs">
            <button
              type="button"
              onClick={() => setCurrentScreen('flutter-web')}
              className={`px-3 py-1 font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
                currentScreen === 'flutter-web'
                  ? 'bg-brand-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <svg className="w-3.5 h-3.5 text-sky-400" viewBox="0 0 24 24" fill="currentColor">
                <path d="M14.314 0L2.3 12 6 15.7 21.686 0h-7.372zm.072 10.301L8.171 16.514 14.386 22.7 21.686 22.7l-7.3-7.299 7.3-5.1z" />
              </svg>
              <span>Super App</span>
            </button>
            <button
              type="button"
              onClick={() => setCurrentScreen('miniapp')}
              className={`px-3 py-1 font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
                currentScreen === 'miniapp'
                  ? 'bg-brand-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"/></svg>
              <span>Mini App</span>
            </button>
          </div>

          {/* Direct APK Download Button (only available after approval and build in TESTING/ACTIVE) */}
          {(status === 'TESTING' || status === 'ACTIVE') && (
            <a
              href={apkUrl}
              download="superapp-debug.apk"
              className="h-8 px-2.5 text-xs font-semibold rounded-xl bg-emerald-600/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-600 hover:text-white transition-colors flex items-center gap-1.5 shadow-xs"
              title="Download Super App Test Build APK (Nexus)"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
              <span className="hidden sm:inline">Test APK</span>
            </a>
          )}

          {/* Reload Button */}
          <Button variant="outline" onClick={handleReload} className="!p-0 h-8 w-8 text-slate-400 hover:text-white border-slate-700/80 rounded-xl" title="Reload Frame">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
          </Button>

          {/* Close Button */}
          <Button onClick={onClose} className="!p-0 h-8 w-8 bg-slate-800 text-slate-300 hover:bg-rose-600 hover:text-white rounded-xl transition-colors" title="Close Preview">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
          </Button>
        </div>
      </div>

      {/* Body: Preview Area + Simulator Controls Panel */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Center: Device Frame Viewport */}
        <div 
          ref={previewAreaRef}
          className="flex-1 overflow-auto bg-slate-950 flex relative p-6"
        >
          <div 
            className={`relative m-auto transition-all ${device === 'Responsive' ? 'w-full h-full' : ''}`}
            style={device === 'Responsive' ? undefined : { 
              width: (viewport.width as number) * effectiveScale, 
              height: (viewport.height as number) * effectiveScale 
            }}
          >
            {/* Scaled Device Frame Container */}
            <div 
              className={`transition-all duration-300 ease-out ${
                device === 'Responsive' ? 'w-full h-full relative overflow-hidden bg-slate-900' :
                activeDeviceType === 'Phone' ? 'shadow-2xl rounded-[3rem] ring-[12px] ring-slate-800 absolute top-0 left-0 overflow-hidden bg-slate-900' :
                activeDeviceType === 'iPad' ? 'shadow-2xl rounded-[2rem] ring-[16px] ring-slate-800 absolute top-0 left-0 overflow-hidden bg-slate-900' :
                'shadow-2xl ring-1 ring-slate-800 absolute top-0 left-0 overflow-hidden bg-slate-900'
              }`}
              style={device === 'Responsive' ? undefined : { 
                width: viewport.width, 
                height: viewport.height,
                transform: `scale(${effectiveScale})`,
                transformOrigin: 'top left'
              }}
            >
              {/* Phone Dynamic Island / Notch */}
              {activeDeviceType === 'Phone' && orientation === 'Portrait' && (
                <div className="absolute top-2 inset-x-0 h-6 flex justify-center z-30 pointer-events-none">
                  <div className="w-28 h-5 bg-black rounded-full border border-slate-800/80 shadow-md"></div>
                </div>
              )}

              {/* Viewport Content: Flutter Web Super App Container vs Mock Home vs Direct Mini App */}
              {currentScreen === 'flutter-web' ? (
                <div className="w-full h-full relative z-10 flex flex-col bg-slate-950 overflow-hidden">
                  {/* Top Bar for Flutter Web Container */}
                  <div className="h-10 pt-2 px-4 bg-slate-900 border-b border-slate-800 text-white flex items-center justify-between z-20 flex-shrink-0">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                      <span className="text-[11px] font-bold text-slate-200">Super App Container (Flutter Web)</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={handleReload}
                        className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800"
                        title="Reload Flutter Container"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
                      </button>
                    </div>
                  </div>

                  {/* Sandboxed Flutter Web Iframe */}
                  <div className="flex-1 relative bg-slate-900 w-full h-full">
                    <iframe
                      key={reloadKey}
                      src={`/superapp-sandbox/index.html?t=${reloadKey}`}
                      className="w-full h-full border-0 bg-slate-900"
                      title="Flutter Super App Web Container"
                      allow="geolocation; camera; microphone; clipboard-read; clipboard-write; autoplay"
                    />
                  </div>
                </div>
              ) : (
                <div className="w-full h-full relative z-10 flex flex-col bg-white dark:bg-slate-900">
                  {/* Super App In-App Browser Bar */}
                  <div className="h-12 bg-slate-900 border-b border-slate-800 text-white px-3 flex items-center justify-between z-20 flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => setCurrentScreen('flutter-web')}
                      className="flex items-center gap-1.5 text-xs text-brand-400 hover:text-brand-300 font-semibold px-2 py-1 rounded-lg hover:bg-slate-800 transition-colors"
                      title="Switch to Flutter Super App Container"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"/></svg>
                      <span>Super App</span>
                    </button>

                    <div className="flex flex-col items-center text-center px-2">
                      <div className="text-xs font-bold text-white flex items-center gap-1">
                        <span className="truncate max-w-[120px]">{title}</span>
                        <svg className="w-3 h-3 text-emerald-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd"/></svg>
                      </div>
                      <span className="text-[9px] text-slate-400 font-mono truncate max-w-[140px]">
                        {url.replace(/^https?:\/\//, '')}
                      </span>
                    </div>

                    <div className="flex items-center space-x-1">
                      <button
                        type="button"
                        onClick={handleReload}
                        className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
                        title="Reload Mini App"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
                      </button>
                      <button
                        type="button"
                        onClick={() => setCurrentScreen('flutter-web')}
                        className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-slate-800"
                        title="Back to Super App"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
                      </button>
                    </div>
                  </div>

                  {/* Sandboxed Iframe Engine */}
                  <div className="flex-1 relative bg-white">
                    <IframePreviewEngine url={effectiveUrl} reloadKey={reloadKey} />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
