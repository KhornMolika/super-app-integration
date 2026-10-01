"use client";

import React from 'react';

export const Label = ({ className = '', children, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) => (
  <label className={`block text-[15px] font-semibold text-slate-800 dark:text-slate-200 mb-1.5 transition-colors ${className}`} {...props}>
    {children}
  </label>
);

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className = '', ...props }, ref) => (
    <input
      ref={ref}
      className={`text-base text-slate-800 dark:text-slate-100 w-full px-4 py-3 bg-slate-100/80 hover:bg-slate-100 focus:bg-white dark:bg-slate-900/90 dark:hover:bg-slate-900 dark:focus:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all placeholder:text-slate-400 disabled:opacity-50 disabled:bg-slate-200/50 dark:disabled:bg-slate-900/40 ${className}`}
      {...props}
    />
  )
);
Input.displayName = 'Input';

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className = '', ...props }, ref) => (
    <textarea
      ref={ref}
      className={`text-base text-slate-800 dark:text-slate-100 w-full px-4 py-3 bg-slate-100/80 hover:bg-slate-100 focus:bg-white dark:bg-slate-900/90 dark:hover:bg-slate-900 dark:focus:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all placeholder:text-slate-400 disabled:opacity-50 resize-none disabled:bg-slate-200/50 dark:disabled:bg-slate-900/40 ${className}`}
      {...props}
    />
  )
);
Textarea.displayName = 'Textarea';

export interface SelectOption {
  value: string;
  label: React.ReactNode;
  disabled?: boolean;
  group?: string;
  icon?: React.ReactNode;
}

export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className = '', children, value, defaultValue, onChange, disabled, name, id, required, ...props }, ref) => {
    const [isOpen, setIsOpen] = React.useState(false);
    const [searchQuery, setSearchQuery] = React.useState('');
    const containerRef = React.useRef<HTMLDivElement>(null);
    const hiddenSelectRef = React.useRef<HTMLSelectElement | null>(null);

    // Sync external forwarded ref
    React.useImperativeHandle(ref, () => hiddenSelectRef.current as HTMLSelectElement);

    // Parse options & groups from children (e.g. <option>, <optgroup>)
    const { options, groups } = React.useMemo(() => {
      const parsedOpts: SelectOption[] = [];
      const parsedGroups: string[] = [];

      const processNode = (child: React.ReactNode, currentGroup?: string) => {
        if (!React.isValidElement(child)) return;

        if (child.type === 'optgroup') {
          const groupLabel = (child.props as any).label || '';
          if (groupLabel && !parsedGroups.includes(groupLabel)) {
            parsedGroups.push(groupLabel);
          }
          React.Children.forEach((child.props as any).children, (sub) => processNode(sub, groupLabel));
        } else if (child.type === 'option') {
          const optProps = child.props as any;
          parsedOpts.push({
            value: String(optProps.value ?? ''),
            label: optProps.children ?? optProps.value,
            disabled: optProps.disabled,
            group: currentGroup,
          });
        } else if ((child.props as any)?.children) {
          React.Children.forEach((child.props as any).children, (sub) => processNode(sub, currentGroup));
        }
      };

      React.Children.forEach(children, (c) => processNode(c));
      return { options: parsedOpts, groups: parsedGroups };
    }, [children]);

    // Active value
    const [uncontrolledValue, setUncontrolledValue] = React.useState(
      defaultValue !== undefined ? String(defaultValue) : options[0]?.value ?? ''
    );
    const currentValue = value !== undefined ? String(value) : uncontrolledValue;

    const selectedOption = options.find((o) => String(o.value) === String(currentValue));

    // Handle outside click to close dropdown
    React.useEffect(() => {
      const handlePointerDown = (e: MouseEvent) => {
        if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
          setIsOpen(false);
          setSearchQuery('');
        }
      };
      if (isOpen) {
        document.addEventListener('mousedown', handlePointerDown);
      }
      return () => {
        document.removeEventListener('mousedown', handlePointerDown);
      };
    }, [isOpen]);

    // Handle ESC key
    React.useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape' && isOpen) {
          setIsOpen(false);
          setSearchQuery('');
        }
      };
      if (isOpen) {
        window.addEventListener('keydown', handleKeyDown);
      }
      return () => {
        window.removeEventListener('keydown', handleKeyDown);
      };
    }, [isOpen]);

    const handleSelectOption = (opt: SelectOption) => {
      if (opt.disabled) return;
      if (value === undefined) {
        setUncontrolledValue(opt.value);
      }
      if (hiddenSelectRef.current) {
        hiddenSelectRef.current.value = opt.value;
        hiddenSelectRef.current.dispatchEvent(new Event('change', { bubbles: true }));
      }
      if (onChange) {
        const syntheticEvent = {
          target: { name: name || '', value: opt.value },
          currentTarget: { name: name || '', value: opt.value },
          preventDefault: () => {},
          stopPropagation: () => {},
        } as unknown as React.ChangeEvent<HTMLSelectElement>;
        onChange(syntheticEvent);
      }
      setIsOpen(false);
      setSearchQuery('');
    };

    // Filter options if search query is active
    const filteredOptions = React.useMemo(() => {
      if (!searchQuery.trim()) return options;
      const q = searchQuery.toLowerCase();
      return options.filter((o) => {
        const labelText = typeof o.label === 'string' ? o.label : String(o.value);
        return labelText.toLowerCase().includes(q) || String(o.value).toLowerCase().includes(q);
      });
    }, [options, searchQuery]);

    // Helper for context-aware contextual icons
    const getOptionIcon = (opt: SelectOption) => {
      const val = String(opt.value).toLowerCase();
      const lbl = typeof opt.label === 'string' ? opt.label.toLowerCase() : '';

      if (val === 'tag' || lbl.includes('tag')) {
        return (
          <svg className="w-4 h-4 text-accent-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
          </svg>
        );
      }
      if (val === 'branch' || lbl.includes('branch')) {
        return (
          <svg className="w-4 h-4 text-sky-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7a3 3 0 100-6 3 3 0 000 6zm0 10a3 3 0 100-6 3 3 0 000 6zm8-5a3 3 0 100-6 3 3 0 000 6zM8 7v4a3 3 0 003 3h5" />
          </svg>
        );
      }
      if (val === 'commit' || lbl.includes('commit') || lbl.includes('sha')) {
        return (
          <svg className="w-4 h-4 text-emerald-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
          </svg>
        );
      }
      return null;
    };

    return (
      <div ref={containerRef} className="relative w-full">
        {/* Hidden standard select element for form bindings and automated tests */}
        <select
          ref={hiddenSelectRef}
          name={name}
          id={id}
          value={currentValue}
          onChange={onChange}
          disabled={disabled}
          required={required}
          className="sr-only"
          tabIndex={-1}
          aria-hidden="true"
          {...props}
        >
          {children}
        </select>

        {/* Modern Trigger Button */}
        <button
          type="button"
          disabled={disabled}
          onClick={() => !disabled && setIsOpen((prev) => !prev)}
          className={`group flex items-center justify-between text-base text-slate-800 dark:text-slate-100 w-full px-4 py-3 bg-slate-100/80 hover:bg-slate-100 dark:bg-slate-900/90 dark:hover:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl transition-all cursor-pointer text-left outline-none ${
            isOpen
              ? 'ring-2 ring-brand-500/25 border-brand-500 bg-white dark:bg-slate-950 shadow-sm'
              : 'focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500'
          } ${disabled ? 'opacity-50 cursor-not-allowed bg-slate-200/50 dark:bg-slate-900/40' : ''} ${className}`}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
        >
          <div className="flex items-center gap-2.5 truncate mr-2 min-w-0">
            {selectedOption && getOptionIcon(selectedOption)}
            <span className="truncate font-medium text-slate-800 dark:text-slate-200">
              {selectedOption ? selectedOption.label : <span className="text-slate-400">Select an option</span>}
            </span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-colors">
            <svg
              className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180 text-brand-600 dark:text-brand-400' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </button>

        {/* Modern Floating Popover Menu */}
        {isOpen && (
          <div
            className="absolute left-0 right-0 z-50 mt-1.5 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200/90 dark:border-slate-800 rounded-2xl shadow-2xl shadow-slate-900/15 dark:shadow-black/50 p-1.5 max-h-64 overflow-y-auto animate-in fade-in-0 zoom-in-95 duration-150"
            role="listbox"
          >
            {/* Quick Search if more than 6 options */}
            {options.length > 6 && (
              <div className="p-1 mb-1 border-b border-slate-100 dark:border-slate-800/80 sticky top-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm z-10">
                <div className="relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search options..."
                    className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-100 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/80 rounded-lg text-slate-800 dark:text-slate-100 placeholder:text-slate-400 outline-none focus:ring-1 focus:ring-brand-500"
                    autoFocus
                    onClick={(e) => e.stopPropagation()}
                  />
                  <svg className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              </div>
            )}

            {filteredOptions.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-400 dark:text-slate-500">
                No matching options found
              </div>
            ) : (
              <div className="space-y-0.5">
                {groups.length > 0
                  ? groups.map((grp) => {
                      const groupItems = filteredOptions.filter((o) => o.group === grp);
                      if (groupItems.length === 0) return null;
                      return (
                        <div key={grp} className="mb-2 last:mb-0">
                          <div className="px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                            {grp}
                          </div>
                          {groupItems.map((opt) => {
                            const isSelected = String(opt.value) === String(currentValue);
                            const optIcon = getOptionIcon(opt);
                            return (
                              <button
                                key={opt.value}
                                type="button"
                                disabled={opt.disabled}
                                onClick={() => handleSelectOption(opt)}
                                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm transition-all text-left ${
                                  isSelected
                                    ? 'bg-brand-50/90 dark:bg-brand-950/60 text-brand-700 dark:text-brand-300 font-semibold ring-1 ring-brand-500/20'
                                    : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100/90 dark:hover:bg-slate-800/80 hover:text-slate-900 dark:hover:text-white'
                                } ${opt.disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
                                role="option"
                                aria-selected={isSelected}
                              >
                                <div className="flex items-center gap-2.5 truncate min-w-0">
                                  {optIcon}
                                  <span className="truncate">{opt.label}</span>
                                </div>
                                {isSelected && (
                                  <svg className="w-4 h-4 text-brand-600 dark:text-brand-400 shrink-0 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                                  </svg>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      );
                    })
                  : filteredOptions.map((opt) => {
                      const isSelected = String(opt.value) === String(currentValue);
                      const optIcon = getOptionIcon(opt);
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          disabled={opt.disabled}
                          onClick={() => handleSelectOption(opt)}
                          className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm transition-all text-left ${
                            isSelected
                              ? 'bg-brand-50/90 dark:bg-brand-950/60 text-brand-700 dark:text-brand-300 font-semibold ring-1 ring-brand-500/20'
                              : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100/90 dark:hover:bg-slate-800/80 hover:text-slate-900 dark:hover:text-white'
                          } ${opt.disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
                          role="option"
                          aria-selected={isSelected}
                        >
                          <div className="flex items-center gap-2.5 truncate min-w-0">
                            {optIcon}
                            <span className="truncate">{opt.label}</span>
                          </div>
                          {isSelected && (
                            <svg className="w-4 h-4 text-brand-600 dark:text-brand-400 shrink-0 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </button>
                      );
                    })}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }
);
Select.displayName = 'Select';

export const Button = React.forwardRef<any, React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'outline', as?: any, href?: string, target?: string }>(
  ({ className = '', variant = 'primary', as: Component = 'button', children, ...props }, ref) => {
    const baseStyles = "px-6 py-3 rounded-xl transition-all font-semibold flex items-center justify-center disabled:opacity-50";
    const variants = {
      primary: "bg-brand-600 text-white shadow-md hover:shadow-lg hover:bg-brand-700 active:bg-brand-800",
      outline: "border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 bg-transparent"
    };

    return (
      <Component ref={ref} className={`${baseStyles} ${variants[variant]} ${className}`} {...props}>
        {children}
      </Component>
    );
  }
);
Button.displayName = 'Button';
