import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:url_launcher/url_launcher.dart';
import '../controllers/home_controller.dart';
import '../../../routes/app_pages.dart';
import 'package:dps_mobile_app/app/config/api_config.dart';

class HomeView extends GetView<HomeController> {
  const HomeView({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('DPS Home'),
        actions: [
          IconButton(
            icon: const Icon(Icons.logout),
            onPressed: () => Get.offAllNamed(Routes.LOGIN),
          )
        ],
      ),
      body: Obx(() {
        if (controller.selectedIndex.value == 0) {
          return _buildMiniAppsList();
        } else {
          return _buildProfile();
        }
      }),
      bottomNavigationBar: Obx(() => BottomNavigationBar(
        currentIndex: controller.selectedIndex.value,
        onTap: controller.changeTabIndex,
        items: const [
          BottomNavigationBarItem(
            icon: Icon(Icons.home),
            label: 'Mini Apps',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.person),
            label: 'Profile',
          ),
        ],
      )),
    );
  }

  Widget _buildMiniAppsList() {
    return Padding(
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
                  return const Center(child: Text('Failed to load mini apps. Please ensure the DPS Backend is running.'));
                }

                if (controller.miniApps.isEmpty) {
                  return const Center(
                    child: Padding(
                      padding: EdgeInsets.all(24.0),
                      child: Text(
                        'No approved mini apps available yet.\nMini apps must pass Security Gates and be approved by the Super App Admin.',
                        textAlign: TextAlign.center,
                        style: TextStyle(color: Colors.grey, height: 1.5),
                      ),
                    ),
                  );
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
                          title: Row(
                            children: [
                              Flexible(child: Text(app['name'] ?? 'Unknown App', overflow: TextOverflow.ellipsis)),
                              if ((app['status'] ?? '').toString().toUpperCase() == 'TESTING') ...[
                                const SizedBox(width: 8),
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                  decoration: BoxDecoration(
                                    color: Colors.purple.shade100,
                                    borderRadius: BorderRadius.circular(4),
                                    border: Border.all(color: Colors.purple.shade300),
                                  ),
                                  child: Text(
                                    'TESTING',
                                    style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Colors.purple.shade800),
                                  ),
                                ),
                              ],
                            ],
                          ),
                          subtitle: Text(app['description'] ?? 'No description available'),
                          tileColor: Colors.grey.shade100,
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                          onTap: () async {
                            final redirectUri = app['redirectUri'];
                            if (redirectUri != null && redirectUri.isNotEmpty) {
                              Get.toNamed(redirectUri);
                              return;
                            }

                            final integrationMethod = app['integrationMethod'];
                            final appId = app['appId'];
                            final name = (app['name'] ?? '').toString();

                            if (integrationMethod == 'FLUTTER_PACKAGE' || appId == 'com.fsa.trust_regulator' || name.contains('Trust Regulator')) {
                              Get.toNamed(Routes.TRUST_REGULATOR);
                              return;
                            }
                            if (integrationMethod == 'DEEP_LINK') {
                              final config = app['integrationConfig'];
                              if (config != null && config['urlScheme'] != null) {
                                final urlScheme = config['urlScheme'];
                                final appStoreUrl = config['appStoreUrl'];
                                
                                final uri = Uri.parse(urlScheme);
                                try {
                                  bool launched = await launchUrl(uri, mode: LaunchMode.externalApplication);
                                  if (!launched) {
                                    if (appStoreUrl != null && appStoreUrl.isNotEmpty) {
                                      final storeUri = Uri.parse(appStoreUrl);
                                      bool storeLaunched = await launchUrl(storeUri, mode: LaunchMode.externalApplication);
                                      if (!storeLaunched) {
                                        Get.snackbar('Error', 'Could not open deep link or app store URL.');
                                      }
                                    } else {
                                      Get.snackbar('Error', 'App not installed and no store URL provided.');
                                    }
                                  }
                                } catch (e) {
                                  Get.snackbar('Error', 'Failed to launch URL: $e');
                                }
                              } else {
                                Get.snackbar('Error', 'Invalid deep link configuration.');
                              }
                              return;
                            }

                            String url = app['url'] ?? 
                                (app['integrationConfig'] is Map ? app['integrationConfig']['productionUrl'] : null) ?? 
                                ApiConfig.baseUrl;
                            url = ApiConfig.resolveUrl(url);
                            Get.toNamed(Routes.MINIAPP, arguments: {
                              'url': url,
                              'permissions': app['permissions'] ?? [],
                            });
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
    );
  }

  Widget _buildProfile() {
    return const Center(
      child: Text(
        'Super App Profile Page',
        style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
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
