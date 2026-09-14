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
  conclusion:
    | "success"
    | "failure"
    | "cancelled"
    | "skipped"
    | "neutral"
    | "timed_out"
    | "action_required"
    | "stale"
    | null;
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
  // Superseded mini apps are deliberately repointed onto the same new PR number,
  // so callers commonly send the same PR number many times — dedupe to avoid
  // burning GitHub API quota on identical lookups.
  const prNumbers = [
    ...new Set(
      prNumbersParam
        .split(",")
        .map((n) => Number(n.trim()))
        .filter((n) => Number.isInteger(n) && n > 0)
    ),
  ];

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
