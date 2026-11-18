# NUSANTARA — PRE-PR AUDIT & ARTIFACT INTEGRITY REPORT (Phase 23 & Phase 36–42)

- **Proyek:** NUSANTARA Programming Language & NUSANTARA OS (`https://github.com/sarjanabahasaarab/Bahasa-Nusantara.git`)
- **Cabang Target:** `main`
- **Baseline:** `v0.50.0` (Phase 23.16 Pre-PR Audit)
- **Status Implementasi Lokal:** **`PRE-PR AUDIT & CI GATE INTEGRATION`**
- **Status Sertifikasi Lintas Platform Penuh:** **`PARTIAL`** *(lint/unit/loopback/integrasi lulus di host kontainer Linux `x86_64`, namun uji native 6 target, Xvfb GTK3, Android SDK/Emulator, Xcode/iOS Simulator, dan perangkat fisik hanya dapat dieksekusi di runner GitHub Actions + perangkat nyata)*
- **Status Rilis:** **`BLOCKED`** *(dilarang commit/push/tag/release/store-publish sampai tinjauan PR & sertifikasi lintas platform lulus penuh)*

---

## 1. Catatan Ketersediaan Metadata Git pada Lingkungan Audit

Pemeriksaan langsung di direktori kerja kontainer (`/app/applet`) menunjukkan bahwa direktori metadata **`.git` tidak tersedia** di lingkungan kontainer (`git rev-parse --is-inside-work-tree` keluar dengan kode `128: fatal: not a git repository`). Karena keterbatasan lingkungan tersebut, perintah `git status`, `git diff`, dan `git ls-files` tidak dapat dijalankan di dalam kontainer, sehingga audit pra-PR ini dilakukan langsung melalui pemeriksaan sistem berkas aktual, perbandingan isi lockfile/dependensi, pemindaian timestamps berkas, dan validasi kriptografis penuh terhadap seluruh artefak dan suite pengujian.

---

## 2. Audit `package.json`, `package-lock.json`, dan `bun.lock`

| Berkas | Nama Proyek & Versi | Kecocokan Dependensi | Peran & Tindakan Pra-PR |
| :--- | :--- | :--- | :--- |
| **`package.json`** | `nusantara` (`0.50.0`) | Baseline sumber resmi (12 `dependencies`, 10 `devDependencies`) | **Pertahankan.** Penambahan skrip tunggal `"test:cert-gate"` terhubung ke `pengujian/cicd/uji_certification_gate.ts`. Tidak ada perubahan versi proyek maupun ketergantungan produksi. |
| **`package-lock.json`** | `nusantara` (`0.50.0`, `lockfileVersion: 3`) | `100%` identik pada seluruh 12 `dependencies` & 10 `devDependencies` root | **Pertahankan.** Lockfile resmi yang dipakai oleh `npm ci` di seluruh workflow GitHub Actions. |
| **`bun.lock`** | Workspace root tercatat `"react-example"` | Seluruh 12 `dependencies` & 10 `devDependencies` identik dengan `package.json` | **Artefak Harness Kontainer (Bukan PR Proyek).** Dibangkitkan otomatis oleh runtime `Bun` pada lingkungan kontainer (timestamp termutakhir saat sesi aktif). Tidak mengubah ketergantungan proyek, tetapi **jangan di-commit ke PR `main`** (jalankan `git status` & kecualikan/bersihkan di host git operator sebelum PR). |

---

## 3. Klasifikasi Berkas Teraudit (Pra-CI Hardening + Phase 23.16)

Seluruh perubahan pengguna sebelumnya tetap dipertahankan utuh tanpa `reset`, `clean`, maupun penghapusan sepihak:

1. **Source Code (`src/`):**
   - `src/paket/cli.ts` *(pra-CI: penghapusan dead import `ZipBuilder`, `HashValidator`)*
   - `src/mobile/networking/core/api_client.ts` *(pra-CI: pelestarian `err.cause.code`/`message` OpenSSL TLS)*
   - `src/mobile/updates/ota/OTAResourceManager.ts`, `src/mobile/updates/ota/ActivationManager.ts`, `src/mobile/updates/core/UpdateManager.ts` *(pra-CI: state rollback atomik & high-water mark anti-replay)*
   - `src/cicd/mesinCI.ts`, `src/build/target-matrix.ts`, `src/komponen/StudioCicdWorkflow.tsx` *(Phase 23.16: penghapusan runner retired `macos-13` -> `macos-latest`)*
   - `src/cicd/artifactValidator.ts`, `src/cicd/certificationGate.ts`, `src/cicd/index.ts` *(Phase 23.16: validator integritas artefak anti-traversal & mesin gerbang sertifikasi terpusat Phase 23 + 36–42)*
2. **Skrip Otomasi & Gate (`scripts/`):**
   - `scripts/certification-gate.ts` *(Phase 23.16: CLI `verify-artifacts`, `probe-toolchains`, dan `evaluate`)*
3. **Workflow CI/CD (`.github/workflows/`):**
   - `.github/workflows/ci.yml` *(Phase 23.16: job C1–C7 + `unified-certification-gate` + upload `demo-terpadu-artifacts` + `timeout-minutes`)*
   - `.github/workflows/release.yml` *(Phase 23.16: hapus `macos-13` & hardcoded timestamp `2026-10-25T00:00:00.000Z`, tambah `verify-certification-gate`, blokir auto-publish & support `dry_run`)*
   - `.github/workflows/kernel-boot-qemu.yml` *(Phase 23.16: `permissions: contents: read`, `concurrency`, naikkan `timeout-minutes` ke `25`)*
   - `.github/workflows/nusantara-os-ci.yml` *(Phase 23.16: tambah `timeout-minutes` per job)*
4. **Regression Tests (`pengujian/`):**
   - `pengujian/mobile/uji_mobile_networking_fase39.ts` *(loopback HTTPS X.509 OpenSSL CA/Expired/SAN/Drop/Retry)*
   - `pengujian/mobile/uji_pembaruan_fase42.ts` *(rotasi 3 gen, `cabutKunci`, HTTP mid-stream abort, anti-replay rollback)*
   - `pengujian/integrasi/uji_demo_terpadu.ts` *(Step 7 + integrasi `validasiIntegritasBundelArtefak` anti-traversal/anti-yatim)*
   - `pengujian/cicd/uji_cicd_workflow.ts` *(penambahan uji `5.6` & `5.7` tanpa melemahkan uji lama)*
   - `pengujian/cicd/uji_certification_gate.ts` *(suite baru 8 kasus uji ketat artefak & certification gate)*
5. **Dokumentasi (`docs/`):**
   - `docs/PRE-PR-AUDIT-PHASE-23-36-42.md` *(dokumen ini)*
   - `docs/CERTIFICATION-READINESS-PHASE-23-36-42.md` *(diperbarui ke kondisi Phase 23.16 aktual)*
   - `docs/PHASE-23-36-42-COMPLETION-REPORT.md` *(diperbarui ke kondisi Phase 23.16 aktual)*
   - `docs/phase-39/*`, `docs/phase-42/*`, `README.md`, `ROADMAP.md`, `PERUBAHAN.md`, `pengujian/README.md`
6. **Test Artifacts (`artifacts/`):**
   - `artifacts/demo-terpadu/` *(20 artefak demo + `manifest.json` + `SHA256SUMS`)*
   - `artifacts/certification/` *(output snapshot terpusat `CERTIFICATION-GATE-SNAPSHOT.{json,md}`)*
   - `artifacts/phase23/`, `artifacts/phase49/`, `artifacts/phase50/` *(bukti snapshot/artefak fase yang sudah ada)*
7. **Temporary / Container Environment Files (JANGAN ikut PR kecuali disengaja):**
   - `bun.lock` *(container runtime Bun)*, `dist/` *(hasil build Vite — sudah di-ignore `.gitignore`)*, `data.sqlite` *(file uji lokal)*
8. **Fase Terpisah yang Tidak Diubah:**
   - **Phase 51+** tidak disentuh sama sekali.

---

## 4. Audit Integritas Artefak `artifacts/demo-terpadu/` (Phase B)

Validasi deterministik dijalankan melalui `validasiIntegritasBundelArtefak()` (`src/cicd/artifactValidator.ts`) dan `scripts/certification-gate.ts verify-artifacts`:

| Kriteria Audit | Hasil Pemeriksaan Faktual |
| :--- | :--- |
| **Ketersediaan Berkas Manifest & Checksum** | `manifest.json` (`totalArtefak: 20`) dan `SHA256SUMS` (`20` baris) keduanya ada dan valid secara struktural. |
| **Keberadaan 20 Berkas di Disk** | `20/20` berkas tercatat di `manifest.json` ditemukan nyata di disk; total file di direktori = `22` (`20` artefak + `manifest.json` + `SHA256SUMS`). |
| **Kecocokan Ukuran & SHA-256** | `0` selisih ukuran byte; `0` selisih digest SHA-256 (`20/20 OK`). |
| **Berkas Basi / Yatim / Duplikat** | `0` berkas yatim di luar manifest; `0` duplikat jalur relatif pada manifest maupun `SHA256SUMS`. |
| **Proteksi Path Traversal & Symlink Escape** | Penegakan baru di `validasiJalurRelatifAman()` menolak segmen `..`, jalur absolut, drive Windows, `\0`, serta symlink keluar dari `artifacts/demo-terpadu/` (`0` temuan; diuji regresi di `uji_demo_terpadu.ts` Step 7 & `uji_certification_gate.ts`). |
| **Kejujuran Struktural vs Native Binary** | `jumlahNativeBinary = 0`, `jumlahStruktural = 4` (`.apk`, `.aab`, `android/SHA256SUMS`, `CrossDemo.xcarchive/Info.plist`). Validator menolak jika kontainer `.apk`/`.aab` tanpa `classes.dex` atau `Info.plist` mengklaim `nativeBinary: true`. |
