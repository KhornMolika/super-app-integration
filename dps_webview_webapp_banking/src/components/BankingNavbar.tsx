"use client";

import React from "react";

interface BankingNavbarProps {
  userName: string;
  initial: string;
  isAuthenticated: boolean;
}

export default function BankingNavbar({
  userName,
  initial,
  isAuthenticated,
}: BankingNavbarProps) {
  return (
    <header className="bg-amber-500 text-white px-6 py-4 shadow-md flex justify-between items-center sticky top-0 z-30">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center font-black text-xl shadow-inner">
          🏦
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <h1 className="text-xl font-bold tracking-tight">DPS Banking</h1>
            <span className="text-[10px] uppercase font-extrabold tracking-wider px-2 py-0.5 rounded-full bg-white/20">
              Mini App
            </span>
          </div>
          <p className="text-xs text-amber-100 font-medium">Fast, frictionless digital finances</p>
        </div>
      </div>

      <div className="flex items-center gap-2.5">
        {isAuthenticated ? (
          <div className="flex items-center gap-2 bg-white/15 px-3 py-1.5 rounded-full border border-white/20 text-xs font-semibold shadow-xs">
            <div className="w-7 h-7 rounded-full bg-white text-amber-600 flex items-center justify-center font-bold text-xs shadow-xs">
              {initial}
            </div>
            <span className="hidden sm:inline">Hello, {userName}</span>
            <span className="w-2 h-2 rounded-full bg-emerald-300 animate-pulse" />
          </div>
        ) : (
          <div className="flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-full text-xs text-amber-100 italic">
            <span>Guest Mode</span>
          </div>
        )}
      </div>
    </header>
  );
}
