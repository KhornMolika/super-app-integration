"use client";

import React, { useState } from "react";
import { 
  Smartphone, 
  Home, 
  Bike, 
  Sparkles, 
  ArrowRight, 
  CheckCircle2, 
  Star, 
  Zap, 
  TrendingDown
} from "lucide-react";
import { LiquidGlassContainer, LiquidGlassButton, LiquidGlassBadge } from "./LiquidGlass";

interface HeroSectionProps {
  onOpenQuote: () => void;
  userName?: string;
  isAuthenticated?: boolean;
}

export default function HeroSection({
  onOpenQuote,
  userName = "Guest",
  isAuthenticated = false,
}: HeroSectionProps) {
  // Interactive mini preview state inside hero
  const [selectedCategory, setSelectedCategory] = useState<"gadget" | "renters" | "mobility">("gadget");
  const [coverageLevel, setCoverageLevel] = useState<"basic" | "full">("full");

  const pricingData = {
    gadget: {
      basic: { price: 9, items: "Phone & Tablet screen protection, liquid damage", deductible: "$49" },
      full: { price: 14, items: "All devices, worldwide theft, drop & accidental damage", deductible: "$25" },
    },
    renters: {
      basic: { price: 12, items: "$15k belongings + dorm theft & smoke coverage", deductible: "$100" },
      full: { price: 19, items: "$35k belongings + water leak + temporary stay assistance", deductible: "$50" },
    },
    mobility: {
      basic: { price: 8, items: "E-bike / scooter theft + roadside lock assist", deductible: "$50" },
      full: { price: 15, items: "E-bike, e-scooter, crash repairs & third-party liability", deductible: "$25" },
    },
  };

  const currentPlan = pricingData[selectedCategory][coverageLevel];

  return (
    <section className="relative overflow-hidden pt-8 pb-16 md:pt-14 md:pb-24">
      {/* Dynamic Mid-Hero Background Glow */}
      <div className="absolute top-1/3 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[520px] h-[520px] bg-gradient-to-tr from-violet-500/15 via-purple-500/10 to-fuchsia-400/15 rounded-full blur-3xl pointer-events-none -z-10" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-10 items-center">
          
          {/* Left Column: Conversational Hero Copy */}
          <div className="lg:col-span-7 flex flex-col items-start space-y-6">
            
            {/* Friendly Liquid Glass Pill Badge */}
            <LiquidGlassBadge
              icon={<Sparkles className="w-3.5 h-3.5 text-violet-500 animate-pulse shrink-0" />}
            >
              <span>Liquid Glass UI &bull; Apple Inspired Insurance</span>
            </LiquidGlassBadge>

            {/* Main Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-slate-900 dark:text-white leading-[1.12]">
              Coverage that{" "}
              <span className="bg-gradient-to-r from-violet-600 via-fuchsia-600 to-rose-500 bg-clip-text text-transparent">
                actually gets you.
              </span>
            </h1>

            {/* Conversational Body Copy */}
            <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 max-w-2xl leading-relaxed">
              {isAuthenticated && (
                <span className="font-bold text-emerald-600 dark:text-emerald-400 block mb-1">
                  Welcome back, {userName}! ⚡ DPS SSO Connected
                </span>
              )}
              Renters, gadgets, e-bikes &amp; everyday life. Protected in under 90 seconds with pure liquid glass elegance, zero paperwork, and instant claim payouts.
            </p>

            {/* CTAs and Speed Guarantee - FIXED: inline-flex row, whitespace-nowrap, no drop */}
            <div className="w-full sm:w-auto flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5 pt-2">
              <LiquidGlassButton
                variant="pill"
                accent
                size="lg"
                onClick={onOpenQuote}
                className="group shrink-0 inline-flex flex-row items-center justify-center whitespace-nowrap gap-2"
              >
                <span>Calculate Your Price</span>
                <ArrowRight className="w-4 h-4 shrink-0 transition-transform group-hover:translate-x-1" />
              </LiquidGlassButton>

              <a
                href="#how-it-works"
                className="px-6 py-3.5 rounded-full liquid-glass-btn text-slate-800 dark:text-slate-200 font-bold text-sm inline-flex flex-row items-center justify-center whitespace-nowrap gap-2 shrink-0"
              >
                <Zap className="w-4 h-4 text-amber-500 shrink-0" />
                <span>See 3-Step Setup</span>
              </a>
            </div>

            {/* Trust and Social Proof Badges */}
            <div className="pt-5 flex flex-wrap items-center gap-y-3 gap-x-6 text-xs text-slate-500 dark:text-slate-400 border-t border-slate-200/60 dark:border-slate-800/60 w-full">
              <div className="flex items-center gap-1.5 font-semibold shrink-0">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>Cancel anytime in 1 tap</span>
              </div>
              <div className="flex items-center gap-1.5 font-semibold shrink-0">
                <Zap className="w-4 h-4 text-amber-500 shrink-0" />
                <span>Claims paid in ~8 mins</span>
              </div>
              <div className="flex items-center gap-1.5 font-semibold shrink-0">
                <div className="flex text-amber-400">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-3.5 h-3.5 fill-amber-400 text-amber-400 shrink-0" />
                  ))}
                </div>
                <span className="font-bold text-slate-800 dark:text-slate-200">4.9/5</span>
                <span>(38,000+ reviews)</span>
              </div>
            </div>

          </div>

          {/* Right Column: Interactive Liquid Glass Simulator Card */}
          <div className="lg:col-span-5 relative">
            
            {/* Liquid Glass Main Simulator Card */}
            <LiquidGlassContainer
              variant="rounded"
              className="p-6 sm:p-7 relative z-10 shadow-2xl"
            >
              {/* Card Header & Live Status */}
              <div className="flex items-center justify-between pb-4 border-b border-white/20 dark:border-slate-800/80">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-violet-600/15 text-violet-600 dark:text-violet-400 flex items-center justify-center font-bold text-sm shrink-0">
                    ⚡
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                      Liquid Quote Simulator
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Real-time interactive refraction
                    </p>
                  </div>
                </div>
                <span className="px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 text-[10px] font-extrabold uppercase tracking-wide border border-emerald-500/20 shrink-0">
                  Live Preview
                </span>
              </div>

              {/* Category Selector Tabs - Nested Liquid Glass Pills */}
              <div className="grid grid-cols-3 gap-2.5 my-5">
                <button
                  type="button"
                  onClick={() => setSelectedCategory("gadget")}
                  className={`flex flex-col items-center justify-center p-3 rounded-2xl border transition-all cursor-pointer ${
                    selectedCategory === "gadget"
                      ? "liquid-glass-accent-btn border-violet-400/40 text-white shadow-lg"
                      : "liquid-glass-nested text-slate-600 dark:text-slate-300 hover:scale-102"
                  }`}
                >
                  <Smartphone className="w-5 h-5 mb-1 shrink-0" />
                  <span className="text-xs font-bold">Tech</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedCategory("renters")}
                  className={`flex flex-col items-center justify-center p-3 rounded-2xl border transition-all cursor-pointer ${
                    selectedCategory === "renters"
                      ? "liquid-glass-accent-btn border-violet-400/40 text-white shadow-lg"
                      : "liquid-glass-nested text-slate-600 dark:text-slate-300 hover:scale-102"
                  }`}
                >
                  <Home className="w-5 h-5 mb-1 shrink-0" />
                  <span className="text-xs font-bold">Renters</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedCategory("mobility")}
                  className={`flex flex-col items-center justify-center p-3 rounded-2xl border transition-all cursor-pointer ${
                    selectedCategory === "mobility"
                      ? "liquid-glass-accent-btn border-violet-400/40 text-white shadow-lg"
                      : "liquid-glass-nested text-slate-600 dark:text-slate-300 hover:scale-102"
                  }`}
                >
                  <Bike className="w-5 h-5 mb-1 shrink-0" />
                  <span className="text-xs font-bold">Scooter</span>
                </button>
              </div>

              {/* Coverage Tier Toggle - Nested Glass Pill Container */}
              <div className="flex items-center justify-between p-1.5 liquid-glass-nested rounded-full mb-5">
                <button
                  type="button"
                  onClick={() => setCoverageLevel("basic")}
                  className={`flex-1 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                    coverageLevel === "basic"
                      ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm"
                      : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  Essential Guard
                </button>
                <button
                  type="button"
                  onClick={() => setCoverageLevel("full")}
                  className={`flex-1 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1 ${
                    coverageLevel === "full"
                      ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm"
                      : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  <span>All-Inclusive</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-violet-500 shrink-0"></span>
                </button>
              </div>

              {/* Price Calculation Display - Nested Liquid Glass Surface */}
              <div className="rounded-3xl liquid-glass-nested p-5 mb-5 border border-white/40 dark:border-slate-700/60">
                <div className="flex items-baseline justify-between mb-2">
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                    Transparent Estimate:
                  </span>
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-black text-slate-900 dark:text-white">
                      ${currentPlan.price}
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">/ mo</span>
                  </div>
                </div>

                <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-medium mb-3">
                  {currentPlan.items}
                </p>

                <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 pt-2 border-t border-white/20 dark:border-slate-800">
                  <span>Deductible: <strong className="text-slate-800 dark:text-slate-200">{currentPlan.deductible}</strong></span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                    <TrendingDown className="w-3.5 h-3.5 shrink-0" />
                    ~60% cheaper than legacy
                  </span>
                </div>
              </div>

              {/* Action Button - FIXED: inline-flex flex-row items-center justify-center gap-2, whitespace-nowrap */}
              <LiquidGlassButton
                variant="pill"
                accent
                size="lg"
                onClick={onOpenQuote}
                className="w-full flex-row items-center justify-center gap-2 whitespace-nowrap"
              >
                <span>Lock In This Price</span>
                <ArrowRight className="w-4 h-4 shrink-0" />
              </LiquidGlassButton>

              <p className="text-center text-[10px] text-slate-400 dark:text-slate-500 mt-3">
                Zero lock-in. Pause, adjust, or cancel anytime in DPS Super App.
              </p>

            </LiquidGlassContainer>

            {/* Floating Mini Notification Pill in Liquid Glass */}
            <div className="hidden sm:block absolute -bottom-6 -left-6 z-20 animate-float">
              <LiquidGlassContainer
                variant="pill"
                className="px-4 py-3 flex items-center gap-3 shadow-2xl"
              >
                <div className="w-9 h-9 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-sm shrink-0">
                  ✓
                </div>
                <div className="text-left pr-2">
                  <p className="text-xs font-black text-slate-900 dark:text-white">Claim Paid: $840</p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">Transferred to DPS wallet in 6m</p>
                </div>
              </LiquidGlassContainer>
            </div>

          </div>

        </div>
      </div>
    </section>
  );
}
