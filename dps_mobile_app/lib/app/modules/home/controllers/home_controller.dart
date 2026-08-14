import 'package:get/get.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import 'dart:io';
import 'package:flutter/foundation.dart';

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
      
      String baseUrl = 'http://localhost:3000';
      if (!kIsWeb && Platform.isAndroid) {
        baseUrl = 'http://10.0.2.2:3000'; // Assuming backend is on port 3000
      }

      final response = await http.get(Uri.parse('$baseUrl/mini-apps?status=Published'));
      
      if (response.statusCode == 200) {
        miniApps.value = json.decode(response.body);
      } else {
        hasError(true);
      }
    } catch (e) {
      hasError(true);
      print ("Error fetching mini apps: $e");
    } finally {
      isLoading(false);
    }
  }
}
