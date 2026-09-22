import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../config/api_config.dart';
import '../../routes/app_pages.dart';
import 'mini_app_registry.dart';
import '../../modules/miniapp/views/mini_app_standby_view.dart';

class MiniAppRouter {
  /// Launches a mini app dynamically based on its declared integrationMethod and configuration.
  static Future<void> launch(dynamic app) async {
    if (app == null) return;

    final redirectUri = app['redirectUri'];
    if (redirectUri != null && redirectUri.toString().isNotEmpty) {
      Get.toNamed(redirectUri.toString());
      return;
    }

    final integrationMethod = (app['integrationMethod'] ?? '').toString().toUpperCase();
    final appId = (app['appId'] ?? app['id'] ?? '').toString();
    final name = (app['name'] ?? 'Mini App').toString();
    final config = app['integrationConfig'];
    final packageName = (config is Map ? (config['packageName'] ?? '') : '').toString();

    // 1. FLUTTER PACKAGE INTEGRATION
    if (integrationMethod == 'FLUTTER_PACKAGE') {
      final candidateKeys = <String>[
        packageName,
        appId,
        name,
      ];

      // Also extract package name from Git URL if present
      if (config is Map && config['gitUrl'] != null) {
        final gitUrl = config['gitUrl'].toString();
        final match = RegExp(r'[\/:]([^\/:]+?)(\.git)?$').firstMatch(gitUrl);
        if (match != null && match.group(1) != null) {
          candidateKeys.add(match.group(1)!);
        }
      }

      String? matchedKey;
      for (final key in candidateKeys) {
        if (key.isNotEmpty && MiniAppRegistry.isRegistered(key)) {
          matchedKey = key;
          break;
        }
      }

      if (matchedKey != null) {
        Get.to(() => Scaffold(
          body: Builder(builder: (ctx) {
            final widget = MiniAppRegistry.build(matchedKey!, ctx, app);
            return widget ?? MiniAppStandbyView(app: app);
          }),
        ));
        return;
      }

      // Check predefined named routes fallback
      final lowerPkg = packageName.toLowerCase();
      final lowerAppId = appId.toLowerCase();
      final lowerName = name.toLowerCase();

      if (lowerPkg.contains('transit') || lowerPkg.contains('public') || lowerAppId.contains('transit') || lowerName.contains('transit')) {
        Get.toNamed(Routes.SC_PUBLIC_TRANSIT, arguments: app);
        return;
      }
      if (lowerPkg.contains('loyalty') || lowerPkg.contains('private') || lowerAppId.contains('loyalty') || lowerName.contains('loyalty')) {
        Get.toNamed(Routes.SC_PRIVATE_LOYALTY, arguments: app);
        return;
      }
      if (lowerPkg.contains('trust_regulator') || lowerAppId.contains('trust_regulator') || lowerName.contains('trust regulator')) {
        Get.toNamed(Routes.TRUST_REGULATOR, arguments: app);
        return;
      }
      if (lowerPkg.contains('kyc') || lowerAppId.contains('kyc') || lowerName.contains('kyc')) {
        Get.toNamed(Routes.KYC_VERIFIER, arguments: app);
        return;
      }

      // Package is registered but uncompiled into the current binary
      Get.to(() => MiniAppStandbyView(app: app));
      return;
    }

    // 2. DEEP LINK INTEGRATION
    if (integrationMethod == 'DEEP_LINK') {
      if (config is Map && config['urlScheme'] != null) {
        final urlScheme = config['urlScheme'].toString();
        final uri = Uri.parse(urlScheme);
        try {
          final launched = await launchUrl(uri, mode: LaunchMode.externalApplication);
          if (!launched && config['fallbackUrl'] != null) {
            await launchUrl(Uri.parse(config['fallbackUrl'].toString()), mode: LaunchMode.externalApplication);
          }
        } catch (e) {
          Get.snackbar('Launch Failed', 'Could not open deep link: $e',
              snackPosition: SnackPosition.BOTTOM,
              backgroundColor: Colors.red.shade50,
              colorText: Colors.red.shade900);
        }
      }
      return;
    }

    // 3. NATIVE SDK INTEGRATION
    if (integrationMethod == 'NATIVE_SDK') {
      Get.defaultDialog(
        title: 'Native SDK Mini App',
        middleText: 'Initiating native SDK runtime bridge for "$name" ($appId)...',
        confirm: ElevatedButton.icon(
          icon: const Icon(Icons.check, size: 16),
          label: const Text('OK'),
          onPressed: () => Get.back(),
        ),
      );
      return;
    }

    // 4. WEBVIEW INTEGRATION (Default)
    dynamic parsedConfig = config;
    if (parsedConfig is String) {
      try {
        parsedConfig = jsonDecode(parsedConfig);
      } catch (_) {}
    }

    String? extractedUrl = app['url'];
    if (parsedConfig is Map) {
      extractedUrl ??= parsedConfig['productionUrl'] ?? parsedConfig['stagingUrl'] ?? parsedConfig['url'];
    }
    String url = extractedUrl ?? (kIsWeb ? 'http://localhost:3003' : ApiConfig.baseUrl);
    url = ApiConfig.resolveUrl(url);

    Get.toNamed(Routes.MINIAPP, arguments: {
      'url': url,
      'permissions': app['permissions'] ?? [],
      'name': name,
    });
  }
}
