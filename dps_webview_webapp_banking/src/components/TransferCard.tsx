"use client";

import React, { useState } from "react";

export default function TransferCard() {
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [transferred, setTransferred] = useState(false);

  const handleTransfer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount) return;
    setTransferred(true);
    setTimeout(() => {
      setTransferred(false);
      setAmount("");
      setRecipient("");
    }, 2000);
  };

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm hover:shadow-md transition-shadow border border-gray-100 flex flex-col justify-between">
      <div>
        <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center mb-4 text-2xl shadow-inner">
          💸
        </div>
        <h3 className="text-lg font-bold text-gray-900 mb-1">Instant Transfer</h3>
        <p className="text-gray-500 text-xs leading-relaxed mb-4">
          Send funds to other DPS wallets, phone numbers, or local bank accounts instantly.
        </p>

        <form onSubmit={handleTransfer} className="space-y-2.5 mb-4">
          <div>
            <input
              type="text"
              placeholder="Recipient phone or handle"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              className="w-full text-xs p-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <input
              type="number"
              placeholder="Amount ($ USD)"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full text-xs p-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </form>
      </div>

      <button
        onClick={handleTransfer}
        className="w-full py-2.5 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 transition-colors shadow-xs cursor-pointer"
      >
        {transferred ? "✓ Sent Successfully!" : "Send Money"}
      </button>
    </div>
  );
}
