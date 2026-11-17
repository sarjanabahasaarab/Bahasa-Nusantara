# Pengujian Phase 38 — Native Device API

## 1. Perintah Verifikasi
- TypeScript lint: `npm run lint` (`tsc --noEmit`) — exit `0`
- Suite Fase 38: `npm run test:native-api-v38` (`npx ts-node pengujian/mobile/uji_native_api_fase38.ts`) — **24/24 LULUS**

## 2. Cakupan Suite `uji_native_api_fase38.ts`
- `[1]` Registri Native API (35 endpoint terdaftar) & filter kategori (`1.1`–`1.2`).
- `[2]` `PengelolaKemampuanPerangkat` deteksi kemampuan & fitur non-eksis (`2.1`).
- `[3]` `PengirimPeristiwaNative` mekanisme langganan/unsubscribe peristiwa (`3.1`).
- `[4]` Penegakan izin kamera di `RegistriNativeAPI` (`4.1`).
- `[5]` Adaptor `Simulator`, `Android`, dan `iOS` (`5.1`–`5.3`).
- `[6]` Sensor, anti-path traversal `../../etc/passwd`, dan penyimpanan aman (`6.1`–`6.3`).
- `[7]` CLI `nusantara mobile api daftar`, `api periksa kamera.ambil`, `permission daftar`, `device info` (`7.1`–`7.3`).
- `[8]` Ekspor `std:mobile` & eksekusi skrip `.nusantara` nyata `contoh/mobile/device_explorer/device_explorer.nusantara` (`8.1`–`8.2`).
- `[9]` `PemeriksaHardwareHost`, sandbox disk I/O nyata (tulis/baca/hapus), & codegen plugin Kotlin/Swift via CLI `mobile build` (`9.1`–`9.3`).
- `[10]` Pengujian Regresi & Keamanan baru (`10.1`–`10.5`):
  - `10.1`: Penolakan `ditolak_permanen` di `panggil()` dan `panggilSinkron()`.
  - `10.2`: Verifikasi autentikasi AES-256-GCM (tamper ciphertext mengembalikan `null`) & penolakan `__proto__`/`constructor`.
  - `10.3`: Anti-symlink escape di `AdaptorSimulatorMobile` terhadap symlink mengarah ke direktori luar sandbox.
  - `10.4`: Sanitasi injeksi package/bundle ID Kotlin & Swift + pergantian adaptor dinamis `tetapkanAdaptorPlatform`.
  - `10.5`: Eksekusi sinkron `.nusantara` `mintaIzin`, `salinPapanKlip`/`tempelPapanKlip`, dan `panggilNative`.
