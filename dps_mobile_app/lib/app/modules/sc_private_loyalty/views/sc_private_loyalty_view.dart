import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:sc_private_miniapp/sc_private_miniapp.dart';
import '../../../services/auth_service.dart';

class ScPrivateLoyaltyView extends GetView {
  const ScPrivateLoyaltyView({super.key});

  @override
  Widget build(BuildContext context) {
    String userName = 'Super App VIP Member';
    try {
      final auth = Get.find<AuthService>();
      if (auth.userName.isNotEmpty) {
        userName = auth.userName;
      }
    } catch (_) {}

    return LoyaltyRewardsScreen(
      userName: userName,
      userTier: 'Gold Elite Member',
      onExit: () {
        Get.back();
      },
    );
  }
}
