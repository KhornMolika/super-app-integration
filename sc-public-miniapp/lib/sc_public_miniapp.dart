library sc_public_miniapp;

import 'package:flutter/material.dart';
import 'src/screens/transit_home_screen.dart';

export 'src/models/transit_models.dart';
export 'src/widgets/transit_pass_card.dart';
export 'src/widgets/transit_line_tile.dart';
export 'src/screens/transit_home_screen.dart';

/// Public Mini App Root Entry Point
class PublicMiniAppEntry extends StatelessWidget {
  final VoidCallback? onExit;
  final String? passengerName;
  final String? passTier;

  const PublicMiniAppEntry({
    super.key,
    this.onExit,
    this.passengerName,
    this.passTier,
  });

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        useMaterial3: true,
        fontFamily: 'Inter',
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xFF059669),
          primary: const Color(0xFF059669),
          secondary: const Color(0xFF0891B2),
          surface: Colors.white,
        ),
      ),
      home: TransitHomeScreen(
        onExit: onExit,
        passengerName: passengerName ?? 'Super App Commuter',
        passTier: passTier ?? '30-Day Unlimited All-Access',
      ),
    );
  }
}
