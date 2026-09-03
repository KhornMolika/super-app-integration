"use client";

import React, { useState } from "react";
import { 
  Check, 
  ArrowRight,
  Calculator,
  Laptop,
  Home,
  Bike,
  Globe
} from "lucide-react";
import { LiquidGlassContainer, LiquidGlassButton, LiquidGlassBadge } from "./LiquidGlass";

export default function CalculatorAndPlans({ onSelectPlan }: { onSelectPlan: (plan: string, price: number) => void }) {
  // Calculator States
  const [assetType, setAssetType] = useState<"tech" | "renters" | "mobility" | "travel">("tech");
  const [coverageAmount, setCoverageAmount] = useState<number>(3500);
  const [deductible, setDeductible] = useState<number>(50);
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");

  // Dynamic cost calculation based on slider and options
  const baseRates = {
    tech: 0.0035,
    renters: 0.0022,
    mobility: 0.0028,
    travel: 0.0030,
  };

  const deductibleMultiplier = deductible === 25 ? 1.15 : deductible === 50 ? 1.0 : 0.88;
  const rawMonthly = Math.max(6, Math.round((coverageAmount * baseRates[assetType] + 4) * deductibleMultiplier));
  const calculatedPrice = billingCycle === "yearly" ? Math.round(rawMonthly * 0.85) : rawMonthly;

  // Static Plan Tiers
  const plans = [
    {
      name: "The Starter",
      subtitle: "Best for students & light tech",
      monthlyPrice: 8,
      yearlyPrice: 7,
      description: "Essential protection against shattered screens, spilled drinks, and daily oopsies.",
      popular: false,
      features: [
        "1 Smartphone (up to $1,200)",
        "Cracked screen replacement in 24h",
        "Liquid and water damage",
        "$50 standard deductible",
        "DPS In-App Instant Claims",
      ],
      tag: "Budget Friendly",
      cta: "Choose Starter",
    },
    {
      name: "The Daily Flex",
      subtitle: "Most Popular for Gen Z & Nomads",
      monthlyPrice: 15,
      yearlyPrice: 12,
      description: "Full suite coverage for all your gadgets, e-bike, and rental room contents.",
      popular: true,
      features: [
        "Up to 4 devices (Phones, Laptops, Tablet, Camera)",
        "Dorm & apartment theft coverage ($15,000)",
        "Accidental drops, liquid & fire spills",
        "E-bike & scooter roadside lock assistance",
        "$25 low deductible",
        "Priority 8-minute claim resolution",
      ],
      tag: "⚡ Most Popular",
      cta: "Get Daily Flex",
    },
    {
      name: "The Max Nomad",
      subtitle: "Worldwide coverage & zero friction",
      monthlyPrice: 28,
      yearlyPrice: 23,
      description: "Everything in Daily Flex plus global travel gear protection and zero deductible.",
      popular: false,
      features: [
        "Unlimited personal tech & gear",
        "Worldwide luggage & device loss coverage",
        "Zero ($0) deductible on first claim every year",
        "Apartment contents up to $40,000",
        "Emergency travel medical assist",
        "24/7 dedicated VIP concierge support",
      ],
      tag: "Total Peace of Mind",
      cta: "Choose Max Nomad",
    },
  ];

  return (
    <section id="calculator" className="py-20 relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <LiquidGlassBadge
            icon={<Calculator className="w-3.5 h-3.5 text-emerald-500 shrink-0" />}
            className="mb-3"
          >
            Interactive Estimator
          </LiquidGlassBadge>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Transparent pricing. No hidden fees.
          </h2>
          <p className="mt-4 text-base text-slate-600 dark:text-slate-300">
            Customize your coverage slider to match your exact lifestyle, or select one of our curated plans below.
          </p>

          {/* Liquid Glass Billing Cycle Toggle */}
          <div className="mt-8 inline-flex items-center p-1.5 liquid-glass-pill liquid-glass-nested">
            <button
              onClick={() => setBillingCycle("monthly")}
              className={`px-5 py-2 rounded-full text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap ${
                billingCycle === "monthly"
                  ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-md"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              Pay Monthly
            </button>
            <button
              onClick={() => setBillingCycle("yearly")}
              className={`px-5 py-2 rounded-full text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                billingCycle === "yearly"
                  ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-md"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <span>Pay Yearly</span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500 text-white text-[10px] font-extrabold shadow-xs shrink-0">
                Save 15%
              </span>
            </button>
          </div>
        </div>

        {/* Dynamic Liquid Glass Calculator Box */}
        <LiquidGlassContainer
          variant="rounded"
          className="max-w-4xl mx-auto mb-20 p-7 sm:p-10 shadow-2xl"
        >
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 pb-8 border-b border-white/20 dark:border-slate-800/80">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-violet-600 dark:text-violet-400">
                Step 1: What do you want to protect?
              </span>
              <h3 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mt-1">
                Calculate Custom Estimate
              </h3>
            </div>

            {/* Asset Type Selector Pills - Nested Liquid Glass */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 w-full md:w-auto">
              <button
                type="button"
                onClick={() => setAssetType("tech")}
                className={`px-3.5 py-2 rounded-2xl text-xs font-bold inline-flex items-center justify-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                  assetType === "tech"
                    ? "liquid-glass-accent-btn text-white shadow-md"
                    : "liquid-glass-nested text-slate-600 dark:text-slate-300 hover:scale-102"
                }`}
              >
                <Laptop className="w-4 h-4 shrink-0" /> Tech
              </button>
              <button
                type="button"
                onClick={() => setAssetType("renters")}
                className={`px-3.5 py-2 rounded-2xl text-xs font-bold inline-flex items-center justify-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                  assetType === "renters"
                    ? "liquid-glass-accent-btn text-white shadow-md"
                    : "liquid-glass-nested text-slate-600 dark:text-slate-300 hover:scale-102"
                }`}
              >
                <Home className="w-4 h-4 shrink-0" /> Apartment
              </button>
              <button
                type="button"
                onClick={() => setAssetType("mobility")}
                className={`px-3.5 py-2 rounded-2xl text-xs font-bold inline-flex items-center justify-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                  assetType === "mobility"
                    ? "liquid-glass-accent-btn text-white shadow-md"
                    : "liquid-glass-nested text-slate-600 dark:text-slate-300 hover:scale-102"
                }`}
              >
                <Bike className="w-4 h-4 shrink-0" /> E-Scooter
              </button>
              <button
                type="button"
                onClick={() => setAssetType("travel")}
                className={`px-3.5 py-2 rounded-2xl text-xs font-bold inline-flex items-center justify-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                  assetType === "travel"
                    ? "liquid-glass-accent-btn text-white shadow-md"
                    : "liquid-glass-nested text-slate-600 dark:text-slate-300 hover:scale-102"
                }`}
              >
                <Globe className="w-4 h-4 shrink-0" /> Travel
              </button>
            </div>
          </div>

          {/* Calculator Controls Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pt-8 items-center">
            <div className="lg:col-span-7 space-y-6">
              
              {/* Coverage Slider */}
              <div className="p-5 rounded-3xl liquid-glass-nested border border-white/40 dark:border-slate-800">
                <div className="flex justify-between items-center mb-3">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    Total Estimated Gear Value
                  </label>
                  <span className="text-2xl font-black text-violet-600 dark:text-violet-400">
                    ${coverageAmount.toLocaleString()}
                  </span>
                </div>
                <input
                  type="range"
                  min="1000"
                  max="15000"
                  step="500"
                  value={coverageAmount}
                  onChange={(e) => setCoverageAmount(Number(e.target.value))}
                  className="w-full h-2.5 bg-slate-200/80 dark:bg-slate-700/80 rounded-lg appearance-none cursor-pointer accent-violet-600"
                />
                <div className="flex justify-between text-[11px] text-slate-400 mt-2 font-semibold">
                  <span>$1,000 (Phone)</span>
                  <span>$8,000</span>
                  <span>$15,000 (Full Pad)</span>
                </div>
              </div>

              {/* Deductible Picker */}
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block mb-2.5">
                  Choose Your Deductible (Out of pocket per claim)
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {[25, 50, 100].map((amount) => (
                    <button
                      key={amount}
                      type="button"
                      onClick={() => setDeductible(amount)}
                      className={`p-3.5 rounded-2xl text-center transition-all cursor-pointer ${
                        deductible === amount
                          ? "liquid-glass-accent-btn text-white shadow-md font-bold"
                          : "liquid-glass-nested text-slate-600 dark:text-slate-400 font-medium hover:scale-102"
                      }`}
                    >
                      <div className="text-base font-extrabold">${amount}</div>
                      <div className="text-[10px] opacity-80">
                        {amount === 25 ? "Lowest out-of-pocket" : amount === 50 ? "Balanced" : "Lowest monthly"}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

            </div>

            {/* Calculated Result Box - Liquid Glass Accent */}
            <div className="lg:col-span-5 rounded-3xl liquid-glass-accent-btn p-6 sm:p-8 flex flex-col justify-between shadow-2xl">
              <div>
                <span className="text-xs uppercase font-extrabold tracking-wider text-violet-200">
                  Estimated Premium
                </span>
                <div className="flex items-baseline gap-1 mt-2">
                  <span className="text-5xl font-black text-white">${calculatedPrice}</span>
                  <span className="text-sm text-violet-200 font-medium">
                    /{billingCycle === "yearly" ? "month (billed annually)" : "month"}
                  </span>
                </div>
                <p className="text-xs text-violet-100 mt-3 leading-relaxed font-medium">
                  Includes full accidental damage, loss, drops, and liquid spills. Cancel or adjust anytime in DPS Super App.
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-white/20">
                <button
                  onClick={() => onSelectPlan(`Custom ${assetType.toUpperCase()}`, calculatedPrice)}
                  className="w-full py-3.5 rounded-full bg-white text-slate-900 font-extrabold text-sm shadow-lg hover:bg-slate-100 transition-transform active:scale-98 inline-flex flex-row items-center justify-center gap-2 cursor-pointer whitespace-nowrap"
                >
                  <span>Lock In This Quote</span>
                  <ArrowRight className="w-4 h-4 shrink-0" />
                </button>
                <p className="text-center text-[10px] text-violet-200 mt-2 font-medium">
                  ⚡ 90 seconds to activate via DPS Super App
                </p>
              </div>
            </div>
          </div>
        </LiquidGlassContainer>

        {/* Plan Comparison Cards in Liquid Glass */}
        <div id="plans" className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {plans.map((plan, idx) => {
            const price = billingCycle === "yearly" ? plan.yearlyPrice : plan.monthlyPrice;
            return (
              <LiquidGlassContainer
                key={idx}
                variant="rounded"
                interactive
                className={`p-8 flex flex-col justify-between relative ${
                  plan.popular ? "ring-2 ring-violet-500/50 shadow-2xl" : ""
                }`}
              >
                {/* Popular Pill */}
                {plan.popular && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-xs font-black shadow-md uppercase tracking-wider">
                    {plan.tag}
                  </div>
                )}

                <div>
                  {/* Plan Header */}
                  <div className="mb-4">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                      {plan.subtitle}
                    </span>
                    <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                      {plan.name}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                      {plan.description}
                    </p>
                  </div>

                  {/* Price */}
                  <div className="flex items-baseline gap-1 py-4 border-y border-white/20 dark:border-slate-800 my-4">
                    <span className="text-4xl font-black text-slate-900 dark:text-white">
                      ${price}
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold">
                      / month
                    </span>
                    {billingCycle === "yearly" && (
                      <span className="ml-auto text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/15 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                        Billed Yearly
                      </span>
                    )}
                  </div>

                  {/* Feature Checklist */}
                  <ul className="space-y-3 my-6">
                    {plan.features.map((feat, fIdx) => (
                      <li key={fIdx} className="flex items-start gap-2.5 text-xs text-slate-700 dark:text-slate-300 font-medium">
                        <div className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                          <Check className="w-3 h-3 stroke-[3]" />
                        </div>
                        <span className="leading-snug">{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Plan Action CTA */}
                <LiquidGlassButton
                  variant="pill"
                  accent={plan.popular}
                  size="md"
                  onClick={() => onSelectPlan(plan.name, price)}
                  className="w-full flex-row items-center justify-center gap-2 whitespace-nowrap"
                >
                  <span>{plan.cta}</span>
                  <ArrowRight className="w-4 h-4 shrink-0" />
                </LiquidGlassButton>
              </LiquidGlassContainer>
            );
          })}
        </div>

      </div>
    </section>
  );
}
