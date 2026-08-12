

import 'package:flutter/material.dart';
import 'package:dsp_core/dsp_core.dart';
import 'package:nfc_manager/nfc_manager.dart';

/// The entry point widget for the Trust Regulator mini app.
/// This widget is designed to be embedded into the Super App.
class TrustRegulatorAppEntry extends StatefulWidget {
  final AuthContext authContext;
  final ExitCallback onExit;

  const TrustRegulatorAppEntry({
    super.key,
    required this.authContext,
    required this.onExit,
  });

  @override
  State<TrustRegulatorAppEntry> createState() => _TrustRegulatorAppEntryState();
}

class _TrustRegulatorAppEntryState extends State<TrustRegulatorAppEntry> {
  int _selectedIndex = 0;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Trust Regulator Portal'),
        backgroundColor: Colors.blueGrey,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: widget.onExit,
        ),
      ),
      body: _selectedIndex == 0 ? _buildScanTab() : _buildSettingsTab(),
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: _selectedIndex,
        onTap: (index) => setState(() => _selectedIndex = index),
        selectedItemColor: Colors.blueGrey,
        items: const [
          BottomNavigationBarItem(
            icon: Icon(Icons.document_scanner),
            label: 'Scan',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.settings),
            label: 'Settings',
          ),
        ],
      ),
    );
  }

  Widget _buildScanTab() {
    return Center(
        child: Padding(
          padding: const EdgeInsets.all(16.0),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.verified_user, size: 80, color: Colors.blueGrey),
              const SizedBox(height: 24),
              Text(
                'Welcome to Trust Regulator',
                style: Theme.of(context).textTheme.headlineMedium,
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 16),
              const Text(
                'You have successfully entered the isolated mini app environment.',
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 32),
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Colors.grey.shade200,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Column(
                  children: [
                    const Text('Injected Auth Context:', style: TextStyle(fontWeight: FontWeight.bold)),
                    const SizedBox(height: 8),
                    Text('User ID: ${widget.authContext.userId}'),
                    Text('JWT: ${widget.authContext.jwtToken.substring(0, 10)}...'),
                  ],
                ),
              ),
              const SizedBox(height: 32),
              ElevatedButton.icon(
                icon: const Icon(Icons.nfc),
                label: const Text('Scan ID Card (NFC)'),
                onPressed: () async {
                  try {
                    bool isAvailable = await NfcManager.instance.isAvailable();
                    if (context.mounted) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(content: Text('NFC Available: $isAvailable')),
                      );
                    }
                  } catch (e) {
                    if (context.mounted) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(
                          content: Text('NFC Error (Platform unsupported?): $e'),
                          backgroundColor: Colors.red,
                        ),
                      );
                    }
                  }
                },
              ),
              const SizedBox(height: 16),
              ElevatedButton(
                onPressed: () {
                  Navigator.of(context).push(
                    MaterialPageRoute(
                      builder: (context) => const TrustRegulatorDetailsScreen(),
                    ),
                  );
                },
                child: const Text('Go Deeper (Test Routing)'),
              ),
              const SizedBox(height: 16),
              ElevatedButton(
                onPressed: widget.onExit,
                child: const Text('Return to Super App'),
              ),
            ],
          ),
        ),
      );
  }

  Widget _buildSettingsTab() {
    return const Center(
      child: Text(
        'Mini App Settings',
        style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
      ),
    );
  }
}

class TrustRegulatorDetailsScreen extends StatelessWidget {
  const TrustRegulatorDetailsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Deep Screen'),
        backgroundColor: Colors.blueGrey.shade700,
      ),
      body: const Center(
        child: Text('If you press the Android hardware back button,\nthis screen should pop instead of closing the entire mini app!'),
      ),
    );
  }
}
