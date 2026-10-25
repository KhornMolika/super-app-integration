"use client";

import React, { useState, useMemo } from 'react';

export interface ActivityDataPoint {
  date: string;
  label: string;
  submissions: number;
  reviews: number;
}

interface ActivityTrendChartProps {
  title?: string;
  description?: string;
  data: ActivityDataPoint[];
  timeframe?: '7D' | '30D' | '90D';
  onTimeframeChange?: (tf: '7D' | '30D' | '90D') => void;
  primaryLabel?: string;
  secondaryLabel?: string;
}

export default function ActivityTrendChart({
  title = 'Ecosystem Velocity & Releases',
  description = 'Aggregated submissions, version updates, and compliance verifications across all ministries.',
  data,
  timeframe,
  onTimeframeChange,
  primaryLabel = 'Submissions',
  secondaryLabel = 'Scans & Reviews',
}: ActivityTrendChartProps) {
  const [internalTf, setInternalTf] = useState<'7D' | '30D' | '90D'>('30D');
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  // Allow controlled prop or internal state
  const activeTf = timeframe !== undefined ? timeframe : internalTf;

  const handleTfChange = (tf: '7D' | '30D' | '90D') => {
    setInternalTf(tf);
    setHoveredIdx(null);
    if (onTimeframeChange) onTimeframeChange(tf);
  };

  const displayData = useMemo(() => {
    if (!data || data.length === 0) return [];
    const count = activeTf === '7D' ? 7 : activeTf === '30D' ? 30 : 90;
    return data.slice(-count);
  }, [data, activeTf]);

  const svgWidth = 600;
  const svgHeight = 210;
  const padding = { top: 22, right: 20, bottom: 35, left: 35 };
  const chartWidth = svgWidth - padding.left - padding.right;
  const chartHeight = svgHeight - padding.top - padding.bottom;

  // Compute maximum value cleanly
  const rawMax = useMemo(() => {
    if (displayData.length === 0) return 4;
    return Math.max(...displayData.map((d) => Math.max(d.submissions, d.reviews)), 0);
  }, [displayData]);

  // Clean distinct integer ticks without duplicates
  const yTicks = useMemo(() => {
    const effectiveMax = Math.max(rawMax, 3);
    if (effectiveMax <= 4) {
      return Array.from({ length: effectiveMax + 1 }, (_, i) => i);
    }
    const step = Math.ceil(effectiveMax / 4);
    const ticks = [0];
    for (let v = step; v < effectiveMax; v += step) ticks.push(v);
    ticks.push(effectiveMax);
    return ticks;
  }, [rawMax]);

  const maxVal = yTicks[yTicks.length - 1];

  const points = useMemo(() => {
    if (displayData.length === 0) return { subCoords: [], revCoords: [] };
    const step = displayData.length > 1 ? chartWidth / (displayData.length - 1) : chartWidth;

    const subCoords = displayData.map((d, i) => {
      const x = padding.left + i * step;
      const y = padding.top + chartHeight - (d.submissions / maxVal) * chartHeight;
      return { x, y, data: d };
    });

    const revCoords = displayData.map((d, i) => {
      const x = padding.left + i * step;
      const y = padding.top + chartHeight - (d.reviews / maxVal) * chartHeight;
      return { x, y, data: d };
    });

    return { subCoords, revCoords };
  }, [displayData, chartWidth, chartHeight, padding, maxVal]);

  const makeSmoothPath = (coords: { x: number; y: number }[]) => {
    if (coords.length === 0) return '';
    if (coords.length === 1) return `M ${coords[0].x} ${coords[0].y}`;

    let path = `M ${coords[0].x} ${coords[0].y}`;
    for (let i = 0; i < coords.length - 1; i++) {
      const p0 = coords[i === 0 ? i : i - 1];
      const p1 = coords[i];
      const p2 = coords[i + 1];
      const p3 = coords[i + 2] || p2;

      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;

      path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
    }
    return path;
  };

  const subLinePath = useMemo(() => makeSmoothPath(points.subCoords), [points.subCoords]);
  const revLinePath = useMemo(() => makeSmoothPath(points.revCoords), [points.revCoords]);

  const subAreaPath = useMemo(() => {
    if (points.subCoords.length === 0) return '';
    const firstX = points.subCoords[0].x;
    const lastX = points.subCoords[points.subCoords.length - 1].x;
    const baseY = padding.top + chartHeight;
    return `${subLinePath} L ${lastX} ${baseY} L ${firstX} ${baseY} Z`;
  }, [subLinePath, points.subCoords, padding, chartHeight]);

  const totalSubs = displayData.reduce((acc, curr) => acc + curr.submissions, 0);
  const totalRevs = displayData.reduce((acc, curr) => acc + curr.reviews, 0);

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-700/80 flex flex-col justify-between h-full">
      {/* Consistent Header with Icon Chip */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-slate-100 dark:border-slate-700/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-50 dark:bg-brand-500/10 text-brand-600 dark:text-brand-400 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                {title}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">
                {description}
              </p>
            </div>
          </div>

          {/* Unified Controls & Legend in Header */}
          <div className="flex items-center gap-4 shrink-0 self-start sm:self-auto">
            {/* Inline Legend Pills */}
            <div className="hidden sm:flex items-center gap-3 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-brand-500 shrink-0" />
                <span className="text-slate-500 dark:text-slate-400 font-medium">{primaryLabel}:</span>
                <span className="font-bold text-slate-800 dark:text-slate-100 font-mono">{totalSubs}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-400 shrink-0" />
                <span className="text-slate-500 dark:text-slate-400 font-medium">{secondaryLabel}:</span>
                <span className="font-bold text-slate-800 dark:text-slate-100 font-mono">{totalRevs}</span>
              </div>
            </div>

            {/* Timeframe Switcher */}
            <div className="inline-flex rounded-xl bg-slate-100 dark:bg-slate-900/60 p-1 border border-slate-200/60 dark:border-slate-700/60">
              {(['7D', '30D', '90D'] as const).map((tf) => {
                const isActive = activeTf === tf;
                return (
                  <button
                    key={tf}
                    type="button"
                    onClick={() => handleTfChange(tf)}
                    className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                      isActive
                        ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm ring-1 ring-slate-200/60 dark:ring-slate-600/60 font-bold'
                        : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                    }`}
                  >
                    {tf}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* SVG Chart Container */}
        <div className="relative mt-5 w-full h-56">
          <svg
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            preserveAspectRatio="none"
            className="w-full h-full overflow-visible"
            onMouseLeave={() => setHoveredIdx(null)}
          >
            <defs>
              <linearGradient id="areaSubGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#6366f1" stopOpacity="0.14" />
                <stop offset="100%" stopColor="#6366f1" stopOpacity="0.0" />
              </linearGradient>
              <linearGradient id="lineSubGradient" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#4f46e5" />
                <stop offset="100%" stopColor="#6366f1" />
              </linearGradient>
            </defs>

            {/* Distinct Integer Grid lines */}
            {yTicks.map((val) => {
              const y = padding.top + chartHeight * (1 - val / maxVal);
              return (
                <g key={val}>
                  <line
                    x1={padding.left}
                    y1={y}
                    x2={svgWidth - padding.right}
                    y2={y}
                    stroke="currentColor"
                    strokeDasharray="4 4"
                    className="text-slate-200 dark:text-slate-700/40"
                  />
                  <text
                    x={padding.left - 8}
                    y={y + 3}
                    textAnchor="end"
                    className="text-[10px] fill-slate-400 dark:fill-slate-500 font-mono font-medium"
                  >
                    {val}
                  </text>
                </g>
              );
            })}

            {/* Submissions Area Gradient */}
            {subAreaPath && <path d={subAreaPath} fill="url(#areaSubGradient)" />}

            {/* Secondary Revisions Line: Clean neutral dashed line */}
            {revLinePath && (
              <path
                d={revLinePath}
                fill="none"
                stroke="#94a3b8"
                strokeWidth="2"
                strokeDasharray="4 4"
                className="transition-all duration-300"
              />
            )}

            {/* Primary Submissions Line */}
            {subLinePath && (
              <path
                d={subLinePath}
                fill="none"
                stroke="url(#lineSubGradient)"
                strokeWidth="2.75"
                strokeLinecap="round"
                className="transition-all duration-300"
              />
            )}

            {/* X Axis Date Labels */}
            {displayData.map((d, i) => {
              let showLabel = false;
              if (activeTf === '7D') {
                showLabel = true;
              } else if (activeTf === '30D') {
                showLabel = i === 0 || i === displayData.length - 1 || i % 5 === 0;
              } else {
                showLabel = i === 0 || i === displayData.length - 1 || i % 15 === 0;
              }
              if (!showLabel) return null;

              const step = displayData.length > 1 ? chartWidth / (displayData.length - 1) : chartWidth;
              const x = padding.left + i * step;
              return (
                <text
                  key={d.label + i}
                  x={x}
                  y={svgHeight - 10}
                  textAnchor="middle"
                  className="text-[10px] fill-slate-400 dark:fill-slate-500 font-medium"
                >
                  {d.label}
                </text>
              );
            })}

            {/* Interactive Touch/Hover Columns */}
            {points.subCoords.map((pt, i) => {
              const step = displayData.length > 1 ? chartWidth / (displayData.length - 1) : chartWidth;
              const hoverColWidth = Math.max(step, 24);
              const isHovered = hoveredIdx === i;

              return (
                <g key={i}>
                  <rect
                    x={pt.x - hoverColWidth / 2}
                    y={padding.top}
                    width={hoverColWidth}
                    height={chartHeight}
                    fill="transparent"
                    onMouseEnter={() => setHoveredIdx(i)}
                    className="cursor-pointer"
                  />

                  {isHovered && (
                    <>
                      <line
                        x1={pt.x}
                        y1={padding.top}
                        x2={pt.x}
                        y2={padding.top + chartHeight}
                        stroke="#6366f1"
                        strokeWidth="1.5"
                        strokeDasharray="2 2"
                      />
                      <circle
                        cx={pt.x}
                        cy={pt.y}
                        r="5"
                        fill="#6366f1"
                        stroke="#ffffff"
                        strokeWidth="2"
                        className="dark:stroke-slate-900"
                      />
                      <circle
                        cx={pt.x}
                        cy={points.revCoords[i].y}
                        r="4"
                        fill="#94a3b8"
                        stroke="#ffffff"
                        strokeWidth="2"
                        className="dark:stroke-slate-900"
                      />
                    </>
                  )}
                </g>
              );
            })}
          </svg>

          {/* Floating Tooltip Card */}
          {hoveredIdx !== null && displayData[hoveredIdx] && (
            <div
              className="absolute z-20 pointer-events-none transform -translate-x-1/2 -translate-y-full bg-slate-900/95 dark:bg-slate-950/95 text-white backdrop-blur-md px-3.5 py-2.5 rounded-xl shadow-xl border border-slate-700/80 text-xs transition-all duration-150"
              style={{
                left: `${((points.subCoords[hoveredIdx].x) / svgWidth) * 100}%`,
                top: `${((Math.min(points.subCoords[hoveredIdx].y, points.revCoords[hoveredIdx].y)) / svgHeight) * 100 - 10}%`,
              }}
            >
              <div className="font-semibold text-slate-300 text-[10px] pb-1 border-b border-slate-700/60 mb-1.5 flex items-center justify-between gap-3">
                <span>{displayData[hoveredIdx].date || displayData[hoveredIdx].label}</span>
                <span className="text-brand-400 font-mono">Telemetry</span>
              </div>
              <div className="flex items-center justify-between gap-4 py-0.5">
                <span className="flex items-center gap-1.5 text-slate-300">
                  <span className="w-2 h-2 rounded-full bg-brand-400" />
                  {primaryLabel}:
                </span>
                <span className="font-bold text-white font-mono">
                  {displayData[hoveredIdx].submissions}
                </span>
              </div>
              <div className="flex items-center justify-between gap-4 py-0.5">
                <span className="flex items-center gap-1.5 text-slate-300">
                  <span className="w-2 h-2 rounded-full bg-slate-400" />
                  {secondaryLabel}:
                </span>
                <span className="font-bold text-slate-300 font-mono">
                  {displayData[hoveredIdx].reviews}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Consistent Bottom Footer */}
      <div className="pt-4 mt-auto border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
        <span>Daily aggregated platform telemetry</span>
        <span className="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          Updated in real-time
        </span>
      </div>
    </div>
  );
}
