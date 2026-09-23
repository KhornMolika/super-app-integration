import 'package:flutter/material.dart';
import 'package:get/get.dart';
import '../../miniapp/views/mini_app_standby_view.dart';

class ScPublicTransitView extends GetView {
  const ScPublicTransitView({super.key});

  @override
  Widget build(BuildContext context) {
    final dynamic appArgs = Get.arguments;
    final Map<String, dynamic> appData = appArgs is Map<String, dynamic>
        ? appArgs
        : {
            'appId': 'kh.gov.mpwt.transit',
            'name': 'Smart Transit Pass',
            'integrationMethod': 'FLUTTER_PACKAGE',
            'integrationConfig': {
              'packageName': 'sc_public_miniapp',
            },
            'currentReleaseVersion': '1.0.0',
          };

    return MiniAppStandbyView(app: appData);
  }
}
