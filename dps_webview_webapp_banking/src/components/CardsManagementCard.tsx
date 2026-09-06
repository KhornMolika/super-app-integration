"use client";

import React from "react";

export default function CardsManagementCard() {
  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm hover:shadow-md transition-shadow border border-gray-100 flex flex-col justify-between">
      <div>
        <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-xl flex items-center justify-center mb-4 text-2xl shadow-inner">
          💳
        </div>
        <h3 className="text-lg font-bold text-gray-900 mb-1">Cards &amp; Limits</h3>
        <p className="text-gray-500 text-xs leading-relaxed mb-4">
          Manage your virtual debit cards, lock stolen cards, and control ATM limits.
        </p>

        <div className="p-4 rounded-xl bg-gradient-to-tr from-purple-700 via-indigo-600 to-violet-500 text-white shadow-md mb-2">
          <div className="flex justify-between items-center text-xs opacity-80 mb-4">
            <span className="font-bold tracking-wider uppercase text-[10px]">DPS Platinum</span>
            <span className="font-mono text-[10px]">Exp 09/29</span>
          </div>
          <div className="font-mono text-sm tracking-widest mb-2 font-bold">
            •••• •••• •••• 4129
          </div>
          <div className="flex justify-between items-end text-[10px]">
            <span className="font-semibold uppercase">DPS Super App User</span>
            <span className="font-black text-xs">VISA</span>
          </div>
        </div>
      </div>

      <button className="w-full py-2.5 rounded-xl bg-purple-600 text-white text-xs font-bold hover:bg-purple-700 transition-colors shadow-xs cursor-pointer">
        Manage Card Settings
      </button>
    </div>
  );
}
