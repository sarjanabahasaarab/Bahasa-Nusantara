# Implementasi Phase 42 — OTA Updates & Secure Update System

## Komponen Kunci yang Diimplementasikan
1. **`UpdateManager` (`src/mobile/updates/core/UpdateManager.ts`)**
   - Fasad terpusat (`konfigurasiAplikasi`, `periksaPembaruan`, `periksaPembaruanJarakJauh`, `terapkanManifestOTA`, `aktivasiDenganHealthCheck`, `rollbackResource`, `buatLaporan`).
   - Sinkronisasi versi baseline ke `ActivationManager.tetapkanVersiBaseline()` dan pelacakan `revisiTerpasang`.
   - Penegakan kecocokan `applicationId`, anti-downgrade SemVer, dan anti-replay revisi sebelum aktivasi OTA.

2. **`UpdateSecurityPolicy` (`src/mobile/updates/security/UpdateSecurityPolicy.ts`)**
   - `validasiURL()` menggunakan `new URL()` dengan perbandingan hostname loopback ketat (`localhost`, `127.0.0.1`, `::1`) untuk mencegah spoof subdomain `http://localhost.evil.com`, serta menolak kredensial tertanam (`user:pass@`).
   - `periksaPathTraversal()` menolak NUL byte (`\0`), encoded traversal (`%2e%2e`), `..`, `/` awal, dan jalur drive Windows (`C:`).
   - `periksaEkstensiAman()` memblokir biner eksekusi (`.apk`, `.aab`, `.dex`, `.so`, `.dylib`, `.dll`, `.exe`, `.jar`, dll.).

3. **`SignatureVerifier` & `TrustManager`**
   - Mendukung pembuatan pasangan kunci asimetris Ed25519 (PKCS#8 & SPKI PEM) dan verifikasi kanonikal menggunakan `node:crypto`.

4. **`OTAResourceManager`, `DownloadManager`, `ActivationManager`, `RollbackManager`**
   - `DownloadManager` menegakkan batas ukuran byte terunduh aktual (`<= 50 MB`) dan memverifikasi integritas SHA-256.
   - `OTAResourceManager` memvalidasi `ManifestValidator.validasi(manifest)` sebelum verifikasi tanda tangan & unduhan.
   - `RollbackManager.eksekusiRollback()` memanggil callback pemulihan ke `ActivationManager.pulihkanCadangan()`, mengembalikan berkas serta pointer versi secara nyata, dan mencatat status `'rolled_back'` pada `UpdateStateManager`.

5. **Integrasi CLI & Stdlib**
   - `MobileCLI` mendukung subperintah `nusantara mobile update [versi|periksa|channel|store|laporan|history]`.
   - `std:mobile` mengekspor `periksaPembaruanMobile`, `dapatkanStatusPembaruanMobile`, dan `rollbackPembaruanResourceMobile`.
