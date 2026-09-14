"use client";

import type { CodegenPipelineEntry } from "@/lib/codegen-pipeline";

type Tone = "neutral" | "info" | "success" | "danger" | "warning";

const TONE_CLASSES: Record<Tone, string> = {
  neutral: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  info: "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300",
  success: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
  danger: "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300",
  warning: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
};

function badgeClasses(tone: Tone): string {
  return `inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${TONE_CLASSES[tone]}`;
}

export function prBadge(entry: CodegenPipelineEntry): { label: string; tone: Tone } {
  if (entry.merged) return { label: "PR merged", tone: "success" };
  if (entry.prState === "open") return { label: "PR open", tone: "info" };
  return { label: "PR closed", tone: "neutral" };
}

export function buildBadge(entry: CodegenPipelineEntry): { label: string; tone: Tone } {
  const run = entry.actionsRun;
  if (!run) return { label: entry.merged ? "Build pending" : "Build —", tone: "neutral" };
  if (run.status !== "completed") return { label: "Build running", tone: "info" };
  if (run.conclusion === "success") return { label: "Build success", tone: "success" };
  if (run.conclusion === "failure") return { label: "Build failed", tone: "danger" };
  return { label: `Build ${run.conclusion ?? "unknown"}`, tone: "warning" };
}

function releaseBadge(
  entry: CodegenPipelineEntry,
  releasesError?: string | null
): { label: string; tone: Tone } {
  // The Firebase lookup itself failed: "not yet" would be a lie, so say so.
  if (releasesError) return { label: "Release unknown", tone: "warning" };
  return entry.release
    ? { label: "Release found", tone: "success" }
    : { label: "Release not yet", tone: "neutral" };
}

export function CodegenPipelineStrip({
  entry,
  releasesError,
}: {
  entry: CodegenPipelineEntry;
  releasesError?: string | null;
}) {
  if (entry.error) {
    return <span className={badgeClasses("danger")}>Unable to fetch PR #{entry.prNumber} status</span>;
  }

  const pr = prBadge(entry);
  const build = buildBadge(entry);
  const release = releaseBadge(entry, releasesError);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <a href={entry.prUrl} target="_blank" rel="noreferrer" className={badgeClasses(pr.tone)}>
        {pr.label}
      </a>
      {entry.actionsRun?.runUrl ? (
        <a href={entry.actionsRun.runUrl} target="_blank" rel="noreferrer" className={badgeClasses(build.tone)}>
          {build.label}
        </a>
      ) : (
        <span className={badgeClasses(build.tone)}>{build.label}</span>
      )}
      {entry.release?.firebaseConsoleUri ? (
        <a
          href={entry.release.firebaseConsoleUri}
          target="_blank"
          rel="noreferrer"
          className={badgeClasses(release.tone)}
        >
          {release.label}
        </a>
      ) : (
        <span className={badgeClasses(release.tone)}>{release.label}</span>
      )}
    </div>
  );
}
