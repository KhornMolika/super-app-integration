import { BuildMiniAppsService } from './build-miniapps.service';
import { miniAppDependencyOf, pubspecHostedUrlFor } from '../integrations/flutter/miniapp-dependency.util';
import { dartString, renderMiniAppRegistry } from '../integrations/flutter/miniapp-registry.render';

const GW = 'https://app.fintechcenterfsa.com/pub';
const app = (appId: string, cfg: Record<string, any>, extra: Record<string, any> = {}) => ({
  id: `${appId}-uuid`,
  appId,
  name: appId,
  lifecycleStatus: 'ACTIVE',
  integrationMethod: 'FLUTTER_PACKAGE',
  integrationConfig: cfg,
  ...extra,
});

describe('miniAppDependencyOf', () => {
  it('uses the Git source with its ref and sub path', () => {
    expect(
      miniAppDependencyOf(app('a', { repoUrl: 'https://github.com/P/sc-public-miniapp.git', gitTag: 'v1.0.0', gitPath: 'pkg/' }), GW),
    ).toEqual({
      packageName: 'sc_public_miniapp',
      dependency: { git: { url: 'https://github.com/P/sc-public-miniapp.git', ref: 'v1.0.0', path: 'pkg' } },
    });
  });

  it('reads published packages through the /pub gateway, never a PC or cluster Nexus', () => {
    const r = miniAppDependencyOf(
      app('k', { sourceType: 'ARTIFACT', packageName: 'ma_flutter_kyc', packageVersion: '1.2.0', nexusUrl: 'http://localhost:8081/repository/pub-hosted/' }),
      GW,
    );
    expect(r).toEqual({ packageName: 'ma_flutter_kyc', dependency: { hosted: { name: 'ma_flutter_kyc', url: GW }, version: '^1.2.0' } });
    expect(pubspecHostedUrlFor(undefined, 'http://nexus.super-app.svc.cluster.local:8081/repository/pub-hosted')).toBe(GW);
  });

  it('skips what a build server cannot use', () => {
    const skip = (cfg: Record<string, any>) => (miniAppDependencyOf(app('x', cfg), GW) as any).skip;
    expect(skip({ sourceType: 'LOCAL', packageName: 'p', path: '../p' })).toMatch(/developer PC/);
    expect(skip({ repoUrl: 'https://user:tok@github.com/P/r.git' })).toMatch(/not a supported Git URL/);
    expect(skip({ repoUrl: 'https://github.com/P/r.git', gitBranch: 'main; rm -rf /' })).toMatch(/unsupported characters/);
    expect(skip({ repoUrl: 'https://github.com/P/r.git', gitPath: '../../etc' })).toMatch(/not valid/);
    expect(skip({ sourceType: 'ARTIFACT', packageName: 'flutter' })).toMatch(/not a usable Dart package name/);
    expect(skip({ sourceType: 'ARTIFACT', packageName: 'Bad-Name!' })).toMatch(/not a usable Dart package name/);
    expect(skip({ sourceType: 'ARTIFACT', packageName: 'p', versionConstraint: '1.0.0\nflutter: x' })).toMatch(/not a valid constraint/);
  });
});

describe('renderMiniAppRegistry', () => {
  it('escapes partner-entered text and ignores class names that are not Dart identifiers', () => {
    const dart = renderMiniAppRegistry([
      {
        packageName: 'evil_pkg',
        app: {
          id: 'e1',
          appId: 'evil',
          name: "Bob's $app\n}",
          integrationConfig: { entryPoint: 'X(); exit(1); //' },
          homeWidget: { widgetClass: 'W()', verifiedClass: 'W()' },
        },
      },
    ]);
    expect(dart).toContain(dartString("Bob's $app\n}"));
    expect(dart).toContain("'Bob\\'s \\$app\\n}'");
    expect(dart).toContain('evil_pkg.MiniAppEntry.new');
    expect(dart).not.toContain('exit(1)');
    expect(dart).not.toContain('registerWidgetAliases');
  });
});

describe('BuildMiniAppsService.plan', () => {
  function serviceWith(apps: any[]) {
    const repo = { find: jest.fn(async () => apps) };
    const config = { get: jest.fn(() => GW) };
    return { svc: new BuildMiniAppsService(repo as any, config as any), repo };
  }

  it('lists the Flutter mini apps in the build with their pubspec entry and registry', async () => {
    const { svc, repo } = serviceWith([
      app('pub_app', { repoUrl: 'https://github.com/P/sc-public-miniapp.git', gitTag: 'v1.0.0' }),
      app('kyc', { sourceType: 'ARTIFACT', packageName: 'ma_flutter_kyc', packageVersion: '1.0.0' }),
      app('dup', { sourceType: 'ARTIFACT', packageName: 'ma_flutter_kyc' }),
      app('local', { sourceType: 'LOCAL', packageName: 'local_pkg', path: '../local_pkg' }),
    ]);
    const r = await svc.plan();
    expect(r.packages.map((p) => [p.appId, p.packageName])).toEqual([
      ['pub_app', 'sc_public_miniapp'],
      ['kyc', 'ma_flutter_kyc'],
    ]);
    expect(r.skipped).toEqual([
      { appId: 'dup', reason: 'package ma_flutter_kyc is already in the build for kyc' },
      { appId: 'local', reason: 'local path packages exist only on a developer PC' },
    ]);
    expect(r.registryDart).toContain("import 'package:sc_public_miniapp/sc_public_miniapp.dart' as sc_public_miniapp;");
    expect(r.registryDart).toContain("import 'package:ma_flutter_kyc/ma_flutter_kyc.dart' as ma_flutter_kyc;");
    expect(r.registryDart).not.toContain('local_pkg');
    const where = (repo.find.mock.calls[0] as any)[0].where;
    expect(where.integrationMethod).toBe('FLUTTER_PACKAGE');
    expect(where.lifecycleStatus._value).toEqual(['APPROVED', 'BUILDING', 'BUILD_FAILED', 'TESTING', 'ACTIVE']);
  });

  it('with no mini apps, the registry registers nothing', async () => {
    const { svc } = serviceWith([]);
    const r = await svc.plan();
    expect(r.packages).toEqual([]);
    expect(r.registryDart).toContain('void registerDynamicGeneratedMiniApps() {');
    expect(r.registryDart).not.toContain('registerAliases(');
  });
});

describe('GET /release-assembly/build-miniapps', () => {
  it('is protected by the Jenkins callback token', () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { GUARDS_METADATA } = require('@nestjs/common/constants');
    const { NativeSdkManifestController } = require('./native-sdk-manifest.controller');
    const { CallbackTokenGuard } = require('../integrations/release-assembly/callback-token.guard');
    const guards = Reflect.getMetadata(GUARDS_METADATA, NativeSdkManifestController.prototype.buildMiniApps);
    expect(guards).toContain(CallbackTokenGuard);
  });
});
