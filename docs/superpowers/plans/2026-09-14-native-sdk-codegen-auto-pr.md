# Native SDK Codegen Auto-PR Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When an SA Admin approves a `NATIVE_SDK` mini app, `dps_backend` regenerates that app's native glue code and opens a GitHub PR with the change, entirely through the GitHub API — no local git, no local filesystem writes — closing any previously open codegen PR the new one supersedes.

**Architecture:** Two pure, I/O-free files (`marker.ts`, `renderers.ts`) port unchanged from an earlier branch. A new `NativeSdkCodegenService` reads current file content via the existing `GitHubProvider.getFileContent()` (Contents API) instead of local `fs`, and computes an in-memory diff. A new `GithubPrService` creates the branch/commit/PR entirely through GitHub's Git Data + Pulls API (blob → tree → commit → ref → PR), then finds and closes any other open `codegen/native-sdk-*` PR against the same base branch. `MiniappsService.approve()` calls both in sequence for `NATIVE_SDK` apps and persists the one-shot result on a new `lastCodegenRun` column.

**Tech Stack:** NestJS 11, TypeORM (Postgres, `synchronize: true` — no migration needed for the new column), Jest + `ts-jest`, global `fetch` (Node 20+, no HTTP client library).

## Global Constraints

- Always use `pnpm`, never `npm` or `yarn`.
- Scope is `NATIVE_SDK`-tier mini apps only — confirmed via evidence (`feat/deeplink` has zero diff to `AndroidManifest.xml`/`Info.plist` vs `main`) that no other integration method needs native file changes. Do not add hooks for `WEBVIEW`, `DEEP_LINK`, or `FLUTTER_PACKAGE_*`.
- No local git commands anywhere in this feature — every git operation goes through GitHub's REST/Git Data API. No local filesystem writes to `dps_mobile_app`'s source tree.
- `CODEGEN_AUTO_PR` must default to disabled (only `'true'` enables PR creation) — this is a deploy-time safety switch, independent of the fact that codegen fires automatically (no separate manual trigger) once enabled.
- A failure closing one superseded PR must never fail the overall `openPrForChanges` call — log and continue.
- Approving a mini app must never roll back if codegen/PR fails afterward — the approval is already persisted; codegen failures are recorded on `lastCodegenRun` and logged, nothing more.
- Jest config: tests live next to source as `*.spec.ts` (`rootDir: src`, see `dps_backend/package.json`'s `"jest"` block) — this repo has no separate `test/` directory for unit tests.

---

### Task 1: Port pure codegen primitives (marker, renderers, vendor types)

**Files:**
- Create: `dps_backend/src/native-sdk-codegen/vendor.types.ts`
- Create: `dps_backend/src/native-sdk-codegen/marker.ts`
- Create: `dps_backend/src/native-sdk-codegen/marker.spec.ts`
- Create: `dps_backend/src/native-sdk-codegen/renderers.ts`
- Create: `dps_backend/src/native-sdk-codegen/renderers.spec.ts`

**Interfaces:**
- Consumes: nothing (first task).
- Produces (for Task 2 to import verbatim): `NativeSdkVendor` interface (fields: `appId, iosModuleName, iosTypeName, iosArtifactFilename, androidPackageName, androidObjectName, androidArtifactFilename`, all `string`); `replaceMarkedRegion(content: string, region: string, body: string): string`; `identifierFor(appId: string): string`; `renderIosImports(vendors: NativeSdkVendor[]): string`; `renderIosHandlers(vendors: NativeSdkVendor[]): string`; `renderAndroidImports(vendors: NativeSdkVendor[]): string`; `renderAndroidHandlers(vendors: NativeSdkVendor[]): string`; `renderPodfileLines(vendors: NativeSdkVendor[]): string`; `renderGradleLines(vendors: NativeSdkVendor[]): string`.

These four files are pure functions with no filesystem or network dependency, ported unchanged from an earlier branch (`feat/native-sdk-codegen`) that already has them working and tested.

- [ ] **Step 1: Write `vendor.types.ts`**

```ts
export interface NativeSdkVendor {
  appId: string;
  iosModuleName: string;
  iosTypeName: string;
  iosArtifactFilename: string;
  androidPackageName: string;
  androidObjectName: string;
  androidArtifactFilename: string;
}
```

- [ ] **Step 2: Write `marker.ts`**

```ts
/**
 * Replaces the lines between a `GENERATED NATIVE SDK <region>` marker pair.
 * Comment syntax is irrelevant — the marker text itself is what is matched —
 * so the same helper serves Swift, Kotlin, Ruby and Gradle files.
 */
export function replaceMarkedRegion(
  content: string,
  region: string,
  body: string,
): string {
  const beginText = `GENERATED NATIVE SDK ${region} —`;
  const endText = `END GENERATED NATIVE SDK ${region} `;

  const lines = content.split('\n');
  const beginIdxs: number[] = [];
  const endIdxs: number[] = [];

  lines.forEach((line, i) => {
    if (line.includes(endText.trim())) {
      endIdxs.push(i);
    } else if (line.includes(beginText)) {
      beginIdxs.push(i);
    }
  });

  if (beginIdxs.length === 0) {
    throw new Error(`Missing begin marker for region "${region}"`);
  }
  if (endIdxs.length === 0) {
    throw new Error(`Missing end marker for region "${region}"`);
  }
  if (beginIdxs.length > 1 || endIdxs.length > 1) {
    throw new Error(`Markers for region "${region}" appear more than once`);
  }

  const begin = beginIdxs[0];
  const end = endIdxs[0];
  if (end < begin) {
    throw new Error(`End marker precedes begin marker for region "${region}"`);
  }

  const replacement = body === '' ? [] : body.split('\n');
  return [
    ...lines.slice(0, begin + 1),
    ...replacement,
    ...lines.slice(end),
  ].join('\n');
}
```

- [ ] **Step 3: Write `marker.spec.ts`**

```ts
import { replaceMarkedRegion } from './marker';

const file = [
  'header line',
  '// === GENERATED NATIVE SDK IMPORTS — DO NOT EDIT ===',
  'stale content',
  '// === END GENERATED NATIVE SDK IMPORTS ===',
  'footer line',
].join('\n');

describe('replaceMarkedRegion', () => {
  it('replaces the body between the markers', () => {
    const out = replaceMarkedRegion(file, 'IMPORTS', 'fresh content');
    expect(out).toBe(
      [
        'header line',
        '// === GENERATED NATIVE SDK IMPORTS — DO NOT EDIT ===',
        'fresh content',
        '// === END GENERATED NATIVE SDK IMPORTS ===',
        'footer line',
      ].join('\n'),
    );
  });

  it('leaves content outside the markers untouched', () => {
    const out = replaceMarkedRegion(file, 'IMPORTS', 'x');
    expect(out).toContain('header line');
    expect(out).toContain('footer line');
  });

  it('collapses to just the marker pair when the body is empty', () => {
    const out = replaceMarkedRegion(file, 'IMPORTS', '');
    expect(out).toBe(
      [
        'header line',
        '// === GENERATED NATIVE SDK IMPORTS — DO NOT EDIT ===',
        '// === END GENERATED NATIVE SDK IMPORTS ===',
        'footer line',
      ].join('\n'),
    );
  });

  it('is idempotent when given the same body twice', () => {
    const once = replaceMarkedRegion(file, 'IMPORTS', 'same');
    expect(replaceMarkedRegion(once, 'IMPORTS', 'same')).toBe(once);
  });

  it('works with a hash comment marker', () => {
    const podfile = [
      '# === GENERATED NATIVE SDK PODS — DO NOT EDIT ===',
      '# === END GENERATED NATIVE SDK PODS ===',
    ].join('\n');
    expect(replaceMarkedRegion(podfile, 'PODS', "  pod 'X'")).toContain("  pod 'X'");
  });

  it('throws when the begin marker is missing', () => {
    expect(() => replaceMarkedRegion('nothing here', 'IMPORTS', 'x')).toThrow(
      /begin marker/i,
    );
  });

  it('throws when the end marker is missing', () => {
    const broken = '// === GENERATED NATIVE SDK IMPORTS — DO NOT EDIT ===';
    expect(() => replaceMarkedRegion(broken, 'IMPORTS', 'x')).toThrow(/end marker/i);
  });

  it('throws when the markers appear more than once', () => {
    const dup = [file, file].join('\n');
    expect(() => replaceMarkedRegion(dup, 'IMPORTS', 'x')).toThrow(/more than once/i);
  });
});
```

- [ ] **Step 4: Write `renderers.ts`**

```ts
import { NativeSdkVendor } from './vendor.types';

const CHANNEL_PREFIX = 'com.example.dsp_mobile';

export function identifierFor(appId: string): string {
  return appId.replace(/[^A-Za-z0-9]/g, '_');
}

function channelFor(vendor: NativeSdkVendor): string {
  return `${CHANNEL_PREFIX}/${identifierFor(vendor.appId)}`;
}

export function renderIosImports(vendors: NativeSdkVendor[]): string {
  return vendors.map(v => `import ${v.iosModuleName}`).join('\n');
}

export function renderAndroidImports(vendors: NativeSdkVendor[]): string {
  return vendors
    .map(v => `import ${v.androidPackageName}.${v.androidObjectName}`)
    .join('\n');
}

export function renderPodfileLines(vendors: NativeSdkVendor[]): string {
  return vendors
    .map(v => `  pod '${v.iosModuleName}', :path => '../../vendor-artifacts'`)
    .join('\n');
}

export function renderGradleLines(vendors: NativeSdkVendor[]): string {
  return vendors
    .map(
      v =>
        `    implementation(files("../../../vendor-artifacts/${v.androidArtifactFilename}"))`,
    )
    .join('\n');
}

export function renderIosHandlers(vendors: NativeSdkVendor[]): string {
  return vendors
    .map(v => {
      const id = identifierFor(v.appId);
      const channel = channelFor(v);
      return `    let channel_${id} = FlutterMethodChannel(
      name: "${channel}",
      binaryMessenger: messenger
    )
    channel_${id}.setMethodCallHandler { [weak self] call, result in
      guard call.method == "present" else {
        result(FlutterMethodNotImplemented)
        return
      }
      guard self?.inFlight.contains("${channel}") != true else {
        result(["status": "error", "error": "already in progress"])
        return
      }
      guard let args = call.arguments as? [String: Any],
            let userId = args["userId"] as? String,
            let jwtToken = args["jwtToken"] as? String else {
        result(["status": "error", "error": "missing identity"])
        return
      }
      guard let presenter = self?.topPresenter() else {
        result(["status": "error", "error": "no presenter"])
        return
      }
      self?.inFlight.insert("${channel}")
      ${v.iosTypeName}.initialize(userId: userId, jwtToken: jwtToken)
      ${v.iosTypeName}.present(from: presenter) {
        self?.inFlight.remove("${channel}")
        result(["status": "completed"])
      }
    }`;
    })
    .join('\n\n');
}

export function renderAndroidHandlers(vendors: NativeSdkVendor[]): string {
  return vendors
    .map(v => {
      const channel = channelFor(v);
      return `        MethodChannel(messenger, "${channel}").setMethodCallHandler { call, result ->
            if (call.method != "present") {
                result.notImplemented()
            } else if (inFlight.contains("${channel}")) {
                result.success(mapOf("status" to "error", "error" to "already in progress"))
            } else {
                val userId = call.argument<String>("userId")
                val jwtToken = call.argument<String>("jwtToken")
                if (userId == null || jwtToken == null) {
                    result.success(mapOf("status" to "error", "error" to "missing identity"))
                } else {
                    inFlight.add("${channel}")
                    ${v.androidObjectName}.initialize(userId, jwtToken)
                    ${v.androidObjectName}.present(this) {
                        inFlight.remove("${channel}")
                        result.success(mapOf("status" to "completed"))
                        kotlin.Unit
                    }
                }
            }
        }`;
    })
    .join('\n\n');
}
```

- [ ] **Step 5: Write `renderers.spec.ts`**

```ts
import {
  identifierFor,
  renderIosImports,
  renderIosHandlers,
  renderAndroidImports,
  renderAndroidHandlers,
  renderPodfileLines,
  renderGradleLines,
} from './renderers';
import { NativeSdkVendor } from './vendor.types';

const permit: NativeSdkVendor = {
  appId: 'permit_check',
  iosModuleName: 'PermitCheckSDK',
  iosTypeName: 'PermitCheck',
  iosArtifactFilename: 'PermitCheckSDK.xcframework',
  androidPackageName: 'com.dspvendor.permit',
  androidObjectName: 'PermitCheck',
  androidArtifactFilename: 'permit-check-sdk-1.0.0.aar',
};

const parking: NativeSdkVendor = {
  appId: 'parking.pass',
  iosModuleName: 'ParkingPassSDK',
  iosTypeName: 'ParkingPass',
  iosArtifactFilename: 'ParkingPassSDK.xcframework',
  androidPackageName: 'com.dspvendor.parking',
  androidObjectName: 'ParkingPass',
  androidArtifactFilename: 'parking-pass-1.0.0.aar',
};

describe('identifierFor', () => {
  it('replaces non-alphanumerics so the appId is a valid identifier', () => {
    expect(identifierFor('parking.pass')).toBe('parking_pass');
  });

  it('leaves an already-valid identifier alone', () => {
    expect(identifierFor('permit_check')).toBe('permit_check');
  });
});

describe('renderers with no vendors', () => {
  it('all return an empty string', () => {
    expect(renderIosImports([])).toBe('');
    expect(renderIosHandlers([])).toBe('');
    expect(renderAndroidImports([])).toBe('');
    expect(renderAndroidHandlers([])).toBe('');
    expect(renderPodfileLines([])).toBe('');
    expect(renderGradleLines([])).toBe('');
  });
});

describe('renderIosImports', () => {
  it('emits one import per vendor module', () => {
    expect(renderIosImports([permit, parking])).toBe(
      'import PermitCheckSDK\nimport ParkingPassSDK',
    );
  });
});

describe('renderAndroidImports', () => {
  it('emits a fully qualified import per vendor object', () => {
    expect(renderAndroidImports([permit])).toBe(
      'import com.dspvendor.permit.PermitCheck',
    );
  });
});

describe('renderPodfileLines', () => {
  it('uses the module name as the pod name and the shared artifacts path', () => {
    expect(renderPodfileLines([permit])).toBe(
      "  pod 'PermitCheckSDK', :path => '../../vendor-artifacts'",
    );
  });
});

describe('renderGradleLines', () => {
  it('references the aar by filename under vendor-artifacts', () => {
    expect(renderGradleLines([permit])).toBe(
      '    implementation(files("../../../vendor-artifacts/permit-check-sdk-1.0.0.aar"))',
    );
  });
});

describe('renderIosHandlers', () => {
  const out = renderIosHandlers([permit]);

  it('registers a per-vendor channel keyed by appId', () => {
    expect(out).toContain('name: "com.example.dsp_mobile/permit_check"');
  });

  it('registers on the engine messenger, never on window.rootViewController', () => {
    expect(out).toContain('binaryMessenger: messenger');
    expect(out).not.toContain('window.rootViewController');
  });

  it('resolves the presenter lazily via the shared topPresenter helper', () => {
    expect(out).toContain('self?.topPresenter()');
  });

  it('calls the mandated interface with injected identity', () => {
    expect(out).toContain('PermitCheck.initialize(userId: userId, jwtToken: jwtToken)');
    expect(out).toContain('PermitCheck.present(from: presenter)');
  });

  it('guards re-entrancy with the shared inFlight set', () => {
    expect(out).toContain('inFlight.contains("com.example.dsp_mobile/permit_check")');
  });
});

describe('renderAndroidHandlers', () => {
  const out = renderAndroidHandlers([permit]);

  it('registers a per-vendor channel keyed by appId', () => {
    expect(out).toContain('"com.example.dsp_mobile/permit_check"');
  });

  it('calls the Kotlin object directly, never via INSTANCE', () => {
    expect(out).toContain('PermitCheck.initialize(userId, jwtToken)');
    expect(out).not.toContain('INSTANCE');
  });

  it('guards re-entrancy with the shared inFlight set', () => {
    expect(out).toContain('inFlight.contains("com.example.dsp_mobile/permit_check")');
  });
});
```

- [ ] **Step 6: Run the tests**

Run: `cd dps_backend && npx --yes pnpm@10.33.0 exec jest native-sdk-codegen/marker native-sdk-codegen/renderers`
Expected: both spec files pass, 0 failures. (Use the pinned `pnpm@10.33.0` for any command that could touch the lockfile; plain `npx jest` also works for just running tests since it doesn't touch `pnpm-lock.yaml` — either is fine here since no dependency changes occur in this task.)

- [ ] **Step 7: Commit**

```bash
git add dps_backend/src/native-sdk-codegen/vendor.types.ts dps_backend/src/native-sdk-codegen/marker.ts dps_backend/src/native-sdk-codegen/marker.spec.ts dps_backend/src/native-sdk-codegen/renderers.ts dps_backend/src/native-sdk-codegen/renderers.spec.ts
git commit -m "feat: port native SDK codegen marker/renderer primitives"
```

---

### Task 2: `NativeSdkCodegenService` on the GitHub Contents API

**Files:**
- Create: `dps_backend/src/native-sdk-codegen/native-sdk-codegen.service.ts`
- Create: `dps_backend/src/native-sdk-codegen/native-sdk-codegen.service.spec.ts`

**Interfaces:**
- Consumes: `NativeSdkVendor`, `replaceMarkedRegion` (Task 1); the existing `GitHubProvider.getFileContent(urlOrSlug: string, filePath: string, ref?: string, token?: string): Promise<string>` from `dps_backend/src/integrations/git/providers/github.provider.ts` (throws with a message containing "not found" on a 404 — used both for the artifact-existence check and for reading target file content); the `MiniApp` entity/repository (`integrationMethod: string`, `status: string`, `integrationConfig: any`, `appId: string`).
- Produces (for Task 3 and Task 4): `NativeSdkCodegenService.regenerate(): Promise<{ changedFiles: Map<string, string> }>` — the map's keys are repo-relative file paths (e.g. `dps_mobile_app/ios/Runner/AppDelegate.swift`), values are the full new file content. An empty map means nothing changed.

- [ ] **Step 1: Write the failing test**

Create `dps_backend/src/native-sdk-codegen/native-sdk-codegen.service.spec.ts`:

```ts
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { NativeSdkCodegenService } from './native-sdk-codegen.service';
import { GitHubProvider } from '../integrations/git/providers/github.provider';
import { MiniApp } from '../miniapps/entities/miniapp.entity';

const APP_DELEGATE = [
  'header line',
  '// GENERATED NATIVE SDK IMPORTS —',
  '// END GENERATED NATIVE SDK IMPORTS',
  '// GENERATED NATIVE SDK HANDLERS —',
  '// END GENERATED NATIVE SDK HANDLERS',
  'footer line',
].join('\n');

const MAIN_ACTIVITY = APP_DELEGATE; // same marker shape is fine for this test
const PODFILE = [
  '# GENERATED NATIVE SDK PODS —',
  '# END GENERATED NATIVE SDK PODS',
].join('\n');
const GRADLE = [
  '// GENERATED NATIVE SDK DEPS —',
  '// END GENERATED NATIVE SDK DEPS',
].join('\n');

function makeApprovedNativeSdkApp(overrides: Partial<MiniApp> = {}): MiniApp {
  return {
    appId: 'permit_check',
    integrationMethod: 'NATIVE_SDK',
    status: 'APPROVED',
    integrationConfig: {
      iosModuleName: 'PermitCheckSDK',
      iosTypeName: 'PermitCheck',
      iosArtifactFilename: 'PermitCheckSDK.xcframework',
      androidPackageName: 'com.dspvendor.permit',
      androidObjectName: 'PermitCheck',
      androidArtifactFilename: 'permit-check-sdk-1.0.0.aar',
    },
    ...overrides,
  } as MiniApp;
}

describe('NativeSdkCodegenService', () => {
  let service: NativeSdkCodegenService;
  let miniappFind: jest.Mock;
  let getFileContent: jest.Mock;

  async function setup(apps: MiniApp[], fileContents: Record<string, string>) {
    miniappFind = jest.fn().mockResolvedValue(apps);
    getFileContent = jest.fn().mockImplementation((_slug: string, path: string) => {
      if (path in fileContents) return Promise.resolve(fileContents[path]);
      return Promise.reject(new Error(`File '${path}' not found`));
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NativeSdkCodegenService,
        { provide: getRepositoryToken(MiniApp), useValue: { find: miniappFind } },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'CODEGEN_REPO_SLUG') return 'acme/dsp-poc';
              if (key === 'CODEGEN_BASE_BRANCH') return 'main';
              return undefined;
            }),
          },
        },
        { provide: GitHubProvider, useValue: { getFileContent } },
      ],
    }).compile();

    service = module.get<NativeSdkCodegenService>(NativeSdkCodegenService);
  }

  const filePaths = {
    ios: 'dps_mobile_app/ios/Runner/AppDelegate.swift',
    android: 'dps_mobile_app/android/app/src/main/kotlin/com/example/dsp_mobile/MainActivity.kt',
    podfile: 'dps_mobile_app/ios/Podfile',
    gradle: 'dps_mobile_app/android/app/build.gradle.kts',
    artifact: 'vendor-artifacts/PermitCheckSDK.xcframework',
    androidArtifact: 'vendor-artifacts/permit-check-sdk-1.0.0.aar',
  };

  const baselineFiles = {
    [filePaths.ios]: APP_DELEGATE,
    [filePaths.android]: MAIN_ACTIVITY,
    [filePaths.podfile]: PODFILE,
    [filePaths.gradle]: GRADLE,
    [filePaths.artifact]: 'binary-not-read-as-text-but-present',
    [filePaths.androidArtifact]: 'binary-not-read-as-text-but-present',
  };

  it('returns the changed files for a newly approved vendor', async () => {
    await setup([makeApprovedNativeSdkApp()], baselineFiles);

    const { changedFiles } = await service.regenerate();

    expect(changedFiles.size).toBe(4);
    expect(changedFiles.get(filePaths.ios)).toContain('import PermitCheckSDK');
    expect(changedFiles.get(filePaths.android)).toContain(
      'import com.dspvendor.permit.PermitCheck',
    );
    expect(changedFiles.get(filePaths.podfile)).toContain("pod 'PermitCheckSDK'");
    expect(changedFiles.get(filePaths.gradle)).toContain('permit-check-sdk-1.0.0.aar');
  });

  it('returns an empty map when the generated content already matches', async () => {
    // Pre-populate the "current" files with exactly what regeneration would produce.
    await setup([makeApprovedNativeSdkApp()], baselineFiles);
    const first = await service.regenerate();

    const alreadyGenerated = { ...baselineFiles };
    for (const [path, content] of first.changedFiles) {
      alreadyGenerated[path] = content;
    }
    await setup([makeApprovedNativeSdkApp()], alreadyGenerated);

    const { changedFiles } = await service.regenerate();
    expect(changedFiles.size).toBe(0);
  });

  it('throws when a vendor artifact is missing from the repo', async () => {
    const filesWithoutArtifact = { ...baselineFiles };
    delete filesWithoutArtifact[filePaths.artifact];
    await setup([makeApprovedNativeSdkApp()], filesWithoutArtifact);

    await expect(service.regenerate()).rejects.toThrow(/missing artifact/i);
  });

  it('throws when a required integrationConfig field is blank', async () => {
    await setup(
      [makeApprovedNativeSdkApp({ integrationConfig: { iosModuleName: '' } } as any)],
      baselineFiles,
    );

    await expect(service.regenerate()).rejects.toThrow(/iosModuleName/);
  });

  it('throws when two appIds collide on the same generated identifier', async () => {
    await setup(
      [
        makeApprovedNativeSdkApp({ appId: 'parking.pass' }),
        makeApprovedNativeSdkApp({ appId: 'parking_pass' }),
      ],
      baselineFiles,
    );

    await expect(service.regenerate()).rejects.toThrow(/both generate the identifier/i);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd dps_backend && npx --yes pnpm@10.33.0 exec jest native-sdk-codegen/native-sdk-codegen.service`
Expected: FAIL — `Cannot find module './native-sdk-codegen.service'` (it doesn't exist yet).

- [ ] **Step 3: Write `native-sdk-codegen.service.ts`**

```ts
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { MiniApp } from '../miniapps/entities/miniapp.entity';
import { GitHubProvider } from '../integrations/git/providers/github.provider';
import { NativeSdkVendor } from './vendor.types';
import { replaceMarkedRegion } from './marker';
import {
  renderIosImports,
  renderIosHandlers,
  renderAndroidImports,
  renderAndroidHandlers,
  renderPodfileLines,
  renderGradleLines,
  identifierFor,
} from './renderers';

interface RegionEdit {
  relPath: string;
  region: string;
  body: string;
}

/** Every field the renderers emit into real source; all must be present strings. */
const REQUIRED_VENDOR_FIELDS: (keyof NativeSdkVendor)[] = [
  'iosModuleName',
  'iosTypeName',
  'iosArtifactFilename',
  'androidPackageName',
  'androidObjectName',
  'androidArtifactFilename',
];

const IOS_APP_DELEGATE = 'dps_mobile_app/ios/Runner/AppDelegate.swift';
const ANDROID_MAIN_ACTIVITY =
  'dps_mobile_app/android/app/src/main/kotlin/com/example/dsp_mobile/MainActivity.kt';
const IOS_PODFILE = 'dps_mobile_app/ios/Podfile';
const ANDROID_GRADLE = 'dps_mobile_app/android/app/build.gradle.kts';

@Injectable()
export class NativeSdkCodegenService {
  private readonly logger = new Logger(NativeSdkCodegenService.name);

  constructor(
    @InjectRepository(MiniApp)
    private readonly miniappRepository: Repository<MiniApp>,
    private readonly configService: ConfigService,
    private readonly githubProvider: GitHubProvider,
  ) {}

  private repoSlug(): string {
    const slug = this.configService.get<string>('CODEGEN_REPO_SLUG');
    if (!slug) {
      throw new Error('CODEGEN_REPO_SLUG must be set (owner/repo)');
    }
    return slug;
  }

  private baseBranch(): string {
    return this.configService.get<string>('CODEGEN_BASE_BRANCH') || 'main';
  }

  async loadVendors(): Promise<NativeSdkVendor[]> {
    const apps = await this.miniappRepository.find({
      where: { integrationMethod: 'NATIVE_SDK', status: 'APPROVED' } as any,
      order: { appId: 'ASC' } as any,
    });

    const vendors = apps
      .filter(app => app.integrationConfig)
      .map(app => {
        const config = app.integrationConfig;
        for (const field of REQUIRED_VENDOR_FIELDS) {
          const value = config[field];
          if (typeof value !== 'string' || value.trim() === '') {
            throw new Error(
              `NATIVE_SDK app "${app.appId}" has an invalid integrationConfig: "${field}" must be a non-empty string`,
            );
          }
        }
        return {
          appId: app.appId,
          iosModuleName: config.iosModuleName,
          iosTypeName: config.iosTypeName,
          iosArtifactFilename: config.iosArtifactFilename,
          androidPackageName: config.androidPackageName,
          androidObjectName: config.androidObjectName,
          androidArtifactFilename: config.androidArtifactFilename,
        };
      });

    const byIdentifier = new Map<string, string>();
    for (const vendor of vendors) {
      const id = identifierFor(vendor.appId);
      const existing = byIdentifier.get(id);
      if (existing !== undefined) {
        throw new Error(
          `NATIVE_SDK appIds "${existing}" and "${vendor.appId}" both generate the identifier "${id}"; rename one of them`,
        );
      }
      byIdentifier.set(id, vendor.appId);
    }

    return vendors;
  }

  private editsFor(vendors: NativeSdkVendor[]): RegionEdit[] {
    return [
      { relPath: IOS_APP_DELEGATE, region: 'IMPORTS', body: renderIosImports(vendors) },
      { relPath: IOS_APP_DELEGATE, region: 'HANDLERS', body: renderIosHandlers(vendors) },
      { relPath: ANDROID_MAIN_ACTIVITY, region: 'IMPORTS', body: renderAndroidImports(vendors) },
      { relPath: ANDROID_MAIN_ACTIVITY, region: 'HANDLERS', body: renderAndroidHandlers(vendors) },
      { relPath: IOS_PODFILE, region: 'PODS', body: renderPodfileLines(vendors) },
      { relPath: ANDROID_GRADLE, region: 'DEPS', body: renderGradleLines(vendors) },
    ];
  }

  /**
   * Re-renders every generated region against the current GitHub repo content
   * and returns only the files whose content actually changed. Never writes
   * to disk and never runs a local git command.
   */
  async regenerate(): Promise<{ changedFiles: Map<string, string> }> {
    const vendors = await this.loadVendors();
    const slug = this.repoSlug();
    const base = this.baseBranch();

    for (const vendor of vendors) {
      for (const artifact of [vendor.iosArtifactFilename, vendor.androidArtifactFilename]) {
        const artifactPath = `vendor-artifacts/${artifact}`;
        try {
          await this.githubProvider.getFileContent(slug, artifactPath, base);
        } catch {
          throw new Error(
            `Missing artifact for "${vendor.appId}" in ${slug}@${base}: ${artifactPath}`,
          );
        }
      }
    }

    const originalContent = new Map<string, string>();
    const workingContent = new Map<string, string>();

    for (const edit of this.editsFor(vendors)) {
      if (!workingContent.has(edit.relPath)) {
        const fetched = await this.githubProvider.getFileContent(slug, edit.relPath, base);
        originalContent.set(edit.relPath, fetched);
        workingContent.set(edit.relPath, fetched);
      }
      const current = workingContent.get(edit.relPath)!;
      workingContent.set(edit.relPath, replaceMarkedRegion(current, edit.region, edit.body));
    }

    const changedFiles = new Map<string, string>();
    for (const [relPath, next] of workingContent) {
      if (originalContent.get(relPath) !== next) {
        changedFiles.set(relPath, next);
      }
    }

    this.logger.log(
      `Regenerated ${vendors.length} native SDK vendor(s); ${changedFiles.size} file(s) changed`,
    );
    return { changedFiles };
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd dps_backend && npx --yes pnpm@10.33.0 exec jest native-sdk-codegen/native-sdk-codegen.service`
Expected: PASS, 6/6 tests.

- [ ] **Step 5: Commit**

```bash
git add dps_backend/src/native-sdk-codegen/native-sdk-codegen.service.ts dps_backend/src/native-sdk-codegen/native-sdk-codegen.service.spec.ts
git commit -m "feat: rebuild NativeSdkCodegenService on the GitHub Contents API"
```

---

### Task 3: `GithubPrService` on the Git Data API, with superseded-PR closing

**Files:**
- Create: `dps_backend/src/native-sdk-codegen/github-pr.service.ts`
- Create: `dps_backend/src/native-sdk-codegen/github-pr.service.spec.ts`

**Interfaces:**
- Consumes: `changedFiles: Map<string, string>` (Task 2's exact return shape — repo-relative path → full new content). Env vars via `ConfigService`: `CODEGEN_AUTO_PR`, `CODEGEN_REPO_SLUG`, `CODEGEN_BASE_BRANCH` (default `'main'`), `GITHUB_BASE_URL` (default `'https://api.github.com'`), `GITHUB_TOKEN`.
- Produces (for Task 4): `GithubPrService.openPrForChanges(changedFiles: Map<string, string>): Promise<OpenPrResult>` where
  ```ts
  export interface OpenPrResult {
    status: 'no_changes' | 'skipped' | 'opened';
    prUrl?: string;
    prNumber?: number;
    supersededPrNumbers?: number[];
  }
  ```
  Throws (does not return an `'error'` status itself) on any hard GitHub API failure — the caller (Task 4) is responsible for catching and recording the error.

- [ ] **Step 1: Write the failing test**

Create `dps_backend/src/native-sdk-codegen/github-pr.service.spec.ts`:

```ts
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { GithubPrService } from './github-pr.service';

function configValue(overrides: Record<string, string | undefined> = {}) {
  const defaults: Record<string, string | undefined> = {
    CODEGEN_AUTO_PR: 'true',
    CODEGEN_REPO_SLUG: 'acme/dsp-poc',
    CODEGEN_BASE_BRANCH: 'main',
    GITHUB_BASE_URL: 'https://api.github.com',
    GITHUB_TOKEN: 'test-token',
  };
  const merged = { ...defaults, ...overrides };
  return (key: string) => merged[key];
}

async function buildService(configOverrides: Record<string, string | undefined> = {}) {
  const module: TestingModule = await Test.createTestingModule({
    providers: [
      GithubPrService,
      { provide: ConfigService, useValue: { get: jest.fn(configValue(configOverrides)) } },
    ],
  }).compile();
  return module.get<GithubPrService>(GithubPrService);
}

function jsonResponse(body: any, ok = true, status = ok ? 200 : 500) {
  return {
    ok,
    status,
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(JSON.stringify(body)),
  };
}

describe('GithubPrService', () => {
  let fetchMock: jest.Mock;

  beforeEach(() => {
    fetchMock = jest.fn();
    (global as any).fetch = fetchMock;
  });

  it('returns no_changes without calling fetch when there are no changed files', async () => {
    const service = await buildService();
    const result = await service.openPrForChanges(new Map());
    expect(result).toEqual({ status: 'no_changes' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('returns skipped without calling fetch when CODEGEN_AUTO_PR is not "true"', async () => {
    const service = await buildService({ CODEGEN_AUTO_PR: 'false' });
    const result = await service.openPrForChanges(new Map([['a.swift', 'content']]));
    expect(result).toEqual({ status: 'skipped' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('creates blob(s), a tree, a commit, a branch ref, and opens a PR', async () => {
    const service = await buildService();
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ object: { sha: 'base-sha' } })) // GET ref/heads/main
      .mockResolvedValueOnce(jsonResponse({ tree: { sha: 'base-tree-sha' } })) // GET commits/base-sha
      .mockResolvedValueOnce(jsonResponse({ sha: 'blob-sha-1' })) // POST blobs
      .mockResolvedValueOnce(jsonResponse({ sha: 'new-tree-sha' })) // POST trees
      .mockResolvedValueOnce(jsonResponse({ sha: 'new-commit-sha' })) // POST commits
      .mockResolvedValueOnce(jsonResponse({})) // POST refs (create branch)
      .mockResolvedValueOnce(jsonResponse({ html_url: 'https://github.com/acme/dsp-poc/pull/42', number: 42 })) // POST pulls
      .mockResolvedValueOnce(jsonResponse([])); // GET pulls?state=open (no superseded PRs)

    const result = await service.openPrForChanges(
      new Map([['dps_mobile_app/ios/Runner/AppDelegate.swift', 'new content']]),
    );

    expect(result).toEqual({
      status: 'opened',
      prUrl: 'https://github.com/acme/dsp-poc/pull/42',
      prNumber: 42,
      supersededPrNumbers: [],
    });

    const [prCall] = fetchMock.mock.calls.filter(([url]: [string]) => url.endsWith('/pulls'));
    expect(prCall[1].method).toBe('POST');
    const prBody = JSON.parse(prCall[1].body);
    expect(prBody.base).toBe('main');
    expect(prBody.head).toMatch(/^codegen\/native-sdk-\d+$/);
  });

  it('closes a superseded open codegen PR with a comment, and reports it', async () => {
    const service = await buildService();
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ object: { sha: 'base-sha' } }))
      .mockResolvedValueOnce(jsonResponse({ tree: { sha: 'base-tree-sha' } }))
      .mockResolvedValueOnce(jsonResponse({ sha: 'blob-sha-1' }))
      .mockResolvedValueOnce(jsonResponse({ sha: 'new-tree-sha' }))
      .mockResolvedValueOnce(jsonResponse({ sha: 'new-commit-sha' }))
      .mockResolvedValueOnce(jsonResponse({}))
      .mockResolvedValueOnce(jsonResponse({ html_url: 'https://github.com/acme/dsp-poc/pull/43', number: 43 }))
      .mockResolvedValueOnce(
        jsonResponse([{ number: 41, head: { ref: 'codegen/native-sdk-1700000000000' } }]),
      ) // GET pulls?state=open
      .mockResolvedValueOnce(jsonResponse({})) // POST issues/41/comments
      .mockResolvedValueOnce(jsonResponse({})); // PATCH pulls/41

    const result = await service.openPrForChanges(new Map([['a.swift', 'content']]));

    expect(result.status).toBe('opened');
    expect(result.supersededPrNumbers).toEqual([41]);

    const commentCall = fetchMock.mock.calls.find(([url]: [string]) =>
      url.endsWith('/issues/41/comments'),
    );
    expect(commentCall).toBeDefined();
    expect(JSON.parse(commentCall![1].body).body).toContain('pull/43');

    const closeCall = fetchMock.mock.calls.find(
      ([url, init]: [string, any]) => url.endsWith('/pulls/41') && init.method === 'PATCH',
    );
    expect(closeCall).toBeDefined();
    expect(JSON.parse(closeCall![1].body)).toEqual({ state: 'closed' });
  });

  it('does not fail the whole call when closing one superseded PR fails', async () => {
    const service = await buildService();
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ object: { sha: 'base-sha' } }))
      .mockResolvedValueOnce(jsonResponse({ tree: { sha: 'base-tree-sha' } }))
      .mockResolvedValueOnce(jsonResponse({ sha: 'blob-sha-1' }))
      .mockResolvedValueOnce(jsonResponse({ sha: 'new-tree-sha' }))
      .mockResolvedValueOnce(jsonResponse({ sha: 'new-commit-sha' }))
      .mockResolvedValueOnce(jsonResponse({}))
      .mockResolvedValueOnce(jsonResponse({ html_url: 'https://github.com/acme/dsp-poc/pull/50', number: 50 }))
      .mockResolvedValueOnce(
        jsonResponse([{ number: 41, head: { ref: 'codegen/native-sdk-1700000000000' } }]),
      )
      .mockResolvedValueOnce(jsonResponse({ message: 'not found' }, false, 404)); // POST comments fails

    const result = await service.openPrForChanges(new Map([['a.swift', 'content']]));

    expect(result.status).toBe('opened');
    expect(result.prUrl).toBe('https://github.com/acme/dsp-poc/pull/50');
    expect(result.supersededPrNumbers).toEqual([]); // failed close is not reported as closed
  });

  it('throws when CODEGEN_REPO_SLUG is not set', async () => {
    const service = await buildService({ CODEGEN_REPO_SLUG: undefined });
    await expect(
      service.openPrForChanges(new Map([['a.swift', 'content']])),
    ).rejects.toThrow(/CODEGEN_REPO_SLUG/);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd dps_backend && npx --yes pnpm@10.33.0 exec jest native-sdk-codegen/github-pr.service`
Expected: FAIL — `Cannot find module './github-pr.service'`.

- [ ] **Step 3: Write `github-pr.service.ts`**

```ts
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface OpenPrResult {
  status: 'no_changes' | 'skipped' | 'opened';
  prUrl?: string;
  prNumber?: number;
  supersededPrNumbers?: number[];
}

const CODEGEN_BRANCH_PREFIX = 'codegen/native-sdk-';

@Injectable()
export class GithubPrService {
  private readonly logger = new Logger(GithubPrService.name);

  constructor(private readonly configService: ConfigService) {}

  private enabled(): boolean {
    return this.configService.get<string>('CODEGEN_AUTO_PR') === 'true';
  }

  private repoSlug(): string {
    const slug = this.configService.get<string>('CODEGEN_REPO_SLUG');
    if (!slug) {
      throw new Error('CODEGEN_REPO_SLUG must be set to open a PR (owner/repo)');
    }
    return slug;
  }

  private baseBranch(): string {
    return this.configService.get<string>('CODEGEN_BASE_BRANCH') || 'main';
  }

  private baseApiUrl(): string {
    return this.configService.get<string>('GITHUB_BASE_URL') || 'https://api.github.com';
  }

  private headers(): Record<string, string> {
    const token = this.configService.get<string>('GITHUB_TOKEN');
    return {
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
      'User-Agent': 'DPS-SuperApp-Integration',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  }

  private async githubFetch<T>(path: string, init?: RequestInit): Promise<T> {
    const res = await fetch(`${this.baseApiUrl()}${path}`, {
      ...init,
      headers: { ...this.headers(), ...((init?.headers as Record<string, string>) || {}) },
    });
    if (!res.ok) {
      throw new Error(`GitHub API error on ${path} (${res.status}): ${await res.text()}`);
    }
    return res.json() as Promise<T>;
  }

  /**
   * Creates a branch, commit, and PR for the given changed files entirely
   * through the GitHub API, then closes any other open codegen PR against
   * the same base branch (superseded by this one, since regeneration always
   * covers every currently-approved vendor).
   */
  async openPrForChanges(changedFiles: Map<string, string>): Promise<OpenPrResult> {
    if (changedFiles.size === 0) {
      return { status: 'no_changes' };
    }
    if (!this.enabled()) {
      this.logger.log(
        `CODEGEN_AUTO_PR is not "true" — leaving ${changedFiles.size} regenerated file(s) unopened`,
      );
      return { status: 'skipped' };
    }

    const slug = this.repoSlug();
    const base = this.baseBranch();

    const baseRef = await this.githubFetch<{ object: { sha: string } }>(
      `/repos/${slug}/git/ref/heads/${base}`,
    );
    const baseSha = baseRef.object.sha;

    const baseCommit = await this.githubFetch<{ tree: { sha: string } }>(
      `/repos/${slug}/git/commits/${baseSha}`,
    );
    const baseTreeSha = baseCommit.tree.sha;

    const treeEntries: { path: string; mode: string; type: string; sha: string }[] = [];
    for (const [path, content] of changedFiles) {
      const blob = await this.githubFetch<{ sha: string }>(`/repos/${slug}/git/blobs`, {
        method: 'POST',
        body: JSON.stringify({ content, encoding: 'utf-8' }),
      });
      treeEntries.push({ path, mode: '100644', type: 'blob', sha: blob.sha });
    }

    const newTree = await this.githubFetch<{ sha: string }>(`/repos/${slug}/git/trees`, {
      method: 'POST',
      body: JSON.stringify({ base_tree: baseTreeSha, tree: treeEntries }),
    });

    const newCommit = await this.githubFetch<{ sha: string }>(`/repos/${slug}/git/commits`, {
      method: 'POST',
      body: JSON.stringify({
        message: 'chore(codegen): regenerate native SDK glue',
        tree: newTree.sha,
        parents: [baseSha],
      }),
    });

    const branch = `${CODEGEN_BRANCH_PREFIX}${Date.now()}`;
    await this.githubFetch(`/repos/${slug}/git/refs`, {
      method: 'POST',
      body: JSON.stringify({ ref: `refs/heads/${branch}`, sha: newCommit.sha }),
    });

    const pr = await this.githubFetch<{ html_url: string; number: number }>(
      `/repos/${slug}/pulls`,
      {
        method: 'POST',
        body: JSON.stringify({
          title: 'Regenerate native SDK glue',
          head: branch,
          base,
          body: [
            'Generated by the Native SDK codegen script.',
            '',
            'Review before merging:',
            '- vendor deployment target / minSdk compatibility',
            '- declared permissions (iOS Info.plist strings do not auto-merge)',
            '',
            'Files changed:',
            ...Array.from(changedFiles.keys()).map(f => `- \`${f}\``),
          ].join('\n'),
        }),
      },
    );

    const supersededPrNumbers = await this.closeSupersededPrs(slug, base, pr.html_url, pr.number);

    this.logger.log(`Opened PR ${pr.html_url}`);
    return { status: 'opened', prUrl: pr.html_url, prNumber: pr.number, supersededPrNumbers };
  }

  private async closeSupersededPrs(
    slug: string,
    base: string,
    newPrUrl: string,
    newPrNumber: number,
  ): Promise<number[]> {
    const closed: number[] = [];
    let openPrs: { number: number; head: { ref: string } }[];
    try {
      openPrs = await this.githubFetch<{ number: number; head: { ref: string } }[]>(
        `/repos/${slug}/pulls?state=open&base=${encodeURIComponent(base)}`,
      );
    } catch (err) {
      this.logger.error(
        `Failed to list open PRs while checking for superseded codegen PRs: ${err}`,
      );
      return closed;
    }

    const superseded = openPrs.filter(
      p => p.number !== newPrNumber && p.head.ref.startsWith(CODEGEN_BRANCH_PREFIX),
    );

    for (const old of superseded) {
      try {
        await this.githubFetch(`/repos/${slug}/issues/${old.number}/comments`, {
          method: 'POST',
          body: JSON.stringify({
            body: `Superseded by a newer native SDK codegen run: ${newPrUrl}`,
          }),
        });
        await this.githubFetch(`/repos/${slug}/pulls/${old.number}`, {
          method: 'PATCH',
          body: JSON.stringify({ state: 'closed' }),
        });
        closed.push(old.number);
      } catch (err) {
        this.logger.error(`Failed to close superseded codegen PR #${old.number}: ${err}`);
      }
    }

    return closed;
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd dps_backend && npx --yes pnpm@10.33.0 exec jest native-sdk-codegen/github-pr.service`
Expected: PASS, 6/6 tests, pristine output (no unhandled promise rejection warnings — the `closeSupersededPrs` failure path is caught, not thrown).

- [ ] **Step 5: Commit**

```bash
git add dps_backend/src/native-sdk-codegen/github-pr.service.ts dps_backend/src/native-sdk-codegen/github-pr.service.spec.ts
git commit -m "feat: rebuild GithubPrService on the Git Data API with superseded-PR closing"
```

---

### Task 4: Wire codegen into mini app approval

**Files:**
- Create: `dps_backend/src/native-sdk-codegen/native-sdk-codegen.module.ts`
- Create: `dps_backend/src/miniapps/miniapps.service.spec.ts` (new — this service has no existing test file; scope this spec to only the new approve()-triggered codegen behavior, not the whole 800+ line service)
- Modify: `dps_backend/src/miniapps/entities/miniapp.entity.ts`
- Modify: `dps_backend/src/miniapps/miniapps.module.ts`
- Modify: `dps_backend/src/miniapps/miniapps.service.ts`
- Modify: `dps_backend/.env.example`

**Interfaces:**
- Consumes: `NativeSdkCodegenService.regenerate()` (Task 2), `GithubPrService.openPrForChanges()` (Task 3, including its `OpenPrResult` type).
- Produces: nothing further downstream (leaf task) — `MiniApp.lastCodegenRun` becomes readable by any future caller (sub-project #3 will read it).

- [ ] **Step 1: Add the `lastCodegenRun` column**

Read `dps_backend/src/miniapps/entities/miniapp.entity.ts` in full first. Then add, near the other `jsonb` columns (e.g. after `permissions`):

```ts
  @Column({ type: 'jsonb', nullable: true })
  lastCodegenRun?: {
    status: 'no_changes' | 'skipped' | 'opened' | 'error';
    prUrl?: string;
    prNumber?: number;
    supersededPrNumbers?: number[];
    error?: string;
    timestamp: string;
  };
```

No migration file needed — `app.module.ts`'s TypeORM config has `synchronize: true`, so this column is created automatically the next time `dps_backend` boots against its dev database.

- [ ] **Step 2: Create the module**

Create `dps_backend/src/native-sdk-codegen/native-sdk-codegen.module.ts`:

```ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { MiniApp } from '../miniapps/entities/miniapp.entity';
import { IntegrationsModule } from '../integrations/integrations.module';
import { NativeSdkCodegenService } from './native-sdk-codegen.service';
import { GithubPrService } from './github-pr.service';

@Module({
  imports: [ConfigModule, TypeOrmModule.forFeature([MiniApp]), IntegrationsModule],
  providers: [NativeSdkCodegenService, GithubPrService],
  exports: [NativeSdkCodegenService, GithubPrService],
})
export class NativeSdkCodegenModule {}
```

(`IntegrationsModule` already exports `GitHubProvider`, which `NativeSdkCodegenService` needs — confirmed in `dps_backend/src/integrations/integrations.module.ts`'s `exports` array.)

- [ ] **Step 3: Import the new module into `MiniappsModule`**

Read `dps_backend/src/miniapps/miniapps.module.ts` in full first, then add the import:

```ts
import { NativeSdkCodegenModule } from '../native-sdk-codegen/native-sdk-codegen.module';
```

and add `NativeSdkCodegenModule` to the `imports` array (alongside the existing `IntegrationsModule`, `StorageModule`).

- [ ] **Step 4: Inject the new services into `MiniappsService` and call them in `approve()`**

Read `dps_backend/src/miniapps/miniapps.service.ts` in full first (it's a large file — locate the constructor and the `approve()` method specifically; don't restructure anything else in it).

Add to the top imports:

```ts
import { NativeSdkCodegenService } from '../native-sdk-codegen/native-sdk-codegen.service';
import { GithubPrService } from '../native-sdk-codegen/github-pr.service';
```

Add two new constructor parameters (alongside the existing ones, e.g. after `storageService`):

```ts
    private nativeSdkCodegen: NativeSdkCodegenService,
    private githubPr: GithubPrService,
```

Replace the existing `approve()` method body with:

```ts
  async approve(id: string, actorId: string) {
    const app = await this.findOne(id);
    if (!app) throw new BadRequestException('App not found');
    const validStatuses = ['IN_REVIEW', 'SUBMITTED'];
    if (!validStatuses.includes(app.status?.toUpperCase())) {
      throw new BadRequestException(`App is not in review (current status: ${app.status})`);
    }
    app.status = 'APPROVED';
    await this.miniappRepository.save(app);
    await this.logActivity(id, actorId, 'STATUS_CHANGE', 'Mini App Approved', 'App approved by SA Admin', 'APPROVE_MINI_APP', null, app);

    // Regenerate native glue for every approved NATIVE_SDK app. Only an approval
    // of a NATIVE_SDK app can change that generated output, so approving any other
    // integration method must not touch the mobile sources. Failure here must not
    // roll back an approval that is already persisted, so it is recorded, not thrown.
    if (app.integrationMethod?.toUpperCase() === 'NATIVE_SDK') {
      try {
        const { changedFiles } = await this.nativeSdkCodegen.regenerate();
        const result = await this.githubPr.openPrForChanges(changedFiles);
        app.lastCodegenRun = { ...result, timestamp: new Date().toISOString() };
      } catch (err: any) {
        this.logger.error(`Native SDK codegen failed after approving ${id}: ${err}`);
        app.lastCodegenRun = {
          status: 'error',
          error: err?.message || String(err),
          timestamp: new Date().toISOString(),
        };
      }
      await this.miniappRepository.save(app);
    }

    return app;
  }
```

- [ ] **Step 5: Document the new env vars**

Read `dps_backend/.env.example` in full first, then add after the existing `# Git Integration Settings` block:

```
# Native SDK Codegen (auto-PR on NATIVE_SDK approval)
CODEGEN_REPO_SLUG=owner/repo
CODEGEN_BASE_BRANCH=main
CODEGEN_AUTO_PR=false
```

- [ ] **Step 6: Write the failing test**

Create `dps_backend/src/miniapps/miniapps.service.spec.ts`. This mocks every constructor dependency (the service has many) but only exercises the new `approve()` codegen behavior:

```ts
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { MiniappsService } from './miniapps.service';
import { MiniApp } from './entities/miniapp.entity';
import { MiniAppActivity } from './entities/miniapp-activity.entity';
import { MiniAppIssue } from './entities/miniapp-issue.entity';
import { AuditService } from '../audit/audit.service';
import { MailService } from '../mail/mail.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PermissionsService } from '../permissions/permissions.service';
import { PermissionProposalsService } from '../permission-proposals/permission-proposals.service';
import { SuperAppService } from '../super-app/super-app.service';
import { GitIntegrationService } from '../integrations/git/git-integration.service';
import { NexusIntegrationService } from '../integrations/nexus/nexus-integration.service';
import { DomainVerificationService } from '../integrations/webview/domain-verification.service';
import { JenkinsService } from '../integrations/jenkins/jenkins.service';
import { StorageService } from '../storage/storage.service';
import { NativeSdkCodegenService } from '../native-sdk-codegen/native-sdk-codegen.service';
import { GithubPrService } from '../native-sdk-codegen/github-pr.service';

describe('MiniappsService.approve — native SDK codegen trigger', () => {
  let service: MiniappsService;
  let miniappRepository: { findOne: jest.Mock; save: jest.Mock };
  let regenerate: jest.Mock;
  let openPrForChanges: jest.Mock;

  function makeApp(overrides: Partial<MiniApp> = {}): MiniApp {
    return {
      id: 'app-1',
      status: 'IN_REVIEW',
      integrationMethod: 'NATIVE_SDK',
      validationStatus: 'PASSED',
      ...overrides,
    } as MiniApp;
  }

  async function setup(app: MiniApp) {
    miniappRepository = {
      findOne: jest.fn().mockResolvedValue(app),
      save: jest.fn().mockImplementation((a: MiniApp) => Promise.resolve(a)),
    };
    regenerate = jest.fn();
    openPrForChanges = jest.fn();

    const noop = {} as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MiniappsService,
        { provide: getRepositoryToken(MiniApp), useValue: miniappRepository },
        {
          provide: getRepositoryToken(MiniAppActivity),
          useValue: { create: jest.fn(x => x), save: jest.fn().mockResolvedValue({}) },
        },
        { provide: getRepositoryToken(MiniAppIssue), useValue: {} },
        { provide: AuditService, useValue: { log: jest.fn().mockResolvedValue({}) } },
        { provide: MailService, useValue: noop },
        { provide: NotificationsService, useValue: noop },
        { provide: PermissionsService, useValue: noop },
        { provide: PermissionProposalsService, useValue: noop },
        { provide: SuperAppService, useValue: noop },
        { provide: GitIntegrationService, useValue: noop },
        { provide: NexusIntegrationService, useValue: noop },
        { provide: DomainVerificationService, useValue: noop },
        { provide: JenkinsService, useValue: noop },
        { provide: StorageService, useValue: noop },
        { provide: NativeSdkCodegenService, useValue: { regenerate } },
        { provide: GithubPrService, useValue: { openPrForChanges } },
      ],
    }).compile();

    service = module.get<MiniappsService>(MiniappsService);
  }

  it('runs codegen and records the result for a NATIVE_SDK app', async () => {
    await setup(makeApp());
    regenerate.mockResolvedValue({ changedFiles: new Map([['a.swift', 'x']]) });
    openPrForChanges.mockResolvedValue({
      status: 'opened',
      prUrl: 'https://github.com/acme/dsp-poc/pull/1',
      prNumber: 1,
      supersededPrNumbers: [],
    });

    const result = await service.approve('app-1', 'actor-1');

    expect(regenerate).toHaveBeenCalled();
    expect(openPrForChanges).toHaveBeenCalledWith(new Map([['a.swift', 'x']]));
    expect(result.lastCodegenRun.status).toBe('opened');
    expect(result.lastCodegenRun.prUrl).toBe('https://github.com/acme/dsp-poc/pull/1');
    expect(miniappRepository.save).toHaveBeenCalledTimes(2); // approval save, then codegen-result save
  });

  it('records an error result and does not throw when codegen fails', async () => {
    await setup(makeApp());
    regenerate.mockRejectedValue(new Error('GitHub API error on /repos/... (500): boom'));

    const result = await service.approve('app-1', 'actor-1');

    expect(result.status).toBe('APPROVED'); // approval itself is not rolled back
    expect(result.lastCodegenRun.status).toBe('error');
    expect(result.lastCodegenRun.error).toContain('boom');
    expect(openPrForChanges).not.toHaveBeenCalled();
  });

  it('does not run codegen for a non-NATIVE_SDK app', async () => {
    await setup(makeApp({ integrationMethod: 'WEBVIEW' }));

    const result = await service.approve('app-1', 'actor-1');

    expect(regenerate).not.toHaveBeenCalled();
    expect(openPrForChanges).not.toHaveBeenCalled();
    expect(result.lastCodegenRun).toBeUndefined();
    expect(miniappRepository.save).toHaveBeenCalledTimes(1); // approval save only
  });
});
```

- [ ] **Step 7: Run test to verify it fails**

Run: `cd dps_backend && npx --yes pnpm@10.33.0 exec jest miniapps/miniapps.service`
Expected: FAIL — compile error, `Property 'nativeSdkCodegen' does not exist` or similar, since Step 4's constructor/approve() changes haven't been made yet if you're following TDD strictly. (If you already applied Steps 1-5 before writing this test, it will instead fail because the module wiring/DI graph is incomplete until all of Task 4 is done — either way, confirm it fails before Step 4's code exists, or re-order: write this test file, watch it fail to compile, then apply Steps 1-5.)

- [ ] **Step 8: Verify it passes and the whole app still boots**

Run: `cd dps_backend && npx --yes pnpm@10.33.0 exec jest miniapps/miniapps.service`
Expected: PASS, 3/3 tests.

Run: `cd dps_backend && npx --yes pnpm@10.33.0 run build`
Expected: `nest build` completes with no TypeScript errors.

Run: `cd dps_backend && npx --yes pnpm@10.33.0 run start:dev` (with a working `.env` pointing at a real Postgres instance), watch the startup log, then stop it (Ctrl+C).
Expected: Nest boots without a `Nest can't resolve dependencies of ...` error naming `NativeSdkCodegenService`, `GithubPrService`, or `GitHubProvider` — confirms the module wiring (Task 4 Steps 2-3) is correct, not just the TypeScript types.

- [ ] **Step 9: Run the full native-sdk-codegen + miniapps test suite together**

Run: `cd dps_backend && npx --yes pnpm@10.33.0 exec jest native-sdk-codegen miniapps/miniapps.service`
Expected: all pass, pristine output.

- [ ] **Step 10: Commit**

```bash
git add dps_backend/src/native-sdk-codegen/native-sdk-codegen.module.ts dps_backend/src/miniapps/entities/miniapp.entity.ts dps_backend/src/miniapps/miniapps.module.ts dps_backend/src/miniapps/miniapps.service.ts dps_backend/src/miniapps/miniapps.service.spec.ts dps_backend/.env.example
git commit -m "feat: trigger native SDK codegen + auto-PR on mini app approval"
```

---

## Self-Review Notes

- **Spec coverage:** GitHub-Contents-API-based `regenerate()` (Task 2), Git-Data-API-based `openPrForChanges` (Task 3), superseded-PR closing that doesn't fail the overall call (Task 3), `lastCodegenRun` one-shot result + wiring into `approve()` (Task 4), `NATIVE_SDK`-only scope (enforced in Task 4's `approve()` guard), `CODEGEN_AUTO_PR` safety switch (Task 3), env var documentation (Task 4) — every spec section has a corresponding task and step.
- **Placeholder scan:** no TBD/TODO; every step has literal, complete code.
- **Type consistency:** `changedFiles: Map<string, string>` is the exact same shape from Task 2's `regenerate()` return through Task 3's `openPrForChanges` parameter; `OpenPrResult`'s fields (`status, prUrl, prNumber, supersededPrNumbers`) match exactly what Task 4 spreads into `lastCodegenRun`.
