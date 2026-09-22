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
