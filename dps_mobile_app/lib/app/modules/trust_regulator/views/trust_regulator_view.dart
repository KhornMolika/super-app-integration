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

    // --- MOCK BACK OFFICE REGISTRATION CHECK ---
    // In a real app, the Super App fetches the Mini App's permissions from the server.
    // We simulate that the Trust Regulator app is granted NFC permissions.
    final bool isNfcEnabledFromBackOffice = true; 

    return TrustRegulatorAppEntry(
      authContext: authContext,
      onExit: () {
        // This callback is executed when the mini app requests to close itself
        Get.back();
      },
      // Here the Super App fulfills the contract if the Back Office allows it!
      onScanNFC: isNfcEnabledFromBackOffice 
        ? () async {
            // The Super App securely triggers the hardware plugin
            await Future.delayed(const Duration(seconds: 1)); // Simulate hardware scan
            return "NFC_CARD_DATA_123456789"; 
          }
        : null, // If false in back office, pass null to disable the feature
    );
  }
}
