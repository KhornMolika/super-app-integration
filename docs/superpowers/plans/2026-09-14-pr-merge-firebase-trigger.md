# PR-Merge Firebase Trigger Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Merging a `codegen/native-sdk-*` PR into `main` triggers the existing Firebase App Distribution workflow, and the resulting Firebase release's notes include the PR number that produced it.

**Architecture:** Add a `pull_request: types: [closed]` trigger to the existing `.github/workflows/deploy.yml`, guarded by a job-level condition that only proceeds for an actual merge of a codegen branch (not every PR close, which includes superseded PRs closing). Pass the PR number through as an env var to the existing `distribute_firebase` Fastlane lane, which appends it to the release notes string when present.

**Tech Stack:** GitHub Actions YAML, Ruby (Fastlane).

## Global Constraints

- `push: branches: [neat]` and `workflow_dispatch` triggers must remain exactly as they are — this plan only adds a third trigger, never modifies the existing two.
- The job must not run for a `pull_request` event that isn't a genuine merge of a `codegen/native-sdk-*` branch — in particular, a PR closed without merging (which includes every PR the native-SDK codegen auto-PR service closes as superseded) must NOT trigger a build.
- The workflow's `pull_request` trigger branch (`main`) is a manually-maintained match to `dps_backend`'s `CODEGEN_BASE_BRANCH` env var — this plan does not attempt to keep them automatically in sync (documented limitation, not a defect to fix).
- No automated test framework covers this repo's GitHub Actions YAML or Fastlane Ruby files — verification here is syntax validation (`ruby -ryaml`, `ruby -c`) plus the design spec's manual steps, which need a real GitHub repo with actual codegen PRs and cannot be executed by an implementer without that access.

---

### Task 1: Add the PR-merge trigger and PR-number release tagging

**Files:**
- Modify: `.github/workflows/deploy.yml`
- Modify: `dps_mobile_app/android/fastlane/Fastfile`

**Interfaces:**
- Consumes: nothing from other tasks (only task in this plan).
- Produces: nothing consumed by a later task in this repo's code — sub-project 3 (not yet planned) will read `MiniApp.lastCodegenRun.prNumber` from the database and, separately, query GitHub's Actions/PR APIs and Firebase's release list on demand; it does not depend on anything from this task except the informal convention that a Firebase release's notes *may* contain `"Native SDK codegen PR #<n>"` when triggered this way.

- [ ] **Step 1: Read both files in full**

Read `.github/workflows/deploy.yml` and `dps_mobile_app/android/fastlane/Fastfile` before editing — confirm their current content matches what's shown below exactly before applying the edits (if it doesn't match, stop and report NEEDS_CONTEXT rather than guessing at a merge).

- [ ] **Step 2: Edit `.github/workflows/deploy.yml`**

Replace the `on:` block:

```yaml
on:
  push:
    branches: [neat]
  workflow_dispatch: {} # allows manual "Run workflow" from the Actions tab, on any branch, for testing
```

with:

```yaml
on:
  push:
    branches: [neat]
  pull_request:
    types: [closed]
    branches: [main] # must match dps_backend's CODEGEN_BASE_BRANCH env var — keep both in sync
  workflow_dispatch: {} # allows manual "Run workflow" from the Actions tab, on any branch, for testing
```

Replace:

```yaml
jobs:
  distribute:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: dps_mobile_app
```

with:

```yaml
jobs:
  distribute:
    # For a pull_request event, only run for an actual merge of a native-SDK codegen PR —
    # `types: [closed]` also fires when a PR is closed WITHOUT merging, which includes every
    # PR the codegen auto-PR service closes as superseded. push/workflow_dispatch events have
    # no pull_request object, so the first clause always lets them through unchanged.
    if: >
      github.event_name != 'pull_request' ||
      (github.event.pull_request.merged == true &&
       startsWith(github.event.pull_request.head.ref, 'codegen/native-sdk-'))
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: dps_mobile_app
```

Replace the "Build & distribute" step:

```yaml
      - name: Build & distribute
        working-directory: dps_mobile_app/android
        env:
          FIREBASE_APP_ID: ${{ secrets.FIREBASE_APP_ID }}
          GOOGLE_APPLICATION_CREDENTIALS: ${{ runner.temp }}/firebase-service-account.json
        run: bundle exec fastlane android distribute_firebase
```

with:

```yaml
      - name: Build & distribute
        working-directory: dps_mobile_app/android
        env:
          FIREBASE_APP_ID: ${{ secrets.FIREBASE_APP_ID }}
          GOOGLE_APPLICATION_CREDENTIALS: ${{ runner.temp }}/firebase-service-account.json
          CODEGEN_PR_NUMBER: ${{ github.event_name == 'pull_request' && github.event.pull_request.number || '' }}
        run: bundle exec fastlane android distribute_firebase
```

Every other line in the file (the `name:`, `permissions:`, `concurrency:`, and the remaining steps) is unchanged.

- [ ] **Step 3: Edit `dps_mobile_app/android/fastlane/Fastfile`**

In the `distribute_firebase` lane, replace:

```ruby
    firebase_app_distribution(
      app: ENV.fetch("FIREBASE_APP_ID"),
      service_credentials_file: ENV["GOOGLE_APPLICATION_CREDENTIALS"],
      android_artifact_type: "APK",
      android_artifact_path: apk_path,
      groups: "internal-testers",
      release_notes: "CI: #{ENV['GITHUB_REF_NAME'] || 'local'} @ #{(ENV['GITHUB_SHA'] || 'dev')[0, 7]}"
    )
```

with:

```ruby
    pr_number = ENV["CODEGEN_PR_NUMBER"]
    release_notes = "CI: #{ENV['GITHUB_REF_NAME'] || 'local'} @ #{(ENV['GITHUB_SHA'] || 'dev')[0, 7]}"
    release_notes += " — Native SDK codegen PR ##{pr_number}" unless pr_number.nil? || pr_number.empty?

    firebase_app_distribution(
      app: ENV.fetch("FIREBASE_APP_ID"),
      service_credentials_file: ENV["GOOGLE_APPLICATION_CREDENTIALS"],
      android_artifact_type: "APK",
      android_artifact_path: apk_path,
      groups: "internal-testers",
      release_notes: release_notes
    )
```

Nothing else in the file changes — `build_test_release` and `build_production` are untouched.

- [ ] **Step 4: Validate YAML syntax**

Run: `ruby -ryaml -e "YAML.load_file('.github/workflows/deploy.yml'); puts 'YAML OK'"` (from the repo root)
Expected: `YAML OK`, no exception.

- [ ] **Step 5: Validate Ruby syntax**

Run: `ruby -c dps_mobile_app/android/fastlane/Fastfile`
Expected: `Syntax OK`.

- [ ] **Step 6: Manually verify the job-level `if` condition's logic**

This can't be executed (no real GitHub Actions run available), but trace it by hand and confirm in your report:
- A `push` event: `github.event_name != 'pull_request'` is `true` → job runs. ✓ (unchanged behavior)
- A `workflow_dispatch` event: same as above → job runs. ✓ (unchanged behavior)
- A `pull_request` event where the PR was merged and its head ref is `codegen/native-sdk-1700000000000`: first clause `false`, second clause `(true && true)` = `true` → job runs. ✓
- A `pull_request` event where the PR was closed WITHOUT merging (e.g. a superseded codegen PR): first clause `false`, second clause `(false && ...)` = `false` → job does NOT run. ✓
- A `pull_request` event where an unrelated PR (not from a codegen branch) merges into `main`: first clause `false`, second clause `(true && false)` = `false` → job does NOT run. ✓

- [ ] **Step 7: Commit**

```bash
git add .github/workflows/deploy.yml dps_mobile_app/android/fastlane/Fastfile
git commit -m "feat: trigger Firebase distribution on merged native SDK codegen PRs"
```

---

## Self-Review Notes

- **Spec coverage:** trigger addition, job guard against non-merge closes and unrelated PRs, PR-number env var, release-notes tagging — every element of the design spec's "Design" section has a corresponding edit in this single task. The design's own Non-goals (no backend changes, no YAML/env auto-sync) are correctly reflected as absent from this plan.
- **Placeholder scan:** no TBD/TODO; both edits are complete, literal diffs.
- **Type consistency:** N/A (YAML + Ruby string concatenation, no cross-file type contract beyond the `CODEGEN_PR_NUMBER` env var name, which is spelled identically in both files).
