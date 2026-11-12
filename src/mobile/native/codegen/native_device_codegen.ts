/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NUSANTARA Programming Language - Phase 38
 * Generator Plugin Perangkat Native Nyata (Kotlin Android & Swift iOS Device API Codegen)
 */

export class GeneratorPluginPerangkatNative {
  public static hasilkanPluginAndroid(appId: string = 'id.nusantara.app'): string {
    return `// Dihasilkan otomatis oleh Nusantara Mobile Native Device API Codegen (Phase 38)
package ${appId}

import android.Manifest
import android.app.NotificationChannel
import android.app.NotificationManager
import android.bluetooth.BluetoothManager
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.pm.PackageManager
import android.hardware.Sensor
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.hardware.SensorManager
import android.hardware.camera2.CameraCharacteristics
import android.hardware.camera2.CameraManager
import android.location.Location
import android.location.LocationManager
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import android.os.BatteryManager
import android.os.Build
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.ContextCompat
import org.json.JSONArray
import org.json.JSONObject
import java.io.File

class NusantaraDeviceApiPlugin(
    private val context: Context,
    private val bridge: NusantaraNativeBridge
) : SensorEventListener {

    private val sensorManager = context.getSystemService(Context.SENSOR_SERVICE) as SensorManager
    private val notificationChannelId = "nusantara_local_notif"

    init {
        createNotificationChannel()
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                notificationChannelId,
                "Nusantara Notifications",
                NotificationManager.IMPORTANCE_DEFAULT
            )
            val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            manager.createNotificationChannel(channel)
        }
    }

    fun dispatchDeviceCommand(method: String, argsJson: String): JSONObject {
        val args = if (argsJson.isNotBlank()) JSONObject(argsJson) else JSONObject()
        return when (method) {
            "perangkat.info" -> getDeviceInfo()
            "kamera.ketersediaan" -> getCameraCapabilities()
            "baterai.info" -> getBatteryStatus()
            "jaringan.status" -> getNetworkStatus()
            "lokasi.ambil" -> getLastKnownLocation()
            "sensor.akselerometer" -> readSensorSnapshot(Sensor.TYPE_ACCELEROMETER)
            "sensor.giroskop" -> readSensorSnapshot(Sensor.TYPE_GYROSCOPE)
            "sensor.magnetometer" -> readSensorSnapshot(Sensor.TYPE_MAGNETIC_FIELD)
            "sensor.kedekatan" -> readSensorSnapshot(Sensor.TYPE_PROXIMITY)
            "sensor.cahaya" -> readSensorSnapshot(Sensor.TYPE_LIGHT)
            "bluetooth.status" -> getBluetoothStatus()
            "notifikasi.kirim", "notifikasi.jadwal" -> showLocalNotification(args)
            "haptik.getar", "haptik.pola" -> triggerVibration(args.optLong("durasiMs", 80L))
            "berkas.baca" -> readSandboxFile(args.optString("jalur"))
            "berkas.tulis" -> writeSandboxFile(args.optString("jalur"), args.optString("konten"))
            "berkas.hapus" -> deleteSandboxFile(args.optString("jalur"))
            else -> JSONObject().apply {
                put("sukses", false)
                put("kodeGalat", "TIDAK_DIDUKUNG")
                put("pesan", "Endpoint native '\${method}' belum terdaftar di plugin.")
            }
        }
    }

    fun getDeviceInfo(): JSONObject = JSONObject().apply {
        put("sukses", true)
        put("platform", "android")
        put("model", Build.MODEL)
        put("produsen", Build.MANUFACTURER)
        put("levelAPI", Build.VERSION.SDK_INT)
        put("namaVersi", "Android \${Build.VERSION.RELEASE}")
        put("arsitektur", Build.SUPPORTED_ABIS.firstOrNull() ?: "arm64-v8a")
    }

    fun getCameraCapabilities(): JSONObject {
        val camMgr = context.getSystemService(Context.CAMERA_SERVICE) as CameraManager
        var hasFront = false
        var hasBack = false
        var hasFlash = false
        for (camId in camMgr.cameraIdList) {
            val chars = camMgr.getCameraCharacteristics(camId)
            when (chars.get(CameraCharacteristics.LENS_FACING)) {
                CameraCharacteristics.LENS_FACING_FRONT -> hasFront = true
                CameraCharacteristics.LENS_FACING_BACK -> hasBack = true
            }
            if (chars.get(CameraCharacteristics.FLASH_INFO_AVAILABLE) == true) {
                hasFlash = true
            }
        }
        return JSONObject().apply {
            put("sukses", true)
            put("kameraDepan", hasFront)
            put("kameraBelakang", hasBack)
            put("flashTersedia", hasFlash)
            put("jumlahKamera", camMgr.cameraIdList.size)
        }
    }

    fun getBatteryStatus(): JSONObject {
        val intent = context.registerReceiver(null, IntentFilter(Intent.ACTION_BATTERY_CHANGED))
        val levelRaw = intent?.getIntExtra(BatteryManager.EXTRA_LEVEL, -1) ?: -1
        val scale = intent?.getIntExtra(BatteryManager.EXTRA_SCALE, 100) ?: 100
        val status = intent?.getIntExtra(BatteryManager.EXTRA_STATUS, -1) ?: -1
        val pct = if (levelRaw >= 0 && scale > 0) (levelRaw * 100) / scale else -1
        val charging = status == BatteryManager.BATTERY_STATUS_CHARGING || status == BatteryManager.BATTERY_STATUS_FULL
        return JSONObject().apply {
            put("sukses", true)
            put("level", pct)
            put("sedangMengisi", charging)
            put("sumber", "android.os.BatteryManager")
        }
    }

    fun getNetworkStatus(): JSONObject {
        val cm = context.getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
        val net = cm.activeNetwork
        val caps = if (net != null) cm.getNetworkCapabilities(net) else null
        val terhubung = caps != null
        val tipe = when {
            caps == null -> "offline"
            caps.hasTransport(NetworkCapabilities.TRANSPORT_WIFI) -> "wifi"
            caps.hasTransport(NetworkCapabilities.TRANSPORT_CELLULAR) -> "seluler"
            caps.hasTransport(NetworkCapabilities.TRANSPORT_ETHERNET) -> "ethernet"
            else -> "lainnya"
        }
        return JSONObject().apply {
            put("sukses", true)
            put("terhubung", terhubung)
            put("tipe", tipe)
            put("sumber", "android.net.ConnectivityManager")
        }
    }

    fun getLastKnownLocation(): JSONObject {
        val fineGranted = ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED
        if (!fineGranted) {
            return JSONObject().apply {
                put("sukses", false)
                put("kodeGalat", "IZIN_DITOLAK")
                put("pesan", "Izin ACCESS_FINE_LOCATION belum diberikan.")
            }
        }
        val lm = context.getSystemService(Context.LOCATION_SERVICE) as LocationManager
        val loc: Location? = lm.getLastKnownLocation(LocationManager.GPS_PROVIDER)
            ?: lm.getLastKnownLocation(LocationManager.NETWORK_PROVIDER)
        return if (loc != null) {
            JSONObject().apply {
                put("sukses", true)
                put("latitude", loc.latitude)
                put("longitude", loc.longitude)
                put("akurasiMeter", loc.accuracy)
                put("sumber", loc.provider ?: "android.location.LocationManager")
            }
        } else {
            JSONObject().apply {
                put("sukses", false)
                put("kodeGalat", "PERANGKAT_TIDAK_TERSEDIA")
                put("pesan", "Koordinat GPS terakhir belum tersedia.")
            }
        }
    }

    private fun readSensorSnapshot(sensorType: Int): JSONObject {
        val sensor = sensorManager.getDefaultSensor(sensorType)
            ?: return JSONObject().apply {
                put("sukses", false)
                put("kodeGalat", "PERANGKAT_TIDAK_TERSEDIA")
                put("pesan", "Sensor tipe \${sensorType} tidak tersedia pada perangkat.")
            }
        sensorManager.registerListener(this, sensor, SensorManager.SENSOR_DELAY_NORMAL)
        return JSONObject().apply {
            put("sukses", true)
            put("sensorNama", sensor.name)
            put("vendor", sensor.vendor)
            put("dayaMa", sensor.power)
            put("sumber", "android.hardware.SensorManager")
        }
    }

    fun getBluetoothStatus(): JSONObject {
        val bm = context.getSystemService(Context.BLUETOOTH_SERVICE) as BluetoothManager
        val adapter = bm.adapter
        val hasBle = context.packageManager.hasSystemFeature(PackageManager.FEATURE_BLUETOOTH_LE)
        return JSONObject().apply {
            put("sukses", true)
            put("aktif", adapter?.isEnabled == true)
            put("mendukungBLE", hasBle)
            put("sumber", "android.bluetooth.BluetoothManager")
        }
    }

    fun showLocalNotification(args: JSONObject): JSONObject {
        val judul = args.optString("judul", "Nusantara")
        val pesan = args.optString("pesan", "")
        val idStr = args.optString("id", "1")
        val notif = NotificationCompat.Builder(context, notificationChannelId)
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setContentTitle(judul)
            .setContentText(pesan)
            .setPriority(NotificationCompat.PRIORITY_DEFAULT)
            .build()
        NotificationManagerCompat.from(context).notify(idStr.hashCode(), notif)
        return JSONObject().apply {
            put("sukses", true)
            put("id", idStr)
            put("terjadwal", true)
        }
    }

    fun triggerVibration(durasiMs: Long): JSONObject {
        val vibrator: Vibrator = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            val vm = context.getSystemService(Context.VIBRATOR_MANAGER_SERVICE) as VibratorManager
            vm.defaultVibrator
        } else {
            @Suppress("DEPRECATION")
            context.getSystemService(Context.VIBRATOR_SERVICE) as Vibrator
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            vibrator.vibrate(VibrationEffect.createOneShot(durasiMs.coerceAtLeast(10L), VibrationEffect.DEFAULT_AMPLITUDE))
        } else {
            @Suppress("DEPRECATION")
            vibrator.vibrate(durasiMs.coerceAtLeast(10L))
        }
        return JSONObject().apply {
            put("sukses", true)
            put("durasiMs", durasiMs)
        }
    }

    private fun resolveSandboxFile(relPath: String): File? {
        val root = File(context.filesDir, "nusantara_sandbox").canonicalFile
        root.mkdirs()
        val target = File(root, relPath).canonicalFile
        if (!target.path.startsWith(root.path + File.separator)) return null
        return target
    }

    fun readSandboxFile(relPath: String): JSONObject {
        val file = resolveSandboxFile(relPath) ?: return pathTraversalError()
        if (!file.exists()) {
            return JSONObject().apply { put("sukses", false); put("kodeGalat", "OPERASI_GAGAL") }
        }
        val teks = file.readText(Charsets.UTF_8)
        return JSONObject().apply {
            put("sukses", true)
            put("jalur", relPath)
            put("konten", teks)
            put("ukuran", file.length())
        }
    }

    fun writeSandboxFile(relPath: String, konten: String): JSONObject {
        val file = resolveSandboxFile(relPath) ?: return pathTraversalError()
        file.parentFile?.mkdirs()
        file.writeText(konten, Charsets.UTF_8)
        return JSONObject().apply {
            put("sukses", true)
            put("jalur", relPath)
            put("byteTertulis", konten.toByteArray(Charsets.UTF_8).size)
        }
    }

    fun deleteSandboxFile(relPath: String): JSONObject {
        val file = resolveSandboxFile(relPath) ?: return pathTraversalError()
        val deleted = if (file.exists()) file.delete() else false
        return JSONObject().apply {
            put("sukses", true)
            put("jalur", relPath)
            put("terhapus", deleted)
        }
    }

    private fun pathTraversalError(): JSONObject = JSONObject().apply {
        put("sukses", false)
        put("kodeGalat", "PATH_TIDAK_AMAN")
        put("pesan", "Akses berkas di luar sandbox ditolak.")
    }

    override fun onSensorChanged(event: SensorEvent?) {
        event ?: return
        val valuesArr = JSONArray()
        event.values.forEach { valuesArr.put(it.toDouble()) }
        bridge.emitNativeEvent("sensor.update", JSONObject().apply {
            put("type", event.sensor.type)
            put("values", valuesArr)
        })
    }

    override fun onAccuracyChanged(sensor: Sensor?, accuracy: Int) {}
}
`;
  }

  public static hasilkanPluginIOS(bundleId: string = 'id.nusantara.app'): string {
    return `// Dihasilkan otomatis oleh Nusantara Mobile Native Device API Codegen (Phase 38)
import Foundation
import UIKit
import AVFoundation
import CoreLocation
import CoreMotion
import UserNotifications
import CoreBluetooth
import Network
import LocalAuthentication
import Security

@MainActor
final class NusantaraDeviceApiPlugin: NSObject, CLLocationManagerDelegate, CBCentralManagerDelegate {
    private let bundleId: String = "${bundleId}"
    private let locationManager = CLLocationManager()
    private let motionManager = CMMotionManager()
    private let pathMonitor = NWPathMonitor()
    private var centralManager: CBCentralManager?
    private weak var bridge: NusantaraNativeBridge?

    init(bridge: NusantaraNativeBridge) {
        self.bridge = bridge
        super.init()
        locationManager.delegate = self
        pathMonitor.start(queue: DispatchQueue(label: "nusantara.network.monitor"))
    }

    func dispatchDeviceCommand(method: String, args: [String: Any]) -> [String: Any] {
        switch method {
        case "perangkat.info":
            return getDeviceInfo()
        case "kamera.ketersediaan":
            return getCameraCapabilities()
        case "baterai.info":
            return getBatteryStatus()
        case "jaringan.status":
            return getNetworkStatus()
        case "lokasi.ambil":
            return getLastLocation()
        case "sensor.akselerometer":
            return readAccelerometer()
        case "sensor.giroskop":
            return readGyroscope()
        case "sensor.magnetometer":
            return readMagnetometer()
        case "bluetooth.status":
            return getBluetoothStatus()
        case "notifikasi.kirim", "notifikasi.jadwal":
            return scheduleNotification(args: args)
        case "haptik.getar", "haptik.pola":
            return triggerHaptic(style: (args["pola"] as? String) ?? "sukses")
        case "berkas.baca":
            return readSandboxFile(relPath: (args["jalur"] as? String) ?? "")
        case "berkas.tulis":
            return writeSandboxFile(relPath: (args["jalur"] as? String) ?? "", content: (args["konten"] as? String) ?? "")
        case "berkas.hapus":
            return deleteSandboxFile(relPath: (args["jalur"] as? String) ?? "")
        default:
            return ["sukses": false, "kodeGalat": "TIDAK_DIDUKUNG", "pesan": "Endpoint '\\(method)' tidak tersedia."]
        }
    }

    func getDeviceInfo() -> [String: Any] {
        let dev = UIDevice.current
        return [
            "sukses": true,
            "platform": "ios",
            "bundleId": bundleId,
            "model": dev.model,
            "namaVersi": "\\(dev.systemName) \\(dev.systemVersion)",
            "frameworks": ["AVFoundation", "PHPicker", "CoreLocation", "CoreMotion", "UserNotifications", "CoreBluetooth", "Security"]
        ]
    }

    func getCameraCapabilities() -> [String: Any] {
        let back = AVCaptureDevice.default(.builtInWideAngleCamera, for: .video, position: .back)
        let front = AVCaptureDevice.default(.builtInWideAngleCamera, for: .video, position: .front)
        return [
            "sukses": true,
            "kameraDepan": front != nil,
            "kameraBelakang": back != nil,
            "flashTersedia": back?.hasFlash == true
        ]
    }

    func getBatteryStatus() -> [String: Any] {
        let dev = UIDevice.current
        dev.isBatteryMonitoringEnabled = true
        let level = dev.batteryLevel >= 0 ? Int(dev.batteryLevel * 100) : -1
        let charging = dev.batteryState == .charging || dev.batteryState == .full
        return ["sukses": true, "level": level, "sedangMengisi": charging, "sumber": "UIDevice.current"]
    }

    func getNetworkStatus() -> [String: Any] {
        let path = pathMonitor.currentPath
        let terhubung = path.status == .satisfied
        let tipe: String
        if !terhubung {
            tipe = "offline"
        } else if path.usesInterfaceType(.wifi) {
            tipe = "wifi"
        } else if path.usesInterfaceType(.cellular) {
            tipe = "seluler"
        } else if path.usesInterfaceType(.wiredEthernet) {
            tipe = "ethernet"
        } else {
            tipe = "lainnya"
        }
        return ["sukses": true, "terhubung": terhubung, "tipe": tipe, "sumber": "Network.NWPathMonitor"]
    }

    func getLastLocation() -> [String: Any] {
        let status = locationManager.authorizationStatus
        guard status == .authorizedWhenInUse || status == .authorizedAlways else {
            return ["sukses": false, "kodeGalat": "IZIN_DITOLAK", "pesan": "Izin lokasi iOS belum diberikan."]
        }
        guard let loc = locationManager.location else {
            return ["sukses": false, "kodeGalat": "PERANGKAT_TIDAK_TERSEDIA", "pesan": "Koordinat CoreLocation belum tersedia."]
        }
        return [
            "sukses": true,
            "latitude": loc.coordinate.latitude,
            "longitude": loc.coordinate.longitude,
            "akurasiMeter": loc.horizontalAccuracy,
            "sumber": "CoreLocation.CLLocationManager"
        ]
    }

    func readAccelerometer() -> [String: Any] {
        guard motionManager.isAccelerometerAvailable else {
            return ["sukses": false, "kodeGalat": "PERANGKAT_TIDAK_TERSEDIA"]
        }
        if !motionManager.isAccelerometerActive {
            motionManager.startAccelerometerUpdates()
        }
        let d = motionManager.accelerometerData?.acceleration
        return [
            "sukses": true,
            "x": d?.x ?? 0.0,
            "y": d?.y ?? 0.0,
            "z": d?.z ?? 0.0,
            "sumber": "CoreMotion.CMMotionManager"
        ]
    }

    func readGyroscope() -> [String: Any] {
        guard motionManager.isGyroAvailable else {
            return ["sukses": false, "kodeGalat": "PERANGKAT_TIDAK_TERSEDIA"]
        }
        if !motionManager.isGyroActive {
            motionManager.startGyroUpdates()
        }
        let r = motionManager.gyroData?.rotationRate
        return [
            "sukses": true,
            "alpha": r?.z ?? 0.0,
            "beta": r?.x ?? 0.0,
            "gamma": r?.y ?? 0.0,
            "sumber": "CoreMotion.CMMotionManager"
        ]
    }

    func readMagnetometer() -> [String: Any] {
        guard motionManager.isMagnetometerAvailable else {
            return ["sukses": false, "kodeGalat": "PERANGKAT_TIDAK_TERSEDIA"]
        }
        if !motionManager.isMagnetometerActive {
            motionManager.startMagnetometerUpdates()
        }
        let m = motionManager.magnetometerData?.magneticField
        return [
            "sukses": true,
            "x": m?.x ?? 0.0,
            "y": m?.y ?? 0.0,
            "z": m?.z ?? 0.0,
            "sumber": "CoreMotion.CMMotionManager"
        ]
    }

    func getBluetoothStatus() -> [String: Any] {
        if centralManager == nil {
            centralManager = CBCentralManager(delegate: self, queue: nil)
        }
        let poweredOn = centralManager?.state == .poweredOn
        return ["sukses": true, "aktif": poweredOn, "mendukungBLE": true, "sumber": "CoreBluetooth.CBCentralManager"]
    }

    func scheduleNotification(args: [String: Any]) -> [String: Any] {
        let id = (args["id"] as? String) ?? UUID().uuidString
        let judul = (args["judul"] as? String) ?? "Nusantara"
        let pesan = (args["pesan"] as? String) ?? ""
        let delay = max(0.1, (args["tundaDetik"] as? Double) ?? 0.1)
        let content = UNMutableNotificationContent()
        content.title = judul
        content.body = pesan
        let trigger = UNTimeIntervalNotificationTrigger(timeInterval: delay, repeats: false)
        let req = UNNotificationRequest(identifier: id, content: content, trigger: trigger)
        UNUserNotificationCenter.current().add(req)
        return ["sukses": true, "id": id, "terjadwal": true]
    }

    func triggerHaptic(style: String) -> [String: Any] {
        let gen = UINotificationFeedbackGenerator()
        switch style {
        case "gagal": gen.notificationOccurred(.error)
        case "peringatan": gen.notificationOccurred(.warning)
        default: gen.notificationOccurred(.success)
        }
        return ["sukses": true, "pola": style]
    }

    private func resolveSandboxURL(_ relPath: String) -> URL? {
        guard let docs = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask).first else { return nil }
        let root = docs.appendingPathComponent("nusantara_sandbox", isDirectory: true).standardizedFileURL
        try? FileManager.default.createDirectory(at: root, withIntermediateDirectories: true)
        let target = root.appendingPathComponent(relPath).standardizedFileURL
        guard target.path.hasPrefix(root.path + "/") else { return nil }
        return target
    }

    func readSandboxFile(relPath: String) -> [String: Any] {
        guard let url = resolveSandboxURL(relPath) else {
            return ["sukses": false, "kodeGalat": "PATH_TIDAK_AMAN"]
        }
        guard let text = try? String(contentsOf: url, encoding: .utf8) else {
            return ["sukses": false, "kodeGalat": "OPERASI_GAGAL"]
        }
        return ["sukses": true, "jalur": relPath, "konten": text, "ukuran": text.utf8.count]
    }

    func writeSandboxFile(relPath: String, content: String) -> [String: Any] {
        guard let url = resolveSandboxURL(relPath) else {
            return ["sukses": false, "kodeGalat": "PATH_TIDAK_AMAN"]
        }
        do {
            try FileManager.default.createDirectory(at: url.deletingLastPathComponent(), withIntermediateDirectories: true)
            try content.write(to: url, atomically: true, encoding: .utf8)
            return ["sukses": true, "jalur": relPath, "byteTertulis": content.utf8.count]
        } catch {
            return ["sukses": false, "kodeGalat": "OPERASI_GAGAL"]
        }
    }

    func deleteSandboxFile(relPath: String) -> [String: Any] {
        guard let url = resolveSandboxURL(relPath) else {
            return ["sukses": false, "kodeGalat": "PATH_TIDAK_AMAN"]
        }
        let existed = FileManager.default.fileExists(atPath: url.path)
        try? FileManager.default.removeItem(at: url)
        return ["sukses": true, "jalur": relPath, "terhapus": existed]
    }

    nonisolated func centralManagerDidUpdateState(_ central: CBCentralManager) {}
}
`;
  }
}
