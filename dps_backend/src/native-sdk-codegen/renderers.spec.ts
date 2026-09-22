import { replaceMarkedRegion } from './marker';
import {
  NATIVE_SDK_MARKED_REGIONS,
  escapeLiteral,
  escapeRubySingle,
  beginMarker,
  endMarker,
  identifierFor,
  podVersionFor,
  renderAndroidHandlers,
  renderAndroidImports,
  renderGradleLines,
  renderGradleSources,
  renderIosHandlers,
  renderIosImports,
  podspecUrlFor,
  renderPodfileLines,
  renderPodfileSources,
} from './renderers';
import { NativeSdkVendor } from './vendor.types';

const permit: NativeSdkVendor = {
  appId: 'permit_check',
  iosModuleName: 'PermitCheckSDK',
  iosTypeName: 'PermitCheck',
  iosNexusZipUrl:
    'http://nexus:8081/repository/raw-sdk-artifacts/PermitCheckSDK/2.1.0/PermitCheckSDK.xcframework.zip',
  cocoapodsSpecsUrl: 'http://nexus:8081/repository/cocoapods-specs',
  androidPackageName: 'com.dspvendor.permit',
  androidObjectName: 'PermitCheck',
  androidMavenGroupId: 'com.fsa.sdk',
  androidMavenArtifactId: 'permit-check-sdk',
  androidMavenVersion: '2.1.0',
  mavenRepoUrl: 'http://nexus:8081/repository/maven-sdk-hosted/',
};

const parking: NativeSdkVendor = {
  ...permit,
  appId: 'parking.pass',
  iosModuleName: 'ParkingPassSDK',
  iosTypeName: 'ParkingPass',
  iosVersion: '1.0.0',
  iosNexusZipUrl: undefined,
  androidPackageName: 'com.dspvendor.parking',
  androidObjectName: 'ParkingPass',
  androidMavenArtifactId: 'parking-pass',
  androidMavenVersion: '1.0.0',
};

describe('identifierFor', () => {
  it('replaces non-alphanumerics', () => {
    expect(identifierFor('parking.pass')).toBe('parking_pass');
  });
});

describe('renderers with no vendors', () => {
  it('all return an empty string', () => {
    expect(renderIosImports([])).toBe('');
    expect(renderIosHandlers([])).toBe('');
    expect(renderAndroidImports([])).toBe('');
    expect(renderAndroidHandlers([])).toBe('');
    expect(renderPodfileLines([])).toBe('');
    expect(renderPodfileSources([])).toBe('');
    expect(renderGradleLines([])).toBe('');
    expect(renderGradleSources([])).toBe('');
  });
});

describe('imports', () => {
  it('emit one import per vendor', () => {
    expect(renderIosImports([permit, parking])).toBe(
      'import PermitCheckSDK\nimport ParkingPassSDK',
    );
    expect(renderAndroidImports([permit, parking])).toBe(
      'import com.dspvendor.permit.PermitCheck\nimport com.dspvendor.parking.ParkingPass',
    );
  });
});

describe('podVersionFor', () => {
  it('prefers the explicit version, then the zip URL, then 1.0.0', () => {
    expect(podVersionFor(parking)).toBe('1.0.0');
    expect(podVersionFor(permit)).toBe('2.1.0');
    expect(podVersionFor({ ...permit, iosNexusZipUrl: undefined })).toBe(
      '1.0.0',
    );
  });
});

describe('Podfile renderers', () => {
  it('renders pods pinned by :podspec URL (no :path)', () => {
    const out = renderPodfileLines([permit, parking]);
    expect(out).toBe(
      "  pod 'PermitCheckSDK', :podspec => 'http://nexus:8081/repository/cocoapods-specs/Specs/PermitCheckSDK/2.1.0/PermitCheckSDK.podspec'\n  pod 'ParkingPassSDK', :podspec => 'http://nexus:8081/repository/cocoapods-specs/Specs/ParkingPassSDK/1.0.0/ParkingPassSDK.podspec'",
    );
    expect(podspecUrlFor(permit)).toBe(
      'http://nexus:8081/repository/cocoapods-specs/Specs/PermitCheckSDK/2.1.0/PermitCheckSDK.podspec',
    );
    expect(out).not.toContain(':path');
    expect(out).not.toContain('vendor-artifacts');
  });

  it('renders an empty SOURCES body (Nexus raw is not a Specs source)', () => {
    expect(renderPodfileSources([permit, parking])).toBe('');
  });
});

describe('Gradle renderers', () => {
  it('renders maven coordinates (no files())', () => {
    const out = renderGradleLines([permit, parking]);
    expect(out).toBe(
      '    implementation("com.fsa.sdk:permit-check-sdk:2.1.0")\n    implementation("com.fsa.sdk:parking-pass:1.0.0")',
    );
    expect(out).not.toContain('files(');
    expect(out).not.toContain('vendor-artifacts');
  });

  it('renders a Kotlin-DSL maven block, de-duplicated, http allowed', () => {
    expect(renderGradleSources([permit, parking])).toBe(
      '    maven {\n        url = uri("http://nexus:8081/repository/maven-sdk-hosted/")\n        isAllowInsecureProtocol = true\n    }',
    );
  });

  it('does not allow insecure protocol for https', () => {
    const out = renderGradleSources([
      { ...permit, mavenRepoUrl: 'https://nexus.example.com/repo/m/' },
    ]);
    expect(out).toContain('uri("https://nexus.example.com/repo/m/")');
    expect(out).not.toContain('isAllowInsecureProtocol');
  });
});

describe('iOS handlers', () => {
  it('emits a self-contained channel per vendor', () => {
    const out = renderIosHandlers([permit, parking]);
    expect(out).toContain('name: "com.example.dsp_mobile/permit_check"');
    expect(out).toContain('name: "com.example.dsp_mobile/parking_pass"');
    expect(out).toContain('PermitCheck.initialize(userId: userId');
    expect(out).toContain('ParkingPass.present(from: presenter)');
    expect(out).toContain('"already in progress"');
    expect(out).toContain('\n\n    let channel_parking_pass');
  });
});

describe('Android handlers', () => {
  it('emits a MethodChannel per vendor', () => {
    const out = renderAndroidHandlers([permit, parking]);
    expect(out).toContain(
      'MethodChannel(messenger, "com.example.dsp_mobile/permit_check")',
    );
    expect(out).toContain(
      'MethodChannel(messenger, "com.example.dsp_mobile/parking_pass")',
    );
    expect(out).toContain('PermitCheck.initialize(userId, jwtToken)');
    expect(out).toContain('ParkingPass.present(this) {');
  });
});

describe('marker table', () => {
  it('targets mobile-super-app paths', () => {
    expect(NATIVE_SDK_MARKED_REGIONS.mainActivity.path).toBe(
      'android/app/src/main/kotlin/com/example/dsp_mobile/MainActivity.kt',
    );
  });

  it('lists 8 regions over 4 files', () => {
    const all = Object.values(NATIVE_SDK_MARKED_REGIONS).flatMap(
      (f) => f.regions,
    );
    expect(Object.keys(NATIVE_SDK_MARKED_REGIONS)).toHaveLength(4);
    expect(all).toHaveLength(8);
  });

  it('produces marker lines that replaceMarkedRegion accepts', () => {
    const file = [
      'x',
      beginMarker('#', 'PODS'),
      'old',
      endMarker('#', 'PODS'),
      'y',
    ].join('\n');
    expect(replaceMarkedRegion(file, 'PODS', 'new')).toBe(
      ['x', beginMarker('#', 'PODS'), 'new', endMarker('#', 'PODS'), 'y'].join(
        '\n',
      ),
    );
    expect(beginMarker('//', 'IMPORTS')).toBe(
      '// === GENERATED NATIVE SDK IMPORTS — DO NOT EDIT ===',
    );
    expect(endMarker('#', 'PODS')).toBe(
      '# === END GENERATED NATIVE SDK PODS ===',
    );
  });
});

describe('idempotency', () => {
  const fileFor = (p: '#' | '//', regions: string[]) =>
    [
      'head',
      ...regions.flatMap((r) => [beginMarker(p, r), endMarker(p, r)]),
      'tail',
    ].join('\n');

  it('re-rendering a region yields an identical file', () => {
    const vendors = [permit, parking];
    let file = fileFor('//', ['IMPORTS', 'HANDLERS']);
    const apply = (f: string) =>
      replaceMarkedRegion(
        replaceMarkedRegion(f, 'IMPORTS', renderAndroidImports(vendors)),
        'HANDLERS',
        renderAndroidHandlers(vendors),
      );
    file = apply(file);
    expect(apply(file)).toBe(file);
    expect(file.startsWith('head\n')).toBe(true);
    expect(file.endsWith('\ntail')).toBe(true);
  });

  it('replaces (not appends) when the vendor set shrinks', () => {
    let file = fileFor('#', ['SOURCES', 'PODS']);
    file = replaceMarkedRegion(
      file,
      'PODS',
      renderPodfileLines([permit, parking]),
    );
    file = replaceMarkedRegion(file, 'PODS', renderPodfileLines([permit]));
    expect(file).toContain("pod 'PermitCheckSDK'");
    expect(file).not.toContain('ParkingPassSDK');
  });
});

describe('input validation (hostile vendor strings)', () => {
  const hostile = ['a"b', "a'b", 'a$b', 'a\\b', 'a\nb', 'X") ; exec //', ''];
  const cases: Array<
    [string, keyof NativeSdkVendor, (v: NativeSdkVendor[]) => string]
  > = [
    ['iosModuleName', 'iosModuleName', renderIosImports],
    ['iosModuleName', 'iosModuleName', renderPodfileLines],
    ['androidPackageName', 'androidPackageName', renderAndroidImports],
    ['androidObjectName', 'androidObjectName', renderAndroidImports],
    ['iosTypeName', 'iosTypeName', renderIosHandlers],
    ['androidObjectName', 'androidObjectName', renderAndroidHandlers],
    ['androidMavenGroupId', 'androidMavenGroupId', renderGradleLines],
    ['androidMavenArtifactId', 'androidMavenArtifactId', renderGradleLines],
    ['androidMavenVersion', 'androidMavenVersion', renderGradleLines],
    ['iosVersion', 'iosVersion', renderPodfileLines],
    ['cocoapodsSpecsUrl', 'cocoapodsSpecsUrl', renderPodfileSources],
    ['cocoapodsSpecsUrl', 'cocoapodsSpecsUrl', renderPodfileLines],
    ['mavenRepoUrl', 'mavenRepoUrl', renderGradleSources],
  ];

  it.each(cases)('%s rejects hostile values in %#', (name, field, render) => {
    for (const bad of hostile) {
      // empty iosVersion means "not set" and falls back to the default
      if (bad === '' && field === 'iosVersion') continue;
      expect(() => render([{ ...permit, [field]: bad }])).toThrow(
        new RegExp(`"${name}"`),
      );
    }
  });

  it('rejects non-http URLs and URLs with quotes/newlines', () => {
    for (const bad of [
      'file:///etc/passwd',
      'ftp://x/y',
      'http://n/"x',
      'http://n/\nx',
      'http://n/$(x)',
      undefined as unknown as string,
    ]) {
      expect(() =>
        renderGradleSources([{ ...permit, mavenRepoUrl: bad }]),
      ).toThrow(/mavenRepoUrl/);
      expect(() =>
        renderPodfileSources([{ ...permit, cocoapodsSpecsUrl: bad }]),
      ).toThrow(/cocoapodsSpecsUrl/);
    }
  });

  it('rejects a hostile version parsed from iosNexusZipUrl', () => {
    expect(() =>
      renderPodfileLines([
        {
          ...permit,
          iosNexusZipUrl: "http://n/x/1'.0/x.xcframework.zip",
        },
      ]),
    ).toThrow(/iosVersion/);
  });

  it('names the offending vendor in the message', () => {
    expect(() =>
      renderGradleLines([{ ...permit, androidMavenGroupId: 'a"b' }]),
    ).toThrow(/permit_check/);
  });

  it('accepts valid values (dotted package, +/- versions, https)', () => {
    const ok: NativeSdkVendor = {
      ...permit,
      androidPackageName: 'com.a_b.c1',
      androidMavenGroupId: 'com.fsa-x.sdk',
      androidMavenVersion: '1.2.3-beta+4',
      iosVersion: '1.2.3-beta+4',
      mavenRepoUrl: 'https://nexus.example.com/repository/m',
    };
    expect(() => {
      renderAndroidImports([ok]);
      renderGradleLines([ok]);
      renderGradleSources([ok]);
      renderPodfileLines([ok]);
    }).not.toThrow();
  });

  it('throws when two appIds collapse to the same identifier', () => {
    const a = { ...permit, appId: 'a.b' };
    const b = { ...permit, appId: 'a_b' };
    expect(() => renderIosHandlers([a, b])).toThrow(
      /both map to identifier "a_b"/,
    );
    expect(() => renderAndroidHandlers([a, b])).toThrow(/a_b/);
  });

  it('escape helpers neutralise quotes, backslashes and $', () => {
    expect(escapeLiteral('a"b\\c$d')).toBe('a\\"b\\\\c\\$d');
    expect(escapeRubySingle("a'b\\c")).toBe("a\\'b\\\\c");
  });
});
