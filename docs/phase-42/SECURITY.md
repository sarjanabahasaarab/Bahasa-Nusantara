# Keamanan Phase 42 — OTA Updates & Secure Update System

## Kontrol Keamanan yang Ditegakkan
1. **Verifikasi Kriptografis Asimetris (`SignatureVerifier` & `TrustManager`)**:
   - Mendukung kunci Ed25519 (PKCS#8/SPKI PEM) via `node:crypto`; perubahan 1 byte pada manifest setelah penandatanganan langsung gagal diverifikasi.
   - Kunci yang tidak terdaftar atau tidak aktif pada `TrustManager` ditolak.
2. **Transport & Validasi URL (`UpdateSecurityPolicy.validasiURL`)**:
   - Wajib HTTPS untuk host jarak jauh; HTTP hanya diizinkan pada alamat loopback terverifikasi (`hostname === 'localhost' || '127.0.0.1' || '::1'`) sehingga domain spoof seperti `http://localhost.evil.com` ditolak.
   - URL yang mengandung `username`/`password` tertanam (`https://user:pass@...`) ditolak.
3. **Perlindungan Jalur & Kode Berbahaya**:
   - `periksaPathTraversal` menolak `..`, `/`, `C:`, karakter NUL (`\0`), dan `%2e%2e`.
   - `periksaEkstensiAman` menolak payload eksekusi (`.dex`, `.apk`, `.aab`, `.so`, `.dylib`, `.dll`, `.exe`, `.sh`, dll.) agar OTA tetap mematuhi kebijakan keamanan Apple App Store & Google Play.
   - `ManifestValidator` menegakkan batas maksimum 50 MB per berkas dan 100 MB per bundle serta menolak manifest kedaluwarsa (`expirationDate < now`); `DownloadManager` memverifikasi ukuran byte terunduh aktual terhadap batas tersebut.
4. **Anti-Downgrade, Anti-Replay & Kecocokan Identitas**:
   - `UpdateManager.terapkanManifestOTA` menolak manifest dengan `applicationId` berbeda, versi lebih rendah dari versi terpasang, maupun revisi sama/lebih kecil pada versi yang sama.
5. **Pemulihan Atomik (`ActivationManager` & `RollbackManager`)**:
   - Cadangan resource diambil sebelum mutasi; `aktivasiDenganHealthCheck` memicu `rollbackResource()` otomatis yang memulihkan peta berkas dan nomor versi awal ketika pemeriksaan kesehatan pasca-OTA gagal.
