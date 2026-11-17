# Referensi API Phase 40 — Mobile Application Distribution

## 1. Standard Library NUSANTARA (`gunakan "std:mobile" sebagai seluler`)
- `seluler.dapatkanInfoDistribusi() -> peta`: Konfigurasi aplikasi, target Android, dan target iOS aktif.
- `seluler.periksaAsetMobile() -> peta`: Status validasi ikon/splash (`valid`, `totalAsetDiperiksa`, `asetHilang`).
- `seluler.validasiRilisMobile(lingkungan? : teks) -> peta`: Evaluasi checklist pra-rilis (`siapRilis`, `totalPemeriksaan`, `totalLulus`).
- `seluler.kelolaVersiMobile(aksi : teks, tipe? : teks) -> peta`: Mengambil (`tampil`) atau menaikkan versi SemVer (`naikkan`).

## 2. API TypeScript Utama (`src/mobile/distribution/`)
- `DistributionManager`: `periksaLingkunganSistem()`, `validasiKesiapanRilis()`, `validasiAset()`, `naikkanVersi()`, `jalankanDistribusiRilis()`.
- `APKBuilder.bangunAPK(konfig, tipe)` & `AABBuilder.bangunAAB(konfig, apakahRelease)`.
- `ArchiveManager.siapkanArchive(konfig)` & `CodeSigningManager.buatExportOptionsPlist(signing)`.
- `ZipBuilder`: `buatArsipZip(entri)`, `sanitasiNamaEntriZip(nama)`, `validasiDanBacaArsipZip(bytes)`.
- `BuildValidator`: `validasiArtefak(artefak)`, `verifikasiChecksumBerkas(path, sha)`, `buatSha256Sums(list)`, `verifikasiSha256Sums(sums, dir)`.
- `SigningValidator`: `validasiSigningAndroid()`, `validasiSigningIOS()`, `periksaKeamananKredensial(teks)`.
- `ReleaseValidator.periksaKesiapanRilis(konfig)` & `VersionManager.naikkanVersi(...)`.

## 3. CLI `nusantara mobile distribusi`
- `nusantara mobile distribusi periksa`
- `nusantara mobile distribusi konfigurasi [development|staging|production]`
- `nusantara mobile distribusi android [debug|release|aab]`
- `nusantara mobile distribusi ios [periksa|archive]`
- `nusantara mobile distribusi versi [tampil|patch|minor|mayor]`
- `nusantara mobile distribusi aset periksa`
- `nusantara mobile distribusi rilis checklist`
