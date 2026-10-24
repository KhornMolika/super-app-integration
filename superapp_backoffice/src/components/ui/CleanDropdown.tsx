'use client';

import React, { useState, useRef, useEffect } from 'react';

export interface CleanDropdownOption {
  value: string;
  label: string;
  count?: number;
  icon?: React.ReactNode;
  dotColor?: string;
}

export interface CleanDropdownProps {
  label: string;
  icon?: React.ReactNode;
  value: string;
  options: CleanDropdownOption[];
  onChange: (value: string) => void;
  align?: 'left' | 'right';
  className?: string;
  buttonClassName?: string;
  dropdownWidth?: string;
}

export function CleanDropdown({
  label,
  icon,
  value,
  options,
  onChange,
  align = 'left',
  className = '',
  buttonClassName = '',
  dropdownWidth = 'w-64',
}: CleanDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((o) => o.value === value) || options[0];

  // Close on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  return (
    <div ref={containerRef} className={`relative inline-block ${className}`}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`group flex items-center gap-2 h-10 px-3.5 py-1.5 rounded-xl border transition-all cursor-pointer text-xs font-semibold shadow-2xs focus:outline-none ${
          isOpen
            ? 'border-brand-500 ring-2 ring-brand-500/20 bg-white dark:bg-slate-900 text-slate-900 dark:text-white'
            : value !== 'ALL'
            ? 'border-brand-500/40 bg-brand-50/40 dark:bg-brand-500/10 text-brand-700 dark:text-brand-300 hover:bg-brand-50/70 dark:hover:bg-brand-500/20'
            : 'border-slate-200 dark:border-slate-700 bg-slate-50/90 dark:bg-slate-800/80 text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-800'
        } ${buttonClassName}`}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        {icon && (
          <span className="text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300 shrink-0">
            {icon}
          </span>
        )}
        <span className="text-slate-500 dark:text-slate-400 font-medium shrink-0">{label}</span>
        <span className="font-bold truncate max-w-[130px] text-slate-800 dark:text-slate-100">
          {selectedOption ? selectedOption.label : 'Select'}
        </span>

        {selectedOption?.count !== undefined && (
          <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-200/80 dark:bg-slate-700/80 text-slate-600 dark:text-slate-300 shrink-0">
            {selectedOption.count}
          </span>
        )}

        <svg
          className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ml-0.5 shrink-0 ${
            isOpen ? 'rotate-180 text-brand-600 dark:text-brand-400' : ''
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Floating Popover Overlay styled like HeaderProfile */}
      {isOpen && (
        <div
          className={`absolute ${
            align === 'left' ? 'left-0' : 'right-0'
          } top-full mt-2 ${dropdownWidth} max-w-[90vw] z-50 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-2xl p-2 animate-in fade-in-0 zoom-in-95 duration-150`}
          role="listbox"
        >
          {/* Header */}
          <div className="px-2.5 py-1 mb-1 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center justify-between">
            <span>Filter by {label.replace(':', '')}</span>
            {value !== 'ALL' && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onChange('ALL');
                  setIsOpen(false);
                }}
                className="text-brand-600 dark:text-brand-400 hover:underline capitalize font-semibold cursor-pointer text-[10px]"
              >
                Reset
              </button>
            )}
          </div>

          {/* Options List */}
          <div className="space-y-0.5 max-h-64 overflow-y-auto no-scrollbar">
            {options.map((option) => {
              const isSelected = option.value === value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    onChange(option.value);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center justify-between gap-2.5 px-3 py-2 text-xs font-medium rounded-xl transition-colors cursor-pointer text-left ${
                    isSelected
                      ? 'bg-brand-50 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300 font-semibold ring-1 ring-brand-500/20'
                      : 'text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/80'
                  }`}
                  role="option"
                  aria-selected={isSelected}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {option.dotColor && (
                      <span className={`w-2 h-2 rounded-full shrink-0 ${option.dotColor}`} />
                    )}
                    {option.icon && <span className="shrink-0 opacity-80">{option.icon}</span>}
                    <span className="truncate">{option.label}</span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {option.count !== undefined && (
                      <span
                        className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                          isSelected
                            ? 'bg-brand-100 text-brand-700 dark:bg-brand-800/60 dark:text-brand-300'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                        }`}
                      >
                        {option.count}
                      </span>
                    )}
                    {isSelected && (
                      <svg
                        className="w-3.5 h-3.5 text-brand-600 dark:text-brand-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2.5}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default CleanDropdown;
