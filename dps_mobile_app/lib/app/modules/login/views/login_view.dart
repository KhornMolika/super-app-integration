import 'package:flutter/material.dart';
import 'package:get/get.dart';
import '../controllers/login_controller.dart';
import 'package:dps_mobile_app/app/config/api_config.dart';

class LoginView extends GetView<LoginController> {
  const LoginView({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF080C14),
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            physics: const BouncingScrollPhysics(),
            padding: const EdgeInsets.symmetric(horizontal: 28.0, vertical: 24.0),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: <Widget>[
                // Glowing Super App Brand Header
                Center(
                  child: Container(
                    width: 76,
                    height: 76,
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(22),
                      gradient: const LinearGradient(
                        colors: [Color(0xFF2563EB), Color(0xFF6366F1), Color(0xFF9333EA)],
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                      ),
                      boxShadow: [
                        BoxShadow(
                          color: const Color(0xFF6366F1).withValues(alpha: 0.4),
                          blurRadius: 24,
                          offset: const Offset(0, 8),
                        ),
                      ],
                    ),
                    child: const Center(
                      child: Text(
                        'SA',
                        style: TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.w900,
                          fontSize: 30,
                          letterSpacing: 1.2,
                        ),
                      ),
                    ),
                  ),
                ),
                const SizedBox(height: 20),
                
                // Title & Subtitle
                const Text(
                  'SUPER APP ONEHUB',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: 22,
                    fontWeight: FontWeight.w900,
                    letterSpacing: 1.1,
                  ),
                ),
                const SizedBox(height: 6),
                const Text(
                  'Digital Services & Mini App Ecosystem',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    color: Color(0xFF94A3B8),
                    fontSize: 13,
                    fontWeight: FontWeight.w500,
                  ),
                ),
                const SizedBox(height: 36),

                // Form Container
                Container(
                  padding: const EdgeInsets.all(22),
                  decoration: BoxDecoration(
                    color: const Color(0xFF0F172A).withValues(alpha: 0.8),
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(color: const Color(0xFF1E293B), width: 1.2),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withValues(alpha: 0.3),
                        blurRadius: 16,
                        offset: const Offset(0, 6),
                      ),
                    ],
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'ACCOUNT LOGIN',
                        style: TextStyle(
                          color: Color(0xFF38BDF8),
                          fontSize: 11,
                          fontWeight: FontWeight.w800,
                          letterSpacing: 1.2,
                        ),
                      ),
                      const SizedBox(height: 16),

                      // Email Field
                      TextField(
                        controller: controller.emailController,
                        style: const TextStyle(color: Colors.white, fontSize: 14),
                        keyboardType: TextInputType.emailAddress,
                        decoration: InputDecoration(
                          labelText: 'Email Address',
                          labelStyle: const TextStyle(color: Color(0xFF94A3B8), fontSize: 13),
                          prefixIcon: const Icon(Icons.email_outlined, color: Color(0xFF38BDF8), size: 20),
                          filled: true,
                          fillColor: const Color(0xFF1E293B).withValues(alpha: 0.6),
                          contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                          enabledBorder: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(12),
                            borderSide: const BorderSide(color: Color(0xFF334155)),
                          ),
                          focusedBorder: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(12),
                            borderSide: const BorderSide(color: Color(0xFF38BDF8), width: 1.5),
                          ),
                        ),
                      ),
                      const SizedBox(height: 16),

                      // Password Field
                      TextField(
                        controller: controller.passwordController,
                        obscureText: true,
                        style: const TextStyle(color: Colors.white, fontSize: 14),
                        decoration: InputDecoration(
                          labelText: 'Password',
                          labelStyle: const TextStyle(color: Color(0xFF94A3B8), fontSize: 13),
                          prefixIcon: const Icon(Icons.lock_outline, color: Color(0xFF38BDF8), size: 20),
                          filled: true,
                          fillColor: const Color(0xFF1E293B).withValues(alpha: 0.6),
                          contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                          enabledBorder: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(12),
                            borderSide: const BorderSide(color: Color(0xFF334155)),
                          ),
                          focusedBorder: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(12),
                            borderSide: const BorderSide(color: Color(0xFF38BDF8), width: 1.5),
                          ),
                        ),
                      ),
                      const SizedBox(height: 24),

                      // Submit Button
                      Obx(() => SizedBox(
                        width: double.infinity,
                        height: 48,
                        child: ElevatedButton(
                          onPressed: controller.isLoading.value ? null : controller.login,
                          style: ElevatedButton.styleFrom(
                            backgroundColor: const Color(0xFF2563EB),
                            foregroundColor: Colors.white,
                            elevation: 4,
                            shadowColor: const Color(0xFF2563EB).withValues(alpha: 0.5),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(12),
                            ),
                          ),
                          child: controller.isLoading.value
                              ? const SizedBox(
                                  width: 20,
                                  height: 20,
                                  child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                                )
                              : const Text(
                                  'Sign In to Super App',
                                  style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold),
                                ),
                        ),
                      )),
                    ],
                  ),
                ),
                const SizedBox(height: 24),

                // Server Status Indicator & Settings Link
                Center(
                  child: Obx(() => InkWell(
                    onTap: () => controller.showServerSettingsDialog(context),
                    borderRadius: BorderRadius.circular(10),
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                      decoration: BoxDecoration(
                        color: const Color(0xFF0F172A),
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(color: const Color(0xFF1E293B)),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(
                            Icons.circle,
                            size: 8,
                            color: ApiConfig.connectionStatusRx.value.contains('Connected')
                                ? const Color(0xFF10B981)
                                : const Color(0xFFF59E0B),
                          ),
                          const SizedBox(width: 8),
                          Text(
                            ApiConfig.baseUrl,
                            style: const TextStyle(fontSize: 12, color: Color(0xFF94A3B8), fontFamily: 'monospace'),
                          ),
                          const SizedBox(width: 8),
                          const Icon(Icons.settings_outlined, size: 14, color: Color(0xFF64748B)),
                        ],
                      ),
                    ),
                  )),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
