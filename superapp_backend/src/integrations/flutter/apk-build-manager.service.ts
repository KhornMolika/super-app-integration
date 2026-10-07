import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as child_process from 'child_process';

import { MiniApp } from '../../miniapps/entities/miniapp.entity';
import { extractDecryptedDeployKey } from '../../miniapps/helpers/flutter-credential.helper';
import { NotificationsService } from '../../notifications/notifications.service';
import { getLocalIpAddress, resolveMobileApiBaseUrl } from '../../common/utils/network.utils';

export type ApkBuildState = 'IDLE' | 'QUEUED' | 'BUILDING' | 'SUCCESS' | 'FAILED';

export interface ApkBuildStatus {
  state: ApkBuildState;
  releaseVersion?: string;
  lastBuildTime?: string;
  durationMs?: number;
  exitCode?: number;
  message: string;
  recentLogs: string[];
}

@Injectable()
export class ApkBuildManagerService {
  private readonly logger = new Logger(ApkBuildManagerService.name);

  private state: ApkBuildState = 'IDLE';
  private releaseVersion?: string;
  private lastBuildTime?: string;
  private durationMs?: number;
  private exitCode?: number;
  private message: string = 'APK build idle.';
  private readonly logBuffer: string[] = [];
  private currentProcess?: child_process.ChildProcess;
  private lastBuildStartTime?: number;
  private activeBuildPromise?: Promise<{ success: boolean; message: string; apkUrl?: string }>;

  constructor(
    @InjectRepository(MiniApp)
    private readonly miniappRepository: Repository<MiniApp>,
    private readonly notificationsService: NotificationsService,
  ) {}

  private appendLog(line: string) {
    const timestamp = new Date().toISOString().substring(11, 19);
    const formatted = `[${timestamp}] ${line.trim()}`;
    this.logBuffer.push(formatted);
    if (this.logBuffer.length > 250) {
      this.logBuffer.shift();
    }
  }

  getStatus(): ApkBuildStatus {
    if (this.state === 'BUILDING' && this.lastBuildStartTime && Date.now() - this.lastBuildStartTime > 600000) {
      this.state = 'FAILED';
      this.message = 'APK build operation timed out after 10 minutes.';
      this.appendLog(`⚠️ ${this.message}`);
    }

    return {
      state: this.state,
      releaseVersion: this.releaseVersion,
      lastBuildTime: this.lastBuildTime,
      durationMs: this.durationMs,
      exitCode: this.exitCode,
      message: this.message,
      recentLogs: [...this.logBuffer],
    };
  }

  /**
   * Compiles the size-optimized Super App Android APK locally and uploads it to Nexus repository.
   */
  async triggerBuild(options: {
    releaseVersion: string;
    buildType?: string;
    appName?: string;
    apiBaseUrl?: string;
  }): Promise<{ success: boolean; message: string; apkUrl?: string }> {
    const releaseVersion = options.releaseVersion || 'v0.0.1';
    const defaultBuildType = process.env.SUPERAPP_TEST_APK_BUILD_MODE || 'release';
    const buildType = options.buildType || defaultBuildType;
    const appName = options.appName || 'superapp';
    const apiBaseUrl = resolveMobileApiBaseUrl(options.apiBaseUrl);

    if (this.state === 'BUILDING') {
      if (this.activeBuildPromise && (!options.releaseVersion || options.releaseVersion === this.releaseVersion)) {
        this.logger.log(`Attaching caller to in-progress APK build for version ${this.releaseVersion}...`);
        this.appendLog(`Attaching caller to in-progress APK build for version ${this.releaseVersion}...`);
        return this.activeBuildPromise;
      }
      return {
        success: false,
        message: `An APK build is already in progress for version ${this.releaseVersion}.`,
      };
    }

    this.state = 'BUILDING';
    this.releaseVersion = releaseVersion;
    this.lastBuildStartTime = Date.now();
    this.exitCode = undefined;
    this.message = `Compiling Super App APK (${releaseVersion}, ${buildType})...`;
    this.appendLog(`=== Super App APK Build Started for ${releaseVersion} (${buildType}) ===`);

    const candidates = [
      path.resolve(process.cwd(), 'scripts/build-optimized-apk.ps1'),
      path.resolve(process.cwd(), 'superapp_backend/scripts/build-optimized-apk.ps1'),
      path.resolve(__dirname, '../../../scripts/build-optimized-apk.ps1'),
      path.resolve(process.cwd(), '../superapp_backend/scripts/build-optimized-apk.ps1'),
    ];
    const resolvedScript = candidates.find((p) => fs.existsSync(p)) || null;

    if (!resolvedScript) {
      this.state = 'FAILED';
      this.message = 'build-optimized-apk.ps1 script not found on host filesystem.';
      this.appendLog(`ERROR: ${this.message}`);
      return { success: false, message: this.message };
    }

    this.appendLog(`Resolved build script: ${resolvedScript}`);

    // Extract private deploy keys so flutter pub get can fetch private Git packages
    const tempKeyFiles: string[] = [];
    let gitSshCommand: string | undefined;

    try {
      const allMiniApps = await this.miniappRepository.find();
      const privateKeys = new Set<string>();

      for (const app of allMiniApps) {
        const activeKey = extractDecryptedDeployKey(app.integrationConfig as any);
        if (activeKey && activeKey.trim()) {
          privateKeys.add(activeKey.trim());
        }
        const pendingKey = extractDecryptedDeployKey(app.pendingRevision?.integrationConfig as any);
        if (pendingKey && pendingKey.trim()) {
          privateKeys.add(pendingKey.trim());
        }
      }

      if (privateKeys.size > 0) {
        this.appendLog(`Injecting SSH deploy keys for ${privateKeys.size} private repository package(s)...`);
        const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'superapp-apk-keys-'));
        let idx = 0;
        for (const key of privateKeys) {
          idx++;
          const keyPath = path.join(tempDir, `deploy_key_${idx}.pem`);
          fs.writeFileSync(keyPath, key.trim() + '\n', { mode: 0o600 });
          if (process.platform === 'win32') {
            try {
              const user = process.env.USERNAME || process.env.USER;
              if (user) {
                child_process.execFileSync('icacls', [keyPath, '/inheritance:r', '/grant:r', `${user}:R`], { stdio: 'pipe' });
              }
            } catch (aclErr: any) {
              this.logger.warn(`Could not set ACL on deploy key file: ${aclErr.message}`);
            }
          }
          tempKeyFiles.push(keyPath);
        }

        const identityArgs = tempKeyFiles.map((kp) => `-i "${kp.replace(/\\/g, '/')}"`).join(' ');
        gitSshCommand = `ssh ${identityArgs} -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null`;
        this.appendLog(`Configured GIT_SSH_COMMAND with ${tempKeyFiles.length} private identity key(s).`);
      }
    } catch (keyErr: any) {
      this.logger.warn(`Failed extracting deploy keys for APK build: ${keyErr.message}`);
      this.appendLog(`[WARN] Failed configuring deploy keys: ${keyErr.message}`);
    }

    const cleanupKeys = () => {
      for (const kp of tempKeyFiles) {
        try {
          if (fs.existsSync(kp)) fs.unlinkSync(kp);
        } catch (_) {}
      }
      if (tempKeyFiles.length > 0) {
        try {
          const dir = path.dirname(tempKeyFiles[0]);
          if (fs.existsSync(dir)) fs.rmdirSync(dir);
        } catch (_) {}
      }
    };

    const startTime = Date.now();
    const isWindows = process.platform === 'win32';
    const shell = isWindows ? 'powershell.exe' : '/bin/sh';
    const shellArgs = isWindows
      ? [
          '-NoProfile',
          '-ExecutionPolicy',
          'Bypass',
          '-File',
          resolvedScript,
          '-ApiBaseUrl',
          apiBaseUrl,
          '-ReleaseVersion',
          releaseVersion,
          '-BuildType',
          buildType,
          '-AppName',
          appName,
        ]
      : ['-c', `sh ${resolvedScript} "${apiBaseUrl}" "${releaseVersion}" "${buildType}" "${appName}"`];

    this.activeBuildPromise = new Promise<{ success: boolean; message: string; apkUrl?: string }>((resolve) => {
      const finalize = (res: { success: boolean; message: string; apkUrl?: string }) => {
        this.activeBuildPromise = undefined;
        resolve(res);
      };

      try {
        this.currentProcess = child_process.spawn(shell, shellArgs, {
          cwd: path.dirname(resolvedScript),
          env: {
            ...process.env,
            ...(gitSshCommand ? { GIT_SSH_COMMAND: gitSshCommand } : {}),
          },
        });

        this.currentProcess.stdout?.on('data', (data) => {
          const str = data.toString();
          for (const line of str.split('\n')) {
            if (line.trim()) this.appendLog(line);
          }
        });

        this.currentProcess.stderr?.on('data', (data) => {
          const str = data.toString();
          for (const line of str.split('\n')) {
            if (line.trim()) this.appendLog(`[WARN/ERR] ${line}`);
          }
        });

        this.currentProcess.on('close', async (code) => {
          cleanupKeys();
          this.durationMs = Date.now() - startTime;
          this.lastBuildTime = new Date().toISOString();
          this.exitCode = code ?? 0;
          this.currentProcess = undefined;

          if (this.exitCode === 0) {
            this.state = 'SUCCESS';
            const repoName = 'apk-test-builds';
            const targetName = buildType === 'release' ? 'app-release.apk' : 'app-debug.apk';
            const nexusBase = (process.env.NEXUS_BASE_URL || 'http://localhost:8081').replace(/\/+$/, '');
            const apkUrl = `${nexusBase}/repository/${repoName}/${appName}/${releaseVersion}/${targetName}`;
            this.message = `Super App test APK (${releaseVersion}, ${buildType}) compiled and published to Nexus (${repoName}/${targetName}) successfully in ${(this.durationMs / 1000).toFixed(1)}s.`;
            this.appendLog(`✅ ${this.message}`);
            this.logger.log(this.message);

            // Notify connected clients that compile & publish stages completed
            try {
              const buildingApps = await this.miniappRepository.find({
                where: [{ status: 'BUILDING' }, { activeTestVersion: releaseVersion }],
              });
              for (const app of buildingApps) {
                this.notificationsService.emitBuildStageUpdate({
                  miniAppId: app.id,
                  appName,
                  releaseVersion,
                  stage: {
                    id: 'compile',
                    name: '2. Fastlane APK Packaging',
                    status: 'COMPLETED',
                    details: `Size-optimized Fastlane build completed successfully for ${appName}.`,
                    updatedAt: new Date().toISOString(),
                  },
                  stages: app.buildStages || {},
                });
                this.notificationsService.emitBuildStageUpdate({
                  miniAppId: app.id,
                  appName,
                  releaseVersion,
                  stage: {
                    id: 'publish',
                    name: '3. Test Build Publishing (apk-test-builds)',
                    status: 'COMPLETED',
                    details: `Published test APK artifacts (${targetName}) to Sonatype Nexus apk-test-builds/${appName}/${releaseVersion}/.`,
                    updatedAt: new Date().toISOString(),
                  },
                  stages: app.buildStages || {},
                });
              }
            } catch (_) {}

            finalize({ success: true, message: this.message, apkUrl });
          } else {
            this.state = 'FAILED';
            this.message = `Super App APK build failed with exit code ${this.exitCode}.`;
            this.appendLog(`❌ ${this.message}`);
            this.logger.error(this.message);
            finalize({ success: false, message: this.message });
          }
        });

        this.currentProcess.on('error', (err) => {
          cleanupKeys();
          this.durationMs = Date.now() - startTime;
          this.lastBuildTime = new Date().toISOString();
          this.state = 'FAILED';
          this.exitCode = -1;
          this.currentProcess = undefined;
          this.message = `APK build process error: ${err.message}`;
          this.appendLog(`❌ ${this.message}`);
          this.logger.error(this.message);
          finalize({ success: false, message: this.message });
        });
      } catch (err: any) {
        cleanupKeys();
        this.state = 'FAILED';
        this.message = `Failed to spawn APK build process: ${err.message}`;
        this.appendLog(`❌ ${this.message}`);
        finalize({ success: false, message: this.message });
      }
    });

    return this.activeBuildPromise;
  }
}
