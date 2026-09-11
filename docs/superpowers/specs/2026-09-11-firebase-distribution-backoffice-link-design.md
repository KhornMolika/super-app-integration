# Firebase App Distribution links in the Backoffice — Design

**Date:** 2026-09-11
**Status:** Approved, pending implementation plan

## Context

`dps_mobile_app`'s Android build now has a `distribute_firebase` Fastlane lane (added in a prior change) that builds a release APK and uploads it to Firebase App Distribution's `internal-testers` group via GitHub Actions (`.github/workflows/deploy.yml`).

Firebase App Distribution does not hand out a plain, durable public download URL the way the existing Sonatype Nexus setup does (`/api/download-apk`). Each release exposes two different links from the Firebase App Distribution REST API:

- `testingUri` — a stable link for that release. Opening it requires the viewer to sign in with a Google account that Firebase recognizes as a tester for the app. This is inherent to how App Distribution works and cannot be bypassed.
- `binaryDownloadUri` — a direct link to the APK bytes, but it is a signed URL that expires (~1 hour), so it cannot be captured once and reused later.

This design uses `testingUri`: an SA Admin views it in the Backoffice and copies it to send to whoever needs it (the recipient still needs Google sign-in as a recognized tester — this is a Firebase product constraint, not a gap in this design).

There is also a network-reachability constraint: the GitHub Actions runner (cloud) cannot reach `dps_backend` (`localhost:3000`), unlike Jenkins (which runs in a local Docker container reachable via `host.docker.internal:3000`). So the existing "CI pushes a build-callback" pattern used for Jenkins/Nexus builds does not work here. This design flips the direction: the Backoffice calls out to Firebase's own API on demand, rather than CI pushing data in.

## Goal

Let an SA Admin, from the Backoffice Releases page, see the history of Firebase App Distribution releases for the Super App's Android build and copy a shareable tester link for any of them — without needing to open the Firebase console.

## Non-goals

- Proxying/streaming actual APK bytes through the Backoffice for Firebase builds (that's the `binaryDownloadUri` approach — rejected because of its ~1 hour expiry; the existing Nexus `/api/download-apk` route already covers real byte-streaming for the Nexus-published artifacts).
- Changing anything about the existing Nexus-based release flow, the Jenkins pipelines, or the `build-callback` mechanism.
- Automating tester invitations or managing the `internal-testers` group membership.
- Any iOS equivalent (out of scope for this change; Firebase distribution here is Android-only, matching the existing Fastlane lane).

## Architecture

A new Next.js Route Handler in the Backoffice, `dps_webapp_backoffice/src/app/api/firebase-releases/route.ts`, following the same "talk directly to the third-party service" pattern the existing `/api/download-apk` route already uses for Nexus (no `dps_backend` involvement).

On `GET`:

1. Read the Google service account JSON from a local file path given by the `FIREBASE_SERVICE_ACCOUNT_PATH` env var. The file itself is **not** committed (gitignored), consistent with how `android/key.properties` is already handled in this repo.
2. Exchange the service account credentials for an OAuth2 access token using `google-auth-library` (new dependency), with scope `https://www.googleapis.com/auth/cloud-platform`.
3. Call the Firebase App Distribution REST API:
   `GET https://firebaseappdistribution.googleapis.com/v1/projects/{FIREBASE_PROJECT_NUMBER}/apps/{FIREBASE_ANDROID_APP_ID}/releases`
4. Map each entry in the response's `releases[]` array to:
   ```ts
   {
     id: string;            // release resource name/id
     displayVersion: string; // e.g. "1.0.0"
     buildVersion: string;   // e.g. "1"
     releaseNotes: string;   // from the release's releaseNotes.text, may be empty
     createTime: string;     // ISO timestamp
     testingUri: string;     // the tester link to copy
     firebaseConsoleUri: string; // link to open this release in the Firebase console
   }
   ```
5. Sort newest-first by `createTime` (defensively, even though the API is expected to already return newest-first).
6. Return the array as JSON.

No local persistence or caching layer — every page load is a live call to Firebase. This is an admin-facing, low-traffic page, so the simplicity of "always live" outweighs the cost of adding a cache.

### New environment variables

Added to `dps_webapp_backoffice/.env.local` (gitignored) and documented (without real values) in `dps_webapp_backoffice/.env.example`:

- `FIREBASE_PROJECT_NUMBER` — the numeric GCP project number backing the Firebase project (found in Firebase Console → Project Settings).
- `FIREBASE_ANDROID_APP_ID` — the same Firebase App ID used as the `FIREBASE_APP_ID` GitHub Actions secret (`1:...:android:...`).
- `FIREBASE_SERVICE_ACCOUNT_PATH` — absolute or repo-relative path to the service account JSON file on the machine running the Backoffice server. Can reuse the same service account created for CI, or a separate one scoped to the same `Firebase App Distribution Admin` role.

## UI

New section added to `dps_webapp_backoffice/src/app/releases/page.tsx`, below the existing Gate 2 / Nexus assembly section, titled **"Firebase Test Distribution (Internal Testers)"**.

A table with columns:

| Version | Release Notes | Date | Actions |
|---|---|---|---|
| `displayVersion (buildVersion)` | `releaseNotes` (or "—" if empty) | formatted `createTime` | Copy Link · Open in Firebase |

Row actions:
- **Copy Link** — writes `testingUri` to the clipboard (`navigator.clipboard.writeText`), shows a brief inline "Copied" confirmation (e.g. swap the button label for ~1.5s), no browser alert/toast dependency beyond what the page already uses.
- **Open in Firebase** — external-link icon button, opens `firebaseConsoleUri` in a new tab.

Follows existing repo conventions: natural SVG icons only (no emoji), dark theme (`#080C14` / `#0F172A` / `#1E293B` with existing brand accents), consistent with the rest of the Releases page.

States:
- **Loading** — a spinner consistent with the one already used elsewhere on this page.
- **Empty** — "No Firebase releases yet." if the array comes back empty.
- **Error** — an inline error banner scoped to just this section (e.g. "Couldn't reach Firebase App Distribution — check server credentials.") if the fetch fails; the rest of the Releases page (Gate 2 assembly, mini app list) continues to work normally.

## Error handling

Route handler (`/api/firebase-releases`):
- Missing/unset required env vars → `500` with a message naming which var is missing.
- Service account file not found or unreadable → `500` with a clear message (do not leak file contents or paths beyond what's needed to debug).
- Google OAuth token exchange failure → `502` with a short message (e.g. "Failed to authenticate with Google").
- Firebase API returns non-2xx → pass through the upstream status code and a short message; log the full upstream error server-side only.

Frontend:
- Catches the fetch rejection/non-OK response and renders the inline error banner described above; never throws an unhandled error that would break the rest of the page.

## Testing / verification

Consistent with this repo's existing convention (the Nexus `/api/download-apk` route has no automated tests either): manual verification only.

1. Set the three env vars locally in `dps_webapp_backoffice/.env.local`, pointing at a real service account JSON with the `Firebase App Distribution Admin` role.
2. Hit `http://localhost:3002/api/firebase-releases` directly in a browser; confirm the JSON response contains real release entries with working `testingUri` / `firebaseConsoleUri` values (cross-check against what was seen in the Firebase console during the earlier CI end-to-end test).
3. Open the Releases page in the Backoffice; confirm the new table renders with the same data.
4. Click **Copy Link** on a row, paste it somewhere, confirm it matches that row's `testingUri` and that opening it in a browser reaches Firebase's tester sign-in flow.
5. Click **Open in Firebase**; confirm it opens the correct release in the Firebase console in a new tab.
6. Temporarily unset one of the env vars, reload the page, confirm the error banner appears and the rest of the page still works.
