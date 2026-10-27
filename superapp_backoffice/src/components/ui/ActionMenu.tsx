'use client';

import React, { useState, useRef, useEffect, ReactNode } from 'react';
import Link from 'next/link';

export type ActionMenuItemVariant = 'default' | 'primary' | 'warning' | 'danger';

export interface ActionMenuItem {
  label: string;
  icon?: ReactNode;
  onClick?: () => void;
  href?: string;
  variant?: ActionMenuItemVariant;
  disabled?: boolean;
  hidden?: boolean;
  divider?: boolean; // Renders a divider line above this item
}

export interface ActionMenuProps {
  items: ActionMenuItem[];
  trigger?: ReactNode;
  align?: 'left' | 'right';
  className?: string;
  menuClassName?: string;
  ariaLabel?: string;
}

export function ActionMenu({
  items,
  trigger,
  align = 'right',
  className = '',
  menuClassName = '',
  ariaLabel = 'Actions menu',
}: ActionMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside or when Escape is pressed
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const visibleItems = items.filter((item) => !item.hidden);

  if (visibleItems.length === 0) {
    return null;
  }

  const getVariantStyles = (variant: ActionMenuItemVariant = 'default', disabled?: boolean) => {
    if (disabled) {
      return 'opacity-40 cursor-not-allowed pointer-events-none text-slate-400 dark:text-slate-500';
    }

    switch (variant) {
      case 'primary':
        return 'text-brand-600 dark:text-brand-400 hover:bg-brand-50 dark:hover:bg-brand-950/40';
      case 'warning':
        return 'text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40';
      case 'danger':
        return 'text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40';
      case 'default':
      default:
        return 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/80';
    }
  };

  const handleTriggerClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setIsOpen((prev) => !prev);
  };

  const handleItemClick = (e: React.MouseEvent, item: ActionMenuItem) => {
    e.stopPropagation();
    if (item.disabled) return;
    setIsOpen(false);
    item.onClick?.();
  };

  return (
    <div
      className={`relative inline-block text-left ${className}`}
      ref={menuRef}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Trigger Button */}
      <button
        type="button"
        onClick={handleTriggerClick}
        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500/20"
        aria-label={ariaLabel}
        aria-expanded={isOpen}
      >
        {!trigger || trigger === 'ellipsis' ? (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z"
            />
          </svg>
        ) : (
          trigger
        )}
      </button>

      {/* Popover Menu */}
      {isOpen && (
        <div
          className={`absolute ${
            align === 'left' ? 'left-0 origin-top-left' : 'right-0 origin-top-right'
          } mt-1 min-w-[140px] max-w-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl py-1 z-50 animate-in fade-in zoom-in-95 duration-100 ${menuClassName}`}
          role="menu"
        >
          {visibleItems.map((item, index) => {
            const variantClass = getVariantStyles(item.variant, item.disabled);

            return (
              <React.Fragment key={`${item.label}-${index}`}>
                {item.divider && (
                  <div className="my-1 border-t border-slate-100 dark:border-slate-800" />
                )}

                {item.href ? (
                  <Link
                    href={item.href}
                    onClick={(e) => handleItemClick(e, item)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium transition-colors text-left ${variantClass}`}
                    role="menuitem"
                  >
                    {item.icon && <span className="shrink-0">{item.icon}</span>}
                    <span className="truncate">{item.label}</span>
                  </Link>
                ) : (
                  <button
                    type="button"
                    disabled={item.disabled}
                    onClick={(e) => handleItemClick(e, item)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium transition-colors text-left ${variantClass}`}
                    role="menuitem"
                  >
                    {item.icon && <span className="shrink-0">{item.icon}</span>}
                    <span className="truncate">{item.label}</span>
                  </button>
                )}
              </React.Fragment>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default ActionMenu;
