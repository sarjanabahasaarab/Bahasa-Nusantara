# Dukungan Platform Phase 38 — Native Device API

| Target / Subsistem | Status Verifikasi Lokal | Catatan Pembuktian |
|---|---|---|
| **Runtime Node.js (Linux x86_64)** | `TERVERIFIKASI (LULUS)` | Telemetri OS (`os.networkInterfaces`, `/sys/class/power_supply`, `/dev/video*`, `/sys/class/bluetooth`, cek `adb`), disk sandbox nyata, AES-256-GCM, 24/24 uji lulus |
| **Interpreter `std:mobile` (`.nusantara`)** | `TERVERIFIKASI (LULUS)` | `device_explorer.nusantara` + skrip sinkron `panggilNative` / `mintaIzin` |
| **Codegen Plugin Kotlin (`NusantaraDeviceApiPlugin.kt`)** | `TERVERIFIKASI SEBAGIAN` | Kode sumber & kontrak API Android dihasilkan via `mobile build android`; belum dikompilasi Gradle/JDK di lingkungan ini (`javac`/`gradle` tidak terpasang) |
| **Codegen Plugin Swift (`NusantaraDeviceApiPlugin.swift`)** | `TERVERIFIKASI SEBAGIAN` | Kode sumber & kontrak Swift dihasilkan via `mobile build ios`; belum dikompilasi Xcode (host Linux, non-macOS) |
| **Hardware Fisik Android (ADB / Camera2 / GPS / BLE)** | `BELUM DIVERIFIKASI` | Tidak ada perangkat ADB/emulator aktif (`adb` tidak terpasang) |
| **Hardware Fisik iOS (AVFoundation / CoreMotion / Keychain)** | `BELUM DIVERIFIKASI` | Memerlukan host macOS + Xcode + perangkat/simulator iOS |
