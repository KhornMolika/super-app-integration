import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'dart:convert';
import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import '../../../../app/routes/app_pages.dart';
import '../../../services/auth_service.dart';

class LoginController extends GetxController {
  final emailController = TextEditingController();
  final passwordController = TextEditingController();

  @override
  void onClose() {
    emailController.dispose();
    passwordController.dispose();
    super.onClose();
  }

  var isLoading = false.obs;

  Future<void> login() async {
    if (emailController.text.isNotEmpty && passwordController.text.isNotEmpty) {
      try {
        isLoading(true);
        String baseUrl = 'http://localhost:3000';
        if (!kIsWeb && Platform.isAndroid) {
          baseUrl = 'http://10.0.2.2:3000';
        }

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
