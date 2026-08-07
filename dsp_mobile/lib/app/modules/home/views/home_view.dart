import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'dart:io';
import 'package:flutter/foundation.dart';
import '../controllers/home_controller.dart';
import '../../../routes/app_pages.dart';

class HomeView extends GetView<HomeController> {
  const HomeView({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('DSP Home'),
        actions: [
          IconButton(
            icon: const Icon(Icons.logout),
            onPressed: () => Get.offAllNamed(Routes.LOGIN),
          )
        ],
      ),
      body: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Available Mini Apps',
              style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 16),
            Expanded(
              child: Obx(() {
                if (controller.isLoading.value) {
                  return const Center(child: CircularProgressIndicator());
                }
                
                if (controller.hasError.value) {
                  return const Center(child: Text('Failed to load mini apps. Please ensure the DSP Backend is running.'));
                }

                if (controller.miniApps.isEmpty) {
                  return const Center(child: Text('No mini apps available yet.'));
                }

                return RefreshIndicator(
                  onRefresh: controller.fetchMiniApps,
                  child: ListView.builder(
                    itemCount: controller.miniApps.length,
                    itemBuilder: (context, index) {
                      final app = controller.miniApps[index];
                      return Padding(
                        padding: const EdgeInsets.only(bottom: 8.0),
                        child: ListTile(
                          leading: _buildIcon(app['category'], app['logo']),
                          title: Text(app['name'] ?? 'Unknown App'),
                          subtitle: Text(app['description'] ?? 'No description available'),
                          tileColor: Colors.grey.shade100,
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                          onTap: () {
                            String url = app['url'] ?? 'http://localhost:3000';
                            if (!kIsWeb && Platform.isAndroid && url.contains('localhost')) {
                              url = url.replaceAll('localhost', '10.0.2.2');
                            }
                            Get.toNamed(Routes.MINIAPP, arguments: url);
                          },
                        ),
                      );
                    },
                  ),
                );
              }),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildIcon(String? category, String? logoUrl) {
    if (logoUrl != null && logoUrl.isNotEmpty) {
      return Image.network(
        logoUrl,
        width: 40,
        height: 40,
        errorBuilder: (context, error, stackTrace) => _fallbackIcon(category),
      );
    }
    return _fallbackIcon(category);
  }

  Widget _fallbackIcon(String? category) {
    IconData iconData = Icons.apps;
    Color color = Colors.blue;

    if (category == 'Insurance') {
      iconData = Icons.shield;
      color = Colors.blue;
    } else if (category == 'Banking') {
      iconData = Icons.account_balance;
      color = Colors.green;
    } else if (category == 'Securities') {
      iconData = Icons.trending_up;
      color = Colors.purple;
    }

    return Icon(iconData, color: color, size: 40);
  }
}
