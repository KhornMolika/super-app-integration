"use client";

import React from "react";
import { Star, CheckCircle2, MessageSquareHeart } from "lucide-react";
import { LiquidGlassContainer, LiquidGlassBadge } from "./LiquidGlass";

export default function SocialProof() {
  const reviews = [
    {
      name: "Chloe M.",
      age: 22,
      role: "Graphic Designer & Content Creator",
      avatar: "🌸",
      rating: 5,
      headline: "Claim approved before my coffee even got cold.",
      text: "Dropped my MacBook screen-first at a café on Tuesday morning. Filed a claim with 2 photos via the Super App, and $680 was deposited in my DPS account 12 minutes later. Actually unreal.",
      tag: "Laptop Claim",
    },
    {
      name: "Alex K.",
      age: 24,
      role: "Software Engineer",
      avatar: "⚡",
      rating: 5,
      headline: "Cancelled my $70/mo boomer policy immediately.",
      text: "Traditional insurance gave me a 38-page PDF I couldn't read and still denied a cracked camera lens last year. Nova is $14/mo, straightforward, and lives right in my Super App.",
      tag: "Tech Protection",
    },
    {
      name: "Dara S.",
      age: 21,
      role: "University Student",
      avatar: "🚲",
      rating: 5,
      headline: "My e-scooter got locked in rain; help arrived in 20m.",
      text: "Used the 1-tap GPS bridge in the app when my commute scooter battery died. The roadside lock team found my exact coordinates. 10/10 recommend to anyone living in the city.",
      tag: "E-Scooter / Commute",
    },
  ];

  return (
    <section className="py-20 relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <LiquidGlassBadge
            icon={<MessageSquareHeart className="w-3.5 h-3.5 text-rose-500" />}
            className="mb-3"
          >
            Community Love
          </LiquidGlassBadge>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Loved by 38,000+ digital natives.
          </h2>
          <p className="mt-4 text-base text-slate-600 dark:text-slate-300">
            Real stories from people who would usually rather pull teeth than talk to an insurance broker.
          </p>
        </div>

        {/* Testimonials Grid in Liquid Glass */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {reviews.map((rev, idx) => (
            <LiquidGlassContainer
              key={idx}
              variant="rounded"
              interactive
              className="p-7 sm:p-8 flex flex-col justify-between"
            >
              <div>
                {/* Rating Stars & Tag */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex text-amber-400 gap-0.5">
                    {[...Array(rev.rating)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full liquid-glass-nested text-slate-600 dark:text-slate-300">
                    {rev.tag}
                  </span>
                </div>

                {/* Snappy Headline */}
                <h3 className="text-base font-bold text-slate-900 dark:text-white mb-3">
                  &ldquo;{rev.headline}&rdquo;
                </h3>

                {/* Casual Review Body */}
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                  {rev.text}
                </p>
              </div>

              {/* Author Strip */}
              <div className="mt-6 pt-4 border-t border-white/20 dark:border-slate-800 flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl liquid-glass-nested flex items-center justify-center text-xl shadow-xs">
                  {rev.avatar}
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-xs text-slate-900 dark:text-white">
                      {rev.name}
                    </span>
                    <span className="text-[11px] text-slate-400">({rev.age})</span>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                  </div>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400">
                    {rev.role}
                  </span>
                </div>
              </div>
            </LiquidGlassContainer>
          ))}
        </div>

        {/* Stats Strip in Liquid Glass */}
        <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          <LiquidGlassContainer variant="rounded" className="p-6">
            <div className="text-3xl sm:text-4xl font-black bg-gradient-to-r from-violet-600 to-fuchsia-600 bg-clip-text text-transparent">
              99.2%
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-semibold">
              Claims Approval Rate
            </div>
          </LiquidGlassContainer>

          <LiquidGlassContainer variant="rounded" className="p-6">
            <div className="text-3xl sm:text-4xl font-black bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
              8 Mins
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-semibold">
              Average Payout Speed
            </div>
          </LiquidGlassContainer>

          <LiquidGlassContainer variant="rounded" className="p-6">
            <div className="text-3xl sm:text-4xl font-black bg-gradient-to-r from-amber-500 to-orange-500 bg-clip-text text-transparent">
              4.9 / 5
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-semibold">
              App Store &amp; DPS Rating
            </div>
          </LiquidGlassContainer>

          <LiquidGlassContainer variant="rounded" className="p-6">
            <div className="text-3xl sm:text-4xl font-black bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              $0
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-semibold">
              Hidden Cancellation Fees
            </div>
          </LiquidGlassContainer>
        </div>

      </div>
    </section>
  );
}
