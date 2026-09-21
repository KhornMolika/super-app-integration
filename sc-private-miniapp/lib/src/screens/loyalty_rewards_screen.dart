import 'package:flutter/material.dart';
import '../models/reward_models.dart';
import '../widgets/member_tier_card.dart';
import '../widgets/voucher_card.dart';

class LoyaltyRewardsScreen extends StatefulWidget {
  final VoidCallback? onExit;
  final String userName;
  final String userTier;

  const LoyaltyRewardsScreen({
    super.key,
    this.onExit,
    this.userName = 'Super App VIP Member',
    this.userTier = 'Gold Elite',
  });

  @override
  State<LoyaltyRewardsScreen> createState() => _LoyaltyRewardsScreenState();
}

class _LoyaltyRewardsScreenState extends State<LoyaltyRewardsScreen> {
  int _currentTabIndex = 0;
  int _userPoints = 14500;
  final Set<String> _claimedVouchers = {};

  static const Color primaryNavy = Color(0xFF0F172A);
  static const Color brandIndigo = Color(0xFF4F46E5);
  static const Color accentEmerald = Color(0xFF10B981);
  static const Color warningAmber = Color(0xFFF59E0B);
  static const Color cardBorder = Color(0xFFE2E8F0);

  final List<VoucherItem> _vouchers = const [
    VoucherItem(
      id: 'v_coffee',
      title: 'Artisan Coffee Voucher',
      subtitle: 'Valid across all partner cafes',
      cost: 250,
      icon: Icons.local_cafe_rounded,
      color: Color(0xFFB45309),
    ),
    VoucherItem(
      id: 'v_fuel',
      title: '\$10 Fuel Rebate Pass',
      subtitle: 'Instant pump discount at PTT & Caltex',
      cost: 500,
      icon: Icons.local_gas_station_rounded,
      color: Color(0xFF0284C7),
    ),
    VoucherItem(
      id: 'v_cinema',
      title: 'VIP Cinema 2-for-1 Pass',
      subtitle: 'Major Cineplex & Legend Cinemas',
      cost: 750,
      icon: Icons.movie_rounded,
      color: Color(0xFF7C3AED),
    ),
    VoucherItem(
      id: 'v_grocery',
      title: '\$25 Supermarket Coupon',
      subtitle: 'Chip Mong & Aeon Supermarkets',
      cost: 1200,
      icon: Icons.shopping_basket_rounded,
      color: Color(0xFF059669),
    ),
  ];

  final List<ActivityItem> _activities = const [
    ActivityItem(
      title: 'Super App QR Payment Cashback',
      date: 'Today, 10:45 AM',
      points: '+120 pts',
      isCredit: true,
      icon: Icons.qr_code_scanner_rounded,
    ),
    ActivityItem(
      title: 'Weekly Login Streak Bonus',
      date: 'Yesterday',
      points: '+500 pts',
      isCredit: true,
      icon: Icons.military_tech_rounded,
    ),
    ActivityItem(
      title: 'Coffee Voucher Claimed',
      date: 'Sep 18, 2026',
      points: '-250 pts',
      isCredit: false,
      icon: Icons.redeem_rounded,
    ),
    ActivityItem(
      title: 'Friend Referral - Sophal K.',
      date: 'Sep 15, 2026',
      points: '+1,000 pts',
      isCredit: true,
      icon: Icons.person_add_alt_1_rounded,
    ),
  ];

  void _handleClaimVoucher(VoucherItem voucher) {
    if (_claimedVouchers.contains(voucher.id)) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Row(
            children: [
              const Icon(Icons.info_outline_rounded, color: Colors.white),
              const SizedBox(width: 8),
              Text('${voucher.title} already redeemed!'),
            ],
          ),
          backgroundColor: primaryNavy,
          behavior: SnackBarBehavior.floating,
        ),
      );
      return;
    }

    if (_userPoints < voucher.cost) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: const Row(
            children: [
              Icon(Icons.warning_amber_rounded, color: Colors.white),
              SizedBox(width: 8),
              Text('Insufficient points to claim voucher!'),
            ],
          ),
          backgroundColor: Colors.red.shade700,
          behavior: SnackBarBehavior.floating,
        ),
      );
      return;
    }

    setState(() {
      _userPoints -= voucher.cost;
      _claimedVouchers.add(voucher.id);
    });

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Row(
          children: [
            const Icon(Icons.check_circle_rounded, color: Colors.white),
            const SizedBox(width: 8),
            Text('Successfully claimed ${voucher.title}!'),
          ],
        ),
        backgroundColor: accentEmerald,
        behavior: SnackBarBehavior.floating,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        elevation: 0,
        backgroundColor: primaryNavy,
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
                color: brandIndigo.withValues(alpha: 0.3),
                borderRadius: BorderRadius.circular(8),
              ),
              child: const Icon(Icons.stars_rounded, color: warningAmber, size: 20),
            ),
            const SizedBox(width: 10),
            const Expanded(
              child: Text(
                'Loyalty Rewards',
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
                Icon(Icons.lock_rounded, size: 13, color: accentEmerald),
                SizedBox(width: 4),
                Text(
                  'Private Source',
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
        index: _currentTabIndex,
        children: [
          _buildRewardsTab(),
          _buildVouchersTab(),
          _buildHistoryTab(),
        ],
      ),
      bottomNavigationBar: Container(
        decoration: const BoxDecoration(
          color: Colors.white,
          border: Border(top: BorderSide(color: cardBorder, width: 1)),
        ),
        child: NavigationBar(
          selectedIndex: _currentTabIndex,
          onDestinationSelected: (idx) => setState(() => _currentTabIndex = idx),
          backgroundColor: Colors.white,
          indicatorColor: brandIndigo.withValues(alpha: 0.15),
          destinations: const [
            NavigationDestination(
              icon: Icon(Icons.stars_outlined),
              selectedIcon: Icon(Icons.stars_rounded, color: brandIndigo),
              label: 'Dashboard',
            ),
            NavigationDestination(
              icon: Icon(Icons.card_giftcard_outlined),
              selectedIcon: Icon(Icons.card_giftcard_rounded, color: brandIndigo),
              label: 'Vouchers',
            ),
            NavigationDestination(
              icon: Icon(Icons.history_rounded),
              selectedIcon: Icon(Icons.history_rounded, color: brandIndigo),
              label: 'History',
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildRewardsTab() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          MemberTierCard(
            userName: widget.userName,
            userTier: widget.userTier,
            userPoints: _userPoints,
          ),
          const SizedBox(height: 24),
          Row(
            children: [
              Expanded(
                child: _buildActionButton(
                  icon: Icons.redeem_rounded,
                  label: 'Redeem',
                  color: brandIndigo,
                  onTap: () => setState(() => _currentTabIndex = 1),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _buildActionButton(
                  icon: Icons.history_rounded,
                  label: 'Activity',
                  color: primaryNavy,
                  onTap: () => setState(() => _currentTabIndex = 2),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _buildActionButton(
                  icon: Icons.card_membership_rounded,
                  label: 'Perks',
                  color: accentEmerald,
                  onTap: () {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(
                        content: Row(
                          children: [
                            Icon(Icons.check_circle_rounded, color: Colors.white),
                            SizedBox(width: 8),
                            Text('Tier Perks: 1.5x Points & Priority Support active!'),
                          ],
                        ),
                        behavior: SnackBarBehavior.floating,
                      ),
                    );
                  },
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
                  Icon(Icons.local_fire_department_rounded, color: Colors.deepOrange, size: 22),
                  SizedBox(width: 6),
                  Text(
                    'Featured Rewards',
                    style: TextStyle(fontSize: 17, fontWeight: FontWeight.w800, color: primaryNavy),
                  ),
                ],
              ),
              TextButton.icon(
                onPressed: () => setState(() => _currentTabIndex = 1),
                icon: const Icon(Icons.arrow_forward_rounded, size: 16),
                label: const Text('View All', style: TextStyle(fontSize: 13)),
              ),
            ],
          ),
          const SizedBox(height: 12),
          ..._vouchers.take(2).map((v) => VoucherCard(
                voucher: v,
                isClaimed: _claimedVouchers.contains(v.id),
                onClaim: () => _handleClaimVoucher(v),
              )),
        ],
      ),
    );
  }

  Widget _buildVouchersTab() {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        const Row(
          children: [
            Icon(Icons.card_giftcard_rounded, color: brandIndigo, size: 22),
            SizedBox(width: 8),
            Text(
              'Exclusive Mini App Vouchers',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: primaryNavy),
            ),
          ],
        ),
        const SizedBox(height: 4),
        const Text(
          'Redeem your Super App points for real-world merchant vouchers.',
          style: TextStyle(fontSize: 13, color: Colors.black54),
        ),
        const SizedBox(height: 16),
        ..._vouchers.map((v) => VoucherCard(
              voucher: v,
              isClaimed: _claimedVouchers.contains(v.id),
              onClaim: () => _handleClaimVoucher(v),
            )),
      ],
    );
  }

  Widget _buildHistoryTab() {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        const Row(
          children: [
            Icon(Icons.receipt_long_rounded, color: primaryNavy, size: 22),
            SizedBox(width: 8),
            Text(
              'Transaction History',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: primaryNavy),
            ),
          ],
        ),
        const SizedBox(height: 14),
        ..._activities.map((a) {
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
                    color: (a.isCredit ? accentEmerald : brandIndigo).withValues(alpha: 0.12),
                    shape: BoxShape.circle,
                  ),
                  child: Icon(
                    a.icon,
                    color: a.isCredit ? accentEmerald : brandIndigo,
                    size: 20,
                  ),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        a.title,
                        style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14),
                      ),
                      const SizedBox(height: 3),
                      Text(
                        a.date,
                        style: const TextStyle(fontSize: 12, color: Colors.black45),
                      ),
                    ],
                  ),
                ),
                Text(
                  a.points,
                  style: TextStyle(
                    fontWeight: FontWeight.w800,
                    fontSize: 14,
                    color: a.isCredit ? accentEmerald : Colors.red.shade700,
                  ),
                ),
              ],
            ),
          );
        }),
      ],
    );
  }

  Widget _buildActionButton({
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
                  color: primaryNavy,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
