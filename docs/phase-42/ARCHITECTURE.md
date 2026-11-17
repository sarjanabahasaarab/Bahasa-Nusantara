# Arsitektur Phase 42 — OTA Updates & Secure Update System

## Gambaran Umum
Phase 42 membangun arsitektur pembaruan aplikasi seluler dua jalur yang aman dan atomik untuk ekosistem NUSANTARA (`src/mobile/updates/`):
1. **Store Binary Updates**: Jembatan kebijakan menuju Google Play In-App Updates (`flexible` & `immediate`) serta Apple App Store deep-link update.
2. **Non-Executable OTA Resource Updates**: Pengunduhan manifest bertanda tangan asimetris Ed25519 dan resource statis (tema `.json`, lokalisasi, konfigurasi, gambar, font) melalui HTTP/HTTPS, diikuti aktivasi atomik dan pemulihan rollback otomatis.

## Lapisan Modul (`src/mobile/updates/`)
- **Core (`core/`)**: `UpdateManager`, `VersionChecker`, `UpdateChannel`, `UpdatePolicy`, `Compatibility`.
- **Manifest (`manifest/`)**: `ManifestParser`, `ManifestValidator`.
- **Security (`security/`)**: `SignatureVerifier` (Ed25519/RSA-SHA256 + `TrustManager`), `HashValidator` (SHA-256), `IntegrityValidator`, `UpdateSecurityPolicy`.
- **OTA Engine (`ota/`)**: `DownloadManager`, `OTAResourceManager`, `ActivationManager`.
- **Storage & State (`storage/`)**: `RollbackManager`, `UpdateState`, `UpdateCache`, `UpdateHistory`.
- **Store Bridges (`store/`)**: `GooglePlayInAppUpdate`, `AppleAppStoreUpdate`.
- **Backend & Reporting (`backend/`, `notification/`)**: `UpdateRegistry`, `UpdateTelemetry`, `UpdateReport`, `UpdateNotification`.

## Alur Pembaruan & Pemulihan Aman
1. `UpdateManager.periksaPembaruanJarakJauh(url)` memvalidasi URL (`https:` atau loopback HTTP) -> mengambil JSON -> memvalidasi skema (`ManifestValidator.validasi`) -> memverifikasi tanda tangan Ed25519/RSA-SHA256 (`SignatureVerifier.verifikasi`).
2. `UpdateManager.terapkanManifestOTA(manifest)` menegakkan kecocokan `applicationId`, anti-downgrade (`SemVer >= terpasang`), dan anti-replay (`revision > revisiTerpasang` untuk versi sama).
3. `OTAResourceManager` menjalankan `ManifestValidator`, memverifikasi signature, mengunduh payload via `DownloadManager`, memverifikasi batas ukuran byte aktual serta SHA-256 via `IntegrityValidator`, lalu menyerahkannya ke `ActivationManager.aktifkanAtomik()`.
4. `ActivationManager` mencadangkan state & berkas aktif ke `RollbackManager` sebelum mengganti peta resource aktif dan menaikkan versi. `aktivasiDenganHealthCheck()` memanggil `rollbackResource()` secara otomatis jika pemeriksaan kesehatan pasca-OTA mengembalikan `false`.
