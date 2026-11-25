'use client';

import React from 'react';

export interface RequiredOptionalToggleProps {
  /**
   * Current requirement state.
   * true = Required, false = Optional. Defaults to true if undefined.
   */
  value?: boolean;
  /**
   * Callback invoked when user toggles between Required and Optional.
   */
  onChange?: (required: boolean) => void;
  /**
   * Disables interaction when true.
   */
  disabled?: boolean;
  /**
   * Custom CSS classes applied to the outer container.
   */
  className?: string;
  /**
   * Size variant. 'sm' (default, compact for tables/cards) or 'md'.
   */
  size?: 'sm' | 'md';
  /**
   * Custom label for required state (default: 'Required').
   */
  requiredLabel?: string;
  /**
   * Custom label for optional state (default: 'Optional').
   */
  optionalLabel?: string;
  /**
   * Whether to expand to full width of parent container.
   */
  fullWidth?: boolean;
}

/**
 * Reusable Segmented Toggle for selecting between Required and Optional.
 * Stops propagation automatically so clicking inside parent clickable cards
 * does not accidentally trigger row/card toggle events.
 */
export function RequiredOptionalToggle({
  value = true,
  onChange,
  disabled = false,
  className = '',
  size = 'sm',
  requiredLabel = 'Required',
  optionalLabel = 'Optional',
  fullWidth = false,
}: RequiredOptionalToggleProps) {
  const isRequired = value !== false;

  const handleSelect = (e: React.MouseEvent, required: boolean) => {
    e.stopPropagation();
    e.preventDefault();
    if (!disabled && onChange && isRequired !== required) {
      onChange(required);
    }
  };

  const isSmall = size === 'sm';

  return (
    <div
      onClick={(e) => {
        e.stopPropagation();
      }}
      role="radiogroup"
      aria-label="Requirement level"
      className={`${fullWidth ? 'flex w-full' : 'inline-flex'} items-center rounded-lg p-0.5 bg-slate-100 dark:bg-slate-800 border border-slate-200/90 dark:border-slate-700/90 select-none transition-opacity ${
        disabled ? 'opacity-60 cursor-not-allowed' : ''
      } ${className}`}
    >
      <button
        type="button"
        role="radio"
        aria-checked={isRequired}
        disabled={disabled}
        onClick={(e) => handleSelect(e, true)}
        className={`${fullWidth ? 'flex-1 text-center justify-center' : ''} ${
          isSmall ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs'
        } font-semibold rounded-md transition-all duration-150 ${
          isRequired
            ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs font-bold'
            : 'text-slate-400 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
        } ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}
      >
        {requiredLabel}
      </button>

      <button
        type="button"
        role="radio"
        aria-checked={!isRequired}
        disabled={disabled}
        onClick={(e) => handleSelect(e, false)}
        className={`${fullWidth ? 'flex-1 text-center justify-center' : ''} ${
          isSmall ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs'
        } font-semibold rounded-md transition-all duration-150 ${
          !isRequired
            ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs font-bold'
            : 'text-slate-400 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
        } ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}
      >
        {optionalLabel}
      </button>
    </div>
  );
}

export default RequiredOptionalToggle;
