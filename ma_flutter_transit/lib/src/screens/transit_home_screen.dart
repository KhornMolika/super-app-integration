import 'package:flutter/material.dart';
import '../models/transit_models.dart';
import '../widgets/transit_pass_card.dart';
import '../widgets/transit_line_tile.dart';

class TransitHomeScreen extends StatefulWidget {
  final VoidCallback? onExit;
  final String passengerName;
  final String passTier;

  const TransitHomeScreen({
    super.key,
    this.onExit,
    this.passengerName = 'Super App Commuter',
    this.passTier = '30-Day Unlimited All-Access',
  });

  @override
  State<TransitHomeScreen> createState() => _TransitHomeScreenState();
}

class _TransitHomeScreenState extends State<TransitHomeScreen> {
  int _currentNavIndex = 0;
  int _tripsRemaining = 42;

  static const Color primaryTeal = Color(0xFF064E3B);
  static const Color brandEmerald = Color(0xFF059669);
  static const Color accentCyan = Color(0xFF0891B2);
  static const Color cardBorder = Color(0xFFE2E8F0);

  final List<TransitLine> _transitModes = const [
    TransitLine(
      title: 'Metro Express',
      line: 'Blue Line (Airport)',
      status: 'Normal Service',
      icon: Icons.subway_rounded,
      color: Color(0xFF0284C7),
    ),
    TransitLine(
      title: 'City Bus Rapid',
      line: 'Lines 1A, 2B, 3X',
      status: '5 min wait',
      icon: Icons.directions_bus_rounded,
      color: Color(0xFF059669),
    ),
    TransitLine(
      title: 'Water Taxi',
      line: 'Chaktomuk Ferry',
      status: 'On Schedule',
      icon: Icons.directions_boat_rounded,
      color: Color(0xFF0D9488),
    ),
    TransitLine(
      title: 'Airport Shuttle',
      line: 'Terminal 1 & 2',
      status: 'Every 15 min',
      icon: Icons.airport_shuttle_rounded,
      color: Color(0xFF7C3AED),
    ),
  ];

  final List<RideRecord> _rideHistory = const [
    RideRecord(
      route: 'Central Station ➔ Airport Express',
      time: 'Today, 8:30 AM',
      cost: 'Pass Active',
      icon: Icons.subway_rounded,
      color: Color(0xFF0284C7),
    ),
    RideRecord(
      route: 'Riverside Promenade ➔ Tech Hub Bus 2B',
      time: 'Yesterday, 6:15 PM',
      cost: 'Pass Active',
      icon: Icons.directions_bus_rounded,
      color: Color(0xFF059669),
    ),
    RideRecord(
      route: 'Harbor Pier ➔ Island Crossing Ferry',
      time: 'Sep 19, 2026',
      cost: 'Pass Active',
      icon: Icons.directions_boat_rounded,
      color: Color(0xFF0D9488),
    ),
    RideRecord(
      route: 'Downtown Core ➔ Metro Red Line',
      time: 'Sep 17, 2026',
      cost: 'Pass Active',
      icon: Icons.train_rounded,
      color: Color(0xFFDC2626),
    ),
  ];

  void _simulateTapRide() {
    setState(() {
      if (_tripsRemaining > 0) _tripsRemaining--;
    });

    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Row(
          children: [
            Icon(Icons.contactless_rounded, color: Colors.white),
            SizedBox(width: 10),
            Text('Turnstile opened! Fare verified from active pass.'),
          ],
        ),
        backgroundColor: brandEmerald,
        behavior: SnackBarBehavior.floating,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        elevation: 0,
        backgroundColor: primaryTeal,
        foregroundColor: Colors.white,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded, size: 20),
          tooltip: 'Return to Super App',
          onPressed: widget.onExit ?? () => Navigator.of(context).maybePop(),
        ),
        title: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(6),
              decoration: BoxDecoration(
                color: brandEmerald.withValues(alpha: 0.3),
                borderRadius: BorderRadius.circular(8),
              ),
              child: const Icon(Icons.directions_subway_rounded, color: Colors.white, size: 20),
            ),
            const SizedBox(width: 10),
            const Expanded(
              child: Text(
                'City Transit Pass',
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.w700,
                  letterSpacing: -0.3,
                ),
              ),
            ),
          ],
        ),
        actions: [
          Container(
            margin: const EdgeInsets.only(right: 12),
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
            decoration: BoxDecoration(
              color: Colors.white.withValues(alpha: 0.12),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: Colors.white.withValues(alpha: 0.2)),
            ),
            child: const Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(Icons.public_rounded, size: 13, color: Color(0xFF34D399)),
                SizedBox(width: 4),
                Text(
                  'Public Source',
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: 11,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
      body: IndexedStack(
        index: _currentNavIndex,
        children: [
          _buildPassView(),
          _buildRoutesView(),
          _buildHistoryView(),
        ],
      ),
      bottomNavigationBar: Container(
        decoration: const BoxDecoration(
          color: Colors.white,
          border: Border(top: BorderSide(color: cardBorder, width: 1)),
        ),
        child: NavigationBar(
          selectedIndex: _currentNavIndex,
          onDestinationSelected: (idx) => setState(() => _currentNavIndex = idx),
          backgroundColor: Colors.white,
          indicatorColor: brandEmerald.withValues(alpha: 0.15),
          destinations: const [
            NavigationDestination(
              icon: Icon(Icons.badge_outlined),
              selectedIcon: Icon(Icons.badge_rounded, color: brandEmerald),
              label: 'Transit Pass',
            ),
            NavigationDestination(
              icon: Icon(Icons.map_outlined),
              selectedIcon: Icon(Icons.map_rounded, color: brandEmerald),
              label: 'Live Lines',
            ),
            NavigationDestination(
              icon: Icon(Icons.history_rounded),
              selectedIcon: Icon(Icons.history_rounded, color: brandEmerald),
              label: 'Rides',
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildPassView() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          TransitPassCard(
            passengerName: widget.passengerName,
            passTier: widget.passTier,
            tripsRemaining: _tripsRemaining,
            onSimulateRide: _simulateTapRide,
          ),
          const SizedBox(height: 24),
          Row(
            children: [
              Expanded(
                child: _buildActionTile(
                  icon: Icons.qr_code_2_rounded,
                  label: 'Digital QR',
                  color: brandEmerald,
                  onTap: () {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(
                        content: Row(
                          children: [
                            Icon(Icons.qr_code_rounded, color: Colors.white),
                            SizedBox(width: 8),
                            Text('Barcode ready for scanner turnstiles.'),
                          ],
                        ),
                        behavior: SnackBarBehavior.floating,
                      ),
                    );
                  },
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _buildActionTile(
                  icon: Icons.add_card_rounded,
                  label: 'Top Up',
                  color: accentCyan,
                  onTap: () => setState(() => _tripsRemaining += 10),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _buildActionTile(
                  icon: Icons.schedule_rounded,
                  label: 'Timetable',
                  color: primaryTeal,
                  onTap: () => setState(() => _currentNavIndex = 1),
                ),
              ),
            ],
          ),
          const SizedBox(height: 28),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Row(
                children: [
                  Icon(Icons.sensors_rounded, color: brandEmerald, size: 20),
                  SizedBox(width: 6),
                  Text(
                    'Network Status',
                    style: TextStyle(fontSize: 17, fontWeight: FontWeight.w800, color: primaryTeal),
                  ),
                ],
              ),
              TextButton.icon(
                onPressed: () => setState(() => _currentNavIndex = 1),
                icon: const Icon(Icons.arrow_forward_rounded, size: 16),
                label: const Text('All Lines', style: TextStyle(fontSize: 13)),
              ),
            ],
          ),
          const SizedBox(height: 12),
          ..._transitModes.take(2).map((m) => TransitLineTile(line: m)),
        ],
      ),
    );
  }

  Widget _buildRoutesView() {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        const Row(
          children: [
            Icon(Icons.map_rounded, color: brandEmerald, size: 22),
            SizedBox(width: 8),
            Text(
              'Live Transit Network',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: primaryTeal),
            ),
          ],
        ),
        const SizedBox(height: 4),
        const Text(
          'Real-time line status and service frequency across Phnom Penh City.',
          style: TextStyle(fontSize: 13, color: Colors.black54),
        ),
        const SizedBox(height: 16),
        ..._transitModes.map((m) => TransitLineTile(line: m)),
      ],
    );
  }

  Widget _buildHistoryView() {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        const Row(
          children: [
            Icon(Icons.history_rounded, color: primaryTeal, size: 22),
            SizedBox(width: 8),
            Text(
              'Trip & Boarding History',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: primaryTeal),
            ),
          ],
        ),
        const SizedBox(height: 14),
        ..._rideHistory.map((r) {
          return Container(
            margin: const EdgeInsets.only(bottom: 10),
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: cardBorder),
            ),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: r.color.withValues(alpha: 0.12),
                    shape: BoxShape.circle,
                  ),
                  child: Icon(r.icon, color: r.color, size: 20),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        r.route,
                        style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13),
                      ),
                      const SizedBox(height: 3),
                      Text(
                        r.time,
                        style: const TextStyle(fontSize: 11, color: Colors.black45),
                      ),
                    ],
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: brandEmerald.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.check_circle_rounded, size: 12, color: brandEmerald),
                      const SizedBox(width: 4),
                      Text(
                        r.cost,
                        style: const TextStyle(
                          fontWeight: FontWeight.w700,
                          fontSize: 11,
                          color: brandEmerald,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          );
        }),
      ],
    );
  }

  Widget _buildActionTile({
    required IconData icon,
    required String label,
    required Color color,
    required VoidCallback onTap,
  }) {
    return Material(
      color: Colors.white,
      borderRadius: BorderRadius.circular(14),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(14),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 14),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: cardBorder),
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: color.withValues(alpha: 0.1),
                  shape: BoxShape.circle,
                ),
                child: Icon(icon, color: color, size: 20),
              ),
              const SizedBox(height: 8),
              Text(
                label,
                style: const TextStyle(
                  fontWeight: FontWeight.w700,
                  fontSize: 12,
                  color: primaryTeal,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
