import type { FirebaseRelease } from "./firebase-distribution";

export interface GithubActionsRunStatus {
  status: "queued" | "in_progress" | "completed";
  conclusion:
    | "success"
    | "failure"
    | "cancelled"
    | "skipped"
    | "neutral"
    | "timed_out"
    | "action_required"
    | "stale"
    | null;
  runUrl: string;
}

export interface GithubPrStatus {
  prNumber: number;
  prState: "open" | "closed";
  merged: boolean;
  prUrl: string;
  actionsRun: GithubActionsRunStatus | null;
  error?: string;
}

export interface CodegenPipelineEntry extends GithubPrStatus {
  release: FirebaseRelease | undefined;
}

const PR_NUMBER_PATTERN = /Native SDK codegen PR #(\d+)/;

export function matchReleaseToPr(
  releases: FirebaseRelease[],
  prNumber: number
): FirebaseRelease | undefined {
  return releases.find((release) => {
    const match = release.releaseNotes.match(PR_NUMBER_PATTERN);
    return match ? Number(match[1]) === prNumber : false;
  });
}
