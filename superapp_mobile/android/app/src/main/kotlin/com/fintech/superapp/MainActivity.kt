package com.fintech.superapp

import android.content.Intent
import io.flutter.embedding.android.FlutterFragmentActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.MethodChannel

class MainActivity : FlutterFragmentActivity() {
    private val CHANNEL = "superapp/native_launcher"

    override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)

        MethodChannel(flutterEngine.dartExecutor.binaryMessenger, CHANNEL).setMethodCallHandler { call, result ->
            when (call.method) {
                "launch" -> {
                    val entryClass = call.argument<String>("entryClass")
                    if (entryClass.isNullOrBlank()) {
                        result.error("INVALID_ARGUMENT", "entryClass is required", null)
                        return@setMethodCallHandler
                    }

                    try {
                        val clazz = Class.forName(entryClass)
                        val intent = Intent(this, clazz).apply {
                            call.argument<String>("userId")?.let { putExtra("EXTRA_USER_ID", it) }
                            call.argument<String>("authToken")?.let { putExtra("EXTRA_AUTH_TOKEN", it) }
                            val params = call.argument<Map<String, Any>>("params")
                            if (params != null) {
                                for ((key, value) in params) {
                                    when (value) {
                                        is String -> putExtra(key, value)
                                        is Int -> putExtra(key, value)
                                        is Boolean -> putExtra(key, value)
                                        is Double -> putExtra(key, value)
                                        is Long -> putExtra(key, value)
                                    }
                                }
                            }
                        }
                        startActivity(intent)
                        result.success(true)
                    } catch (e: ClassNotFoundException) {
                        result.error(
                            "CLASS_NOT_FOUND",
                            "Native entry point class '$entryClass' not found in APK. Verify SDK is included in app dependencies.",
                            e.message
                        )
                    } catch (e: Exception) {
                        result.error("LAUNCH_FAILED", "Failed to launch native mini app: ${e.message}", null)
                    }
                }
                "isAvailable" -> {
                    val entryClass = call.argument<String>("entryClass")
                    if (entryClass.isNullOrBlank()) {
                        result.success(false)
                        return@setMethodCallHandler
                    }
                    try {
                        Class.forName(entryClass)
                        result.success(true)
                    } catch (_: ClassNotFoundException) {
                        result.success(false)
                    }
                }
                else -> result.notImplemented()
            }
        }
    }
}
