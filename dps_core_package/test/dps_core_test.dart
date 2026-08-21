import 'package:dps_core_package/dps_core.dart';
import 'package:test/test.dart';

void main() {
  group('AuthContext', () {
    test('initializes with jwtToken and userId', () {
      final auth = AuthContext(
        jwtToken: 'sample-token',
        userId: 'user-123',
      );

      expect(auth.jwtToken, equals('sample-token'));
      expect(auth.userId, equals('user-123'));
    });
  });
}
