import Flutter
import UIKit

@main
@objc class AppDelegate: FlutterAppDelegate, FlutterImplicitEngineDelegate {
  private let channelName = "superapp/native_launcher"

  override func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?
  ) -> Bool {
    return super.application(application, didFinishLaunchingWithOptions: launchOptions)
  }

  func didInitializeImplicitFlutterEngine(_ engineBridge: FlutterImplicitEngineBridge) {
    GeneratedPluginRegistrant.register(with: engineBridge.pluginRegistry)
    let messenger = engineBridge.applicationRegistrar.messenger()
    setupNativeLauncher(messenger: messenger)
  }

  private func setupNativeLauncher(messenger: FlutterBinaryMessenger) {
    let channel = FlutterMethodChannel(name: channelName, binaryMessenger: messenger)
    channel.setMethodCallHandler { [weak self] (call: FlutterMethodCall, result: @escaping FlutterResult) in
      guard let self = self else {
        result(FlutterError(code: "UNAVAILABLE", message: "AppDelegate deallocated", details: nil))
        return
      }

      if call.method == "launch" {
        guard let args = call.arguments as? [String: Any],
              let entryClass = args["entryClass"] as? String, !entryClass.isEmpty else {
          result(FlutterError(code: "INVALID_ARGUMENT", message: "entryClass is required", details: nil))
          return
        }

        if let appName = Bundle.main.infoDictionary?["CFBundleName"] as? String {
          let sanitizedAppName = appName.replacingOccurrences(of: " ", with: "_")
          let candidateClassNames = [entryClass, "\(sanitizedAppName).\(entryClass)"]
          var targetClass: AnyClass? = nil
          for name in candidateClassNames {
            if let cls = NSClassFromString(name) {
              targetClass = cls
              break
            }
          }

          if let vcType = targetClass as? UIViewController.Type {
            let vc = vcType.init()
            if let presenter = self.topPresenter() {
              presenter.present(vc, animated: true) {
                result(true)
              }
              return
            }
          }
        }
        result(FlutterError(code: "CLASS_NOT_FOUND", message: "Native ViewController '\(entryClass)' not found in app bundle. Verify SDK is included in app dependencies.", details: nil))
      } else if call.method == "isAvailable" {
        guard let args = call.arguments as? [String: Any],
              let entryClass = args["entryClass"] as? String, !entryClass.isEmpty else {
          result(false)
          return
        }
        let available = NSClassFromString(entryClass) != nil
        result(available)
      } else {
        result(FlutterMethodNotImplemented)
      }
    }
  }

  func topPresenter() -> UIViewController? {
    if let root = window?.rootViewController {
      var current = root
      while let presented = current.presentedViewController {
        current = presented
      }
      return current
    }
    return UIApplication.shared.windows.first(where: { $0.isKeyWindow })?.rootViewController
  }
}
