# PR-Merge → Actions → Firebase Trigger — Design

**Date:** 2026-09-14
**Status:** Approved, pending implementation plan
**Sub-project:** 2 of 3 (approval → codegen → auto-PR [done]; PR-merge → Actions → Firebase; progress tracking)

## Context

Sub-project 1 (done) makes an SA Admin's approval of a `NATIVE_SDK` mini app regenerate native glue code and open a GitHub PR via `GithubPrService`, on a branch named `codegen/native-sdk-<timestamp>`. Superseded PRs (from a later approval that already regenerated everything the older PR had) are automatically closed, and every `MiniApp` whose `lastCodegenRun.prNumber` pointed at a superseded PR is repointed to the new one.

The existing `.github/workflows/deploy.yml` (built earlier, unrelated to mini-app approval) builds the Super App APK and distributes it to Firebase App Distribution's `internal-testers` group, but only on a push to the `neat` branch or manual dispatch — it has no relationship to any mini app's approval or PR.

This sub-project connects the two: merging a codegen PR should trigger that same build-and-distribute pipeline.

**Reachability constraint carried over from earlier work:** the GitHub Actions runner (cloud) cannot reach `dps_backend` (`localhost:3000`) to push status updates. This sub-project therefore does not attempt any callback from CI to the backend — it only makes the trigger fire correctly and tags the resulting Firebase release with a correlatable identifier. Querying and displaying build/release status is sub-project 3's job, done by pulling from GitHub's and Firebase's own APIs on demand (the same pattern already used for the Firebase Distribution Backoffice panel).

## Goal

Merging a `codegen/native-sdk-*` PR into the codegen base branch triggers the existing build-and-distribute pipeline, and the resulting Firebase release is tagged with the PR number that produced it.

## Non-goals

- Any callback from GitHub Actions to `dps_backend` (unreachable, per the constraint above).
- Displaying build/release progress anywhere in the Backoffice (sub-project 3).
- Correlating a build to individual mini apps/appIds — the PR number is the only correlation key; a mini app's own `lastCodegenRun.prNumber` (from sub-project 1) is how a future consumer maps a mini app to "its" PR.
- Changing anything about the existing `push: branches: [neat]` / `workflow_dispatch` triggers, which stay exactly as they are for manual/existing use.
- Keeping the workflow's hardcoded base branch in YAML automatically in sync with `dps_backend`'s `CODEGEN_BASE_BRANCH` env var — both must be manually kept pointing at the same branch (`main`, in the current POC configuration). Documented as a known limitation, not solved.

## Design

### Workflow trigger (`.github/workflows/deploy.yml`)

Add a `pull_request` trigger alongside the existing ones:

```yaml
on:
  push:
    branches: [neat]
  pull_request:
    types: [closed]
    branches: [main] # must match dps_backend's CODEGEN_BASE_BRANCH — see Non-goals
  workflow_dispatch: {}
```

Add a job-level guard so the build only actually runs for a genuine merge of a codegen PR — `types: [closed]` also fires when a PR is closed *without* merging, which includes every PR sub-project 1's supersede-closing logic closes:

```yaml
jobs:
  distribute:
    if: >
      github.event_name != 'pull_request' ||
      (github.event.pull_request.merged == true &&
       startsWith(github.event.pull_request.head.ref, 'codegen/native-sdk-'))
    runs-on: ubuntu-latest
    ...
```

`push` and `workflow_dispatch` events have no `github.event.pull_request` object, so the first clause (`github.event_name != 'pull_request'`) short-circuits true for them, preserving today's behavior unchanged. A `pull_request` event only proceeds past the guard when it was actually merged and its head branch matches the codegen naming convention — closing a superseded PR, or merging/closing an unrelated PR, does not trigger a build.

### Tagging the release with its PR number

Set an env var only on the `pull_request` path:

```yaml
env:
  CODEGEN_PR_NUMBER: ${{ github.event_name == 'pull_request' && github.event.pull_request.number || '' }}
```

Pass it through to the `distribute_firebase` Fastlane lane (already reads other `ENV[...]` values the same way), which appends it to the release notes when present:

```ruby
pr_number = ENV["CODEGEN_PR_NUMBER"]
notes = "CI: #{ENV['GITHUB_REF_NAME'] || 'local'} @ #{(ENV['GITHUB_SHA'] || 'dev')[0, 7]}"
notes += " — Native SDK codegen PR ##{pr_number}" unless pr_number.nil? || pr_number.empty?
```

This makes a release's origin visible directly in the Firebase console's release notes even before sub-project 3 builds anything, and gives sub-project 3 a plain-text marker to search on if it ever needs to (though the primary correlation path is `dps_backend`'s own `lastCodegenRun.prNumber`, not parsing Firebase text).

### Error handling

None beyond what already exists — this sub-project only changes trigger conditions and one release-notes string. A misconfigured `startsWith` guard failing open (running a build it shouldn't) or failing closed (skipping a build it should run) are both visible immediately in the Actions run list; no silent failure mode is introduced.

### Testing

No automated test framework covers GitHub Actions YAML in this repo (consistent with the existing `deploy.yml`, which has none). Manual verification:

1. Approve a `NATIVE_SDK` app locally (with `CODEGEN_AUTO_PR=true` and real GitHub credentials) to get a real codegen PR open.
2. Merge that PR on GitHub. Confirm the "Android · Firebase App Distribution" workflow run appears in the Actions tab, triggered by the `pull_request` event.
3. Confirm the resulting Firebase release's notes include the PR number.
4. Separately, approve a second `NATIVE_SDK` app while the first PR is still open so it gets superseded and closed (not merged). Confirm closing that PR does **not** trigger a workflow run (check the Actions tab shows no new run for that close event).
5. Confirm the existing `push`-to-`neat` and manual-dispatch triggers still work unchanged.
