# Pengujian Phase 40 — Mobile Application Distribution

## 1. Perintah Verifikasi
- TypeScript lint: `npm run lint` (`tsc --noEmit`) — exit `0`
- Suite Fase 40: `npm run test:distribusi-v40` (`tsx pengujian/mobile/uji_distribusi_fase40.ts`) — **100/100 LULUS**

## 2. Cakupan Suite `uji_distribusi_fase40.ts`
- `[1]` Validasi konfigurasi, `targetSdk`, & penolakan package ID ilegal (`namatunggal`, `android.aplikasi`) (`1.1`–`1.2`).
- `[2]` `VersionManager`: parser SemVer, bump Patch/Minor/Mayor, serta catatan rilis (`2.1`–`2.3`).
- `[3]` `AndroidSigningManager`: konfigurasi signing, peringatan env kosong, panduan `keytool` (`3.1`–`3.3`).
- `[4]` `APKBuilder` & `AABBuilder`: pembuatan APK debug dan AAB release (`4.1`–`4.2`).
- `[5]` `IOSDistributionManager`, `CodeSigningManager`, `ArchiveManager` (`ExportOptions.plist`, `.xcarchive`, checklist App Store) (`5.1`–`5.4`).
- `[6]` `IconManager`, `AssetValidator`, & `SplashManager` (Android 12+ XML + iOS LaunchScreen storyboard) (`6.1`–`6.3`).
- `[7]` `ReleaseValidator`, `ReleaseReportGenerator` (`release-report.md`), & `BuildReportGenerator` (`build-report.json`) (`7.1`–`7.2`).
- `[8]` Audit kredensial plaintext `SigningValidator` (`8.1`).
- `[9]` CLI `nusantara mobile distribusi` untuk seluruh sub-perintah (`9.1`–`9.3`).
- `[10]` Eksekusi `.nusantara` nyata `contoh/mobile/distribution_demo/src/main.nusantara` (`10.1`).
- `[11]` Validasi PKZIP APK & AAB menggunakan `python3 zipfile.testzip()` + probe SDK Android nyata (`11.1`).
- `[12]` Pengujian Keamanan & Integritas baru (`12.1`–`12.4`):
  - `12.1`: Penolakan Zip-Slip (`../`, `/...`, `\`) + verifikasi CRC-32 korup pada `ZipBuilder`.
  - `12.2`: Deteksi tamper 1-byte APK oleh `BuildValidator` + validasi/penolakan `SHA256SUMS`.
  - `12.3`: XML escaping di `AndroidManifest.xml` & verifikasi direktori `.xcarchive` di `BuildValidator`.
  - `12.4`: Deteksi PKCS8 private key / `apiSecret` tanpa *false-positive* pada `storePasswordEnv`.
