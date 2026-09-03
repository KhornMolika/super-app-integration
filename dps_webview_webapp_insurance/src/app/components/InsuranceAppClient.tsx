"use client";

import React, { useState } from "react";
import { ThemeProvider } from "./ThemeProvider";
import Navbar from "./Navbar";
import HeroSection from "./HeroSection";
import HowItWorks from "./HowItWorks";
import CalculatorAndPlans from "./CalculatorAndPlans";
import SuperAppBridgeHub from "./SuperAppBridgeHub";
import SocialProof from "./SocialProof";
import FaqAccordion from "./FaqAccordion";
import Footer from "./Footer";
import QuickQuoteDrawer from "./QuickQuoteDrawer";
import ChatAssistant from "./ChatAssistant";
import { Zap, ArrowRight } from "lucide-react";
import { LiquidGlassContainer } from "./LiquidGlass";

interface InsuranceAppClientProps {
  userName: string;
  initial: string;
  isAuthenticated: boolean;
}

export default function InsuranceAppClient({
  userName,
  initial,
  isAuthenticated,
}: InsuranceAppClientProps) {
  const [isQuoteOpen, setIsQuoteOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);

  const handleSelectPlan = (planName: string, price: number) => {
    console.log(`Selected plan: ${planName} at $${price}`);
    setIsQuoteOpen(true);
  };

  return (
    <ThemeProvider>
      <div className="min-h-screen flex flex-col mesh-bg text-slate-900 dark:text-slate-100 selection:bg-violet-500 selection:text-white transition-colors duration-300 relative overflow-x-hidden">
        
        {/* Top atmospheric ambient glow orbs directly behind and around the floating navbar */}
        <div className="absolute top-0 left-1/4 -translate-x-1/2 -translate-y-1/4 w-[650px] h-[450px] bg-gradient-to-tr from-violet-600/25 via-purple-500/20 to-fuchsia-400/20 rounded-full blur-3xl pointer-events-none -z-10 animate-pulse-gentle" />
        <div className="absolute top-0 right-1/4 translate-x-1/2 -translate-y-1/4 w-[550px] h-[450px] bg-gradient-to-bl from-emerald-400/20 via-teal-500/15 to-indigo-500/20 rounded-full blur-3xl pointer-events-none -z-10" />

        {/* Sticky Floating Liquid Glass Navbar */}
        <Navbar
          userName={userName}
          isAuthenticated={isAuthenticated}
          initial={initial}
          onOpenQuote={() => setIsQuoteOpen(true)}
        />

        {/* Main Content Sections */}
        <main className="flex-1">
          {/* Hero Section with Live Simulator */}
          <HeroSection
            userName={userName}
            isAuthenticated={isAuthenticated}
            onOpenQuote={() => setIsQuoteOpen(true)}
          />

          {/* Simple 3-Step How It Works */}
          <HowItWorks onOpenQuote={() => setIsQuoteOpen(true)} />

          {/* Interactive Calculator & Plan Comparison Cards */}
          <CalculatorAndPlans onSelectPlan={handleSelectPlan} />

          {/* Super App Native Bridge Hub (Location, Camera, Biometrics) */}
          <SuperAppBridgeHub />

          {/* Social Proof Quote Cards */}
          <SocialProof />

          {/* Conversational Accordion FAQ */}
          <FaqAccordion onOpenChat={() => setIsChatOpen(true)} />
        </main>

        {/* Trust Badges & Licensing Footer */}
        <Footer onOpenQuote={() => setIsQuoteOpen(true)} />

        {/* Guided 3-Step Onboarding / Quick Quote Drawer */}
        <QuickQuoteDrawer
          isOpen={isQuoteOpen}
          onClose={() => setIsQuoteOpen(false)}
          userName={userName}
          isAuthenticated={isAuthenticated}
        />

        {/* Chat-First Support Assistant */}
        <ChatAssistant
          isOpen={isChatOpen}
          onToggle={() => setIsChatOpen(!isChatOpen)}
          onOpenQuote={() => setIsQuoteOpen(true)}
        />

        {/* Floating Mobile Bottom Liquid Glass Bar */}
        <div className="sm:hidden fixed bottom-3 left-3 right-3 z-30">
          <LiquidGlassContainer
            variant="pill"
            className="p-2.5 px-4 flex items-center justify-between gap-3 shadow-2xl"
          >
            <div>
              <span className="text-[10px] text-slate-400 font-semibold block">Starts from</span>
              <span className="text-base font-black text-slate-900 dark:text-white">$8<span className="text-xs font-normal text-slate-400">/mo</span></span>
            </div>
            <button
              onClick={() => setIsQuoteOpen(true)}
              className="flex-1 py-2.5 px-4 rounded-full liquid-glass-accent-btn font-bold text-xs inline-flex flex-row items-center justify-center gap-1.5 shadow-md active:scale-98 cursor-pointer whitespace-nowrap"
            >
              <Zap className="w-3.5 h-3.5 shrink-0" />
              <span>Get 90s Quote</span>
              <ArrowRight className="w-3.5 h-3.5 shrink-0" />
            </button>
          </LiquidGlassContainer>
        </div>

      </div>
    </ThemeProvider>
  );
}
