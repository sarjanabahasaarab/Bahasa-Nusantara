# Panduan Pengumpulan Evidence Fisik — Phase 36–42

Dokumen ini menjelaskan bukti yang dibutuhkan agar gerbang sertifikasi NUSANTARA dapat mengubah status `NOT_VERIFIED` menjadi `PASS`. **Jangan mengubah status hanya untuk meloloskan CI.** Evidence harus berasal dari eksekusi nyata, memiliki provenance, dan menyertakan log/artefak yang dapat diperiksa.

## 1. Aturan provenance

Setiap berkas evidence harus berupa JSON UTF-8 dan memuat:

- `schemaVersion: 1`
- `jobId` yang mengandung kata kunci yang dikenali evaluator
- `phase`, `runner`, `os`, `arch`
- `status` dan `unitTestStatus`
- `commitSha`: SHA commit yang benar-benar diuji
- `workflowRunId`: run ID yang benar-benar menjalankan tes
- `evidenceScope: "ci-workflow"` untuk evidence dari workflow atau `"local-snapshot"` untuk pengujian lokal
- `isNativeHardware: true` hanya jika pengujian benar-benar berjalan pada perangkat fisik
- `generatedAt` dalam ISO-8601 UTC
- `details` berisi hasil tes aktual, bukan klaim manual tanpa log
- `blockers: []` jika seluruh kriteria pada evidence tersebut telah dipenuhi

Jangan gunakan ulang SHA, run ID, waktu, atau log dari pengujian sebelumnya. Jangan memasukkan kredensial, private key, provisioning profile, token, atau data pribadi ke evidence.

## 2. Phase 36 — GUI desktop fisik

Evidence Linux Xvfb hanya membuktikan rendering virtual/headless; tidak menggantikan pengujian layar fisik. Untuk Windows dan macOS, jalankan aplikasi di sesi desktop interaktif.

Checklist:
- Windows: buat/jalankan jendela Win32 dan WebView2; verifikasi create/show/resize/focus/input/close serta tidak ada proses yatim.
- macOS: buat/jalankan NSWindow melalui sesi Aqua; verifikasi lifecycle, resize, focus, input, dan close.
- Layar fisik: uji rendering, DPI/scaling, keyboard, mouse/touchpad, dan perubahan ukuran pada monitor yang benar-benar terpasang.
- Simpan log proses, versi OS, resolusi/DPI, identitas runner/perangkat, dan rekaman/screenshot yang tidak mengandung data sensitif.

Berkas evidence GUI harus memiliki `jobId` yang mengandung `phase36`, `status: "PASS"`, `isNativeHardware: true` untuk tes perangkat fisik, serta `displayMode: "win32-desktop"`, `"cocoa-desktop"`, atau mode layar fisik yang benar. Jangan menandai Xvfb sebagai hardware fisik.

## 3. Phase 37 — Build Android dan iOS Simulator

Android:
- Build APK Gradle/D8 yang benar-benar berisi `classes.dex`.
- Boot Android Emulator dan install/launch APK.
- Simpan log Gradle, versi JDK/SDK/build-tools, emulator image/API level, dan hasil install/launch.

iOS:
- Jalankan `xcodebuild` untuk menghasilkan aplikasi Mach-O.
- Boot iOS Simulator, install dan launch aplikasi.
- Simpan versi Xcode, simulator runtime/device, log build dan launch.

Field yang dibaca evaluator:
- Android: `details.apkCompiledWithDex=true` dan `details.emulatorBooted=true`.
- Apple: `details.machOCompiled=true` dan `details.simulatorLaunched=true`.

## 4. Phase 38 — Sensor perangkat fisik

Jalankan aplikasi di ponsel nyata. Uji kamera, GNSS/GPS, accelerometer/gyroscope/IMU, BLE, dan API biometrik/secure hardware yang didukung perangkat. Catat model perangkat, versi OS, izin yang diberikan, hasil tiap sensor, dan log. Jangan menyatakan sensor yang tidak tersedia sebagai lulus.

Field evaluator: `details.physicalDeviceHardwareVerified=true` hanya setelah seluruh sensor/API yang diwajibkan benar-benar diuji. Evidence harus berasal dari ponsel nyata, bukan emulator.

## 5. Phase 39 — Native SPKI dan jaringan seluler

Jalankan implementasi OkHttp Android dan URLSession/BackgroundSession iOS pada perangkat nyata. Uji:
- certificate/public-key pinning dengan pin valid dan pin salah;
- sertifikat kedaluwarsa, CA tidak dipercaya, hostname/SAN salah;
- rotasi pin dengan overlap aman;
- perpindahan Wi-Fi ↔ jaringan seluler, kehilangan koneksi, retry, dan background resume.

Field evaluator: `details.nativeSpkiPinningVerified=true` hanya setelah tes native Android dan iOS yang diwajibkan berhasil. Uji OpenSSL loopback tetap dicatat terpisah dan tidak menggantikan tes seluler.

## 6. Phase 40 — Paket distribusi native

Android:
- Hasilkan APK dengan `classes.dex`.
- Hasilkan AAB menggunakan bundletool.
- Verifikasi APK dengan `apksigner verify`.
- Install APK pada emulator/perangkat uji dan jalankan aplikasi.

iOS:
- Hasilkan `.xcarchive` melalui Xcode.
- Pastikan aplikasi berisi Mach-O.
- Ekspor `.ipa` dari archive dan validasi struktur/metadata.

Field evaluator:
- Android: `apkCompiledWithDex=true`, `aabBuiltWithBundletool=true`, `apksignerVerified=true`.
- Apple: `machOCompiled=true`, `xcarchiveBuilt=true`, `ipaProduced=true`.

## 7. Phase 41 — Signing sandbox non-produksi

Gunakan sertifikat/keystore sementara khusus pengujian. Jangan gunakan kunci produksi. Simpan hanya metadata publik dan hasil verifikasi; jangan unggah keystore, private key, password, provisioning profile, atau credential.

Field evaluator:
- Android evidence: `details.ephemeralKeystoreSigned=true` setelah APK native ditandatangani dan `apksigner verify` sukses.
- Apple evidence: `details.adHocOrDevSigned=true` setelah `codesign` dan validasi provisioning/dev signing sukses.

## 8. Phase 42 — OTA, Play Core, StoreKit, CDN

Jalankan integrasi pada build native dan perangkat uji:
- Android Play Core In-App Updates: immediate/flexible flow, cancel, resume, install completion.
- iOS StoreKit sesuai mekanisme distribusi yang digunakan; verifikasi alur update yang memang didukung platform.
- CDN HTTPS: signature verification, version pinning, partial download, retry, rollback atomik, anti-replay, dan key rotation.
- Uji kegagalan jaringan dan pastikan aplikasi tidak menerima paket tanpa signature sah.

Field evaluator: `details.playCoreAndStoreKitVerified=true` setelah integrasi native Android/iOS dan CDN diuji. Regresi Ed25519/rollback yang sudah lulus unit test tetap dicatat terpisah.

## 9. Contoh struktur evidence

Contoh ini hanya kerangka dokumentasi, **bukan evidence lulus**. Isi dengan nilai aktual dan jangan mengubah `NOT_VERIFIED` menjadi `PASS` sebelum tes berhasil.

```json
{
  "schemaVersion": 1,
  "jobId": "phase37-42-android-physical-device",
  "phase": "37,38,39,40,41,42",
  "runner": "local-android-device",
  "os": "Android",
  "arch": "arm64-v8a",
  "status": "NOT_VERIFIED",
  "unitTestStatus": "NOT_VERIFIED",
  "commitSha": "REPLACE_WITH_TESTED_COMMIT_SHA",
  "workflowRunId": "REPLACE_WITH_REAL_RUN_ID_OR_LOCAL_RUN_REFERENCE",
  "evidenceScope": "local-snapshot",
  "isNativeHardware": true,
  "toolchains": {},
  "details": {
    "apkCompiledWithDex": false,
    "emulatorBooted": false,
    "physicalDeviceHardwareVerified": false,
    "nativeSpkiPinningVerified": false,
    "aabBuiltWithBundletool": false,
    "apksignerVerified": false,
    "ephemeralKeystoreSigned": false,
    "playCoreAndStoreKitVerified": false
  },
  "blockers": [
    "Ganti hanya setelah pengujian nyata; lampirkan log dan checksum artefak."
  ],
  "generatedAt": "REPLACE_WITH_ACTUAL_UTC_TIMESTAMP"
}
```

Untuk Apple, buat evidence terpisah dengan `jobId` yang mengandung `apple` atau `ios`, dan isi field khusus `machOCompiled`, `simulatorLaunched`, `xcarchiveBuilt`, `ipaProduced`, serta `adHocOrDevSigned`.

## 10. Pemeriksaan sebelum mengirim evidence

1. Pastikan JSON valid: `node -e "JSON.parse(require('fs').readFileSync(process.argv[1], 'utf8'))" berkas.json`.
2. Hitung checksum SHA-256 untuk APK/AAB/IPA dan log.
3. Pastikan SHA commit cocok dengan source yang diuji.
4. Pastikan evidence tidak memuat rahasia.
5. Jalankan kembali gerbang: `npm run test:cert-gate` dan workflow CI dengan evidence yang terlampir.
6. Tinjau laporan `CERTIFICATION-GATE-REPORT.md`; setiap kriteria harus PASS dan tidak boleh ada evidence corrupt.

## 11. Batasan sertifikasi

- CI headless/Xvfb tidak membuktikan GUI desktop fisik.
- Android SDK terpasang tidak membuktikan APK/AAB native telah dibuat.
- Emulator tidak membuktikan kamera/GNSS/IMU/BLE/TEE perangkat nyata.
- TLS loopback tidak membuktikan pinning SPKI di jaringan seluler.
- ZIP struktural tidak membuktikan APK/AAB/IPA native.
- Unit test OTA tidak membuktikan Play Core, StoreKit, dan CDN produksi.
- Jangan memulai Phase 51 atau menyatakan Phase 36–42 tersertifikasi penuh selama blocker wajib masih ada.
