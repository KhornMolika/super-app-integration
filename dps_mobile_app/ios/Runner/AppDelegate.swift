import Flutter
import UIKit
// === GENERATED NATIVE SDK IMPORTS — DO NOT EDIT ===
// === END GENERATED NATIVE SDK IMPORTS ===

@main
@objc class AppDelegate: FlutterAppDelegate, FlutterImplicitEngineDelegate {
  /// Channels with a native flow currently on screen. Generated handlers use
  /// this to reject a second present while one is open.
  private var inFlight = Set<String>()

  override func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?
  ) -> Bool {
    return super.application(application, didFinishLaunchingWithOptions: launchOptions)
  }

  /// `self.window` is nil both here and at call time in current Flutter, so the
  /// presenting controller must come from UIApplication instead.
  func topPresenter() -> UIViewController? {
    return self.window?.rootViewController
      ?? UIApplication.shared.windows.first(where: { $0.isKeyWindow })?.rootViewController
      ?? UIApplication.shared.windows.first?.rootViewController
  }

  func didInitializeImplicitFlutterEngine(_ engineBridge: FlutterImplicitEngineBridge) {
    GeneratedPluginRegistrant.register(with: engineBridge.pluginRegistry)

    let messenger = engineBridge.applicationRegistrar.messenger()

    // === GENERATED NATIVE SDK HANDLERS — DO NOT EDIT ===
    // === END GENERATED NATIVE SDK HANDLERS ===
  }
}
