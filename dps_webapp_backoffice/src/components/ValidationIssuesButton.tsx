'use client';
import React, { useState } from 'react';

interface ValidationIssuesButtonProps {
  errors: Record<string, string>;
}

export default function ValidationIssuesButton({ errors }: ValidationIssuesButtonProps) {
  const [activeErrorIndex, setActiveErrorIndex] = useState(0);

  if (!errors || Object.keys(errors).length === 0) {
    return null;
  }

  const errorKeys = Object.keys(errors);

  const handleClick = () => {
    const nextIndex = activeErrorIndex >= errorKeys.length ? 0 : activeErrorIndex;
    const errorField = errorKeys[nextIndex].split('.').pop() as string;
    const el = document.getElementsByName(errorField)[0];
    
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // Highlight effect
      el.classList.add('ring-4', 'ring-rose-500/50');
      setTimeout(() => el.classList.remove('ring-4', 'ring-rose-500/50'), 1500);
      el.focus({ preventScroll: true });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    
    setActiveErrorIndex((nextIndex + 1) % errorKeys.length);
  };

  return (
    <div className="fixed bottom-8 right-8 z-50 animate-in fade-in slide-in-from-bottom-4">
      <button 
        onClick={handleClick}
        className="flex items-center space-x-2 bg-rose-600 hover:bg-rose-700 text-white px-5 py-3 rounded-full shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1 group"
      >
        <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold">
          {errorKeys.length}
        </div>
        <span className="font-semibold text-sm">
          Next Issue ({activeErrorIndex + 1}/{errorKeys.length})
        </span>
        <svg className="w-4 h-4 ml-1 transition-transform group-active:translate-y-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
    </div>
  );
}
