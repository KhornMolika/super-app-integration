import {
  BadRequestException,
  Controller,
  ForbiddenException,
  Get,
  Header,
  Logger,
  NotFoundException,
  Optional,
  Param,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Response } from 'express';
import { Repository } from 'typeorm';
import { BypassTransform } from '../../common/decorators/bypass-transform.decorator';
import { isPgUuid } from '../../common/utils/uuid.util';
import { MiniApp } from '../../miniapps/entities/miniapp.entity';
import {
  extractDecryptedDeployKey,
  extractDecryptedGitToken,
} from '../../miniapps/helpers/flutter-credential.helper';
import { StorageService } from '../../storage/storage.service';
import { scanSourceOf } from '../flutter/git-source.util';
import { GitIntegrationService } from '../git/git-integration.service';
import { CallbackTokenGuard } from '../release-assembly/callback-token.guard';
import { scanConfigOf, verifyScanTicket } from './scan-source-ticket';

/** How the scan pipeline clones a Git source. Secrets only here, never as Jenkins parameters. */
export interface ScanGitAccess {
  repoUrl: string;
  ref: string;
  /** Folder of the package inside the repository ('' = the root) */
  path: string;
  auth: 'none' | 'ssh' | 'token';
  privateKey?: string;
  token?: string;
}

/**
 * The source a security scan reads, for the Jenkins scan pipeline. Each call
 * needs the Jenkins callback token AND the ticket the backend put in that scan's
 * parameters, which is bound to one mini app and expires.
 */
@Controller(['integrations/validation/scan-source', 'api/integrations/validation/scan-source'])
@UseGuards(CallbackTokenGuard)
export class ScanSourceController {
  private readonly logger = new Logger(ScanSourceController.name);

  constructor(
    @InjectRepository(MiniApp)
    private readonly miniappRepository: Repository<MiniApp>,
    @Optional() private readonly storageService?: StorageService,
    @Optional() private readonly gitService?: GitIntegrationService,
  ) {}

  private async load(miniAppId: string, ticket?: string) {
    if (!isPgUuid(miniAppId)) throw new BadRequestException('Invalid mini app id');
    const scope = verifyScanTicket(miniAppId, ticket);
    if (!scope) throw new ForbiddenException('Scan ticket is missing, invalid or expired');
    const app = await this.miniappRepository.findOne({ where: { id: miniAppId } });
    if (!app) throw new NotFoundException('Mini app not found');
    const cfg = scanConfigOf(app, scope);
    return { app, cfg, source: scanSourceOf(cfg) };
  }

  /** The uploaded package archive (.zip), streamed from MinIO quarantine. */
  @Get(':miniAppId/archive')
  @BypassTransform()
  @Header('Cache-Control', 'no-store')
  async archive(@Param('miniAppId') miniAppId: string, @Query('ticket') ticket: string, @Res() res: Response) {
    const { source } = await this.load(miniAppId, ticket);
    if (source.integrationType !== 'ARTIFACT' || !source.sourceStoragePath) {
      throw new NotFoundException('This mini app has no uploaded package archive');
    }
    if (!this.storageService) throw new NotFoundException('MinIO storage is not configured');
    let archive: Buffer | null = null;
    try {
      archive = await this.storageService.getObjectBuffer(this.storageService.packageSubmissionsBucket, source.sourceStoragePath);
    } catch (err: any) {
      this.logger.warn(`Scan source ${miniAppId}: cannot read ${source.sourceStoragePath}: ${err?.message || err}`);
    }
    if (!archive || archive.length === 0) throw new NotFoundException(`Package archive not found in MinIO (${source.sourceStoragePath})`);
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Length', String(archive.length));
    res.setHeader('X-Source-Path', source.sourceStoragePath);
    res.end(archive);
  }

  /** Where to clone a Git source and with which credential (private repositories). */
  @Get(':miniAppId/git')
  @BypassTransform()
  @Header('Cache-Control', 'no-store')
  async git(@Param('miniAppId') miniAppId: string, @Query('ticket') ticket: string): Promise<ScanGitAccess> {
    const { cfg, source } = await this.load(miniAppId, ticket);
    if (source.integrationType !== 'SOURCE_CODE' || !source.repoUrl) {
      throw new NotFoundException('This mini app is not built from a Git repository');
    }
    const path = String(cfg.gitPath || cfg.packagePath || '').trim().replace(/^\.\/|\/+$/g, '');
    if (path && (!/^[A-Za-z0-9._-]+(\/[A-Za-z0-9._-]+)*$/.test(path) || path.split('/').includes('..'))) {
      throw new BadRequestException('The package path inside the repository is not valid');
    }
    const access: ScanGitAccess = { repoUrl: source.repoUrl, ref: source.commitSha, path, auth: 'none' };
    const isPrivate = cfg.isPrivateRepo === true || Boolean(cfg.deployKey) || Boolean(cfg.gitAccessToken || cfg.token);
    if (!isPrivate) return access;

    const token = extractDecryptedGitToken(cfg as any).trim();
    // The app's own deploy key; the platform key only as the last resort (as before)
    const key =
      extractDecryptedDeployKey(cfg as any).trim() ||
      (cfg.authMethod !== 'token' ? (this.gitService?.getDeployPrivateKey() || '').trim() : '');
    if (cfg.authMethod === 'token' && token) return { ...access, auth: 'token', token };
    if (key && /-----BEGIN [A-Z ]*PRIVATE KEY-----/.test(key)) return { ...access, auth: 'ssh', privateKey: `${key}\n` };
    if (token) return { ...access, auth: 'token', token };
    throw new NotFoundException('Private repository without a usable deploy key or access token');
  }
}
