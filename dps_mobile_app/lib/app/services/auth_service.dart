import 'package:get/get.dart';

class AuthService extends GetxService {
  final _token = ''.obs;
  final _userId = 'super_app_user_456'.obs;
  final _userName = 'Sokha Chan'.obs;
  final _userEmail = 'admin@example.com'.obs;
  
  String get token => _token.value;
  set token(String value) => _token.value = value;

  String get userId => _userId.value;
  set userId(String value) => _userId.value = value;

  String get userName => _userName.value;
  set userName(String value) => _userName.value = value;

  String get userEmail => _userEmail.value;
  set userEmail(String value) => _userEmail.value = value;
}
