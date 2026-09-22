import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MiniApp } from '../miniapps/entities/miniapp.entity';
import { GitLabProvider } from '../integrations/git/providers/gitlab.provider';

export interface OpenMrResult {
  status: 'no_changes' | 'skipped' | 'opened';
  /**
   * GitLab merge request web_url. The field keeps its historical `prUrl` name
   * (stored as MiniApp.integrationConfig.codegenPrUrl) to avoid a data
   * migration; it now holds a GitLab MR URL.
   */
  prUrl?: string;
  mrIid?: number;
  supersededMrIids?: number[];
}

const CODEGEN_BRANCH_PREFIX = 'codegen/native-sdk-';
const CODEGEN_LABEL = 'native-sdk-codegen';
const MAX_ERROR_BODY = 500;

@Injectable()
export class GitlabMrService {
  private readonly logger = new Logger(GitlabMrService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly gitlabProvider: GitLabProvider,
    @InjectRepository(MiniApp)
    private readonly miniappRepository: Repository<MiniApp>,
  ) {}

  /** CODEGEN_AUTO_MR (alias) or CODEGEN_AUTO_PR: true/1, case-insensitive. */
  isEnabled(): boolean {
    return ['CODEGEN_AUTO_MR', 'CODEGEN_AUTO_PR'].some((key) =>
      ['true', '1'].includes(
        String(this.configService.get<string>(key) ?? '')
          .trim()
          .toLowerCase(),
      ),
    );
  }

  private repoSlug(): string {
    const slug = this.configService.get<string>('CODEGEN_REPO_SLUG');
    if (!slug) {
      throw new Error(
        'CODEGEN_REPO_SLUG must be set to open a merge request (GitLab group/project path)',
      );
    }
    return slug;
  }

  private baseBranch(): string {
    return this.configService.get<string>('CODEGEN_BASE_BRANCH') || 'main';
  }

  private token(): string {
    const token = this.configService.get<string>('GITLAB_TOKEN');
    if (!token) {
      throw new Error(
        'GITLAB_TOKEN must be set (scope: api) to open a codegen merge request',
      );
    }
    return token;
  }

  /** Never includes the token in logs or errors. */
  private async gitlabFetch<T>(
    slug: string,
    path: string,
    init?: RequestInit,
  ): Promise<T> {
    const url = `${this.gitlabProvider.getProjectApiUrl(slug)}${path}`;
    const res = await fetch(url, {
      ...init,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'User-Agent': 'FSA-SuperApp-Manager',
        'PRIVATE-TOKEN': this.token(),
      },
    });
    if (!res.ok) {
      const body = (await res.text()).slice(0, MAX_ERROR_BODY);
      const route = path.split('?')[0];
      this.logger.error(
        `GitLab API ${init?.method ?? 'GET'} ${route} failed (${res.status}): ${body}`,
      );
      throw new Error(`GitLab API error on ${route} (${res.status})`);
    }
    return res.json() as Promise<T>;
  }

  /**
   * Creates a branch, ONE commit and an MR for the changed files (paths
   * relative to the repo root) through the GitLab API, then closes any other
   * open codegen MR against the same target branch: regeneration always covers
   * every currently-approved vendor, so the newest MR supersedes older ones.
   *
   * All changed files were read from the base commit by the orchestrator (a
   * missing file makes that read fail), so every action is an 'update'.
   */
  async openMrForChanges(
    changedFiles: Map<string, string>,
    /** Commit the files were rendered against; defaults to the base branch head. */
    baseCommitSha?: string,
  ): Promise<OpenMrResult> {
    if (changedFiles.size === 0) {
      return { status: 'no_changes' };
    }
    if (!this.isEnabled()) {
      this.logger.log(
        `CODEGEN_AUTO_MR/CODEGEN_AUTO_PR is not enabled (true/1) — leaving ${changedFiles.size} regenerated file(s) unopened`,
      );
      return { status: 'skipped' };
    }

    const slug = this.repoSlug();
    const base = this.baseBranch();
    this.token(); // fail early with a clear message before any call

    const baseSha =
      baseCommitSha ??
      (
        await this.gitlabFetch<{ commit: { id: string } }>(
          slug,
          `/repository/branches/${encodeURIComponent(base)}`,
        )
      ).commit.id;

    const branch = `${CODEGEN_BRANCH_PREFIX}${Date.now()}`;
    await this.gitlabFetch(
      slug,
      `/repository/branches?branch=${encodeURIComponent(branch)}&ref=${encodeURIComponent(baseSha)}`,
      { method: 'POST' },
    );

    await this.gitlabFetch(slug, '/repository/commits', {
      method: 'POST',
      body: JSON.stringify({
        branch,
        commit_message: 'chore(codegen): regenerate native SDK glue',
        actions: Array.from(changedFiles, ([file_path, content]) => ({
          action: 'update',
          file_path,
          content,
        })),
      }),
    });

    const mr = await this.gitlabFetch<{ web_url: string; iid: number }>(
      slug,
      '/merge_requests',
      {
        method: 'POST',
        body: JSON.stringify({
          source_branch: branch,
          target_branch: base,
          title: 'Regenerate native SDK glue',
          description: [
            'Generated by the Native SDK codegen (mini-app approval).',
            '',
            'Review before merging:',
            '- vendor deployment target / minSdk compatibility',
            '- declared permissions (iOS Info.plist strings do not auto-merge)',
            '',
            'Files changed:',
            ...Array.from(changedFiles.keys()).map((f) => `- \`${f}\``),
          ].join('\n'),
          labels: CODEGEN_LABEL,
          remove_source_branch: true,
        }),
      },
    );

    const supersededMrIids = await this.closeSupersededMrs(
      slug,
      base,
      mr.web_url,
      mr.iid,
    );

    this.logger.log(`Opened merge request ${mr.web_url}`);
    return {
      status: 'opened',
      prUrl: mr.web_url,
      mrIid: mr.iid,
      supersededMrIids,
    };
  }

  private async closeSupersededMrs(
    slug: string,
    base: string,
    newMrUrl: string,
    newMrIid: number,
  ): Promise<number[]> {
    const closed: number[] = [];
    let openMrs: { iid: number; source_branch: string }[];
    try {
      openMrs = await this.gitlabFetch<
        { iid: number; source_branch: string }[]
      >(
        slug,
        `/merge_requests?state=opened&labels=${CODEGEN_LABEL}&target_branch=${encodeURIComponent(base)}&per_page=100`,
      );
    } catch (err) {
      this.logger.error(
        `Failed to list open MRs while checking for superseded codegen MRs: ${err}`,
      );
      return closed;
    }

    const superseded = openMrs.filter(
      (m) =>
        m.iid !== newMrIid && m.source_branch.startsWith(CODEGEN_BRANCH_PREFIX),
    );

    for (const old of superseded) {
      try {
        await this.gitlabFetch(slug, `/merge_requests/${old.iid}/notes`, {
          method: 'POST',
          body: JSON.stringify({
            body: `Superseded by a newer native SDK codegen run: ${newMrUrl}`,
          }),
        });
        await this.gitlabFetch(slug, `/merge_requests/${old.iid}`, {
          method: 'PUT',
          body: JSON.stringify({ state_event: 'close' }),
        });
        closed.push(old.iid);
        await this.repointSupersededApps(old.iid, newMrUrl);
      } catch (err) {
        this.logger.error(
          `Failed to close superseded codegen MR !${old.iid}: ${err}`,
        );
      }
    }

    return closed;
  }

  /**
   * A mini app's integrationConfig.codegenPrUrl (now a GitLab MR URL) can point
   * at an MR that was just closed as superseded. Repoint those apps at the new
   * MR, which contains their code too.
   */
  private async repointSupersededApps(
    oldMrIid: number,
    newMrUrl: string,
  ): Promise<void> {
    try {
      const apps = await this.miniappRepository.find({
        where: { integrationMethod: 'NATIVE_SDK' } as any,
      });
      const affected = apps.filter((app) =>
        String(app.integrationConfig?.codegenPrUrl ?? '').endsWith(
          `/merge_requests/${oldMrIid}`,
        ),
      );
      for (const app of affected) {
        app.integrationConfig = {
          ...app.integrationConfig,
          codegenPrUrl: newMrUrl,
        };
        await this.miniappRepository.save(app);
      }
      if (affected.length > 0) {
        this.logger.log(
          `Repointed ${affected.length} mini app(s) from superseded MR !${oldMrIid} to ${newMrUrl}`,
        );
      }
    } catch (err) {
      this.logger.error(
        `Failed to repoint mini apps from superseded MR !${oldMrIid}: ${err}`,
      );
    }
  }
}
