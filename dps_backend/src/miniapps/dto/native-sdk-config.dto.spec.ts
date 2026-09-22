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
