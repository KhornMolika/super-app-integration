import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import {
  DetectGitProviderDto,
  GenerateGitSnippetDto,
  GitCommitsQueryDto,
  GitRepoQueryDto,
  ValidateGitPackageDto,
} from './dto/git-integration.dto';
import { GitIntegrationService } from './git-integration.service';

@Controller(['integrations/git', 'api/integrations/git'])
export class GitIntegrationController {
  constructor(private readonly gitService: GitIntegrationService) {}

  @Post('detect')
  @HttpCode(HttpStatus.OK)
  detect(@Body() dto: DetectGitProviderDto) {
    return this.gitService.detect(dto.url);
  }

  @Post('repository')
  @HttpCode(HttpStatus.OK)
  getRepository(@Body() dto: GitRepoQueryDto) {
    return this.gitService.getRepository(dto.url, dto.provider, dto.token);
  }

  @Post('branches')
  @HttpCode(HttpStatus.OK)
  getBranches(@Body() dto: GitRepoQueryDto) {
    return this.gitService.getBranches(dto.url, dto.provider, dto.token);
  }

  @Post('tags')
  @HttpCode(HttpStatus.OK)
  getTags(@Body() dto: GitRepoQueryDto) {
    return this.gitService.getTags(dto.url, dto.provider, dto.token);
  }

  @Post('commits')
  @HttpCode(HttpStatus.OK)
  getCommits(@Body() dto: GitCommitsQueryDto) {
    return this.gitService.getCommits(dto.url, dto.ref, dto.limit, dto.provider, dto.token);
  }

  @Post('validate')
  @HttpCode(HttpStatus.OK)
  validatePackage(@Body() dto: ValidateGitPackageDto) {
    return this.gitService.validatePackage(dto.url, dto.ref, dto.provider, dto.token, dto.path);
  }

  @Post('snippet')
  @HttpCode(HttpStatus.OK)
  generateSnippet(@Body() dto: GenerateGitSnippetDto) {
    return this.gitService.generateSnippet(dto);
  }

  @Post('resolve-sha')
  @HttpCode(HttpStatus.OK)
  resolveCommitSha(@Body() dto: { url: string; ref: string; provider?: any; token?: string }) {
    return this.gitService.resolveCommitSha(dto.url, dto.ref, dto.provider, dto.token);
  }

  @Post('auth-status')
  @HttpCode(HttpStatus.OK)
  getAuthStatus() {
    return this.gitService.getAuthStatus();
  }

  @Post('gitlab/authorize')
  @HttpCode(HttpStatus.OK)
  getGitLabAuthUrl(@Body() body: { state?: string }) {
    return { url: this.gitService.getGitLabAuthUrl(body?.state) };
  }

  @Post('gitlab/callback')
  @HttpCode(HttpStatus.OK)
  handleGitLabCallback(@Body() body: { code: string }) {
    return this.gitService.handleGitLabOAuthCallback(body.code);
  }
}
