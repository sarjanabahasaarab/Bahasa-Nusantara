# Arsitektur Phase 38 — Native Device API & Device Security

## 1. Gambaran Umum
Phase 38 menyediakan lapisan abstraksi Native Device API terpadu bagi aplikasi NUSANTARA Mobile lintas platform (`android`, `ios`, dan `simulator`), menghubungkan interpreter/runtime bahasa NUSANTARA (`std:mobile`), `RegistriNativeAPI`, pengelola izin (`PengelolaIzinMobile`), pemeriksaan perangkat keras host nyata (`PemeriksaHardwareHost`), adaptor platform, serta generator kode plugin native Android (Kotlin) dan iOS (Swift).

## 2. Komponen Arsitektur
- **Core Native Engine (`/src/mobile/native/core/`)**:
  - `registry.ts` (`RegistriNativeAPI`): Registri tunggal 35 endpoint Native API dengan eksekusi async (`panggil`) dan sync (`panggilSinkron`), validasi ketersediaan platform, dan penegakan izin pra-eksekusi.
  - `capabilities.ts` (`PengelolaKemampuanPerangkat`): Deteksi kemampuan perangkat + pengungkapan jujur `probeHost` (status `sysfs`, V4L2, Bluetooth HCI, ADB, mode kontrak simulasi).
  - `hardware_probe.ts` (`PemeriksaHardwareHost`): Probe runtime nyata terhadap OS host (`os.networkInterfaces`, `/sys/class/power_supply`, `/dev/video*`, `/sys/class/bluetooth`, dan `adb devices`).
  - `events.ts` (`PengirimPeristiwaNative`): Bus peristiwa reaktif untuk stream sensor, lokasi, dan Bluetooth.
  - `result.ts`: Standar amplop `HasilOperasiNative<T>` & enum `KodeGalatNative`.
- **Platform Adapters (`/src/mobile/native/adapters/`)**:
  - `AdaptorSimulatorMobile`: Disk sandbox nyata terisolasi, pembacaan telemetri jaringan/OS host nyata, dan kontrak simulasi yang jujur (`sumberData`) untuk sensor/kamera/GPS saat hardware fisik tidak tersedia.
  - `AdaptorAndroidMobile` & `AdaptorIOSMobile`: Kontrak adaptor platform target dengan deteksi ketersediaan `adb` / `xcodebuild`.
- **Services & Native Codegen**:
  - `/src/mobile/native/services/init_all_services.ts`: Registrasi 35 API dalam 16 kategori (`perangkat`, `kamera`, `media`, `lokasi`, `notifikasi`, `sensor`, `bluetooth`, `baterai`, `jaringan`, `audio`, `berkas`, `papan_klip`, `bagikan`, `simpan_aman`, `haptik`, `lifecycle`).
  - `/src/mobile/native/codegen/native_device_codegen.ts`: Emitter `NusantaraDeviceApiPlugin.kt` (Android SDK) dan `NusantaraDeviceApiPlugin.swift` (iOS UIKit/CoreLocation/CoreMotion/Security).
- **Keamanan Perangkat (`/src/mobile/security/`)**:
  - `permission.ts` (`PengelolaIzinMobile`): Siklus hidup izin (`belum_diminta`, `diberikan`, `ditolak`, `ditolak_permanen`).
  - `secure_storage.ts` (`PenyimpananAmanMobile`): Penyimpanan terenkripsi terautentikasi **AES-256-GCM** di Node.js (AAD terikat kunci) & CTR+HMAC-SHA256 di browser.
