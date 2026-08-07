import 'package:get/get.dart';

class AuthService extends GetxService {
  final _token = ''.obs;
  
  String get token => _token.value;
  set token(String value) => _token.value = value;
}
