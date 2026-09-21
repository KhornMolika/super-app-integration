# Public Mini App (Smart Transit & Metro Pass)

A standalone Flutter Package Mini App configured for Public Git Repository integration (zero credentials, anonymous clone) in the Super App platform.

## Architecture & Nested File Structure
```
sc-public-miniapp/
├── pubspec.yaml
├── README.md
└── lib/
    ├── sc_public_miniapp.dart           # Barrel file & Root Mini App Entry
    └── src/
        ├── models/
        │   └── transit_models.dart      # Transit Line & Ride History domain entities
        ├── widgets/
        │   ├── transit_pass_card.dart   # Interactive Pass Hero Card with turnstile tap
        │   └── transit_line_tile.dart   # Live Metro & Bus line status tile
        └── screens/
            └── transit_home_screen.dart # Multi-tab Transit Dashboard
```
