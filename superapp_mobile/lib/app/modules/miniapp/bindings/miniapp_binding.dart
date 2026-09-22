import 'package:get/get.dart';
import '../controllers/miniapp_controller.dart';

class MiniappBinding extends Bindings {
  @override
  void dependencies() {
    Get.lazyPut<MiniappController>(
      () => MiniappController(),
    );
  }
}
