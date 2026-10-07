import { Injectable, Logger } from '@nestjs/common';
import {
  type SecurityCheckMetadata,
  SECURITY_CHECK_METADATA,
  STAGE_CATALOG,
  type StageCatalogItem,
  getDefaultChecksForMethod,
  buildDynamicValidationStages,
} from './validation-stage.catalog';
import { WebViewSecurityScanner } from './scanners/webview-security.scanner';
import { FlutterPackageSecurityScanner } from './scanners/flutter-package-security.scanner';
import { NativeSdkSecurityScanner } from './scanners/native-sdk-security.scanner';
import { DeepLinkSecurityScanner } from './scanners/deep-link-security.scanner';

export type { SecurityCheckMetadata, StageCatalogItem };
export {
  SECURITY_CHECK_METADATA,
  STAGE_CATALOG,
  getDefaultChecksForMethod,
  buildDynamicValidationStages,
};

@Injectable()
export class LocalSecurityScannerService {
  private readonly logger = new Logger(LocalSecurityScannerService.name);

  constructor(
    private readonly webViewScanner: WebViewSecurityScanner,
    private readonly flutterPackageScanner: FlutterPackageSecurityScanner,
    private readonly nativeSdkScanner: NativeSdkSecurityScanner,
    private readonly deepLinkScanner: DeepLinkSecurityScanner,
  ) {}

  /**
   * Performs a dynamic, real-time security scan for WebView Mini Apps
   */
  async scanWebView(
    miniAppId: string,
    options?: { fallbackReason?: string; securityChecks?: string[] },
  ): Promise<void> {
    return this.webViewScanner.scan(miniAppId, options);
  }

  /**
   * Performs a dynamic security scan for Flutter Package Mini Apps
   */
  async scanFlutterPackage(
    miniAppId: string,
    options?: { fallbackReason?: string; securityChecks?: string[] },
  ): Promise<void> {
    return this.flutterPackageScanner.scan(miniAppId, options);
  }

  /**
   * Performs dynamic security scan for Native SDK Mini Apps
   */
  async scanNativeSdk(
    miniAppId: string,
    options?: { fallbackReason?: string; securityChecks?: string[] },
  ): Promise<void> {
    return this.nativeSdkScanner.scan(miniAppId, options);
  }

  /**
   * Performs dynamic security scan for Deep Link Mini Apps
   */
  async scanDeepLink(
    miniAppId: string,
    options?: { fallbackReason?: string; securityChecks?: string[] },
  ): Promise<void> {
    return this.deepLinkScanner.scan(miniAppId, options);
  }

  /**
   * Universal scanner dispatcher
   */
  async scanMiniApp(
    miniAppId: string,
    method: 'WEBVIEW' | 'FLUTTER_PACKAGE' | 'NATIVE_SDK' | 'DEEP_LINK',
    options?: { fallbackReason?: string; securityChecks?: string[] },
  ): Promise<void> {
    switch (method) {
      case 'FLUTTER_PACKAGE':
        return this.scanFlutterPackage(miniAppId, options);
      case 'NATIVE_SDK':
        return this.scanNativeSdk(miniAppId, options);
      case 'DEEP_LINK':
        return this.scanDeepLink(miniAppId, options);
      case 'WEBVIEW':
      default:
        return this.scanWebView(miniAppId, options);
    }
  }
}
