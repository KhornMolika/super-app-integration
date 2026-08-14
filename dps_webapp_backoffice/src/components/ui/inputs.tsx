"use client";

import React from 'react';

export const Label = ({ className = '', children, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) => (
  <label className={`block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5 transition-colors ${className}`} {...props}>
    {children}
  </label>
);

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className = '', ...props }, ref) => (
    <input
      ref={ref}
      className={`text-slate-800 dark:text-slate-200 w-full px-4 py-3 bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all placeholder:text-slate-400 disabled:opacity-50 ${className}`}
      {...props}
    />
  )
);
Input.displayName = 'Input';

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className = '', ...props }, ref) => (
    <textarea
      ref={ref}
      className={`text-slate-800 dark:text-slate-200 w-full px-4 py-3 bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all placeholder:text-slate-400 disabled:opacity-50 resize-none ${className}`}
      {...props}
    />
  )
);
Textarea.displayName = 'Textarea';

export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className = '', children, ...props }, ref) => (
    <div className="relative">
      <select
        ref={ref}
        className={`appearance-none text-slate-800 dark:text-slate-200 w-full px-4 py-3 bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all cursor-pointer disabled:opacity-50 ${className}`}
        {...props}
      >
        {children}
      </select>
      <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-slate-500">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </div>
  )
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
