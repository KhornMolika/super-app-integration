# Codegen Pipeline Progress Tracking Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** An SA Admin can see, in the Backoffice, the live status of a mini app's native-SDK codegen pipeline (PR state → Actions build → Firebase release) on both the Releases page and the mini app's own detail page, refreshed on load and via a manual Refresh button — no polling, no backend changes.

**Architecture:** A new Next.js API route (`/api/github-pr-status`) in `dps_webapp_backoffice` calls GitHub's REST API directly (mirroring the existing `firebase-releases` route's pattern of the Backoffice calling external APIs itself, bypassing `dps_backend`), batched by PR number. A shared React hook joins that with the existing `/api/firebase-releases` endpoint via a pure correlation function, and two presentational layers (a cross-app panel on the Releases page, a per-app card on the Mini App detail page) render the same 3-stage strip component.

**Tech Stack:** Next.js 16 App Router (route handlers, client components), TypeScript, Vitest (new — for the one pure function worth unit testing), pnpm.

**Spec:** [docs/superpowers/specs/2026-09-14-codegen-progress-tracking-design.md](../specs/2026-09-14-codegen-progress-tracking-design.md)

## Global Constraints

- Never use `npm` or `yarn` — always `pnpm`, run from inside `dps_webapp_backoffice`.
- No polling (`setInterval`) anywhere in this feature — fetch on mount and on manual Refresh only.
- No changes to `dps_backend`, sub-project 1/2 trigger logic, or `lastCodegenRun`'s shape — this plan only adds new frontend files plus two small render-site edits.
- Any mini app whose `lastCodegenRun.status !== 'opened'` gets zero calls to the new API route — there is no PR to check.
- A PR-lookup failure or GitHub rate-limit must degrade one row/card, never crash the panel or page.
- Dark-theme Tailwind styling matching the existing palette (see `FirebaseReleasesPanel.tsx` for the reference pattern: `bg-white dark:bg-slate-900/50`, emerald/rose/amber/blue semantic colors). No emojis in any new UI (existing pages use some emoji in older code — do not add more; match `FirebaseReleasesPanel.tsx`'s icon-based style instead).

---

### Task 1: Correlation types, pure matching function, and Vitest setup

**Files:**
- Modify: `dps_webapp_backoffice/.env.example`
- Modify: `dps_webapp_backoffice/package.json` (via `pnpm add -D vitest`, plus a `test` script)
- Create: `dps_webapp_backoffice/vitest.config.ts`
- Create: `dps_webapp_backoffice/src/lib/codegen-pipeline.ts`
- Test: `dps_webapp_backoffice/src/lib/codegen-pipeline.test.ts`

**Interfaces:**
- Consumes: `FirebaseRelease` from `dps_webapp_backoffice/src/lib/firebase-distribution.ts` (existing — `id, displayVersion, buildVersion, releaseNotes, createTime, testingUri, firebaseConsoleUri`, all `string`).
- Produces: `GithubActionsRunStatus`, `GithubPrStatus`, `CodegenPipelineEntry` types and `matchReleaseToPr(releases, prNumber)` — consumed by Task 2 (route response shape), Task 3 (hook), Task 4/5 (UI).

- [ ] **Step 1: Add GitHub env vars to `.env.example`**

Append to the end of `dps_webapp_backoffice/.env.example`:

```
# Native SDK codegen pipeline status (GitHub PR + Actions lookups)
# Same names/values as dps_backend's equivalents — kept as separate env vars
# because dps_webapp_backoffice and dps_backend are independent processes.
# GITHUB_TOKEN: a token with read access to the codegen repo's PRs and Actions runs
# CODEGEN_REPO_SLUG: "owner/repo" for the repo codegen PRs are opened against
GITHUB_BASE_URL=https://api.github.com
GITHUB_TOKEN=
CODEGEN_REPO_SLUG=owner/repo
```

- [ ] **Step 2: Install Vitest**

Run: `cd dps_webapp_backoffice && pnpm add -D vitest`
Expected: `vitest` added to `devDependencies` in `dps_webapp_backoffice/package.json`, `dps_webapp_backoffice/pnpm-lock.yaml` updated.

- [ ] **Step 3: Add a `test` script**

In `dps_webapp_backoffice/package.json`, in the `"scripts"` block, add a `test` entry alongside the existing ones:

```json
  "scripts": {
    "dev": "next dev -p 3002",
    "build": "next build",
    "start": "next start -p 3002",
    "lint": "eslint",
    "test": "vitest run"
  },
```

- [ ] **Step 4: Create the Vitest config**

Create `dps_webapp_backoffice/vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
  },
});
```

- [ ] **Step 5: Write the failing test**

Create `dps_webapp_backoffice/src/lib/codegen-pipeline.test.ts`:

```ts
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
```

- [ ] **Step 6: Run the test to verify it fails**

Run: `cd dps_webapp_backoffice && pnpm exec vitest run src/lib/codegen-pipeline.test.ts`
Expected: FAIL — `codegen-pipeline.ts` does not exist yet (module resolution error).

- [ ] **Step 7: Implement the types and the pure function**

Create `dps_webapp_backoffice/src/lib/codegen-pipeline.ts`:

```ts
import type { FirebaseRelease } from "./firebase-distribution";

export interface GithubActionsRunStatus {
  status: "queued" | "in_progress" | "completed";
  conclusion: "success" | "failure" | "cancelled" | null;
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
```

- [ ] **Step 8: Run the test to verify it passes**

Run: `cd dps_webapp_backoffice && pnpm exec vitest run src/lib/codegen-pipeline.test.ts`
Expected: PASS, 4 tests.

- [ ] **Step 9: Commit**

```bash
cd dps_webapp_backoffice
git add .env.example package.json pnpm-lock.yaml vitest.config.ts src/lib/codegen-pipeline.ts src/lib/codegen-pipeline.test.ts
git commit -m "feat: add codegen pipeline correlation types and PR-release matching"
```

---

### Task 2: GitHub PR/Actions status API route

**Files:**
- Create: `dps_webapp_backoffice/src/app/api/github-pr-status/route.ts`

**Interfaces:**
- Consumes: `GithubPrStatus`, `GithubActionsRunStatus` from `dps_webapp_backoffice/src/lib/codegen-pipeline.ts` (Task 1). Env vars `GITHUB_TOKEN`, `GITHUB_BASE_URL`, `CODEGEN_REPO_SLUG` (Task 1, `.env.example`).
- Produces: `GET /api/github-pr-status?prNumbers=101,102` → `{ statuses: GithubPrStatus[]; rateLimited?: boolean }` on 200, or `{ error: string }` on 401/500 — consumed by Task 3's hook.

- [ ] **Step 1: Read the existing route for the auth pattern**

Read `dps_webapp_backoffice/src/app/api/firebase-releases/route.ts` in full — this task's route follows the exact same `auth_token` cookie check and `NextResponse.json` error shape.

- [ ] **Step 2: Write the route**

Create `dps_webapp_backoffice/src/app/api/github-pr-status/route.ts`:

```ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import type { GithubPrStatus } from "@/lib/codegen-pipeline";

class RateLimitError extends Error {}

function headers(): Record<string, string> {
  const token = process.env.GITHUB_TOKEN;
  return {
    Accept: "application/vnd.github+json",
    "User-Agent": "DPS-SuperApp-Integration",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

function baseApiUrl(): string {
  return process.env.GITHUB_BASE_URL || "https://api.github.com";
}

function isRateLimited(res: Response): boolean {
  return res.status === 403 && res.headers.get("x-ratelimit-remaining") === "0";
}

interface RawPull {
  state: "open" | "closed";
  merged: boolean;
  html_url: string;
  head: { sha: string };
}

interface RawActionsRun {
  status: "queued" | "in_progress" | "completed";
  conclusion: "success" | "failure" | "cancelled" | null;
  html_url: string;
  created_at: string;
}

async function fetchPrStatus(repoSlug: string, prNumber: number): Promise<GithubPrStatus> {
  const prRes = await fetch(`${baseApiUrl()}/repos/${repoSlug}/pulls/${prNumber}`, {
    headers: headers(),
    cache: "no-store",
  });

  if (isRateLimited(prRes)) throw new RateLimitError();

  if (!prRes.ok) {
    return {
      prNumber,
      prState: "closed",
      merged: false,
      prUrl: "",
      actionsRun: null,
      error: `GitHub returned ${prRes.status} for PR #${prNumber}`,
    };
  }

  const pr = (await prRes.json()) as RawPull;

  const runsRes = await fetch(
    `${baseApiUrl()}/repos/${repoSlug}/actions/runs?head_sha=${pr.head.sha}`,
    { headers: headers(), cache: "no-store" }
  );

  if (isRateLimited(runsRes)) throw new RateLimitError();

  let actionsRun: GithubPrStatus["actionsRun"] = null;
  if (runsRes.ok) {
    const data = (await runsRes.json()) as { workflow_runs?: RawActionsRun[] };
    const runs = (data.workflow_runs ?? []).slice().sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    const latest = runs[0];
    if (latest) {
      actionsRun = { status: latest.status, conclusion: latest.conclusion, runUrl: latest.html_url };
    }
  }

  return {
    prNumber,
    prState: pr.state,
    merged: pr.merged,
    prUrl: pr.html_url,
    actionsRun,
  };
}

export async function GET(request: Request) {
  const token = (await cookies()).get("auth_token")?.value;
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const prNumbersParam = new URL(request.url).searchParams.get("prNumbers") || "";
  const prNumbers = prNumbersParam
    .split(",")
    .map((n) => Number(n.trim()))
    .filter((n) => Number.isInteger(n) && n > 0);

  if (prNumbers.length === 0) {
    return NextResponse.json({ statuses: [] });
  }

  const repoSlug = process.env.CODEGEN_REPO_SLUG;
  if (!repoSlug) {
    return NextResponse.json(
      { error: "Missing required environment variable: CODEGEN_REPO_SLUG" },
      { status: 500 }
    );
  }

  const statuses: GithubPrStatus[] = [];
  let rateLimited = false;

  for (const prNumber of prNumbers) {
    if (rateLimited) break;
    try {
      statuses.push(await fetchPrStatus(repoSlug, prNumber));
    } catch (err) {
      if (err instanceof RateLimitError) {
        rateLimited = true;
        break;
      }
      statuses.push({
        prNumber,
        prState: "closed",
        merged: false,
        prUrl: "",
        actionsRun: null,
        error: `Unexpected error: ${(err as Error).message}`,
      });
    }
  }

  return NextResponse.json({ statuses, rateLimited });
}
```

- [ ] **Step 3: Type-check**

Run: `cd dps_webapp_backoffice && pnpm exec tsc --noEmit`
Expected: no errors attributable to `src/app/api/github-pr-status/route.ts`.

- [ ] **Step 4: Lint**

Run: `cd dps_webapp_backoffice && pnpm run lint`
Expected: no new errors on the created file.

- [ ] **Step 5: Manual verification (requires a real `GITHUB_TOKEN` and `CODEGEN_REPO_SLUG` with at least one codegen PR — cannot be executed without live credentials; perform when those are available)**

With the dev server running (`pnpm run dev`) and logged into the Backoffice (so the `auth_token` cookie is set), and a real open codegen PR number `N` in the configured repo:

```bash
curl -s "http://localhost:3002/api/github-pr-status?prNumbers=$N" -H "Cookie: auth_token=<value from browser devtools>"
```

Expected: `{"statuses":[{"prNumber":N,"prState":"open","merged":false,"prUrl":"https://github.com/...","actionsRun":null}]}` (or with `actionsRun` populated if a workflow run already exists for that PR's head commit).

- [ ] **Step 6: Commit**

```bash
cd dps_webapp_backoffice
git add src/app/api/github-pr-status/route.ts
git commit -m "feat: add GitHub PR/Actions status API route"
```

---

### Task 3: `useCodegenPipelineStatus` hook

**Files:**
- Create: `dps_webapp_backoffice/src/lib/useCodegenPipelineStatus.ts`

**Interfaces:**
- Consumes: `GET /api/github-pr-status?prNumbers=...` (Task 2), `GET /api/firebase-releases` (existing), `matchReleaseToPr` and `CodegenPipelineEntry`/`GithubPrStatus` from `dps_webapp_backoffice/src/lib/codegen-pipeline.ts` (Task 1).
- Produces: `useCodegenPipelineStatus(prNumbers: number[]): { data: CodegenPipelineEntry[]; loading: boolean; error: string | null; rateLimited: boolean; refresh: () => void }` — consumed by Task 4's `CodegenPipelinePanel` and Task 5's `CodegenStatusCard`.

- [ ] **Step 1: Write the hook**

Create `dps_webapp_backoffice/src/lib/useCodegenPipelineStatus.ts`:

```ts
"use client";

import { useCallback, useEffect, useState } from "react";
import type { FirebaseRelease } from "@/lib/firebase-distribution";
import { matchReleaseToPr, type CodegenPipelineEntry, type GithubPrStatus } from "@/lib/codegen-pipeline";

interface UseCodegenPipelineStatusResult {
  data: CodegenPipelineEntry[];
  loading: boolean;
  error: string | null;
  rateLimited: boolean;
  refresh: () => void;
}

export function useCodegenPipelineStatus(prNumbers: number[]): UseCodegenPipelineStatusResult {
  const [data, setData] = useState<CodegenPipelineEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rateLimited, setRateLimited] = useState(false);
  const [refreshToken, setRefreshToken] = useState(0);

  const key = prNumbers.join(",");
  const refresh = useCallback(() => setRefreshToken((t) => t + 1), []);

  useEffect(() => {
    if (!key) {
      setData([]);
      setLoading(false);
      setError(null);
      setRateLimited(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    Promise.all([
      fetch(`/api/github-pr-status?prNumbers=${key}`).then((res) => res.json()),
      fetch("/api/firebase-releases").then((res) => res.json()),
    ])
      .then(
        ([prData, releaseData]: [
          { statuses?: GithubPrStatus[]; rateLimited?: boolean; error?: string },
          { releases?: FirebaseRelease[]; error?: string }
        ]) => {
          if (cancelled) return;
          if (prData.error) throw new Error(prData.error);

          const releases = releaseData.releases ?? [];
          const statuses = prData.statuses ?? [];
          setData(
            statuses.map((status) => ({
              ...status,
              release: matchReleaseToPr(releases, status.prNumber),
            }))
          );
          setRateLimited(Boolean(prData.rateLimited));
        }
      )
      .catch((err: Error) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [key, refreshToken]);

  return { data, loading, error, rateLimited, refresh };
}
```

- [ ] **Step 2: Type-check**

Run: `cd dps_webapp_backoffice && pnpm exec tsc --noEmit`
Expected: no errors attributable to `src/lib/useCodegenPipelineStatus.ts`.

- [ ] **Step 3: Commit**

```bash
cd dps_webapp_backoffice
git add src/lib/useCodegenPipelineStatus.ts
git commit -m "feat: add useCodegenPipelineStatus hook"
```

---

### Task 4: Releases page panel

**Files:**
- Create: `dps_webapp_backoffice/src/components/ui/CodegenPipelineStrip.tsx`
- Create: `dps_webapp_backoffice/src/components/ui/CodegenPipelinePanel.tsx`
- Modify: `dps_webapp_backoffice/src/app/releases/page.tsx:6` (import), `:241` (render)

**Interfaces:**
- Consumes: `CodegenPipelineEntry` (Task 1), `useCodegenPipelineStatus` (Task 3), `Button` from `dps_webapp_backoffice/src/components/ui/inputs.tsx` (existing).
- Produces: `CodegenPipelineStrip({ entry: CodegenPipelineEntry })` — also consumed by Task 5. `CodegenPipelinePanel({ apps: { id: string; name?: string; lastCodegenRun?: { prNumber?: number } }[] })`.

- [ ] **Step 1: Write the strip component**

Create `dps_webapp_backoffice/src/components/ui/CodegenPipelineStrip.tsx`:

```tsx
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

function prBadge(entry: CodegenPipelineEntry): { label: string; tone: Tone } {
  if (entry.merged) return { label: "PR merged", tone: "success" };
  if (entry.prState === "open") return { label: "PR open", tone: "info" };
  return { label: "PR closed", tone: "neutral" };
}

function buildBadge(entry: CodegenPipelineEntry): { label: string; tone: Tone } {
  const run = entry.actionsRun;
  if (!run) return { label: entry.merged ? "Build pending" : "Build —", tone: "neutral" };
  if (run.status !== "completed") return { label: "Build running", tone: "info" };
  if (run.conclusion === "success") return { label: "Build success", tone: "success" };
  if (run.conclusion === "failure") return { label: "Build failed", tone: "danger" };
  return { label: `Build ${run.conclusion ?? "unknown"}`, tone: "warning" };
}

function releaseBadge(entry: CodegenPipelineEntry): { label: string; tone: Tone } {
  return entry.release
    ? { label: "Release found", tone: "success" }
    : { label: "Release not yet", tone: "neutral" };
}

export function CodegenPipelineStrip({ entry }: { entry: CodegenPipelineEntry }) {
  if (entry.error) {
    return <span className={badgeClasses("danger")}>Unable to fetch PR #{entry.prNumber} status</span>;
  }

  const pr = prBadge(entry);
  const build = buildBadge(entry);
  const release = releaseBadge(entry);

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
```

- [ ] **Step 2: Write the panel component**

Create `dps_webapp_backoffice/src/components/ui/CodegenPipelinePanel.tsx`:

```tsx
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
```

- [ ] **Step 3: Wire the panel into the Releases page**

In `dps_webapp_backoffice/src/app/releases/page.tsx`, change the import block (currently lines 1-6):

```tsx
"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/inputs';
import { FirebaseReleasesPanel } from '@/components/ui/FirebaseReleasesPanel';
```

to:

```tsx
"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/inputs';
import { FirebaseReleasesPanel } from '@/components/ui/FirebaseReleasesPanel';
import { CodegenPipelinePanel } from '@/components/ui/CodegenPipelinePanel';
```

Then change the final line of the component (currently `<FirebaseReleasesPanel />` at line 241):

```tsx
      <FirebaseReleasesPanel />
    </div>
  );
}
```

to:

```tsx
      <CodegenPipelinePanel apps={apps} />
      <FirebaseReleasesPanel />
    </div>
  );
}
```

- [ ] **Step 4: Type-check and lint**

Run: `cd dps_webapp_backoffice && pnpm exec tsc --noEmit && pnpm run lint`
Expected: no errors attributable to the new/modified files.

- [ ] **Step 5: Manual verification in the browser**

Run: `cd dps_webapp_backoffice && pnpm run dev`, log into the Backoffice, navigate to `/releases`.
Expected: a "Native SDK Codegen Pipeline" panel renders above "Firebase Test Distribution". With no `NATIVE_SDK` apps that have `lastCodegenRun.status === 'opened'`, it shows "No native-SDK mini apps with a codegen PR yet." and no network calls to `/api/github-pr-status` fire (check the Network tab). Clicking Refresh re-runs the fetches without a full page reload.

- [ ] **Step 6: Commit**

```bash
cd dps_webapp_backoffice
git add src/components/ui/CodegenPipelineStrip.tsx src/components/ui/CodegenPipelinePanel.tsx src/app/releases/page.tsx
git commit -m "feat: show codegen pipeline status on the Releases page"
```

---

### Task 5: Mini App detail page card

**Files:**
- Create: `dps_webapp_backoffice/src/components/ui/CodegenStatusCard.tsx`
- Modify: `dps_webapp_backoffice/src/app/miniapps/[id]/page.tsx` (imports, `formData` type, render)

**Interfaces:**
- Consumes: `CodegenPipelineStrip` (Task 4), `useCodegenPipelineStatus` (Task 3).
- Produces: `CodegenStatusCard({ prNumber: number })`. Nothing else depends on this task.

- [ ] **Step 1: Write the card component**

Create `dps_webapp_backoffice/src/components/ui/CodegenStatusCard.tsx`:

```tsx
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
```

- [ ] **Step 2: Add the import and extend `formData`'s type**

In `dps_webapp_backoffice/src/app/miniapps/[id]/page.tsx`, add to the import block (after the existing `import { CreateMiniAppDto, IntegrationMethod, SourceType } from '@/types/miniapp.types';` line):

```tsx
import { CreateMiniAppDto, IntegrationMethod, SourceType } from '@/types/miniapp.types';
import { CodegenStatusCard } from '@/components/ui/CodegenStatusCard';
```

Change the `formData` state type (currently):

```tsx
  const [formData, setFormData] = useState<Partial<CreateMiniAppDto & { status: string, validationErrors?: Record<string, string> }>>({
```

to:

```tsx
  const [formData, setFormData] = useState<Partial<CreateMiniAppDto & {
    status: string,
    validationErrors?: Record<string, string>,
    lastCodegenRun?: { status: string; prNumber?: number },
  }>>({
```

(The full `lastCodegenRun` object already arrives in `formData` via the `...data` spread in the existing `fetchApp` effect — only the type annotation needs extending; no fetch logic changes.)

- [ ] **Step 3: Render the card**

In `dps_webapp_backoffice/src/app/miniapps/[id]/page.tsx`, find the end of the "Top Header Card" block:

```tsx
          </div>
        </div>

        {/* SA Admin Review & Action Banner for IN_REVIEW */}
```

Insert the card between the header card's closing `</div>` and the IN_REVIEW banner comment:

```tsx
          </div>
        </div>

        {formData.integrationMethod === IntegrationMethod.NATIVE_SDK &&
          formData.lastCodegenRun?.status === 'opened' &&
          typeof formData.lastCodegenRun.prNumber === 'number' && (
            <CodegenStatusCard prNumber={formData.lastCodegenRun.prNumber} />
          )}

        {/* SA Admin Review & Action Banner for IN_REVIEW */}
```

- [ ] **Step 4: Type-check and lint**

Run: `cd dps_webapp_backoffice && pnpm exec tsc --noEmit && pnpm run lint`
Expected: no errors attributable to the new/modified files.

- [ ] **Step 5: Manual verification in the browser**

Run: `cd dps_webapp_backoffice && pnpm run dev`, log in, open a `NATIVE_SDK` mini app's detail page that has a `lastCodegenRun` with `status: 'opened'`.
Expected: a "Native SDK Codegen Pipeline" card renders below the header, showing the same 3-stage strip as the Releases page panel for that app's PR, with its own Refresh button. A mini app with `lastCodegenRun.status` of `'no_changes'`, `'skipped'`, or `'error'` (or no `lastCodegenRun` at all) shows no card and triggers no request to `/api/github-pr-status`.

- [ ] **Step 6: Run the full test suite**

Run: `cd dps_webapp_backoffice && pnpm run test`
Expected: PASS (the 4 tests from Task 1).

- [ ] **Step 7: Commit**

```bash
cd dps_webapp_backoffice
git add src/components/ui/CodegenStatusCard.tsx src/app/miniapps/[id]/page.tsx
git commit -m "feat: show codegen pipeline status on the Mini App detail page"
```

---

## Self-Review Notes

- **Spec coverage:** API route + batching + rate-limit handling (Task 2), correlation function + unit tests (Task 1), shared hook with manual-refresh-only fetching (Task 3), Releases page panel (Task 4), Mini App detail page card (Task 5), env vars (Task 1), `lastCodegenRun.status !== 'opened'` short-circuit (Tasks 4 and 5 both filter on it before ever calling the hook with a real PR number) — every element of the design spec's "Design" and "Error handling" sections has a corresponding task. The spec's Non-goals (no polling, no backend changes, no persistence, no `neat`-branch fix) are correctly absent from every task.
- **Placeholder scan:** no TBD/TODO; every step has literal, complete code.
- **Type consistency:** `GithubPrStatus`/`CodegenPipelineEntry`/`GithubActionsRunStatus` are defined once in Task 1 and imported unchanged by Tasks 2-5; `useCodegenPipelineStatus`'s return shape (`data, loading, error, rateLimited, refresh`) matches its usage in both `CodegenPipelinePanel` (Task 4) and `CodegenStatusCard` (Task 5); `CodegenPipelineStrip`'s single prop (`entry: CodegenPipelineEntry`) matches both call sites.
