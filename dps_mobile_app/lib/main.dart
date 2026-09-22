import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'app/routes/app_pages.dart';
import 'app/services/auth_service.dart';
import 'app/core/miniapp/mini_app_registry.dart';
import 'app/modules/sc_public_transit/views/sc_public_transit_view.dart';
import 'app/modules/sc_private_loyalty/views/sc_private_loyalty_view.dart';
import 'app/modules/trust_regulator/views/trust_regulator_view.dart';
import 'app/modules/kyc_verifier/views/kyc_verifier_view.dart';

void _initMiniAppRegistry() {
  MiniAppRegistry.registerAliases(
    ['sc_public_miniapp', 'smart_transit_pass', 'sc-public-miniapp'],
    (context, args) => const ScPublicTransitView(),
  );
  MiniAppRegistry.registerAliases(
    ['sc_private_miniapp', 'loyalty_rewards_and_points', 'sc-private-miniapp'],
    (context, args) => const ScPrivateLoyaltyView(),
  );
  MiniAppRegistry.registerAliases(
    [
      'dps_miniapp_mobile_trust_regulator',
      'dsp_miniapp_trust_regulator',
      'trust_regulator',
      'trust_regulator_digital_certificate',
    ],
    (context, args) => const TrustRegulatorView(),
  );
  MiniAppRegistry.registerAliases(
    [
      'dps_miniapp_mobile_kyc_verifier',
      'dsp_miniapp_kyc_verifier',
      'kyc_verifier',
      'cambodia_kyc_verifier_sdk',
    ],
    (context, args) => const KycVerifierView(),
  );
}

void main() {
  Get.put(AuthService());
  _initMiniAppRegistry();
  runApp(const DSPMobileApp());
}

class DSPMobileApp extends StatelessWidget {
  const DSPMobileApp({super.key});

  @override
  Widget build(BuildContext context) {
    return GetMaterialApp(
      title: 'DSP Super App',
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: Colors.blue),
        useMaterial3: true,
      ),
      initialRoute: AppPages.INITIAL,
      getPages: AppPages.routes,
    );
  }
}
