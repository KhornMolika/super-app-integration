import { NativeSdkVendor } from './vendor.types';

const CHANNEL_PREFIX = 'com.example.dsp_mobile';

export function identifierFor(appId: string): string {
  return appId.replace(/[^A-Za-z0-9]/g, '_');
}

function channelFor(vendor: NativeSdkVendor): string {
  return `${CHANNEL_PREFIX}/${identifierFor(vendor.appId)}`;
}

export function renderIosImports(vendors: NativeSdkVendor[]): string {
  return vendors.map(v => `import ${v.iosModuleName}`).join('\n');
}

export function renderAndroidImports(vendors: NativeSdkVendor[]): string {
  return vendors
    .map(v => `import ${v.androidPackageName}.${v.androidObjectName}`)
    .join('\n');
}

export function renderPodfileLines(vendors: NativeSdkVendor[]): string {
  return vendors
    .map(v => `  pod '${v.iosModuleName}', :path => '../../vendor-artifacts'`)
    .join('\n');
}

export function renderGradleLines(vendors: NativeSdkVendor[]): string {
  return vendors
    .map(
      v =>
        `    implementation(files("../../../vendor-artifacts/${v.androidArtifactFilename}"))`,
    )
    .join('\n');
}

export function renderIosHandlers(vendors: NativeSdkVendor[]): string {
  return vendors
    .map(v => {
      const id = identifierFor(v.appId);
      const channel = channelFor(v);
      return `    let channel_${id} = FlutterMethodChannel(
      name: "${channel}",
      binaryMessenger: messenger
    )
    channel_${id}.setMethodCallHandler { [weak self] call, result in
      guard call.method == "present" else {
        result(FlutterMethodNotImplemented)
        return
      }
      guard self?.inFlight.contains("${channel}") != true else {
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
      self?.inFlight.insert("${channel}")
      ${v.iosTypeName}.initialize(userId: userId, jwtToken: jwtToken)
      ${v.iosTypeName}.present(from: presenter) {
        self?.inFlight.remove("${channel}")
        result(["status": "completed"])
      }
    }`;
    })
    .join('\n\n');
}

export function renderAndroidHandlers(vendors: NativeSdkVendor[]): string {
  return vendors
    .map(v => {
      const channel = channelFor(v);
      return `        MethodChannel(messenger, "${channel}").setMethodCallHandler { call, result ->
            if (call.method != "present") {
                result.notImplemented()
            } else if (inFlight.contains("${channel}")) {
                result.success(mapOf("status" to "error", "error" to "already in progress"))
            } else {
                val userId = call.argument<String>("userId")
                val jwtToken = call.argument<String>("jwtToken")
                if (userId == null || jwtToken == null) {
                    result.success(mapOf("status" to "error", "error" to "missing identity"))
                } else {
                    inFlight.add("${channel}")
                    ${v.androidObjectName}.initialize(userId, jwtToken)
                    ${v.androidObjectName}.present(this) {
                        inFlight.remove("${channel}")
                        result.success(mapOf("status" to "completed"))
                        kotlin.Unit
                    }
                }
            }
        }`;
    })
    .join('\n\n');
}
