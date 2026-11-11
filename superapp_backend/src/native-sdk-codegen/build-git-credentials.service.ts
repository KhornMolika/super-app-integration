import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { MiniApp } from '../miniapps/entities/miniapp.entity';
import {
  extractDecryptedDeployKey,
  extractDecryptedGitToken,
} from '../miniapps/helpers/flutter-credential.helper';
import { gitSourceUrlOf, isGitSource, splitGitUrl } from '../integrations/flutter/git-source.util';
import { MANIFEST_STATUSES } from './native-sdk-codegen.service';

/** How the Super App build fetches one private mini app repository. */
export type BuildGitCredential =
  | { appId: string; repoUrl: string; host: string; path: string; type: 'ssh'; privateKey: string }
  | { appId: string; repoUrl: string; host: string; path: string; type: 'token'; token: string };

export interface BuildGitCredentials {
  credentials: BuildGitCredential[];
  /** Apps whose repository could not be set up, with the reason (no secrets). */
  skipped: { appId: string; reason: string }[];
}

/**
 * The Git credentials the Super App build (Jenkins) needs for `flutter pub get`:
 * one entry per Flutter source-code mini app that will be in the build and has a
 * private repository, with the key its developer registered (the same one the
 * security scan uses). repoUrl is exactly what the pubspec injector writes.
 *
 * Secrets are decrypted only here, for the callback-token endpoint; the build
 * keeps them in a temporary folder and never archives or uploads them.
 */
@Injectable()
export class BuildGitCredentialsService {
  constructor(
    @InjectRepository(MiniApp)
    private readonly miniappRepository: Repository<MiniApp>,
  ) {}

  async list(): Promise<BuildGitCredentials> {
    const apps = await this.miniappRepository.find({
      where: { integrationMethod: 'FLUTTER_PACKAGE', lifecycleStatus: In(MANIFEST_STATUSES) },
      order: { appId: 'ASC' },
    });
    const credentials: BuildGitCredential[] = [];
    const skipped: { appId: string; reason: string }[] = [];
    const seen = new Set<string>();

    for (const app of apps) {
      const cfg = (app.integrationConfig || {}) as Record<string, any>;
      if (!isGitSource(cfg)) continue;
      const repoUrl = gitSourceUrlOf(cfg)!;
      const isPrivate = cfg.isPrivateRepo === true || Boolean(cfg.deployKey) || Boolean(cfg.gitAccessToken || cfg.token);
      if (!isPrivate) continue;
      if (seen.has(repoUrl)) continue;

      const where = splitGitUrl(repoUrl);
      if (!where) {
        skipped.push({ appId: app.appId, reason: 'repository URL is not a supported Git URL' });
        continue;
      }
      const privateKey = extractDecryptedDeployKey(cfg as any).trim();
      const token = extractDecryptedGitToken(cfg as any).trim();
      if (privateKey && /-----BEGIN [A-Z ]*PRIVATE KEY-----/.test(privateKey)) {
        credentials.push({ appId: app.appId, repoUrl, ...where, type: 'ssh', privateKey: `${privateKey}\n` });
      } else if (token && /^[\x21-\x7e]+$/.test(token)) {
        credentials.push({ appId: app.appId, repoUrl, ...where, type: 'token', token });
      } else {
        skipped.push({ appId: app.appId, reason: 'private repository without a usable deploy key or access token' });
        continue;
      }
      seen.add(repoUrl);
    }
    return { credentials, skipped };
  }
}
