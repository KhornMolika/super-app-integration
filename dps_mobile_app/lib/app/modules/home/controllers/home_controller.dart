import 'package:get/get.dart';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import 'package:url_launcher/url_launcher.dart';
import '../../../services/auth_service.dart';
import '../../../routes/app_pages.dart';
import 'package:dps_mobile_app/app/config/api_config.dart';

class HomeController extends GetxController {
  var miniApps = [].obs;
  var isLoading = true.obs;
  var hasError = false.obs;
  var selectedIndex = 0.obs;

  @override
  void onInit() {
    super.onInit();
    fetchMiniApps();
  }

  void changeTabIndex(int index) {
    selectedIndex.value = index;
  }

  String get userName {
    try {
      final auth = Get.find<AuthService>();
      if (auth.userName.isNotEmpty) {
        return auth.userName;
      }
    } catch (_) {}
    return 'Sokha Chan';
  }

  dynamic get featuredApp {
    // Prioritize mini app under active testing, then first available
    final testing = miniApps.firstWhereOrNull(
      (a) => (a['status'] ?? '').toString().toUpperCase() == 'TESTING',
    );
    if (testing != null) return testing;
    return miniApps.isNotEmpty ? miniApps.first : null;
  }

  Future<void> fetchMiniApps() async {
    try {
      isLoading(true);
      hasError(false);
      
      final baseUrl = ApiConfig.baseUrl;

      final headers = <String, String>{
        'Content-Type': 'application/json',
      };

      try {
        final authService = Get.find<AuthService>();
        if (authService.token.isNotEmpty) {
          headers['Authorization'] = 'Bearer ${authService.token}';
        }
      } catch (_) {}

      final response = await http.get(
        Uri.parse('$baseUrl/mini-apps'),
        headers: headers,
      ).timeout(const Duration(seconds: 4));
      
      if (response.statusCode == 200) {
        final List<dynamic> allApps = json.decode(response.body);
        // Display Approved, Active, and Testing mini apps
        miniApps.value = allApps.where((app) {
          final s = (app['status'] ?? '').toString().toUpperCase();
          return s == 'APPROVED' || s == 'PUBLISHED' || s == 'ACTIVE' || s == 'TESTING';
        }).toList();
      } else {
        hasError(true);
      }
    } catch (e) {
      debugPrint("Error fetching mini apps from backend: $e");
      hasError(true);
    } finally {
      isLoading(false);
    }
  }

  Future<void> launchMiniApp(dynamic app) async {
    if (app == null) return;

    final redirectUri = app['redirectUri'];
    if (redirectUri != null && redirectUri.isNotEmpty) {
      Get.toNamed(redirectUri);
      return;
    }

    final integrationMethod = app['integrationMethod'];
    final appId = app['appId'];
    final name = (app['name'] ?? '').toString();

    if (integrationMethod == 'FLUTTER_PACKAGE' || appId == 'com.fsa.trust_regulator' || name.contains('Trust Regulator')) {
      Get.toNamed(Routes.TRUST_REGULATOR);
      return;
    }
    if (integrationMethod == 'DEEP_LINK') {
      final config = app['integrationConfig'];
      if (config != null && config['urlScheme'] != null) {
        final urlScheme = config['urlScheme'];
        final uri = Uri.parse(urlScheme);
        try {
          await launchUrl(uri, mode: LaunchMode.externalApplication);
        } catch (e) {
          Get.snackbar('Error', 'Failed to launch URL: $e');
        }
      }
      return;
    }

    String url = app['url'] ?? 
        (app['integrationConfig'] is Map ? app['integrationConfig']['productionUrl'] : null) ?? 
        ApiConfig.baseUrl;
    url = ApiConfig.resolveUrl(url);
    Get.toNamed(Routes.MINIAPP, arguments: {
      'url': url,
      'permissions': app['permissions'] ?? [],
      'name': app['name'] ?? 'Mini App',
    });
  }
}
