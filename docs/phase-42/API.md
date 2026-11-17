# Referensi API Phase 42 — OTA Updates & Secure Update System

## API Utama (`src/mobile/updates`)
- **`UpdateManager.dapatkanInstance()`**
  - `konfigurasiAplikasi(appId, versi, platform?, revisi?)`
  - `periksaPembaruan()` -> evaluasi manifest terdaftar lokal.
  - `periksaPembaruanJarakJauh(manifestUrl, timeoutMs?)` -> validasi URL, unduh manifest, cek skema, verifikasi tanda tangan kriptografis.
  - `terapkanManifestOTA(manifest)` -> cek `applicationId`, anti-downgrade, anti-replay, lalu terapkan OTA via `OTAResourceManager`.
  - `aktivasiDenganHealthCheck(manifest, pemeriksaKesehatan)` -> aktifkan OTA lalu panggil callback kesehatan; rollback otomatis bila gagal.
  - `rollbackResource()` -> pulihkan resource & versi sebelumnya pada `ActivationManager`.
  - `buatLaporan()` -> ringkasan laporan status pembaruan & riwayat.
- **`SignatureVerifier`**
  - `buatPasanganKunciEd25519()` -> `{ kunciPublikPem, kunciPrivatPem, fingerprintHex }`.
  - `tandaTangani(manifest, keyId, kunciPrivatPem?, alg?)` / `verifikasi(manifest)`.
- **`ManifestValidator.validasi(manifest)`**
  - Memeriksa `schemaVersion`, reverse-DNS `applicationId`, `platform`, `channel`, SemVer, `expirationDate`, batas bundle (`100 MB`), path & ekstensi resource aman, dan format SHA-256 64-hex.
- **`UpdateSecurityPolicy`**
  - `validasiURL(urlStr, izinkanLocalhost?)`
  - `periksaPathTraversal(jalurRelatif)`
  - `periksaEkstensiAman(jalurBerkas)`
  - `validasiBatasUkuran(ukuranByte, totalSaatIni, jumlahBerkasSaatIni)`

## Fungsi `std:mobile`
- `periksaPembaruanMobile(applicationId, versi, platform)` -> peta `{ adaPembaruan, versiTerbaru, ... }`
- `dapatkanStatusPembaruanMobile()` -> peta status mesin pembaruan saat ini
- `rollbackPembaruanResourceMobile(platform)` -> peta `{ sukses, versiDipulihkan, pesan }`
