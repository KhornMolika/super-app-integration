import 'package:flutter/material.dart';
import 'package:get/get.dart';
import '../../miniapp/views/mini_app_standby_view.dart';

class TrustRegulatorView extends GetView {
  const TrustRegulatorView({super.key});

  @override
  Widget build(BuildContext context) {
    final dynamic appArgs = Get.arguments;
    final Map<String, dynamic> appData = appArgs is Map<String, dynamic>
        ? appArgs
        : {
            'appId': 'kh.gov.nonbank.trust',
            'name': 'Trust Regulator Digital Certificate',
            'integrationMethod': 'FLUTTER_PACKAGE',
            'integrationConfig': {
              'packageName': 'ma_flutter_trust_regulator',
            },
            'currentReleaseVersion': '1.0.0',
          };

    return MiniAppStandbyView(app: appData);
  }
}
