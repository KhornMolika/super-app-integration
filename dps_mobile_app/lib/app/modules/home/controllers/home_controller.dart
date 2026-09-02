import 'package:get/get.dart';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import '../../../services/auth_service.dart';
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
}
