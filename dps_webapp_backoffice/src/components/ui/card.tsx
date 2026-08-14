import React from 'react';

export const Card = ({ className = '', children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={`bg-white dark:bg-slate-800/80 p-8 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700/50 relative overflow-hidden ${className}`} {...props}>
    {children}
  </div>
);

export const CardHeader = ({ className = '', title, icon }: { className?: string, title: string, icon?: React.ReactNode }) => (
  <div className={`mb-6 ${className}`}>
    <h3 className="text-sm font-bold text-brand-600 uppercase tracking-wider flex items-center">
      {icon && <span className="mr-2.5">{icon}</span>}
      {title}
    </h3>
  </div>
);
