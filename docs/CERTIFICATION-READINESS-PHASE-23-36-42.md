# NUSANTARA — CERTIFICATION READINESS & CI WORKFLOW INTEGRATION AUDIT (Phase 23 & Phase 36–42)

- **Proyek:** NUSANTARA Programming Language & NUSANTARA OS (`https://github.com/sarjanabahasaarab/Bahasa-Nusantara.git`)
- **Baseline:** `v0.50.0` (cabang `main`)
- **Tanggal Audit Mutakhir:** 23 November 2026 (validasi CI Phase 23 enam target native dan audit Phase 36–42)
- **Status Implementasi Lokal:** **`IMPLEMENTATION COMPLETE`** *(seluruh kode pra-CI, validator integritas artefak, 4 workflow CI lintas platform, gerbang sertifikasi terpusat Phase 23 + 36–42, proteksi rilis, serta dokumentasi telah terpasang dan terverifikasi lokal)*
- **Status Sertifikasi Lintas Platform Penuh:** **`PARTIAL`** *(Phase 23 telah PASS pada 6/6 target native GitHub Actions; keseluruhan Phase 23 + 36–42 tetap PARTIAL karena bukti display fisik, perangkat mobile fisik, signing iOS, dan integrasi SDK toko belum lengkap)*

> **Pembaruan CI 23 November 2026:** Phase 23 kini terverifikasi `PASS` pada enam target native. Evidence macOS x86_64 mencatat host `x86_64`, `isCross=false`, `executionMode=native`, `emulator.used=false`, dan sentinel eksekusi native berhasil. Merge PR #49 tercatat pada commit `31beb4c1bd68659441e87f98b937840c84d2c213`. Status keseluruhan Phase 23 + 36–42 masih `PARTIAL`; jangan menafsirkan kelulusan Phase 23 sebagai sertifikasi hardware/mobile penuh.
- **Status Rilis:** **`BLOCKED`** *(dilarang tag/release/publikasi toko produksi sebelum GitHub Actions CI & gerbang sertifikasi terpusat lulus penuh tanpa `FAIL`/`SKIPPED`/`NOT_VERIFIED`/`BLOCKED`)*

---

## 1. Ringkasan Keputusan & Pemisahan Status Jujur

| Dimensi Keputusan | Status | Penjelasan Faktual |
| :--- | :---: | :--- |
| **Implementasi & Integrasi CI Phase 23.16** | **`IMPLEMENTATION COMPLETE`** | Pre-PR audit selesai, `artifactValidator.ts` & `certificationGate.ts` aktif, 4 workflow GitHub Actions diperbarui dengan C1–C7 + Release Gate, dan seluruh pengujian lokal lulus `0` gagal. |
| **Status Sertifikasi Phase 23 & 36–42** | **`PARTIAL`** | Phase 23 CI: `PASS=6/6` native target, `FAIL=0`, `NOT_VERIFIED=0`. Phase 36–42 masih memiliki blocker hardware/display fisik, emulator Android, signing iOS, dan SDK toko. Status lokal container tetap terpisah dari hasil CI. |
| **Kelayakan Tag / Release / Store Publish** | **`BLOCKED`** | `unified-certification-gate` & `release.yml` (`verify-certification-gate`) secara ketat menolak rilis bila terdapat status `FAIL`, `SKIPPED`, `NOT_VERIFIED`, atau `BLOCKED`. |

---

## 2. Pembaruan Workflow GitHub Actions & Job Baru (Phase C & E)

| Berkas Workflow | Pembaruan Utama yang Diterapkan |
| :--- | :--- |
| **`.github/workflows/ci.yml`** | 1) Penambahan `workflow_dispatch`, `timeout-minutes` di seluruh 11 job.<br>2) `static-checks` menjalankan `npm ci`, `npm run lint`, `npx tsx --version`, dan `npm run build`.<br>3) `test-suite` menjalankan `npm test`, `npm run test:cert-gate`, `npm run test:demo-terpadu`, memvalidasi integritas & `SHA256SUMS` via `scripts/certification-gate.ts verify-artifacts`, dan mengunggah `demo-terpadu-artifacts` (`retention-days: 14`).<br>4) `build-matrix-validation` mencatat log build terperinci (`artifacts/phase23/logs/<target>.log`) berisi runner, compiler, linker, perintah build, triple, format eksekusi, exit code, & SHA-256 tanpa mencampur cross-compile dengan eksekusi native.<br>5) **Job baru C3 (`phase36-gui-matrix`)**: Linux `xvfb-run` + `libgtk-3-dev` + `pkg-config` kompilasi & probe lifecycle GTK3 (terpisah dari monitor fisik), Windows & macOS melaporkan `NOT_VERIFIED` bila tidak ada sesi desktop interaktif.<br>6) **Job baru C4 (`phase37-42-android-sdk`)**: JDK 17 (`temurin`), Android SDK (`build-tools;35.0.0`, `platforms;android-35`, `platform-tools`), keystore ephemeral uji, probe `aapt2`/`apksigner`/`adb`/`/dev/kvm`, & penandaan jujur struktural vs `.dex`/`.aab`.<br>7) **Job baru C5 (`phase37-42-apple`)**: `macos-latest` (tanpa `macos-13`), audit `xcodebuild`, `xcrun simctl`, `codesign`, dan penandaan jujur `.xcarchive` struktural vs `.app` Mach-O / `.ipa`.<br>8) **Job baru C6/C7 (`phase39-42-tls-ota`)**: OpenSSL + `test:mobile-networking-v39` (loopback X.509 CA/Expired/SAN/Drop/Retry/Offline) + `test:pembaruan-v42` (Ed25519, `cabutKunci`, rotasi 3 generasi, HTTP abort, anti-replay rollback).<br>9) **Job baru Phase D (`unified-certification-gate`)**: mengumpulkan seluruh evidence & menjalankan `scripts/certification-gate.ts evaluate` (gagal bila ada `FAIL`/`SKIPPED`/`NOT_VERIFIED`/`BLOCKED`). |
| **`.github/workflows/release.yml`** | 1) Menghapus runner retired `macos-13` (menggunakan `macos-15-intel` untuk `macos-x86_64` native; `macos-latest` untuk `macos-arm64`).<br>2) Menghapus hardcoded timestamp `'2026-10-25T00:00:00.000Z'` dan menggantinya dengan `new Date().toISOString()`.<br>3) Menyetel `dry_run` bawaan `true` pada `workflow_dispatch` dan mewajibkan `github.event_name == 'workflow_dispatch' && inputs.dry_run != true && inputs.confirm_release == true` pada `publish-release` (mencegah publikasi otomatis dari push tag).<br>4) Menambahkan job `verify-certification-gate` yang memeriksa status check-run `Gerbang Sertifikasi Terpusat` di commit target serta menjalankan `scripts/certification-gate.ts evaluate` (mode non-dry-run gagal jika ada fase belum `PASS`).<br>5) Menjalankan `test:demo-terpadu`, `verify-artifacts`, `test:mobile-networking-v39`, `test:pembaruan-v42`, `test:cicd`, `test:cert-gate`, & `quality-gate` secara konsisten dengan CI. |
| **`.github/workflows/kernel-boot-qemu.yml`** | Penambahan root `permissions: contents: read`, `concurrency` control aman, dan peningkatan `timeout-minutes: 10` -> `25` agar stabil selama pemasangan `apt`, 46 suite `npm test`, build ELF/ISO, dan eksekusi QEMU. |
| **`.github/workflows/nusantara-os-ci.yml`** | Penambahan `timeout-minutes` eksplisit pada seluruh 8 job (10–25 menit) dengan tetap mempertahankan `permissions: contents: read` dan `concurrency`. |

---

## 3. Runner, Toolchain & SDK (Tersedia Lokal vs GitHub Actions)

| Komponen / Lingkungan | Kontainer Audit Lokal (`Linux x86_64`) | Runner GitHub Actions Target |
| :--- | :--- | :--- |
| **Runtime & Kriptografi Dasar** | `Node.js v22.23.2`, `npm`, `OpenSSL 3.0.22`, `gcc 12.2.0`, `sha256sum` (**Tersedia**) | `ubuntu-latest`, `windows-latest`, `macos-latest` (`Node 22` + `node:sqlite`) |
| **Native Compiler / Linker Desktop (Phase 23)** | `clang`, `ld.lld`, `llc`, `aarch64-linux-gnu-gcc`, MSVC, WinSDK, MacOSX.sdk (**MISSING**) | `ubuntu-latest` (`clang`, `lld`), `ubuntu-24.04-arm`, `windows-latest`, `windows-11-arm` (opsional/Team), `macos-15-intel` (x86_64 native) dan `macos-latest` (arm64 native) |
| **Desktop Display & GUI (Phase 36)** | Headless (`xvfb-run`, `libgtk-3-dev`, `pkg-config` **MISSING**) | `ubuntu-latest` (`xvfb` + `libgtk-3-dev` virtual headless), `windows-latest`, `macos-latest` (sesi fisik desktop tetap memerlukan host non-headless) |
| **Android Toolchain (Phase 37–42)** | `java`, `gradle`, `ANDROID_HOME`, `aapt2`, `d8`, `apksigner`, `bundletool`, `/dev/kvm` (**MISSING**) | `ubuntu-latest` + `temurin` JDK 17 + `android-actions/setup-android@v3` (`build-tools;35.0.0`, `platform-tools`, `platforms;android-35`) |
| **Apple Toolchain (Phase 37–42)** | macOS, `xcodebuild`, `xcrun simctl`, `codesign` (**MISSING**) | `macos-latest` (Apple Silicon + Xcode + iOS Simulator) |
| **Hardware Ponsel & Layanan Cloud** | Tidak terhubung (**NOT_VERIFIED**) | Di luar runner publik standar (memerlukan perangkat fisik + akun sandbox toko opsional) |

---

## 4. Matriks Status Phase 23 & Phase 36–42 (Evaluasi Terkini)

| Fase | Nama | Unit / Loopback | Native / Hardware / SDK | Status Fase Jujur |
| :---: | :--- | :---: | :---: | :---: |
| **23** | Build System & Desktop Distribution | **`PASS`** (`test:build-v23` lokal; keterbatasan toolchain lokal tetap dicatat) | **`PASS`** (CI native 6/6 target; termasuk macOS x86_64 pada `macos-15-intel`, `isCross=false`, `executionMode=native`) | **`PASS`** *(CI Phase 23)* |
| **36** | Desktop GUI Framework | **`PASS`** (`test:gui-v36`: 22/22 LULUS; BMP/SVG/HTML/Bundle SHA256SUMS PASS) | **`NOT_VERIFIED`** (`Xvfb` GTK3 di Linux CI disiapkan, namun display fisik monitor + Win32/Cocoa interaktif belum terverifikasi) | **`PARTIAL`** *(Gate: `NOT_VERIFIED`)* |
| **37** | Mobile Framework | **`PASS`** (`test:mobile-v37`: 40/40 LULUS; state, navigator, codegen Kotlin/Swift) | **`PARTIAL`** (Android APK/AAB berhasil dibangun; emulator install/launch menunggu hasil final. iOS Simulator build/launch PASS pada CI utama; perangkat fisik belum diuji) | **`PARTIAL`** *(Gate: `NOT_VERIFIED`)* |
| **38** | Native Device API | **`PASS`** (`test:native-api-v38`: 24/24 LULUS; AES-256-GCM `v2:`, anti-symlink, codegen) | **`NOT_VERIFIED`** (Sensor kamera, GPS, IMU, BLE GATT & biometrik perangkat fisik belum diuji) | **`PARTIAL`** *(Gate: `NOT_VERIFIED`)* |
| **39** | Mobile Networking | **`PASS`** (`test:mobile-networking-v39`: 40/40 LULUS termasuk OpenSSL HTTPS X.509 CA/Expired/SAN/Drop/Retry) | **`NOT_VERIFIED`** (Pinning SPKI native OkHttp/`URLSession` & jaringan seluler perangkat nyata belum diuji) | **`PARTIAL`** *(Gate: `NOT_VERIFIED`)* |
| **40** | Mobile Application Distribution | **`PASS`** (`test:distribusi-v40`: 100/100 LULUS) | **`PARTIAL`** (APK berisi `classes.dex`, AAB berisi bundle/dex dan verifikasi `apksigner` PASS; `.xcarchive`/IPA iOS belum dibuat) | **`PARTIAL`** *(Gate: `NOT_VERIFIED`)* |
| **41** | Store Publishing & Digital Signing | **`PASS`** (`test:publikasi-v41`: 107/107 LULUS; JWT RS256/ES256 loopback + `ApprovalGate`) | **`PARTIAL`** (Android `apksigner` + ephemeral keystore PASS; iOS ad-hoc/development signing dan unggah sandbox toko belum diverifikasi; produksi tetap manual) | **`PARTIAL`** *(Gate: `NOT_VERIFIED`)* |
| **42** | OTA Updates & Secure Update System | **`PASS`** (`test:pembaruan-v42`: 27/27 LULUS; Ed25519, `cabutKunci`, rotasi 3 generasi, abort parsial, rollback anti-replay) | **`NOT_VERIFIED`** (Play Core In-App Updates, StoreKit iOS, & CDN HTTPS jarak jauh perangkat nyata belum diuji) | **`PARTIAL`** *(Gate: `NOT_VERIFIED`)* |

---

## 5. Cara Menjalankan Workflow, Perintah Lokal & Kebutuhan Secrets

### 5.1 Cara Menjalankan Workflow Secara Manual / PR
1. **CI Pipeline (`.github/workflows/ci.yml`):** Terpicu otomatis pada `push`/`pull_request` ke `main`/`master` atau manual via tab *Actions -> NUSANTARA Continuous Integration -> Run workflow*. Pekerjaan utama (`static-checks`, `test-suite`, `quality-gate`, `build-matrix-validation`, `phase36-gui-matrix`, `phase37-42-android-sdk`, `phase37-42-apple`, `phase39-42-tls-ota`, `phase23-certification-gate`, dan `unified-certification-gate`) berjalan berurutan dan menghasilkan `CERTIFICATION-GATE-REPORT.json` serta `CERTIFICATION-GATE-REPORT.md`.
2. **Simulasi Rilis Non-Produksi (`.github/workflows/release.yml`):** Gunakan `workflow_dispatch` dengan `dry_run: true` (nilai bawaan). Mode ini memverifikasi konsistensi versi, menjalankan rangkaian uji konsisten CI, memeriksa integritas `manifest.json` + `SHA256SUMS`, serta menulis laporan evaluasi tanpa membuat tag maupun GitHub Release.
3. **Pemeriksaan Gerbang Sertifikasi Lokal:**
   ```bash
   npx tsx scripts/certification-gate.ts verify-artifacts --dir artifacts/demo-terpadu --min-artifacts 20
   npx tsx scripts/certification-gate.ts probe-toolchains
   npx tsx scripts/certification-gate.ts evaluate --phase23-evidence-dir artifacts/phase23/evidence --demo-dir artifacts/demo-terpadu --snapshot
   ```

### 5.2 Kebutuhan Secrets (Hanya Nama, Tanpa Nilai)
- **Untuk CI & Release Dry-Run:** Hanya menggunakan **`GITHUB_TOKEN`** bawaan GitHub Actions (izin minimum `contents: read`; `contents: write` terbatas pada job `publish-release` saat non-dry-run & setelah gate lulus). Tidak memerlukan secret toko produksi.
- **Untuk Rilis / Publikasi Toko Masa Depan (Opsional Setelah Sertifikasi Penuh, Saat Ini Diblokir):**
  - Android Signing / Play Console (sandbox/produksi): `ANDROID_KEYSTORE_BASE64`, `NUSANTARA_KS_PASS`, `NUSANTARA_KEY_PASS`, `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON`.
  - Apple Signing / App Store Connect: `APPLE_SIGNING_CERT_P12_BASE64`, `APPLE_SIGNING_CERT_PASSWORD`, `APPLE_PROVISIONING_PROFILE_BASE64`, `APP_STORE_CONNECT_API_KEY_ID`, `APP_STORE_CONNECT_ISSUER_ID`, `APP_STORE_CONNECT_PRIVATE_KEY`.
  - OTA Trust Key (bila memakai CDN eksternal): `OTA_SIGNING_PRIVATE_KEY_ED25519` (di environment approval-protected).

---

## 6. Batasan Lingkungan & Sisa Pekerjaan Sebelum `CROSS-PLATFORM CERTIFIED`

1. **Runner `windows-11-arm`:** Ketersediaan bergantung pada paket/runner GitHub repository (`windows-11-arm`); bila belum aktif, perlu penyedia runner ARM64 Windows atau dokumentasi status `NOT_VERIFIED`.
2. **Proyek Gradle & Xcode Lengkap:** Template native penuh yang mengompilasi `.dex` (`classes.dex`) + `bundletool` `.aab` serta proyek Xcode menghasilkan Mach-O `.app` + `.ipa` perlu dieksekusi di runner CI + Android Emulator/iOS Simulator.
3. **Pengujian Perangkat Fisik & Display Non-Headless:** Verifikasi monitor desktop fisik (Phase 36), kamera/GPS/IMU/BLE/biometrik perangkat keras (Phase 38), pinning SPKI jaringan seluler (Phase 39), serta Play Core/StoreKit CDN fisik (Phase 42) masih berstatus `NOT_VERIFIED`.
4. **Penonaktifan `bun.lock` Pra-PR:** Pastikan berkas `bun.lock` (`name: "react-example"`) yang dibuat container Bun runtime tidak di-commit ke repositori git saat membuat PR.
