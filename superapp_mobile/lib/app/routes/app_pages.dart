// ignore_for_file: constant_identifier_names
import 'package:get/get.dart';
import '../modules/home/bindings/home_binding.dart';
import '../modules/home/views/home_view.dart';
import '../modules/login/bindings/login_binding.dart';
import '../modules/login/views/login_view.dart';
import '../modules/miniapp/bindings/miniapp_binding.dart';
import '../modules/miniapp/views/miniapp_view.dart';
import '../modules/trust_regulator/bindings/trust_regulator_binding.dart';
import '../modules/trust_regulator/views/trust_regulator_view.dart';
import '../modules/kyc_verifier/bindings/kyc_verifier_binding.dart';
import '../modules/kyc_verifier/views/kyc_verifier_view.dart';
import '../modules/sc_public_transit/bindings/sc_public_transit_binding.dart';
import '../modules/sc_public_transit/views/sc_public_transit_view.dart';
import '../modules/sc_private_loyalty/bindings/sc_private_loyalty_binding.dart';
import '../modules/sc_private_loyalty/views/sc_private_loyalty_view.dart';

part 'app_routes.dart';

class AppPages {
  static const INITIAL = Routes.LOGIN;

  static final routes = [
    GetPage(
      name: Routes.HOME,
      page: () => const HomeView(),
      binding: HomeBinding(),
    ),
    GetPage(
      name: Routes.LOGIN,
      page: () => const LoginView(),
      binding: LoginBinding(),
    ),
    GetPage(
      name: Routes.MINIAPP,
      page: () => const MiniappView(),
      binding: MiniappBinding(),
    ),
    GetPage(
      name: Routes.TRUST_REGULATOR,
      page: () => const TrustRegulatorView(),
      binding: TrustRegulatorBinding(),
    ),
    GetPage(
      name: Routes.KYC_VERIFIER,
      page: () => const KycVerifierView(),
      binding: KycVerifierBinding(),
    ),
    GetPage(
      name: Routes.SC_PUBLIC_TRANSIT,
      page: () => const ScPublicTransitView(),
      binding: ScPublicTransitBinding(),
    ),
    GetPage(
      name: Routes.SC_PRIVATE_LOYALTY,
      page: () => const ScPrivateLoyaltyView(),
      binding: ScPrivateLoyaltyBinding(),
    ),
  ];
}
