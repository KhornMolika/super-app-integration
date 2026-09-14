import { describe, expect, it } from "vitest";
import { buildBadge, prBadge } from "./CodegenPipelineStrip";
import type { CodegenPipelineEntry, GithubActionsRunStatus } from "../../lib/codegen-pipeline";

function entry(overrides: Partial<CodegenPipelineEntry> = {}): CodegenPipelineEntry {
  return {
    prNumber: 42,
    prState: "open",
    merged: false,
    prUrl: "https://github.com/owner/repo/pull/42",
    actionsRun: null,
    release: undefined,
    ...overrides,
  };
}

function run(overrides: Partial<GithubActionsRunStatus> = {}): GithubActionsRunStatus {
  return {
    status: "completed",
    conclusion: "success",
    runUrl: "https://github.com/owner/repo/actions/runs/1",
    ...overrides,
  };
}

describe("prBadge", () => {
  it("reports a merged PR as success", () => {
    expect(prBadge(entry({ merged: true, prState: "closed" }))).toEqual({
      label: "PR merged",
      tone: "success",
    });
  });

  it("reports an open PR as info", () => {
    expect(prBadge(entry({ prState: "open", merged: false }))).toEqual({
      label: "PR open",
      tone: "info",
    });
  });

  it("reports a closed-but-unmerged PR as neutral", () => {
    expect(prBadge(entry({ prState: "closed", merged: false }))).toEqual({
      label: "PR closed",
      tone: "neutral",
    });
  });
});

describe("buildBadge", () => {
  it("reports a completed successful run", () => {
    expect(buildBadge(entry({ merged: true, actionsRun: run({ conclusion: "success" }) }))).toEqual({
      label: "Build success",
      tone: "success",
    });
  });

  it("reports a completed failed run as danger", () => {
    expect(buildBadge(entry({ merged: true, actionsRun: run({ conclusion: "failure" }) }))).toEqual({
      label: "Build failed",
      tone: "danger",
    });
  });

  it("reports an in-progress run as running", () => {
    expect(
      buildBadge(entry({ merged: true, actionsRun: run({ status: "in_progress", conclusion: null }) }))
    ).toEqual({ label: "Build running", tone: "info" });
  });

  it("reports no run at all as pending for a merged PR", () => {
    expect(buildBadge(entry({ merged: true, actionsRun: null }))).toEqual({
      label: "Build pending",
      tone: "neutral",
    });
  });

  it("reports no run at all as a dash for an unmerged PR", () => {
    expect(buildBadge(entry({ merged: false, actionsRun: null }))).toEqual({
      label: "Build —",
      tone: "neutral",
    });
  });

  it("reports a skipped run with its conclusion as a warning", () => {
    expect(buildBadge(entry({ merged: false, actionsRun: run({ conclusion: "skipped" }) }))).toEqual({
      label: "Build skipped",
      tone: "warning",
    });
  });
});
