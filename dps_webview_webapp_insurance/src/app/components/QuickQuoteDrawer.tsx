"use client";

import React, { useState } from "react";
import { 
  X, 
  ArrowRight, 
  ArrowLeft, 
  Check, 
  Smartphone, 
  Laptop, 
  Home, 
  Bike, 
  ShieldCheck, 
  Zap,
  Fingerprint
} from "lucide-react";
import { LiquidGlassContainer, LiquidGlassButton } from "./LiquidGlass";

interface QuickQuoteDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  userName?: string;
  isAuthenticated?: boolean;
}

export default function QuickQuoteDrawer({
  isOpen,
  onClose,
  userName = "Guest",
  isAuthenticated = false,
}: QuickQuoteDrawerProps) {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // Form selections
  const [selectedItems, setSelectedItems] = useState<string[]>(["smartphone", "laptop"]);
  const [coverageLimit, setCoverageLimit] = useState<number>(3500);
  const [deductible, setDeductible] = useState<number>(50);
  const [ownerName, setOwnerName] = useState<string>(userName !== "Guest" ? userName : "");
  const [isActivating, setIsActivating] = useState<boolean>(false);

  if (!isOpen) return null;

  const toggleItem = (id: string) => {
    if (selectedItems.includes(id)) {
      if (selectedItems.length > 1) {
        setSelectedItems(selectedItems.filter((item) => item !== id));
      }
    } else {
      setSelectedItems([...selectedItems, id]);
    }
  };

  const calculatedMonthly = Math.max(7, Math.round(selectedItems.length * 4.5 + coverageLimit * 0.0018 - (deductible === 100 ? 3 : 0)));

  const handleActivate = () => {
    setIsActivating(true);
    setTimeout(() => {
      setIsActivating(false);
      setStep(4);
    }, 1200);
  };

  const resetAndClose = () => {
    setStep(1);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        onClick={resetAndClose}
        className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm transition-opacity animate-in fade-in"
      />

      {/* Drawer Container in Apple Liquid Glass */}
      <div className="relative w-full max-w-lg liquid-glass h-full shadow-2xl z-10 flex flex-col justify-between overflow-y-auto border-l border-white/40 dark:border-slate-800 transition-all">
        
        {/* Drawer Header */}
        <div className="p-6 border-b border-white/20 dark:border-slate-800 flex items-center justify-between sticky top-0 backdrop-blur-xl z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-violet-600/15 text-violet-600 dark:text-violet-400 flex items-center justify-center font-bold text-xs">
              ⚡
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                Liquid Glass Onboarding
              </h3>
              <p className="text-[11px] text-slate-400">
                {step === 4 ? "Coverage Active 🎉" : `Step ${step} of 3 • Guided Setup`}
              </p>
            </div>
          </div>

          <button
            onClick={resetAndClose}
            className="w-8 h-8 rounded-full liquid-glass-nested hover:scale-105 flex items-center justify-center text-slate-500 dark:text-slate-400 cursor-pointer transition-transform"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Step Progress Bar */}
        {step < 4 && (
          <div className="w-full bg-slate-200/50 dark:bg-slate-800/50 h-1">
            <div
              className="bg-gradient-to-r from-violet-600 to-indigo-600 h-1 transition-all duration-300"
              style={{ width: `${(step / 3) * 100}%` }}
            />
          </div>
        )}

        {/* Drawer Body */}
        <div className="p-6 flex-1">
          
          {/* STEP 1: Select Stuff */}
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-violet-600 dark:text-violet-400">
                  Step 1 • Your Gear
                </span>
                <h2 className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                  What are we protecting?
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Pick one or multiple. You can always adjust anytime with 1 tap.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3.5">
                {[
                  { id: "smartphone", label: "Smartphone", icon: <Smartphone className="w-5 h-5" />, desc: "iPhone, Galaxy, Pixel" },
                  { id: "laptop", label: "Laptop / Mac", icon: <Laptop className="w-5 h-5" />, desc: "MacBook, iPad, PC" },
                  { id: "renters", label: "Renters / Room", icon: <Home className="w-5 h-5" />, desc: "Furniture & belongings" },
                  { id: "mobility", label: "E-Bike / Scooter", icon: <Bike className="w-5 h-5" />, desc: "Commuter transit" },
                ].map((item) => {
                  const isSelected = selectedItems.includes(item.id);
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => toggleItem(item.id)}
                      className={`p-4 rounded-3xl border text-left flex flex-col justify-between h-32 transition-all cursor-pointer ${
                        isSelected
                          ? "liquid-glass-accent-btn text-white shadow-lg scale-102"
                          : "liquid-glass-nested text-slate-700 dark:text-slate-300 hover:scale-102"
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <div className={`p-2 rounded-2xl ${isSelected ? "bg-white/20" : "bg-white/60 dark:bg-slate-800 text-slate-600 dark:text-slate-300"}`}>
                          {item.icon}
                        </div>
                        {isSelected && (
                          <div className="w-5 h-5 rounded-full bg-white text-violet-600 flex items-center justify-center text-xs font-bold">
                            <Check className="w-3 h-3 stroke-[3]" />
                          </div>
                        )}
                      </div>
                      <div>
                        <div className="font-bold text-sm">{item.label}</div>
                        <div className="text-[10px] opacity-80">{item.desc}</div>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="p-4 rounded-3xl liquid-glass-nested flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Estimated cost</span>
                  <div className="text-2xl font-black text-slate-900 dark:text-white">
                    ${calculatedMonthly} <span className="text-xs font-normal text-slate-400">/ mo</span>
                  </div>
                </div>
                <LiquidGlassButton
                  variant="pill"
                  accent
                  size="sm"
                  onClick={() => setStep(2)}
                >
                  <span>Continue</span>
                  <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </LiquidGlassButton>
              </div>
            </div>
          )}

          {/* STEP 2: Customize Limit & Deductible */}
          {step === 2 && (
            <div className="space-y-6">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-violet-600 dark:text-violet-400">
                  Step 2 • Coverage Depth
                </span>
                <h2 className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                  Tune your limits
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Adjust coverage to match the real value of what you carry.
                </p>
              </div>

              {/* Slider Container */}
              <div className="p-5 rounded-3xl liquid-glass-nested space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                    Max Annual Limit
                  </span>
                  <span className="text-xl font-black text-violet-600 dark:text-violet-400">
                    ${coverageLimit.toLocaleString()}
                  </span>
                </div>
                <input
                  type="range"
                  min="1500"
                  max="10000"
                  step="500"
                  value={coverageLimit}
                  onChange={(e) => setCoverageLimit(Number(e.target.value))}
                  className="w-full h-2.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-violet-600"
                />
                <div className="flex justify-between text-[10px] text-slate-400 font-semibold">
                  <span>$1,500</span>
                  <span>$5,000</span>
                  <span>$10,000</span>
                </div>
              </div>

              {/* Deductible Picker */}
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block mb-2">
                  Deductible per Claim
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {[25, 50].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setDeductible(val)}
                      className={`p-3.5 rounded-2xl text-left cursor-pointer transition-all ${
                        deductible === val
                          ? "liquid-glass-accent-btn text-white shadow-md font-bold"
                          : "liquid-glass-nested text-slate-600 dark:text-slate-400"
                      }`}
                    >
                      <div className="font-black text-base">${val}</div>
                      <div className="text-[10px] opacity-80">
                        {val === 25 ? "Best for small repairs" : "Standard balanced"}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {!isAuthenticated && (
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block mb-1.5">
                    Your Name or Handle
                  </label>
                  <input
                    type="text"
                    value={ownerName}
                    placeholder="e.g. Maya Chen"
                    onChange={(e) => setOwnerName(e.target.value)}
                    className="w-full p-3 rounded-2xl liquid-glass-nested text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                </div>
              )}

              <div className="flex items-center gap-3 pt-4">
                <LiquidGlassButton
                  variant="circle"
                  size="sm"
                  onClick={() => setStep(1)}
                >
                  <ArrowLeft className="w-4 h-4" />
                </LiquidGlassButton>
                <LiquidGlassButton
                  variant="pill"
                  accent
                  size="md"
                  onClick={() => setStep(3)}
                  className="flex-1"
                >
                  <span>Review Summary</span>
                  <ArrowRight className="w-4 h-4 ml-1" />
                </LiquidGlassButton>
              </div>
            </div>
          )}

          {/* STEP 3: Review & 1-Tap Bind */}
          {step === 3 && (
            <div className="space-y-6">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                  Step 3 • Instant Bind
                </span>
                <h2 className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                  Ready to activate
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Review your monthly subscription before sealing with biometrics.
                </p>
              </div>

              {/* Summary Card */}
              <div className="rounded-3xl liquid-glass-nested p-5 space-y-3 text-xs">
                <div className="flex justify-between pb-2 border-b border-white/20 dark:border-slate-700">
                  <span className="text-slate-500">Selected Protection:</span>
                  <span className="font-bold text-slate-900 dark:text-white capitalize">
                    {selectedItems.join(", ")}
                  </span>
                </div>
                <div className="flex justify-between pb-2 border-b border-white/20 dark:border-slate-700">
                  <span className="text-slate-500">Coverage Cap:</span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    ${coverageLimit.toLocaleString()} / year
                  </span>
                </div>
                <div className="flex justify-between pb-2 border-b border-white/20 dark:border-slate-700">
                  <span className="text-slate-500">Deductible:</span>
                  <span className="font-bold text-slate-900 dark:text-white">${deductible}</span>
                </div>
                <div className="flex justify-between pb-2 border-b border-white/20 dark:border-slate-700">
                  <span className="text-slate-500">Super App Account:</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">
                    {isAuthenticated ? `${userName} (SSO Verified)` : ownerName || "Guest User"}
                  </span>
                </div>
                <div className="flex justify-between pt-1 text-sm font-black text-slate-900 dark:text-white">
                  <span>Total Premium:</span>
                  <span className="text-violet-600 dark:text-violet-400">${calculatedMonthly} / month</span>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl liquid-glass-nested text-xs text-violet-800 dark:text-violet-300 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-violet-600 shrink-0" />
                <span>Zero lock-in contracts. Cancel or modify anytime via DPS Super App.</span>
              </div>

              <div className="flex items-center gap-3 pt-4">
                <LiquidGlassButton
                  variant="circle"
                  size="sm"
                  onClick={() => setStep(2)}
                >
                  <ArrowLeft className="w-4 h-4" />
                </LiquidGlassButton>
                <LiquidGlassButton
                  variant="pill"
                  accent
                  size="md"
                  onClick={handleActivate}
                  disabled={isActivating}
                  className="flex-1"
                >
                  {isActivating ? (
                    <>
                      <Zap className="w-4 h-4 mr-1.5 animate-spin" />
                      <span>Signing via DPS Bridge...</span>
                    </>
                  ) : (
                    <>
                      <Fingerprint className="w-4 h-4 mr-1.5" />
                      <span>Sign &amp; Activate Policy</span>
                    </>
                  )}
                </LiquidGlassButton>
              </div>
            </div>
          )}

          {/* STEP 4: Celebratory Confirmation */}
          {step === 4 && (
            <div className="py-12 text-center space-y-5">
              <div className="w-18 h-18 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center text-3xl shadow-xl animate-bounce">
                🎉
              </div>

              <div>
                <h2 className="text-2xl font-black text-slate-900 dark:text-white">
                  You&apos;re Officially Protected!
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 max-w-xs mx-auto leading-relaxed">
                  Your policy certificate and real-time claim access are live in your DPS Super App wallet.
                </p>
              </div>

              <LiquidGlassContainer variant="rounded" className="p-4 max-w-xs mx-auto text-xs space-y-1">
                <div className="font-bold text-slate-900 dark:text-white">Policy #NV-82941-DPS</div>
                <div className="text-emerald-600 dark:text-emerald-400 font-semibold">Active &amp; Live</div>
                <div className="text-slate-400 text-[11px]">${calculatedMonthly}/mo via DPS Pay</div>
              </LiquidGlassContainer>

              <LiquidGlassButton
                variant="pill"
                accent
                size="md"
                onClick={resetAndClose}
                className="w-full max-w-xs mx-auto"
              >
                Back to Dashboard
              </LiquidGlassButton>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
