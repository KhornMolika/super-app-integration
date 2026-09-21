import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:sc_public_miniapp/sc_public_miniapp.dart';
import '../../../services/auth_service.dart';

class ScPublicTransitView extends GetView {
  const ScPublicTransitView({super.key});

  @override
  Widget build(BuildContext context) {
    String passengerName = 'Super App Commuter';
    try {
      final auth = Get.find<AuthService>();
      if (auth.userName.isNotEmpty) {
        passengerName = auth.userName;
      }
    } catch (_) {}

    return TransitHomeScreen(
      passengerName: passengerName,
      passTier: '30-Day Unlimited All-Access',
      onExit: () {
        Get.back();
      },
    );
  }
}
