"use client";

import { Button } from "@/components/ui/inputs";
import { CodegenPipelineStrip } from "@/components/ui/CodegenPipelineStrip";
import { useCodegenPipelineStatus } from "@/lib/useCodegenPipelineStatus";

export function CodegenStatusCard({ prNumber }: { prNumber: number }) {
  const { data, loading, error, rateLimited, refresh } = useCodegenPipelineStatus([prNumber]);
  const entry = data.find((item) => item.prNumber === prNumber);

  return (
    <div className="mb-6 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
      <div>
        <h4 className="text-sm font-bold text-slate-900 dark:text-white">Native SDK Codegen Pipeline</h4>
        {rateLimited && (
          <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">GitHub rate limit reached.</p>
        )}
        {error && (
          <p className="text-xs text-red-600 dark:text-red-400 mt-1">Couldn&apos;t reach GitHub: {error}</p>
        )}
        {!error && entry && (
          <div className="mt-2">
            <CodegenPipelineStrip entry={entry} />
          </div>
        )}
        {!error && !entry && (
          <p className="text-xs text-slate-400 mt-1">{loading ? "Loading status..." : "No status yet"}</p>
        )}
      </div>
      <Button
        variant="outline"
        className="!px-3 !py-1.5 text-xs self-start"
        onClick={refresh}
        disabled={loading}
      >
        {loading ? "Refreshing..." : "Refresh"}
      </Button>
    </div>
  );
}
