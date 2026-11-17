# Pengujian Phase 42 — OTA Updates & Secure Update System

## Perintah Verifikasi
```bash
npm run lint
npm run test:pembaruan-v42
```

## Ringkasan Kelompok Pengujian (`pengujian/mobile/uji_pembaruan_fase42.ts`)
- **[KELOMPOK 1] VersionChecker & SemVer** (3 uji): penguraian SemVer/prerelease/metadata, perbandingan versi, evaluasi minimum.
- **[KELOMPOK 2] Manifest Parser, Schema & Security Validator** (4 uji): validasi skema, penolakan `applicationId` non-reverse-DNS, penolakan `.dex`, deteksi path traversal `../`.
- **[KELOMPOK 3] Tanda Tangan Digital & Trust Manager** (3 uji): manajemen root key, penandatanganan & verifikasi, deteksi manipulasi manifest.
- **[KELOMPOK 4] HashValidator SHA-256 & Integritas Resource** (2 uji): FIPS 180-4 digest & deteksi konten korup.
- **[KELOMPOK 5] Atomic Activation & Rollback Manager** (2 uji): pencadangan atomik & pemulihan versi.
- **[KELOMPOK 6] Store Updates Bridges** (2 uji): simulasi ketersediaan Play Store & deep link App Store.
- **[KELOMPOK 7] UpdateManager Facade & Laporan** (1 uji): laporan Markdown.
- **[KELOMPOK 8] Mobile CLI Dispatcher** (3 uji): subperintah `versi`, `periksa`, `channel`, `store`, `laporan`, `history`.
- **[KELOMPOK 9] Standard Library `std:mobile`** (1 uji): eksekusi skrip `.nusantara` memakai fungsi pembaruan mobile.
- **[KELOMPOK 10] Ed25519 Asimetris & Loopback HTTP OTA** (2 uji): kunci PKCS#8/SPKI Ed25519 nyata, pengunduhan HTTP loopback nyata, penolakan payload korup (SHA-256), aktivasi, serta verifikasi pemulihan file/versi pasca-rollback.
- **[KELOMPOK 11] Audit Keamanan URL, Anti-Downgrade/Replay, Kedaluwarsa & Health-Check Auto-Rollback** (2 uji): penolakan `http://localhost.evil.com`, kredensial tertanam, NUL/`%2e%2e`, mismatch `applicationId`, downgrade versi, replay revisi, manifest kedaluwarsa, serta rollback otomatis saat health check pasca-aktivasi mengembalikan `false`.

## Hasil Aktual
- `npm run lint` (`tsc --noEmit`): **LULUS** (0 galat)
- `npm run test:pembaruan-v42`: **25 LULUS, 0 GAGAL (Total: 25)**
