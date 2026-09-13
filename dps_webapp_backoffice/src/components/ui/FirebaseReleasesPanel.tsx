"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/inputs";
import type { FirebaseRelease } from "@/lib/firebase-distribution";

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
        const data = await res.json().catch(() => null);
        if (!res.ok) {
          throw new Error(data?.error || `Request failed with status ${res.status}`);
        }
        if (!cancelled) setReleases(data?.releases || []);
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
        Builds sent to the internal-testers group via GitHub Actions. Showing the 100 most recent.
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
                    {release.displayVersion || "—"} ({release.buildVersion || "—"})
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
                        disabled={!release.testingUri}
                      >
                        <CopyIcon />
                        <span className="ml-1.5">{copiedId === release.id ? "Copied" : "Copy Link"}</span>
                      </Button>
                      {release.firebaseConsoleUri ? (
                        <Button
                          as="a"
                          href={release.firebaseConsoleUri}
                          target="_blank"
                          rel="noreferrer"
                          variant="outline"
                          className="!px-3 !py-1.5 text-xs"
                        >
                          <ExternalLinkIcon />
                          <span className="ml-1.5">Open in Firebase</span>
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          className="!px-3 !py-1.5 text-xs"
                          disabled
                        >
                          <ExternalLinkIcon />
                          <span className="ml-1.5">Open in Firebase</span>
                        </Button>
                      )}
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
