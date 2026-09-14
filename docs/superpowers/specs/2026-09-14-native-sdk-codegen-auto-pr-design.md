# Native SDK Codegen → Auto-PR — Design

**Date:** 2026-09-14
**Status:** Approved, pending implementation plan
**Sub-project:** 1 of 3 (approval → codegen → PR; PR-merge → Actions → Firebase; progress tracking)

## Context

The target end-to-end flow is: a partner's mini app is approved → native glue code is generated → a PR is opened → merging it triggers a build that distributes to Firebase App Distribution → an admin sees live progress and a copyable tester link in the Backoffice.

An earlier, divergent branch (`feat/native-sdk-codegen`) already implements the first half of this for `NATIVE_SDK`-tier mini apps: on approval, `dps_backend` regenerates marker-delimited native glue code (Flutter `MethodChannel` handlers + imports) into `dps_mobile_app`'s `ios/Runner/AppDelegate.swift`, `android/.../MainActivity.kt`, `ios/Podfile`, and `android/app/build.gradle.kts`, then opens a GitHub PR with the changed files.

Two things make that implementation unsafe to port as-is:

1. **It operates on `dps_backend`'s own live working directory** — `GithubPrService` runs `git checkout -b`, commits, pushes, and checks back out, on the same checkout a developer might be actively using. This is not safe to run in an environment like this one, where the backend's checkout is also the developer's active working tree.
2. **It never closes superseded PRs.** Because `regenerate()` always re-renders the *full* set of currently-approved `NATIVE_SDK` apps (not a per-app incremental diff), approving a second app before an earlier codegen PR merges produces a new PR whose content already supersedes the old one — but the old PR is left open, unrelated, and confusing to reviewers.

This design fixes both, and confirms via evidence (not assumption) that scoping to `NATIVE_SDK` apps only is still correct: `feat/deeplink` shows zero diff to `AndroidManifest.xml` or `Info.plist` versus `main`, meaning `DEEP_LINK` approvals need no native file changes, and `WEBVIEW` apps are pure runtime configuration with no native code either.

## Goal

When an SA Admin approves a `NATIVE_SDK` mini app, `dps_backend` should regenerate that app's native glue code and open a GitHub PR with the change — entirely through the GitHub API, with no local git operations and no local filesystem writes to the mobile app's source tree. Any previously open codegen PR that the new one supersedes is closed automatically.

## Non-goals

- Any integration method other than `NATIVE_SDK` (confirmed unnecessary above).
- The GitHub Actions / Firebase distribution trigger on PR merge (sub-project #2).
- Multi-stage progress tracking UI in the Backoffice (sub-project #3) — this sub-project only writes a single one-shot result, described below, for #3 to build on later.
- Per-app incremental PRs (each PR remains a full regeneration of all approved `NATIVE_SDK` apps' glue code, matching the existing branch's behavior).

## Architecture

Two of the four existing files from `feat/native-sdk-codegen` port over unchanged, because they're pure functions with no I/O:

- **`marker.ts`** — replaces the lines between a `GENERATED NATIVE SDK <region> —` / `END GENERATED NATIVE SDK <region>` marker pair in a string. No changes needed.
- **`renderers.ts`** — renders the Swift/Kotlin/Podfile/Gradle snippets for a list of vendors. No changes needed.

The other two are rebuilt to remove all local git/filesystem dependency:

### `NativeSdkCodegenService.regenerate()`

Unchanged: loads every `MiniApp` row where `integrationMethod = 'NATIVE_SDK'` and `status = 'APPROVED'`, validates each has the six required `integrationConfig` string fields, and checks for `appId`-derived identifier collisions.

Changed: instead of `fs.readFile`/`fs.stat` against a local checkout, it fetches each target file's current content via GitHub's Contents API:

```
GET https://api.github.com/repos/{CODEGEN_REPO_SLUG}/contents/{path}?ref={CODEGEN_BASE_BRANCH}
```

and verifies each vendor's artifact exists in the repo the same way (`vendor-artifacts/{filename}`), replacing the old local `fs.stat` check. It applies the same marker-splice logic (from `marker.ts`) against the fetched content, entirely in memory, and returns `{ changedFiles: Map<path, newContent> }` for files whose content actually changed. No disk writes.

### `GithubPrService.openPrForChanges(changedFiles)`

No local git commands anywhere. Every step is an authenticated `fetch` call to the GitHub REST/Git Data API:

1. `GET /repos/{slug}/git/ref/heads/{base}` → base commit SHA.
2. `GET /repos/{slug}/git/commits/{baseSha}` → base tree SHA.
3. For each changed file: `POST /repos/{slug}/git/blobs` with its new content → blob SHA.
4. `POST /repos/{slug}/git/trees` with `base_tree` + the changed files' `{path, mode: '100644', type: 'blob', sha}` entries → new tree SHA.
5. `POST /repos/{slug}/git/commits` with message `chore(codegen): regenerate native SDK glue`, the new tree, and `parents: [baseSha]` → new commit SHA.
6. `POST /repos/{slug}/git/refs` with `ref: refs/heads/codegen/native-sdk-{timestamp}` and the new commit SHA → creates the branch directly on GitHub.
7. `POST /repos/{slug}/pulls` with `head`, `base`, title, and the same body content as the existing branch (file list + review checklist) → opens the PR, returns `html_url` and PR number.
8. **New:** `GET /repos/{slug}/pulls?state=open&base={base}` → list open PRs targeting the base branch. Filter to `head.ref` values starting with `codegen/native-sdk-`, excluding the PR just opened in step 7. For each match: `POST /repos/{slug}/issues/{number}/comments` with a note linking to the new PR ("Superseded by a newer native SDK codegen run: {new PR url}"), then `PATCH /repos/{slug}/pulls/{number}` with `{state: 'closed'}`. A failure closing any individual superseded PR is logged and does not fail the overall operation — the new PR is already open and is the important artifact.

Gated the same way as before: if `CODEGEN_AUTO_PR` is not `'true'`, steps 3–8 are skipped entirely and the result is `{status: 'skipped'}` — this stays a deploy-time safety switch, separate from "fires automatically on approval" (confirmed: it should fire automatically, without a separate manual trigger, once enabled).

## Data flow

1. SA Admin approves a `NATIVE_SDK` app → existing `approve()` flips status to `APPROVED`, persists, logs activity (unchanged).
2. `regenerate()` runs against the current DB state and the live GitHub repo content.
3. If `changedFiles` is non-empty and `CODEGEN_AUTO_PR=true`: `openPrForChanges()` runs the full create-PR-then-close-superseded sequence above.
4. The result is written to a new `lastCodegenRun` jsonb column on the `MiniApp` entity:
   ```ts
   {
     status: 'opened' | 'no_changes' | 'skipped' | 'error';
     prUrl?: string;
     prNumber?: number;
     supersededPrNumbers?: number[];
     error?: string;
     timestamp: string; // ISO
   }
   ```
   and included in the `approve()` endpoint's response body, so the Backoffice has an immediate one-shot result to show even before sub-project #3's full progress tracking exists.

## Error handling

- Invalid vendor config (missing/blank required field) or an identifier collision between two apps' `appId`s → thrown before any GitHub call is made; `lastCodegenRun` records `{status: 'error', error}`.
- Missing artifact in the repo (Contents API 404) → same: thrown, recorded, no PR attempted.
- Any GitHub API failure at any step (auth, rate limit, 404 on the base ref, blob/tree/commit/ref/PR creation) → caught at the top level, logged server-side with the full detail, and recorded on `lastCodegenRun` as `{status: 'error', error: <short message>}`.
- The mini app's `APPROVED` status is never rolled back on any codegen/PR failure — approval is already persisted by the time codegen runs, matching the existing branch's behavior and this design's explicit non-goal of touching the approval transaction.
- A failure closing one superseded PR does not fail the whole operation (logged only) — see Architecture, step 8.

## Testing

Every GitHub call is a mockable `fetch` — no real network access in unit tests, matching this module's existing `.spec.ts` convention (`native-sdk-codegen.service.spec.ts`, plus a new `github-pr.service.spec.ts` covering: blob/tree/commit/ref/PR creation happy path, the superseded-PR-closing logic (including the "closing one fails, the rest still succeed" case), and `CODEGEN_AUTO_PR=false` short-circuiting before any GitHub call.

Manual verification: point `CODEGEN_REPO_SLUG` at a real or disposable GitHub repo with `CODEGEN_AUTO_PR=true` and a valid `GITHUB_TOKEN`, approve a `NATIVE_SDK` app, confirm a real PR appears with the expected diff; approve a second `NATIVE_SDK` app before merging the first PR, confirm the first PR gets the superseding comment and is closed, and the second PR contains both apps' glue code.
