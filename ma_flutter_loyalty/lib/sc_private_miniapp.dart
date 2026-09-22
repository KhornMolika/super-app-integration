library sc_private_miniapp;

import 'package:flutter/material.dart';
import 'src/screens/loyalty_rewards_screen.dart';

export 'src/models/reward_models.dart';
export 'src/widgets/member_tier_card.dart';
export 'src/widgets/voucher_card.dart';
export 'src/screens/loyalty_rewards_screen.dart';

/// Private Mini App Root Entry Point
class MiniAppEntry extends StatelessWidget {
  final VoidCallback? onExit;
  final String? userName;
  final String? userTier;

  const MiniAppEntry({
    super.key,
    this.onExit,
    this.userName,
    this.userTier,
  });

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        useMaterial3: true,
        fontFamily: 'Inter',
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xFF4F46E5),
          primary: const Color(0xFF4F46E5),
          secondary: const Color(0xFF10B981),
          surface: Colors.white,
        ),
      ),
      home: LoyaltyRewardsScreen(
        onExit: onExit,
        userName: userName ?? 'Super App VIP Member',
        userTier: userTier ?? 'Gold Elite',
      ),
    );
  }
}
