import Flutter
import UIKit
// === GENERATED NATIVE SDK IMPORTS — DO NOT EDIT ===
import PermitCheckSDK
import SpaBookingSDK
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
    let channel_com_fsa_permitcheckapp = FlutterMethodChannel(
      name: "com.example.dsp_mobile/com_fsa_permitcheckapp",
      binaryMessenger: messenger
    )
    channel_com_fsa_permitcheckapp.setMethodCallHandler { [weak self] call, result in
      guard call.method == "present" else {
        result(FlutterMethodNotImplemented)
        return
      }
      guard self?.inFlight.contains("com.example.dsp_mobile/com_fsa_permitcheckapp") != true else {
        result(["status": "error", "error": "already in progress"])
        return
      }
      guard let args = call.arguments as? [String: Any],
            let userId = args["userId"] as? String,
            let jwtToken = args["jwtToken"] as? String else {
        result(["status": "error", "error": "missing identity"])
        return
      }
      guard let presenter = self?.topPresenter() else {
        result(["status": "error", "error": "no presenter"])
        return
      }
      self?.inFlight.insert("com.example.dsp_mobile/com_fsa_permitcheckapp")
      PermitCheck.initialize(userId: userId, jwtToken: jwtToken)
      PermitCheck.present(from: presenter) {
        self?.inFlight.remove("com.example.dsp_mobile/com_fsa_permitcheckapp")
        result(["status": "completed"])
      }
    }

    let channel_com_fsa_spabooking = FlutterMethodChannel(
      name: "com.example.dsp_mobile/com_fsa_spabooking",
      binaryMessenger: messenger
    )
    channel_com_fsa_spabooking.setMethodCallHandler { [weak self] call, result in
      guard call.method == "present" else {
        result(FlutterMethodNotImplemented)
        return
      }
      guard self?.inFlight.contains("com.example.dsp_mobile/com_fsa_spabooking") != true else {
        result(["status": "error", "error": "already in progress"])
        return
      }
      guard let args = call.arguments as? [String: Any],
            let userId = args["userId"] as? String,
            let jwtToken = args["jwtToken"] as? String else {
        result(["status": "error", "error": "missing identity"])
        return
      }
      guard let presenter = self?.topPresenter() else {
        result(["status": "error", "error": "no presenter"])
        return
      }
      self?.inFlight.insert("com.example.dsp_mobile/com_fsa_spabooking")
      SpaBooking.initialize(userId: userId, jwtToken: jwtToken)
      SpaBooking.present(from: presenter) {
        self?.inFlight.remove("com.example.dsp_mobile/com_fsa_spabooking")
        result(["status": "completed"])
      }
    }
    // === END GENERATED NATIVE SDK HANDLERS ===
  }
}
