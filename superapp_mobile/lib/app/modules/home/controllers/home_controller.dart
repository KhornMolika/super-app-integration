import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import '../../../services/auth_service.dart';
import 'package:superapp_mobile/app/config/api_config.dart';
import '../widgets/miniapp_consent_sheet.dart';
import '../../../core/miniapp/mini_app_router.dart';

class HomeController extends GetxController {
  var miniApps = [].obs;
  var isLoading = true.obs;
  var hasError = false.obs;
  var selectedIndex = 0.obs;
  final consentedAppIds = <String>{}.obs;

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
        Uri.parse('$baseUrl/mini-apps?_t=${DateTime.now().millisecondsSinceEpoch}'),
        headers: headers,
      ).timeout(const Duration(seconds: 4));
      
      if (response.statusCode == 200) {
        final List<dynamic> allApps = json.decode(response.body);
        // Display Approved, Active, and Testing mini apps (or all active/review apps in web sandbox)
        miniApps.value = allApps.where((app) {
          final s = (app['status'] ?? '').toString().toUpperCase();
          if (kIsWeb) {
            // In web sandbox preview, show all registered apps so developers can immediately test
            return s != 'DELETED' && s != 'ARCHIVED';
          }
          return s == 'APPROVED' || s == 'PUBLISHED' || s == 'ACTIVE' || s == 'TESTING';
        }).map((app) {
          // If in web sandbox preview and app has pendingRevision, merge revision into app object so preview shows fresh changes
          if (kIsWeb && app['pendingRevision'] is Map) {
            final rev = app['pendingRevision'];
            return {
              ...app,
              ...rev,
              'integrationConfig': rev['integrationConfig'] ?? app['integrationConfig'],
              'permissions': rev['permissions'] ?? app['permissions'],
            };
          }
          return app;
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

    final appId = (app['appId'] ?? app['id'] ?? '').toString();
    final hasConsented = consentedAppIds.contains(appId);

    // Show consent bottom sheet if not accepted yet
    if (!hasConsented) {
      final bool? agreed = await Get.bottomSheet<bool>(
        MiniAppConsentSheet(app: app),
        isScrollControlled: true,
        backgroundColor: Colors.transparent,
      );

      if (agreed != true) {
        return; // User cancelled or closed the sheet
      }

      if (appId.isNotEmpty) {
        consentedAppIds.add(appId);
      }
    }

    _executeMiniAppLaunch(app);
  }

  Future<void> _executeMiniAppLaunch(dynamic app) async {
    await MiniAppRouter.launch(app);
  }
}
