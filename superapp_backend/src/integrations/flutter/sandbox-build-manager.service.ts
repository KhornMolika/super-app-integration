import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as child_process from 'child_process';

import { JenkinsService } from '../jenkins/jenkins.service';
import { MiniApp } from '../../miniapps/entities/miniapp.entity';
import { extractDecryptedDeployKey } from '../../miniapps/helpers/flutter-credential.helper';

export type BuildState = 'IDLE' | 'QUEUED' | 'BUILDING' | 'SUCCESS' | 'FAILED';

export interface SandboxBuildStatus {
  state: BuildState;
  lastBuildTime?: string;
  durationMs?: number;
  triggeredBy?: string;
  exitCode?: number;
  message: string;
  recentLogs: string[];
}

@Injectable()
export class SandboxBuildManagerService {
  private readonly logger = new Logger(SandboxBuildManagerService.name);

  private state: BuildState = 'IDLE';
  private lastBuildTime?: string;
  private durationMs?: number;
  private triggeredBy?: string;
  private exitCode?: number;
  private message: string = 'Sandbox build idle.';
  private readonly logBuffer: string[] = [];
  private currentProcess?: child_process.ChildProcess;

  constructor(
    private readonly jenkinsService: JenkinsService,
    @InjectRepository(MiniApp)
    private readonly miniappRepository: Repository<MiniApp>,
  ) {}

  /**
   * Appends a log line to the cyclic in-memory buffer (max 200 lines).
   */
  private appendLog(line: string) {
    const timestamp = new Date().toISOString().substring(11, 19);
    const formatted = `[${timestamp}] ${line.trim()}`;
    this.logBuffer.push(formatted);
    if (this.logBuffer.length > 200) {
      this.logBuffer.shift();
    }
  }

  /**
   * Retrieves current build state, timestamps, and recent log messages.
   */
  getStatus(): SandboxBuildStatus {
    // Timeout safeguard: If stuck in BUILDING for more than 4 minutes, auto-reset to IDLE/FAILED
    if (this.state === 'BUILDING' && this.lastBuildStartTime && Date.now() - this.lastBuildStartTime > 240000) {
      this.state = 'FAILED';
      this.message = 'Build operation timed out after 4 minutes.';
      this.appendLog(`⚠️ ${this.message}`);
    }

    return {
      state: this.state,
      lastBuildTime: this.lastBuildTime,
      durationMs: this.durationMs,
      triggeredBy: this.triggeredBy,
      exitCode: this.exitCode,
      message: this.message,
      recentLogs: [...this.logBuffer],
    };
  }

  private lastBuildStartTime?: number;

  /**
   * Polls Jenkins in the background until the superapp-sandbox-build job completes.
   */
  private async monitorJenkinsBuild(startTime: number) {
    let lastSeenConsole = '';
    const maxPolls = 60; // 60 * 3s = 3 minutes max polling
    let polls = 0;

    const interval = setInterval(async () => {
      polls++;
      if (this.state !== 'BUILDING' || polls >= maxPolls) {
        clearInterval(interval);
        if (this.state === 'BUILDING') {
          this.state = 'SUCCESS';
          this.durationMs = Date.now() - startTime;
          this.lastBuildTime = new Date().toISOString();
          this.message = `Sandbox pipeline completed in ${(this.durationMs / 1000).toFixed(1)}s.`;
          this.appendLog(`✅ ${this.message}`);
        }
        return;
      }

      try {
        const jStatus = await this.jenkinsService.getSandboxBuildStatusFromJenkins();
        if (jStatus.available) {
          if (jStatus.consoleText && jStatus.consoleText !== lastSeenConsole) {
            const newLines = jStatus.consoleText
              .replace(lastSeenConsole, '')
              .split('\n')
              .map((l) => l.trim())
              .filter((l) => l.length > 0);
            for (const line of newLines.slice(-10)) {
              this.appendLog(`[Jenkins] ${line}`);
            }
            lastSeenConsole = jStatus.consoleText;
          }

          if (!jStatus.building) {
            clearInterval(interval);
            this.durationMs = Date.now() - startTime;
            this.lastBuildTime = new Date().toISOString();

            if (jStatus.result === 'SUCCESS') {
              this.appendLog(`✅ Jenkins superapp-sandbox-build completed successfully in ${(this.durationMs / 1000).toFixed(1)}s.`);
              if (!this.currentProcess) {
                this.state = 'SUCCESS';
                this.message = `Jenkins superapp-sandbox-build completed successfully in ${(this.durationMs / 1000).toFixed(1)}s.`;
                this.appendLog(`✅ ${this.message}`);
                this.logger.log(this.message);
              } else {
                this.appendLog('Local Flutter Web sandbox compilation is progressing in background...');
              }
            } else if (jStatus.result === 'FAILURE') {
              this.appendLog('❌ Jenkins superapp-sandbox-build pipeline failed. Awaiting local fallback build...');
            } else {
              this.appendLog('Jenkins sandbox build completed.');
            }
          }
        }
      } catch (_) {}
    }, 3000);
  }

  /**
   * Triggers compilation of Flutter Web Sandbox via Jenkins pipeline, with local PowerShell fallback.
   */
  async triggerBuild(triggeredBy: string = 'SuperApp Admin'): Promise<{ success: boolean; message: string }> {
    if (this.state === 'BUILDING') {
      return {
        success: false,
        message: 'A sandbox build is already in progress. Please wait for it to complete.',
      };
    }

    this.state = 'BUILDING';
    this.lastBuildStartTime = Date.now();
    this.triggeredBy = triggeredBy;
    this.exitCode = undefined;
    this.message = `Triggering Jenkins SuperApp Web Sandbox pipeline (triggered by ${triggeredBy})...`;
    this.appendLog(`=== Sandbox Build Started by ${triggeredBy} ===`);

    try {
      this.appendLog('Connecting to Jenkins to trigger superapp-sandbox-build...');
      const jenkinsRes = await this.jenkinsService.triggerSuperAppSandboxBuild();
      if (jenkinsRes.success) {
        this.appendLog(`✅ Jenkins pipeline triggered: ${jenkinsRes.message}`);
        this.monitorJenkinsBuild(this.lastBuildStartTime);
      } else {
        this.appendLog(`[WARN] Jenkins trigger returned: ${jenkinsRes.message}`);
      }
    } catch (err: any) {
      this.appendLog(`[WARN] Failed to trigger Jenkins: ${err.message}`);
    }

    const candidates = [
      path.resolve(process.cwd(), 'scripts/build-sandbox.ps1'),
      path.resolve(process.cwd(), 'superapp_backend/scripts/build-sandbox.ps1'),
      path.resolve(__dirname, '../../../scripts/build-sandbox.ps1'),
      path.resolve(process.cwd(), '../scripts/build-sandbox.ps1'),
    ];
    const resolvedScript = candidates.find((p) => fs.existsSync(p)) || null;

    if (!resolvedScript) {
      this.state = 'FAILED';
      this.message = 'build-sandbox.ps1 script not found on host filesystem and Jenkins trigger failed.';
      this.appendLog(`ERROR: ${this.message}`);
      return { success: false, message: this.message };
    }

    this.appendLog(`Local Fallback Script: ${resolvedScript}`);

    // Extract all private deploy keys for packages in pubspec
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
        this.appendLog(`Configuring SSH deploy keys for ${privateKeys.size} private repository package(s)...`);
        const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'superapp-deploy-keys-'));
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

        const identityArgs = tempKeyFiles
          .map((kp) => `-i "${kp.replace(/\\/g, '/')}"`)
          .join(' ');
        gitSshCommand = `ssh ${identityArgs} -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null`;
        this.appendLog(`Configured GIT_SSH_COMMAND with ${tempKeyFiles.length} identity key(s).`);
      }
    } catch (keyErr: any) {
      this.logger.warn(`Failed extracting deploy keys for sandbox build: ${keyErr.message}`);
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
      ? ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', resolvedScript]
      : ['-c', `sh ${resolvedScript}`];

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

      this.currentProcess.on('close', (code) => {
        cleanupKeys();
        this.durationMs = Date.now() - startTime;
        this.lastBuildTime = new Date().toISOString();
        this.exitCode = code ?? 0;

        if (this.exitCode === 0) {
          this.state = 'SUCCESS';
          this.message = `Sandbox build completed successfully in ${(this.durationMs / 1000).toFixed(1)}s.`;
          this.appendLog(`✅ ${this.message}`);
          this.logger.log(this.message);
        } else {
          this.state = 'FAILED';
          this.message = `Sandbox build failed with exit code ${this.exitCode}.`;
          this.appendLog(`❌ ${this.message}`);
          this.logger.error(this.message);
        }
        this.currentProcess = undefined;
      });

      this.currentProcess.on('error', (err) => {
        cleanupKeys();
        this.durationMs = Date.now() - startTime;
        this.lastBuildTime = new Date().toISOString();
        this.state = 'FAILED';
        this.exitCode = -1;
        this.message = `Build process error: ${err.message}`;
        this.appendLog(`❌ ${this.message}`);
        this.logger.error(this.message);
        this.currentProcess = undefined;
      });

      return {
        success: true,
        message: 'Sandbox build initiated in background.',
      };
    } catch (err: any) {
      cleanupKeys();
      this.state = 'FAILED';
      this.message = `Failed to spawn build process: ${err.message}`;
      this.appendLog(`❌ ${this.message}`);
      return { success: false, message: this.message };
    }
  }
}
