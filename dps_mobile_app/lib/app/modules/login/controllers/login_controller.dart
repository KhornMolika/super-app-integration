import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'dart:convert';
import 'package:http/http.dart' as http;
import '../../../../app/routes/app_pages.dart';
import '../../../services/auth_service.dart';
import 'package:dps_mobile_app/app/config/api_config.dart';

class LoginController extends GetxController {
  final emailController = TextEditingController();
  final passwordController = TextEditingController();

  @override
  void onInit() {
    super.onInit();
    ApiConfig.autoDetectServer();
  }

  @override
  void onClose() {
    emailController.dispose();
    passwordController.dispose();
    super.onClose();
  }

  var isLoading = false.obs;

  void showServerSettingsDialog(BuildContext context) {
    final textController = TextEditingController(text: ApiConfig.baseUrl);
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Server Connection'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Enter backend host IP or URL (e.g. 192.168.1.152:3000):',
              style: TextStyle(fontSize: 12),
            ),
            const SizedBox(height: 8),
            TextField(
              controller: textController,
              decoration: const InputDecoration(
                border: OutlineInputBorder(),
                isDense: true,
                hintText: '192.168.1.152:3000',
              ),
            ),
            const SizedBox(height: 12),
            Obx(() => Text(
              'Status: ${ApiConfig.connectionStatusRx.value}',
              style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.bold,
                color: ApiConfig.connectionStatusRx.value.contains('Connected')
                    ? Colors.green
                    : Colors.orange,
              ),
            )),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () async {
              await ApiConfig.autoDetectServer();
              textController.text = ApiConfig.baseUrl;
            },
            child: const Text('Auto-Detect'),
          ),
          FilledButton(
            onPressed: () async {
              await ApiConfig.setCustomServer(textController.text);
              Navigator.of(ctx).pop();
            },
            child: const Text('Save'),
          ),
        ],
      ),
    );
  }

  Future<void> login() async {
    if (emailController.text.isNotEmpty && passwordController.text.isNotEmpty) {
      try {
        isLoading(true);
        final baseUrl = ApiConfig.baseUrl;

        final response = await http.post(
          Uri.parse('$baseUrl/auth/login'),
          headers: {'Content-Type': 'application/json'},
          body: jsonEncode({
            'email': emailController.text,
            'password': passwordController.text,
          }),
        );

        if (response.statusCode == 200 || response.statusCode == 201) {
          final data = jsonDecode(response.body);
          if (data['success'] == true) {
            // Save token to service
            Get.find<AuthService>().token = data['access_token'];
            Get.offNamed(Routes.HOME);
            return;
          }
        }
        
        Get.snackbar('Error', 'Invalid credentials or login failed.', snackPosition: SnackPosition.BOTTOM);
      } catch (e) {
        Get.snackbar('Error', 'Network error: $e', snackPosition: SnackPosition.BOTTOM);
      } finally {
        isLoading(false);
      }
    } else {
      Get.snackbar(
        'Error',
        'Please enter email and password',
        snackPosition: SnackPosition.BOTTOM,
      );
    }
  }
}
