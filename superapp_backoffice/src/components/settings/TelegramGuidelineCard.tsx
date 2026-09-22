'use client';

import React from 'react';
import { Card } from '@/components/ui/card';

interface TelegramGuidelineCardProps {
  role: string;
  telegramStatus: any;
  activeGuideTab: 'botfather' | 'group' | 'personal';
  setActiveGuideTab: (tab: 'botfather' | 'group' | 'personal') => void;
}

export function TelegramGuidelineCard({
  role,
  telegramStatus,
  activeGuideTab,
  setActiveGuideTab,
}: TelegramGuidelineCardProps) {
  const isSuperAdminOrAdmin = role === 'SUPER_ADMIN' || role === 'ADMIN';

  return (
    <Card className="p-6 sm:p-8 border-brand-200 dark:border-brand-900/60 bg-gradient-to-br from-white to-brand-50/30 dark:from-slate-900 dark:to-brand-950/20">
      <div className="flex items-center gap-3.5 pb-5 border-b border-slate-200/80 dark:border-slate-800">
        <div className="w-12 h-12 rounded-xl bg-brand-500/10 text-brand-600 dark:text-brand-400 flex items-center justify-center shrink-0">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <div>
          <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">
            Setup Guideline: How to Connect Telegram &amp; Find IDs
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Troubleshooting guide for bot group permissions, personal chat IDs, and team group IDs.
          </p>
        </div>
      </div>

      {/* Guide Selector Tabs */}
      <div className="flex flex-wrap gap-2.5 pt-5">
        <button
          type="button"
          onClick={() => setActiveGuideTab('group')}
          className={`px-4 py-2 rounded-xl text-sm font-bold transition-colors flex items-center gap-2 ${
            activeGuideTab === 'group'
              ? 'bg-brand-600 text-white shadow-sm'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
          }`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
            />
          </svg>
          <span>1. Find Team Group ID (-100...)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveGuideTab('personal')}
          className={`px-4 py-2 rounded-xl text-sm font-bold transition-colors flex items-center gap-2 ${
            activeGuideTab === 'personal'
              ? 'bg-brand-600 text-white shadow-sm'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
          }`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
            />
          </svg>
          <span>2. Find Personal 1-on-1 Chat ID</span>
        </button>

        {isSuperAdminOrAdmin && (
          <button
            type="button"
            onClick={() => setActiveGuideTab('botfather')}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-colors flex items-center gap-2 ${
              activeGuideTab === 'botfather'
                ? 'bg-brand-600 text-white shadow-sm'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
              />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span>3. Admin Bot Settings (BotFather)</span>
          </button>
        )}
      </div>

      {/* Guide Tab Contents */}
      <div className="mt-5 p-5 rounded-2xl bg-white/80 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 text-sm sm:text-base leading-relaxed space-y-4">
        {activeGuideTab === 'group' && (
          <div className="space-y-4">
            <div className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2 text-base">
              <svg className="w-5 h-5 text-brand-600 dark:text-brand-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>How to Get your Team Telegram Group ID (-100...):</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Method 1: Built-in 1-Click Auto-Detect */}
              <div className="p-4 bg-brand-50/70 dark:bg-brand-950/40 rounded-2xl border border-brand-200 dark:border-brand-800/80 space-y-3 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between gap-2 pb-2 border-b border-brand-200/60 dark:border-brand-800/60">
                    <div className="flex items-center gap-2 font-bold text-brand-900 dark:text-brand-200 text-sm">
                      <svg className="w-4 h-4 text-brand-600 dark:text-brand-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      <span>Method 1: Built-in 1-Click Auto-Detect</span>
                    </div>
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-brand-200/80 dark:bg-brand-900/80 text-brand-800 dark:text-brand-200">
                      Fastest &amp; No extra bots
                    </span>
                  </div>

                  <ol className="mt-3 space-y-2 text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                    <li className="flex items-start gap-2">
                      <span className="flex items-center justify-center w-5 h-5 rounded-full bg-brand-200 dark:bg-brand-900 text-brand-800 dark:text-brand-200 font-bold text-xs shrink-0 mt-0.5">
                        1
                      </span>
                      <span>
                        Add <strong>@{telegramStatus?.botUsername || 'superapp_notification_bot'}</strong> into your Telegram group.
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="flex items-center justify-center w-5 h-5 rounded-full bg-brand-200 dark:bg-brand-900 text-brand-800 dark:text-brand-200 font-bold text-xs shrink-0 mt-0.5">
                        2
                      </span>
                      <span>
                        Type any message (e.g. <code>hi</code> or <code>/start</code>) inside the group.
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="flex items-center justify-center w-5 h-5 rounded-full bg-brand-200 dark:bg-brand-900 text-brand-800 dark:text-brand-200 font-bold text-xs shrink-0 mt-0.5">
                        3
                      </span>
                      <span>
                        Click the <strong>&quot;Auto-Detect Group ID from Bot&quot;</strong> button above.
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="flex items-center justify-center w-5 h-5 rounded-full bg-brand-200 dark:bg-brand-900 text-brand-800 dark:text-brand-200 font-bold text-xs shrink-0 mt-0.5">
                        4
                      </span>
                      <span>
                        Click <strong>&quot;Use This ID&quot;</strong> and tap <strong>Save Group ID</strong>!
                      </span>
                    </li>
                  </ol>
                </div>
              </div>

              {/* Method 2: From Telegram Web */}
              <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-200 dark:border-slate-800">
                    <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-slate-200 text-sm">
                      <svg className="w-4 h-4 text-slate-600 dark:text-slate-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                      </svg>
                      <span>Method 2: From Telegram Web (Browser URL)</span>
                    </div>
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-200/80 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      Browser
                    </span>
                  </div>

                  <ol className="mt-3 space-y-2 text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                    <li className="flex items-start gap-2">
                      <span className="flex items-center justify-center w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs shrink-0 mt-0.5">
                        1
                      </span>
                      <span>
                        Open <strong>web.telegram.org</strong> in your web browser and click on your group.
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="flex items-center justify-center w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs shrink-0 mt-0.5">
                        2
                      </span>
                      <span>
                        Check the browser address bar: <code>web.telegram.org/k/#-1002345678901</code>.
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="flex items-center justify-center w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs shrink-0 mt-0.5">
                        3
                      </span>
                      <span>
                        Copy the number starting with <code>-100...</code> and paste it into the Group ID input.
                      </span>
                    </li>
                  </ol>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeGuideTab === 'personal' && (
          <div className="space-y-3">
            <div className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2 text-base">
              <span>How to Get your Personal 1-on-1 Chat ID:</span>
            </div>
            <ul className="list-disc list-inside space-y-2 text-slate-700 dark:text-slate-300 ml-1 text-sm sm:text-base">
              <li>
                <strong>Instant 1-Click Method:</strong> Click the blue <strong>1-Click Connect with Telegram</strong> button above. When Telegram opens, press <strong>START</strong> and then click <strong>Check &amp; Sync Connection</strong>.
              </li>
              <li>
                <strong>Manual Lookup Method:</strong> Search for <strong>@userinfobot</strong> in Telegram and tap Start. It will reply with your personal <code>Id: xxxxxxxxxx</code>. Copy that number and paste it into manual entry.
              </li>
            </ul>
          </div>
        )}

        {activeGuideTab === 'botfather' && isSuperAdminOrAdmin && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 font-bold text-base">
              <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              <span>Fix &quot;This bot can&apos;t be added to groups&quot; Error:</span>
            </div>
            <ol className="list-decimal list-inside space-y-2 text-slate-700 dark:text-slate-300 ml-1 text-sm sm:text-base">
              <li>In Telegram search, open <strong>@BotFather</strong>.</li>
              <li>Send the command <code>/mybots</code> and choose your notification bot.</li>
              <li>Click <strong>Bot Settings</strong> → <strong>Allow Groups?</strong> (or <strong>Groups</strong>).</li>
              <li>Click <strong>Turn groups on</strong> (you will see &quot;Groups are currently enabled for this bot&quot;).</li>
              <li>
                <em>(Optional)</em> Under <strong>Bot Settings</strong> → <strong>Group Privacy</strong>, tap <strong>Turn off</strong> so the bot can receive commands in groups.
              </li>
              <li>Now you can immediately add the bot to any group without errors!</li>
            </ol>
          </div>
        )}
      </div>
    </Card>
  );
}
