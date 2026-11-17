# Implementasi Phase 38 — Native Device API

## 1. Perbaikan & Peningkatan Terimplementasi
1. **Penegakan Izin `ditolak_permanen` (`src/mobile/native/core/registry.ts`, `src/mobile/security/permission.ts`)**:
   - Memperbaiki celah di `RegistriNativeAPI.panggil()` di mana status `ditolak_permanen` sebelumnya tidak memicu pemblokiran pra-eksekusi. Kini status `ditolak` dan `ditolak_permanen` sama-sama ditolak tegas dengan `KodeGalatNative.IZIN_DITOLAK`.
   - Menambahkan `mintaIzinSinkron()` dan `RegistriNativeAPI.panggilSinkron()` agar skrip `.nusantara` melalui `std:mobile` mendapat keputusan izin & hasil API secara langsung (tanpa placeholder `'memproses'`).
2. **Penyimpanan Aman Terautentikasi (`src/mobile/security/secure_storage.ts`)**:
   - Meningkatkan enkripsi Node.js dari AES-256-CBC tanpa autentikasi menjadi **AES-256-GCM** (`v2:<iv>:<authTag>:<cipher>`) dengan *Additional Authenticated Data* (AAD) terikat ke nama `kunci`, mencegah pemalsuan ciphertext dan pemindahan antar-kunci.
   - Menambahkan autentikasi **HMAC-SHA256** pada mode browser (`v2b:<iv>:<mac>:<cipher>`).
   - Menambahkan penolakan kunci berbahaya (`__proto__`, `constructor`, `prototype`, kunci kosong, NUL byte).
3. **Hardening Sandbox Berkas & Anti-Symlink (`src/mobile/native/adapters/simulator_adapter.ts`)**:
   - Memperkuat `selesaikanJalurSandbox()` dengan pemeriksaan `fs.lstatSync` & `fs.realpathSync` di setiap segmen jalur serta induk terdekat agar *symlink* di dalam sandbox yang menunjuk keluar direktori akar langsung ditolak dengan `KodeGalatNative.PATH_TIDAK_AMAN`.
   - Memperbaiki pemanggilan `await BerbagiMobile.bagikan()` dan propagasi galat `simpanAman`.
4. **Kejujuran Telemetri & Pemilihan Adaptor Dinamis (`init_all_services.ts`, `capabilities.ts`, `android_adapter.ts`, `ios_adapter.ts`)**:
   - Mengganti referensi adaptor statis saat modul dimuat dengan resolusi dinamis `dapatkanAdaptorPlatformAktif()`.
   - Mengungkapkan hasil probe host nyata (`PemeriksaHardwareHost`) secara transparan pada `kamera.ketersediaan`, `bluetooth.status`, dan `PengelolaKemampuanPerangkat` tanpa mengklaim simulasi sebagai perangkat keras fisik.
5. **Sanitasi Codegen Plugin Native (`native_device_codegen.ts`)**:
   - Menambahkan `sanitasiIdAplikasi()` untuk mencegah injeksi sintaks Kotlin/Swift melalui parameter `appId`/`bundleId` dan menambahkan pemeriksaan string kosong/NUL/symlink pada `resolveSandboxFile` (Kotlin) dan `resolveSandboxURL` (Swift).
6. **Sinkronisasi Standard Library (`src/stdlib/mobile.ts`, `src/mobile/device/clipboard.ts`)**:
   - Mengubah `panggilNative`, `mintaIzin`, dan `tempelPapanKlip` agar berjalan sinkron menggunakan jalur aman cepat saat dipanggil dari interpreter NUSANTARA.
