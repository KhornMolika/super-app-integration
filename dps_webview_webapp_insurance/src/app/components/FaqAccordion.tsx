"use client";

import React, { useState } from "react";
import { ChevronDown, MessageCircle, HelpCircle } from "lucide-react";
import { LiquidGlassContainer, LiquidGlassButton, LiquidGlassBadge } from "./LiquidGlass";

export default function FaqAccordion({ onOpenChat }: { onOpenChat: () => void }) {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const faqs = [
    {
      q: "Wait, why is this so much cheaper than traditional insurance?",
      a: "Because we cut out the middlemen! Legacy insurance companies spend millions on commission agents, shiny skyscraper offices, and paper filing cabinets. Nova runs digitally inside the DPS Super App with automated claims processing, passing the 60% savings straight to you.",
    },
    {
      q: "How fast do claims actually get paid out?",
      a: "Over 85% of standard gadget and small apartment claims are processed and approved within 8 to 15 minutes. Once approved, the funds drop straight into your DPS Super App digital wallet immediately — no paper checks in the mail.",
    },
    {
      q: "Can I cancel whenever without someone calling me 10 times?",
      a: "Yes! Absolutely zero awkward retention phone calls. You can pause, adjust, or cancel your policy directly in the DPS Super App with a single toggle. No cancellation fees, no guilt trips.",
    },
    {
      q: "What actually counts as 'accidental damage' for my phone or laptop?",
      a: "Cracked screens, dropping your phone in the sink/pool, accidental tea spills on your keyboard, or having your backpack swiped while at a coffee shop. As long as you didn't intentionally smash it with a hammer for a TikTok video, you're good.",
    },
    {
      q: "What if I'm not using the DPS Super App right now?",
      a: "You can explore quotes, calculate plans, and customize coverage directly in any web browser. When you're ready to activate or file hardware-verified claims with GPS/Camera, you can bind it directly to your DPS account via Single Sign-On.",
    },
    {
      q: "Is Nova actually legally licensed and secure?",
      a: "100%. Nova operates under certified insurance regulatory frameworks partnered with top-tier, A-rated reinsurers. Your payments and biometric validations are encrypted with bank-grade 256-bit SSL protocols.",
    },
  ];

  const toggleFaq = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section id="faq" className="py-20 relative">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-14">
          <LiquidGlassBadge
            icon={<HelpCircle className="w-3.5 h-3.5 text-violet-500" />}
            className="mb-3"
          >
            Got Questions?
          </LiquidGlassBadge>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Real answers. Zero fine print.
          </h2>
          <p className="mt-3 text-base text-slate-600 dark:text-slate-300">
            Everything you need to know about our coverage, explained like a text from a friend.
          </p>
        </div>

        {/* Accordion List in Liquid Glass */}
        <div className="space-y-3.5">
          {faqs.map((faq, idx) => {
            const isOpen = openIndex === idx;
            return (
              <LiquidGlassContainer
                key={idx}
                variant="rounded"
                className="overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() => toggleFaq(idx)}
                  className="w-full p-5 sm:p-6 text-left flex items-center justify-between gap-4 cursor-pointer focus:outline-none"
                >
                  <span className="text-base font-bold text-slate-900 dark:text-white">
                    {faq.q}
                  </span>
                  <div
                    className={`w-8 h-8 rounded-full liquid-glass-nested flex items-center justify-center shrink-0 transition-transform duration-200 ${
                      isOpen ? "rotate-180 text-violet-600 dark:text-violet-400" : "text-slate-500"
                    }`}
                  >
                    <ChevronDown className="w-4 h-4" />
                  </div>
                </button>

                {isOpen && (
                  <div className="px-5 pb-5 sm:px-6 sm:pb-6 text-sm text-slate-600 dark:text-slate-300 leading-relaxed border-t border-white/20 dark:border-slate-800/80 pt-4">
                    {faq.a}
                  </div>
                )}
              </LiquidGlassContainer>
            );
          })}
        </div>

        {/* Still Have Questions Box in Liquid Glass */}
        <div className="mt-12">
          <LiquidGlassContainer
            variant="rounded"
            className="p-6 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl"
          >
            <div className="text-left">
              <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                Still have a specific question?
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Skip the telephone queue. Chat with our live AI &amp; claims support right now.
              </p>
            </div>
            <LiquidGlassButton
              variant="pill"
              accent
              size="sm"
              onClick={onOpenChat}
              className="shrink-0"
            >
              <MessageCircle className="w-4 h-4 mr-1.5" />
              <span>Open Instant Chat</span>
            </LiquidGlassButton>
          </LiquidGlassContainer>
        </div>

      </div>
    </section>
  );
}
