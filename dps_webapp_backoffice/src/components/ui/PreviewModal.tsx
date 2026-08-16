"use client";

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Button } from './inputs';
import IframePreviewEngine from './IframePreviewEngine';

export type DeviceType = 
  | 'Responsive' | 'Custom' 
  | 'iPhone 17 Pro' | 'iPhone 16 Pro' | 'iPhone 15 Pro' | 'iPhone SE' | 'Galaxy Z Fold' | 'Galaxy S25 Ultra' | 'Galaxy S23'
  | 'iPad Pro 11"' | 'iPad Pro 13"' 
  | 'Laptop 13"' | 'Laptop 14"' | 'Laptop 15"' | 'Laptop 16"';
export type Orientation = 'Portrait' | 'Landscape';

interface PreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  url: string;
  title?: string;
}

const DEVICE_DIMENSIONS = {
  'iPhone 17 Pro': { width: 402, height: 874, type: 'Phone' },
  'iPhone 16 Pro': { width: 402, height: 874, type: 'Phone' },
  'iPhone 15 Pro': { width: 393, height: 852, type: 'Phone' },
  'iPhone SE': { width: 375, height: 667, type: 'Phone' },
  'Galaxy Z Fold': { width: 884, height: 1064, type: 'Phone' },
  'Galaxy S25 Ultra': { width: 412, height: 915, type: 'Phone' },
  'Galaxy S23': { width: 360, height: 780, type: 'Phone' },
  'iPad Pro 11"': { width: 834, height: 1194, type: 'iPad' },
  'iPad Pro 13"': { width: 1024, height: 1366, type: 'iPad' },
  'Laptop 13"': { width: 1280, height: 800, type: 'Laptop' },
  'Laptop 14"': { width: 1512, height: 982, type: 'Laptop' },
  'Laptop 15"': { width: 1440, height: 900, type: 'Laptop' },
  'Laptop 16"': { width: 1728, height: 1117, type: 'Laptop' },
};

export default function PreviewModal({ isOpen, onClose, url, title = 'Mini App' }: PreviewModalProps) {
  const [device, setDevice] = useState<DeviceType>('Responsive');
  const [orientation, setOrientation] = useState<Orientation>('Portrait');
  const [zoom, setZoom] = useState(100);
  const [customDimensions, setCustomDimensions] = useState({ width: 800, height: 600 });
  const [reloadKey, setReloadKey] = useState(0);
  const [mounted, setMounted] = useState(false);
  
  const previewAreaRef = React.useRef<HTMLDivElement>(null);
  const [autoScale, setAutoScale] = useState(1);
  const [containerSize, setContainerSize] = useState({ width: 1024, height: 768 });

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
          const padding = 64; // p-8 (32px * 2)
          const availableW = clientWidth - padding;
          const availableH = clientHeight - padding;
          
          const scaleX = availableW / viewport.width;
          const scaleY = availableH / viewport.height;
          
          // Fit scale ensures it never overflows when zoom is 100%
          const fitScale = Math.min(scaleX, scaleY); 
          setAutoScale(fitScale);
        }
      }
    };
    
    // Initial and on resize
    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, [device, orientation, customDimensions, viewport.width, viewport.height]);

  const effectiveScale = device === 'Responsive' ? 1 : autoScale * (zoom / 100);

  if (!mounted || !isOpen) return null;

  const modalContent = (
    <div className="fixed inset-0 z-[9999] flex flex-col bg-slate-900/95 backdrop-blur-sm">
      {/* Header / Toolbar */}
      <div className="flex flex-wrap items-center justify-between p-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-sm text-slate-800 dark:text-slate-200">
        <div className="flex items-center space-x-6">
          <div className="flex items-center space-x-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-brand-100 text-brand-600 dark:bg-brand-900/30 dark:text-brand-400">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
            </div>
            <div>
              <h3 className="font-semibold text-slate-800 dark:text-slate-100">{title} Preview</h3>
              <p className="text-xs text-slate-500 font-mono truncate max-w-[200px]">{url}</p>
            </div>
          </div>

          <div className="h-6 w-px bg-slate-200 dark:bg-slate-700 hidden md:block"></div>

          <div className="hidden md:flex items-center space-x-2">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider mr-1">Device</span>
            {['Responsive', 'Laptop', 'iPad', 'Phone', 'Custom'].map(cat => {
              const isActive = activeDeviceType === cat;
              return (
                <button
                  key={cat}
                  onClick={() => {
                    if (cat === 'Laptop') setDevice('Laptop 13"');
                    else if (cat === 'iPad') setDevice('iPad Pro 13"');
                    else if (cat === 'Phone') setDevice('iPhone 15 Pro');
                    else setDevice(cat as DeviceType);
                  }}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${isActive ? 'bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900' : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'}`}
                >
                  {cat}
                </button>
              );
            })}

            {activeDeviceType === 'Laptop' && (
              <div className="flex items-center ml-2 bg-slate-100 dark:bg-slate-800/50 rounded-md p-1 space-x-1">
                {['Laptop 13"', 'Laptop 14"', 'Laptop 15"', 'Laptop 16"'].map(d => (
                  <button
                    key={d}
                    onClick={() => setDevice(d as DeviceType)}
                    className={`px-2 py-1 text-[10px] font-medium rounded-sm transition-all ${device === d ? 'bg-white shadow-sm text-slate-800 dark:bg-slate-700 dark:text-white' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'}`}
                  >
                    {d.replace('Laptop ', '')}
                  </button>
                ))}
              </div>
            )}

            {activeDeviceType === 'iPad' && (
              <div className="flex items-center ml-2 bg-slate-100 dark:bg-slate-800/50 rounded-md p-1 space-x-1">
                {['iPad Pro 11"', 'iPad Pro 13"'].map(d => (
                  <button
                    key={d}
                    onClick={() => setDevice(d as DeviceType)}
                    className={`px-2 py-1 text-[10px] font-medium rounded-sm transition-all ${device === d ? 'bg-white shadow-sm text-slate-800 dark:bg-slate-700 dark:text-white' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'}`}
                  >
                    {d.includes('11"') ? '11"' : '13"'}
                  </button>
                ))}
              </div>
            )}

            {activeDeviceType === 'Phone' && (
              <div className="flex items-center ml-2 bg-slate-100 dark:bg-slate-800/50 rounded-md p-1 space-x-1">
                {['iPhone 17 Pro', 'iPhone 16 Pro', 'iPhone 15 Pro', 'iPhone SE', 'Galaxy Z Fold', 'Galaxy S25 Ultra', 'Galaxy S23'].map(d => (
                  <button
                    key={d}
                    onClick={() => setDevice(d as DeviceType)}
                    className={`px-2 py-1 text-[10px] font-medium rounded-sm transition-all ${device === d ? 'bg-white shadow-sm text-slate-800 dark:bg-slate-700 dark:text-white' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'}`}
                  >
                    {d.replace('iPhone ', '').replace('Galaxy ', '')}
                  </button>
                ))}
              </div>
            )}
          </div>

          {(activeDeviceType === 'iPad' || activeDeviceType === 'Phone') && (
            <>
              <div className="h-6 w-px bg-slate-200 dark:bg-slate-700 hidden md:block"></div>
              <div className="hidden md:flex items-center space-x-2">
                <span className="text-xs font-medium text-slate-500 uppercase tracking-wider mr-1">Orient</span>
                <button
                  onClick={() => setOrientation(orientation === 'Portrait' ? 'Landscape' : 'Portrait')}
                  className="px-3 py-1.5 text-xs font-medium rounded-md bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 transition-colors flex items-center"
                >
                  <svg className="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                  {orientation}
                </button>
              </div>
            </>
          )}

          {device === 'Custom' && (
            <>
              <div className="h-6 w-px bg-slate-200 dark:bg-slate-700 hidden md:block"></div>
              <div className="hidden md:flex items-center space-x-2">
                <input 
                  type="number" 
                  value={customDimensions.width}
                  onChange={e => setCustomDimensions({ ...customDimensions, width: parseInt(e.target.value) || 800 })}
                  className="w-16 px-2 py-1 text-xs border rounded dark:bg-slate-800 dark:border-slate-700" 
                />
                <span className="text-slate-400 text-xs">×</span>
                <input 
                  type="number" 
                  value={customDimensions.height}
                  onChange={e => setCustomDimensions({ ...customDimensions, height: parseInt(e.target.value) || 600 })}
                  className="w-16 px-2 py-1 text-xs border rounded dark:bg-slate-800 dark:border-slate-700" 
                />
              </div>
            </>
          )}
        </div>

        <div className="flex items-center space-x-4 mt-4 w-full md:w-auto md:mt-0 justify-between md:justify-end">
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5">
            <button onClick={handleZoomOut} className="p-1.5 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 rounded-md hover:bg-white dark:hover:bg-slate-700 transition-all">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 12H4" /></svg>
            </button>
            <button onClick={handleZoomReset} className="px-3 py-1 text-xs font-medium text-slate-700 dark:text-slate-300 w-14 text-center hover:bg-white dark:hover:bg-slate-700 rounded-md transition-all">
              {zoom}%
            </button>
            <button onClick={handleZoomIn} className="p-1.5 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 rounded-md hover:bg-white dark:hover:bg-slate-700 transition-all">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
            </button>
          </div>

          <div className="flex items-center space-x-2 border-l border-slate-200 dark:border-slate-700 pl-4 ml-2">
            <Button variant="outline" onClick={handleReload} className="!p-1.5 h-8 w-8 flex items-center justify-center text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white" title="Reload Frame">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
            </Button>
            <Button onClick={onClose} className="!p-1.5 h-8 w-8 flex items-center justify-center bg-slate-800 text-white hover:bg-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 !shadow-none rounded-full" title="Close Preview">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
            </Button>
          </div>
        </div>
      </div>

      {/* Preview Area */}
      <div 
        ref={previewAreaRef}
        className={`flex-1 overflow-auto bg-slate-100 dark:bg-slate-950 flex relative ${device === 'Responsive' ? 'p-0' : 'p-8'}`}
      >
        {/* Layout footprint wrapper */}
        <div 
          className={`relative m-auto ${device === 'Responsive' ? 'w-full h-full' : ''}`}
          style={device === 'Responsive' ? undefined : { 
            width: (viewport.width as number) * effectiveScale, 
            height: (viewport.height as number) * effectiveScale 
          }}
        >
          {/* Scaled Device Frame */}
          <div 
            className={`transition-all duration-300 ease-out ${
              device === 'Responsive' ? 'w-full h-full relative overflow-hidden bg-white dark:bg-slate-900' :
              activeDeviceType === 'Phone' ? 'shadow-2xl rounded-[3rem] ring-[12px] ring-slate-800 dark:ring-slate-800 absolute top-0 left-0 overflow-hidden bg-white dark:bg-slate-900' :
              activeDeviceType === 'iPad' ? 'shadow-2xl rounded-[2rem] ring-[16px] ring-slate-800 dark:ring-slate-800 absolute top-0 left-0 overflow-hidden bg-white dark:bg-slate-900' :
              activeDeviceType === 'Laptop' ? 'absolute top-0 left-0' :
              'shadow-2xl ring-1 ring-slate-300 dark:ring-slate-700 absolute top-0 left-0 overflow-hidden bg-white dark:bg-slate-900'
            }`}
            style={device === 'Responsive' ? undefined : { 
              width: viewport.width, 
              height: viewport.height,
              transform: `scale(${effectiveScale})`,
              transformOrigin: 'top left'
            }}
          >
            {activeDeviceType === 'Laptop' ? (
              <div className="w-full h-full relative">
                 {/* Screen Bezel */}
                 <div className="w-full h-full rounded-t-2xl ring-[16px] ring-[#1a1a1a] dark:ring-black overflow-hidden relative bg-white dark:bg-slate-900 border-b-[24px] border-[#1a1a1a] dark:border-black flex flex-col z-10">
                    {/* Browser Header */}
                    <div className="h-12 bg-[#f6f6f6] dark:bg-[#2d2d2d] border-b border-slate-200 dark:border-black/50 flex items-center px-4 space-x-3 w-full shrink-0">
                      <div className="flex space-x-2">
                        <div className="w-3 h-3 rounded-full bg-[#ff5f56] border border-[#e0443e]"></div>
                        <div className="w-3 h-3 rounded-full bg-[#ffbd2e] border border-[#dea123]"></div>
                        <div className="w-3 h-3 rounded-full bg-[#27c93f] border border-[#1aab29]"></div>
                      </div>
                      <div className="mx-auto flex-1 max-w-xl bg-white dark:bg-[#1c1c1c] rounded-md h-7 px-3 flex items-center justify-center text-[11px] text-slate-500 font-sans shadow-sm border border-slate-200/50 dark:border-white/5">
                        <svg className="w-3.5 h-3.5 mr-2 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4" /></svg>
                        {url}
                      </div>
                      <div className="w-12"></div> {/* Spacer to balance the traffic lights */}
                    </div>
                    {/* The Engine */}
                    <div className="flex-1 w-full relative">
                      <IframePreviewEngine url={url} reloadKey={reloadKey} />
                    </div>
                 </div>
                 {/* Logo on Bezel */}
                 <div className="absolute bottom-1.5 left-0 right-0 text-center pointer-events-none z-20">
                    <span className="text-[10px] text-[#666] dark:text-[#555] font-semibold tracking-[0.2em]">MacBook Pro</span>
                 </div>
                 {/* Laptop Base Stand */}
                 <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 w-[115%] h-6 bg-gradient-to-b from-[#2a2a2a] to-[#111] dark:from-[#1a1a1a] dark:to-black rounded-b-3xl shadow-[0_20px_25px_-5px_rgba(0,0,0,0.5)] z-0 flex justify-center border-t border-[#3a3a3a] dark:border-[#2a2a2a]">
                    <div className="w-32 h-1.5 bg-[#0a0a0a] dark:bg-black rounded-b-xl shadow-inner mt-px border-b border-white/5"></div>
                 </div>
              </div>
            ) : (
              <>
                {/* Phone Notch */}
                {activeDeviceType === 'Phone' && orientation === 'Portrait' && (
                  <div className="absolute top-0 inset-x-0 h-6 flex justify-center z-20 pointer-events-none">
                    <div className="w-32 h-6 bg-slate-800 rounded-b-3xl"></div>
                  </div>
                )}
                {/* The Engine */}
                <div className="w-full h-full relative z-10">
                  <IframePreviewEngine url={url} reloadKey={reloadKey} />
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
