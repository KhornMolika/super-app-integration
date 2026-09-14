"use client";

import { useCallback, useEffect, useState } from "react";
import type { FirebaseRelease } from "@/lib/firebase-distribution";
import { matchReleaseToPr, type CodegenPipelineEntry, type GithubPrStatus } from "@/lib/codegen-pipeline";

interface UseCodegenPipelineStatusResult {
  data: CodegenPipelineEntry[];
  loading: boolean;
  error: string | null;
  rateLimited: boolean;
  /**
   * Set when /api/firebase-releases itself failed. The PR/Build stages stay
   * usable (they don't depend on Firebase); the UI uses this to show the
   * Release stage as "unknown" rather than a misleading "not yet".
   */
  releasesError: string | null;
  refresh: () => void;
}

export function useCodegenPipelineStatus(prNumbers: number[]): UseCodegenPipelineStatusResult {
  const [data, setData] = useState<CodegenPipelineEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rateLimited, setRateLimited] = useState(false);
  const [releasesError, setReleasesError] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);

  const key = prNumbers.join(",");
  const refresh = useCallback(() => setRefreshToken((t) => t + 1), []);

  useEffect(() => {
    if (!key) {
      setData([]);
      setLoading(false);
      setError(null);
      setRateLimited(false);
      setReleasesError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);
    setRateLimited(false);
    setReleasesError(null);

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

          // A Firebase-releases failure must not blank out the PR/Build stages,
          // so surface it as a separate flag instead of throwing.
          if (releaseData.error) setReleasesError(releaseData.error);

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

  return { data, loading, error, rateLimited, releasesError, refresh };
}
