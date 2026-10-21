"use client";

import React, { useState } from "react";

export function Section06UxUiGuidelines() {
  const [deviceTheme, setDeviceTheme] = useState<"light" | "dark">("light");

  return (
    <div className="space-y-10 text-slate-700 dark:text-slate-300">
      {/* Introduction Card */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-brand-500/10 via-indigo-500/10 to-transparent border border-brand-500/20">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-brand-500 text-white flex items-center justify-center font-bold text-lg shrink-0 shadow-md">
            UI
          </div>
          <div>
            <h4 className="text-lg font-bold text-slate-950 dark:text-white mb-1">
              MiniApp UX/UI &amp; Screen Design Guidelines
            </h4>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              MiniApps live inside the host SuperApp container. To provide a seamless, native-feeling user experience and ensure instant approval during SuperApp review, all MiniApps must strictly respect host viewport insets, the top-right capsule button safe zone, and standard navigation behaviors.
            </p>
          </div>
        </div>
      </div>

      {/* Interactive Viewport Wireframe */}
      <div id="ui-viewport" className="scroll-mt-24">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h4 className="text-base font-bold text-slate-900 dark:text-white">
              1. Host Viewport Anatomy &amp; Safe Insets
            </h4>
            <p className="text-xs text-slate-500">
              Interactive wireframe showing host-controlled elements vs. your MiniApp canvas.
            </p>
          </div>
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg text-xs font-medium">
            <button
              onClick={() => setDeviceTheme("light")}
              className={`px-3 py-1 rounded-md transition ${
                deviceTheme === "light"
                  ? "bg-white text-slate-900 shadow-sm font-bold"
                  : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              Light Frame
            </button>
            <button
              onClick={() => setDeviceTheme("dark")}
              className={`px-3 py-1 rounded-md transition ${
                deviceTheme === "dark"
                  ? "bg-slate-950 text-white shadow-sm font-bold"
                  : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              Dark Frame
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Visual Phone Mockup */}
          <div className="lg:col-span-5 flex justify-center">
            <div
              className={`w-full max-w-[340px] rounded-[42px] p-3 shadow-2xl border-4 ${
                deviceTheme === "light"
                  ? "bg-slate-900 border-slate-700 shadow-brand-500/10"
                  : "bg-slate-950 border-slate-800 shadow-black"
              }`}
            >
              {/* Inner Phone Screen */}
              <div
                className={`relative rounded-[32px] overflow-hidden flex flex-col h-[560px] ${
                  deviceTheme === "light" ? "bg-white text-slate-900" : "bg-slate-900 text-slate-100"
                }`}
              >
                {/* 1. Status Bar + Dynamic Island */}
                <div className="h-10 pt-2 px-6 flex items-center justify-between shrink-0 relative z-10 text-[11px] font-semibold">
                  <span>9:41</span>
                  {/* Dynamic Island pill */}
                  <div className="w-24 h-5 rounded-full bg-black mx-auto absolute left-1/2 -translate-x-1/2 top-2 flex items-center justify-end pr-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-slate-800" />
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-[10px]">5G</span>
                    <div className="w-5 h-2.5 rounded-sm border border-current p-0.5 flex items-center">
                      <div className="w-3 h-full bg-current rounded-2xs" />
                    </div>
                  </div>
                </div>

                {/* 2. SuperApp Host Navigation Bar (44pt) */}
                <div
                  className={`h-11 px-3 flex items-center justify-between shrink-0 border-b relative z-10 ${
                    deviceTheme === "light"
                      ? "bg-slate-50/90 border-slate-200"
                      : "bg-slate-900/90 border-slate-800"
                  }`}
                >
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
                    <span className="text-base font-bold">‹</span>
                    <span className="truncate max-w-[90px]">MiniApp Name</span>
                  </div>

                  {/* Host Capsule Button [ ••• | ⨀ ] */}
                  <div className="flex items-center bg-black/10 dark:bg-white/10 border border-black/20 dark:border-white/20 rounded-full px-2.5 py-1 gap-2 shadow-sm">
                    <span className="text-xs font-bold leading-none tracking-tighter">•••</span>
                    <span className="h-3 w-px bg-black/20 dark:bg-white/20" />
                    <span className="w-3 h-3 rounded-full border-2 border-current inline-block" />
                  </div>
                </div>

                {/* Capsule Reserved Zone Callout Box (Visual Overlay) */}
                <div className="absolute right-2 top-10 border border-dashed border-rose-500 bg-rose-500/10 rounded-lg px-2 py-0.5 text-[9px] font-bold text-rose-600 dark:text-rose-400 z-20 pointer-events-none">
                  Reserved Capsule Zone (96×40pt)
                </div>

                {/* 3. MiniApp Body Viewport (Scrollable Canvas) */}
                <div className="flex-1 p-4 space-y-3 overflow-y-auto text-xs relative">
                  {/* Banner */}
                  <div className="h-20 rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 p-3 text-white flex flex-col justify-end">
                    <span className="text-[10px] font-medium opacity-80">Partner MiniApp Viewport</span>
                    <span className="font-bold text-sm">Your Custom Business UI</span>
                  </div>

                  {/* Mock content blocks */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
                      <span className="text-[10px] text-slate-400 block">Catalog Item</span>
                      <span className="font-semibold text-xs">$49.00</span>
                    </div>
                    <div className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
                      <span className="text-[10px] text-slate-400 block">Catalog Item</span>
                      <span className="font-semibold text-xs">$79.00</span>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/30 text-[11px] leading-relaxed text-slate-500">
                    Use your brand colors, cards, and typography inside this canvas.
                  </div>
                </div>

                {/* 4. Bottom Safe Area & Action Button */}
                <div
                  className={`border-t px-4 pt-3 pb-2 shrink-0 relative ${
                    deviceTheme === "light"
                      ? "bg-white/95 border-slate-200"
                      : "bg-slate-900/95 border-slate-800"
                  }`}
                >
                  {/* Floating Action Button */}
                  <button className="w-full py-2.5 rounded-xl bg-brand-600 text-white font-bold text-xs shadow-md">
                    Check-in Attendance (48pt)
                  </button>

                  {/* Home Indicator Bar (34pt Safe Inset) */}
                  <div className="h-6 flex items-center justify-center pt-2">
                    <div className="w-32 h-1 rounded-full bg-slate-400 dark:bg-slate-600" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Guidelines Details */}
          <div className="lg:col-span-7 space-y-4">
            <div id="ui-capsule" className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 space-y-2 scroll-mt-24">
              <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 font-bold text-sm">
                <span>⚠️</span>
                <span>Critical Rule: Capsule Button Safe Zone</span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                The top-right corner of the viewport (width 96px, height 40px) is strictly reserved for the SuperApp host capsule (<code className="font-mono text-slate-800 dark:text-slate-200">[•••|⨀]</code>). MiniApps <strong>cannot</strong> place search icons, avatar profile pictures, or interactive controls in this region. Elements overlapping this area will be masked by the container.
              </p>
            </div>

            <div id="ui-safe-area" className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 space-y-2 scroll-mt-24">
              <div className="flex items-center gap-2 text-brand-600 dark:text-brand-400 font-bold text-sm">
                <span>📱</span>
                <span>Bottom Safe Area Inset (iOS Home Indicator)</span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Modern edge-to-edge mobile devices have a 34px gesture bar at the bottom. Any sticky bottom bars (such as &quot;Buy Now&quot; or &quot;Submit&quot;) must include bottom padding:
              </p>
              <div className="p-2.5 rounded-lg bg-slate-900 text-slate-200 font-mono text-xs">
                padding-bottom: max(16px, env(safe-area-inset-bottom));
              </div>
            </div>

            <div id="ui-touch" className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 space-y-2 scroll-mt-24">
              <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-bold text-sm">
                <span>🎯</span>
                <span>Touch Targets &amp; Button Ergonomics</span>
              </div>
              <ul className="text-xs text-slate-600 dark:text-slate-400 space-y-1.5 list-disc pl-4">
                <li><strong>Minimum Clickable Target:</strong> 44 × 44 pt for all icons, buttons, and links.</li>
                <li><strong>Primary Action Button:</strong> 48 to 52 pt height with a 12px corner radius.</li>
                <li><strong>Font Scale:</strong> Title (20pt Bold), Section Header (16pt SemiBold), Body (14pt Regular), Caption (12pt).</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Visual DO's and DON'Ts Matrix */}
      <div id="ui-dos-donts" className="scroll-mt-24">
        <h4 className="text-base font-bold text-slate-900 dark:text-white mb-2">
          2. Visual DO&apos;s &amp; DON&apos;Ts Guidelines
        </h4>
        <p className="text-xs text-slate-500 mb-6">
          Follow these practical patterns to avoid app rejection during SuperApp store review.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Card 1: Navigation */}
          <div className="p-5 rounded-2xl border border-emerald-500/30 bg-emerald-50/30 dark:bg-emerald-950/10 space-y-3">
            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold text-sm">
              <span className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs">✓</span>
              <span>DO: Support Standard Back Navigation</span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Use standard browser history (<code className="font-mono">history.pushState</code>) or Flutter <code className="font-mono">Navigator.push</code> for sub-pages. When the user taps the SuperApp top-left back button, it smoothly steps back within your MiniApp stack.
            </p>
          </div>

          <div className="p-5 rounded-2xl border border-rose-500/30 bg-rose-50/30 dark:bg-rose-950/10 space-y-3">
            <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 font-bold text-sm">
              <span className="w-5 h-5 rounded-full bg-rose-500 text-white flex items-center justify-center text-xs">✕</span>
              <span>DON&apos;T: Hijack or Trap the User</span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Never block the hardware back button or top close button with infinite confirm dialogs. Trapping the user inside the MiniApp without a clear exit is grounds for immediate rejection.
            </p>
          </div>

          {/* Card 2: Loading & Feedback */}
          <div className="p-5 rounded-2xl border border-emerald-500/30 bg-emerald-50/30 dark:bg-emerald-950/10 space-y-3">
            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold text-sm">
              <span className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs">✓</span>
              <span>DO: Provide Skeleton Loading Screens</span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Display skeleton card loaders or native progress spinners during any network or bridge operation exceeding 1.0 second. Keep the UI feeling alive and responsive.
            </p>
          </div>

          <div className="p-5 rounded-2xl border border-rose-500/30 bg-rose-50/30 dark:bg-rose-950/10 space-y-3">
            <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 font-bold text-sm">
              <span className="w-5 h-5 rounded-full bg-rose-500 text-white flex items-center justify-center text-xs">✕</span>
              <span>DON&apos;T: Show Blank Screens or Freeze UI</span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Never block the JavaScript main thread or display a blank white canvas while waiting for bridge capabilities. Always show immediate optimistic visual feedback.
            </p>
          </div>

          {/* Card 3: Brand & Dialogs */}
          <div className="p-5 rounded-2xl border border-emerald-500/30 bg-emerald-50/30 dark:bg-emerald-950/10 space-y-3">
            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold text-sm">
              <span className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs">✓</span>
              <span>DO: Use Standard Toasts for Feedback</span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Use lightweight toast notifications (1.5s–2.0s duration) for success confirmations (&quot;Saved to Favorites&quot;). Save modal dialogs strictly for destructive decisions.
            </p>
          </div>

          <div className="p-5 rounded-2xl border border-rose-500/30 bg-rose-50/30 dark:bg-rose-950/10 space-y-3">
            <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 font-bold text-sm">
              <span className="w-5 h-5 rounded-full bg-rose-500 text-white flex items-center justify-center text-xs">✕</span>
              <span>DON&apos;T: Replicate SuperApp System Dialogs</span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              MiniApps may not visually mimic official SuperApp staff authentication sheets, system permission prompts, or security warning popups to trick or mislead users.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
