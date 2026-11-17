# Keamanan Phase 38 — Native Device API & Device Security

## 1. Mekanisme Keamanan yang Diterapkan
- **Enkripsi Terautentikasi AES-256-GCM (`PenyimpananAmanMobile`)**:
  - Kunci diturunkan memakai `scryptSync` dengan garam acak per-instance (saat memakai rahasia runtime) atau terikat `NUSANTARA_MOBILE_KEYSTORE_SECRET`.
  - Setiap entri dienkripsi dengan `aes-256-gcm` (IV 12-byte acak, Tag autentikasi 16-byte) dan AAD terikat nama kunci (`kunci`), sehingga manipulasi ciphertext maupun penukaran ciphertext antar-kunci selalu gagal autentikasi (`null`).
  - Jalur browser isomorfis memakai CTR berbasis SHA-256 ditambah **HMAC-SHA256** terverifikasi waktu konstan.
  - Kunci `__proto__`, `constructor`, `prototype`, kosong, atau mengandung NUL byte ditolak.
- **Penegakan Izin Ketat (`RegistriNativeAPI` & `PengelolaIzinMobile`)**:
  - Status `ditolak` dan `ditolak_permanen` sama-sama memblokir eksekusi API sensitif baik melalui jalur `async panggil()` maupun jalur `sync panggilSinkron()` dengan kode `IZIN_DITOLAK`.
- **Isolasi Sandbox Berkas Anti-Traversal & Anti-Symlink (`AdaptorSimulatorMobile`, Kotlin, Swift)**:
  - Menolak karakter NUL, jalur absolut (`/...`, `\...`), dan urutan `..`.
  - Memeriksa setiap segmen jalur dengan `fs.lstatSync` dan `fs.realpathSync` agar *symlink* di dalam sandbox tidak dapat digunakan untuk membaca atau menulis berkas di luar direktori akar sandbox.
- **Sanitasi Codegen Native**:
  - `sanitasiIdAplikasi()` memvalidasi `appId` dan `bundleId` agar tidak dapat menyuntikkan baris baru, titik koma, atau string literal berbahaya ke `NusantaraDeviceApiPlugin.kt` maupun `NusantaraDeviceApiPlugin.swift`.
