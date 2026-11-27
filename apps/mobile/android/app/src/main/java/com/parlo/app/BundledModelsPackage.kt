package com.parlo.app

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.*
import com.facebook.react.uimanager.ViewManager
import java.io.File
import java.util.concurrent.Executors
import com.facebook.react.modules.core.DeviceEventManagerModule

class BundledModelsPackage : ReactPackage {
  override fun createNativeModules(context: ReactApplicationContext): List<NativeModule> = listOf(BundledModelsModule(context))
  override fun createViewManagers(context: ReactApplicationContext): List<ViewManager<*, *>> = emptyList()
}

class BundledModelsModule(private val context: ReactApplicationContext) : ReactContextBaseJavaModule(context) {
  private val executor = Executors.newSingleThreadExecutor()
  override fun getName() = "BundledModels"

  @ReactMethod
  fun addListener(eventName: String) {}

  @ReactMethod
  fun removeListeners(count: Double) {}

  private fun progress(bytes: Long, total: Long, stage: String) {
    if (!context.hasActiveReactInstance()) return
    val event = Arguments.createMap().apply {
      putDouble("bytes", bytes.toDouble())
      putDouble("total", total.toDouble())
      putString("stage", stage)
    }
    context.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
      .emit("BundledModelsProgress", event)
  }

  @ReactMethod
  fun prepare(promise: Promise) {
    executor.execute {
      try {
        val directory = File(context.filesDir, "models")
        if (!directory.exists() && !directory.mkdirs()) throw IllegalStateException("Não foi possível criar a pasta de modelos")
        val files = listOf("qwen2.5-0.5b-instruct-q4_k_m.gguf", "ggml-base-q5_1.bin")
        val sizes = files.map { context.assets.openFd("models/$it").use { asset -> asset.length } }
        val total = sizes.sum()
        var completed = 0L
        progress(0, total, "Verificando recursos")
        val result = Arguments.createMap()
        files.forEachIndexed { index, name ->
          val destination = File(directory, name)
          val expected = sizes[index]
          val stage = if (index == 0) "Preparando o tutor" else "Preparando o reconhecimento de voz"
          if (!destination.exists() || destination.length() != expected) {
            val temporary = File(directory, "$name.partial")
            if (destination.exists() && !destination.delete()) throw IllegalStateException("Não foi possível substituir o recurso anterior")
            var copied = 0L
            var lastUpdate = 0L
            context.assets.open("models/$name").use { input ->
              temporary.outputStream().buffered().use { output ->
                val buffer = ByteArray(256 * 1024)
                while (true) {
                  val read = input.read(buffer)
                  if (read < 0) break
                  output.write(buffer, 0, read)
                  copied += read
                  val now = android.os.SystemClock.elapsedRealtime()
                  if (now - lastUpdate >= 200) {
                    progress(completed + copied, total, stage)
                    lastUpdate = now
                  }
                }
              }
            }
            if (temporary.length() != expected || !temporary.renameTo(destination)) throw IllegalStateException("Não foi possível preparar $name")
          }
          completed += expected
          progress(completed, total, stage)
          result.putString(if (index == 0) "modelUri" else "speechModelUri", android.net.Uri.fromFile(destination).toString())
        }
        promise.resolve(result)
      } catch (error: Exception) {
        promise.reject("MODEL_PREPARATION_FAILED", error.message, error)
      }
    }
  }
}
