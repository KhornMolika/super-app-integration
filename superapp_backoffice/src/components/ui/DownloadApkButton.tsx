'use client';

import React, { useState } from 'react';
import DownloadApkModal from './DownloadApkModal';
import { DevicePhoneIcon, DownloadIcon } from '@/components/ui/Icons';

export function DownloadApkButton() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="group inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-semibold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 transition-all duration-200 shadow-2xs cursor-pointer shrink-0"
        title="Download Super App Mobile APK & Scan QR Code"
      >
        <DevicePhoneIcon className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform" />
        <span className="font-semibold tracking-tight"><span className="hidden xl:inline">Download </span>APK</span>
        <DownloadIcon className="w-3 h-3 text-emerald-500/70" />
      </button>

      <DownloadApkModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}

export default DownloadApkButton;
