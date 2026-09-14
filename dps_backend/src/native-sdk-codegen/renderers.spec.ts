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
