import 'package:flutter/material.dart';
import 'package:get/get.dart';
import '../../miniapp/views/mini_app_standby_view.dart';

class KycVerifierView extends GetView {
  const KycVerifierView({super.key});

  @override
  Widget build(BuildContext context) {
    final dynamic appArgs = Get.arguments;
    final Map<String, dynamic> appData = appArgs is Map<String, dynamic>
        ? appArgs
        : {
            'appId': 'kh.gov.camdx.kyc',
            'name': 'Cambodia KYC Verifier',
            'integrationMethod': 'FLUTTER_PACKAGE',
            'integrationConfig': {
              'packageName': 'ma_flutter_kyc',
            },
            'currentReleaseVersion': '1.0.0',
          };

    return MiniAppStandbyView(app: appData);
  }
}
