# MafutaPass ProGuard Rules for Play Store Release
# ================================================
# Last updated: 2026-02-15
# Only contains rules for ACTIVE dependencies.

# -----------------------------------------
# App Models — keep all data classes for Gson serialization
# -----------------------------------------
-keep class com.mafutapass.app.data.Models { *; }
-keep class com.mafutapass.app.data.Models$* { *; }
-keep class com.mafutapass.app.data.ApiService$* { *; }
-keep class com.mafutapass.app.viewmodel.** { *; }

# -----------------------------------------
# Retrofit
# -----------------------------------------
-keepattributes Signature, InnerClasses, EnclosingMethod
-keepattributes RuntimeVisibleAnnotations, RuntimeVisibleParameterAnnotations
-keepclassmembers,allowshrinking,allowobfuscation interface * {
    @retrofit2.http.* <methods>;
}
-dontwarn org.codehaus.mojo.animal_sniffer.IgnoreJRERequirement
-dontwarn javax.annotation.**
-dontwarn kotlin.Unit
-dontwarn retrofit2.KotlinExtensions
-dontwarn retrofit2.KotlinExtensions$*
-if interface * { @retrofit2.http.* <methods>; }
-keep,allowobfuscation interface <1>

# -----------------------------------------
# OkHttp
# -----------------------------------------
-dontwarn okhttp3.**
-dontwarn okio.**
-keepnames class okhttp3.internal.publicsuffix.PublicSuffixDatabase

# -----------------------------------------
# Gson — critical for @SerializedName to work at runtime
# -----------------------------------------
-keepattributes Signature
-keepattributes *Annotation*
-dontwarn sun.misc.**
-keep class com.google.gson.stream.** { *; }
-keep class * implements com.google.gson.TypeAdapterFactory
-keep class * implements com.google.gson.JsonSerializer
-keep class * implements com.google.gson.JsonDeserializer
-keepclassmembers,allowobfuscation class * {
    @com.google.gson.annotations.SerializedName <fields>;
}

# -----------------------------------------
# Kotlin Coroutines
# -----------------------------------------
-keepnames class kotlinx.coroutines.internal.MainDispatcherFactory {}
-keepnames class kotlinx.coroutines.CoroutineExceptionHandler {}
-keepclassmembers,allowobfuscation class kotlinx.** {
    volatile <fields>;
}

# -----------------------------------------
# Google Credentials API (native Google Sign-In)
# -----------------------------------------
-keep class com.google.android.libraries.identity.googleid.** { *; }
-keep class androidx.credentials.** { *; }

# -----------------------------------------
# ML Kit Text Recognition
# -----------------------------------------
-keep class com.google.mlkit.** { *; }
-dontwarn com.google.mlkit.**

# -----------------------------------------
# Hilt / Dagger
# -----------------------------------------
-dontwarn dagger.hilt.**
-keep class dagger.hilt.** { *; }
-keep class javax.inject.** { *; }
-keep class * extends dagger.hilt.android.internal.managers.ViewComponentManager$FragmentContextWrapper { *; }

# -----------------------------------------
# Jetpack Compose
# -----------------------------------------
-dontwarn androidx.compose.**

# -----------------------------------------
# Keep native methods
# -----------------------------------------
-keepclasseswithmembernames class * {
    native <methods>;
}

# -----------------------------------------
# Keep Parcelable / Serializable
# -----------------------------------------
-keep class * implements android.os.Parcelable {
    public static final android.os.Parcelable$Creator *;
}
-keepclassmembers class * implements java.io.Serializable {
    static final long serialVersionUID;
    private static final java.io.ObjectStreamField[] serialPersistentFields;
    !static !transient <fields>;
    private void writeObject(java.io.ObjectOutputStream);
    private void readObject(java.io.ObjectInputStream);
    java.lang.Object writeReplace();
    java.lang.Object readResolve();
}

# -----------------------------------------
# Keep R classes
# -----------------------------------------
-keepclassmembers class **.R$* {
    public static <fields>;
}

# -----------------------------------------
# Debugging: keep line numbers in release crash reports
# -----------------------------------------
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile
