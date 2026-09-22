import 'package:flutter/material.dart';
import '../models/reward_models.dart';

class VoucherCard extends StatelessWidget {
  final VoucherItem voucher;
  final bool isClaimed;
  final VoidCallback onClaim;

  const VoucherCard({
    super.key,
    required this.voucher,
    required this.isClaimed,
    required this.onClaim,
  });

  static const Color primaryNavy = Color(0xFF0F172A);
  static const Color brandIndigo = Color(0xFF4F46E5);
  static const Color warningAmber = Color(0xFFF59E0B);
  static const Color cardBorder = Color(0xFFE2E8F0);

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: cardBorder),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: voucher.color.withValues(alpha: 0.12),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(voucher.icon, color: voucher.color, size: 24),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  voucher.title,
                  style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14, color: primaryNavy),
                ),
                const SizedBox(height: 2),
                Text(
                  voucher.subtitle,
                  style: const TextStyle(fontSize: 12, color: Colors.black45),
                ),
                const SizedBox(height: 6),
                Row(
                  children: [
                    const Icon(Icons.stars_rounded, size: 14, color: warningAmber),
                    const SizedBox(width: 4),
                    Text(
                      '${voucher.cost} points',
                      style: const TextStyle(
                        fontWeight: FontWeight.w700,
                        fontSize: 12,
                        color: brandIndigo,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(width: 8),
          ElevatedButton.icon(
            onPressed: isClaimed ? null : onClaim,
            icon: Icon(
              isClaimed ? Icons.check_circle_rounded : Icons.card_giftcard_rounded,
              size: 15,
            ),
            label: Text(isClaimed ? 'Claimed' : 'Claim'),
            style: ElevatedButton.styleFrom(
              backgroundColor: isClaimed ? Colors.grey.shade300 : brandIndigo,
              foregroundColor: isClaimed ? Colors.grey.shade700 : Colors.white,
              elevation: 0,
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
            ),
          ),
        ],
      ),
    );
  }
}
