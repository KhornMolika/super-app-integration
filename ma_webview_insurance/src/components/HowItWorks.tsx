"use client";

import React from "react";
import { 
  Sliders, 
  Fingerprint, 
  Zap, 
  ArrowRight, 
  Clock, 
  FileX 
} from "lucide-react";
import { LiquidGlassContainer, LiquidGlassButton, LiquidGlassBadge } from "./LiquidGlass";

export default function HowItWorks({ onOpenQuote }: { onOpenQuote: () => void }) {
  const steps = [
    {
      stepNumber: "01",
      icon: <Sliders className="w-6 h-6 text-violet-600 dark:text-violet-400" />,
      title: "Pick your vibe",
      subtitle: "Zero bloated packages",
      description:
        "Choose only what you actually own — your phone, laptop, e-scooter, or apartment. Toggle coverage sliders up or down. Never pay for stuff you'll never use.",
      badge: "60 seconds",
    },
    {
      stepNumber: "02",
      icon: <Fingerprint className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />,
      title: "1-Tap DPS activation",
      subtitle: "Say goodbye to paper forms",
      description:
        "No printing, scanning, or mailing documents. Your identity and payment seamlessly link through the DPS Super App bridge with FaceID or TouchID.",
      badge: "Zero Paperwork",
    },
    {
      stepNumber: "03",
      icon: <Zap className="w-6 h-6 text-amber-500 dark:text-amber-400" />,
      title: "Instant claim payouts",
      subtitle: "Average 8 mins to approval",
      description:
        "Dropped your phone or had your gear stolen? Snap a quick photo, upload via Super App camera bridge, and approved funds hit your bank wallet instantly.",
      badge: "Avg. 8 minutes",
    },
  ];

  return (
    <section id="how-it-works" className="py-20 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <LiquidGlassBadge
            icon={<Clock className="w-3.5 h-3.5 text-violet-500" />}
            className="mb-3"
          >
            Fast &amp; Transparent
          </LiquidGlassBadge>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            How insurance was always meant to work.
          </h2>
          <p className="mt-4 text-base text-slate-600 dark:text-slate-300">
            No endless medical questionnaires. No holding music. Just 3 simple taps with pure liquid glass speed.
          </p>
        </div>

        {/* 3 Liquid Glass Steps Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {steps.map((step, idx) => (
            <LiquidGlassContainer
              key={idx}
              variant="rounded"
              interactive
              className="p-8 flex flex-col justify-between group"
            >
              <div>
                {/* Step Top Bar: Icon + Step Number */}
                <div className="flex items-center justify-between mb-6">
                  <div className="w-13 h-13 rounded-2xl liquid-glass-nested flex items-center justify-center shadow-xs group-hover:scale-110 transition-transform">
                    {step.icon}
                  </div>
                  <span className="text-4xl font-black text-slate-300/60 dark:text-slate-700/60 tracking-tighter group-hover:text-violet-500/40 transition-colors">
                    {step.stepNumber}
                  </span>
                </div>

                {/* Badges & Titles */}
                <div className="mb-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    {step.subtitle}
                  </span>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white mt-1">
                    {step.title}
                  </h3>
                </div>

                {/* Description */}
                <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed mt-3">
                  {step.description}
                </p>
              </div>

              {/* Step Footer Badge */}
              <div className="mt-8 pt-4 border-t border-white/20 dark:border-slate-800/80 flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
                <span className="px-3 py-1 rounded-full liquid-glass-nested text-slate-700 dark:text-slate-300">
                  {step.badge}
                </span>
                <span className="text-violet-600 dark:text-violet-400 font-bold flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                  Step {step.stepNumber} <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </LiquidGlassContainer>
          ))}
        </div>

        {/* Quick Micro Callout in Liquid Glass */}
        <div className="mt-14 max-w-3xl mx-auto">
          <LiquidGlassContainer
            variant="rounded"
            className="p-5 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left shadow-lg"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-violet-600 text-white flex items-center justify-center shrink-0 shadow-md">
                <FileX className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                  Zero paper policies or PDF printing
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  All certificates, tokens, and instant claims live securely inside your DPS wallet.
                </p>
              </div>
            </div>
            <LiquidGlassButton
              variant="pill"
              accent
              size="sm"
              onClick={onOpenQuote}
              className="shrink-0"
            >
              Start in 90 Seconds
            </LiquidGlassButton>
          </LiquidGlassContainer>
        </div>

      </div>
    </section>
  );
}
