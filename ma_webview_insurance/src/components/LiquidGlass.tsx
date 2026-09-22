"use client";

import React from "react";

export type GlassVariant = "rounded" | "pill" | "circle";

interface LiquidGlassContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: GlassVariant;
  interactive?: boolean;
  nested?: boolean;
  sheen?: boolean;
  children: React.ReactNode;
  className?: string;
}

export function LiquidGlassContainer({
  variant = "rounded",
  interactive = false,
  nested = false,
  sheen = true,
  children,
  className = "",
  ...rest
}: LiquidGlassContainerProps) {
  const shapeClass =
    variant === "pill"
      ? "liquid-glass-pill"
      : variant === "circle"
      ? "liquid-glass-circle"
      : "rounded-3xl";

  const baseClass = nested ? "liquid-glass-nested" : "liquid-glass";
  const interactiveClass = interactive ? "hover:scale-[1.01] hover:shadow-2xl active:scale-[0.99] transition-transform duration-200 cursor-pointer" : "";
  const sheenClass = sheen ? "liquid-sheen" : "";

  return (
    <div
      className={`${baseClass} ${shapeClass} ${interactiveClass} ${sheenClass} ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
}

interface LiquidGlassButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: GlassVariant;
  accent?: boolean;
  size?: "sm" | "md" | "lg";
  children: React.ReactNode;
  className?: string;
}

export function LiquidGlassButton({
  variant = "pill",
  accent = false,
  size = "md",
  children,
  className = "",
  ...rest
}: LiquidGlassButtonProps) {
  const shapeClass =
    variant === "circle"
      ? "liquid-glass-circle p-0"
      : variant === "pill"
      ? "liquid-glass-pill"
      : "rounded-2xl";

  const sizeClass =
    variant === "circle"
      ? size === "sm"
        ? "w-9 h-9"
        : size === "lg"
        ? "w-13 h-13"
        : "w-11 h-11"
      : size === "sm"
      ? "px-4 py-2 text-xs font-bold"
      : size === "lg"
      ? "px-7 py-3.5 text-sm sm:text-base font-bold"
      : "px-5 py-2.5 text-xs sm:text-sm font-bold";

  const btnClass = accent ? "liquid-glass-accent-btn" : "liquid-glass-btn text-slate-800 dark:text-slate-100";

  return (
    <button
      className={`inline-flex flex-row items-center justify-center whitespace-nowrap shrink-0 gap-1.5 leading-none ${btnClass} ${shapeClass} ${sizeClass} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}

interface LiquidGlassBadgeProps {
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function LiquidGlassBadge({ icon, children, className = "" }: LiquidGlassBadgeProps) {
  return (
    <div
      className={`inline-flex flex-row items-center whitespace-nowrap gap-2 px-3.5 py-1.5 rounded-full liquid-glass-nested text-xs font-bold tracking-wide text-slate-800 dark:text-slate-200 shadow-xs ${className}`}
    >
      {icon}
      <span>{children}</span>
    </div>
  );
}
