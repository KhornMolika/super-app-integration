# ==============================================================================
# R8 / ProGuard Optimization & Code Shrinking Rules for Super App Mobile
# ==============================================================================

# 1. Flutter Engine, JNI & Plugins
-keep class io.flutter.app.** { *; }
-keep class io.flutter.plugin.**  { *; }
-keep class io.flutter.util.**  { *; }
-keep class io.flutter.view.**  { *; }
-keep class io.flutter.**  { *; }
-keep class io.flutter.plugins.**  { *; }
-keep class io.flutter.plugins.GeneratedPluginRegistrant { *; }

# Preserve native JNI methods called by Flutter Engine & plugins
-keepclasseswithmembers class * {
    native <methods>;
}

# 2. MethodChannels & Reflection Attributes
-keepattributes *Annotation*
-keepattributes Signature
-keepattributes InnerClasses
-keepattributes EnclosingMethod
-keepattributes SourceFile,LineNumberTable

# 3. Model Serialization & Reflection
-keepclassmembers class * {
    @androidx.annotation.Keep <fields>;
    @androidx.annotation.Keep <methods>;
}

-keepclassmembers enum * {
    public static **[] values();
    public static ** valueOf(java.lang.String);
}

# 4. AndroidX & Support Libraries
-dontwarn androidx.**
-keep class androidx.** { *; }
-keep class androidx.lifecycle.DefaultLifecycleObserver

# 5. Third-Party Plugin Warnings Suppression (Safe for R8 Full Mode)
-dontwarn com.google.**
-dontwarn okhttp3.**
-dontwarn okio.**
-dontwarn io.flutter.plugins.**
