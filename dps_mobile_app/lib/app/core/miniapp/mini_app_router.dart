import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:get/get.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../config/api_config.dart';
import '../../routes/app_pages.dart';
import '../../services/auth_service.dart';
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

    // Safely parse JSON string configuration if needed
    dynamic parsedConfig = config;
    if (parsedConfig is String && parsedConfig.trim().isNotEmpty) {
      try {
        parsedConfig = jsonDecode(parsedConfig);
      } catch (_) {}
    }

    final packageName = (parsedConfig is Map ? (parsedConfig['packageName'] ?? '') : '').toString();

    // 1. FLUTTER PACKAGE INTEGRATION
    if (integrationMethod == 'FLUTTER_PACKAGE') {
      final candidateKeys = <String>[
        packageName,
        appId,
        name,
      ];

      // Also extract package name from Git URL if present
      if (parsedConfig is Map && parsedConfig['gitUrl'] != null) {
        final gitUrl = parsedConfig['gitUrl'].toString();
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
      if (parsedConfig is Map && parsedConfig['urlScheme'] != null) {
        final urlScheme = parsedConfig['urlScheme'].toString();
        final uri = Uri.parse(urlScheme);
        try {
          final launched = await launchUrl(uri, mode: LaunchMode.externalApplication);
          if (!launched) {
            final fallbackUrl = parsedConfig['fallbackUrl'] ??
                parsedConfig['appStoreUrl'] ??
                parsedConfig['playStoreUrl'];
            if (fallbackUrl != null && fallbackUrl.toString().isNotEmpty) {
              await launchUrl(Uri.parse(fallbackUrl.toString()),
                  mode: LaunchMode.externalApplication);
            } else {
              Get.snackbar(
                'Launch Failed',
                'Deep link could not be opened and no fallback URL was provided.',
                snackPosition: SnackPosition.BOTTOM,
                backgroundColor: Colors.amber.shade50,
                colorText: Colors.amber.shade900,
                icon: const Icon(Icons.warning_amber_rounded, color: Colors.amber),
              );
            }
          }
        } catch (e) {
          Get.snackbar(
            'Launch Failed',
            'Could not open deep link: $e',
            snackPosition: SnackPosition.BOTTOM,
            backgroundColor: Colors.red.shade50,
            colorText: Colors.red.shade900,
            icon: const Icon(Icons.error_outline, color: Colors.red),
          );
        }
      }
      return;
    }

    // 3. NATIVE SDK INTEGRATION (Universal Native Launcher)
    if (integrationMethod == 'NATIVE_SDK') {
      try {
        const platform = MethodChannel('superapp/native_launcher');
        final authService = Get.isRegistered<AuthService>() ? Get.find<AuthService>() : null;

        final isAndroid = !kIsWeb && defaultTargetPlatform == TargetPlatform.android;
        final isIOS = !kIsWeb && defaultTargetPlatform == TargetPlatform.iOS;

        String? entryClass;
        if (parsedConfig is Map) {
          if (isAndroid) {
            entryClass = parsedConfig['androidEntryClass'] ?? parsedConfig['entryClass'];
          } else if (isIOS) {
            entryClass = parsedConfig['iosEntryClass'] ?? parsedConfig['entryClass'];
          } else {
            entryClass = parsedConfig['entryClass'];
          }
        }

        if (entryClass == null || entryClass.isEmpty) {
          Get.snackbar(
            'Configuration Missing',
            'Native entry class not configured for this platform.',
            snackPosition: SnackPosition.BOTTOM,
            backgroundColor: Colors.amber.shade50,
            colorText: Colors.amber.shade900,
            icon: const Icon(Icons.warning_amber_rounded, color: Colors.amber),
          );
          return;
        }

        final Map<String, dynamic> params = {};
        if (parsedConfig is Map) {
          parsedConfig.forEach((key, val) {
            params[key.toString()] = val;
          });
        }
        params['appId'] = appId;
        params['name'] = name;

        await platform.invokeMethod('launch', {
          'entryClass': entryClass,
          'userId': authService?.userId ?? '',
          'authToken': authService?.token ?? '',
          'params': params,
        });
      } on PlatformException catch (pe) {
        Get.snackbar(
          'Native Launch Failed',
          pe.message ?? 'Could not launch native mini app',
          snackPosition: SnackPosition.BOTTOM,
          backgroundColor: Colors.red.shade50,
          colorText: Colors.red.shade900,
          icon: const Icon(Icons.error_outline, color: Colors.red),
        );
      } catch (e) {
        Get.snackbar(
          'Launch Failed',
          'Failed to invoke native launcher: $e',
          snackPosition: SnackPosition.BOTTOM,
          backgroundColor: Colors.red.shade50,
          colorText: Colors.red.shade900,
          icon: const Icon(Icons.error_outline, color: Colors.red),
        );
      }
      return;
    }

    // 4. WEBVIEW INTEGRATION (Default)
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
