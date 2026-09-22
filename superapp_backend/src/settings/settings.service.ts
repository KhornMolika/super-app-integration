import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SystemSetting } from './entities/system-setting.entity';

export interface PipelineTimingSettings {
  preset: 'instant' | 'realistic' | 'demo' | 'custom';
  validationStartDelaySec: number;
  securityScanPacingSec: number;
  validationPassDelaySec: number;
  buildTriggerDelaySec: number;
  enablePacing: boolean;
  telegramStyle: 'rich_cards' | 'compact';
  enableTelegramActionButtons: boolean;
}

export const DEFAULT_PIPELINE_TIMING: PipelineTimingSettings = {
  preset: 'realistic',
  validationStartDelaySec: 2,
  securityScanPacingSec: 2,
  validationPassDelaySec: 3,
  buildTriggerDelaySec: 2,
  enablePacing: true,
  telegramStyle: 'rich_cards',
  enableTelegramActionButtons: true,
};

@Injectable()
export class SettingsService implements OnModuleInit {
  private readonly logger = new Logger(SettingsService.name);
  private cachedPipelineTiming: PipelineTimingSettings = { ...DEFAULT_PIPELINE_TIMING };

  constructor(
    @InjectRepository(SystemSetting)
    private readonly settingsRepo: Repository<SystemSetting>,
  ) {}

  async onModuleInit() {
    await this.loadPipelineTiming();
  }

  async getSetting<T = any>(key: string, defaultValue?: T): Promise<T> {
    const record = await this.settingsRepo.findOne({ where: { key } });
    if (!record) {
      return defaultValue as T;
    }
    return record.value as T;
  }

  async setSetting(key: string, value: any, description?: string): Promise<SystemSetting> {
    let record = await this.settingsRepo.findOne({ where: { key } });
    if (!record) {
      record = this.settingsRepo.create({ key, value, description });
    } else {
      record.value = value;
      if (description !== undefined) {
        record.description = description;
      }
    }
    const saved = await this.settingsRepo.save(record);
    if (key === 'pipeline_timing') {
      this.cachedPipelineTiming = { ...DEFAULT_PIPELINE_TIMING, ...value };
    }
    return saved;
  }

  async getPipelineTiming(): Promise<PipelineTimingSettings> {
    if (!this.cachedPipelineTiming) {
      await this.loadPipelineTiming();
    }
    return this.cachedPipelineTiming;
  }

  async updatePipelineTiming(settings: Partial<PipelineTimingSettings>): Promise<PipelineTimingSettings> {
    const current = await this.getPipelineTiming();
    const updated: PipelineTimingSettings = {
      ...current,
      ...settings,
    };

    // Auto calculate preset if numeric values differ from known presets
    if (!settings.preset) {
      if (
        updated.validationStartDelaySec === 0 &&
        updated.validationPassDelaySec === 0 &&
        updated.buildTriggerDelaySec === 0
      ) {
        updated.preset = 'instant';
      } else if (
        updated.validationStartDelaySec === 2 &&
        updated.validationPassDelaySec === 3 &&
        updated.buildTriggerDelaySec === 2
      ) {
        updated.preset = 'realistic';
      } else if (
        updated.validationStartDelaySec === 5 &&
        updated.validationPassDelaySec === 5 &&
        updated.buildTriggerDelaySec === 5
      ) {
        updated.preset = 'demo';
      } else {
        updated.preset = 'custom';
      }
    }

    await this.setSetting(
      'pipeline_timing',
      updated,
      'Pipeline automation pacing and duration settings in seconds',
    );
    this.cachedPipelineTiming = updated;
    this.logger.log(`Pipeline timing updated: preset=${updated.preset}, startDelay=${updated.validationStartDelaySec}s, passDelay=${updated.validationPassDelaySec}s, buildDelay=${updated.buildTriggerDelaySec}s`);
    return updated;
  }

  private async loadPipelineTiming() {
    try {
      const stored = await this.settingsRepo.findOne({ where: { key: 'pipeline_timing' } });
      if (stored && stored.value) {
        this.cachedPipelineTiming = { ...DEFAULT_PIPELINE_TIMING, ...stored.value };
      } else {
        this.cachedPipelineTiming = { ...DEFAULT_PIPELINE_TIMING };
        await this.settingsRepo.save(
          this.settingsRepo.create({
            key: 'pipeline_timing',
            value: DEFAULT_PIPELINE_TIMING,
            description: 'Pipeline automation pacing and duration settings in seconds',
          }),
        );
      }
    } catch (err: any) {
      this.logger.warn(`Could not load pipeline timing from DB: ${err.message}. Using default in-memory.`);
      this.cachedPipelineTiming = { ...DEFAULT_PIPELINE_TIMING };
    }
  }
}
