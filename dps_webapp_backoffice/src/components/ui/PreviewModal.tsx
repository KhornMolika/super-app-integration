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
  isFlutter = false,
}: PreviewModalProps) {
  const [device, setDevice] = useState<DeviceType>('iPhone 16 Pro');
  const [orientation, setOrientation] = useState<Orientation>('Portrait');
  const [zoom, setZoom] = useState(100);
  const [customDimensions, setCustomDimensions] = useState({ width: 800, height: 600 });
  const [reloadKey, setReloadKey] = useState(0);
  const [mounted, setMounted] = useState(false);
  
  // Simulator State
  const [showInspector, setShowInspector] = useState(true);
  const [eventLogs, setEventLogs] = useState<BridgeEventLog[]>([]);
  const [selectedUser, setSelectedUser] = useState<'citizen' | 'merchant' | 'guest'>('citizen');
  const [selectedCity, setSelectedCity] = useState('Phnom Penh');
  const [simulatedTheme, setSimulatedTheme] = useState<'light' | 'dark'>('light');
  
  const previewAreaRef = useRef<HTMLDivElement>(null);
  const [autoScale, setAutoScale] = useState(1);
  const [containerSize, setContainerSize] = useState({ width: 1024, height: 768 });

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

          {/* Toggle Inspector Drawer */}
          <Button
            variant="outline"
            onClick={() => setShowInspector(!showInspector)}
            className={`h-8 px-3 text-xs font-medium border-slate-700 ${
              showInspector ? 'bg-indigo-600/30 text-indigo-300 border-indigo-500/40' : 'text-slate-400 hover:text-white'
            }`}
          >
            <span>⚡ Controls & Logs</span>
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

              {/* Sandboxed Iframe Engine */}
              <div className="w-full h-full relative z-10 bg-white dark:bg-slate-900">
                <IframePreviewEngine url={effectiveUrl} reloadKey={reloadKey} />
              </div>
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
