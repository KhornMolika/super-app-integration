package com.example.dsp_mobile

import io.flutter.embedding.android.FlutterFragmentActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.MethodChannel
// === GENERATED NATIVE SDK IMPORTS — DO NOT EDIT ===
import com.dspvendor.permit.PermitCheck
// === END GENERATED NATIVE SDK IMPORTS ===

class MainActivity : FlutterFragmentActivity() {
    /** Channels with a native flow currently on screen. */
    private val inFlight = mutableSetOf<String>()

    override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)
        val messenger = flutterEngine.dartExecutor.binaryMessenger

        // === GENERATED NATIVE SDK HANDLERS — DO NOT EDIT ===
        MethodChannel(messenger, "com.example.dsp_mobile/com_fsa_permitcheck").setMethodCallHandler { call, result ->
            if (call.method != "present") {
                result.notImplemented()
            } else if (inFlight.contains("com.example.dsp_mobile/com_fsa_permitcheck")) {
                result.success(mapOf("status" to "error", "error" to "already in progress"))
            } else {
                val userId = call.argument<String>("userId")
                val jwtToken = call.argument<String>("jwtToken")
                if (userId == null || jwtToken == null) {
                    result.success(mapOf("status" to "error", "error" to "missing identity"))
                } else {
                    inFlight.add("com.example.dsp_mobile/com_fsa_permitcheck")
                    PermitCheck.initialize(userId, jwtToken)
                    PermitCheck.present(this) {
                        inFlight.remove("com.example.dsp_mobile/com_fsa_permitcheck")
                        result.success(mapOf("status" to "completed"))
                        kotlin.Unit
                    }
                }
            }
        }
        // === END GENERATED NATIVE SDK HANDLERS ===
    }
}
