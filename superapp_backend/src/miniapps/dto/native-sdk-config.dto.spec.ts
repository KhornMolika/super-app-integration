import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { NativeSdkConfigDto } from './create-miniapp.dto';

const valid = {
  iosModuleName: 'SpaBookingSDK',
  iosTypeName: 'SpaBookingSDKView',
  iosArtifactFilename: 'SpaBookingSDK.xcframework.zip',
  androidPackageName: 'com.example.spabooking',
  androidObjectName: 'SpaBookingSDK',
  androidArtifactFilename: 'spa-booking-sdk-1.0.0.aar',
  androidMavenGroupId: 'com.fsa.sdk',
  androidMavenArtifactId: 'spa-booking-sdk',
  androidMavenVersion: '1.0.0',
};

const errorsFor = async (overrides: Record<string, string>) =>
  (
    await validate(
      plainToInstance(NativeSdkConfigDto, { ...valid, ...overrides }),
    )
  ).map((e) => e.property);

describe('NativeSdkConfigDto allow-list validation', () => {
  it('accepts valid values', async () => {
    expect(await errorsFor({})).toEqual([]);
  });

  it.each([
    ['iosModuleName', 'Bad"Name'],
    ['iosTypeName', 'A B'],
    ['androidPackageName', 'com.example."x'],
    ['androidObjectName', 'X") ; exec //'],
    ['androidMavenGroupId', 'com.fsa$sdk'],
    ['androidMavenArtifactId', 'a\nb'],
    ['androidMavenVersion', '1.0.0")\nexec'],
  ])('rejects hostile %s', async (field, value) => {
    expect(await errorsFor({ [field]: value })).toContain(field);
  });
});

describe('NativeSdkConfigDto platforms', () => {
  const ios = {
    iosModuleName: valid.iosModuleName,
    iosTypeName: valid.iosTypeName,
    iosArtifactFilename: valid.iosArtifactFilename,
  };
  const android = {
    androidPackageName: valid.androidPackageName,
    androidObjectName: valid.androidObjectName,
    androidArtifactFilename: valid.androidArtifactFilename,
    androidMavenGroupId: valid.androidMavenGroupId,
    androidMavenArtifactId: valid.androidMavenArtifactId,
    androidMavenVersion: valid.androidMavenVersion,
  };
  const errorsOf = async (body: Record<string, string>) =>
    (await validate(plainToInstance(NativeSdkConfigDto, body))).map((e) => e.property);

  it('accepts an Android-only SDK, with or without empty iOS fields', async () => {
    expect(await errorsOf(android)).toEqual([]);
    expect(await errorsOf({ ...android, iosModuleName: '', iosTypeName: '  ' })).toEqual([]);
  });

  it('accepts an iOS-only SDK', async () => {
    expect(await errorsOf(ios)).toEqual([]);
  });

  it('a started platform must be complete', async () => {
    expect(await errorsOf({ ...android, iosModuleName: 'SpaSDK' })).toEqual(
      expect.arrayContaining(['iosTypeName', 'iosArtifactFilename']),
    );
    expect(await errorsOf({ ...ios, androidPackageName: 'com.x' })).toEqual(
      expect.arrayContaining(['androidObjectName', 'androidMavenVersion']),
    );
  });

  it('with neither platform, asks for Android', async () => {
    expect(await errorsOf({})).toEqual(expect.arrayContaining(['androidPackageName', 'androidObjectName']));
  });

  it('still rejects hostile values on the platform that is sent', async () => {
    expect(await errorsOf({ ...android, androidObjectName: 'X") ; exec //' })).toContain('androidObjectName');
  });
});
