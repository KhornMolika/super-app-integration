"use client";

import React, { useState } from "react";
import { useTheme } from "./ThemeProvider";
import { 
  Sun, 
  Moon, 
  Sparkles, 
  ShieldCheck, 
  UserCheck, 
  ArrowRight, 
  Menu, 
  X,
  Zap
} from "lucide-react";
import { LiquidGlassContainer, LiquidGlassButton } from "./LiquidGlass";

interface NavbarProps {
  userName?: string;
  isAuthenticated?: boolean;
  initial?: string;
  onOpenQuote: () => void;
}

export default function Navbar({
  userName = "Guest",
  isAuthenticated = false,
  initial = "G",
  onOpenQuote,
}: NavbarProps) {
  const { theme, toggleTheme } = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-3 z-40 w-full px-3 sm:px-6 lg:px-8 pointer-events-none">
      {/* Floating Liquid Glass Navigation Bar (Capsule / Pill shape) */}
      <LiquidGlassContainer
        variant="pill"
        className="max-w-7xl mx-auto h-16 sm:h-18 px-4 sm:px-6 flex items-center justify-between shadow-2xl pointer-events-auto backdrop-blur-2xl"
      >
        {/* Brand Logo */}
        <div className="flex items-center gap-3 shrink-0">
          <a href="#" className="flex items-center gap-2.5 group">
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-violet-600 via-purple-500 to-fuchsia-500 flex items-center justify-center text-white shadow-md shadow-violet-500/30 transition-transform group-hover:scale-105 shrink-0">
              <Zap className="w-5 h-5 fill-white shrink-0" />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-xl tracking-tight text-slate-900 dark:text-white">
                  nova<span className="text-violet-500">.</span>
                </span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/25 shrink-0">
                  DPS
                </span>
              </div>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                Liquid Glass UI
              </span>
            </div>
          </a>
        </div>

        {/* Desktop Navigation Links - Nested Glass Pill Links */}
        <nav className="hidden lg:flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-200">
          <a
            href="#plans"
            className="px-3.5 py-1.5 rounded-full hover:bg-white/60 dark:hover:bg-slate-800/60 hover:text-violet-600 dark:hover:text-violet-400 transition-all whitespace-nowrap"
          >
            Plans
          </a>
          <a
            href="#how-it-works"
            className="px-3.5 py-1.5 rounded-full hover:bg-white/60 dark:hover:bg-slate-800/60 hover:text-violet-600 dark:hover:text-violet-400 transition-all whitespace-nowrap"
          >
            How it Works
          </a>
          <a
            href="#calculator"
            className="px-3.5 py-1.5 rounded-full hover:bg-white/60 dark:hover:bg-slate-800/60 hover:text-violet-600 dark:hover:text-violet-400 transition-all whitespace-nowrap"
          >
            Calculator
          </a>
          <a
            href="#bridge-perks"
            className="px-3.5 py-1.5 rounded-full hover:bg-white/60 dark:hover:bg-slate-800/60 hover:text-violet-600 dark:hover:text-violet-400 transition-all flex items-center gap-1 text-violet-600 dark:text-violet-400 whitespace-nowrap"
          >
            <Sparkles className="w-3.5 h-3.5 shrink-0" />
            Super App Perks
          </a>
          <a
            href="#faq"
            className="px-3.5 py-1.5 rounded-full hover:bg-white/60 dark:hover:bg-slate-800/60 hover:text-violet-600 dark:hover:text-violet-400 transition-all whitespace-nowrap"
          >
            FAQ
          </a>
        </nav>

        {/* Right Action Area */}
        <div className="flex items-center gap-2.5 shrink-0">
          {/* SSO Auth Pill */}
          {isAuthenticated ? (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full liquid-glass-nested text-emerald-800 dark:text-emerald-300 text-xs font-bold shadow-xs shrink-0 whitespace-nowrap">
              <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shadow-xs shrink-0">
                {initial}
              </div>
              <span className="hidden sm:inline max-w-[100px] truncate">{userName}</span>
              <UserCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            </div>
          ) : (
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full liquid-glass-nested text-slate-500 dark:text-slate-400 text-xs font-medium shrink-0 whitespace-nowrap">
              <ShieldCheck className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span>Guest</span>
            </div>
          )}

          {/* Circular Liquid Glass Theme Toggle */}
          <LiquidGlassButton
            variant="circle"
            size="sm"
            onClick={toggleTheme}
            aria-label="Toggle Theme"
            className="shrink-0"
          >
            {theme === "dark" ? (
              <Sun className="w-4 h-4 text-amber-400 shrink-0" />
            ) : (
              <Moon className="w-4 h-4 text-slate-700 shrink-0" />
            )}
          </LiquidGlassButton>

          {/* Liquid Glass Accent CTA - FIXED: tight flex-row, whitespace-nowrap, no drop */}
          <LiquidGlassButton
            variant="pill"
            accent
            size="sm"
            onClick={onOpenQuote}
            className="group shrink-0"
          >
            <span>Get Quote</span>
            <ArrowRight className="w-3.5 h-3.5 shrink-0 transition-transform group-hover:translate-x-0.5" />
          </LiquidGlassButton>

          {/* Mobile Menu Button */}
          <LiquidGlassButton
            variant="circle"
            size="sm"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden shrink-0"
            aria-label="Open Mobile Menu"
          >
            {mobileMenuOpen ? <X className="w-4 h-4 shrink-0" /> : <Menu className="w-4 h-4 shrink-0" />}
          </LiquidGlassButton>
        </div>
      </LiquidGlassContainer>

      {/* Mobile Dropdown Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden mt-2 max-w-7xl mx-auto pointer-events-auto">
          <LiquidGlassContainer variant="rounded" className="p-4 space-y-3 shadow-2xl">
            <div className="flex flex-col space-y-1 text-sm font-semibold text-slate-700 dark:text-slate-200">
              <a
                href="#plans"
                onClick={() => setMobileMenuOpen(false)}
                className="py-2.5 px-3.5 rounded-2xl hover:bg-white/60 dark:hover:bg-slate-800/60"
              >
                Plans &amp; Pricing
              </a>
              <a
                href="#how-it-works"
                onClick={() => setMobileMenuOpen(false)}
                className="py-2.5 px-3.5 rounded-2xl hover:bg-white/60 dark:hover:bg-slate-800/60"
              >
                How it Works
              </a>
              <a
                href="#calculator"
                onClick={() => setMobileMenuOpen(false)}
                className="py-2.5 px-3.5 rounded-2xl hover:bg-white/60 dark:hover:bg-slate-800/60"
              >
                Interactive Calculator
              </a>
              <a
                href="#bridge-perks"
                onClick={() => setMobileMenuOpen(false)}
                className="py-2.5 px-3.5 rounded-2xl hover:bg-violet-500/10 text-violet-600 dark:text-violet-400 flex items-center gap-2"
              >
                <Sparkles className="w-4 h-4 shrink-0" />
                DPS Super App Bridge
              </a>
              <a
                href="#faq"
                onClick={() => setMobileMenuOpen(false)}
                className="py-2.5 px-3.5 rounded-2xl hover:bg-white/60 dark:hover:bg-slate-800/60"
              >
                FAQ
              </a>
            </div>

            <div className="pt-3 border-t border-white/20 dark:border-slate-800/60 flex justify-between items-center text-xs text-slate-500">
              <span>{isAuthenticated ? `Hi, ${userName}` : "Guest Mode"}</span>
              <LiquidGlassButton
                variant="pill"
                accent
                size="sm"
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenQuote();
                }}
              >
                <span>Instant 90s Quote</span>
                <ArrowRight className="w-3.5 h-3.5 shrink-0 ml-1" />
              </LiquidGlassButton>
            </div>
          </LiquidGlassContainer>
        </div>
      )}
    </header>
  );
}
