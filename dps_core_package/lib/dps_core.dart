

/// Defines common callbacks used by mini apps to communicate with the Super App host.
typedef ExitCallback = void Function();

/// Represents the active user session provided by the Super App.
class AuthContext {
  final String jwtToken;
  final String userId;

  AuthContext({
    required this.jwtToken,
    required this.userId,
  });
}
