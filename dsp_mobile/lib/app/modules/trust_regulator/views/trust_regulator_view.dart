import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:dsp_core/dsp_core.dart';
import 'package:dsp_miniapp_trust_regulator/dsp_miniapp_trust_regulator.dart';

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
        // This callback is executed when the mini app requests to close itself
        Get.back();
      },
    );
  }
}
