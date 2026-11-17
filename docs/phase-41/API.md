# Referensi API Phase 41 — Store Publishing & Digital Signing

## 1. Standard Library NUSANTARA (`gunakan "std:mobile" sebagai seluler`)
- `seluler.periksaKesiapanTokoMobile() -> peta`
- `seluler.buatCatatanRilisMobile(versi : teks, buildNumber : bilangan) -> peta`
- `seluler.buatLaporanPublikasiMobile() -> peta`

## 2. API TypeScript Utama (`src/mobile/publishing/`)
- `GooglePlayClient`: `ujiKoneksi()`, `buatAssertionJWTRS256()`, `static verifikasiAssertionJWTRS256()`, `buatEdit()`, `unggahAAB()`, `dapatkanStatusTrack()`, `commitEdit()`.
- `AppStoreConnectClient`: `ujiKoneksi()`, `buatTokenJWTHeaderPayload()`, `buatDanTandaTanganiJWT()`, `static verifikasiJWTES256()`, `verifikasiAksesAPIHttp()`, `unggahBuild()`, `periksaStatusBuild()`.
- `SecretProvider`: `ambilDariEnv()`, `samarkan()`, `samarkanEmail()`, `bersihkanLogDariRahasia()`.
- `CredentialValidator`: `validasiServiceAccountGoogle()`, `validasiAppStoreConnect()`, `periksaBebasHardcode()`.
- `ApprovalGate`: `buatPermintaan()`, `setujui()`, `tolak()`, `dapatkanAntreanMenunggu()`, `formatRingkasanTeks()`.
- `ReleasePipeline`: `jalankan(opsi)`, `dapatkanSemuaTahap()`.
- `PublishingManager`, `ComplianceValidator`, `ReleaseReadiness`, `StoreValidator`, `PublishingHistoryManager`, `PublishingReportGenerator`.

## 3. CLI `nusantara mobile store`
- `nusantara mobile store periksa | koneksi <android|ios>`
- `nusantara mobile store android metadata | validasi | track | release production [--setujui]`
- `nusantara mobile store ios metadata | validasi | testflight`
- `nusantara mobile store aset | release-notes | pipeline [periksa|jalankan] | history | laporan`
