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
}
