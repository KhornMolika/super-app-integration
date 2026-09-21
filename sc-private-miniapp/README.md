# Private Mini App (Loyalty Rewards & Member Perks)

A standalone Flutter Package Mini App configured for Private Git Repository integration (authenticated via SSH Deploy Keys) in the Super App platform.

## Architecture & Nested File Structure
```
sc-private-miniapp/
├── pubspec.yaml
├── README.md
└── lib/
    ├── sc_private_miniapp.dart           # Barrel file & Root Mini App Entry
    └── src/
        ├── models/
        │   └── reward_models.dart        # Voucher & Activity domain entities
        ├── widgets/
        │   ├── member_tier_card.dart     # Gold Elite VIP Balance & Points Card
        │   └── voucher_card.dart         # Interactive Merchant Voucher Claim Card
        └── screens/
            └── loyalty_rewards_screen.dart # Multi-tab Loyalty Dashboard
```
