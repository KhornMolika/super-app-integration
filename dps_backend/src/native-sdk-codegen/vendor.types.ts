/**
 * One NATIVE_SDK mini app as seen by the codegen. Built from the mini app's
 * `integrationConfig` (NativeSdkConfigDto fields + the Nexus URLs stored by
 * SdkArtifactUploadService) plus the Nexus repo base URLs from env.
 */
export interface NativeSdkVendor {
  appId: string;

  iosModuleName: string;
  iosTypeName: string;
  /** Pod version. Optional: falls back to the version in `iosNexusZipUrl`, then 1.0.0. */
  iosVersion?: string;
  iosNexusZipUrl?: string;
  /** Nexus CocoaPods specs repo, e.g. http://nexus:8081/repository/cocoapods-specs/ */
  cocoapodsSpecsUrl: string;

  androidPackageName: string;
  androidObjectName: string;
  androidMavenGroupId: string;
  androidMavenArtifactId: string;
  androidMavenVersion: string;
  androidNexusMavenUrl?: string;
  /** Nexus Maven repo, e.g. http://nexus:8081/repository/maven-sdk-hosted/ */
  mavenRepoUrl: string;
}
