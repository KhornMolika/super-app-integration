"use client";

import React from "react";

export default function AccountCard() {
  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm hover:shadow-md transition-shadow border border-gray-100 flex flex-col justify-between">
      <div>
        <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center mb-4 shadow-inner">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h3 className="text-lg font-bold text-gray-900 mb-1">My Accounts</h3>
        <p className="text-gray-500 text-xs leading-relaxed mb-4">
          View balances, transaction history, and savings goals across linked accounts.
        </p>

        <div className="p-3.5 bg-blue-50/60 rounded-xl border border-blue-100/80 mb-2">
          <div className="text-[11px] font-semibold text-blue-700 uppercase tracking-wider">
            Primary Checking
          </div>
          <div className="text-2xl font-black text-gray-900 mt-0.5">$4,850.20</div>
          <div className="text-[10px] text-gray-400 font-mono mt-1">**** 9821 &bull; Active</div>
        </div>
      </div>

      <button className="w-full py-2.5 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 transition-colors shadow-xs cursor-pointer">
        View Statements
      </button>
    </div>
  );
}
