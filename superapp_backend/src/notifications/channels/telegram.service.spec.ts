import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TelegramService } from './telegram.service';
import { User } from '../../access-control/entities/user.entity';
import { MiniApp } from '../../miniapps/entities/miniapp.entity';
import { SettingsService } from '../../settings/settings.service';
import { TelegramCardHelper } from './helpers/telegram-card.helper';
import { TelegramApiHelper } from './helpers/telegram-api.helper';
import { TelegramGroupHelper } from './helpers/telegram-group.helper';
import { TelegramUserHelper } from './helpers/telegram-user.helper';

describe('TelegramService & Helper Modules', () => {
  let service: TelegramService;
  let mockUserRepo: {
    findOne: jest.Mock;
    find: jest.Mock;
    save: jest.Mock;
  };
  let mockMiniAppRepo: {
    findOne: jest.Mock;
    find: jest.Mock;
    save: jest.Mock;
  };
  let mockSettingsService: {
    getSetting: jest.Mock;
    setSetting: jest.Mock;
    getPipelineTiming: jest.Mock;
  };

  const getUserRepo = () => mockUserRepo as unknown as Repository<User>;
  const getMiniAppRepo = () =>
    mockMiniAppRepo as unknown as Repository<MiniApp>;

  beforeEach(async () => {
    mockUserRepo = {
      findOne: jest.fn(),
      find: jest.fn().mockResolvedValue([]),
      save: jest.fn().mockImplementation((u) => Promise.resolve(u)),
    };

    mockMiniAppRepo = {
      findOne: jest.fn(),
      find: jest.fn().mockResolvedValue([]),
      save: jest.fn().mockImplementation((a) => Promise.resolve(a)),
    };

    mockSettingsService = {
      getSetting: jest.fn().mockResolvedValue([]),
      setSetting: jest.fn().mockResolvedValue(true),
      getPipelineTiming: jest
        .fn()
        .mockResolvedValue({ enableTelegramActionButtons: true }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TelegramService,
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepo,
        },
        {
          provide: getRepositoryToken(MiniApp),
          useValue: mockMiniAppRepo,
        },
        {
          provide: SettingsService,
          useValue: mockSettingsService,
        },
      ],
    }).compile();

    service = module.get<TelegramService>(TelegramService);
  });

  describe('TelegramCardHelper', () => {
    it('should generate rich card for MINIAPP_REGISTERED with portal buttons', () => {
      const { text, buttons } = TelegramCardHelper.buildRichCard(
        'Registration',
        'App Created',
        'MINIAPP_REGISTERED',
        'Demo MiniApp',
        { miniAppId: 'app-123', integrationMethod: 'FLUTTER_PACKAGE' },
        'http://localhost:3000',
      );

      expect(text).toContain('NEW MINI APP REGISTERED');
      expect(text).toContain('Demo MiniApp');
      expect(text).toContain('FLUTTER_PACKAGE');
      expect(buttons).toBeDefined();
      expect(buttons?.[0][0].url).toBe(
        'http://localhost:3000/miniapps/app-123',
      );
    });

    it('should generate rich card for TEST_BUILD_READY with download and sandbox buttons', () => {
      const { text, buttons } = TelegramCardHelper.buildRichCard(
        'Build Ready',
        'Artifact uploaded',
        'TEST_BUILD_READY',
        'Demo MiniApp',
        {
          miniAppId: 'app-123',
          version: 'v1.2.0',
          apkUrl: 'https://example.com/app.apk',
        },
        'http://localhost:3000',
      );

      expect(text).toContain('SUPER APP TEST BUILD READY');
      expect(text).toContain('v1.2.0');
      expect(buttons).toBeDefined();
      expect(buttons?.[0][0].text).toContain('Download Test APK');
      expect(buttons?.[0][0].url).toBe('https://example.com/app.apk');
      expect(buttons?.[0][1].text).toContain('Launch Sandbox');
    });

    it('should generate rich card for VALIDATION_FAILED with error details', () => {
      const { text, buttons } = TelegramCardHelper.buildRichCard(
        'Validation Failure',
        'SSRF vulnerability detected\nManifest missing icon',
        'VALIDATION_FAILED',
        'Banking MiniApp',
        { miniAppId: 'app-fail', score: 35 },
        'http://localhost:3000',
      );

      expect(text).toContain('VALIDATION FAILED');
      expect(text).toContain('35 / 100');
      expect(text).toContain('SSRF vulnerability detected');
      expect(buttons).toBeDefined();
      expect(buttons?.[0][0].text).toContain('Remediate Violations');
    });

    it('should format default headers correctly', () => {
      expect(TelegramCardHelper.formatHeader('SUCCESS')).toBe(
        'Operation Completed',
      );
      expect(TelegramCardHelper.formatHeader('ERROR')).toBe(
        'Alert: Error Occurred',
      );
      expect(TelegramCardHelper.formatHeader('WARNING')).toBe('Warning Notice');
      expect(TelegramCardHelper.formatHeader('UNKNOWN')).toBe(
        'Super App Notification',
      );
    });
  });

  describe('TelegramApiHelper', () => {
    it('should sanitize button URLs properly and fallback unresolvable URLs to deep links', () => {
      const rawButtons = [
        [
          { text: 'Valid Telegram', url: 'https://t.me/my_bot' },
          { text: 'Valid Domain', url: 'https://example.com/page' },
          { text: 'Invalid URL', url: 'invalid-url-string' },
        ],
      ];

      const sanitized = TelegramApiHelper.sanitizeButtons(
        rawButtons,
        'test_bot',
      );
      expect(sanitized[0][0].url).toBe('https://t.me/my_bot');
      expect(sanitized[0][1].url).toBe('https://example.com/page');
      expect(sanitized[0][2].url).toBe('https://t.me/test_bot');
    });
  });

  describe('TelegramUserHelper', () => {
    it('should link telegram account to user and call sendMessage', async () => {
      const user = { id: 'user-1', email: 'test@example.com', name: 'Tester' };
      mockUserRepo.findOne.mockResolvedValue(user);
      const mockSendMessage = jest.fn().mockResolvedValue(true);

      const result = await TelegramUserHelper.linkTelegramAccount(
        'user-1',
        '123456789',
        'tester_tg',
        'Tester',
        getUserRepo(),
        mockSendMessage,
      );

      expect(mockUserRepo.save).toHaveBeenCalled();
      expect(mockSendMessage).toHaveBeenCalledWith(
        expect.stringContaining('Telegram Connected'),
        '123456789',
      );
      expect(result?.telegramChatId).toBe('123456789');
      expect(result?.telegramUsername).toBe('tester_tg');
    });

    it('should unlink telegram account from user', async () => {
      const user = {
        id: 'user-1',
        telegramChatId: '123456789',
        telegramUsername: 'tester',
      };
      mockUserRepo.findOne.mockResolvedValue(user);

      const success = await TelegramUserHelper.unlinkTelegramAccount(
        'user-1',
        getUserRepo(),
      );
      expect(success).toBe(true);
      expect(user.telegramChatId).toBeUndefined();
      expect(user.telegramUsername).toBeUndefined();
      expect(mockUserRepo.save).toHaveBeenCalledWith(user);
    });

    it('should save user team chat ID', async () => {
      const user = { id: 'user-1' } as unknown as User;
      mockUserRepo.findOne.mockResolvedValue(user);

      const updated = await TelegramUserHelper.saveUserTeamChatId(
        'user-1',
        '-100999888',
        getUserRepo(),
      );
      expect(updated?.teamTelegramChatId).toBe('-100999888');
      expect(mockUserRepo.save).toHaveBeenCalledWith(user);
    });
  });

  describe('TelegramGroupHelper', () => {
    it('should reassign old group ID to new group ID across mini apps', async () => {
      const apps = [
        { id: 'app-1', name: 'App 1', teamTelegramChatId: '-100111,-100222' },
        { id: 'app-2', name: 'App 2', teamTelegramChatId: '-100333' },
      ];
      mockMiniAppRepo.find.mockResolvedValue(apps);

      const res = await TelegramGroupHelper.reassignTelegramGroup(
        '-100111',
        '-100999',
        undefined,
        getUserRepo(),
        getMiniAppRepo(),
      );

      expect(res.success).toBe(true);
      expect(res.updatedCount).toBe(1);
      expect(apps[0].teamTelegramChatId).toBe('-100999,-100222');
      expect(mockMiniAppRepo.save).toHaveBeenCalledWith(apps[0]);
    });

    it('should assign a mini app to a specific group', async () => {
      const app = {
        id: '00000000-0000-0000-0000-000000000001',
        name: 'Payment App',
        teamTelegramChatId: null,
      };
      mockMiniAppRepo.findOne.mockResolvedValue(app);

      const res = await TelegramGroupHelper.assignMiniAppToGroup(
        '00000000-0000-0000-0000-000000000001',
        '-100555666',
        undefined,
        getUserRepo(),
        getMiniAppRepo(),
      );

      expect(res.success).toBe(true);
      expect(app.teamTelegramChatId).toBe('-100555666');
      expect(mockMiniAppRepo.save).toHaveBeenCalledWith(app);
    });

    it('should cleanup inactive groups and migrate to live group', async () => {
      const userGroups = [
        {
          id: '-100live',
          title: 'Live Channel',
          type: 'group',
          isLive: true,
          isDefaultProfileChat: true,
          associatedWith: [],
        },
        {
          id: '-100dead',
          title: 'Dead Channel',
          type: 'group',
          isLive: false,
          associatedWith: [],
        },
      ];

      const mockReassign = jest.fn().mockResolvedValue({
        success: true,
        updatedCount: 2,
        message: 'Migrated',
      });

      const res = await TelegramGroupHelper.cleanupInactiveGroups(
        userGroups,
        mockReassign,
        'user-1',
        '-100default',
      );

      expect(res.success).toBe(true);
      expect(mockReassign).toHaveBeenCalledWith(
        '-100dead',
        '-100live',
        'user-1',
      );
      expect(res.cleanedCount).toBe(2);
    });
  });

  describe('TelegramService Facade', () => {
    it('should generate deep link and add group URLs with bot username', () => {
      const deepLink = service.getDeepLinkUrl('user-123');
      expect(deepLink).toContain('start=user-123');

      const addGroupUrl = service.getAddGroupUrl('custom');
      expect(addGroupUrl).toContain('startgroup=custom');
    });

    it('should return bot info', () => {
      const info = service.getBotInfo();
      expect(info).toHaveProperty('isEnabled');
      expect(info).toHaveProperty('botUsername');
      expect(info).toHaveProperty('hasDefaultChat');
    });
  });
});
