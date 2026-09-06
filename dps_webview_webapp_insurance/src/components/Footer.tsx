"use client";

import React from "react";
import { 
  Zap, 
  ShieldCheck, 
  Lock, 
  Award, 
  Smartphone
} from "lucide-react";
import { LiquidGlassContainer, LiquidGlassButton } from "./LiquidGlass";

export default function Footer({ onOpenQuote }: { onOpenQuote: () => void }) {
  return (
    <footer className="bg-slate-950 text-slate-400 pt-16 pb-12 border-t border-slate-800 relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Trust Badges Banner in Liquid Glass */}
        <LiquidGlassContainer
          variant="rounded"
          className="p-6 sm:p-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-16 text-slate-300 shadow-2xl"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl liquid-glass-nested text-violet-400 flex items-center justify-center shrink-0">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-white">256-Bit Bank Encryption</div>
              <div className="text-[11px] text-slate-400">DPS Super App tokenized security</div>
            </div>
          </div>

          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl liquid-glass-nested text-emerald-400 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-white">Regulated &amp; Licensed</div>
              <div className="text-[11px] text-slate-400">Compliant fintech insurance framework</div>
            </div>
          </div>

          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl liquid-glass-nested text-amber-400 flex items-center justify-center shrink-0">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-white">A-Rated Reinsurers</div>
              <div className="text-[11px] text-slate-400">100% solvency &amp; backed reserves</div>
            </div>
          </div>

          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl liquid-glass-nested text-rose-400 flex items-center justify-center shrink-0">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-white">DPS Super App Verified</div>
              <div className="text-[11px] text-slate-400">Native Bridge hardware support</div>
            </div>
          </div>
        </LiquidGlassContainer>

        {/* Footer Navigation Columns */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10 pb-12 border-b border-slate-900">
          
          {/* Brand Info */}
          <div className="md:col-span-5 space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-violet-600 to-fuchsia-500 flex items-center justify-center text-white font-bold text-sm shadow-md">
                <Zap className="w-4 h-4 fill-white" />
              </div>
              <span className="font-extrabold text-xl tracking-tight text-white">
                nova<span className="text-violet-500">.</span>
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full liquid-glass-nested text-violet-300">
                Liquid Glass UI
              </span>
            </div>
            <p className="text-xs text-slate-400 max-w-sm leading-relaxed">
              Designed for the digital generation. Zero paperwork, lightning claims, and plain-language transparent coverage that fits your lifestyle.
            </p>
            <div className="text-xs text-slate-500">
              Part of the DPS Super App ecosystem &bull; Webview Mini App
            </div>
          </div>

          {/* Quick Links */}
          <div className="md:col-span-2 space-y-3">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-200">Coverage</div>
            <ul className="space-y-2 text-xs">
              <li><a href="#plans" className="hover:text-white transition-colors">Tech &amp; Phones</a></li>
              <li><a href="#plans" className="hover:text-white transition-colors">Renters &amp; Dorm</a></li>
              <li><a href="#plans" className="hover:text-white transition-colors">E-Bikes &amp; Scooters</a></li>
              <li><a href="#plans" className="hover:text-white transition-colors">Nomad Travel</a></li>
            </ul>
          </div>

          {/* Tech Links */}
          <div className="md:col-span-2 space-y-3">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-200">Tech &amp; Perks</div>
            <ul className="space-y-2 text-xs">
              <li><a href="#bridge-perks" className="hover:text-white transition-colors">Native Bridge GPS</a></li>
              <li><a href="#bridge-perks" className="hover:text-white transition-colors">Camera Claim Proof</a></li>
              <li><a href="#bridge-perks" className="hover:text-white transition-colors">Biometric Signing</a></li>
              <li><a href="#how-it-works" className="hover:text-white transition-colors">Instant Payouts</a></li>
            </ul>
          </div>

          {/* Action Box */}
          <div className="md:col-span-3 space-y-3">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-200">Ready in 90 Seconds?</div>
            <p className="text-xs text-slate-400">
              Get an instant customized quote with zero email spam or endless sales calls.
            </p>
            <LiquidGlassButton
              variant="pill"
              accent
              size="sm"
              onClick={onOpenQuote}
              className="w-full"
            >
              Get Instant Quote
            </LiquidGlassButton>
          </div>

        </div>

        {/* Bottom Disclaimer */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-slate-500">
          <p>
            &copy; {new Date().getFullYear()} Nova Insurance Technologies. Underwritten by DPS Partner Syndicate. All rights reserved.
          </p>
          <div className="flex items-center gap-4">
            <a href="#" className="hover:text-slate-400">Privacy Policy</a>
            <a href="#" className="hover:text-slate-400">Terms of Service</a>
            <a href="#" className="hover:text-slate-400">Regulatory Disclosure</a>
          </div>
        </div>

      </div>
    </footer>
  );
}
