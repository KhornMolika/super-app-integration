"use client";

import { Button } from "@/components/ui/inputs";
import { CodegenPipelineStrip } from "@/components/ui/CodegenPipelineStrip";
import { useCodegenPipelineStatus } from "@/lib/useCodegenPipelineStatus";

interface EligibleApp {
  id: string;
  name?: string;
  lastCodegenRun?: { status?: string; prNumber?: number };
}

export function CodegenPipelinePanel({ apps }: { apps: EligibleApp[] }) {
  const eligible = apps.filter(
    (app) => app.lastCodegenRun?.status === "opened" && typeof app.lastCodegenRun.prNumber === "number"
  );
  const prNumbers = eligible.map((app) => app.lastCodegenRun!.prNumber!);

  const { data, loading, error, rateLimited, refresh } = useCodegenPipelineStatus(prNumbers);

  return (
    <div className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl p-6">
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Native SDK Codegen Pipeline</h2>
        <Button variant="outline" className="!px-3 !py-1.5 text-xs" onClick={refresh} disabled={loading}>
          {loading ? "Refreshing..." : "Refresh"}
        </Button>
      </div>
      <p className="text-slate-500 text-sm mb-4">
        Live GitHub PR, Actions build, and Firebase release status for each mini app&apos;s codegen PR.
      </p>

      {rateLimited && (
        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 text-amber-700 dark:text-amber-400 text-sm rounded-xl p-4 mb-4">
          GitHub rate limit reached — some rows may be missing. Try Refresh again shortly.
        </div>
      )}

      {error && (
        <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-400 text-sm rounded-xl p-4 mb-4">
          Couldn&apos;t reach GitHub: {error}
        </div>
      )}

      {eligible.length === 0 ? (
        <p className="text-slate-500 text-sm">No native-SDK mini apps with a codegen PR yet.</p>
      ) : (
        <div className="space-y-3">
          {eligible.map((app) => {
            const entry = data.find((item) => item.prNumber === app.lastCodegenRun!.prNumber);
            return (
              <div
                key={app.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-3 border-b border-slate-100 dark:border-slate-800 last:border-0"
              >
                <span className="text-sm font-semibold text-slate-900 dark:text-white">
                  {app.name || "Mini App"}
                </span>
                {entry ? (
                  <CodegenPipelineStrip entry={entry} />
                ) : (
                  <span className="text-xs text-slate-400">{loading ? "Loading..." : "No status yet"}</span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
