"use client";

import React from "react";
import BankingNavbar from "./BankingNavbar";
import AccountCard from "./AccountCard";
import TransferCard from "./TransferCard";
import CardsManagementCard from "./CardsManagementCard";

interface BankingAppClientProps {
  userName: string;
  initial: string;
  isAuthenticated: boolean;
}

export default function BankingAppClient({
  userName,
  initial,
  isAuthenticated,
}: BankingAppClientProps) {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans flex flex-col">
      {/* Header */}
      <BankingNavbar
        userName={userName}
        initial={initial}
        isAuthenticated={isAuthenticated}
      />

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 flex-1 w-full">
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
                Welcome back{isAuthenticated ? `, ${userName}` : ""}!
              </h2>
              <p className="text-gray-500 text-sm mt-1">
                Your linked accounts and financial services inside DPS Super App.
              </p>
            </div>

            {isAuthenticated && (
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-full text-xs font-bold shadow-xs">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>DPS SSO Verified</span>
              </div>
            )}
          </div>
        </div>

        {/* Dashboard Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <AccountCard />
          <TransferCard />
          <CardsManagementCard />
        </div>

        {/* Security & Regulatory Notice */}
        <div className="mt-12 p-4 bg-gray-100/80 rounded-2xl text-center text-xs text-gray-500 border border-gray-200/60">
          DPS Banking Mini App operates under bank-grade tokenized security protocols. All transactions are digitally signed and insured.
        </div>
      </main>
    </div>
  );
}
