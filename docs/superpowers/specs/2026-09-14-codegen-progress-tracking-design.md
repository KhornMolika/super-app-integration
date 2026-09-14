# Codegen Pipeline Progress Tracking — Design

**Date:** 2026-09-14
**Status:** Approved, pending implementation plan
**Sub-project:** 3 of 3 (approval → codegen → auto-PR [done]; PR-merge → Actions → Firebase [done]; progress tracking)

## Context

Sub-project 1 (done) makes an SA Admin's approval of a `NATIVE_SDK` mini app regenerate native glue code and open a GitHub PR via `GithubPrService`, storing `MiniApp.lastCodegenRun` (`status`, `prUrl`, `prNumber`, `supersededPrNumbers`, `error`, `timestamp`) on the mini app entity.

Sub-project 2 (done) makes merging a `codegen/native-sdk-*` PR into `main` trigger the existing `distribute_firebase` Fastlane lane via `.github/workflows/deploy.yml`, tagging the resulting Firebase release's notes with `"— Native SDK codegen PR #<n>"` when triggered that way.

**Reachability constraint carried over from earlier work:** the GitHub Actions runner cannot reach `dps_backend` (`localhost:3000`), so nothing in this pipeline reports its own status back to the backend. Today, an SA Admin who wants to know "did my approval's codegen PR ever get merged, build, and ship?" has to manually check GitHub and the Firebase console. This sub-project closes that gap by querying GitHub's and Firebase's APIs **on demand** from the Backoffice and correlating the results by PR number — the same on-demand-query pattern already used for the existing Firebase Distribution panel (`getFirebaseReleases()` / `FirebaseReleasesPanel`).

## Goal

An SA Admin can see, in the Backoffice, the live status of a mini app's codegen pipeline — PR state → triggered Actions build → resulting Firebase release — for any `NATIVE_SDK` mini app with a `lastCodegenRun.prNumber`, both in a cross-app view (Releases page) and on that mini app's own detail page, refreshed on load and via a manual Refresh button.

## Non-goals

- Any callback from GitHub Actions or Firebase to `dps_backend` (unreachable, per the constraint above) — everything here is pulled on demand from the Backoffice.
- Automatic polling. Data is fetched once per page load and on manual Refresh; no `setInterval`.
- Persisting fetched GitHub/Firebase status in the database — it is never more than a live read, never stored.
- Changing anything in sub-projects 1 or 2 (trigger logic, `lastCodegenRun` shape, release-notes tagging).
- Fixing `.github/workflows/deploy.yml`'s `push: branches: [neat]` trigger (a separate, likely pre-existing issue noticed during research — flagged to the user, not in scope here).
- Any mini app whose `lastCodegenRun.status !== 'opened'` (`no_changes` / `skipped` / `error`) gets no GitHub/Firebase calls at all — there is no PR to check, so its existing status is shown as-is.

## Design

### New Next.js API route: `dps_webapp_backoffice/src/app/api/github-pr-status/route.ts`

`GET /api/github-pr-status?prNumbers=101,102,105` (comma-separated, batched — the Releases page needs many at once and this keeps it to one round trip from the browser).

Auth: same `auth_token` cookie check already used by `api/firebase-releases/route.ts`.

For each PR number, using a `fetch`-based client mirroring `GithubPrService`'s existing auth style (`Authorization: Bearer ${GITHUB_TOKEN}`, `User-Agent: DPS-SuperApp-Integration`):

1. `GET {GITHUB_BASE_URL}/repos/{CODEGEN_REPO_SLUG}/pulls/{n}` → `state` (`open`/`closed`), `merged`, `head.sha`, `html_url`.
2. If the PR call succeeded: `GET {GITHUB_BASE_URL}/repos/{CODEGEN_REPO_SLUG}/actions/runs?head_sha={sha}` → take the most recent run's `status` (`queued`/`in_progress`/`completed`), `conclusion` (`success`/`failure`/`cancelled`/`null`), `html_url`.

New env vars, added to `dps_webapp_backoffice/.env.example` (same names as `dps_backend`'s, for consistency — these are two independent env values even though they'll typically hold the same secret in this POC): `GITHUB_TOKEN`, `GITHUB_BASE_URL` (default `https://api.github.com`), `CODEGEN_REPO_SLUG`.

Response shape:

```ts
type GithubPrStatus = {
  prNumber: number;
  prState: 'open' | 'closed';
  merged: boolean;
  prUrl: string;
  actionsRun: {
    status: 'queued' | 'in_progress' | 'completed';
    conclusion: 'success' | 'failure' | 'cancelled' | null;
    runUrl: string;
  } | null; // null: no matching run found (yet)
  error?: string; // set instead of the above fields if this PR's lookup failed
};

// GET response body:
{ statuses: GithubPrStatus[]; rateLimited?: boolean }
```

A GitHub `403` with a rate-limit response header sets `rateLimited: true` on the whole response (checked once, not per-PR) and omits further calls for the remaining PR numbers in that batch — the frontend shows one banner instead of N per-row errors.

### Correlating a Firebase release

Pure function `matchReleaseToPr(releases: FirebaseRelease[], prNumber: number): FirebaseRelease | undefined` (new file, e.g. `dps_webapp_backoffice/src/lib/codegen-pipeline.ts`) that regex-matches `` /Native SDK codegen PR #(\d+)/ `` against each release's `releaseNotes` and returns the release whose captured number equals `prNumber`. This is the one piece of non-trivial logic in this feature and is unit-testable without any live API.

### Shared data-fetching hook

`useCodegenPipelineStatus(prNumbers: number[])` in `dps_webapp_backoffice/src/lib/useCodegenPipelineStatus.ts`:

- Fetches `/api/github-pr-status?prNumbers=...` and `/api/firebase-releases` in parallel on mount and whenever `prNumbers` changes.
- Joins them via `matchReleaseToPr`.
- Exposes `{ data: CodegenPipelineEntry[], loading, error, rateLimited, refresh }` where `refresh()` re-runs both fetches.
- `CodegenPipelineEntry = GithubPrStatus & { release: FirebaseRelease | undefined }`.

### UI: Releases page

New component `CodegenPipelinePanel` (`dps_webapp_backoffice/src/components/ui/CodegenPipelinePanel.tsx`), rendered on `dps_webapp_backoffice/src/app/releases/page.tsx` alongside the existing `<FirebaseReleasesPanel />`. It receives the already-fetched mini apps list (the Releases page already fetches `/api/mini-apps`), filters to `integrationMethod === 'NATIVE_SDK' && lastCodegenRun?.status === 'opened' && lastCodegenRun.prNumber`, and calls `useCodegenPipelineStatus` with those PR numbers. Renders one row per mini app: app name → 3-stage strip (PR: open/merged/closed → Build: pending/queued/running/success/failed → Release: found/not yet, linking out to the PR/run/Firebase console URLs) → a page-level Refresh button.

### UI: Mini App detail page

`dps_webapp_backoffice/src/app/miniapps/[id]/page.tsx` gets a compact version of the same strip (reusing `useCodegenPipelineStatus([lastCodegenRun.prNumber])`) shown when `integrationMethod === 'NATIVE_SDK' && lastCodegenRun` is present, placed near the page's existing status UI. Its own Refresh button, independent of the Releases page's.

Mini apps whose `lastCodegenRun.status` is `no_changes` / `skipped` / `error` show that status directly (already available from the existing `GET /mini-apps/:id` payload) with no new API calls.

### Error handling

- Per-PR GitHub lookup failure (404, network error) → that row shows an inline "unable to fetch PR status" state; other rows in the same batch are unaffected.
- Rate-limit (`403` with `X-RateLimit-Remaining: 0`) → one banner across the whole panel, remaining per-PR calls in that batch are skipped rather than each individually erroring.
- No Actions run yet found for a merged PR (workflow hasn't started/registered) → rendered as "Build: pending", not an error.
- Firebase API failure (already-existing failure mode of `/api/firebase-releases`) → the pipeline strip's Release stage shows "unknown" rather than blocking the PR/Build stages, which don't depend on it.

### Testing

No automated coverage for live GitHub/Firebase API calls (consistent with sub-projects 1 and 2 — this POC has no mocked-API test harness for these integrations). What *is* testable and will get a unit test:

- `matchReleaseToPr`: matches on exact PR number, ignores releases with no PR tag, handles multiple releases where only one matches, handles multi-digit PR numbers without partial-match false positives (e.g. PR `#12` must not match `#123`'s release notes).

Manual verification (mirrors sub-project 2's approach):

1. With a mini app that has an open, unmerged codegen PR: confirm the Releases page and its detail page show "PR: open", "Build: —", "Release: not yet".
2. Merge that PR and wait for the Actions run to start: confirm both views show "Build: running" without a refresh needed only after clicking Refresh (no auto-poll, per design).
3. Once the run completes and Firebase distribution finishes: Refresh again, confirm "Build: success" and "Release: found", linking to the correct Firebase console release.
4. Simulate a PR-lookup failure (e.g. temporarily wrong `CODEGEN_REPO_SLUG`) and confirm the per-row error state appears without crashing the rest of the panel.
5. Confirm a mini app with `lastCodegenRun.status: 'error'` or `'no_changes'` shows that status directly with no network calls to `/api/github-pr-status` for its PR (there is none).
