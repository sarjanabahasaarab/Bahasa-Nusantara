# Arsitektur Phase 40 — Mobile Application Distribution

## 1. Gambaran Umum
Phase 40 membangun sistem distribusi, pemaketan, validasi aset, manajemen versi, serta persiapan artefak Android (`.apk`, `.aab`) dan iOS (`.xcarchive`, `ExportOptions.plist`) bagi aplikasi NUSANTARA Mobile (`src/mobile/distribution/`), terintegrasi dengan `std:mobile` serta sub-perintah `nusantara mobile distribusi`.

## 2. Komponen Arsitektur (`/src/mobile/distribution/`)
- **Core & Packaging (`/core/`)**:
  - `DistributionManager.ts`: Fasad utama konfigurasi, pemeriksaan lingkungan Android/iOS, validasi rilis, manajemen versi, dan eksekusi pipeline rilis.
  - `BuildManager.ts`: Orkestrator pembentukan artefak Android Debug/Release APK, Android Release AAB, dan iOS `.xcarchive` + penulisan `build-report.json`.
  - `ReleaseManager.ts`: Pipeline rilis lengkap (aset -> checklist -> build -> `release-report.md`).
  - `VersionManager.ts`: Parser & pembaruan SemVer, kenaikan `kodeVersiAndroid`/`nomorBuildIOS`, serta generator catatan rilis.
  - `ZipBuilder.ts`: Pembangun & validator arsip PKZIP Method 0 (STORE) beserta perhitungan dan verifikasi CRC-32 murni + perlindungan anti-Zip-Slip.
- **Android Distribution (`/android/`)**:
  - `AndroidBuildManager.ts`: Probe biner host (`ANDROID_HOME`, `javac`, `gradle`, `aapt2`, `d8`, `apksigner`, `zipalign`, `keytool`).
  - `AndroidManifestManager.ts`: Validasi reverse-DNS package ID, pembatasan `android.*`, serta generator `AndroidManifest.xml` dengan escaping XML.
  - `APKBuilder.ts` & `AABBuilder.ts`: Builder paket PKZIP sah dengan manifes, `META-INF/NUSANTARA.json`, `META-INF/CERT.SF` / `BundleConfig.pb.json`, serta digest SHA-256.
  - `AndroidSigning.ts`: Validasi keystore/alias dan kepatuhan variabel lingkungan tanpa menyimpan kata sandi plaintext.
- **iOS Distribution (`/ios/`)**:
  - `IOSBuildManager.ts`, `ArchiveManager.ts`, `CodeSigningManager.ts`, `ProvisioningManager.ts`: Deteksi `darwin`/`xcodebuild`, persiapan direktori `.xcarchive` (`Info.plist`), `ExportOptions.plist`, serta checklist App Store Connect.
- **Assets, Validation & Reports (`/assets/`, `/validation/`, `/reports/`)**:
  - `AssetValidator.ts`, `IconManager.ts`, `SplashManager.ts`.
  - `BuildValidator.ts` (verifikasi SHA-256 disk, struktur PKZIP/CRC-32, direktori `.xcarchive`, serta `SHA256SUMS`), `SigningValidator.ts`, `ReleaseValidator.ts`.
  - `BuildReport.ts` & `ReleaseReport.ts`.
