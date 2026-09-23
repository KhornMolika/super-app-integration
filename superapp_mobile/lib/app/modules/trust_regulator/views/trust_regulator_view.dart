import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:ma_flutter_trust_regulator/ma_flutter_trust_regulator.dart';

class TrustRegulatorView extends GetView {
  const TrustRegulatorView({super.key});

  @override
  Widget build(BuildContext context) {
    return TrustRegulatorAppEntry(
      jwtToken: 'super_app_jwt_xyz789',
      userId: 'super_app_user_456',
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
