'use client';

import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { CapabilityItem } from '@/api/permissions.api';
import { Copy, Check, Package, Smartphone } from 'lucide-react';
import { Pagination, usePagination } from '@/components/ui/Pagination';
import { getCapabilityVisual } from '@/lib/capability-visuals';

interface CapabilitiesTabProps {
  capabilities: CapabilityItem[];
  getPermissionIcon?: (key?: string) => React.ReactNode;
}

export function CapabilitiesTab({ capabilities = [], getPermissionIcon }: CapabilitiesTabProps) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const safeCapabilities = Array.isArray(capabilities) ? capabilities : [];
  const { paginatedItems, paginationProps } = usePagination(safeCapabilities, 6);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(id);
    setTimeout(() => setCopiedKey(null), 1500);
  };

  if (safeCapabilities.length === 0) {
    return (
      <Card className="p-12 text-center text-slate-400 dark:text-slate-500">
        <Smartphone className="w-8 h-8 mx-auto mb-2 text-slate-300 dark:text-slate-600 animate-pulse" />
        <p className="text-sm font-medium">Scanning shell for active capabilities...</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {paginatedItems.map((cap) => {
          const visual = getCapabilityVisual(cap.key, cap.name, cap.description);
          const Icon = visual.Icon;

          return (
            <Card
              key={cap.id}
              className="p-5 flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-md transition-all group bg-white dark:bg-slate-900/60"
            >
              <div className="space-y-3">
                {/* Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className={`p-2 rounded-xl ${visual.bgColor} ${visual.borderColor} border shrink-0 transition-all`}>
                      <Icon className={`w-4 h-4 ${visual.iconColor}`} />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-sm truncate">
                        {cap.name}
                      </h3>
                      <div className="flex items-center gap-1.5 truncate">
                        <span className="text-[11px] font-mono text-slate-400 dark:text-slate-500">
                          {cap.key}
                        </span>
                        <span className="text-[10px] text-slate-400">•</span>
                        <span className={`text-[10px] font-medium ${visual.badgeTextColor}`}>
                          {visual.category}
                        </span>
                      </div>
                    </div>
                  </div>

                <span
                  className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full shrink-0 ${
                    cap.status === 'Active'
                      ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/60'
                      : 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-200/80 dark:border-amber-800/60'
                  }`}
                >
                  {cap.status}
                </span>
              </div>

              {/* Description */}
              <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed">
                {cap.description}
              </p>

              {/* Technical Details */}
              <div className="pt-2.5 border-t border-slate-100 dark:border-slate-800/80 space-y-2">
                {/* JS Bridge Method */}
                {cap.jsBridgeMethod && (
                  <div className="flex items-center justify-between gap-2 p-1.5 rounded-lg bg-accent-50/50 dark:bg-accent-950/25 border border-accent-200/60 dark:border-accent-900/40">
                    <code className="font-mono text-[11px] text-accent-600 dark:text-accent-400 font-semibold truncate">
                      {cap.jsBridgeMethod}
                    </code>
                    <button
                      type="button"
                      onClick={() => handleCopy(cap.jsBridgeMethod!, cap.id)}
                      className="p-1 text-slate-400 hover:text-accent-600 dark:hover:text-accent-400 shrink-0 transition-colors"
                      title="Copy JS Bridge Call"
                    >
                      {copiedKey === cap.id ? (
                        <Check className="w-3.5 h-3.5 text-emerald-500" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                )}

                {/* Badges Row */}
                <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                  {cap.providerPackage && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-mono text-[10px]">
                      <Package className="w-3 h-3 text-slate-400" />
                      {cap.providerPackage}
                    </span>
                  )}

                  {cap.requiredPermissions.map((perm) => (
                    <span
                      key={perm}
                      className="font-mono text-[10px] px-1.5 py-0.5 rounded-md bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 border border-blue-200/60 dark:border-blue-900/40"
                    >
                      {perm}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="mt-3 pt-2.5 flex items-center justify-between text-[11px] text-slate-400">
              <span className="font-medium text-slate-500 dark:text-slate-400">{cap.platform}</span>
              <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400">
                ● Live in Shell
              </span>
            </div>
            </Card>
          );
        })}
      </div>

      {/* Pagination Controls */}
      {safeCapabilities.length > 0 && (
        <div className="pt-4 border-t border-slate-200/60 dark:border-slate-800/80">
          <Pagination
            {...paginationProps}
            pageSizeOptions={[3, 6, 9, 12]}
          />
        </div>
      )}
    </div>
  );
}
