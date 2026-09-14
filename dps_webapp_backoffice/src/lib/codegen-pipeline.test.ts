import { describe, expect, it } from "vitest";
import { matchReleaseToPr } from "./codegen-pipeline";
import type { FirebaseRelease } from "./firebase-distribution";

function release(overrides: Partial<FirebaseRelease> = {}): FirebaseRelease {
  return {
    id: "projects/1/apps/2/releases/3",
    displayVersion: "1.1.0",
    buildVersion: "42",
    releaseNotes: "",
    createTime: "2026-09-14T00:00:00Z",
    testingUri: "https://appdistribution.firebase.google.com/testerapps/example",
    firebaseConsoleUri: "https://console.firebase.google.com/project/example",
    ...overrides,
  };
}

describe("matchReleaseToPr", () => {
  it("matches a release tagged with the exact PR number", () => {
    const releases = [
      release({ id: "a", releaseNotes: "CI: main @ abc123 — Native SDK codegen PR #42" }),
    ];
    expect(matchReleaseToPr(releases, 42)?.id).toBe("a");
  });

  it("returns undefined when no release is tagged with a PR number", () => {
    const releases = [release({ id: "a", releaseNotes: "CI: neat @ abc123" })];
    expect(matchReleaseToPr(releases, 42)).toBeUndefined();
  });

  it("picks the matching release out of several tagged releases", () => {
    const releases = [
      release({ id: "a", releaseNotes: "— Native SDK codegen PR #7" }),
      release({ id: "b", releaseNotes: "— Native SDK codegen PR #42" }),
    ];
    expect(matchReleaseToPr(releases, 42)?.id).toBe("b");
  });

  it("does not partial-match a multi-digit PR number", () => {
    const releases = [release({ id: "a", releaseNotes: "— Native SDK codegen PR #123" })];
    expect(matchReleaseToPr(releases, 12)).toBeUndefined();
  });
});
