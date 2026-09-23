import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import * as child_process from 'child_process';

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

  /**
   * Triggers asynchronous compilation of Flutter Web Sandbox via scripts/build-sandbox.ps1.
   */
  async triggerBuild(triggeredBy: string = 'Super App Admin'): Promise<{ success: boolean; message: string }> {
    if (this.state === 'BUILDING') {
      return {
        success: false,
        message: 'A sandbox build is already in progress. Please wait for it to complete.',
      };
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
      this.message = 'build-sandbox.ps1 script not found on host filesystem.';
      this.appendLog(`ERROR: ${this.message}`);
      return { success: false, message: this.message };
    }

    this.state = 'BUILDING';
    this.triggeredBy = triggeredBy;
    this.exitCode = undefined;
    this.message = `Building Flutter Web Super App Sandbox (triggered by ${triggeredBy})...`;
    this.appendLog(`=== Sandbox Build Started by ${triggeredBy} ===`);
    this.appendLog(`Script: ${resolvedScript}`);

    const startTime = Date.now();
    const isWindows = process.platform === 'win32';
    const shell = isWindows ? 'powershell.exe' : '/bin/sh';
    const shellArgs = isWindows
      ? ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', resolvedScript]
      : ['-c', `sh ${resolvedScript}`];

    try {
      this.currentProcess = child_process.spawn(shell, shellArgs, {
        cwd: path.dirname(resolvedScript),
        env: { ...process.env },
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
      this.state = 'FAILED';
      this.message = `Failed to spawn build process: ${err.message}`;
      this.appendLog(`❌ ${this.message}`);
      return { success: false, message: this.message };
    }
  }
}
