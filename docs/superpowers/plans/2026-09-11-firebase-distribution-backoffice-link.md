# Firebase Distribution Backoffice Link Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let an SA Admin see Firebase App Distribution release history for the Super App's Android build in the Backoffice Releases page and copy a shareable tester link, without opening the Firebase console.

**Architecture:** A new Next.js Route Handler (`/api/firebase-releases`) in `dps_webapp_backoffice` calls the Firebase App Distribution REST API directly using a service account (same pattern the existing `/api/download-apk` route already uses for Nexus — no `dps_backend` involvement, no changes to the Jenkins/Nexus flow). A small server-only helper module holds the Google auth + API-call + mapping logic; the route handler is a thin HTTP wrapper around it. A new client component renders the results as a table with Copy Link / Open in Firebase actions, added to the existing Releases page.

**Tech Stack:** Next.js 16 (App Router, Route Handlers), React 19, TypeScript, `google-auth-library` (new dependency), Tailwind CSS v4, pnpm.

## Global Constraints

- Always use `pnpm`, never `npm` or `yarn` (project-wide rule).
- Natural SVG vector icons only — never emojis in buttons, titles, or alerts (this is a repo-wide rule; note the *existing* Releases page already uses emoji in a few spots (🚀, 🛡️, 📱) predating this rule's enforcement here — do not touch those while adding the new section; only the new code follows the no-emoji rule).
- Dark theme primary styling (`#080C14`, `#0F172A`, `#1E293B`) with emerald/cyan/brand accents; match existing Tailwind class patterns already used on the Releases page (`bg-white dark:bg-slate-900/50`, `border-slate-200 dark:border-slate-700`, `rounded-xl`/`rounded-2xl`, `text-slate-900 dark:text-white`, etc.).
- No automated test framework is configured in `dps_webapp_backoffice` (no jest/vitest, no `test` script) and the existing analogous route (`/api/download-apk`) has no automated tests either — this plan uses manual verification (curl + browser) for every task, consistent with that convention. Do not introduce a new test framework as part of this work.
- `testingUri` requires the viewer to sign in with a Google account Firebase recognizes as a tester — this is a Firebase product constraint, not something this code can change or work around.
- `FIREBASE_SERVICE_ACCOUNT_PATH` points at a real credential file on disk — it must never be committed. `dps_webapp_backoffice/.gitignore` already covers it (added in a prior change: `/super-app-test-dev-bc591ece0c31.json` plus general `*service-account*.json` / `*-adminsdk-*.json` patterns). Do not remove or narrow those rules.

---

### Task 1: Add `google-auth-library` and document the new environment variables

**Files:**
- Modify: `dps_webapp_backoffice/package.json`, `dps_webapp_backoffice/pnpm-lock.yaml` (via `pnpm add`)
- Modify: `dps_webapp_backoffice/.env.example`

**Interfaces:**
- Consumes: nothing (first task)
- Produces: the `google-auth-library` package available to import as `import { GoogleAuth } from "google-auth-library"` in later tasks; three documented env var names (`FIREBASE_PROJECT_NUMBER`, `FIREBASE_ANDROID_APP_ID`, `FIREBASE_SERVICE_ACCOUNT_PATH`) that Task 2's helper module reads via `process.env`.

- [ ] **Step 1: Install the dependency**

Run from `dps_webapp_backoffice/`:

```bash
cd dps_webapp_backoffice
pnpm add google-auth-library
```

- [ ] **Step 2: Verify it installed**

Run: `pnpm list google-auth-library`
Expected: prints a line like `google-auth-library 9.x.x`, and `package.json`'s `dependencies` now includes `"google-auth-library"`.

- [ ] **Step 3: Document the new env vars in `.env.example`**

Read the current file first, then add these lines at the end of `dps_webapp_backoffice/.env.example`:

```
# Firebase App Distribution (Android test builds)
# FIREBASE_PROJECT_NUMBER: numeric GCP project number backing the Firebase project
#   (Firebase Console -> Project Settings -> the numeric "Project number", NOT the string Project ID)
# FIREBASE_ANDROID_APP_ID: the Android app's Firebase App ID, format "1:...:android:..."
#   (same value used as the FIREBASE_APP_ID GitHub Actions secret)
# FIREBASE_SERVICE_ACCOUNT_PATH: path to a Firebase/GCP service account JSON key file
#   with the "Firebase App Distribution Admin" role. Never commit the actual key file.
FIREBASE_PROJECT_NUMBER=
FIREBASE_ANDROID_APP_ID=
FIREBASE_SERVICE_ACCOUNT_PATH=
```

- [ ] **Step 4: Set real values in your own local `.env`**

`dps_webapp_backoffice/.env` already has `FIREBASE_SERVICE_ACCOUNT_PATH=./super-app-test-dev-bc591ece0c31.json` set. Add the other two real values there (not in `.env.example`) — this is a manual step outside the codebase (find them in Firebase Console -> Project Settings):

```
FIREBASE_PROJECT_NUMBER=<your real numeric project number>
FIREBASE_ANDROID_APP_ID=<your real 1:...:android:... app id>
```

- [ ] **Step 5: Commit**

```bash
git add dps_webapp_backoffice/package.json dps_webapp_backoffice/pnpm-lock.yaml dps_webapp_backoffice/.env.example
git commit -m "feat: add google-auth-library and document Firebase Distribution env vars"
```

(`.env` itself is gitignored and never committed — only `.env.example` is.)

---

### Task 2: Firebase App Distribution helper module + API route

**Files:**
- Create: `dps_webapp_backoffice/src/lib/firebase-distribution.ts`
- Create: `dps_webapp_backoffice/src/app/api/firebase-releases/route.ts`

**Interfaces:**
- Consumes: `google-auth-library`'s `GoogleAuth` class (from Task 1); env vars `FIREBASE_PROJECT_NUMBER`, `FIREBASE_ANDROID_APP_ID`, `FIREBASE_SERVICE_ACCOUNT_PATH`.
- Produces (for Task 3's UI component to rely on as the exact response shape of `GET /api/firebase-releases`):
  ```ts
  // 200 response body:
  { releases: FirebaseRelease[] }
  // FirebaseRelease shape:
  interface FirebaseRelease {
    id: string;
    displayVersion: string;
    buildVersion: string;
    releaseNotes: string;   // "" if none, never undefined
    createTime: string;     // ISO 8601 string, "" if unknown
    testingUri: string;
    firebaseConsoleUri: string;
  }
  // Error response body (4xx/5xx):
  { error: string }
  ```

- [ ] **Step 1: Write the helper module**

Create `dps_webapp_backoffice/src/lib/firebase-distribution.ts`:

```ts
import { GoogleAuth } from "google-auth-library";
import fs from "node:fs";

export interface FirebaseRelease {
  id: string;
  displayVersion: string;
  buildVersion: string;
  releaseNotes: string;
  createTime: string;
  testingUri: string;
  firebaseConsoleUri: string;
}

export class FirebaseDistributionConfigError extends Error {}

export class FirebaseDistributionApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

function readRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new FirebaseDistributionConfigError(`Missing required environment variable: ${name}`);
  }
  return value;
}

async function getAccessToken(serviceAccountPath: string): Promise<string> {
  if (!fs.existsSync(serviceAccountPath)) {
    throw new FirebaseDistributionConfigError(
      `Firebase service account file not found at path: ${serviceAccountPath}`
    );
  }

  const auth = new GoogleAuth({
    keyFile: serviceAccountPath,
    scopes: ["https://www.googleapis.com/auth/cloud-platform"],
  });

  let token: string | null | undefined;
  try {
    const client = await auth.getClient();
    const tokenResponse = await client.getAccessToken();
    token = tokenResponse.token;
  } catch (err) {
    throw new FirebaseDistributionApiError(
      `Failed to authenticate with Google: ${(err as Error).message}`,
      502
    );
  }

  if (!token) {
    throw new FirebaseDistributionApiError("Google returned an empty access token", 502);
  }
  return token;
}

interface RawFirebaseRelease {
  name: string;
  displayVersion?: string;
  buildVersion?: string;
  releaseNotes?: { text?: string };
  createTime?: string;
  testingUri?: string;
  firebaseConsoleUri?: string;
}

function mapRelease(raw: RawFirebaseRelease): FirebaseRelease {
  return {
    id: raw.name,
    displayVersion: raw.displayVersion ?? "—",
    buildVersion: raw.buildVersion ?? "—",
    releaseNotes: raw.releaseNotes?.text ?? "",
    createTime: raw.createTime ?? "",
    testingUri: raw.testingUri ?? "",
    firebaseConsoleUri: raw.firebaseConsoleUri ?? "",
  };
}

export async function getFirebaseReleases(): Promise<FirebaseRelease[]> {
  const projectNumber = readRequiredEnv("FIREBASE_PROJECT_NUMBER");
  const appId = readRequiredEnv("FIREBASE_ANDROID_APP_ID");
  const serviceAccountPath = readRequiredEnv("FIREBASE_SERVICE_ACCOUNT_PATH");

  const token = await getAccessToken(serviceAccountPath);

  const url = `https://firebaseappdistribution.googleapis.com/v1/projects/${projectNumber}/apps/${appId}/releases`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });

  if (!res.ok) {
    const body = await res.text();
    throw new FirebaseDistributionApiError(
      `Firebase App Distribution API returned ${res.status}: ${body}`,
      res.status
    );
  }

  const data = (await res.json()) as { releases?: RawFirebaseRelease[] };
  const releases = (data.releases ?? []).map(mapRelease);

  releases.sort((a, b) => new Date(b.createTime).getTime() - new Date(a.createTime).getTime());

  return releases;
}
```

- [ ] **Step 2: Write the route handler**

Create `dps_webapp_backoffice/src/app/api/firebase-releases/route.ts`:

```ts
import { NextResponse } from "next/server";
import {
  FirebaseDistributionApiError,
  FirebaseDistributionConfigError,
  getFirebaseReleases,
} from "@/lib/firebase-distribution";

export async function GET() {
  try {
    const releases = await getFirebaseReleases();
    return NextResponse.json({ releases });
  } catch (err) {
    if (err instanceof FirebaseDistributionConfigError) {
      return NextResponse.json({ error: err.message }, { status: 500 });
    }
    if (err instanceof FirebaseDistributionApiError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json(
      { error: `Unexpected error: ${(err as Error).message}` },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 3: Start the dev server**

```bash
cd dps_webapp_backoffice
pnpm run dev
```

Expected: starts on port 3002 without compile errors.

- [ ] **Step 4: Verify the config-error path**

With `FIREBASE_PROJECT_NUMBER` or `FIREBASE_ANDROID_APP_ID` still blank in `.env` (or temporarily commented out), run:

```bash
curl -s http://localhost:3002/api/firebase-releases
```

Expected: HTTP 500 with a JSON body like `{"error":"Missing required environment variable: FIREBASE_PROJECT_NUMBER"}`.

- [ ] **Step 5: Verify the success path**

Fill in real values for all three env vars in `.env` (per Task 1 Step 4), restart the dev server, then run:

```bash
curl -s http://localhost:3002/api/firebase-releases | python3 -m json.tool
```

Expected: HTTP 200, a JSON body `{"releases": [...]}` with at least one entry (the release distributed during the earlier CI end-to-end test), each entry having a non-empty `testingUri` and `firebaseConsoleUri`.

- [ ] **Step 6: Commit**

```bash
git add dps_webapp_backoffice/src/lib/firebase-distribution.ts dps_webapp_backoffice/src/app/api/firebase-releases/route.ts
git commit -m "feat: add /api/firebase-releases endpoint for Firebase App Distribution history"
```

---

### Task 3: `FirebaseReleasesPanel` UI component

**Files:**
- Create: `dps_webapp_backoffice/src/components/ui/FirebaseReleasesPanel.tsx`

**Interfaces:**
- Consumes: `GET /api/firebase-releases` (from Task 2), response shape `{ releases: FirebaseRelease[] }` / `{ error: string }` exactly as defined in Task 2.
- Produces: a default-exportable-free named export `FirebaseReleasesPanel` (a React component, no props) for Task 4 to import as `import { FirebaseReleasesPanel } from "@/components/ui/FirebaseReleasesPanel"`.

- [ ] **Step 1: Write the component**

Create `dps_webapp_backoffice/src/components/ui/FirebaseReleasesPanel.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/inputs";

interface FirebaseRelease {
  id: string;
  displayVersion: string;
  buildVersion: string;
  releaseNotes: string;
  createTime: string;
  testingUri: string;
  firebaseConsoleUri: string;
}

function CopyIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
      />
    </svg>
  );
}

function ExternalLinkIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
      />
    </svg>
  );
}

export function FirebaseReleasesPanel() {
  const [releases, setReleases] = useState<FirebaseRelease[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    fetch("/api/firebase-releases")
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || `Request failed with status ${res.status}`);
        }
        if (!cancelled) setReleases(data.releases || []);
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const handleCopy = async (release: FirebaseRelease) => {
    try {
      await navigator.clipboard.writeText(release.testingUri);
      setCopiedId(release.id);
      setTimeout(() => {
        setCopiedId((current) => (current === release.id ? null : current));
      }, 1500);
    } catch {
      // Clipboard API unavailable (e.g. insecure context) - nothing further to do.
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl p-6">
      <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-1">
        Firebase Test Distribution
      </h2>
      <p className="text-slate-500 text-sm mb-4">
        Builds sent to the internal-testers group via GitHub Actions.
      </p>

      {isLoading && (
        <div className="flex justify-center py-8">
          <svg className="animate-spin h-6 w-6 text-brand-600" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        </div>
      )}

      {!isLoading && error && (
        <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-400 text-sm rounded-xl p-4">
          Couldn&apos;t reach Firebase App Distribution: {error}
        </div>
      )}

      {!isLoading && !error && releases.length === 0 && (
        <p className="text-slate-500 text-sm">No Firebase releases yet.</p>
      )}

      {!isLoading && !error && releases.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500 border-b border-slate-200 dark:border-slate-700">
                <th className="py-2 pr-4 font-medium">Version</th>
                <th className="py-2 pr-4 font-medium">Release Notes</th>
                <th className="py-2 pr-4 font-medium">Date</th>
                <th className="py-2 pr-4 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {releases.map((release) => (
                <tr key={release.id} className="border-b border-slate-100 dark:border-slate-800">
                  <td className="py-3 pr-4 text-slate-900 dark:text-white font-semibold">
                    {release.displayVersion} ({release.buildVersion})
                  </td>
                  <td className="py-3 pr-4 text-slate-600 dark:text-slate-400">
                    {release.releaseNotes || "—"}
                  </td>
                  <td className="py-3 pr-4 text-slate-600 dark:text-slate-400">
                    {release.createTime ? new Date(release.createTime).toLocaleString() : "—"}
                  </td>
                  <td className="py-3 pr-4">
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        className="!px-3 !py-1.5 text-xs"
                        onClick={() => handleCopy(release)}
                      >
                        <CopyIcon />
                        <span className="ml-1.5">{copiedId === release.id ? "Copied" : "Copy Link"}</span>
                      </Button>
                      <Button
                        as="a"
                        href={release.firebaseConsoleUri}
                        target="_blank"
                        variant="outline"
                        className="!px-3 !py-1.5 text-xs"
                      >
                        <ExternalLinkIcon />
                        <span className="ml-1.5">Open in Firebase</span>
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

```bash
cd dps_webapp_backoffice
pnpm exec tsc --noEmit
```

Expected: no errors referencing `FirebaseReleasesPanel.tsx`.

- [ ] **Step 3: Commit**

```bash
git add dps_webapp_backoffice/src/components/ui/FirebaseReleasesPanel.tsx
git commit -m "feat: add FirebaseReleasesPanel component"
```

---

### Task 4: Wire the panel into the Releases page

**Files:**
- Modify: `dps_webapp_backoffice/src/app/releases/page.tsx`

**Interfaces:**
- Consumes: `FirebaseReleasesPanel` component (from Task 3), imported as `import { FirebaseReleasesPanel } from "@/components/ui/FirebaseReleasesPanel"`.
- Produces: nothing further downstream (leaf task).

- [ ] **Step 1: Read the current file**

Read `dps_webapp_backoffice/src/app/releases/page.tsx` in full before editing (it's a "use client" page with existing Gate 2 assembly UI — do not restructure existing sections, only add).

- [ ] **Step 2: Add the import**

At the top of the file, alongside the existing imports:

```tsx
import { FirebaseReleasesPanel } from '@/components/ui/FirebaseReleasesPanel';
```

- [ ] **Step 3: Render the panel**

Insert `<FirebaseReleasesPanel />` as a new section immediately after the closing `</div>` of the "Approved Mini Apps List Table" section (the last section before the page's final closing `</div>`), so the page order is: header -> Gate 2 result card (conditional) -> Bundled Mini App Candidates table -> Firebase Test Distribution panel. For example, right before the final `</div>` that closes the page's outermost `<div className="w-full py-6 space-y-8">`:

```tsx
      </div>

      <FirebaseReleasesPanel />
    </div>
  );
}
```

(The exact surrounding whitespace/closing tags depend on the file as it exists at edit time — use the Edit tool's exact-match replacement against the real current content rather than guessing line numbers.)

- [ ] **Step 4: Type-check**

```bash
cd dps_webapp_backoffice
pnpm exec tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Manual browser verification**

With `pnpm run dev` running and all three Firebase env vars set to real values:
1. Open `http://localhost:3002/releases` in a browser.
2. Confirm the new "Firebase Test Distribution" card renders below the Bundled Mini App Candidates table, showing at least one release row.
3. Click **Copy Link**, then paste the clipboard contents somewhere (e.g. a new browser tab's address bar) and confirm it matches the release's `testingUri` from Task 2 Step 5's curl output, and that it leads to Firebase's tester sign-in flow.
4. Click **Open in Firebase**; confirm it opens that release in the Firebase console in a new tab.
5. Stop the dev server, temporarily rename/remove the `FIREBASE_ANDROID_APP_ID` value in `.env`, restart, reload the page, and confirm the panel shows the inline error banner while the rest of the page (header, mini apps table) still renders normally. Restore the real value afterward.

- [ ] **Step 6: Commit**

```bash
git add dps_webapp_backoffice/src/app/releases/page.tsx
git commit -m "feat: show Firebase App Distribution release history on the Releases page"
```

---

## Self-Review Notes

- **Spec coverage:** Architecture (Task 2), env vars (Task 1), UI table + Copy Link + Open in Firebase (Task 3/4), error handling at both the route and component level (Task 2 Steps 4/6, Task 4 Step 5), manual-only testing matching repo convention (every task) — all spec sections have a corresponding task.
- **Placeholder scan:** no TBD/TODO; every step has literal code or an exact command.
- **Type consistency:** `FirebaseRelease` interface fields (`id`, `displayVersion`, `buildVersion`, `releaseNotes`, `createTime`, `testingUri`, `firebaseConsoleUri`) are identical across Task 2's helper, Task 2's route response, and Task 3's component — checked field-by-field.
