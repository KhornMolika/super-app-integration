"use client";

import React, { useState } from 'react';

export interface DonutSegment {
  label: string;
  value: number;
  color: string;
  hoverColor?: string;
}

export interface DonutTab {
  id: string;
  label: string;
  centerLabel: string;
  segments: DonutSegment[];
}

interface DistributionDonutChartProps {
  title: string;
  description?: string;
  tabs: DonutTab[];
  activeTabId?: string;
  onTabChange?: (tabId: string) => void;
}

export default function DistributionDonutChart({
  title,
  description,
  tabs,
  activeTabId,
  onTabChange,
}: DistributionDonutChartProps) {
  const [internalTabId, setInternalTabId] = useState(tabs[0]?.id || '');
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const currentTabId = activeTabId || internalTabId;
  const currentTab = tabs.find((t) => t.id === currentTabId) || tabs[0];

  const handleTabClick = (tabId: string) => {
    setInternalTabId(tabId);
    setHoveredIndex(null);
    if (onTabChange) onTabChange(tabId);
  };

  const segments = currentTab?.segments || [];
  const totalValue = segments.reduce((sum, seg) => sum + seg.value, 0);
  const activeSegmentsCount = segments.filter((s) => s.value > 0).length;

  // SVG Geometry
  const size = 160;
  const strokeWidth = 20;
  const radius = (size - strokeWidth) / 2; // (160 - 20) / 2 = 70
  const circumference = 2 * Math.PI * radius; // ≈ 439.82

  let accumulatedPercent = 0;

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-700/80 flex flex-col justify-between h-full">
      {/* Consistent Header with Icon Chip */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-slate-100 dark:border-slate-700/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z"
                />
              </svg>
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                {title}
              </h3>
              {description && (
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">
                  {description}
                </p>
              )}
            </div>
          </div>

          {tabs.length > 1 && (
            <div className="inline-flex rounded-xl bg-slate-100 dark:bg-slate-900/60 p-1 border border-slate-200/60 dark:border-slate-700/60 shrink-0 self-start sm:self-auto">
              {tabs.map((tab) => {
                const isActive = tab.id === currentTabId;
                return (
                  <button
                    key={tab.id}
                    onClick={() => handleTabClick(tab.id)}
                    className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all ${
                      isActive
                        ? 'bg-white dark:bg-slate-800 text-brand-600 dark:text-brand-400 shadow-sm'
                        : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Visual Chart & Structured Legend */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-7 pt-6 pb-4">
          {/* Donut SVG Ring */}
          <div className="relative w-44 h-44 flex items-center justify-center shrink-0">
            <svg
              viewBox={`0 0 ${size} ${size}`}
              className="w-full h-full -rotate-90 transform"
            >
              {/* Background Empty Ring Track */}
              <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke="currentColor"
                strokeWidth={strokeWidth}
                className="text-slate-100 dark:text-slate-700/30"
              />

              {totalValue > 0 &&
                segments.map((seg, idx) => {
                  if (seg.value <= 0) return null;
                  const percent = seg.value / totalValue;
                  const strokeDasharray = `${percent * circumference} ${circumference}`;
                  const strokeDashoffset = -(accumulatedPercent * circumference);
                  accumulatedPercent += percent;

                  const isHovered = hoveredIndex === idx;

                  return (
                    <circle
                      key={seg.label}
                      cx={size / 2}
                      cy={size / 2}
                      r={radius}
                      fill="none"
                      stroke={seg.color}
                      strokeWidth={isHovered ? strokeWidth + 3 : strokeWidth}
                      strokeDasharray={strokeDasharray}
                      strokeDashoffset={strokeDashoffset}
                      strokeLinecap={activeSegmentsCount > 1 ? 'round' : 'butt'}
                      onMouseEnter={() => setHoveredIndex(idx)}
                      onMouseLeave={() => setHoveredIndex(null)}
                      className="cursor-pointer transition-all duration-300 ease-out"
                      style={{
                        filter: isHovered ? 'drop-shadow(0px 0px 6px rgba(0,0,0,0.25))' : undefined,
                      }}
                    />
                  );
                })}
            </svg>

            {/* Donut Center Display */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center px-4">
              {hoveredIndex !== null && segments[hoveredIndex] ? (
                <>
                  <span className="text-2xl font-extrabold text-slate-800 dark:text-slate-100 tracking-tight">
                    {segments[hoveredIndex].value}
                  </span>
                  <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-400 uppercase tracking-wider truncate max-w-[100px]">
                    {segments[hoveredIndex].label}
                  </span>
                  <span className="text-[11px] font-bold text-brand-600 dark:text-brand-400 mt-0.5">
                    {totalValue > 0
                      ? `${Math.round((segments[hoveredIndex].value / totalValue) * 100)}%`
                      : '0%'}
                  </span>
                </>
              ) : (
                <>
                  <span className="text-3xl font-extrabold text-slate-800 dark:text-slate-100 tracking-tight">
                    {totalValue}
                  </span>
                  <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-400 uppercase tracking-wider truncate max-w-[100px] mt-0.5">
                    {currentTab?.centerLabel || 'Total'}
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Clean Aligned Tabular Legend */}
          <div className="flex flex-col gap-1.5 w-full max-w-[240px]">
            {segments.map((seg, idx) => {
              const percent = totalValue > 0 ? Math.round((seg.value / totalValue) * 100) : 0;
              const isHovered = hoveredIndex === idx;

              return (
                <div
                  key={seg.label}
                  onMouseEnter={() => setHoveredIndex(idx)}
                  onMouseLeave={() => setHoveredIndex(null)}
                  className={`grid grid-cols-[1fr_auto_auto] items-center gap-3 py-1.5 px-2.5 rounded-xl text-xs cursor-pointer transition-all ${
                    isHovered
                      ? 'bg-slate-100/80 dark:bg-slate-700/60 shadow-sm'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-700/30'
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0 transition-transform"
                      style={{
                        backgroundColor: seg.color,
                        transform: isHovered ? 'scale(1.2)' : 'scale(1)',
                      }}
                    />
                    <span
                      className={`truncate text-xs ${
                        isHovered
                          ? 'text-slate-900 dark:text-white font-semibold'
                          : 'text-slate-600 dark:text-slate-300 font-medium'
                      }`}
                    >
                      {seg.label}
                    </span>
                  </div>

                  {/* Clean Tabular Count */}
                  <span className="font-bold text-slate-800 dark:text-slate-200 font-mono text-right w-6">
                    {seg.value}
                  </span>

                  {/* Clean Tabular Percent */}
                  <span className="text-[11px] text-slate-400 dark:text-slate-400 font-mono text-right w-10">
                    {percent}%
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Consistent Bottom Footer */}
      <div className="pt-4 mt-auto border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
        <span>Active Categories</span>
        <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-brand-500" />
          {activeSegmentsCount} of {segments.length} reported
        </span>
      </div>
    </div>
  );
}
