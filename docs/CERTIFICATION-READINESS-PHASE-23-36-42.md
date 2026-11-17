# NUSANTARA — FINAL CI CERTIFICATION READINESS AUDIT (Phase 23 & Phase 36–42)

- **Proyek:** NUSANTARA Programming Language & NUSANTARA OS (`https://github.com/sarjanabahasaarab/Bahasa-Nusantara.git`)
- **Baseline:** `v0.50.0` (cabang `main`)
- **Tanggal Audit:** 17 November 2026
- **Lingkungan Audit Saat Ini:** Kontainer Linux `x86_64` (`Node.js v22.23.2`, `gcc 12.2.0`), **tanpa** `clang`, `lld`/`ld.lld`, `llvm-as`, `llc`, `aarch64-linux-gnu-gcc`, `pwsh`, `qemu-system-x86_64`, `qemu-aarch64`, `xvfb-run`, `pkg-config`/`libgtk-3-dev`, `java`/`javac`/`gradle`/`adb`/`apksigner`/`bundletool`/`ANDROID_HOME`, serta **tanpa** `macOS`/`xcodebuild`/`xcrun`.
- **Dokumen Rujukan:** Laporan ini disusun murni berdasarkan inspeksi langsung kode sumber, skrip pengujian, berkas artefak di disk, serta seluruh 4 workflow di `.github/workflows/`.

---

## 1. Keputusan Akhir (`N`)

| Dimensi Keputusan | Status | Penjelasan Faktual |
| :--- | :---: | :--- |
| **Kesiapan Sertifikasi Lintas Platform Penuh (CI Hardware/SDK/Native)** | **`NOT_READY`** | Kontainer lokal tidak memiliki toolchain native/SDK/display; `.github/workflows/ci.yml` baru memiliki job sertifikasi biner native untuk **Phase 23**, belum memiliki job CI terdedikasi untuk virtual display (**Phase 36**), Android SDK/Gradle/Emulator & Xcode/iOS Simulator (**Phase 37–38, 40**), TLS CA nyata (**Phase 39**), `apksigner`/`codesign` (**Phase 41**), serta rotasi/pencabutan kunci & chunked-interruption OTA (**Phase 42**). Runner ARM64 (`windows-11-arm`, `ubuntu-24.04-arm`) dan `macos-13` pada workflow rilis berisiko gagal/antre bila tidak tersedia pada paket runner GitHub. |
| **Status Implementasi & Uji Software/Loopback Lokal** | **`PARTIAL`** | Seluruh test suite software/loopback TS lulus (`0` gagal di `test:build-v23`, `test:gui-v36`..`test:pembaruan-v42`, `test:cicd`, `test:demo-terpadu`, `quality-gate`, `tsc --noEmit`, `vite build`), namun uji perangkat keras, emulator, display OS, SDK Android/Apple, dan sertifikat toko produksi berstatus `NOT_VERIFIED` / belum diuji. |
| **Kelayakan `commit` / `push` Saat Ini** | **`PARTIAL` (Layak untuk Push ke Branch/PR Uji Pipeline dengan Catatan; `BLOCKED` untuk Tag/Release Sertifikasi)** | **Jangan buat tag, jangan rilis, dan jangan jalankan publikasi toko.** Kode aman untuk ditinjau/di-push ke cabang kerja **hanya setelah** pembersihan import tak terpakai di `src/paket/cli.ts`, pengecualian `bun.lock` bila menggunakan `npm ci`, penambahan regression test celah Phase 42/Demo, dan pembaruan workflow `.github/workflows/ci.yml` + `.github/workflows/release.yml`. Promosi rilis tetap **`BLOCKED`** hingga seluruh gerbang CI nyata lulus tanpa `NOT_VERIFIED`. |

---

## 2. Status Kesiapan Setiap Fase

| Fase | Judul Fase | Hasil Uji Kontainer Lokal | Cakupan yang Sudah Terbukti | Cakupan Belum Terverifikasi / Blocker CI | Status |
| :---: | :--- | :--- | :--- | :--- | :---: |
| **23** | Build System & Desktop Distribution | `test:build-v23`: **46 PASS, 0 FAIL, 3 NOT_VERIFIED** (Total 49); `local-snapshot`: **0/6 PASS, 6/6 NOT_VERIFIED** | NIR -> LLVM IR, `TargetTripleManager` 6 target, `BinaryInspector.inspectStrict`, `DesktopInstallerGenerator` POSIX sandbox (`install.sh`, tamper check, rollback atomik, `uninstall.sh`), ZIP/TAR.GZ anti-symlink & anti-bomb, CLI `.zip`/`.tar.gz`. | Kompilasi & eksekusi native biner ELF/PE32+/Mach-O pada 6 target di kontainer tanpa `clang`/`lld`/MSVC/MacOSX SDK; uji PowerShell sandbox `5.3` & `5.4` tanpa `pwsh`; runner ARM64 di CI. | **`PARTIAL`** |
| **36** | Desktop GUI Framework | `test:gui-v36`: **22/22 PASS** | AST/widget tree, layout engine, theme/CSS rules, XSS/CSS escaping, framebuffer BMP (`192.054 B`, header `BM`) & PPM/SVG/HTML, webview CSP/`Origin`, paket `SHA256SUMS`, CLI `desktop`. | Pembuatan window OS fisik & rendering interaktif pada X11/Wayland/GTK3 (`DISPLAY`/`WAYLAND_DISPLAY` kosong), Win32/WebView2, macOS Cocoa; CI belum menjalankan `xvfb-run` atau UI runner Windows/macOS. | **`PARTIAL`** |
| **37** | Mobile Framework | `test:mobile-v37`: **40/40 PASS** | State/reactivity, `Navigator`, deep link, imunitas prototype pollution, lifecycle event bus, perender HTML/SVG, scaffolding proyek Kotlin/Gradle & Swift/Xcode, preview HTTP/WS localhost. | **Dukungan Android & iOS belum selesai terkompilasi**: Android SDK + Gradle + Emulator APK build/launch/rotation/state restoration; macOS + Xcode + iOS Simulator build/launch/state restoration. | **`PARTIAL`** |
| **38** | Native Device API | `test:native-api-v38`: **24/24 PASS** | Registry & kontrak 15 layanan, status `ditolak_permanen` keras, enkripsi AES-256-GCM (`v2:`) di memori, anti-symlink simulator, sanitasi codegen Kotlin/Swift, eksekusi skrip `std:mobile`. | Seluruh pengujian baru di level unit/simulator Node.js; belum ada uji emulator Android/iOS maupun perangkat fisik untuk kamera V4L2/Camera2/AVFoundation, GPS, akselerometer, giroskop, mikrofon, Bluetooth, notifikasi, & biometrik. | **`PARTIAL`** |
| **39** | Mobile Networking | `test:mobile-networking-v39`: **38/38 PASS** | Validasi skema HTTPS eksternal & anti-kredensial URL, anti-CRLF, loopback HTTP REST auth + refresh, offline queue persistensi disk + sinkronisasi konflik, WebSocket loopback, `AbortSignal`, upload/download & retry. | Endpoint HTTPS bertanda tangan TLS CA/self-signed nyata (`certificate pinning` SPKI OkHttp/`URLSession`), `background transfer` OS (WorkManager/`URLSession` background), & transisi jaringan seluler fisik. | **`PARTIAL`** |
| **40** | Mobile Application Distribution | `test:distribusi-v40`: **100/100 PASS** | Pembuat arsip PKZIP CRC-32 nyata (`.apk` `2.098 B`, `.aab` `3.466 B`), `AndroidManifestManager` & `Info.plist` XML escaping, direktori `.xcarchive`, `SHA256SUMS`, pemindai rahasia tanpa *false positive*. | **Paket `.apk`/`.aab` saat ini adalah kontainer PKZIP struktural tanpa `classes.dex` & `resources.arsc`**, dan `.xcarchive` hanya berisi `Info.plist` (**belum menghasilkan `.ipa` maupun Mach-O ARM64**); belum ada install/launch/uninstall emulator atau simulator. | **`PARTIAL`** |
| **41** | Store Publishing & Digital Signing | `test:publikasi-v41`: **107/107 PASS** | Penandatanganan & verifikasi JWT `RS256` & `ES256` nyata terhadap server HTTP loopback, `CredentialValidator`, sensor rahasia log/URL (`SecretProvider`), `ApprovalGate` tanpa bypass App Store/produksi. | Signing `apksigner`/`jarsigner` nyata dengan JKS keystore uji, `codesign`/provisioning profile/Apple Transporter (`xcrun altool`/`notarytool`) di macOS, dan unggah ke akun sandbox Google Play Internal & TestFlight. | **`PARTIAL`** |
| **42** | OTA Updates & Secure Update System | `test:pembaruan-v42`: **25/25 PASS** | Tanda tangan Ed25519 PEM & SHA-256, validasi URL loopback ketat (`new URL()`, anti subdomain spoofing, anti `%2e%2e`/`\0`), sinkronisasi pra-unduh, anti-downgrade & anti-replay revisi, manifest kedaluwarsa, rollback & `aktivasiDenganHealthCheck` lewat HTTP loopback. | Uji regresi pencabutan kunci (`TrustManager.cabutKunci`) & rotasi kunci, simulasi unduhan HTTP terputus (*mid-stream abort*) & instalasi terganggu, persistensi OTA disk nyata, Play Core / StoreKit native, dan CDN HTTPS nyata. | **`PARTIAL`** |

---

## 3. Audit Repositori & Daftar File yang Berubah (`B`)

Seluruh file yang berubah/ditambah pada workspace audit (`v0.50.0`) terhadap komponen Phase 23, Phase 36–42, Demo Terpadu, CI/CD, dan dokumentasi:

### 3.1 File Sumber (`src/`) & Skrip (`scripts/`) yang Berubah (57 file)

1. **Phase 23 (6 file):** `scripts/phase23-certify.ts`, `src/build/native-pipeline.ts`, `src/build/types.ts`, `src/compiler/executable/binary-inspector.ts`, `src/compiler/linker/dependency-inspector.ts`, `src/compiler/llvm/target-triple.ts`.
2. **Phase 36 (7 file):** `src/gui/packaging/desktop_packager.ts`, `src/gui/platform/native_desktop.ts`, `src/gui/platform/webview_server.ts`, `src/gui/render/framebuffer.ts`, `src/gui/render/renderer.ts`, `src/stdlib/gui.ts`, `src/paket/cli.ts`.
3. **Phase 37 (6 file):** `src/mobile/bridge/native_codegen.ts`, `src/mobile/cli/mobile_cli.ts`, `src/mobile/core/state.ts`, `src/mobile/navigation/deep_link.ts`, `src/mobile/runtime/mobile_host.ts`, `src/mobile/ui/mobile_renderer.ts`.
4. **Phase 38 (10 file):** `src/mobile/device/clipboard.ts`, `src/mobile/native/adapters/android_adapter.ts`, `src/mobile/native/adapters/ios_adapter.ts`, `src/mobile/native/adapters/simulator_adapter.ts`, `src/mobile/native/codegen/native_device_codegen.ts`, `src/mobile/native/core/capabilities.ts`, `src/mobile/native/core/registry.ts`, `src/mobile/native/services/init_all_services.ts`, `src/mobile/security/permission.ts`, `src/mobile/security/secure_storage.ts`.
5. **Phase 39 (8 file):** `src/mobile/networking/core/api_client.ts`, `src/mobile/networking/core/request_manager.ts`, `src/mobile/networking/database/cloud_database.ts`, `src/mobile/networking/offline/offline_queue.ts`, `src/mobile/networking/realtime/websocket_client.ts`, `src/mobile/networking/security/cloud_security.ts`, `src/mobile/networking/storage/cloud_storage.ts`, `src/stdlib/mobile.ts`.
6. **Phase 40 (7 file):** `src/mobile/distribution/index.ts`, `src/mobile/distribution/core/ZipBuilder.ts`, `src/mobile/distribution/android/AndroidManifestManager.ts`, `src/mobile/distribution/ios/ArchiveManager.ts`, `src/mobile/distribution/validation/BuildValidator.ts`, `src/mobile/distribution/validation/ReleaseValidator.ts`, `src/mobile/distribution/validation/SigningValidator.ts`.
7. **Phase 41 (6 file):** `src/mobile/publishing/android/GooglePlayClient.ts`, `src/mobile/publishing/automation/ReleasePipeline.ts`, `src/mobile/publishing/credentials/CredentialManager.ts`, `src/mobile/publishing/credentials/CredentialValidator.ts`, `src/mobile/publishing/credentials/SecretProvider.ts`, `src/mobile/publishing/ios/AppStoreConnectClient.ts`.
8. **Phase 42 (7 file):** `src/mobile/updates/types.ts`, `src/mobile/updates/core/UpdateManager.ts`, `src/mobile/updates/ota/ActivationManager.ts`, `src/mobile/updates/ota/DownloadManager.ts`, `src/mobile/updates/ota/OTAResourceManager.ts`, `src/mobile/updates/security/UpdateSecurityPolicy.ts`, `src/mobile/updates/storage/RollbackManager.ts`.

### 3.2 Suite Pengujian, Contoh, Konfigurasi & Dokumentasi yang Berubah/Ditambahkan

- **Pengujian (9 file + 1 ringkasan):** `pengujian/build/uji_build_distribusi_fase23.ts`, `pengujian/gui/uji_gui_fase36.ts`, `pengujian/mobile/uji_mobile_fase37.ts`, `pengujian/mobile/uji_native_api_fase38.ts`, `pengujian/mobile/uji_mobile_networking_fase39.ts`, `pengujian/mobile/uji_distribusi_fase40.ts`, `pengujian/mobile/uji_publikasi_fase41.ts`, `pengujian/mobile/uji_pembaruan_fase42.ts`, `pengujian/integrasi/uji_demo_terpadu.ts`, `pengujian/README.md`.
- **Contoh Bahasa NUSANTARA (10 file):** `contoh/desktop/{catatan_teks,dashboard_sistem,kalkulator_desktop,manajer_tugas,pengaturan_akun}.nusantara`, `contoh/mobile/{daftar_tugas_mobile,navigasi_belanja,pengaturan_aplikasi}.nusantara`, `contoh/cross_platform_demo/{demo_terpadu.nusantara,README.md}`.
- **Konfigurasi & CI (4 file):** `package.json`, `.github/workflows/ci.yml`, `bun.lock` (terefresh di lingkungan lokal, tidak dipakai oleh `npm ci`), serta laporan `artifacts/phase23/` hasil `local-snapshot`.
- **Dokumentasi (77 file):** 9 dokumen sertifikasi per fase di `docs/phase-23/` dan `docs/phase-36/` s.d. `docs/phase-42/` (72 file), `docs/PHASE-23-36-42-COMPLETION-REPORT.md`, serta pembaruan `README.md`, `ROADMAP.md`, `PERUBAHAN.md`, dan dokumen audit ini (`docs/CERTIFICATION-READINESS-PHASE-23-36-42.md`).

### 3.3 Identifikasi Perubahan yang Belum Memiliki Regression Test / Celah Audit

| Berkas / Subsistem Terkait | Celah / Perubahan Tanpa Regression Test Memadai | Tingkat Risiko |
| :--- | :--- | :---: |
| `src/paket/cli.ts` (baris 51–52) | Terdapat import `ZipBuilder` dan `HashValidator` yang tidak pernah dipanggil di file tersebut (*dead imports*); `tsc --noEmit` belum menegakkan `noUnusedLocals`. | Rendah |
| `src/mobile/updates/security/TrustManager.ts` (`cabutKunci`) | Pencabutan kunci (`revoked key`) dan rotasi kunci multi-generasi (`kunci lama -> baru -> kunci lama dicabut`) tersedia di implementasi (`SignatureVerifier`), namun **belum ada test case regresi** pada `uji_pembaruan_fase42.ts`. | Tinggi |
| `src/mobile/updates/ota/DownloadManager.ts` & `ActivationManager.ts` | Penanganan unduhan HTTP terputus di tengah payload (`aborted stream` / EOF prematur) & interupsi saat aktivasi/penulisan OTA **belum memiliki uji regresi soket putus nyata** di `uji_pembaruan_fase42.ts`. | Tinggi |
| `src/mobile/networking/core/api_client.ts` | Uji `HTTPS` + `TLS certificate validation` + `hostname mismatch` baru diuji melalui inspeksi URL kebijakan TLS (`http://` eksternal ditolak) pada Node, **belum menguji handshake HTTPS nyata ke server TLS lokal bertanda tangan sertifikat valid vs invalid/self-signed/mismatch SAN**. | Tinggi |
| `src/gui/platform/native_desktop.ts` & `desktop_packager.ts` | Kompilasi C GTK+ 3.0 (`gcc` + `pkg-config`), interaksi mouse/keyboard OS, resize berkelanjutan, DPI skala non-1.0, clipboard sistem, & multi-window OS fisik **belum memiliki skrip/job CI virtual-display (`xvfb-run`) maupun runner desktop**. | Tinggi |
| `src/mobile/distribution/*` & `src/mobile/publishing/*` | `APKBuilder`/`AABBuilder`/`ArchiveManager` baru diuji pada kontainer PKZIP & XML/plist; **belum ada uji regresi CI terhadap `d8`/`aapt2`/`apksigner`/`bundletool` (Android) serta `xcodebuild`/`codesign`/`xcrun altool` (iOS)**. | Kritis |
| `pengujian/integrasi/uji_demo_terpadu.ts` (baris 523) | Menghapus `tmpRoot` di `finally` setelah selesai, sehingga **artefak demo tidak dipertahankan di disk (`artifacts/demo-terpadu/`)** untuk pemeriksaan CI pasca-eksekusi ataupun `actions/upload-artifact`. | Sedang |
| `bun.lock` | Termodifikasi pada waktu setup kontainer tanpa perubahan dependensi `package.json`; workflow CI resmi memakai `npm ci` (`package-lock.json`). Sebaiknya tidak ikut di-commit bila memakai lockfile `npm`. | Rendah |

---

## 4. Matriks Kesiapan Teknis Per Fase (`C`–`K`)

### 4.1 Phase 23 — Enam Target Desktop (`C`)

Audit terhadap `.github/workflows/ci.yml`, `scripts/phase23-certify.ts`, `src/build/certification.ts`, dan `src/build/target-matrix.ts`:

| Target | Triple | Runner pada `ci.yml` | Mode Pembangunan & Eksekusi Diharapkan | Status Lokal Kontainer (`artifacts/phase23/PHASE-23-CERTIFICATION-REPORT.md`) | Catatan Ketersediaan Runner & Keterbatasan |
| :--- | :--- | :--- | :--- | :---: | :--- |
| `windows-x86_64` | `x86_64-pc-windows-msvc` | `windows-latest` | **Native Build + Native Execution** (`clang` + `lld-link` + MSVC CRT + WinSDK) | `NOT_VERIFIED` (host non-Windows) | Runner standar publik GitHub tersedia (`windows-latest`). Uji `5.3`/`5.4` (`pwsh` + PE32+) membutuhkan runner Windows ini. |
| `windows-arm64` | `aarch64-pc-windows-msvc` | `windows-11-arm` | **Native Build + Native Execution** (jika runner tersedia); **alternatif:** Cross-build PE32+ ARM64 di `windows-latest` (`executionMode: cross-compiled-not-executed` akan menghasilkan `NOT_VERIFIED`!) | `NOT_VERIFIED` (host non-Windows) | **Keterbatasan Eksplisit:** Runner `windows-11-arm` hanya tersedia pada konfigurasi GitHub Hosted tertentu/Team-Enterprise/self-hosted. Jika runner `windows-11-arm` tidak terprovisi di repo publik, job akan menggantung/gagal dan tidak boleh diganti cross-compile tanpa eksekusi (`certification.ts` baris 225 jujur melapor `NOT_VERIFIED`). |
| `linux-x86_64` | `x86_64-unknown-linux-gnu` | `ubuntu-latest` | **Native Build + Native Execution** (`clang` + `ld.lld` + `libc6-dev`) | `NOT_VERIFIED` (kontainer tidak memiliki `clang`, `lld`, `libc6-dev`/CRT `stdio.h`) | Runner standar `ubuntu-latest` tersedia penuh dan memasang `build-essential libc6-dev clang lld llvm binutils`. |
| `linux-arm64` | `aarch64-unknown-linux-gnu` | `ubuntu-24.04-arm` (punya cabang cross-QEMU jika host x64) | **Native Build + Native Execution** di `ubuntu-24.04-arm`, atau **Cross-Compilation + `qemu-aarch64` User-Mode Execution** di `ubuntu-latest` | `NOT_VERIFIED` (`clang` & `libc6-dev-arm64-cross` absen) | **Keterbatasan Eksplisit:** Bila `ubuntu-24.04-arm` tersedia gratis (GitHub public ARM64 Linux runner), gunakan native; bila tidak, alihkan `os` ke `ubuntu-latest` agar cabang `gcc-aarch64-linux-gnu` + `qemu-user`/`qemu-user-static` pada `ci.yml` berjalan otomatis tanpa mengantre. |
| `macos-x86_64` | `x86_64-apple-darwin` | `macos-latest` (`ci.yml`) / `macos-13` (`release.yml`) | **Cross-Compilation Mach-O `x86_64` + Rosetta 2 Execution (`arch -x86_64`)** pada host Apple Silicon (`macos-latest`) | `NOT_VERIFIED` (host bukan macOS / tanpa `MacOSX.sdk`) | **Keterbatasan Eksplisit:** GitHub telah menghentikan/mendeprekasi runner Intel `macos-13`. Pada `ci.yml` target `macos-x86_64` sudah menggunakan `macos-latest` (`arm64`) + Rosetta 2 (`is_native: 'false'`), sedangkan `release.yml` masih merujuk `macos-13` dan **wajib diperbarui** ke `macos-latest` (atau diuji sebagai cross-Rosetta2 bila Intel runner tidak tersedia). |
| `macos-arm64` | `arm64-apple-darwin` | `macos-latest` | **Native Build + Native Execution** (Apple Clang + `MacOSX.sdk` + `ld`) | `NOT_VERIFIED` (host bukan macOS) | Runner `macos-latest` (Apple Silicon) tersedia pada GitHub Actions publik. |

**Checklist Per Target di CI (`phase23-certify.ts` & `ci.yml`):**
- Deteksi compiler (`clang`/`llc`/`aarch64-linux-gnu-gcc`), linker (`ld.lld`/`lld-link`/`ld`), & sysroot (`TargetMatrixManager.inspectTargetCapability`) -> **Tersedia**.
- Kompilasi executable + inspeksi format/arsitektur ELF/PE32+/Mach-O (`BinaryInspector.inspectStrict`) + inspeksi dependensi (`DependencyInspector`) -> **Tersedia**.
- Installer sandbox lifecycle + checksum `SHA256SUMS` + upgrade + penolakan tamper + uninstall (`DistributionE2EVerifier`) + unggah `phase23-evidence-<target>` & agregasi `phase23-certification-report` -> **Tersedia untuk 6 target desktop**.

---

### 4.2 Phase 36 — Desktop GUI (`D`)

Status pembedaan lingkup pengujian:

| Kapabilitas GUI | Kontainer Headless / Node.js (Saat Ini) | Virtual Display CI (`Xvfb` Linux) | Runner Desktop OS Nyata (Windows / macOS) |
| :--- | :--- | :--- | :--- |
| **Window Creation** | Kontrak `JendelaGUI` + `AdaptorHeadlessGUI` (`LULUS`) | Perlu `xvfb-run` + biner C `gtk+-3.0` terkompilasi (`BELUM ADA DI CI`) | Perlu desktop session Win32 / macOS Cocoa (`BELUM ADA DI CI`) |
| **Widget & Layout** | `LabelWidget`, `TombolWidget`, `InputTeks`, `KolomLayout`, `BarisLayout` (`LULUS`) | Validasi render widget di GTK3 via `xvfb-run` (`BELUM`) | Validasi visual & native control di Win32/Cocoa (`BELUM`) |
| **Rendering** | Framebuffer software `BMP` (`BM`, `192.054 B`), `PPM`, `SVG`, `HTML5` (`LULUS`) | Screenshot buffer X11 (`xwd`/`import`) pada `Xvfb` (`BELUM`) | Rendering GPU/Compositor desktop fisik (`BELUM`) |
| **Keyboard & Mouse** | Dispatch peristiwa DOM/WebSocket UI tree & handler state (`LULUS`) | Simulasi input X11 (`xdotool` di `Xvfb`) (`BELUM`) | Input perangkat keras keyboard/mouse OS (`BELUM`) |
| **Resize & Multi-Window** | Simulasi pemanggilan metode resize & registry multi-jendela di model GUI (`LULUS`) | Uji resize & pemunculan 2+ window X11 di WM virtual (`BELUM`) | Multi-monitor fisik & compositor OS (`BELUM`) |
| **DPI / Scaling** | Metadata properti `skalaDPI` di model UI (`LULUS`) | Uji rendering dengan `GDK_SCALE=2` di `Xvfb` (`BELUM`) | Monitor HiDPI Retina macOS / 150%+ Windows fisik (`BELUM`) |
| **Clipboard** | Buffer clipboard internal `AdaptorHeadlessGUI` (`LULUS`) | Sinkronisasi `xclip`/`xsel` di sesi X11 `Xvfb` (`BELUM`) | Clipboard sistem Windows / NSPasteboard macOS (`BELUM`) |
| **Dialog** | State `PengelolaDialogGUI` (pesan/konfirmasi/berkas) di memori (`LULUS`) | GtkMessageDialog / FileChooserDialog pada `Xvfb` (`BELUM`) | Native OS modal dialog fisik (`BELUM`) |
| **Accessibility** | Pembangkitan atribut ARIA/peran `buatAtributAria` (`LULUS`) | ATK / AT-SPI2 / Accessibility tree Linux (`BELUM`) | UI Automation (Windows) / VoiceOver NSAccessibility (macOS) (`BELUM`) |

**Catatan Kritis:** Rendering framebuffer/DOM headless maupun virtual display `Xvfb` **tidak boleh disamakan** dengan verifikasi desktop fisik OS (GPU compositing, font hint sistem, HiDPI monitor fisik, dan input HID).

---

### 4.3 Phase 37 — Mobile Framework (`E`)

| Platform | Prasyarat | Status Proyek/Scaffolding Saat Ini | Verifikasi Build, Emulator/Simulator & Perilaku Runtime | Status |
| :--- | :--- | :--- | :--- | :---: |
| **Android** | JDK 17, Android SDK (`platform-tools`, `platforms;android-35`, `build-tools;35.0.0`), Gradle, KVM + Android Emulator | Pembangkitan proyek Kotlin (`MainActivity.kt`, `AndroidManifest.xml`, `build.gradle.kts`, `SHA256SUMS`) lolos di Node.js | Gradle `./gradlew assembleDebug`: **BELUM**; Launch di Android Emulator via `adb`: **BELUM**; Lifecycle Activity (`onCreate/onPause/onStop`), Navigation backstack di perangkat, Rotation (`configChanges` / screen orientation change via `adb`), State Restoration pasca kill proses: **BELUM DIUJI DI EMULATOR**. | **`NOT_VERIFIED` (Native SDK)** / **`PARTIAL` (Framework JS)** |
| **iOS** | Runner `macOS`, Xcode (>= 15/16), iOS SDK, CocoaPods, `xcrun simctl` (iOS Simulator) | Pembangkitan sumber Swift (`WKWebView`/`WKScriptMessageHandler`), `Info.plist`, `Podfile` dengan escaping lolos di Node.js | `xcodebuild build`: **BELUM**; iOS Simulator boot & `xcrun simctl install/launch`: **BELUM**; Lifecycle UIKit/SwiftUI, Navigation, Rotation, State Restoration: **BELUM DIUJI**. | **`NOT_VERIFIED` (iOS Belum Dapat Dibangun)** |

> **Penegasan Jujur:** Dukungan iOS dan build biner Android Gradle **belum selesai**. Pembangkitan berkas Kotlin/Swift tidak boleh dianggap sebagai dukungan build mobile selesai.

---

### 4.4 Phase 38 — Native Device API (`F`)

| API / Kemampuan | Unit Test (`uji_native_api_fase38.ts`) | Emulator Test (Android Emulator / iOS Simulator) | Hardware Test (Perangkat Fisik) | Laporan Kesenjangan Perangkat Fisik |
| :--- | :---: | :---: | :---: | :--- |
| **Camera** | **PASS** (kontrak, validasi izin & codegen Kotlin/Swift) | **BELUM** (virtual camera emulator Android / picker iOS) | **BELUM** | Belum teruji terhadap modul kamera Camera2/CameraX & AVFoundation fisik, fokus/resolusi, dan pencabutan izin live OS. |
| **GPS / Location** | **PASS** (kontrak koordinat simulator & penolakan izin) | **BELUM** (`adb emu geo fix` / `xcrun simctl location`) | **BELUM** | Belum teruji penerimaan satelit GNSS/CoreLocation nyata & akurasi background. |
| **Accelerometer** | **PASS** (registri & adapter simulator) | **BELUM** (sensor virtual Android Emulator) | **BELUM** | Belum teruji laju sampling `SensorManager` / `CMMotionManager` pada chip IMU fisik. |
| **Gyroscope** | **PASS** (registri & adapter simulator) | **BELUM** (sensor virtual Android Emulator) | **BELUM** | Belum teruji kalibrasi & drift IMU perangkat keras fisik. |
| **Microphone / Audio** | **PASS** (izin mikrofon & kontrak layanan `audio.*`) | **BELUM** (emulator audio loop; **celah tambahan:** wrapper sinkron `.nusantara` belum aktif untuk `audio.*`) | **BELUM** | Belum teruji penangkapan PCM `AudioRecord` / `AVAudioRecorder` dari mikrofon fisik. |
| **Storage / Secure Storage** | **PASS** (`AES-256-GCM` v2 in-memory & path traversal guard) | **BELUM** (`EncryptedSharedPreferences` Android / Keychain iOS) | **BELUM** | Belum teruji pada Hardware-backed Android Keystore (StrongBox/TEE) & Apple Secure Enclave. |
| **Bluetooth** | **PASS** (izin & adapter simulator; wrapper sinkron `bluetooth.pindai` tercatat terbatas) | **BELUM** (Android Emulator tidak memiliki radio BLE HCI penuh) | **BELUM** | **Wajib perangkat fisik** untuk pemindaian BLE GATT, pairing, dan RSSI antar perangkat nyata. |
| **Notifications** | **PASS** (kontrak jadwal & izin notifikasi) | **BELUM** (tampilan notification shade Android 13+ / simulator) | **BELUM** | Belum teruji push delivery APNs/FCM nyata saat app terhenti / layar terkunci. |
| **Biometric Auth** | **PASS** (kebijakan izin & fallback) | **BELUM** (`adb emu finger touch` / Simulator enrolled FaceID) | **BELUM** | **Wajib perangkat fisik** untuk sensor sidik jari kapasitif/optik/FaceID TEE nyata. |
| **Permission Handling** | **PASS** (`ditolak_permanen` keras pada `panggil` & `panggilSinkron`) | **BELUM** (dialog izin sistem OS & Settings deep-link) | **BELUM** | Belum teruji alur penolakan OS berulang & reset izin dari Pengaturan Android/iOS fisik. |

---

### 4.5 Phase 39 — Mobile Networking (`G`)

| Aspek Jaringan | Bukti Saat Ini (`uji_mobile_networking_fase39.ts` — 38/38) | Celah Verifikasi CI & Prasyarat Nyata |
| :--- | :--- | :--- |
| **HTTPS** | Ditegakkan secara kebijakan untuk host non-loopback (`KlienAPIMobile` menolak `http://` eksternal). | Perlu uji server **HTTPS loopback lokal dengan sertifikat CA sementara (`NODE_EXTRA_CA_CERTS`)** di CI. |
| **TLS Certificate Validation** | Pengujian CA custom/chain mismatch TLS nyata belum dijalankan terhadap soket TLS. | Tambahkan regression test TLS valid vs self-signed ditolak vs expired cert pada `https.createServer` loopback. |
| **Hostname Validation** | Diuji pada level parser URL kebijakan (`UpdateSecurityPolicy` & `cloud_security`), belum diuji SAN mismatch handshake TLS nyata. | Uji SAN mismatch (`127.0.0.1` vs `CN=wrong.host`) via `https.createServer` di CI. |
| **WebSocket** | **TERBUKTI NYATA** pada loopback `ws://127.0.0.1` menggunakan paket `ws`. | Uji `wss://` (TLS WebSocket) dengan sertifikat loopback. |
| **Reconnect** | Teruji di logika state retry/reconnect klien WS & API. | Verifikasi putus koneksi paksa di server loopback -> reconnect berurutan otomatis. |
| **Timeout** | Teruji pada timeout permintaan HTTP & `KlienWebSocketMobile`. | - |
| **Cancellation** | Teruji nyata via `AbortSignal` menghentikan retry backoff seketika (uji `18.4` / terkait). | - |
| **Offline Transition** | Teruji nyata: transisi offline -> antre ke berkas disk JSON -> online -> auto-sync ke HTTP server loopback. | Uji pada Network/Airplane toggle di Android Emulator (`svc wifi/data disable`). |
| **Upload & Download** | Teruji terhadap HTTP loopback & `cloud_storage` dengan path-traversal guard. | Uji streaming chunk besar & verifikasi SHA-256 berkas biner pada transfer multipart HTTPS. |
| **Background Transfer** | Simulasi manajemen antrean sinkronisasi/queue JS. | WorkManager (Android) & `URLSessionConfiguration.background` (iOS) belum teruji di OS mobile. |
| **Retry & Token Storage** | Backoff + penyimpanan token `PenyimpananAmanMobile` AES-256-GCM v2 teruji; penyamaran token log teruji. | Uji integrasi end-to-end persistensi token di Android Keystore / iOS Keychain emulator. |

> **Aturan Keamanan Endpoint:** Seluruh pengujian networking CI wajib memakai server loopback / test container lokal atau sandbox publik bebas kredensial pribadi; **dilarang** menanam endpoint/kredensial cloud produksi.

---

### 4.6 Phase 40 — Mobile Distribution (`H`)

Audit artefak di disk hasil inspeksi langsung terhadap `APKBuilder`, `AABBuilder`, `ArchiveManager`, dan `ZipBuilder`:

| Target | Yang Dihasilkan Saat Ini di Disk (Terverifikasi Audit) | Yang Belum Dihasilkan / Wajib Untuk Kelulusan Penuh |
| :--- | :--- | :--- |
| **Android APK** | Berkas `.apk` valid PKZIP CRC-32 (`2.098 bytes`) berisi: `AndroidManifest.xml`, `META-INF/NUSANTARA.json`, `META-INF/CERT.SF`. **Tanpa** `classes.dex`, **tanpa** `resources.arsc`, **tanpa** biner ABI `.so`, **tanpa** tanda tangan blok V2/V3 `apksigner`. | Kompilasi Kotlin/Java -> `.dex` (`d8`/Gradle), sumber daya AAPT2, pemetaan ABI (`arm64-v8a`/`x86_64`), signing V2/V3 nyata (`apksigner sign` & `apksigner verify`), `adb install`, `adb shell am start` (launch), `adb uninstall`. |
| **Android AAB** | Berkas `.aab` valid PKZIP CRC-32 (`3.466 bytes`) berisi: `BundleConfig.pb.json`, `base/manifest/AndroidManifest.xml`, `META-INF/AAB-SIGNATURE.SF`. | Pembentukan `.aab` protobuf nyata melalui `bundletool build-bundle` / `./gradlew bundleRelease`, validasi `bundletool validate`, pembuatan APK universal & uji install via `bundletool install-apks` di emulator. |
| **iOS Archive & IPA** | Direktori `.xcarchive` berisi **`Info.plist` saja** (+ `ExportOptions.plist` opsional). **BELUM ada** binary `Products/Applications/*.app` (Mach-O), **BELUM ada** `_CodeSignature`, dan **BELUM ada berkas `.ipa` yang terbuat**. | Build di runner macOS menggunakan `xcodebuild archive`, `xcodebuild -exportArchive` untuk menghasilkan `.ipa` terverifikasi `file` (Mach-O ARM64), verifikasi `codesign -dv --verify`, inspeksi `embedded.mobileprovision`, serta install/launch di Simulator (`xcrun simctl`) atau perangkat terdaftar. |

> **Peringatan Integritas:** Pembuatan struktur proyek Xcode, `.xcarchive/Info.plist`, maupun `ExportOptions.plist` **tidak pernah boleh** dilaporkan sebagai `.ipa` yang berhasil dibangun.

---

### 4.7 Phase 41 — Store Publishing & Digital Signing (`I`)

| Elemen Verifikasi | Bukti Saat Ini (`107/107` Loopback) | Kesenjangan Toolchain / Sandbox CI |
| :--- | :--- | :--- |
| **APK & AAB Signing** | Validasi konfigurasi, deskriptor `.SF`, & deteksi password/key bocor di source (`SigningValidator`, `ReleaseValidator`). | Eksekusi `keytool -genkeypair` (kunci uji ephemera CI), `apksigner sign`, `jarsigner` untuk AAB. |
| **Certificate Fingerprint & Verification** | Perhitungan SHA-256 artefak & RSA-2048/EC P-256 signature verification. | Verifikasi `apksigner verify --verbose --print-certs` & `keytool -printcert`. |
| **Keystore Protection** | Pembacaan variabel lingkungan (`storePasswordEnv`, `keyPasswordEnv`), anti-hardcode secret di repo/log (`SecretProvider.bersihkanLogDariRahasia`). | Penggunaan ephemeral/sandbox keystore di GitHub Secrets tanpa menyimpan `.jks` di git. |
| **Provisioning Profile & Apple Code Signing** | Validasi struktur konfigurasi Apple Team ID, `bundleIdentifier`, metode ekspor, & `AppStoreConnectClient` JWT ES256 (loopback). | `security create-keychain` sementara di macOS runner + `codesign` + verifikasi UUID provisioning profile + `xcrun altool --validate-app`. |
| **Metadata & Upload Validation** | Validasi metadata rilis (`ReleaseNotes`, dimensi aset metadata), simulasi siklus penuh Edit -> Upload AAB -> Track `internal` -> Commit ke loopback HTTP API bertanda tangan RS256, serta `ApprovalGate` yang menolak auto-approve produksi. | Pengujian opsional ke track `internal` sandbox non-produksi **hanya** apabila operator secara eksplisit menyediakan secret akun sandbox non-publik; tanpa secret sandbox, jalur publikasi eksternal tetap berstatus `NOT_VERIFIED` dan **tidak boleh** mempublikasikan ke toko produksi. |

---

### 4.8 Phase 42 — OTA Updates (`J`)

| Item Verifikasi OTA | Status di Suite `uji_pembaruan_fase42.ts` (25/25) | Status Kesiapan CI & Celah Terdeteksi |
| :--- | :---: | :--- |
| **Ed25519 Signature & SHA-256** | **PASS** (PKCS#8/SPKI PEM nyata + pemalsuan ditolak + hash SHA-256 byte payload diverifikasi sebelum & sesudah unduhan) | Siap CI, wajib sertakan uji negatif tambahan. |
| **Key Identifier (`keyId`)** | **PASS** (`TrustManager` mencocokkan `keyId` & menolak kunci tak terdaftar) | Siap CI. |
| **Key Rotation & Revoked Key** | **GAP / BELUM DIUJI REGRESI** (`TrustManager.cabutKunci` ada di kode, belum ada uji rotasi & pencabutan di `uji_pembaruan_fase42.ts`) | **Blocker Regresi:** Tambahkan uji rotasi kunci (`key-v1` -> `key-v2`, lalu `cabutKunci('key-v1')`) sebelum sertifikasi Phase 42 dinyatakan penuh. |
| **Expired Manifest, Anti-Replay & Downgrade Rejection** | **PASS** (`Kelompok 11`: menolak `expirationDate` lampau, `revision` lama, `< versiTerpasang`, dan beda `applicationId`) | Siap CI. |
| **Corrupted Package** | **PASS** (perubahan byte package ditolak verifikasi SHA-256) | Siap CI. |
| **Interrupted Download & Interrupted Installation** | **GAP / BELUM DIUJI REGRESI** (pembatasan ukuran download `DownloadManager` diuji, namun pemutusan soket HTTP mid-stream & kegagalan atomik I/O di tengah aktivasi belum ada test khususnya) | **Blocker Regresi:** Tambahkan uji server HTTP loopback yang memutus soket di tengah payload dan verifikasi versi lama tidak berubah. |
| **Atomic Update, Rollback & Recovery** | **PASS** (`RollbackManager` -> `ActivationManager` pemulihan file/versi nyata + `aktivasiDenganHealthCheck` auto-rollback `1.2.0` -> `1.1.0`) | Di tingkat disk nyata di perangkat fisik/emulator Android & iOS masih perlu jembatan persistensi non-memori. |
| **Keamanan Private Key** | **PASS** (`SignatureVerifier.buatPasanganKunciEd25519` dinamis saat runtime uji; nol private key di `src/`, log, atau artefak) | Pertahankan kebijakan `SecretProvider` & pemindai CI. |
| **Kepatuhan Kebijakan Android/iOS** | **PASS** secara desain (`updateType: 'ota_resource'` terbatas aset/konfigurasi non-native; binary native wajib Play Store / App Store) | Verifikasi integrasi Play Core & StoreKit membutuhkan uji perangkat/emulator dengan Play Store / App Store sandbox. |

---

### 4.9 Demo Terpadu (`K`)

Eksekusi aktual `npm run test:demo-terpadu` menghasilkan **`6/6 LULUS (0 GAGAL)`**. Inspeksi langsung atas berkas yang dihasilkan oleh jalur integrasi pada disk sementara (`/tmp/nusa-audit-*`) membuktikan artefak nyata berikut benar-benar ditulis (bukan sekadar output log):

1. **Bahasa & Runtime (`demo_terpadu.nusantara`):** Eksekusi skrip NUSANTARA menggunakan `std:gui`, `std:mobile`, `panggilNative`, `simpanAman`/`ambilAman` AES-256-GCM, serta pemeriksaan kesiapan toko & OTA.
2. **Desktop Render & Packaging (Phase 36 + Phase 23):**
   - `PerenderDesktop`: menghasilkan gambar `BMP` valid (`BM` magic header, **`192.054 bytes`** untuk kanvas 320x200x24bpp).
   - `PengemasAplikasiDesktop`: menulis **`8` berkas** bundel Linux desktop + `SHA256SUMS` terverifikasi.
   - `NusantaraCLI` (`bangun --mode release --target linux-x64`): menulis **`nusantara-v0.50.0-linux-x64.zip` (`4.546 bytes`, SHA-256 terhitung)** dan **`nusantara-v0.50.0-linux-x64.tar.gz` (`3.071 bytes`, SHA-256 terhitung)**.
3. **Mobile Framework & Native API Storage (Phase 37 & 38):** Lifecycle `AplikasiMobile`, enkripsi `v2:` AES-256-GCM & dekripsi `PenyimpananAmanMobile`, pembangkitan sumber plugin Android Kotlin (`package id.nusantara.crossdemo`) & iOS Swift.
4. **Networking Loopback & Offline Disk Queue (Phase 39):** Login REST ke server HTTP `127.0.0.1` -> status offline menulis antrean nyata ke `offline_q.json` di disk -> transisi online menyingkronkan item ke server HTTP -> pertukaran echo pesan WebSocket `127.0.0.1` lewat paket `ws`.
5. **Distribusi Mobile & Store API JWT (Phase 40 & 41):**
   - APK PKZIP (`2.098 bytes`), AAB PKZIP (`3.466 bytes`) + `SHA256SUMS` diverifikasi CRC-32 & SHA-256 di disk, serta direktori `.xcarchive` (`Info.plist`).
   - Pengunggahan ke loopback Google Play API (`RS256` JWT verified) & App Store Connect (`ES256` JWT verified), `ApprovalGate` tanpa auto-approve produksi, & laporan Markdown.
6. **OTA Signed Ed25519 + Health-Check Rollback (Phase 42):** Mengunduh manifest & payload `batik_v2.json` bertanda tangan Ed25519 dari server HTTP `127.0.0.1`, mengaktifkan `1.1.0`, lalu menolak/auto-rollback update `1.2.0` yang gagal health check kembali ke `1.1.0`.

**Temuan Audit Demo Terpadu:** `uji_demo_terpadu.ts` membersihkan `tmpRoot` pada akhir eksekusi (`baris 523`), sehingga setelah `test:demo-terpadu` berakhir, artefak-artefak tersebut tidak tersedia di direktori permanen (`artifacts/demo-terpadu/`) untuk diinspeksi ulang atau diunggah ke CI.

---

## 5. Audit 4 Workflow CI & Rencana Perbaikan (`L`)

### 5.1 Audit Workflow yang Ada Saat Ini

| Workflow | Cakupan Saat Ini | Kekuatan yang Harus Dipertahankan | Temuan Celah & Risiko Kesiapan |
| :--- | :--- | :--- | :--- |
| **`.github/workflows/ci.yml`** | `static-checks` -> `test-suite` (`ubuntu-latest`, `windows-latest`, `macos-latest` termasuk `npm test` & `test:demo-terpadu`) -> `quality-gate` -> `build-matrix-validation` (6 target + `phase23-certify.ts`) -> `phase23-certification-gate` -> `ci-summary`. | Least privilege (`contents: read`), concurrency control, probe C runtime Ubuntu (`stdio.h`, `clang`, `ld.lld`), verifikasi `node:sqlite`, pemisahan cross-build & QEMU, `phase23-certify.ts aggregate` menolak `NOT_VERIFIED`/`FAIL`, retensi artefak evidence & step summary. | **1)** Belum ada job virtual/native GUI (`Phase 36`), Android SDK/Gradle/Emulator (`Phase 37,38,40`), macOS Xcode/iOS Simulator (`Phase 37,40`), HTTPS TLS loopback test (`Phase 39`), maupun signing & OTA gate khusus (`Phase 41–42`).<br>**2)** `build-matrix-validation` memasang runner `windows-11-arm` & `ubuntu-24.04-arm`; jika salah satu belum aktif di paket GitHub repo ini, matrix akan terhenti.<br>**3)** Artefak demo terpadu tidak dipertahankan/diunggah (`actions/upload-artifact`).<br>**4)** `ci-summary` selalu hijau (`if: always()`); perlu kepastian bahwa kegagalan certification gate membuat status check workflow merah secara tegas (`phase23-certification-gate` + gate Phase 36–42). |
| **`.github/workflows/kernel-boot-qemu.yml`** | Boot x86_64 kernel Phase 48–50 via QEMU, GRUB2 El Torito ISO, dan verifikasi 18 sentinel + `SHA256SUMS`. | Validasi `grub-file --is-x86-multiboot2`, `xorriso`, 18 sentinel berurutan (`run-phase50-qemu.sh`), `SHA256SUMS -c`, serta upload 19 artefak fase 50 `if: always()`. | Terfokus OS/QEMU Phase 48–50; `timeout-minutes: 10` bisa mepet bila memasang paket `apt` + `npm test` penuh; tidak menguji Phase 23/36–42 secara native (memang terpisah per domain). |
| **`.github/workflows/nusantara-os-ci.yml`** | Pipeline bertahap Phase 1–5, 29, 43–50 (`static-analysis` -> tests compiler & kernel -> `kernel-build-and-iso` -> `qemu-hardware-validation`). | Pemisahan job build ELF/ISO vs eksekusi QEMU bare-metal bersih dengan staging artifact dan verifikasi `SHA256SUMS`. | Fokus inti bahasa + kernel Phase 48–50 (belum mencakup suite Phase 23 & 36–42 dalam daftar `unit-and-compiler-tests`). |
| **`.github/workflows/release.yml`** | `verify-release-approval` -> `test-and-gate` -> `build-release-artifacts` -> `compile-release-bundle` -> `publish-release` (dengan `confirm_release` & `dry_run`). | Pemisahan `contents: read` di root dan `contents: write` hanya di job `publish-release`; gerbang manual `confirm_release == 'true'`. | **Blocker Rilis:**<br>**1)** Matrix `macos-x86_64` memakai runner **`macos-13` yang sudah deprecated/retire**.<br>**2)** `test-and-gate` hanya berjalan di `ubuntu-latest` dan tidak menjalankan `npm run test:demo-terpadu`.<br>**3)** `build-release-artifacts` masih menjalankan `MesinCI` (`simulasikanRilis: true`) dan **tidak mengonsumsi / memvalidasi hasil `phase23-certification-gate` serta sertifikasi Phase 36–42**.<br>**4)** `release-manifest.json` memiliki timestamp hardcoded `'2026-10-25T00:00:00.000Z'`. **Jangan jalankan workflow ini sampai seluruh blocker selesai.** |

### 5.2 Rencana Job & Dependency CI Sertifikasi yang Disarankan (Target Arsitektur)

```text
static-checks (ubuntu-latest: tsc, lint, security scan secrets/private keys)
   ├──▶ test-suite (matrix: ubuntu-latest, windows-latest, macos-latest: npm test + test:demo-terpadu --preserve-artifacts)
   │       └──▶ quality-gate (ubuntu-latest: 29/29 thresholds + regression check)
   │               ├──▶ phase23-matrix (6 desktop targets: native/cross+QEMU/Rosetta2 + Phase 23.2 evidence upload)
   │               ├──▶ phase36-gui-matrix (ubuntu Xvfb + gtk3, windows-latest headless/session, macos-latest AppKit)
   │               ├──▶ phase37-40-41-android (ubuntu-latest KVM + Android SDK 35 + Gradle + Emulator APK/AAB + apksigner)
   │               ├──▶ phase37-40-41-ios (macos-latest + Xcode + CocoaPods + iOS Simulator + .xcarchive/.ipa codesign)
   │               └──▶ phase39-42-network-ota (ubuntu-latest: TLS HTTPS CA/SAN loopback + Ed25519 key rotation/revocation/interrupted OTA)
   │                       ▼
   └──────────────▶ unified-certification-gate (ubuntu-latest: agregasi evidence Phase 23 & 36–42; exit 1 jika ada FAIL/MISSING/CORRUPT/NOT_VERIFIED; upload logs & reports if: always())
```

Kebijakan Kegagalan Wajib:
- Setiap job gate **wajib `exit 1`** apabila status agregat bukan `PASS` atau ditemukan `NOT_VERIFIED` untuk item wajib fase tersebut.
- Langkah pengumpulan log diagnosis dan `actions/upload-artifact@v4` harus memakai `if: always()` agar jejak kegagalan tetap tersedia tanpa menyembunyikan status gagal job.

---

## 6. Spesifikasi Kebutuhan Lingkungan Sertifikasi (`M`)

### 6.1 Daftar Runner yang Diperlukan

| Nama Runner | Penggunaan Fase | Ketersediaan GitHub Hosted Standar | Catatan |
| :--- | :--- | :--- | :--- |
| `ubuntu-latest` (x86_64 + nested KVM) | Phase 23 (`linux-x86_64`, cross+QEMU `linux-arm64`), 36 (`Xvfb`), 37–41 (Android Emulator + KVM), 39, 42, 48–50 (QEMU) | Tersedia standar | Runner Android Emulator memerlukan dukungan KVM (`/dev/kvm`) yang aktif di runner Ubuntu GitHub Actions x86_64 terbaru. |
| `windows-latest` (x86_64) | Phase 23 (`windows-x86_64`), Phase 36 (Win32 GUI check) | Tersedia standar | Memiliki MSVC CRT + WinSDK + PowerShell 7/5.1 + LLVM/Chocolatey. |
| `macos-latest` (Apple Silicon `arm64` + Rosetta 2) | Phase 23 (`macos-arm64` + `macos-x86_64` via `arch -x86_64`), Phase 36 (Cocoa), Phase 37–41 (`Xcode` + `iOS Simulator` + `codesign`) | Tersedia standar | Wajib untuk kompilasi Mach-O/Cocoa/iOS `.xcarchive`/`.ipa`. |
| `ubuntu-24.04-arm` (opsional / native ARM64 Linux) | Phase 23 (`linux-arm64` native tanpa QEMU) | Bergantung ketersediaan publik/paket GitHub | Jika tidak tersedia, gunakan `ubuntu-latest` + `gcc-aarch64-linux-gnu` + `qemu-aarch64` (wajib bukti eksekusi sentinel QEMU). |
| `windows-11-arm` (atau self-hosted ARM64 Windows) | Phase 23 (`windows-arm64` eksekusi native PE32+) | Terbatas pada paket Team/Enterprise atau self-hosted | **Blocker:** Tanpa runner ARM64 Windows nyata, `windows-arm64` hanya dapat cross-link di `windows-latest` dan tetap berstatus `NOT_VERIFIED` untuk eksekusi. |

### 6.2 Daftar SDK dan Toolchain

- **Umum:** Node.js `>= 22.13.0` (`node:sqlite` aktif), npm `ci`.
- **Phase 23:** `clang`, `lld` (`ld.lld` & `lld-link`), `llvm`, `build-essential`, `libc6-dev`, `binutils`; untuk Linux ARM64 cross: `gcc-aarch64-linux-gnu`, `libc6-dev-arm64-cross`, `qemu-user` / `qemu-user-static`; untuk Windows: Visual Studio Build Tools MSVC (x64 & ARM64 lib), Windows 10/11 SDK (`um` & `ucrt`), `pwsh`; untuk macOS: Xcode Command Line Tools (`MacOSX.sdk`) + Rosetta 2.
- **Phase 36:** Linux `xvfb`, `libgtk-3-dev`, `pkg-config`, `xclip`, `xdotool`, `at-spi2-core`; Windows Win32/WebView2 Runtime; macOS AppKit / WebKit framework.
- **Phase 37, 38, 40, 41 (Android):** Java/JDK 17, Android SDK (`platform-tools`, `build-tools;35.0.0`, `platforms;android-35`, `cmdline-tools`), Gradle 8.x, `aapt2`, `d8`, `apksigner`, `bundletool`, `system-images;android-35;google_apis;x86_64` + Android Emulator.
- **Phase 37, 38, 40, 41 (iOS/macOS):** Xcode (>= 15/16), iOS SDK, CocoaPods, `xcrun simctl` + runtime Simulator iOS, `codesign`, `xcrun altool` / `notarytool` (jika uji validasi Transporter macOS).
- **Phase 39 & 42:** OpenSSL CLI (pembangkit CA/sertifikat uji ephemeral loopback TLS/HTTPS pada runner CI), paket `ws` & Node.js `crypto` (Ed25519 & SHA-256).

### 6.3 Daftar Secret yang Diperlukan (Hanya Nama — Tanpa Nilai Secret!)

> Untuk CI sertifikasi default tanpa toko produksi, gunakan kunci ephemeral yang dibuat saat runtime CI. Secret berikut **hanya** diperlukan bila operator mengaktifkan mode validasi signing terkelola atau unggah **sandbox non-produksi** di workflow terisolasi (Environment Protection dengan manual reviewer):

| Nama Secret GitHub Actions | Fase | Kegunaan | Aturan Keamanan Wajib |
| :--- | :---: | :--- | :--- |
| `NUSANTARA_TEST_ANDROID_KEYSTORE_B64` | 40, 41 | Keystore **khusus uji/upload sandbox** (base64 `.jks`/`.keystore`) | Jangan pernah memakai keystore produksi; jangan dicetak di log. |
| `NUSANTARA_TEST_ANDROID_STORE_PASS` & `KEY_ALIAS` / `KEY_PASS` | 40, 41 | Kredensial pembuka keystore uji untuk `apksigner`/`jarsigner` | Masuk melalui env var, disensor `SecretProvider`. |
| `NUSANTARA_PLAY_SANDBOX_SA_JSON` *(opsional)* | 41 | Service Account JSON Google Play **khusus track `internal` sandbox non-rilis** | Hanya dipakai di environment `sandbox-internal` berpersetujuan manual. |
| `NUSANTARA_APPLE_TEST_CERT_P12_B64` & `CERT_PASS` *(opsional)* | 40, 41 | Sertifikat Apple Development / Test signing untuk macOS temporary keychain | Diimpor ke temporary keychain CI lalu dihapus pada langkah `always()`. |
| `NUSANTARA_APPLE_TEST_PROVISION_PROFILE_B64` *(opsional)* | 40, 41 | Provisioning profile development/ad-hoc non-produksi | Untuk verifikasi `xcodebuild -exportArchive`. |
| `NUSANTARA_ASC_SANDBOX_KEY_ID`, `ISSUER_ID`, `KEY_PEM` *(opsional)* | 41 | API Key App Store Connect khusus validasi metadata / TestFlight internal | Hanya untuk `sandbox-internal`; dilarang trigger submit produksi. |
| `NUSANTARA_OTA_TEST_SIGNING_KEY` *(opsional, sebaiknya ephemeral)* | 42 | Kunci uji signing manifest OTA apabila menguji repositori staging non-publik | Default CI membangkitkan pasangan Ed25519 ephemera di memori. |

### 6.4 Daftar Perangkat Fisik yang Diperlukan (Di Luar Jangkauan Runner Virtual CI)

Sertifikasi hardware penuh (memindahkan item spesifik perangkat keras dari `PARTIAL`/emulator ke `VERIFIED` fisik) membutuhkan pengujian manual/device-farm pada:
1. **Perangkat Android Fisik (ARM64-v8a, Android 13–15)** dengan akun developer internal: untuk menguji Kamera Camera2/CameraX fisik, GPS satelit GNSS, Akselerometer/Giroskop IMU, Mikrofon, radio BLE Bluetooth GATT, Notifikasi push FCM saat aplikasi berhenti, Biometrik sidik jari TEE/StrongBox, serta instalasi `.apk`/`.aab` & Play Core In-App Updates nyata.
2. **Perangkat iPhone Fisik (ARM64 Apple Silicon, iOS 17–18)** + akun Apple Developer TestFlight: untuk menguji Kamera AVFoundation, CoreMotion, Mikrofon, BLE CoreBluetooth, APNs push nyata, FaceID/TouchID Secure Enclave, instalasi `.ipa` tertanda tangan provisioning nyata, serta alur App Store / StoreKit.
3. **Desktop Fisik (Windows 11 x64 + ARM64, Linux X11 & Wayland GTK3, macOS Intel + Apple Silicon):** untuk menguji rendering compositor GPU, skala DPI Monitor HiDPI, input HID fisik, serta eksekusi native `windows-arm64` apabila runner ARM64 Windows cloud tidak tersedia.

### 6.5 Daftar Artefak Wajib yang Harus Dihasilkan di CI

1. **Phase 23:** `artifacts/phase23/evidence/<6-target>.json`, biner native & `.ll`/`.o`/`.obj` tiap target, arsip `.zip`/`.tar.gz` + `SHA256SUMS`, `TARGET_REPORT-*.json`, `COMPILER_REPORT-*.json`, `dist-verify-*.json`, dan `PHASE-23-CERTIFICATION-REPORT.md`.
2. **Phase 36:** Preview raster `*.bmp`/`*.svg`/`*.html`, bundel aplikasi desktop (`usr/bin/*` GTK3 jika di Linux ber-GTK, `AppRun`, `SHA256SUMS`), screenshot capture `Xvfb` (`xwd`/`png`) + log test `uji_gui_fase36.log`.
3. **Phase 37–38:** Log build Gradle Android + proyek Xcode/Swift tergenerate, screenshot emulator Android/iOS Simulator saat launch & navigasi, serta log hasil test unit + emulator native API.
4. **Phase 39 & 42:** Laporan hasil TLS HTTPS loopback test, hasil sync offline JSON, manifest OTA bertanda tangan Ed25519 + log test rotasi/pencabutan kunci & rollback atomik (**bebas private key**).
5. **Phase 40–41:** Berkas nyata `*.apk` (memuat `classes.dex` & lolos `apksigner verify`), `*.aab` (tervalidasi `bundletool`), `*.xcarchive` & `*.ipa` (memuat Mach-O ARM64 terverifikasi `codesign`), `SHA256SUMS`, serta laporan kepatuhan Markdown/JSON (`PublishingReportGenerator` dengan rahasia tersensor).
6. **Demo Terpadu:** Direktori `artifacts/demo-terpadu/` berisi BMP desktop, bundel desktop, arsip Phase 23, `.apk`/`.aab`/`.xcarchive` demo, `offline_q.json`, dan manifest OTA demo beserta `SHA256SUMS`.

### 6.6 Kriteria Penerimaan Setiap Fase (Menuju Status `SELESAI`)

- **Phase 23 (`SELESAI`):** `6/6` target PASS pada `phase23-certify.ts aggregate`, setiap biner lolos `BinaryInspector.inspectStrict`, sentinel `NUSANTARA_NATIVE_CI_OK` tercetak melalui eksekusi native/QEMU/Rosetta 2, serta verifikasi distribusi sandbox (`install -> run -> upgrade -> tamper reject -> uninstall -> clean`) lulus `0` gagal di Windows/Linux/macOS.
- **Phase 36 (`SELESAI`):** Suite unit (`22/22`) + uji window GTK3 nyata di `Xvfb`, uji window Win32 di `windows-latest`, uji Cocoa di `macos-latest` (termasuk input, resize, DPI, dialog, clipboard, multi-window, aksesibilitas) seluruhnya lulus tanpa fallback `NATIVE_DISPLAY_UNAVAILABLE`.
- **Phase 37 (`SELESAI`):** Suite `40/40` + kompilasi APK via Gradle di CI + launch aplikasi pada Android Emulator (termasuk navigasi, rotasi layar, & pemulihan state) + kompilasi di `macos-latest`/Xcode dan launch di iOS Simulator.
- **Phase 38 (`SELESAI`):** Suite `24/24` + eksekusi bridge native terkompilasi pada Android Emulator & iOS Simulator untuk layanan yang didukung emulator + laporan perangkat fisik (kamera/Bluetooth/biometrik) lulus pada perangkat uji terdaftar.
- **Phase 39 (`SELESAI`):** Suite `38/38` + uji handshake HTTPS TLS sertifikat valid/invalid/hostname-mismatch nyata + `wss://` + offline transition & transfer berkas di emulator.
- **Phase 40 (`SELESAI`):** Suite `100/100` + APK/AAB mengandung `classes.dex` terkompilasi & lolos `apksigner verify` + `.ipa` diekspor lewat `xcodebuild` di macOS dan teruji install/launch/uninstall pada Android Emulator & iOS Simulator.
- **Phase 41 (`SELESAI`):** Suite `107/107` + signing APK/AAB dengan keystore uji terproteksi + `codesign` Apple di macOS + validasi unggah kering / track internal sandbox berhasil tanpa membocorkan secret ke log/artefak.
- **Phase 42 (`SELESAI`):** Suite `25/25` **plus** test case pencabutan kunci (`cabutKunci`), rotasi kunci, & pemutusan unduhan/instalasi mid-stream lulus + verifikasi manifest & persistensi OTA nyata pada runtime Android/iOS.

### 6.7 Daftar Blocker Aktual Saat Ini

1. **Blocker-1 (Lingkungan CI & Hardware/SDK):** `clang`/`lld`/MSVC/Xcode/`Android SDK`/`Gradle`/`Emulator`/`Xvfb` tidak tersedia di kontainer lokal; Phase 23 `local-snapshot` menghasilkan `0/6 PASS` (`6 NOT_VERIFIED`) dan Phase 36–42 belum memiliki job CI emulator/virtual-display/Xcode.
2. **Blocker-2 (Artefak Mobile Belum Memuat Biner Terkompilasi):** `APKBuilder`/`AABBuilder` baru menghasilkan PKZIP struktural tanpa `classes.dex`, dan `ArchiveManager` hanya membuat `.xcarchive/Info.plist` tanpa Mach-O/`.ipa`.
3. **Blocker-3 (Runner ARM64 & `release.yml` Deprecated Runner):** `ci.yml` menargetkan `windows-11-arm` & `ubuntu-24.04-arm` (yang bergantung kuota/paket runner GitHub), sementara `release.yml` masih memakai `macos-13` (retired), tidak menguji Windows/macOS maupun `test:demo-terpadu`, tidak mewajibkan `phase23-certification-gate`, dan meng-hardcode timestamp rilis.
4. **Blocker-4 (Celah Regression Test Keamanan/Kualitas):**
   - `uji_pembaruan_fase42.ts` belum menguji `TrustManager.cabutKunci()`, rotasi kunci multi-generasi, maupun pemutusan soket unduhan HTTP mid-stream.
   - `uji_mobile_networking_fase39.ts` belum menguji sertifikat TLS invalid/SAN-mismatch pada soket `https://` nyata.
   - `uji_demo_terpadu.ts` menghapus artefak `tmpRoot` saat selesai sehingga tidak meninggalkan bundel inspeksi di `artifacts/demo-terpadu/`.
   - `src/paket/cli.ts` menyisakan 2 import tidak terpakai (`ZipBuilder`, `HashValidator`) dan `bun.lock` lokal berubah di luar `npm ci`.

### 6.8 Rencana Eksekusi Sertifikasi Bertahap

1. **Tahap 1 — Perbaikan Pra-CI di Repositori (Lokal, Sebelum Push Uji):**
   - Bersihkan dead imports di `src/paket/cli.ts`, kembalikan/abaikan `bun.lock`, tambahkan opsi `--preserve-artifacts` (menulis ke `artifacts/demo-terpadu/`) pada `uji_demo_terpadu.ts`.
   - Tambahkan regression test di `uji_pembaruan_fase42.ts` (rotasi kunci, `cabutKunci`, unduhan HTTP terputus) dan `uji_mobile_networking_fase39.ts` (TLS loopback cert valid vs self-signed/SAN-mismatch & `wss://`).
2. **Tahap 2 — Pemutakhiran Workflow CI (`ci.yml` & `release.yml`):**
   - Pastikan fallback runner `linux-arm64` aman bila `ubuntu-24.04-arm` tidak aktif, tangani ketersediaan `windows-11-arm` secara transparan tanpa klaim `PASS` palsu, tambahkan job `phase36-gui-matrix` (`Xvfb` Linux + Win32 + Cocoa), `phase37-40-41-android` (Android SDK 35 + KVM Emulator + `apksigner` + `bundletool`), dan `phase37-40-41-ios` (`macos-latest` + `xcodebuild` + Simulator).
   - Perbarui `release.yml` (hapus `macos-13`, pakai timestamp dinamis, wajibkan gerbang sertifikasi sebelum rilis).
3. **Tahap 3 — Eksekusi CI Lintas Platform (GitHub Actions PR/Main):**
   - Jalankan workflow penuh pada PR/branch uji, verifikasi 6/6 target Phase 23 `PASS` dan artefak Phase 36–42 terunggah utuh (`SHA256SUMS` + log diagnosis).
4. **Tahap 4 — Validasi Perangkat Fisik & Sandbox Non-Produksi (Manual Gate):**
   - Uji aplikasi `.apk`/`.aab` dan `.ipa` pada perangkat fisik Android & iOS untuk sensor/kamera/BLE/biometrik (Phase 38) serta alur sandbox internal bila tersedia, lalu terbitkan laporan sertifikasi final berdasarkan bukti run ID GitHub Actions yang sebenarnya.
