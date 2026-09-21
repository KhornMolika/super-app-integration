import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:dps_miniapp_mobile_kyc_verifier/dsp_miniapp_kyc_verifier.dart';
import '../../../services/auth_service.dart';

class KycVerifierView extends GetView {
  const KycVerifierView({super.key});

  @override
  Widget build(BuildContext context) {
    String token = 'super_app_jwt_xyz789';
    String userId = 'super_app_user_456';
    try {
      final auth = Get.find<AuthService>();
      if (auth.token.isNotEmpty) token = auth.token;
      if (auth.userId.isNotEmpty) userId = auth.userId;
    } catch (_) {}

    final dynamic appArgs = Get.arguments;

    return KycVerifierAppEntry(
      jwtToken: token,
      userId: userId,
      onExit: () {
        Get.back();
      },
      initialParams: appArgs is Map<String, dynamic> ? appArgs : null,
      onKycCompleted: (docType, status) async {
        Get.snackbar(
          'KYC Verification Complete',
          'Document ($docType) verified successfully.',
          snackPosition: SnackPosition.TOP,
          backgroundColor: const Color(0xFF10B981),
          colorText: Colors.white,
          icon: const Icon(Icons.check_circle_rounded, color: Colors.white),
        );
      },
    );
  }
}
