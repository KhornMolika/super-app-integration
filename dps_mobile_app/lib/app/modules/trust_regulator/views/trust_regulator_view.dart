import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:dps_core_package/dps_core.dart';
import 'package:dps_miniapp_mobile_trust_regulator/dsp_miniapp_trust_regulator.dart';

class TrustRegulatorView extends GetView {
  const TrustRegulatorView({super.key});

  @override
  Widget build(BuildContext context) {
    // In a real app, this AuthContext would be retrieved from a global auth service.
    // We mock it here for the PoC to demonstrate successful injection.
    final authContext = AuthContext(
      jwtToken: 'super_app_jwt_xyz789',
      userId: 'super_app_user_456',
    );

    return TrustRegulatorAppEntry(
      authContext: authContext,
      onExit: () {
        Get.back();
      },
      onScanNFC: () async {
        await Future.delayed(const Duration(seconds: 1)); // Simulate hardware scan
        return "NFC_CARD_DATA_123456789"; 
      },
    );
  }
}
