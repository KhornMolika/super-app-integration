"use client";

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Button, Label } from './inputs';
import IframePreviewEngine from './IframePreviewEngine';

export type DeviceType = 
  | 'Responsive' | 'Custom' 
  | 'iPhone 16 Pro' | 'Galaxy S25 Ultra' | 'iPad Pro 11"' | 'Laptop 14"';
export type Orientation = 'Portrait' | 'Landscape';

interface BridgeEventLog {
  id: string;
  timestamp: string;
  type: string;
  payload: any;
}

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
  apkUrl = 'http://localhost:8081/repository/apk-releases/superapp/v1.1.0/app-debug.apk',
  isFlutter = false,
}: PreviewModalProps) {
  const [device, setDevice] = useState<DeviceType>('iPhone 16 Pro');
  const [orientation, setOrientation] = useState<Orientation>('Portrait');
  const [zoom, setZoom] = useState(100);
  const [customDimensions, setCustomDimensions] = useState({ width: 800, height: 600 });
  const [reloadKey, setReloadKey] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [currentScreen, setCurrentScreen] = useState<'home' | 'miniapp'>('home');
  
  // Simulator State
  const [showInspector, setShowInspector] = useState(true);
  const [eventLogs, setEventLogs] = useState<BridgeEventLog[]>([]);
  const [selectedUser, setSelectedUser] = useState<'citizen' | 'merchant' | 'guest'>('citizen');
  const [selectedCity, setSelectedCity] = useState('Phnom Penh');
  const [simulatedTheme, setSimulatedTheme] = useState<'light' | 'dark'>('light');
  
  const previewAreaRef = useRef<HTMLDivElement>(null);
  const [autoScale, setAutoScale] = useState(1);
  const [containerSize, setContainerSize] = useState({ width: 1024, height: 768 });

  // Reset to Super App Home Screen whenever preview opens
  useEffect(() => {
    if (isOpen) {
      setCurrentScreen('home');
    }
  }, [isOpen]);

  // Effective preview URL: If Flutter package, load the real compiled Flutter Web binary!
  const effectiveUrl = (isFlutter || url.includes('localhost:8081') || !url.startsWith('http'))
    ? '/flutter-web/index.html'
    : url;

  useEffect(() => {
    setMounted(true);
  }, []);

  // Listen for bridge messages from iframe runner
  useEffect(() => {
    const handleBridgeMessage = (event: MessageEvent) => {
      if (!event.data || event.data.source !== 'DSP_MINIAPP_RUNNER') return;
      
      const newEvent: BridgeEventLog = {
        id: Math.random().toString(36).substring(2, 9),
        timestamp: new Date().toLocaleTimeString(),
        type: event.data.type,
        payload: event.data.payload,
      };

      setEventLogs(prev => [newEvent, ...prev.slice(0, 49)]); // Keep last 50 events
    };

    window.addEventListener('message', handleBridgeMessage);
    return () => window.removeEventListener('message', handleBridgeMessage);
  }, []);

  // Send command to iframe sandbox
  const postToRunner = (command: string, data: any) => {
    const iframe = document.querySelector('iframe');
    if (iframe && iframe.contentWindow) {
      iframe.contentWindow.postMessage({
        source: 'DSP_SIMULATOR_HOST',
        command,
        data,
      }, '*');
    }
  };

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

  if (!mounted || !isOpen) return null;

  const modalContent = (
    <div className="fixed inset-0 z-[9999] flex flex-col bg-slate-950/90 backdrop-blur-md">
      {/* Top Header / Toolbar */}
      <div className="flex flex-wrap items-center justify-between p-3.5 bg-slate-900 border-b border-slate-800 text-slate-100 shadow-sm z-20">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-xl bg-indigo-600/30 border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-bold">
              📱
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-semibold text-sm text-slate-100">{title}</h3>
                <span className="text-[10px] bg-indigo-500/20 text-indigo-300 font-semibold px-2 py-0.5 rounded-full border border-indigo-500/30">
                  {isFlutter ? 'Flutter Package' : 'WebView Sandbox'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-mono truncate max-w-[260px]">{effectiveUrl}</p>
            </div>
          </div>

          <div className="h-6 w-px bg-slate-800 hidden md:block"></div>

          {/* Device Category Selector */}
          <div className="hidden md:flex items-center space-x-1.5">
            {(['iPhone 16 Pro', 'Galaxy S25 Ultra', 'iPad Pro 11"', 'Laptop 14"', 'Responsive'] as DeviceType[]).map(d => (
              <button
                key={d}
                onClick={() => setDevice(d)}
                className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-colors ${
                  device === d 
                    ? 'bg-indigo-600 text-white shadow-sm' 
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                {d}
              </button>
            ))}
          </div>

          {/* Orientation Toggle */}
          {activeDeviceType === 'Phone' && (
            <button
              onClick={() => setOrientation(orientation === 'Portrait' ? 'Landscape' : 'Portrait')}
              className="px-2.5 py-1 text-xs font-medium rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors flex items-center space-x-1.5"
              title="Rotate Device"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
              <span>{orientation}</span>
            </button>
          )}
        </div>

        {/* Right Action Tools */}
        <div className="flex items-center space-x-3">
          {/* Zoom Controls */}
          <div className="flex items-center bg-slate-800/80 rounded-lg p-0.5 border border-slate-700">
            <button onClick={handleZoomOut} className="p-1.5 text-slate-400 hover:text-slate-200 rounded hover:bg-slate-700">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 12H4" /></svg>
            </button>
            <button onClick={handleZoomReset} className="px-2.5 py-1 text-xs font-mono text-slate-300 hover:bg-slate-700 rounded">
              {zoom}%
            </button>
            <button onClick={handleZoomIn} className="p-1.5 text-slate-400 hover:text-slate-200 rounded hover:bg-slate-700">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
            </button>
          </div>

          {/* Screen Switcher */}
          <div className="flex bg-slate-800/80 rounded-lg p-0.5 border border-slate-700">
            <button
              type="button"
              onClick={() => setCurrentScreen('home')}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5 ${
                currentScreen === 'home'
                  ? 'bg-brand-600 text-white shadow-sm font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg>
              <span>Super App Home</span>
            </button>
            <button
              type="button"
              onClick={() => setCurrentScreen('miniapp')}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5 ${
                currentScreen === 'miniapp'
                  ? 'bg-brand-600 text-white shadow-sm font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"/></svg>
              <span>Mini App View</span>
            </button>
          </div>

          {/* Direct APK Download Button */}
          <a
            href={apkUrl}
            download="superapp-debug.apk"
            className="h-8 px-3 text-xs font-semibold rounded-lg bg-emerald-600/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-600 hover:text-white transition-colors flex items-center gap-1.5 shadow-sm"
            title="Download Super App Test Build APK (Nexus)"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
            <span>Download Test APK</span>
          </a>

          {/* Toggle Inspector Drawer */}
          <Button
            variant="outline"
            onClick={() => setShowInspector(!showInspector)}
            className={`h-8 px-3 text-xs font-medium border-slate-700 flex items-center gap-1.5 ${
              showInspector ? 'bg-indigo-600/30 text-indigo-300 border-indigo-500/40' : 'text-slate-400 hover:text-white'
            }`}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"/></svg>
            <span>Controls & Logs</span>
          </Button>

          <Button variant="outline" onClick={handleReload} className="!p-1.5 h-8 w-8 text-slate-400 hover:text-white border-slate-700" title="Reload Frame">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
          </Button>

          <Button onClick={onClose} className="!p-1.5 h-8 w-8 bg-slate-800 text-slate-300 hover:bg-rose-600 hover:text-white rounded-full transition-colors" title="Close Preview">
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

              {/* Viewport Content: Super App Home Screen vs Embedded Mini App */}
              {currentScreen === 'home' ? (
                <div className="w-full h-full relative z-10 flex flex-col bg-slate-950 text-white select-none overflow-y-auto font-sans">
                  {/* Top Status Bar with Dynamic Island spacing */}
                  <div className="h-11 pt-3.5 px-6 flex justify-between items-center text-[11px] font-semibold text-slate-300 flex-shrink-0">
                    <span>9:41</span>
                    <div className="flex items-center space-x-1.5 text-xs">
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M12 3c-4.97 0-9 4.03-9 9 0 2.12.74 4.07 1.97 5.61L4.35 18.25c-.39.39-.39 1.02 0 1.41.39.39 1.02.39 1.41 0l.64-.64C7.93 20.26 9.88 21 12 21c4.97 0 9-4.03 9-9s-4.03-9-9-9z"/></svg>
                      <span>5G</span>
                      <div className="w-5 h-2.5 border border-slate-300 rounded-sm p-0.5 flex items-center">
                        <div className="w-full h-full bg-emerald-400 rounded-2xs"></div>
                      </div>
                    </div>
                  </div>

                  {/* Super App Brand Header & User Greeting */}
                  <div className="px-4 py-3 flex items-center justify-between flex-shrink-0">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-brand-600 via-indigo-600 to-purple-600 flex items-center justify-center text-white font-black text-sm shadow-lg shadow-brand-500/20">
                        SA
                      </div>
                      <div>
                        <div className="text-[10px] uppercase font-bold tracking-wider text-brand-400">Super App OneHub</div>
                        <div className="text-sm font-bold text-white flex items-center gap-1">
                          <span>Hi, {selectedUser === 'citizen' ? 'Sokha Chan' : selectedUser === 'merchant' ? 'ABA Merchant' : 'Guest'}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-[10px] bg-slate-900 text-slate-300 border border-slate-800 px-2.5 py-1 rounded-full flex items-center gap-1.5 shadow-sm">
                        <svg className="w-3 h-3 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                        <span>{selectedCity}</span>
                      </span>
                    </div>
                  </div>

                  {/* Search Bar */}
                  <div className="px-4 py-1.5 flex-shrink-0">
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl px-3.5 py-2 flex items-center space-x-2.5 text-xs text-slate-400 shadow-inner">
                      <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
                      <span className="text-slate-400 text-xs">Search services, payments, mini apps...</span>
                    </div>
                  </div>

                  {/* Digital Wallet Card */}
                  <div className="p-4 pt-2 flex-shrink-0">
                    <div className="bg-gradient-to-br from-indigo-950 via-purple-950/80 to-slate-900 border border-indigo-500/30 rounded-3xl p-4 shadow-xl relative overflow-hidden">
                      <div className="absolute top-0 right-0 -mt-4 -mr-4 w-28 h-28 bg-indigo-500/15 rounded-full blur-2xl pointer-events-none"></div>
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <span className="text-[10px] uppercase font-semibold text-indigo-300 tracking-wider">Super App Digital Wallet</span>
                          <div className="text-2xl font-black text-white mt-0.5 tracking-tight">$2,450.80</div>
                        </div>
                        <span className="px-2 py-0.5 bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold rounded-full">
                          ● Active Tier
                        </span>
                      </div>
                      <div className="grid grid-cols-4 gap-2 pt-2.5 border-t border-indigo-500/20 text-center">
                        <div className="flex flex-col items-center gap-1.5 text-[10px] text-slate-300">
                          <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center text-slate-200">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"/></svg>
                          </div>
                          <span>Scan QR</span>
                        </div>
                        <div className="flex flex-col items-center gap-1.5 text-[10px] text-slate-300">
                          <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center text-slate-200">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"/></svg>
                          </div>
                          <span>Transfer</span>
                        </div>
                        <div className="flex flex-col items-center gap-1.5 text-[10px] text-slate-300">
                          <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center text-slate-200">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z"/></svg>
                          </div>
                          <span>Pay Bill</span>
                        </div>
                        <div className="flex flex-col items-center gap-1.5 text-[10px] text-slate-300">
                          <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center text-slate-200">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"/></svg>
                          </div>
                          <span>Cards</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Featured Mini App Under Test Section */}
                  <div className="px-4 py-1.5 flex-shrink-0">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-white tracking-wide">Featured Mini App</span>
                        <span className="text-[9px] font-mono font-bold bg-purple-500/20 text-purple-300 border border-purple-500/40 px-1.5 py-0.5 rounded-full uppercase">
                          Testing Sandbox
                        </span>
                      </div>
                      <span className="text-[10px] text-brand-400 font-medium">Tap card to open</span>
                    </div>

                    {/* The Target Mini App Launcher Card */}
                    <button
                      type="button"
                      onClick={() => setCurrentScreen('miniapp')}
                      className="w-full text-left bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 hover:from-slate-800 hover:to-slate-850 border-2 border-brand-500/60 hover:border-brand-400 rounded-2xl p-3.5 shadow-lg shadow-brand-500/10 transition-all active:scale-98 group relative overflow-hidden"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-500 via-teal-500 to-cyan-500 flex items-center justify-center text-white text-xl font-black shadow-md flex-shrink-0">
                            {title.charAt(0) || 'M'}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <h4 className="text-sm font-bold text-white group-hover:text-brand-300 transition-colors truncate">
                                {title}
                              </h4>
                              <span className="px-1.5 py-0.5 text-[9px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded flex-shrink-0">
                                v{version}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-400 mt-0.5 truncate">
                              {category || 'WebView Mini App'} • Verified Integration
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-brand-600 group-hover:bg-brand-500 text-white text-xs font-bold shadow-sm transition-colors flex-shrink-0">
                          <span>Launch</span>
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"/></svg>
                        </div>
                      </div>
                    </button>
                  </div>

                  {/* Super App Ecosystem Services Grid */}
                  <div className="px-4 py-3 flex-1">
                    <div className="text-xs font-bold text-slate-300 mb-2.5">Super App Services Catalog</div>
                    <div className="grid grid-cols-4 gap-3 text-center">
                      {[
                        { 
                          label: 'Gov e-ID', 
                          bg: 'from-blue-600 to-indigo-600',
                          icon: <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2"/></svg>
                        },
                        { 
                          label: 'Transit', 
                          bg: 'from-amber-600 to-orange-600',
                          icon: <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h8m-8 4h8m-4 4v3m-5-3h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v9a2 2 0 002 2z"/></svg>
                        },
                        { 
                          label: 'Delivery', 
                          bg: 'from-rose-600 to-pink-600',
                          icon: <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"/></svg>
                        },
                        { 
                          label: 'Health', 
                          bg: 'from-emerald-600 to-teal-600',
                          icon: <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/></svg>
                        },
                        { 
                          label: 'Parking', 
                          bg: 'from-indigo-600 to-purple-600',
                          icon: <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17V7h4a3 3 0 110 6H9"/></svg>
                        },
                        { 
                          label: 'Cinema', 
                          bg: 'from-violet-600 to-fuchsia-600',
                          icon: <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z"/></svg>
                        },
                        { 
                          label: 'Utilities', 
                          bg: 'from-yellow-600 to-amber-600',
                          icon: <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
                        },
                        { 
                          label: 'More', 
                          bg: 'from-slate-800 to-slate-700',
                          icon: <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"/></svg>
                        },
                      ].map((svc, i) => (
                        <div key={i} className="flex flex-col items-center gap-1.5 text-[10px] text-slate-400">
                          <div className={`w-11 h-11 rounded-2xl bg-gradient-to-br ${svc.bg} flex items-center justify-center shadow-sm`}>
                            {svc.icon}
                          </div>
                          <span className="truncate w-full text-[10px] font-medium">{svc.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Super App Bottom Dock */}
                  <div className="mt-auto border-t border-slate-800/80 bg-slate-900/95 backdrop-blur px-6 py-2 flex justify-between items-center text-[10px] flex-shrink-0">
                    <div className="flex flex-col items-center text-brand-400 font-bold">
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>
                      <span>Home</span>
                    </div>
                    <div className="flex flex-col items-center text-slate-400">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"/></svg>
                      <span>Services</span>
                    </div>
                    <div className="flex flex-col items-center -mt-4">
                      <div className="w-11 h-11 rounded-full bg-brand-600 text-white flex items-center justify-center shadow-lg shadow-brand-600/50">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"/></svg>
                      </div>
                      <span className="text-[10px] text-slate-400 mt-0.5">Scan</span>
                    </div>
                    <div className="flex flex-col items-center text-slate-400">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"/></svg>
                      <span>Wallet</span>
                    </div>
                    <div className="flex flex-col items-center text-slate-400">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
                      <span>Me</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="w-full h-full relative z-10 flex flex-col bg-white dark:bg-slate-900">
                  {/* Super App In-App Browser Bar */}
                  <div className="h-12 bg-slate-900 border-b border-slate-800 text-white px-3 flex items-center justify-between z-20 flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => setCurrentScreen('home')}
                      className="flex items-center gap-1.5 text-xs text-brand-400 hover:text-brand-300 font-semibold px-2 py-1 rounded-lg hover:bg-slate-800 transition-colors"
                      title="Return to Super App Home Screen"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"/></svg>
                      <span>Home</span>
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
                        onClick={() => setCurrentScreen('home')}
                        className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-slate-800"
                        title="Close Mini App"
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

        {/* Right Side: Simulation Control Drawer & Live Event Inspector */}
        {showInspector && (
          <aside className="w-80 md:w-96 bg-slate-900 border-l border-slate-800 flex flex-col z-20 text-xs shadow-2xl">
            
            {/* Simulation Sensor Controls */}
            <div className="p-4 border-b border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-bold uppercase tracking-wider text-indigo-400 text-[10px]">Super App Sensor Bridge</span>
                <span className="text-[10px] text-emerald-400 flex items-center gap-1 font-mono">● Emulation Online</span>
              </div>

              {/* NFC Sensor Emulation Button */}
              <div>
                <Label className="text-[11px] text-slate-300 mb-1.5 block">NFC Hardware Sensor</Label>
                <Button
                  type="button"
                  onClick={() => postToRunner('SIMULATE_NFC', {})}
                  className="w-full h-9 bg-indigo-600 hover:bg-indigo-700 active:scale-98 text-white rounded-xl font-semibold shadow-sm flex items-center justify-center space-x-2"
                >
                  <span>⚡ Simulate Contactless NFC Tap</span>
                </Button>
                <p className="text-[10px] text-slate-400 mt-1">Emulates reading an ISO-14443 contactless smart passport/chip.</p>
              </div>

              {/* Geolocation Mock */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-[11px] text-slate-300 mb-1 block">GPS Location</Label>
                  <select
                    value={selectedCity}
                    onChange={(e) => {
                      setSelectedCity(e.target.value);
                      postToRunner('SET_LOCATION', { city: e.target.value, lat: 11.5564, lng: 104.9282 });
                    }}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-1.5 text-slate-200 text-xs"
                  >
                    <option value="Phnom Penh">Phnom Penh</option>
                    <option value="Siem Reap">Siem Reap</option>
                    <option value="Tokyo">Tokyo</option>
                    <option value="Singapore">Singapore</option>
                  </select>
                </div>

                {/* Mock User Role */}
                <div>
                  <Label className="text-[11px] text-slate-300 mb-1 block">User Context</Label>
                  <select
                    value={selectedUser}
                    onChange={(e: any) => {
                      setSelectedUser(e.target.value);
                      const userMap = {
                        citizen: { id: 'FSA-8829', name: 'Sokha Chan', role: 'Verified Citizen' },
                        merchant: { id: 'MERCH-102', name: 'ABA Merchant', role: 'Merchant Partner' },
                        guest: { id: 'GUEST-001', name: 'Anonymous Guest', role: 'Guest' },
                      };
                      postToRunner('SET_USER', userMap[e.target.value as keyof typeof userMap]);
                    }}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-1.5 text-slate-200 text-xs"
                  >
                    <option value="citizen">Verified Citizen</option>
                    <option value="merchant">Merchant Admin</option>
                    <option value="guest">Guest</option>
                  </select>
                </div>
              </div>

              {/* Theme Mode Toggle */}
              <div className="flex items-center justify-between pt-1">
                <span className="text-[11px] text-slate-300 font-medium">Canvas Theme</span>
                <div className="flex bg-slate-800 rounded-lg p-0.5 border border-slate-700">
                  <button
                    onClick={() => {
                      setSimulatedTheme('light');
                      postToRunner('SET_THEME', { theme: 'light' });
                    }}
                    className={`px-2.5 py-1 rounded text-[10px] font-semibold ${
                      simulatedTheme === 'light' ? 'bg-indigo-600 text-white' : 'text-slate-400'
                    }`}
                  >
                    Light
                  </button>
                  <button
                    onClick={() => {
                      setSimulatedTheme('dark');
                      postToRunner('SET_THEME', { theme: 'dark' });
                    }}
                    className={`px-2.5 py-1 rounded text-[10px] font-semibold ${
                      simulatedTheme === 'dark' ? 'bg-indigo-600 text-white' : 'text-slate-400'
                    }`}
                  >
                    Dark
                  </button>
                </div>
              </div>
            </div>

            {/* Live Bridge Event Stream */}
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="p-3 bg-slate-950/60 border-b border-slate-800 flex items-center justify-between">
                <span className="font-bold text-[10px] uppercase tracking-wider text-slate-400">Live Bridge Event Stream</span>
                <button
                  onClick={() => setEventLogs([])}
                  className="text-[10px] text-slate-500 hover:text-slate-300"
                >
                  Clear
                </button>
              </div>

              <div className="flex-1 p-3 overflow-y-auto space-y-2 font-mono text-[11px]">
                {eventLogs.length === 0 ? (
                  <div className="text-center py-10 text-slate-600">
                    <span>No bridge events recorded yet.</span>
                    <p className="text-[10px] mt-1 text-slate-700">Interact with the mini app canvas to inspect live messages.</p>
                  </div>
                ) : (
                  eventLogs.map((log) => (
                    <div
                      key={log.id}
                      className="p-2.5 rounded-lg bg-slate-950 border border-slate-800/80 text-slate-300 animate-fade-in"
                    >
                      <div className="flex items-center justify-between text-[10px] text-slate-500 mb-1">
                        <span className="font-bold text-indigo-400">{log.type}</span>
                        <span>{log.timestamp}</span>
                      </div>
                      <pre className="overflow-x-auto text-[10px] text-emerald-400 bg-slate-900/80 p-1.5 rounded">
                        {JSON.stringify(log.payload, null, 2)}
                      </pre>
                    </div>
                  ))
                )}
              </div>
            </div>

          </aside>
        )}

      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
