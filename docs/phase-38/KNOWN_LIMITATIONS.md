# Keterbatasan yang Diketahui Phase 38 — Native Device API

1. **Tidak Ada Perangkat Fisik Android/iOS pada Lingkungan Uji**:
   - Host uji adalah Linux kontainer tanpa kamera V4L2, tanpa adaptor Bluetooth HCI, tanpa baterai sysfs (`NoBatteryNode`), dan tanpa `adb` / Xcode. Pemanggilan sensor, kamera, Bluetooth scan, dan GPS pada simulator menghasilkan nilai kontrak simulasi dengan `sumberData` yang eksplisit.
2. **Codegen Plugin Native Belum Dikompilasi oleh Gradle/Xcode**:
   - `NusantaraDeviceApiPlugin.kt` dan `NusantaraDeviceApiPlugin.swift` telah divalidasi secara struktural dan sanitasi oleh pengujian Fase 38, namun kompilasi biner Kotlin (`gradlew`) maupun Swift (`xcodebuild`) belum dapat dijalankan secara lokal karena toolchain Android SDK & Xcode tidak tersedia di lingkungan Linux ini.
3. **Penyimpanan Aman Dalam-Memori Antar-Sesi Runtime**:
   - `PenyimpananAmanMobile` menyimpan ciphertext AES-256-GCM di memori proses (`Map<string, string>`), tidak menulis ke Keystore/Keychain OS fisik saat berjalan di Node.js CLI simulator.
4. **Panggilan Asinkron Murni yang Belum Memiliki `eksekusiSinkron`**:
   - Sebagian besar API berorientasi UI/eksternal (`audio.*`, `bluetooth.pindai`, `galeri.*`, `lokasi.*`, `notifikasi.*`, `perangkat.info`, `sensor.*`, `baterai.info`, `jaringan.status`, `berkas.*`, `simpan_aman.*`, `haptik.*`, `papan_klip.*`, `bagikan.*`, `lifecycle.*`) sudah memiliki dukungan `panggilSinkron`; namun untuk `bluetooth.pindai` dan `audio.*` pada `.nusantara` masih mengandalkan panggilan asinkron TypeScript atau kontrak native.
