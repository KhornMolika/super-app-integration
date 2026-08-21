import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { GitIntegrationService } from './git-integration.service';
import { GitHubProvider } from './providers/github.provider';
import { GitLabProvider } from './providers/gitlab.provider';

describe('GitIntegrationService & Providers', () => {
  let service: GitIntegrationService;
  let githubProvider: GitHubProvider;
  let gitlabProvider: GitLabProvider;

  const mockConfig: Record<string, string> = {
    GIT_PROVIDER: 'github',
    GITHUB_BASE_URL: 'https://api.github.com',
    GITHUB_TOKEN: 'mock-gh-token',
    GITLAB_BASE_URL: 'https://gitlab.company.com',
    GITLAB_TOKEN: 'mock-gl-token',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GitIntegrationService,
        GitHubProvider,
        GitLabProvider,
        {
          provide: ConfigService,
          useValue: {
            get: (key: string) => mockConfig[key],
          },
        },
      ],
    }).compile();

    service = module.get<GitIntegrationService>(GitIntegrationService);
    githubProvider = module.get<GitHubProvider>(GitHubProvider);
    gitlabProvider = module.get<GitLabProvider>(GitLabProvider);
  });

  describe('URL Auto-Detection', () => {
    it('should auto-detect GitHub HTTPS URL', () => {
      const result = service.detect('https://github.com/company/payment-miniapp.git');
      expect(result.provider).toBe('github');
      expect(result.parsed.owner).toBe('company');
      expect(result.parsed.repo).toBe('payment-miniapp');
      expect(result.parsed.fullName).toBe('company/payment-miniapp');
    });

    it('should auto-detect GitHub SSH URL', () => {
      const result = service.detect('git@github.com:myorg/superapp_core.git');
      expect(result.provider).toBe('github');
      expect(result.parsed.owner).toBe('myorg');
      expect(result.parsed.repo).toBe('superapp_core');
    });

    it('should auto-detect GitHub short slug', () => {
      const result = service.detect('flutter/flutter');
      expect(result.provider).toBe('github');
      expect(result.parsed.owner).toBe('flutter');
      expect(result.parsed.repo).toBe('flutter');
    });

    it('should auto-detect GitLab HTTPS URL with nested namespaces', () => {
      const result = service.detect('https://gitlab.company.com/mobile/banking/payment-miniapp.git');
      expect(result.provider).toBe('gitlab');
      expect(result.parsed.owner).toBe('mobile/banking');
      expect(result.parsed.repo).toBe('payment-miniapp');
      expect(result.parsed.fullName).toBe('mobile/banking/payment-miniapp');
    });

    it('should auto-detect GitLab.com URL', () => {
      const result = service.detect('https://gitlab.com/enterprise/job-miniapp');
      expect(result.provider).toBe('gitlab');
      expect(result.parsed.owner).toBe('enterprise');
      expect(result.parsed.repo).toBe('job-miniapp');
    });

    it('should allow explicit provider override', () => {
      const result = service.detect('https://custom-git.internal/org/repo.git', 'gitlab');
      expect(result.provider).toBe('gitlab');
    });
  });

  describe('Snippet Generation', () => {
    it('should generate valid GitHub tag dependency snippet', () => {
      const { snippet, provider } = service.generateSnippet({
        url: 'https://github.com/company/payment-miniapp.git',
        ref: 'v1.0.0',
        refType: 'tag',
        packageName: 'payment_miniapp',
      });

      expect(provider).toBe('github');
      expect(snippet).toContain('payment_miniapp:');
      expect(snippet).toContain('git:');
      expect(snippet).toContain('url: https://github.com/company/payment-miniapp.git');
      expect(snippet).toContain('ref: v1.0.0');
    });

    it('should generate valid GitLab commit SHA dependency snippet', () => {
      const { snippet, provider } = service.generateSnippet({
        url: 'https://gitlab.company.com/mobile/payment-miniapp.git',
        ref: 'a1b2c3d4e5f6',
        refType: 'commit',
        packageName: 'payment_miniapp',
      });

      expect(provider).toBe('gitlab');
      expect(snippet).toContain('payment_miniapp:');
      expect(snippet).toContain('git:');
      expect(snippet).toContain('url: https://gitlab.company.com/mobile/payment-miniapp.git');
      expect(snippet).toContain('ref: a1b2c3d4e5f6');
    });

    it('should support monorepo path in dependency snippet', () => {
      const { snippet } = service.generateSnippet({
        url: 'https://github.com/company/miniapps-monorepo.git',
        ref: 'v2.1.0',
        path: 'packages/payment_miniapp',
        packageName: 'payment_miniapp',
      });

      expect(snippet).toContain('path: packages/payment_miniapp');
    });
  });
});
