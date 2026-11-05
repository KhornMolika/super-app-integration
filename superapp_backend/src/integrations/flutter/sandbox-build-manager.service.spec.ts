import { sandboxBuildCommand, sandboxScriptName } from './sandbox-build-manager.service';

describe('sandbox build fallback command', () => {
  it.each(['darwin', 'linux'] as const)('uses the bash script on %s', (platform) => {
    expect(sandboxScriptName(platform)).toBe('build-sandbox.sh');
    expect(sandboxBuildCommand(platform, '/repo/scripts/build-sandbox.sh')).toEqual({
      command: 'bash',
      args: ['/repo/scripts/build-sandbox.sh'],
    });
  });

  it('uses the PowerShell script on Windows', () => {
    expect(sandboxScriptName('win32')).toBe('build-sandbox.ps1');
    expect(sandboxBuildCommand('win32', 'C:\\repo\\scripts\\build-sandbox.ps1')).toEqual({
      command: 'powershell.exe',
      args: ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', 'C:\\repo\\scripts\\build-sandbox.ps1'],
    });
  });
});
