import 'package:flutter/material.dart';
import 'package:get/get.dart';
import '../../miniapp/views/mini_app_standby_view.dart';

class ScPrivateLoyaltyView extends GetView {
  const ScPrivateLoyaltyView({super.key});

  @override
  Widget build(BuildContext context) {
    final dynamic appArgs = Get.arguments;
    final Map<String, dynamic> appData = appArgs is Map<String, dynamic>
        ? appArgs
        : {
            'appId': 'kh.gov.loyalty.points',
            'name': 'Loyalty Rewards & Points',
            'integrationMethod': 'FLUTTER_PACKAGE',
            'integrationConfig': {
              'packageName': 'sc_private_miniapp',
            },
            'currentReleaseVersion': '1.0.0',
          };

    return MiniAppStandbyView(app: appData);
  }
}
