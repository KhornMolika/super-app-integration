'use client';

import React, { useState, useEffect } from 'react';
import { toast } from '@/components/ui/Toast';
import { miniappsApi, telegramApi } from '@/api';

export interface InviteDownloadModalProps {
  isOpen: boolean;
  onClose: () => void;
  miniAppId: string;
  miniAppName: string;
  appId?: string;
  version?: string;
  buildType?: 'test' | 'release';
  teamTelegramChatId?: string;
}

export default function InviteDownloadModal({
  isOpen,
  onClose,
  miniAppId,
  miniAppName,
  appId,
  version = 'v1.0.0',
  buildType = 'test',
  teamTelegramChatId,
}: InviteDownloadModalProps) {
  const [expiresIn, setExpiresIn] = useState<'24h' | '7d' | '30d' | 'until_new_version'>('7d');
  const [inviteToken, setInviteToken] = useState<string>('');
  const [expiresAt, setExpiresAt] = useState<string>('');
  const [loadingToken, setLoadingToken] = useState<boolean>(false);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [sendingTelegram, setSendingTelegram] = useState<boolean>(false);

  // Generate invite token when modal opens or expiration duration changes
  const generateToken = async (exp: string) => {
    if (!miniAppId) return;
    setLoadingToken(true);
    try {
      const data = await miniappsApi.getInviteToken(miniAppId, exp);
      setInviteToken(data.token || '');
      setExpiresAt(data.expiresAt || '');
    } catch (err) {
      console.error('Failed to generate invite token:', err);
    } finally {
      setLoadingToken(false);
    }
  };

  useEffect(() => {
    if (isOpen && miniAppId) {
      generateToken(expiresIn);
    }
  }, [isOpen, miniAppId, expiresIn]);

  if (!isOpen) return null;

  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const downloadPath = `/api/mini-apps/${miniAppId}/artifacts/${buildType === 'release' ? 'release-apk' : 'test-apk'}?version=${encodeURIComponent(version)}${inviteToken ? `&token=${encodeURIComponent(inviteToken)}` : ''}`;
  const fullDownloadUrl = `${origin}${downloadPath}`;

  // QR Code Image Generator via standard public QR generator endpoint (or SVG renderer)
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(fullDownloadUrl)}&color=0f172a&bgcolor=f8fafc&margin=2`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(fullDownloadUrl);
    setCopiedLink(true);
    toast.success('Tester invite & download link copied to clipboard!', 'Link Copied');
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleDirectDownload = () => {
    window.open(fullDownloadUrl, '_blank');
    toast.info(`Starting download of ${miniAppName} ${version} APK...`, 'Download Started');
  };

  const handleSendTelegramBroadcast = async () => {
    if (!teamTelegramChatId) {
      toast.warning('No Team Telegram Group is connected for this Mini App. Please configure it in Settings or Mini App details.', 'No Channel Configured');
      return;
    }

    setSendingTelegram(true);
    try {
      const msg = `🚀 <b>New Build Ready for Testing</b>\n\n📱 <b>Mini App:</b> ${miniAppName}\n🏷️ <b>Version:</b> ${version} (${buildType.toUpperCase()})\n⏳ <b>Invite Link Validity:</b> ${expiresIn.toUpperCase()}\n\n🔗 <a href="${fullDownloadUrl}">Tap to Download APK</a>\n\n<i>Scan QR or click link above to install directly on physical test devices.</i>`;
      const data = await telegramApi.testTeamAlert(teamTelegramChatId, `${miniAppName} (${version})`, msg);
      if (data?.success) {
        toast.success(`Tester invite broadcast delivered to Telegram group (${teamTelegramChatId})!`, 'Invite Broadcast Sent');
      } else {
        toast.error('Failed to send Telegram invite broadcast. Check bot permissions.', 'Broadcast Failed');
      }
    } catch (err: any) {
      toast.error(err.message || 'Network error sending invite broadcast.', 'Network Error');
    } finally {
      setSendingTelegram(false);
    }
  };

  const formatExpiryDisplay = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      return d.toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/30">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl ${buildType === 'release' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' : 'bg-brand-500/10 text-brand-600 dark:text-brand-400 border border-brand-500/20'}`}>
              {buildType === 'release' ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                </svg>
              )}
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <span>Invite Testers &amp; Download APK</span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-bold uppercase ${buildType === 'release' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300' : 'bg-brand-100 text-brand-800 dark:bg-brand-950/50 dark:text-brand-300'}`}>
                  {version}
                </span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Share a secure, authenticated download package for <strong className="text-slate-700 dark:text-slate-200">{miniAppName}</strong>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          {/* 1. Token Expiration Selector */}
          <div>
            <label className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-2">
              <span className="flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5 text-brand-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Tester Invite Token Validity:</span>
              </span>
              {expiresAt && (
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold normal-case">
                  Expires: {formatExpiryDisplay(expiresAt)}
                </span>
              )}
            </label>

            <div className="grid grid-cols-4 gap-2">
              {[
                { key: '24h', label: '24 Hours', desc: 'Quick Test' },
                { key: '7d', label: '7 Days', desc: 'Recommended' },
                { key: '30d', label: '30 Days', desc: 'Extended Beta' },
                { key: 'until_new_version', label: 'Next Version', desc: 'Auto-Invalidate' },
              ].map((opt) => (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => setExpiresIn(opt.key as any)}
                  className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-center transition-all ${
                    expiresIn === opt.key
                      ? 'border-brand-500 bg-brand-50/50 dark:bg-brand-950/30 text-brand-700 dark:text-brand-300 ring-2 ring-brand-500/20 shadow-sm'
                      : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                  }`}
                >
                  <span className="text-xs font-bold">{opt.label}</span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400">{opt.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 2. QR Code & Direct Scan */}
          <div className="flex flex-col sm:flex-row items-center gap-6 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60">
            <div className="relative p-2.5 bg-white rounded-xl shadow-md border border-slate-200/70 dark:border-slate-700 flex-shrink-0">
              <img
                src={qrCodeUrl}
                alt="Scan to Download APK"
                className="w-36 h-36 object-contain rounded-lg"
              />
              <div className="absolute -bottom-2 -right-2 p-1 rounded-full bg-brand-600 text-white shadow-md">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                </svg>
              </div>
            </div>

            <div className="space-y-3 flex-1 text-center sm:text-left">
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center justify-center sm:justify-start gap-1.5">
                  <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                  <span>Scan with Physical Android Device</span>
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Point your Android camera or barcode scanner at the QR code to initiate direct package installation without copying URLs.
                </p>
              </div>

              <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
                <button
                  type="button"
                  onClick={handleDirectDownload}
                  className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-xl bg-brand-600 hover:bg-brand-700 text-white shadow-sm hover:shadow transition-all"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  <span>Direct Download APK</span>
                </button>
              </div>
            </div>
          </div>

          {/* 3. Shareable Secure Link */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
              <span>Shareable Signed Download Link:</span>
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={fullDownloadUrl}
                className="w-full text-xs font-mono px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-950 text-slate-700 dark:text-slate-300 focus:outline-none select-all"
              />
              <button
                type="button"
                onClick={handleCopyLink}
                className={`flex-shrink-0 inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold border transition-all ${
                  copiedLink
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
                }`}
              >
                {copiedLink ? (
                  <>
                    <svg className="w-4 h-4 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                    </svg>
                    <span>Copy Link</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* 4. Telegram Team Channel Broadcast */}
          <div className="p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-gradient-to-r from-sky-50/50 to-indigo-50/30 dark:from-sky-950/20 dark:to-indigo-950/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-sky-500 text-white shadow-sm flex-shrink-0">
                <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z"/>
                </svg>
              </div>
              <div>
                <h5 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Broadcast to Telegram Channel
                </h5>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {teamTelegramChatId
                    ? `Registered channel: ${teamTelegramChatId}`
                    : 'Dispatch build notification with 1-click test link directly to testers.'}
                </p>
              </div>
            </div>

            <button
              type="button"
              disabled={sendingTelegram || !teamTelegramChatId}
              onClick={handleSendTelegramBroadcast}
              className={`flex-shrink-0 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm ${
                !teamTelegramChatId
                  ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed border border-slate-200 dark:border-slate-700'
                  : 'bg-sky-600 hover:bg-sky-700 text-white shadow-sky-600/20 hover:shadow-sky-600/30'
              }`}
            >
              {sendingTelegram ? (
                <>
                  <svg className="w-4 h-4 animate-spin text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                  </svg>
                  <span>Sending...</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                  <span>Send Broadcast</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
          <span className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
            <svg className="w-3.5 h-3.5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <span>Nexus Protected Streaming Proxy</span>
          </span>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
