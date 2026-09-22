import { Injectable, Logger } from '@nestjs/common';
import { SettingsService } from '../settings/settings.service';

@Injectable()
export class PipelinePacerService {
  private readonly logger = new Logger(PipelinePacerService.name);

  constructor(private readonly settingsService: SettingsService) {}

  private async sleep(ms: number): Promise<void> {
    if (ms <= 0) return;
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async paceValidationStart(appName?: string): Promise<void> {
    const timing = await this.settingsService.getPipelineTiming();
    if (!timing.enablePacing || timing.validationStartDelaySec <= 0) return;

    this.logger.log(
      `[Pacer] Pacing validation start for "${appName || 'Mini App'}" by ${timing.validationStartDelaySec}s...`,
    );
    await this.sleep(timing.validationStartDelaySec * 1000);
  }

  async paceSecurityScanStep(stepName?: string): Promise<void> {
    const timing = await this.settingsService.getPipelineTiming();
    if (!timing.enablePacing || timing.securityScanPacingSec <= 0) return;

    this.logger.debug(
      `[Pacer] Pacing security scan step "${stepName || 'check'}" by ${timing.securityScanPacingSec}s...`,
    );
    await this.sleep(timing.securityScanPacingSec * 1000);
  }

  async paceValidationPass(appName?: string): Promise<void> {
    const timing = await this.settingsService.getPipelineTiming();
    if (!timing.enablePacing || timing.validationPassDelaySec <= 0) return;

    this.logger.log(
      `[Pacer] Pacing validation completion alert for "${appName || 'Mini App'}" by ${timing.validationPassDelaySec}s...`,
    );
    await this.sleep(timing.validationPassDelaySec * 1000);
  }

  async paceBuildTrigger(appName?: string): Promise<void> {
    const timing = await this.settingsService.getPipelineTiming();
    if (!timing.enablePacing || timing.buildTriggerDelaySec <= 0) return;

    this.logger.log(
      `[Pacer] Pacing build trigger for "${appName || 'Mini App'}" by ${timing.buildTriggerDelaySec}s...`,
    );
    await this.sleep(timing.buildTriggerDelaySec * 1000);
  }
}
